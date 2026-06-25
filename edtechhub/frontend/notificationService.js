import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  NEW_ASSIGNMENT: 'newAssignment',
  DEADLINE_REMINDER: 'deadline',
  ASSIGNMENT_GRADED: 'graded',
  SUBMISSION_CONFIRMED: 'submitConfirm',
};

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    const newAssign = await AsyncStorage.getItem('notif_newAssignment');
    const deadline = await AsyncStorage.getItem('notif_deadline');
    const graded = await AsyncStorage.getItem('notif_graded');
    const submitConfirm = await AsyncStorage.getItem('notif_submitConfirm');

    return {
      enabled: enabled !== 'false',
      newAssignment: newAssign !== 'false',
      deadline: deadline !== 'false',
      graded: graded !== 'false',
      submitConfirm: submitConfirm !== 'false',
    };
  } catch (error) {
    console.log('Error getting notification preferences:', error);
    return {
      enabled: true,
      newAssignment: true,
      deadline: true,
      graded: true,
      submitConfirm: true,
    };
  }
};

/**
 * Check if a specific notification type is enabled
 */
export const isNotificationTypeEnabled = async (type) => {
  const prefs = await getNotificationPreferences();
  
  if (!prefs.enabled) return false;

  switch (type) {
    case NOTIFICATION_TYPES.NEW_ASSIGNMENT:
      return prefs.newAssignment;
    case NOTIFICATION_TYPES.DEADLINE_REMINDER:
      return prefs.deadline;
    case NOTIFICATION_TYPES.ASSIGNMENT_GRADED:
      return prefs.graded;
    case NOTIFICATION_TYPES.SUBMISSION_CONFIRMED:
      return prefs.submitConfirm;
    default:
      return false;
  }
};

/**
 * Send a notification if the type is enabled
 */
export const sendNotification = async (type, title, body, assignmentId = null, delaySeconds = 1) => {
  const isEnabled = await isNotificationTypeEnabled(type);
  
  if (!isEnabled) {
    console.log(`Notification type ${type} is disabled`);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: 'default',
        badge: 1,
        data: {
          assignment_id: assignmentId,
          type: type,
        },
      },
      trigger: { seconds: delaySeconds },
    });

    console.log(`✅ Notification sent: ${title}`);
  } catch (error) {
    console.log('Error sending notification:', error);
  }
};

/**
 * Predefined notification templates
 */
export const notificationTemplates = {
  newAssignment: (assignmentTitle) => ({
    type: NOTIFICATION_TYPES.NEW_ASSIGNMENT,
    title: '📚 New Assignment Posted',
    body: `"${assignmentTitle}" has been assigned to you.`,
  }),

  deadlineToday: (assignmentTitle) => ({
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    title: '⏰ Deadline Today!',
    body: `"${assignmentTitle}" is due today!`,
  }),

  deadlineTomorrow: (assignmentTitle) => ({
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    title: '⏰ Deadline Tomorrow',
    body: `"${assignmentTitle}" is due tomorrow.`,
  }),

  deadlineIn3Days: (assignmentTitle) => ({
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    title: '📅 Upcoming Deadline',
    body: `"${assignmentTitle}" is due in 3 days.`,
  }),

  assignmentGraded: (assignmentTitle, grade) => ({
    type: NOTIFICATION_TYPES.ASSIGNMENT_GRADED,
    title: '✅ Your Work Has Been Graded',
    body: `"${assignmentTitle}" - Score: ${grade}%`,
  }),

  submissionConfirmed: (assignmentTitle) => ({
    type: NOTIFICATION_TYPES.SUBMISSION_CONFIRMED,
    title: '🎉 Submission Confirmed',
    body: `Your submission for "${assignmentTitle}" has been received.`,
  }),
};

/**
 * Send a notification using a template
 */
export const sendTemplateNotification = async (template, assignmentId = null) => {
  const { type, title, body } = template;
  await sendNotification(type, title, body, assignmentId);
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.log('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Set up notification handler (to be called on app startup)
 */
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};
