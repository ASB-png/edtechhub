import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, Platform, StatusBar,
  TextInput, ScrollView, LayoutAnimation, UIManager, Linking, Alert
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import { sendNotification, NOTIFICATION_TYPES } from '../notificationService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─────────────────────────────────────────────
   Countdown Timer Component
───────────────────────────────────────────── */
function CountdownTimer({ deadline, isCompleted }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal'); // 'normal' | 'warning' | 'danger' | 'expired'

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;

      if (isCompleted) {
        setTimeLeft('Submitted ✓');
        setUrgency('done');
        return;
      }

      if (diff <= 0) {
        setTimeLeft('Deadline passed');
        setUrgency('expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff < 3600000) {
        // less than 1 hour
        setUrgency('danger');
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else if (diff < 86400000) {
        // less than 1 day
        setUrgency('warning');
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setUrgency('normal');
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline, isCompleted]);

  const colors = {
    done:    { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' },
    normal:  { bg: '#EEF2FF', text: '#4338CA', icon: 'time-outline' },
    warning: { bg: '#FEF3C7', text: '#92400E', icon: 'alarm-outline' },
    danger:  { bg: '#FEE2E2', text: '#991B1B', icon: 'warning-outline' },
    expired: { bg: '#F1F5F9', text: '#64748B', icon: 'close-circle-outline' },
  };
  const c = colors[urgency];

  return (
    <View style={[styles.countdownBadge, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={12} color={c.text} style={{ marginRight: 4 }} />
      <Text style={[styles.countdownText, { color: c.text }]}>{timeLeft}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   Review Feed Component (student reads feedback)
───────────────────────────────────────────── */
function ReviewFeed({ assignmentId, studentId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
    // Poll every 15 seconds for new reviews
    const interval = setInterval(fetchReviews, 15000);
    return () => clearInterval(interval);
  }, [assignmentId, studentId]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    setReviews(data || []);
    setLoading(false);
  };

  if (loading) return <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 8 }} />;

  if (reviews.length === 0) {
    return (
      <View style={styles.noReviewBox}>
        <Ionicons name="chatbubble-outline" size={16} color="#94A3B8" />
        <Text style={styles.noReviewText}>No feedback yet from your instructor.</Text>
      </View>
    );
  }

  return (
    <View style={styles.reviewFeedContainer}>
      <Text style={styles.reviewFeedTitle}>📋 Instructor Feedback</Text>
      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewBubble}>
          <Text style={styles.reviewText}>{r.message}</Text>
          <Text style={styles.reviewTime}>
            {new Date(r.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────────
   Main Student Dashboard
───────────────────────────────────────────── */
export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'todo' | 'completed'
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submission state
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [workLink, setWorkLink] = useState('');
  const [notes, setNotes] = useState('');

  // Expanded review panel
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  // Notification preference
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  useEffect(() => {
    setupNotifications();
    loadNotificationPreferences();
    fetchData();
  }, []);

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (e) { console.log(e); }
  };

  const loadNotificationPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      setNotificationEnabled(enabled !== 'false');
    } catch (e) { console.log(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    const { data: assignmentData } = await supabase
      .from('assignments').select('*').order('deadline', { ascending: true });

    const { data: submissionData } = await supabase
      .from('submissions').select('assignment_id, grade').eq('student_id', user.id);

    const enriched = (assignmentData || []).map(task => {
      const mySub = submissionData?.find(s => s.assignment_id === task.id);
      return { ...task, isCompleted: !!mySub, grade: mySub?.grade };
    });

    setAssignments(enriched);
    setLoading(false);
  };

  const switchTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
    setActiveSubmissionId(null);
    setExpandedReviewId(null);
  };

  const handleSubmitWork = async (assignmentId) => {
    if (!workLink) {
      Alert.alert('Required', 'Please provide a link to your completed work.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('submissions').insert([
      { assignment_id: assignmentId, student_id: user.id, file_url: workLink, notes }
    ]).select();

    if (error) {
      Alert.alert('Submission Failed', error.message);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && notificationEnabled) {
        await sendNotification(
          NOTIFICATION_TYPES.SUBMISSION_CONFIRMED,
          '🎉 Submission Confirmed',
          `Your submission for "${assignment.title}" has been received.`,
          assignmentId
        );
      }
      setActiveSubmissionId(null);
      setWorkLink('');
      setNotes('');
      fetchData();
    }
  };

  const openLink = (url) => {
    if (!url) return;
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(validUrl).catch(() => Alert.alert('Invalid Link', 'Could not open URL.'));
  };

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';

  /* ── filtered list ── */
  const filteredAssignments = assignments.filter(task => {
    if (activeTab === 'todo') return !task.isCompleted;
    if (activeTab === 'completed') return task.isCompleted;
    return true; // 'all'
  });

  /* ── render card ── */
  const renderAssignmentCard = ({ item }) => {
    const isLate = new Date(item.deadline) < new Date() && !item.isCompleted;
    const reviewOpen = expandedReviewId === item.id;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.assignmentTitleRow}>
            <Ionicons
              name={item.isCompleted ? 'checkmark-circle' : 'document-text'}
              size={22}
              color={item.isCompleted ? '#10B981' : '#4F46E5'}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          </View>
          {/* Deadline badge */}
          <View style={[styles.deadlinePill,
            item.isCompleted ? styles.badgeSuccess :
            isLate ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.deadlinePillText,
              item.isCompleted ? styles.textSuccess :
              isLate ? styles.textDanger : styles.textWarning]}>
              {new Date(item.deadline).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* ── Countdown ── */}
        <View style={{ marginBottom: 8 }}>
          <CountdownTimer deadline={item.deadline} isCompleted={item.isCompleted} />
        </View>

        {/* Grade display */}
        {item.isCompleted && item.grade != null && (
          <View style={styles.gradeRow}>
            <Ionicons name="school" size={18} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.gradeLabel}>Instructor Score:</Text>
            <View style={styles.gradePill}>
              <Text style={styles.gradeValue}>{item.grade}%</Text>
            </View>
          </View>
        )}

        {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}

        {/* Resource link */}
        {item.file_url ? (
          <TouchableOpacity style={styles.linkRow} onPress={() => openLink(item.file_url)}>
            <Ionicons name="link" size={16} color="#4F46E5" />
            <Text style={styles.linkText}>View Instructor Resource</Text>
          </TouchableOpacity>
        ) : null}

        {/* Review toggle (only for completed) */}
        {item.isCompleted && profile && (
          <TouchableOpacity
            style={styles.reviewToggleBtn}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpandedReviewId(reviewOpen ? null : item.id);
            }}
          >
            <Ionicons name={reviewOpen ? 'chevron-up' : 'chatbubbles-outline'} size={16} color="#4F46E5" style={{ marginRight: 6 }} />
            <Text style={styles.reviewToggleText}>
              {reviewOpen ? 'Hide Feedback' : 'View Instructor Feedback'}
            </Text>
          </TouchableOpacity>
        )}

        {reviewOpen && profile && (
          <ReviewFeed assignmentId={item.id} studentId={profile.id} />
        )}

        {/* Submission form / button */}
        {!item.isCompleted && (
          activeSubmissionId === item.id ? (
            <View style={styles.submissionForm}>
              <View style={styles.inputContainer}>
                <Ionicons name="link-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Paste link to your work"
                  placeholderTextColor="#94A3B8"
                  value={workLink}
                  onChangeText={setWorkLink}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="chatbubble-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Add a note (Optional)"
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveSubmissionId(null);
                }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitActionBtn} onPress={() => handleSubmitWork(item.id)}>
                  <Text style={styles.submitActionText}>Send Work</Text>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.openSubmitBtn, isLate && styles.openSubmitBtnLate]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveSubmissionId(item.id);
              }}>
              <Text style={[styles.openSubmitText, isLate && styles.openSubmitTextLate]}>
                {isLate ? '⚠️ Submit Late' : 'Turn In Assignment'}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  /* ── stats bar ── */
  const total = assignments.length;
  const done = assignments.filter(a => a.isCompleted).length;
  const pending = total - done;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
          </View>
          <View>
            <Text style={styles.title}>Hello, {profile ? profile.name.split(' ')[0] : 'Student'}</Text>
            <Text style={styles.subtitle}>{profile?.roll_number || 'AssignHub Portal'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutIcon} onPress={async () => {
            await supabase.auth.signOut(); router.replace('/');
          }}>
            <Ionicons name="log-out-outline" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      {!loading && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{done}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#4F46E5' }]}>
              {total > 0 ? Math.round((done / total) * 100) : 0}%
            </Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabContainer}>
        {[
          { key: 'all', label: 'All', icon: 'list' },
          { key: 'todo', label: 'To Do', icon: 'time-outline' },
          { key: 'completed', label: 'Done', icon: 'checkmark-circle-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => switchTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? '#4F46E5' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'all' ? 'All Assignments' :
             activeTab === 'todo' ? 'Pending Coursework' : 'Past Submissions'}
          </Text>
          <TouchableOpacity onPress={fetchData}>
            <Ionicons name="refresh" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
        ) : filteredAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={activeTab === 'todo' ? 'happy-outline' : 'folder-open-outline'} size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'todo' ? 'All caught up!' :
               activeTab === 'completed' ? 'No completed work yet.' : 'No assignments yet.'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'todo' ? 'Check back later for new assignments.' :
               activeTab === 'completed' ? 'Your submitted assignments will appear here.' :
               'Assignments posted by your instructor will show here.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAssignments}
            keyExtractor={i => i.id}
            renderItem={renderAssignmentCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    elevation: 2,
  },
  avatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '600' },
  headerIcon: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, elevation: 2 },
  logoutIcon: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, elevation: 2 },

  /* Stats */
  statsBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    marginHorizontal: 20, borderRadius: 16, padding: 14, marginBottom: 10,
    elevation: 2, alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0' },

  /* Tabs */
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 100, marginHorizontal: 3, flexDirection: 'row', justifyContent: 'center',
  },
  activeTab: { backgroundColor: '#EEF2FF' },
  tabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#4F46E5', fontWeight: '700' },

  /* Content */
  content: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  assignmentTitleRow: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },

  /* Deadline pill */
  deadlinePill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100,
    flexDirection: 'row', alignItems: 'center',
  },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeDanger:  { backgroundColor: '#FEE2E2' },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  deadlinePillText: { fontSize: 11, fontWeight: '700' },
  textWarning: { color: '#92400E' },
  textDanger:  { color: '#991B1B' },
  textSuccess: { color: '#065F46' },

  /* Countdown */
  countdownBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  countdownText: { fontSize: 12, fontWeight: '700' },

  /* Grade */
  gradeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  gradeLabel: { fontSize: 14, fontWeight: '600', color: '#475569', flex: 1 },
  gradePill: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0',
  },
  gradeValue: { color: '#065F46', fontWeight: '800', fontSize: 15 },

  descText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 12, marginTop: 4 },

  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 10,
  },
  linkText: { fontSize: 13, color: '#4F46E5', fontWeight: '600', marginLeft: 8 },

  /* Review toggle */
  reviewToggleBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, marginTop: 8,
  },
  reviewToggleText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  /* Review feed */
  reviewFeedContainer: { marginTop: 12 },
  reviewFeedTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  reviewBubble: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#4F46E5',
  },
  reviewText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  reviewTime: { fontSize: 11, color: '#94A3B8', marginTop: 6, textAlign: 'right' },
  noReviewBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', padding: 10, borderRadius: 10, marginTop: 8,
  },
  noReviewText: { fontSize: 13, color: '#94A3B8', marginLeft: 8 },

  /* Submission */
  openSubmitBtn: {
    backgroundColor: '#F1F5F9', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center', marginTop: 10,
  },
  openSubmitBtnLate: { backgroundColor: '#FEF3C7' },
  openSubmitText: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
  openSubmitTextLate: { color: '#92400E' },
  submissionForm: {
    backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14,
    marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  formActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4,
  },
  cancelBtn: { paddingHorizontal: 15, paddingVertical: 10 },
  cancelText: { color: '#64748B', fontWeight: '600' },
  submitActionBtn: {
    flexDirection: 'row', backgroundColor: '#4F46E5',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  submitActionText: { color: '#FFFFFF', fontWeight: '700' },

  /* Empty */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },
});