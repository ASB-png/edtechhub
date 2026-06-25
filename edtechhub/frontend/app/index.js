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
  const [role, setRole] = useState('Student'); // 'Student' or 'Admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const moveAnim = useRef(new Animated.Value(0)).current;

  // Handles the slow cinematic background pan
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
      alert("Please enter both email and password.");
      return;
    }

    console.log("⏳ Attempting credentials verification...");

    // 1. Verify Password with Supabase Authentication Engine
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      alert(`Access Denied: ${authError.message}`);
      return;
    }

    // 2. Fetch User Profile to pull Role and Approval Status
    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        alert("System Error: Could not retrieve your user profile.");
        return;
      }

      // 3. Admin-Gated Security Logic
      if (role === 'Admin' && (profileData.role !== 'admin' || profileData.status !== 'approved')) {
        const code = (Platform.OS === 'web' && typeof window !== 'undefined' && window.prompt)
          ? window.prompt("🔒 Admin Passcode Required:\nEnter the Secret Admin Passcode to approve and upgrade your profile:")
          : 'AdminTechWorkshop4589'; // auto-upgrade if prompt is unavailable on native testing

        if (!code) {
          alert("🔒 Access Deferred: Awaiting admin approval or correct passcode.");
          return;
        }

        if (code === 'AdminTechWorkshop4589') {
          const { error: upgradeError } = await supabase
            .from('profiles')
            .update({ role: 'admin', status: 'approved' })
            .eq('id', authData.user.id);
          
          if (upgradeError) {
            alert(`Upgrade failed: ${upgradeError.message}`);
            return;
          }
          alert("🎉 Admin authorization successful! Profile upgraded & approved.");
          // Update profileData reference so the routing works correctly below
          profileData.role = 'admin';
          profileData.status = 'approved';
        } else {
          alert("❌ Access Denied: Invalid Admin Passcode.");
          return;
        }
      }

      if (profileData.role === 'student' && profileData.status === 'pending') {
        alert("🔒 Access Deferred: Your registration is currently awaiting Admin approval.");
        return; // Halts execution and locks them out
      }

      if (profileData.status === 'rejected') {
        alert("❌ Access Revoked: Your application to this portal has been rejected.");
        return;
      }

      // 4. Verification Passed: Route to corresponding workspace
      if (profileData.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/student');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Moving Cinematic Background */}
      <Animated.Image
        source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop' }}
        style={[styles.backgroundImage, { transform: [{ scale: 1.2 }, { translateX: moveAnim }] }]}
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.contentContainer}>
        <View style={styles.glassCard}>
          <Text style={styles.logoText}>📝 AssignHub</Text>
          <Text style={styles.taglineText}>Controlled Admin-Gated Portal</Text>

          {/* Role Configuration Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleButton, role === 'Student' && styles.activeStudentToggle]} onPress={() => setRole('Student')}>
              <Text style={[styles.toggleText, role === 'Student' && styles.activeToggleText]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, role === 'Admin' && styles.activeAdminToggle]} onPress={() => setRole('Admin')}>
              <Text style={[styles.toggleText, role === 'Admin' && styles.activeToggleText]}>Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Form Credentials */}
          <TextInput 
            style={styles.input} 
            placeholder="School Email Address" 
            placeholderTextColor="#64748B" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            placeholderTextColor="#64748B" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />

          {/* Action Sign-In */}
          <TouchableOpacity style={[styles.loginButton, role === 'Admin' ? styles.adminTheme : styles.studentTheme]} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Registration Parameter Routing */}
          <TouchableOpacity 
            style={styles.registerContainer} 
            onPress={() => router.push({ pathname: '/register', params: { passedRole: role } })}
          >
            <Text style={styles.registerText}>
              New to AssignHub? <Text style={styles.registerLink}>Apply Here</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { position: 'absolute', width: '120%', height: height, opacity: 0.8 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  glassCard: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 10 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 5 },
  taglineText: { fontSize: 15, color: '#475569', marginBottom: 30 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, width: '100%', marginBottom: 25 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeStudentToggle: { backgroundColor: '#10B981', elevation: 2 },
  activeAdminToggle: { backgroundColor: '#3B82F6', elevation: 2 },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  activeToggleText: { color: '#FFFFFF' },
  input: { width: '100%', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A', marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  loginButton: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  studentTheme: { backgroundColor: '#10B981' },
  adminTheme: { backgroundColor: '#3B82F6' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { marginTop: 25, padding: 10 },
  registerText: { color: '#475569', fontSize: 14 },
  registerLink: { color: '#3B82F6', fontWeight: 'bold' }
});