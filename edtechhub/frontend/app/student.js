import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  FlatList, ActivityIndicator, Alert, Platform, StatusBar, 
  TextInput, ScrollView, LayoutAnimation, UIManager 
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import { sendNotification, NOTIFICATION_TYPES, notificationTemplates } from '../notificationService';

// Enable smooth animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('todo'); // 'todo', 'completed'
  const [profile, setProfile] = useState(null);
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Submission State
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [workLink, setWorkLink] = useState('');
  const [notes, setNotes] = useState('');
  
  // Notification State
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');

  // Set up notification handler
  useEffect(() => {
    setupNotifications();
    loadNotificationPreferences();
  }, []);

  const setupNotifications = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Listen for notifications
      const subscription = Notifications.addNotificationResponseListener(response => {
        const { assignment_id } = response.notification.request.content.data;
        if (assignment_id) {
          // Navigate to assignment when notification tapped
          const assignment = assignments.find(a => a.id === assignment_id);
          if (assignment && !assignment.isCompleted) {
            setActiveTab('todo');
          }
        }
      });

      return () => subscription.remove();
    } catch (error) {
      console.log('Notification setup error:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      setNotificationEnabled(enabled !== 'false');
    } catch (error) {
      console.log('Error loading notification preferences:', error);
    }
  };

  const sendNotification = async (title, body, assignmentId = null) => {
    if (!notificationEnabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',
          badge: 1,
          data: {
            assignment_id: assignmentId,
          },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.log('Error sending notification:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    const { data: assignmentData } = await supabase.from('assignments').select('*').order('deadline', { ascending: true });
    
    // UPDATED: Now we are also fetching the 'grade' column from their submissions
    const { data: submissionData } = await supabase.from('submissions').select('assignment_id, grade').eq('student_id', user.id);
    
    const enrichedAssignments = assignmentData.map(task => {
      // Find the student's submission for this specific task
      const mySubmission = submissionData?.find(sub => sub.assignment_id === task.id);
      
      return {
        ...task,
        isCompleted: !!mySubmission,
        // NEW: Save the grade to the task if it exists
        grade: mySubmission?.grade 
      };
    });

    setAssignments(enrichedAssignments || []);
    setLoading(false);
  };

  const switchTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
    setActiveSubmissionId(null); // Close submission form if switching tabs
  };

  const handleSubmitWork = async (assignmentId) => {
    console.log("🚀 SEND WORK BUTTON CLICKED!");
    console.log(`Assignment ID: ${assignmentId}`);
    console.log(`Link: ${workLink}, Notes: ${notes}`);

    if (!workLink) {
      alert("Please provide a link to your completed work."); // Using standard web alert
      return;
    }

    alert("Sending... Check terminal for details!");

    const { data: { user } } = await supabase.auth.getUser();
    console.log("👤 User ID submitting:", user?.id);

    // .select() forces Supabase to return the data so we know it actually saved
    const { data, error } = await supabase.from('submissions').insert([
      { 
        assignment_id: assignmentId, 
        student_id: user.id, 
        file_url: workLink, 
        notes: notes 
      }
    ]).select();

    console.log("📡 SUPABASE RESPONSE:", { data, error });

    if (error) {
      alert(`Submission Failed: ${error.message}`);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      alert("Success! 🎉 Your assignment has been submitted.");
      
      // Send submission confirmation notification
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
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
      fetchData(); // Refresh the list so it moves to "Completed"
    }
  };

  // Helper to get initials for the avatar
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
  };

  /* --- RENDER COMPONENTS --- */
  const renderAssignmentCard = ({ item }) => {
    const isLate = new Date(item.deadline) < new Date() && !item.isCompleted;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.assignmentTitleRow}>
            <Ionicons name={item.isCompleted ? "checkmark-circle" : "document-text"} size={22} color={item.isCompleted ? "#10B981" : "#4F46E5"} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          
          <View style={[styles.badge, item.isCompleted ? styles.badgeSuccess : isLate ? styles.badgeDanger : styles.badgeWarning]}>
            <Ionicons name={item.isCompleted ? "checkmark" : isLate ? "alert-circle" : "time"} size={12} color={item.isCompleted ? "#047857" : isLate ? "#991B1B" : "#92400E"} style={{ marginRight: 4 }} />
            <Text style={[styles.deadlineText, item.isCompleted ? styles.textSuccess : isLate ? styles.textDanger : styles.textWarning]}>
              {item.isCompleted ? "Done" : new Date(item.deadline).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {/* --- NEW: THE GRADING DISPLAY --- */}
        {item.isCompleted && item.grade !== undefined && item.grade !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Ionicons name="school" size={20} color="#10B981" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#475569', flex: 1 }}>Instructor Score:</Text>
            <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 16 }}>{item.grade}%</Text>
            </View>
          </View>
        )}

        {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
        
        {item.file_url ? (
          <View style={styles.linkRow}>
            <Ionicons name="link" size={16} color="#4F46E5" />
            <Text style={styles.linkText}>View Instructor Resource</Text>
          </View>
        ) : null}

        {/* Action Button & Form */}
        {!item.isCompleted && (
          activeSubmissionId === item.id ? (
            <View style={styles.submissionForm}>
              <View style={styles.inputContainer}>
                <Ionicons name="link-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Paste link to your work (GDocs, PDF, etc.)" placeholderTextColor="#94A3B8" value={workLink} onChangeText={setWorkLink} autoCapitalize="none" />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="chatbubble-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Add a note for the instructor (Optional)" placeholderTextColor="#94A3B8" value={notes} onChangeText={setNotes} />
              </View>
              
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveSubmissionId(null); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitActionBtn} onPress={() => handleSubmitWork(item.id)}>
                  <Text style={styles.submitActionText}>Send Work</Text>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.openSubmitBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveSubmissionId(item.id); }}>
              <Text style={styles.openSubmitText}>Turn In Assignment</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  const filteredAssignments = assignments.filter(task => activeTab === 'todo' ? !task.isCompleted : task.isCompleted);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- HEADER --- */}
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
            <Ionicons name="settings-outline" size={24} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutIcon} onPress={async () => { await supabase.auth.signOut(); router.replace('/'); }}>
            <Ionicons name="log-out-outline" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- PILL NAVIGATION --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'todo' && styles.activeTab]} onPress={() => switchTab('todo')}>
          <Text style={[styles.tabText, activeTab === 'todo' && styles.activeTabText]}>To Do</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.activeTab]} onPress={() => switchTab('completed')}>
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {/* --- MAIN CONTENT --- */}
      <View style={styles.content}>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeTab === 'todo' ? 'Pending Coursework' : 'Past Submissions'}</Text>
          <TouchableOpacity onPress={fetchData}>
            <Ionicons name="refresh" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : 
          filteredAssignments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name={activeTab === 'todo' ? "partying-face" : "folder-open-outline"} size={60} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{activeTab === 'todo' ? 'You are all caught up!' : 'No completed work yet.'}</Text>
              <Text style={styles.emptySub}>{activeTab === 'todo' ? 'Check back later for new assignments.' : 'Your submitted assignments will appear here.'}</Text>
            </View>
          ) : <FlatList data={filteredAssignments} keyExtractor={(i) => i.id} renderItem={renderAssignmentCard} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}/>
        }

      </View>
    </SafeAreaView>
  );
}

// PREMIUM STYLING
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 60 : 20, paddingBottom: 20, backgroundColor: '#F8FAFC' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#4F46E5', shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  avatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 18 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '600' },
  headerIcon: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  logoutIcon: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 100, marginHorizontal: 4 },
  activeTab: { backgroundColor: '#EEF2FF' }, 
  tabText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#4F46E5', fontWeight: '700' }, 
  
  content: { flex: 1, paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  assignmentTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4, flexShrink: 1 },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  deadlineText: { fontSize: 12, fontWeight: '700' },
  textWarning: { color: '#92400E' },
  textDanger: { color: '#991B1B' },
  textSuccess: { color: '#065F46' },
  
  descText: { fontSize: 15, color: '#475569', lineHeight: 24, marginBottom: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 10 },
  linkText: { fontSize: 14, color: '#4F46E5', fontWeight: '600', marginLeft: 8 },
  
  openSubmitBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  openSubmitText: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
  
  submissionForm: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  cancelBtn: { paddingHorizontal: 15, paddingVertical: 10 },
  cancelText: { color: '#64748B', fontWeight: '600' },
  submitActionBtn: { flexDirection: 'row', backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  submitActionText: { color: '#FFFFFF', fontWeight: '700' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#64748B', textAlign: 'center' },
});