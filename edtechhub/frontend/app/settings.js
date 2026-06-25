import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  Switch, Platform, StatusBar, ScrollView, LayoutAnimation, UIManager, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

// Enable smooth animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState(null);
  
  // Notification Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [newAssignmentNotif, setNewAssignmentNotif] = useState(true);
  const [deadlineNotif, setDeadlineNotif] = useState(true);
  const [gradedNotif, setGradedNotif] = useState(true);
  const [submissionConfirmNotif, setSubmissionConfirmNotif] = useState(true);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    loadPreferences();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      const newAssign = await AsyncStorage.getItem('notif_newAssignment');
      const deadline = await AsyncStorage.getItem('notif_deadline');
      const graded = await AsyncStorage.getItem('notif_graded');
      const submitConfirm = await AsyncStorage.getItem('notif_submitConfirm');

      setNotificationsEnabled(enabled !== 'false');
      setNewAssignmentNotif(newAssign !== 'false');
      setDeadlineNotif(deadline !== 'false');
      setGradedNotif(graded !== 'false');
      setSubmissionConfirmNotif(submitConfirm !== 'false');
    } catch (error) {
      console.log('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
      await AsyncStorage.setItem('notif_newAssignment', newAssignmentNotif.toString());
      await AsyncStorage.setItem('notif_deadline', deadlineNotif.toString());
      await AsyncStorage.setItem('notif_graded', gradedNotif.toString());
      await AsyncStorage.setItem('notif_submitConfirm', submissionConfirmNotif.toString());

      // Send test notification
      if (notificationsEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Settings Updated',
            body: 'Your notification preferences have been saved.',
            sound: 'default',
          },
          trigger: { seconds: 1 },
        });
      }

      Alert.alert('Success', 'Notification settings have been saved!');
    } catch (error) {
      console.log('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = (value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotificationsEnabled(value);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- PROFILE SECTION --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.name || 'Student'}</Text>
              <Text style={styles.profileEmail}>{profile?.roll_number || 'No roll number'}</Text>
            </View>
          </View>
        </View>

        {/* --- NOTIFICATIONS MASTER TOGGLE --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Enable All Notifications</Text>
              <Text style={styles.settingDesc}>Turn on to receive all notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
              thumbColor={notificationsEnabled ? '#4F46E5' : '#CBD5E1'}
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </View>

        {/* --- NOTIFICATION TYPES --- */}
        {notificationsEnabled && (
          <View style={[styles.section, styles.fadeIn]}>
            <Text style={styles.sectionTitle}>Notification Types</Text>

            <View style={styles.notifTypeCard}>
              <View style={styles.notifTypeHeader}>
                <View style={styles.notifTypeIcon}>
                  <Ionicons name="document-attach-outline" size={20} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTypeName}>New Assignment</Text>
                  <Text style={styles.notifTypeDesc}>When instructors post new assignments</Text>
                </View>
                <Switch
                  value={newAssignmentNotif}
                  onValueChange={(val) => setNewAssignmentNotif(val)}
                  trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                  thumbColor={newAssignmentNotif ? '#4F46E5' : '#CBD5E1'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>

            <View style={styles.notifTypeCard}>
              <View style={styles.notifTypeHeader}>
                <View style={styles.notifTypeIcon}>
                  <Ionicons name="alarm-outline" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTypeName}>Deadline Reminder</Text>
                  <Text style={styles.notifTypeDesc}>Reminders for upcoming deadlines</Text>
                </View>
                <Switch
                  value={deadlineNotif}
                  onValueChange={(val) => setDeadlineNotif(val)}
                  trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                  thumbColor={deadlineNotif ? '#4F46E5' : '#CBD5E1'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>

            <View style={styles.notifTypeCard}>
              <View style={styles.notifTypeHeader}>
                <View style={styles.notifTypeIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTypeName}>Assignment Graded</Text>
                  <Text style={styles.notifTypeDesc}>When your work has been graded</Text>
                </View>
                <Switch
                  value={gradedNotif}
                  onValueChange={(val) => setGradedNotif(val)}
                  trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                  thumbColor={gradedNotif ? '#4F46E5' : '#CBD5E1'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>

            <View style={styles.notifTypeCard}>
              <View style={styles.notifTypeHeader}>
                <View style={styles.notifTypeIcon}>
                  <Ionicons name="paper-plane-outline" size={20} color="#6366F1" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTypeName}>Submission Confirmed</Text>
                  <Text style={styles.notifTypeDesc}>Confirmation when you submit work</Text>
                </View>
                <Switch
                  value={submissionConfirmNotif}
                  onValueChange={(val) => setSubmissionConfirmNotif(val)}
                  trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                  thumbColor={submissionConfirmNotif ? '#4F46E5' : '#CBD5E1'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>
          </View>
        )}

        {/* --- INFO SECTION --- */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#0284C7" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoTitle}>Push Notifications</Text>
              <Text style={styles.infoText}>
                Notifications help you stay updated on new assignments, deadlines, and grades. You can customize which notifications you receive.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* --- SAVE BUTTON --- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePreferences}
          disabled={saving}
        >
          <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748B',
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },

  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  profileAvatarText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 18,
  },

  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },

  profileEmail: {
    fontSize: 13,
    color: '#64748B',
  },

  settingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },

  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },

  settingDesc: {
    fontSize: 13,
    color: '#64748B',
  },

  fadeIn: {
    opacity: 1,
  },

  notifTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },

  notifTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  notifTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notifTypeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },

  notifTypeDesc: {
    fontSize: 12,
    color: '#64748B',
  },

  infoBox: {
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#075985',
    marginBottom: 4,
  },

  infoText: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 20 : 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
