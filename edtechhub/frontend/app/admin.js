import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Platform, StatusBar,
  TextInput, ScrollView, LayoutAnimation, UIManager, Linking, KeyboardAvoidingView,
  Image, Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─────────────────────────────────────────────
   Review Chat Panel (Admin writes, student reads)
───────────────────────────────────────────── */
function ReviewChatPanel({ assignmentId, student, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [assignmentId, student]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', student.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    const { error } = await supabase.from('reviews').insert([{
      assignment_id: assignmentId,
      student_id: student.id,
      message: newMsg.trim(),
    }]);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewMsg('');
      fetchMessages();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
    setSending(false);
  };

  const handleDelete = async (msgId) => {
    Alert.alert('Delete', 'Remove this feedback message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('reviews').delete().eq('id', msgId);
          fetchMessages();
        }
      }
    ]);
  };

  return (
    <View style={chatStyles.container}>
      {/* Panel Header */}
      <View style={chatStyles.header}>
        <View style={chatStyles.headerLeft}>
          <View style={chatStyles.miniAvatar}>
            <Text style={chatStyles.miniAvatarText}>
              {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
            </Text>
          </View>
          <View>
            <Text style={chatStyles.studentName}>{student.name}</Text>
            <Text style={chatStyles.studentId}>{student.roll_number}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn}>
          <Ionicons name="close" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={chatStyles.messageList}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {loading ? (
          <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
        ) : messages.length === 0 ? (
          <View style={chatStyles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={40} color="#CBD5E1" />
            <Text style={chatStyles.emptyChatText}>No feedback yet.</Text>
            <Text style={chatStyles.emptyChatSub}>Write your first review below.</Text>
          </View>
        ) : messages.map(msg => (
          <TouchableOpacity key={msg.id} onLongPress={() => handleDelete(msg.id)}>
            <View style={chatStyles.messageBubble}>
              <Text style={chatStyles.messageText}>{msg.message}</Text>
              <Text style={chatStyles.messageTime}>
                {new Date(msg.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={chatStyles.inputRow}>
          <TextInput
            style={chatStyles.input}
            placeholder="Write feedback for student..."
            placeholderTextColor="#94A3B8"
            value={newMsg}
            onChangeText={setNewMsg}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[chatStyles.sendBtn, (!newMsg.trim() || sending) && chatStyles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMsg.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={chatStyles.hint}>Long-press a message to delete it</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─────────────────────────────────────────────
   Non-Submitters Panel
───────────────────────────────────────────── */
function NonSubmittersPanel({ assignment, approvedStudents, allSubmissions, onReview }) {
  const submitted = allSubmissions.filter(s => s.assignment_id === assignment.id);
  const submittedIds = new Set(submitted.map(s => s.student_id));
  const notSubmitted = approvedStudents.filter(s => !submittedIds.has(s.id));
  const isDeadlinePassed = new Date(assignment.deadline) < new Date();

  return (
    <View style={styles.nonSubmitPanel}>
      <View style={styles.nonSubmitHeader}>
        <Ionicons name="people-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
        <Text style={styles.nonSubmitTitle}>Not Yet Submitted</Text>
        <View style={styles.nonSubmitCount}>
          <Text style={styles.nonSubmitCountText}>{notSubmitted.length}</Text>
        </View>
      </View>

      {notSubmitted.length === 0 ? (
        <View style={styles.allSubmittedBox}>
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <Text style={styles.allSubmittedText}>All students have submitted!</Text>
        </View>
      ) : (
        notSubmitted.map(student => (
          <View key={student.id} style={styles.nonSubmitRow}>
            <View style={styles.nonSubmitAvatar}>
              <Text style={styles.nonSubmitAvatarText}>
                {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nonSubmitStudentName}>{student.name}</Text>
              <Text style={styles.nonSubmitStudentId}>{student.roll_number}</Text>
            </View>
            <View style={[styles.missedPill, { backgroundColor: isDeadlinePassed ? '#FEE2E2' : '#FEF3C7' }]}>
              <Text style={[styles.missedPillText, { color: isDeadlinePassed ? '#991B1B' : '#92400E' }]}>
                {isDeadlinePassed ? 'Missed' : 'Pending'}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────
   Main Admin Dashboard
───────────────────────────────────────────── */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  // Data
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Grading
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [tempGrade, setTempGrade] = useState('');

  // Review Chat
  const [reviewTarget, setReviewTarget] = useState(null); // { student, submission }

  // Form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles').select('*').eq('role', 'student');
    setPendingUsers(profiles?.filter(p => p.status === 'pending') || []);
    setApprovedStudents(profiles?.filter(p => p.status === 'approved') || []);

    const { data: tasks } = await supabase
      .from('assignments').select('*').order('created_at', { ascending: false });
    setAssignments(tasks || []);

    const { data: subs } = await supabase.from('submissions').select('*');
    setAllSubmissions(subs || []);
    setLoading(false);
  };

  const switchTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
    setIsCreating(false);
    setSelectedAssignment(null);
    setEditingGradeId(null);
    setReviewTarget(null);
  };

  /* ── Actions ── */
  const handleApprove = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    if (!error) fetchAllData();
  };

  const handleReject = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    if (!error) fetchAllData();
  };

  const handlePublishAssignment = async () => {
    if (!title || !deadline) return Alert.alert('Required', 'Title and Deadline are required.');
    const formattedDeadline = `${deadline}T23:59:59Z`;
    const { error } = await supabase.from('assignments').insert([{
      title, description: desc, file_url: link, deadline: formattedDeadline
    }]);
    if (error) Alert.alert('Error', error.message);
    else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsCreating(false);
      setTitle(''); setDesc(''); setLink(''); setDeadline('');
      fetchAllData();
    }
  };

  const openLink = (url) => {
    if (url) {
      const valid = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(valid).catch(() => Alert.alert('Invalid Link', 'Could not open URL.'));
    }
  };

  const handleSaveGrade = async (submissionId) => {
    const num = parseInt(tempGrade);
    if (isNaN(num) || num < 0 || num > 100) {
      Alert.alert('Invalid Grade', 'Enter a number between 0 and 100.');
      return;
    }
    const { error } = await supabase
      .from('submissions').update({ grade: num }).eq('id', submissionId);
    if (error) Alert.alert('Error Saving Grade', error.message);
    else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditingGradeId(null);
      setTempGrade('');
      fetchAllData();
    }
  };

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  /* ─── Stats for analytics header ─── */
  const totalStudents = approvedStudents.length;
  const totalAssignments = assignments.length;
  const totalSubmissions = allSubmissions.length;

  /* ─── Render helpers ─── */
  const renderStudentCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(item.name)}</Text></View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>ID: {item.roll_number}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
          <Text style={styles.rejectText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAssignmentCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.assignmentTitleRow}>
          <Ionicons name="document-text" size={20} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.deadlineText}>{new Date(item.deadline).toLocaleDateString()}</Text>
        </View>
      </View>
      {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
      {activeTab === 'analytics' && (
        <TouchableOpacity style={styles.trackBtn} onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setSelectedAssignment(item);
          setReviewTarget(null);
        }}>
          <Text style={styles.trackBtnText}>Track Submissions</Text>
          <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSubmissionTrackerRow = ({ item: student }) => {
    const submission = allSubmissions.find(
      s => s.assignment_id === selectedAssignment.id && s.student_id === student.id
    );
    const isLate = !submission && new Date(selectedAssignment.deadline) < new Date();
    const hasGrade = submission && submission.grade != null;
    const chatOpen = reviewTarget?.student?.id === student.id;

    return (
      <View style={styles.trackerRow}>
        <View style={styles.trackerStudentInfo}>
          <Text style={styles.trackerStudentName}>{student.name}</Text>
          <Text style={styles.trackerStudentRoll}>{student.roll_number}</Text>
        </View>

        {submission ? (
          <View style={styles.submissionDetails}>
            {/* Submitted header row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={styles.statusPillSuccess}>
                <Text style={styles.statusTextSuccess}>Submitted</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.viewWorkBtn} onPress={() => openLink(submission.file_url)}>
                  <Ionicons name="open-outline" size={15} color="#4F46E5" style={{ marginRight: 4 }} />
                  <Text style={styles.viewWorkText}>View</Text>
                </TouchableOpacity>
                {/* Review button */}
                <TouchableOpacity
                  style={[styles.reviewBtn, chatOpen && styles.reviewBtnActive]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setReviewTarget(chatOpen ? null : { student, submission });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={15} color={chatOpen ? '#FFFFFF' : '#7C3AED'} style={{ marginRight: 4 }} />
                  <Text style={[styles.reviewBtnText, chatOpen && { color: '#FFFFFF' }]}>
                    {chatOpen ? 'Close' : 'Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {submission.notes ? (
              <Text style={styles.notesText}>"{submission.notes}"</Text>
            ) : null}

            {/* Review Chat Panel */}
            {chatOpen && (
              <ReviewChatPanel
                assignmentId={selectedAssignment.id}
                student={student}
                onClose={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setReviewTarget(null);
                }}
              />
            )}

            {/* Grading */}
            <View style={styles.gradingDivider} />
            {hasGrade && editingGradeId !== submission.id ? (
              <View style={styles.gradeDisplayBox}>
                <Text style={styles.gradeLabel}>Final Score:</Text>
                <View style={styles.gradeScorePill}>
                  <Text style={styles.gradeScoreText}>{submission.grade}%</Text>
                </View>
                <TouchableOpacity
                  style={styles.editGradeIcon}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setEditingGradeId(submission.id);
                    setTempGrade(submission.grade.toString());
                  }}
                >
                  <Ionicons name="pencil" size={15} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.gradingInputBox}>
                <Text style={styles.gradeLabel}>{hasGrade ? 'Edit Score:' : 'Assign Score:'}</Text>
                <TextInput
                  style={styles.gradeInput}
                  placeholder="0-100"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={3}
                  value={editingGradeId === submission.id ? tempGrade : ''}
                  onChangeText={(val) => {
                    setEditingGradeId(submission.id);
                    setTempGrade(val);
                  }}
                />
                <Text style={styles.percentSymbol}>%</Text>
                {editingGradeId === submission.id && tempGrade.length > 0 && (
                  <TouchableOpacity style={styles.saveGradeBtn} onPress={() => handleSaveGrade(submission.id)}>
                    <Text style={styles.saveGradeBtnText}>Save</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : isLate ? (
          <View style={styles.statusPillDanger}><Text style={styles.statusTextDanger}>Missed Deadline</Text></View>
        ) : (
          <View style={styles.statusPillWarning}><Text style={styles.statusTextWarning}>Pending</Text></View>
        )}
      </View>
    );
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <View style={{ flex: 1 }}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Workspace</Text>
          <Text style={styles.subtitle}>Admin Portal</Text>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['approvals', 'assignments', 'analytics'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => switchTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>

        {/* ══ APPROVALS ══ */}
        {activeTab === 'approvals' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Access Requests</Text>
              <TouchableOpacity onPress={fetchAllData}>
                <Ionicons name="refresh" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {loading
              ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
              : pendingUsers.length === 0
                ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>All caught up!</Text></View>
                : <FlatList data={pendingUsers} renderItem={renderStudentCard} showsVerticalScrollIndicator={false} />
            }
          </>
        )}

        {/* ══ ASSIGNMENTS ══ */}
        {activeTab === 'assignments' && (
          <>
            {!isCreating ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Coursework</Text>
                  <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)}>
                    <Text style={styles.createBtnText}>+ New</Text>
                  </TouchableOpacity>
                </View>
                {loading
                  ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
                  : <FlatList data={assignments} renderItem={renderAssignmentCard} showsVerticalScrollIndicator={false} />
                }
              </>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formHeader}>
                  <Text style={styles.sectionTitle}>Draft Assignment</Text>
                  <TouchableOpacity onPress={() => setIsCreating(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.formCard}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput style={styles.input} value={title} onChangeText={setTitle} />
                  <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={deadline} onChangeText={setDeadline} />
                  <Text style={styles.label}>Instructions</Text>
                  <TextInput style={[styles.input, { height: 100 }]} value={desc} onChangeText={setDesc} multiline />
                  <Text style={styles.label}>Resource Link</Text>
                  <TextInput style={styles.input} value={link} onChangeText={setLink} autoCapitalize="none" />
                  <TouchableOpacity style={styles.publishBtn} onPress={handlePublishAssignment}>
                    <Text style={styles.publishBtnText}>Publish</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* ══ ANALYTICS (tracker, non-submitters, grading, review) ══ */}
        {activeTab === 'analytics' && (
          <>
            {!selectedAssignment ? (
              <>
                {/* Stats overview */}
                {!loading && (
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>{totalStudents}</Text>
                      <Text style={styles.statLbl}>Students</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNum, { color: '#4F46E5' }]}>{totalAssignments}</Text>
                      <Text style={styles.statLbl}>Assignments</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNum, { color: '#10B981' }]}>{totalSubmissions}</Text>
                      <Text style={styles.statLbl}>Submissions</Text>
                    </View>
                  </View>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Select Coursework</Text>
                  <TouchableOpacity onPress={fetchAllData}>
                    <Ionicons name="refresh" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                {loading
                  ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
                  : assignments.length === 0
                    ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>No assignments to track.</Text></View>
                    : <FlatList data={assignments} renderItem={renderAssignmentCard} showsVerticalScrollIndicator={false} />
                }
              </>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Back button */}
                <TouchableOpacity style={styles.backBtnRow} onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedAssignment(null);
                  setReviewTarget(null);
                }}>
                  <Ionicons name="arrow-back" size={20} color="#64748B" />
                  <Text style={styles.backBtnText}>Back to List</Text>
                </TouchableOpacity>

                {/* Assignment header */}
                <View style={styles.trackerHeaderBox}>
                  <Text style={styles.trackerTargetTitle}>{selectedAssignment.title}</Text>
                  <Text style={styles.trackerTargetSub}>
                    Due: {new Date(selectedAssignment.deadline).toLocaleDateString()}
                  </Text>
                </View>

                {/* ── Non-submitters panel ── */}
                <NonSubmittersPanel
                  assignment={selectedAssignment}
                  approvedStudents={approvedStudents}
                  allSubmissions={allSubmissions}
                  onReview={(student) => setReviewTarget({ student })}
                />

                {/* ── Submission tracker (all students) ── */}
                <View style={styles.trackerSectionHeader}>
                  <Ionicons name="list-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.trackerSectionTitle}>All Submissions</Text>
                </View>

                {approvedStudents.length === 0 ? (
                  <Text style={styles.noStudentsText}>No approved students in the system.</Text>
                ) : (
                  approvedStudents.map(student => (
                    <View key={student.id}>
                      {renderSubmissionTrackerRow({ item: student })}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>
      </SafeAreaView>
    </View>
  );
}

/* ─────────────────────────────────────────────
   Chat Styles
───────────────────────────────────────────── */
const chatStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  miniAvatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 13 },
  studentName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  studentId: { fontSize: 11, color: '#64748B' },
  closeBtn: { padding: 4 },

  messageList: { maxHeight: 220 },
  emptyChat: { alignItems: 'center', paddingVertical: 24 },
  emptyChatText: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  emptyChatSub: { fontSize: 11, color: '#CBD5E1', marginTop: 4 },

  messageBubble: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginBottom: 8,
    borderBottomRightRadius: 4, borderWidth: 1, borderColor: '#E0E7FF',
  },
  messageText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  messageTime: { fontSize: 10, color: '#94A3B8', marginTop: 5, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#1E293B', maxHeight: 80,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#4F46E5', width: 42, height: 42,
    borderRadius: 21, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#A5B4FC' },
  hint: { fontSize: 10, color: '#94A3B8', textAlign: 'center', paddingBottom: 8, backgroundColor: '#F8FAFC' },
});

/* ─────────────────────────────────────────────
   Main Styles
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(241, 245, 249, 0.65)' }, // light slate glass tint

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#4F46E5', marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  logoutIcon: { padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20, padding: 16, marginBottom: 20, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  statLbl: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '700' },

  /* Tabs */
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 6, 
    marginVertical: 14, 
    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
    borderRadius: 14, 
    padding: 6, 
    marginHorizontal: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.4)' 
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, marginHorizontal: 2,
  },
  activeTab: { backgroundColor: '#4F46E5', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  activeTabText: { color: '#FFFFFF', fontWeight: '800' },

  /* Content */
  content: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, marginTop: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  /* Card */
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16, 
    elevation: 3,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 }
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1.5, borderColor: '#A5B4FC',
  },
  avatarText: { color: '#4F46E5', fontWeight: '900', fontSize: 16 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  rejectBtn: { backgroundColor: 'transparent', borderColor: '#EF4444' },
  approveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  assignmentTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: '#FEE2E2' },
  deadlineText: { fontSize: 11, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' },
  descText: { fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 20 },
  trackBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  trackBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },

  /* Create form */
  createBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formCard: { backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 24, borderRadius: 24, elevation: 4, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)' },
  label: { fontSize: 13, fontWeight: '700', color: '#4F46E5', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1E293B',
  },
  publishBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  publishBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* Empty */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#64748B', marginTop: 16 },

  /* Tracker */
  backBtnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  backBtnText: { fontSize: 14, color: '#64748B', fontWeight: '700', marginLeft: 8 },
  trackerHeaderBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 20, borderRadius: 18,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  trackerTargetTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  trackerTargetSub: { fontSize: 13, color: '#EF4444', fontWeight: '700' },

  trackerSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 12,
  },
  trackerSectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  noStudentsText: { textAlign: 'center', marginTop: 20, color: '#64748B' },

  trackerRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: 16,
    borderRadius: 18, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  trackerStudentInfo: { marginBottom: 10 },
  trackerStudentName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  trackerStudentRoll: { fontSize: 12, color: '#64748B', marginTop: 2 },

  submissionDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 14,
    borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statusPillSuccess: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: '#A7F3D0'
  },
  statusTextSuccess: { color: '#065F46', fontSize: 11, fontWeight: '800' },
  viewWorkBtn: {
    flexDirection: 'row', backgroundColor: '#EEF2FF',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E0E7FF'
  },
  viewWorkText: { color: '#4F46E5', fontWeight: '800', fontSize: 12 },

  /* Review button */
  reviewBtn: {
    flexDirection: 'row', backgroundColor: '#F3E8FF',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF'
  },
  reviewBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  reviewBtnText: { color: '#7C3AED', fontWeight: '800', fontSize: 12 },

  notesText: {
    marginTop: 12, fontStyle: 'italic', color: '#475569', fontSize: 13,
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0'
  },

  statusPillDanger: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: '#FCA5A5'
  },
  statusTextDanger: { color: '#B91C1C', fontSize: 11, fontWeight: '800' },
  statusPillWarning: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: '#FDE68A'
  },
  statusTextWarning: { color: '#B45309', fontSize: 11, fontWeight: '800' },

  /* Grading */
  gradingDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  gradingInputBox: { flexDirection: 'row', alignItems: 'center' },
  gradeLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginRight: 10 },
  gradeInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 8, width: 60, textAlign: 'center',
    fontSize: 15, fontWeight: '850', color: '#1E293B', paddingVertical: 6,
  },
  percentSymbol: { fontSize: 15, fontWeight: '800', color: '#64748B', marginLeft: 4 },
  saveGradeBtn: {
    backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginLeft: 'auto',
  },
  saveGradeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  gradeDisplayBox: { flexDirection: 'row', alignItems: 'center' },
  gradeScorePill: {
    backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0',
  },
  gradeScoreText: { color: '#047857', fontWeight: '900', fontSize: 15 },
  editGradeIcon: { padding: 8, marginLeft: 10, backgroundColor: '#F1F5F9', borderRadius: 8 },

  /* Non-submitters panel */
  nonSubmitPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FEE2E2',
  },
  nonSubmitHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  nonSubmitTitle: { fontSize: 14, fontWeight: '800', color: '#EF4444', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  nonSubmitCount: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  nonSubmitCountText: { color: '#B91C1C', fontWeight: '900', fontSize: 12 },
  nonSubmitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FEE2E2',
  },
  nonSubmitAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  nonSubmitAvatarText: { color: '#EF4444', fontWeight: '800', fontSize: 12 },
  nonSubmitStudentName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  nonSubmitStudentId: { fontSize: 11, color: '#64748B' },
  missedPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  missedPillText: { fontSize: 11, fontWeight: '800' },
  allSubmittedBox: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0'
  },
  allSubmittedText: { fontSize: 13, fontWeight: '800', color: '#166534', marginTop: 8 },
});