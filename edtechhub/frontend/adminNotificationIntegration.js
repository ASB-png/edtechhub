/**
 * Admin Notification Integration Example
 * 
 * This file shows how to integrate push notifications into the admin/teacher dashboard
 * to send notifications to students when posting assignments, grading work, etc.
 */

import { sendNotification, NOTIFICATION_TYPES, notificationTemplates, sendTemplateNotification } from './notificationService';

/**
 * Example: Admin Dashboard Integration
 * 
 * This would be added to your admin.js file
 */

/**
 * ✅ Send notification when posting a new assignment
 * @param {string} assignmentTitle - Title of the assignment
 * @param {array} studentIds - List of student IDs to notify (or all students)
 */
export const notifyStudentsNewAssignment = async (assignmentTitle, studentIds) => {
  console.log(`📚 Notifying ${studentIds.length} students of new assignment: "${assignmentTitle}"`);
  
  for (const studentId of studentIds) {
    await sendNotification(
      NOTIFICATION_TYPES.NEW_ASSIGNMENT,
      '📚 New Assignment Posted',
      `"${assignmentTitle}" has been assigned to you.`,
      studentId,
      1 // 1 second delay
    );
    
    // Small delay between notifications to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ All notifications sent');
};

/**
 * ✅ Send notification when grading an assignment
 * @param {string} assignmentTitle - Title of the assignment
 * @param {string} studentId - Student ID
 * @param {number} grade - Grade percentage
 */
export const notifyStudentGraded = async (assignmentTitle, studentId, grade) => {
  console.log(`✅ Sending grade notification to student ${studentId}`);
  
  await sendNotification(
    NOTIFICATION_TYPES.ASSIGNMENT_GRADED,
    '✅ Your Work Has Been Graded',
    `"${assignmentTitle}" - Score: ${grade}%`,
    studentId
  );
};

/**
 * ✅ Bulk notify students of upcoming deadline
 * @param {string} assignmentTitle - Title of the assignment
 * @param {array} studentIds - List of student IDs
 * @param {number} daysUntilDeadline - Number of days until deadline
 */
export const notifyStudentsDeadline = async (assignmentTitle, studentIds, daysUntilDeadline) => {
  console.log(`⏰ Notifying ${studentIds.length} students of deadline for "${assignmentTitle}" (${daysUntilDeadline} days)`);
  
  let title = '';
  if (daysUntilDeadline === 0) {
    title = '📚 New Assignment Posted';
  } else if (daysUntilDeadline === 1) {
    title = '⏰ Deadline Tomorrow';
  } else if (daysUntilDeadline === 3) {
    title = '📅 Upcoming Deadline';
  } else {
    title = `📅 Deadline in ${daysUntilDeadline} days`;
  }
  
  for (const studentId of studentIds) {
    await sendNotification(
      NOTIFICATION_TYPES.DEADLINE_REMINDER,
      title,
      `"${assignmentTitle}" is due in ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'}.`,
      studentId
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ All deadline notifications sent');
};

/**
 * ✅ Example integration in Admin Post Assignment Function
 * 
 * Add this to your admin.js when posting a new assignment:
 */
export const handlePostNewAssignment = async (assignmentData, studentIds) => {
  try {
    // 1. Save assignment to database (existing code)
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select();

    if (error) {
      console.error('Error posting assignment:', error);
      return;
    }

    // 2. Send notifications to students
    const newAssignment = data[0];
    await notifyStudentsNewAssignment(newAssignment.title, studentIds);

    return { success: true, assignment: newAssignment };
  } catch (err) {
    console.error('Error in handlePostNewAssignment:', err);
    return { success: false, error: err.message };
  }
};

/**
 * ✅ Example integration in Admin Grade Assignment Function
 * 
 * Add this to your admin.js when grading an assignment:
 */
export const handleGradeAssignment = async (submissionId, grade, studentId, assignmentTitle) => {
  try {
    // 1. Update grade in database (existing code)
    const { data, error } = await supabase
      .from('submissions')
      .update({ grade: grade })
      .eq('id', submissionId)
      .select();

    if (error) {
      console.error('Error saving grade:', error);
      return;
    }

    // 2. Send notification to student
    await notifyStudentGraded(assignmentTitle, studentId, grade);

    return { success: true, submission: data[0] };
  } catch (err) {
    console.error('Error in handleGradeAssignment:', err);
    return { success: false, error: err.message };
  }
};

/**
 * ✅ Button Component Example for Admin Dashboard
 * 
 * Example JSX for admin dashboard:
 * 
 * ```jsx
 * const AdminAssignmentCard = ({ assignment }) => {
 *   const [notifying, setNotifying] = useState(false);
 * 
 *   const handleNotifyStudents = async () => {
 *     setNotifying(true);
 *     try {
 *       const studentIds = assignment.students.map(s => s.id);
 *       await notifyStudentsNewAssignment(assignment.title, studentIds);
 *       Alert.alert('Success', `${studentIds.length} students notified!`);
 *     } catch (error) {
 *       Alert.alert('Error', 'Failed to send notifications');
 *     } finally {
 *       setNotifying(false);
 *     }
 *   };
 * 
 *   return (
 *     <View style={styles.card}>
 *       <Text style={styles.title}>{assignment.title}</Text>
 *       <TouchableOpacity
 *         style={styles.notifyButton}
 *         onPress={handleNotifyStudents}
 *         disabled={notifying}
 *       >
 *         <Ionicons name="notifications-outline" size={16} color="#FFF" />
 *         <Text style={styles.buttonText}>
 *           {notifying ? 'Sending...' : 'Notify Students'}
 *         </Text>
 *       </TouchableOpacity>
 *     </View>
 *   );
 * };
 * ```
 */

/**
 * ✅ Scheduled Deadline Reminders (Optional)
 * 
 * For automatic deadline reminders, you can set up a scheduler:
 */
export const scheduleDailyDeadlineReminders = async () => {
  // This would typically run as a cron job on your backend
  // Or use a library like react-native-cron or expo-task-manager
  
  console.log('⏰ Checking for upcoming deadlines...');
  
  try {
    // 1. Get all assignments with deadlines in next 3 days
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, deadline')
      .gte('deadline', new Date().toISOString())
      .lte('deadline', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

    // 2. For each assignment, get all students who haven't submitted
    for (const assignment of assignments) {
      const { data: incompleteSubmissions } = await supabase
        .from('submissions')
        .select('student_id')
        .eq('assignment_id', assignment.id);

      const submittedStudentIds = new Set(incompleteSubmissions?.map(s => s.student_id));

      // 3. Get all enrolled students
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      // 4. Filter students who haven't submitted
      const studentsToNotify = students
        ?.filter(s => !submittedStudentIds.has(s.id))
        .map(s => s.id) || [];

      if (studentsToNotify.length > 0) {
        const daysUntilDeadline = Math.ceil(
          (new Date(assignment.deadline) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        await notifyStudentsDeadline(assignment.title, studentsToNotify, daysUntilDeadline);
      }
    }

    console.log('✅ Daily deadline reminders completed');
  } catch (error) {
    console.error('Error scheduling deadline reminders:', error);
  }
};

/**
 * ✅ Notification Analytics (Optional)
 * 
 * Track which notifications were opened by students
 */
export const trackNotificationOpen = async (notificationType, studentId, assignmentId) => {
  try {
    await supabase.from('notification_analytics').insert([
      {
        type: notificationType,
        student_id: studentId,
        assignment_id: assignmentId,
        opened_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error('Error tracking notification:', error);
  }
};

export default {
  notifyStudentsNewAssignment,
  notifyStudentGraded,
  notifyStudentsDeadline,
  handlePostNewAssignment,
  handleGradeAssignment,
  scheduleDailyDeadlineReminders,
  trackNotificationOpen,
};
