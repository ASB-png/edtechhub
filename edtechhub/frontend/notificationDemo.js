/**
 * Notification Testing & Demo
 * 
 * This file contains example functions to test all notification types.
 * Used for development and testing purposes.
 */

import {
  sendNotification,
  NOTIFICATION_TYPES,
  notificationTemplates,
  sendTemplateNotification,
} from './notificationService';

/**
 * Test all notification types
 */
export const testAllNotifications = async () => {
  console.log('🧪 Testing all notification types...');

  // Test 1: Submission Confirmed
  await new Promise(resolve => setTimeout(resolve, 500));
  await sendNotification(
    NOTIFICATION_TYPES.SUBMISSION_CONFIRMED,
    '🎉 Submission Confirmed',
    'Your submission for "Math Assignment #3" has been received.',
    'assignment-123'
  );

  // Test 2: New Assignment
  await new Promise(resolve => setTimeout(resolve, 1000));
  await sendNotification(
    NOTIFICATION_TYPES.NEW_ASSIGNMENT,
    '📚 New Assignment Posted',
    '"Physics Project: Solar System Model" has been assigned to you.',
    'assignment-456'
  );

  // Test 3: Deadline Reminder
  await new Promise(resolve => setTimeout(resolve, 1000));
  await sendNotification(
    NOTIFICATION_TYPES.DEADLINE_REMINDER,
    '⏰ Deadline Tomorrow',
    '"English Essay: Climate Change" is due tomorrow.',
    'assignment-789'
  );

  // Test 4: Assignment Graded
  await new Promise(resolve => setTimeout(resolve, 1000));
  await sendNotification(
    NOTIFICATION_TYPES.ASSIGNMENT_GRADED,
    '✅ Your Work Has Been Graded',
    '"Chemistry Quiz" - Score: 92%',
    'assignment-101'
  );

  console.log('✅ All notifications sent for testing');
};

/**
 * Test specific notification type
 */
export const testNotificationType = async (type, assignmentTitle, grade = null) => {
  let template;

  switch (type) {
    case NOTIFICATION_TYPES.NEW_ASSIGNMENT:
      template = notificationTemplates.newAssignment(assignmentTitle);
      break;
    case NOTIFICATION_TYPES.DEADLINE_REMINDER:
      template = notificationTemplates.deadlineToday(assignmentTitle);
      break;
    case NOTIFICATION_TYPES.ASSIGNMENT_GRADED:
      template = notificationTemplates.assignmentGraded(assignmentTitle, grade || 85);
      break;
    case NOTIFICATION_TYPES.SUBMISSION_CONFIRMED:
      template = notificationTemplates.submissionConfirmed(assignmentTitle);
      break;
    default:
      console.log('Unknown notification type:', type);
      return;
  }

  await sendTemplateNotification(template);
  console.log(`✅ Test notification sent: ${template.title}`);
};

/**
 * Example: Send notifications to student from teacher perspective
 * (This would be used in admin/teacher dashboard)
 */
export const triggerTeacherNotifications = {
  /**
   * Notify students when a new assignment is posted
   */
  notifyNewAssignment: async (assignmentTitle, studentId) => {
    await sendNotification(
      NOTIFICATION_TYPES.NEW_ASSIGNMENT,
      `📚 New Assignment Posted`,
      `"${assignmentTitle}" has been assigned to you.`,
      studentId
    );
  },

  /**
   * Notify student when their work is graded
   */
  notifyGraded: async (assignmentTitle, grade, studentId) => {
    await sendNotification(
      NOTIFICATION_TYPES.ASSIGNMENT_GRADED,
      `✅ Your Work Has Been Graded`,
      `"${assignmentTitle}" - Score: ${grade}%`,
      studentId
    );
  },

  /**
   * Bulk notify students of deadline
   */
  notifyBulkDeadline: async (assignmentTitle, studentIds) => {
    for (const studentId of studentIds) {
      await sendNotification(
        NOTIFICATION_TYPES.DEADLINE_REMINDER,
        `⏰ Deadline Reminder`,
        `"${assignmentTitle}" deadline is approaching.`,
        studentId
      );
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between notifications
    }
  },
};

export default {
  testAllNotifications,
  testNotificationType,
  triggerTeacherNotifications,
};
