import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../supabase';

export default function Register() {
  const { passedRole } = useLocalSearchParams();
  const currentRole = passedRole || 'Student';

  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NEW: State for the secret admin passcode
  const [adminCode, setAdminCode] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !name) {
      alert("Please fill in all mandatory fields!");
      return;
    }

    // --- NEW SECURITY CHECK ---
    let finalStatus = 'pending'; // Default for students

    if (currentRole === 'Admin') {
      // Change 'MASTERKEY2026' to whatever secret code you want!
      if (adminCode !== 'AdminTechWorkshop4589') {
        alert("🔒 Security Alert: Invalid Admin Passcode.");
        return; // Stops the registration immediately
      }
      finalStatus = 'approved'; // If the code is right, bypass the waiting room!
    }

    alert(`Sending ${currentRole} application to secure server...`);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { 
          id: data.user.id, 
          name: name, 
          roll_number: idNumber, 
          role: currentRole.toLowerCase(), 
          status: finalStatus // Saves 'pending' for students, 'approved' for admins!
        }
      ]);

      if (profileError) {
        alert("Account created, but error saving profile details.");
      } else {
        if (currentRole === 'Admin') {
          alert("Admin Account Created & Auto-Approved! You can now log in.");
        } else {
          alert("Application submitted successfully! Waiting for Admin approval.");
        }
        router.back();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.title}>{currentRole} Application</Text>
          <Text style={styles.subtitle}>Apply for secure access to AssignHub</Text>
        </View>

        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
          
          <TextInput 
            style={styles.input} 
            placeholder={currentRole === 'Admin' ? "Staff ID Number" : "Roll Number (e.g. CS-2026-01)"}
            placeholderTextColor="#94A3B8" 
            value={idNumber} 
            onChangeText={setIdNumber} 
          />
          
          <TextInput style={styles.input} placeholder="School Email" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Create Password" placeholderTextColor="#94A3B8" secureTextEntry value={password} onChangeText={setPassword} />

          {/* --- NEW SECURITY INPUT: Only shows if they toggle Admin --- */}
          {currentRole === 'Admin' && (
            <TextInput 
              style={[styles.input, styles.adminPasscodeInput]} 
              placeholder="Secret Admin Passcode" 
              placeholderTextColor="#EF4444" 
              secureTextEntry 
              value={adminCode} 
              onChangeText={setAdminCode} 
            />
          )}

          <TouchableOpacity style={[styles.submitButton, currentRole === 'Admin' && styles.adminButton]} onPress={handleRegister}>
            <Text style={styles.submitText}>Submit Application</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Login Portal</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94A3B8' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#1E293B', padding: 25, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  input: { width: '100%', backgroundColor: '#0F172A', borderRadius: 10, padding: 16, fontSize: 16, color: '#FFFFFF', marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  adminPasscodeInput: { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#450a0a' }, // Deep red warning background
  submitButton: { width: '100%', backgroundColor: '#10B981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  adminButton: { backgroundColor: '#3B82F6' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 25, padding: 10 },
  backText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' }
});