import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Easing, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, Alert
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../supabase';

const { height } = Dimensions.get('window');

export default function Home() {
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, { toValue: -50, duration: 15000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(moveAnim, { toValue: 0, duration: 15000, easing: Easing.linear, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    // If admin role selected, require passcode upfront
    if (role === 'Admin') {
      if (!adminPasscode) {
        Alert.alert('Admin Passcode Required', 'Please enter the admin passcode to continue.');
        return;
      }
      if (adminPasscode !== 'admin') {
        Alert.alert('Access Denied', '❌ Invalid Admin Passcode.');
        return;
      }
    }

    setLoading(true);

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) {
        Alert.alert('Login Failed', authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Fetch profile from DB
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, status, name')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        Alert.alert('Profile Error', 'Could not retrieve your user profile. Please contact admin.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Step 3: Role mismatch check
      // If user selected Student but their DB role is admin, block
      if (role === 'Student' && profileData.role === 'admin') {
        Alert.alert(
          'Wrong Portal',
          'This account is an Admin account. Please select "Admin" and enter the admin passcode.'
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // If user selected Admin but DB role is student, block
      if (role === 'Admin' && profileData.role === 'student') {
        Alert.alert(
          'Wrong Portal',
          'This account is a Student account. Please select "Student" to log in.'
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Step 4: Handle Admin login with passcode (already validated above)
      if (role === 'Admin') {
        // If admin account is not yet approved, auto-approve it now
        if (profileData.status !== 'approved') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ status: 'approved', role: 'admin' })
            .eq('id', authData.user.id);

          if (updateError) {
            Alert.alert('Update Error', 'Could not approve admin account: ' + updateError.message);
            setLoading(false);
            return;
          }
        }
        // Admin is approved — go to admin dashboard
        setLoading(false);
        router.replace('/admin');
        return;
      }

      // Step 5: Handle Student login
      if (role === 'Student') {
        if (profileData.status === 'pending') {
          Alert.alert(
            'Pending Approval',
            '🔒 Your registration is awaiting Admin approval. Please check back later.'
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profileData.status === 'rejected') {
          Alert.alert(
            'Access Revoked',
            '❌ Your application has been rejected. Please contact your instructor.'
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profileData.status === 'approved') {
          setLoading(false);
          router.replace('/student');
          return;
        }

        // Unknown status fallback
        Alert.alert('Account Error', 'Your account status is unknown. Contact admin.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

    } catch (err) {
      Alert.alert('Unexpected Error', err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Background */}
      <Animated.Image
        source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop' }}
        style={[styles.backgroundImage, { transform: [{ scale: 1.2 }, { translateX: moveAnim }] }]}
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
      >
        <View style={styles.glassCard}>
          <Text style={styles.logoText}>📝 AssignHub</Text>
          <Text style={styles.taglineText}>Secure Learning Portal</Text>

          {/* Role Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, role === 'Student' && styles.activeStudentToggle]}
              onPress={() => { setRole('Student'); setAdminPasscode(''); }}
            >
              <Text style={[styles.toggleText, role === 'Student' && styles.activeToggleText]}>
                🎓 Student
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, role === 'Admin' && styles.activeAdminToggle]}
              onPress={() => setRole('Admin')}
            >
              <Text style={[styles.toggleText, role === 'Admin' && styles.activeToggleText]}>
                🛡️ Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Admin Passcode — only shown when Admin is selected */}
          {role === 'Admin' && (
            <View style={styles.adminPasscodeWrapper}>
              <Text style={styles.adminPasscodeLabel}>🔑 Admin Passcode</Text>
              <TextInput
                style={[styles.input, styles.adminPasscodeInput]}
                placeholder="Enter admin passcode"
                placeholderTextColor="#EF4444"
                value={adminPasscode}
                onChangeText={setAdminPasscode}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              role === 'Admin' ? styles.adminTheme : styles.studentTheme,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Verifying...' : `Sign In as ${role}`}
            </Text>
          </TouchableOpacity>

          {/* Status hint */}
          <View style={styles.hintBox}>
            {role === 'Student' ? (
              <Text style={styles.hintText}>
                💡 Students must be approved by an Admin before logging in.
              </Text>
            ) : (
              <Text style={styles.hintText}>
                🛡️ Admin accounts require the admin passcode to access the portal.
              </Text>
            )}
          </View>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerContainer}
            onPress={() => router.push({ pathname: '/register', params: { passedRole: role } })}
          >
            <Text style={styles.registerText}>
              New to AssignHub?{' '}
              <Text style={[styles.registerLink, role === 'Admin' && { color: '#3B82F6' }]}>
                Apply Here
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: {
    position: 'absolute', width: '120%', height: height, opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  contentContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  glassCard: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 28, padding: 30, alignItems: 'center',
    elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
  },
  logoText: {
    fontSize: 30, fontWeight: '800', color: '#0F172A', marginBottom: 4,
  },
  taglineText: {
    fontSize: 14, color: '#475569', marginBottom: 28, fontWeight: '500',
  },

  /* Toggle */
  toggleContainer: {
    flexDirection: 'row', backgroundColor: '#E2E8F0',
    borderRadius: 14, padding: 4, width: '100%', marginBottom: 22,
  },
  toggleButton: {
    flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11,
  },
  activeStudentToggle: { backgroundColor: '#10B981', elevation: 3 },
  activeAdminToggle: { backgroundColor: '#3B82F6', elevation: 3 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeToggleText: { color: '#FFFFFF', fontWeight: '700' },

  /* Inputs */
  input: {
    width: '100%', backgroundColor: '#F1F5F9',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A', marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },

  /* Admin passcode section */
  adminPasscodeWrapper: {
    width: '100%', marginBottom: 4,
    backgroundColor: '#FFF5F5', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#FEE2E2',
  },
  adminPasscodeLabel: {
    fontSize: 12, fontWeight: '700', color: '#DC2626',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  adminPasscodeInput: {
    backgroundColor: '#FFFFFF', borderColor: '#FCA5A5',
    marginBottom: 0,
  },

  /* Login button */
  loginButton: {
    width: '100%', padding: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 14,
  },
  studentTheme: { backgroundColor: '#10B981' },
  adminTheme: { backgroundColor: '#3B82F6' },
  disabledButton: { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  /* Hint */
  hintBox: {
    marginTop: 14, backgroundColor: '#F8FAFC',
    borderRadius: 10, padding: 12, width: '100%',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  hintText: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },

  /* Register */
  registerContainer: { marginTop: 18, padding: 8 },
  registerText: { color: '#475569', fontSize: 14 },
  registerLink: { color: '#10B981', fontWeight: '700' },
});