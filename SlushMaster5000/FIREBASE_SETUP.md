# SlushMaster5000 - Authentication Setup

## Firebase Configuration

The authentication system uses Firebase, but the current configuration has placeholder values. To enable authentication, follow these steps:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and create a new project named "SlushMaster5000"
3. Follow the setup wizard

### 2. Enable Authentication Providers

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable **Google** sign-in provider
3. Enable **GitHub** sign-in provider (you'll need to register an OAuth app on GitHub)

### 3. Get Your Firebase Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll down to "Your apps" and click the web icon `</>`
3. Register your app with a nickname (e.g., "SlushMaster5000 Web")
4. Copy the `firebaseConfig` object

### 4. Update the Configuration

Replace the placeholder values in `src/firebase-config.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 5. Add Authorized Domain

In Firebase Console → **Authentication** → **Settings** → **Authorized domains**, add `localhost` for local development.

## Testing Without Firebase (Demo Mode)

The app will currently show Firebase errors because placeholder credentials are used. To fully test:

1. Either set up Firebase as described above, OR
2. The app gracefully handles auth errors - you'll see error messages in the login modal but the rest of the app works fine

## Features

- ✅ Google Sign-In
- ✅ GitHub Sign-In  
- ✅ Recipe favoriting with stars
- ✅ LocalStorage persistence per user
- ✅ Recipe sorting (favorites first, then by community popularity)
- ✅ Login popup for unauthenticated users trying to star recipes
