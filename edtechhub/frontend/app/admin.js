import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Platform, StatusBar,
  TextInput, ScrollView, LayoutAnimation, UIManager, Linking, KeyboardAvoidingView
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
  );
}

/* ─────────────────────────────────────────────
   Chat Styles
───────────────────────────────────────────── */
const chatStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  miniAvatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 13 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  studentId: { fontSize: 12, color: '#64748B' },
  closeBtn: { padding: 4 },

  messageList: { maxHeight: 220 },
  emptyChat: { alignItems: 'center', paddingVertical: 24 },
  emptyChatText: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginTop: 8 },
  emptyChatSub: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },

  messageBubble: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginBottom: 8,
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  messageTime: { fontSize: 11, color: '#94A3B8', marginTop: 5, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#0F172A', maxHeight: 80,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#4F46E5', width: 42, height: 42,
    borderRadius: 21, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#A5B4FC' },
  hint: { fontSize: 10, color: '#94A3B8', textAlign: 'center', paddingBottom: 8 },
});

/* ─────────────────────────────────────────────
   Main Styles
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 20,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 2, fontWeight: '500' },
  logoutIcon: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12, elevation: 2 },

  /* Stats */
  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 16, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  statLbl: { fontSize: 11, color: '#64748B', marginTop: 2 },

  /* Tabs */
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 100, marginHorizontal: 4,
  },
  activeTab: { backgroundColor: '#EEF2FF' },
  tabText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#4F46E5', fontWeight: '700' },

  /* Content */
  content: { flex: 1, paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20, marginTop: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },

  /* Card */
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 18 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  approveBtn: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  rejectBtn: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  approveText: { color: '#FFFFFF', fontWeight: '700' },
  rejectText: { color: '#64748B', fontWeight: '600' },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  assignmentTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  badge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  deadlineText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  descText: { fontSize: 15, color: '#475569', marginBottom: 16 },
  trackBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FF', padding: 12, borderRadius: 10,
  },
  trackBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },

  /* Create form */
  createBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  createBtnText: { color: '#FFFFFF', fontWeight: '700' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, elevation: 4, marginBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
  },
  publishBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  publishBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  /* Empty */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16 },

  /* Tracker */
  backBtnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  backBtnText: { fontSize: 15, color: '#64748B', fontWeight: '600', marginLeft: 8 },
  trackerHeaderBox: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  trackerTargetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  trackerTargetSub: { fontSize: 14, color: '#EF4444', fontWeight: '600' },

  trackerSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 12,
  },
  trackerSectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  noStudentsText: { textAlign: 'center', marginTop: 20, color: '#64748B' },

  trackerRow: {
    backgroundColor: '#FFFFFF', padding: 16,
    borderRadius: 16, marginBottom: 12, elevation: 2,
  },
  trackerStudentInfo: { marginBottom: 10 },
  trackerStudentName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  trackerStudentRoll: { fontSize: 13, color: '#64748B', marginTop: 2 },

  submissionDetails: {
    backgroundColor: '#F8FAFC', padding: 16,
    borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  statusPillSuccess: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  statusTextSuccess: { color: '#065F46', fontSize: 12, fontWeight: '700' },
  viewWorkBtn: {
    flexDirection: 'row', backgroundColor: '#EEF2FF',
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center',
  },
  viewWorkText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  /* Review button */
  reviewBtn: {
    flexDirection: 'row', backgroundColor: '#F3E8FF',
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center',
  },
  reviewBtnActive: { backgroundColor: '#7C3AED' },
  reviewBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },

  notesText: {
    marginTop: 12, fontStyle: 'italic', color: '#475569', fontSize: 14,
    backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8,
  },

  statusPillDanger: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  statusTextDanger: { color: '#991B1B', fontSize: 12, fontWeight: '700' },
  statusPillWarning: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  statusTextWarning: { color: '#92400E', fontSize: 12, fontWeight: '700' },

  /* Grading */
  gradingDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  gradingInputBox: { flexDirection: 'row', alignItems: 'center' },
  gradeLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginRight: 10 },
  gradeInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 8, width: 60, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: '#0F172A', paddingVertical: 6,
  },
  percentSymbol: { fontSize: 16, fontWeight: '700', color: '#64748B', marginLeft: 4 },
  saveGradeBtn: {
    backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, marginLeft: 'auto',
  },
  saveGradeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  gradeDisplayBox: { flexDirection: 'row', alignItems: 'center' },
  gradeScorePill: {
    backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0',
  },
  gradeScoreText: { color: '#059669', fontWeight: '800', fontSize: 16 },
  editGradeIcon: { padding: 8, marginLeft: 10, backgroundColor: '#F1F5F9', borderRadius: 8 },

  /* Non-submitters panel */
  nonSubmitPanel: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FEE2E2',
  },
  nonSubmitHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  nonSubmitTitle: { fontSize: 15, fontWeight: '700', color: '#DC2626', flex: 1 },
  nonSubmitCount: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
  },
  nonSubmitCountText: { color: '#991B1B', fontWeight: '800', fontSize: 13 },
  nonSubmitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FEF2F2',
  },
  nonSubmitAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  nonSubmitAvatarText: { color: '#DC2626', fontWeight: 'bold', fontSize: 13 },
  nonSubmitStudentName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  nonSubmitStudentId: { fontSize: 12, color: '#64748B' },
  missedPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  missedPillText: { fontSize: 12, fontWeight: '700' },
  allSubmittedBox: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: '#F0FDF4', borderRadius: 12,
  },
  allSubmittedText: { fontSize: 14, fontWeight: '700', color: '#15803D', marginTop: 8 },
});