📝 AssignHub
Problem Statement Chosen: Access-Controlled Educational Workspaces
The Problem: In most educational setups, assignment distribution is chaotic — shared over WhatsApp, Google Classroom with open links, or messy email threads. There's no control over who accessed what, no structured submission tracking, and no way to restrict access to specific students. The Solution: AssignHub solves all of this with a clean, admin-gated access-control architecture.

📖 Project Description
AssignHub is a secure, role-based EdTech mobile application designed to streamline the assignment lifecycle. It acts as a two-sided marketplace for coursework. Students apply for access and are placed in a secure waiting room. Once verified and approved by an Admin via a secret passcode, students gain entry to a personalized dashboard to track deadlines, access instructor resources, and submit their work. Admins benefit from a powerful command center to broadcast assignments, track real-time submissions, and issue grades.

🛠 Tech Stack
Frontend: React Native, Expo, Expo Router (for file-based navigation)

Backend & Authentication: Supabase (PostgreSQL)

Database: Supabase SQL (Relational tables for Profiles, Assignments, and Submissions)

UI/UX: React Native StyleSheet, LayoutAnimation (for native smooth transitions), @expo/vector-icons (Ionicons)

🚀 Step-by-Step Local Setup Instructions
1. Clone the repository

Bash

git clone https://github.com/yourusername/AssignHub.git
cd AssignHub
2. Install Dependencies

Bash

npm install
3. Configure Supabase Environment

Create a new project on Supabase.

Run the following SQL queries in your Supabase SQL Editor to set up the database:

SQL

-- Create Profiles Table
create table profiles (
  id uuid references auth.users(id) primary key,
  name text,
  roll_number text,
  role text,
  status text
);

-- Create Assignments Table
create table assignments (
  id uuid default uuid_generate_v4() primary key,
  title text,
  description text,
  file_url text,
  deadline timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create Submissions Table
create table submissions (
  id uuid default uuid_generate_v4() primary key,
  assignment_id uuid references assignments(id),
  student_id uuid references auth.users(id),
  file_url text,
  notes text,
  grade integer,
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);
Create a supabase.js file in the root of your project and add your Supabase URL and Anon Key.

4. Start the Application

Bash

npx expo start -c
Scan the QR code with the Expo Go app on your phone, or press a to run on an Android emulator / i for an iOS simulator.

✨ Features Built
Admin-Gated Security Architecture: New student registrations are placed in a "Pending" state and cannot access the app until manually approved by an Admin.

Master Passcode System: Admin accounts bypass the waiting room but require a hardcoded master passcode during registration to prevent unauthorized access.

Dual Dashboards: Completely isolated and tailored UI/UX experiences depending on the user's logged-in role (Admin vs. Student).

Assignment Broadcasting: Admins can draft and publish coursework with specific deadlines and resource links instantly to all approved students.

Submission Pipeline: Students can attach links to their completed work along with optional notes for the instructor.

Real-Time Analytics Tracker: Admins can click into any assignment to view a dynamic roster showing who has submitted, who missed the deadline, and who is pending.

In-App Grading Engine: Admins can review submitted links and assign a numeric grade (0-100%) that instantly reflects on the student's dashboard.

🔗 Application Links
Google Drive Link (APK / Demo Video / Presentation): 👉 [Insert Your Google Drive Link Here]

👥 Team Members
[Your Name] - [Your Role, e.g., Full-Stack Developer / UI Architect]

[Teammate Name] - [Teammate Role]

[Teammate Name] - [Teammate Role]

🐛 Known Bugs & Limitations
Push Notifications: The app currently utilizes a "pull" system. While the UI updates dynamically, native push notifications for new assignments/grades are not yet implemented (planned for V2).

File Uploads: Submissions currently accept URL links (Google Docs, Cloud PDFs). Native device file-picking is limited in the current build and requires cloud-storage integration.

Web View Sizing: The application is highly optimized for mobile devices (iOS/Android) via Expo Go. Running the app on a desktop web browser may result in stretched UI elements.