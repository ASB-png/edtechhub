import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../supabase';

export default function Register() {
  const { passedRole } = useLocalSearchParams();
  const currentRole = passedRole || 'Student';

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    // Admin passcode check — NEW passcode is 'admin'
    let finalStatus = 'pending';
    let finalRole = 'student';

    if (currentRole === 'Admin') {
      if (adminCode !== 'admin') {
        Alert.alert('🔒 Security Alert', 'Invalid Admin Passcode. Registration denied.');
        return;
      }
      finalStatus = 'approved';
      finalRole = 'admin';
    }

    setLoading(true);

    try {
      // Attempt to sign up
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      // Handle "already registered" for admin re-registration
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        const isAlreadyExists = msg.includes('already') || msg.includes('registered') || error.status === 422 || error.status === 400;

        if (currentRole === 'Admin' && isAlreadyExists) {
          // Try to sign in and upgrade
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password,
          });

          if (signInError) {
            Alert.alert('Login Error', `Account exists but sign-in failed: ${signInError.message}`);
            setLoading(false);
            return;
          }

          if (signInData.user) {
            const { error: upsertError } = await supabase.from('profiles').upsert({
              id: signInData.user.id,
              name: name,
              roll_number: idNumber,
              role: 'admin',
              status: 'approved',
            });

            if (upsertError) {
              Alert.alert('Profile Error', 'Signed in but could not upgrade profile: ' + upsertError.message);
            } else {
              Alert.alert('✅ Success', 'Admin account approved! Redirecting to dashboard...', [
                { text: 'OK', onPress: () => router.replace('/admin') }
              ]);
            }
            setLoading(false);
            return;
          }
        }

        Alert.alert('Registration Error', error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        Alert.alert('Error', 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Create profile record
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: data.user.id,
        name: name,
        roll_number: idNumber,
        role: finalRole,
        status: finalStatus,
      }]);

      if (profileError) {
        // Profile might already exist; try upsert
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: name,
          roll_number: idNumber,
          role: finalRole,
          status: finalStatus,
        });

        if (upsertError) {
          Alert.alert('Profile Error', 'Account created but profile save failed: ' + upsertError.message);
          setLoading(false);
          return;
        }
      }

      // Route based on role
      if (currentRole === 'Admin') {
        Alert.alert('✅ Admin Registered', 'Your admin account is approved. You can now log in.', [
          { text: 'Log In', onPress: () => router.replace('/') }
        ]);
      } else {
        Alert.alert(
          '📝 Application Submitted',
          'Your registration is pending Admin approval. You will be able to log in once approved.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      }
    } catch (err) {
      Alert.alert('Unexpected Error', err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>{currentRole === 'Admin' ? '🛡️' : '🎓'}</Text>
            <Text style={styles.title}>{currentRole} Registration</Text>
            <Text style={styles.subtitle}>Apply for secure access to AssignHub</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>
              {currentRole === 'Admin' ? 'Staff ID Number' : 'Roll Number'} (Optional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder={currentRole === 'Admin' ? 'e.g. STAFF-001' : 'e.g. CS-2026-01'}
              placeholderTextColor="#94A3B8"
              value={idNumber}
              onChangeText={setIdNumber}
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Admin passcode field */}
            {currentRole === 'Admin' && (
              <View style={styles.adminSection}>
                <Text style={styles.adminSectionTitle}>🔑 Admin Verification</Text>
                <Text style={styles.adminSectionDesc}>
                  An admin passcode is required to register as an administrator.
                </Text>
                <TextInput
                  style={[styles.input, styles.adminInput]}
                  placeholder="Enter admin passcode"
                  placeholderTextColor="#EF4444"
                  secureTextEntry
                  autoCapitalize="none"
                  value={adminCode}
                  onChangeText={setAdminCode}
                />
              </View>
            )}

            {/* Student info box */}
            {currentRole === 'Student' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ After registering, your account will be reviewed by an Admin. You'll be able to
                  log in once approved.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                currentRole === 'Admin' ? styles.adminButton : styles.studentButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    alignItems: 'center', padding: 20, paddingBottom: 40,
  },

  header: { alignItems: 'center', marginBottom: 28 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#1E293B', padding: 24,
    borderRadius: 20, borderWidth: 1, borderColor: '#334155',
  },

  label: {
    fontSize: 12, fontWeight: '700', color: '#94A3B8',
    marginBottom: 6, marginTop: 14,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    width: '100%', backgroundColor: '#0F172A',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#F1F5F9',
    borderWidth: 1, borderColor: '#334155',
  },

  /* Admin section */
  adminSection: {
    marginTop: 20, backgroundColor: '#1A0A0A',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#7F1D1D',
  },
  adminSectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#EF4444', marginBottom: 6,
  },
  adminSectionDesc: {
    fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 18,
  },
  adminInput: {
    backgroundColor: '#0F0A0A', borderColor: '#DC2626',
  },

  /* Info box */
  infoBox: {
    marginTop: 16, backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  infoText: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },

  submitButton: {
    width: '100%', padding: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 24,
  },
  studentButton: { backgroundColor: '#10B981' },
  adminButton: { backgroundColor: '#3B82F6' },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  backButton: { marginTop: 24, padding: 10 },
  backText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});