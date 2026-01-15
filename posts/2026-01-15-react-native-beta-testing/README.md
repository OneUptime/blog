# How to Set Up Beta Testing with TestFlight and Google Play Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Beta Testing, TestFlight, Google Play Console, Mobile Development, QA

Description: Learn how to set up beta testing for React Native apps using TestFlight for iOS and Google Play Console for Android.

---

Beta testing is one of the most critical phases in mobile app development. It bridges the gap between internal development and public release, allowing you to identify bugs, gather user feedback, and validate your app's functionality in real-world conditions. For React Native developers targeting both iOS and Android platforms, understanding how to leverage TestFlight and Google Play Console for beta testing is essential.

In this comprehensive guide, we will walk through the complete process of setting up beta testing for your React Native application on both platforms. Whether you are launching your first app or looking to improve your existing beta testing workflow, this guide will provide actionable insights and best practices.

## Why Beta Testing Matters

Before diving into the technical setup, let us understand why beta testing is indispensable for successful app launches.

### Catching Bugs Before Production

No matter how thorough your internal QA process is, real users will always find ways to use your app that you never anticipated. Beta testing exposes your app to diverse devices, network conditions, and usage patterns that are impossible to replicate in a controlled development environment.

### Validating User Experience

Beta testers provide invaluable feedback on user experience. They can identify confusing navigation flows, unclear error messages, or features that do not work as expected. This feedback helps you refine your app before it reaches a broader audience.

### Testing at Scale

Beta testing allows you to stress-test your backend infrastructure with real traffic. You can identify performance bottlenecks, server capacity issues, and API reliability problems before they affect your entire user base.

### Building Early Adopter Community

Beta testers often become your most loyal users. They feel invested in your app's success and can become advocates who spread the word about your product.

### Reducing Negative Reviews

Apps that skip proper beta testing often launch with critical bugs that lead to negative reviews. Since app store ratings significantly impact discoverability and downloads, protecting your rating through thorough beta testing is crucial.

## TestFlight Setup for iOS

TestFlight is Apple's official platform for distributing beta versions of iOS, iPadOS, macOS, tvOS, and watchOS apps. It is deeply integrated with App Store Connect and provides a seamless experience for both developers and testers.

### Prerequisites

Before setting up TestFlight, ensure you have the following:

1. **Apple Developer Program Membership**: You need an active membership ($99/year) to distribute apps through TestFlight.

2. **App Store Connect Access**: Your app must be registered in App Store Connect.

3. **Xcode Installed**: You need Xcode to build and archive your React Native app for iOS.

4. **Valid Signing Certificates**: Ensure you have valid distribution certificates and provisioning profiles.

### Creating Your App in App Store Connect

If you have not already created your app in App Store Connect, follow these steps:

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to "My Apps"
3. Click the "+" button and select "New App"
4. Fill in the required information:
   - Platform: iOS
   - App Name
   - Primary Language
   - Bundle ID (must match your React Native app's bundle identifier)
   - SKU (a unique identifier for your app)

```bash
# Verify your bundle identifier in your React Native project
cd ios
grep -r "PRODUCT_BUNDLE_IDENTIFIER" *.xcodeproj/project.pbxproj
```

### Building Your React Native App for TestFlight

To upload your React Native app to TestFlight, you need to create an archive build.

```bash
# Navigate to your React Native project
cd /path/to/your/react-native-project

# Install iOS dependencies
cd ios && pod install && cd ..

# Build the JavaScript bundle
npx react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios
```

Next, open your project in Xcode:

```bash
open ios/YourAppName.xcworkspace
```

In Xcode:

1. Select "Any iOS Device" as the build destination
2. Choose Product > Archive from the menu
3. Wait for the archive process to complete
4. When the Organizer window opens, click "Distribute App"
5. Select "App Store Connect" and click "Next"
6. Choose "Upload" and follow the prompts
7. Select your distribution certificate and provisioning profile
8. Click "Upload"

### Configuring TestFlight in App Store Connect

After your build uploads successfully, you need to configure it for beta testing.

1. In App Store Connect, go to your app
2. Select the "TestFlight" tab
3. You will see your uploaded build in the "Builds" section
4. Click on the build number to configure it

### Adding Test Information

Apple requires you to provide test information before you can distribute your beta:

1. **Beta App Description**: Describe what testers should focus on
2. **Feedback Email**: Where testers can send feedback
3. **Marketing URL**: Optional link to your website
4. **Privacy Policy URL**: Required for apps that collect user data
5. **Contact Information**: For Apple to reach you if needed

```markdown
Example Beta App Description:

Welcome to the beta version of [Your App Name]!

We are looking for feedback on:
- New user onboarding flow
- Push notification functionality
- Performance on older devices

Please report any bugs or crashes through the feedback option in the app
or email us at beta@yourcompany.com

Known issues:
- Dark mode may have inconsistent styling on some screens
- Background sync may not work on iOS 14 devices
```

## Internal vs External Testing

TestFlight offers two distinct testing tracks: Internal Testing and External Testing. Understanding the differences helps you choose the right approach for your needs.

### Internal Testing

Internal testing is designed for your development team and close collaborators.

**Characteristics:**
- Up to 100 testers
- Testers must be added to your App Store Connect team
- No Apple review required
- Builds are available immediately after upload
- Testers need to use the same Apple ID as their App Store Connect account

**Best for:**
- Development team testing
- QA team testing
- Stakeholder previews
- Rapid iteration cycles

To set up internal testing:

1. Go to App Store Connect > Users and Access
2. Add users to your team with appropriate roles
3. In TestFlight, create an Internal Testing group
4. Add team members to the group
5. Select which builds should be available to the group

```javascript
// Example: Version checking for internal beta builds
const checkBetaVersion = async () => {
  const currentVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  console.log(`Running internal beta: v${currentVersion} (${buildNumber})`);

  // Log to your analytics to track beta usage
  analytics.track('beta_session_start', {
    version: currentVersion,
    build: buildNumber,
    testingTrack: 'internal'
  });
};
```

### External Testing

External testing allows you to distribute your beta to users outside your organization.

**Characteristics:**
- Up to 10,000 testers per app
- Testers only need an Apple ID and the TestFlight app
- First build requires Apple Beta App Review (usually 24-48 hours)
- Subsequent builds may skip review if changes are minor
- Testers can be invited via email or public link

**Best for:**
- Public beta programs
- Large-scale testing
- Community feedback
- Pre-launch marketing

To set up external testing:

1. In TestFlight, click "External Testing" in the sidebar
2. Click "+" to create a new group
3. Name your group (e.g., "Public Beta Testers")
4. Add testers by email or enable a public link
5. Select builds to distribute to the group
6. Submit for Beta App Review

### Managing Beta App Review

Apple reviews external TestFlight builds to ensure they meet basic guidelines. Here are tips for smooth approval:

1. **Provide Clear Test Instructions**: Explain what the app does and how to test it
2. **Include Demo Credentials**: If your app requires login, provide test accounts
3. **Disclose Beta Limitations**: List known issues and incomplete features
4. **Ensure Basic Functionality**: The app should launch and perform core functions

```text
Beta App Review Notes Example:

This is a task management application for teams.

Test Account:
Email: betatester@example.com
Password: BetaTest2024!

Test Instructions:
1. Log in with the provided credentials
2. Create a new task by tapping the + button
3. Assign the task to a team member
4. Mark the task as complete

Known Limitations:
- Push notifications are only functional on physical devices
- File attachments are limited to 5MB in this beta
- Offline mode is not yet implemented
```

## Adding Beta Testers

Managing your beta tester pool effectively is crucial for gathering useful feedback.

### Inviting Testers via Email

For targeted testing with specific individuals:

1. In TestFlight, select your testing group
2. Click "Testers" tab
3. Click "+" to add testers
4. Enter email addresses (one per line or comma-separated)
5. Testers receive an invitation email with instructions

```typescript
// Example: Tracking beta tester signups in your app
interface BetaTesterSignup {
  email: string;
  source: 'website' | 'app' | 'referral';
  platform: 'ios' | 'android';
  timestamp: Date;
}

const registerBetaTester = async (signup: BetaTesterSignup): Promise<void> => {
  try {
    await fetch('https://api.yourapp.com/beta/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signup),
    });

    // Track successful signup
    analytics.track('beta_tester_registered', {
      platform: signup.platform,
      source: signup.source,
    });
  } catch (error) {
    console.error('Beta signup failed:', error);
  }
};
```

### Using Public Links

For open beta programs where you want broader participation:

1. Enable "Public Link" in your external testing group settings
2. Copy the generated link
3. Share on your website, social media, or marketing channels
4. Set a tester limit if desired (up to 10,000)

```html
<!-- Example: Beta signup landing page snippet -->
<div class="beta-signup">
  <h2>Join Our Beta Program</h2>
  <p>Be among the first to try our new app and help shape its future.</p>

  <div class="platform-buttons">
    <a href="https://testflight.apple.com/join/XXXXXXXX"
       class="btn btn-ios">
      Download on TestFlight
    </a>
    <a href="https://play.google.com/apps/testing/com.yourapp"
       class="btn btn-android">
      Join Android Beta
    </a>
  </div>

  <p class="disclaimer">
    Beta software may contain bugs and is not representative
    of the final product.
  </p>
</div>
```

### Tester Management Best Practices

1. **Segment Your Testers**: Create multiple groups for different testing phases
2. **Track Engagement**: Monitor which testers are actively using the beta
3. **Remove Inactive Testers**: Keep your tester pool engaged and relevant
4. **Communicate Regularly**: Send updates about new builds and fixes

## Beta Builds Distribution

Efficient build distribution ensures testers always have access to the latest version.

### Automatic Build Distribution

Configure TestFlight to automatically distribute new builds:

1. In your testing group settings, enable "Automatic Distribution"
2. New builds will be sent to testers as soon as they are processed
3. Testers receive push notifications about new versions

### Build Expiration

TestFlight builds expire after 90 days. Plan your testing cycles accordingly:

```typescript
// Example: Check beta expiration in your app
import DeviceInfo from 'react-native-device-info';

const checkBetaExpiration = (): void => {
  const installTime = DeviceInfo.getFirstInstallTime();
  const expirationDays = 90;
  const msPerDay = 24 * 60 * 60 * 1000;

  const daysRemaining = Math.floor(
    (expirationDays * msPerDay - (Date.now() - installTime)) / msPerDay
  );

  if (daysRemaining <= 7) {
    Alert.alert(
      'Beta Expiring Soon',
      `This beta version will expire in ${daysRemaining} days. ` +
      'Please update to the latest version.',
      [{ text: 'OK' }]
    );
  }
};
```

### Version Numbering Strategy

Maintain clear version numbering for beta builds:

```javascript
// package.json version strategy
{
  "version": "1.2.0" // Semantic version
}

// iOS: Info.plist
// CFBundleShortVersionString: "1.2.0" (matches package.json)
// CFBundleVersion: "45" (increments with each build)

// Build number automation script
const fs = require('fs');
const plist = require('plist');

const incrementBuildNumber = () => {
  const plistPath = './ios/YourApp/Info.plist';
  const plistContent = fs.readFileSync(plistPath, 'utf8');
  const parsedPlist = plist.parse(plistContent);

  const currentBuild = parseInt(parsedPlist.CFBundleVersion, 10);
  parsedPlist.CFBundleVersion = String(currentBuild + 1);

  fs.writeFileSync(plistPath, plist.build(parsedPlist));
  console.log(`Build number incremented to ${currentBuild + 1}`);
};
```

## Google Play Internal Testing

Google Play Console offers multiple testing tracks for Android apps. Let us start with internal testing, which is the most restricted and fastest option.

### Prerequisites for Google Play Testing

1. **Google Play Developer Account**: One-time $25 registration fee
2. **App Created in Play Console**: Your app must be set up in Google Play Console
3. **Signed APK or App Bundle**: Your React Native app must be signed for release

### Creating Your App in Google Play Console

1. Log in to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in the app details:
   - App name
   - Default language
   - App or game
   - Free or paid
4. Accept the Developer Program Policies

### Building Your React Native App for Android

Generate a signed release build:

```bash
# Navigate to your React Native project
cd /path/to/your/react-native-project

# Generate a release keystore (only needed once)
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias your-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Configure signing in android/app/build.gradle
```

Add the following to your `android/app/build.gradle`:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: 'your-password'
            keyAlias 'your-key-alias'
            keyPassword System.getenv('KEY_PASSWORD') ?: 'your-password'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Build the release:

```bash
# Clean and build release APK
cd android
./gradlew clean
./gradlew assembleRelease

# Or build an App Bundle (recommended)
./gradlew bundleRelease

# The output will be at:
# APK: android/app/build/outputs/apk/release/app-release.apk
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### Setting Up Internal Testing Track

Internal testing is ideal for your core team:

1. In Play Console, go to Release > Testing > Internal testing
2. Click "Create new release"
3. Upload your APK or App Bundle
4. Add release notes
5. Click "Save" then "Review release"
6. Click "Start rollout to Internal testing"

### Adding Internal Testers

1. Go to Internal testing > Testers tab
2. Create a new email list or select an existing one
3. Add tester email addresses (must be Google accounts)
4. Copy the opt-in URL and share with testers
5. Testers must accept the invitation before downloading

```typescript
// Example: Direct testers to the opt-in page
const PLAY_STORE_BETA_URL = 'https://play.google.com/apps/testing/com.yourapp.package';

const openBetaSignup = async (): Promise<void> => {
  const supported = await Linking.canOpenURL(PLAY_STORE_BETA_URL);

  if (supported) {
    await Linking.openURL(PLAY_STORE_BETA_URL);
  } else {
    Alert.alert(
      'Unable to Open',
      'Please visit the Google Play Store to join the beta program.'
    );
  }
};
```

## Closed vs Open Tracks

Google Play Console offers three testing tracks beyond internal testing: closed testing, open testing, and production. Understanding each helps you plan your release strategy.

### Closed Testing (Alpha)

Closed testing allows you to invite specific users or groups.

**Characteristics:**
- Unlimited testers via email lists
- Can use Google Groups for easier management
- App is not discoverable in Play Store
- Requires tester opt-in via link
- Good for targeted feedback from specific demographics

**Setup:**
1. Go to Release > Testing > Closed testing
2. Click "Manage track" to configure
3. Create or select tester lists
4. Upload your build and release

```bash
# Example: Creating a Google Group for beta testers
# 1. Go to groups.google.com
# 2. Create a new group (e.g., yourapp-beta-testers@googlegroups.com)
# 3. Add tester emails to the group
# 4. In Play Console, add the group email as a tester list
```

### Open Testing (Beta)

Open testing makes your beta publicly available.

**Characteristics:**
- Anyone can join without invitation
- App appears in Play Store with "Early Access" badge
- Users can find it by searching
- Limits can be set (e.g., first 1,000 users)
- Great for building pre-launch buzz

**Setup:**
1. Go to Release > Testing > Open testing
2. Configure the track settings
3. Set tester limits if desired
4. Upload your build
5. Complete store listing requirements
6. Release to open testing

```typescript
// Example: Detecting if user is running beta version
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface AppVersionInfo {
  version: string;
  buildNumber: string;
  isBeta: boolean;
  platform: string;
}

const getAppVersionInfo = async (): Promise<AppVersionInfo> => {
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  // Check for beta indicators
  // On Android, you might use a build config flag
  // On iOS, you can check if installed via TestFlight
  const installerPackageName = await DeviceInfo.getInstallerPackageName();

  const isBeta = Platform.select({
    ios: installerPackageName === 'com.apple.testflight',
    android: installerPackageName === 'com.android.vending' &&
             version.includes('beta'),
    default: false,
  }) ?? false;

  return {
    version,
    buildNumber,
    isBeta,
    platform: Platform.OS,
  };
};
```

### Comparing Testing Tracks

| Feature | Internal | Closed | Open |
|---------|----------|--------|------|
| Max Testers | 100 | Unlimited | Unlimited |
| Discovery | Link only | Link only | Play Store |
| Review Required | No | No | Yes |
| Tester Approval | Email list | Email/Group | Anyone |
| Best For | Dev team | Targeted feedback | Public beta |

## Play Console Release Management

Effective release management in Play Console helps you maintain control over your beta program.

### Staged Rollouts

Gradually release to your tester base:

```javascript
// Release stages recommendation
const releaseStages = [
  { percentage: 5, duration: '24 hours', purpose: 'Smoke testing' },
  { percentage: 20, duration: '48 hours', purpose: 'Early feedback' },
  { percentage: 50, duration: '72 hours', purpose: 'Broader testing' },
  { percentage: 100, duration: 'Ongoing', purpose: 'Full beta' },
];

// Monitor each stage before proceeding
const monitorReleaseStage = async (stage: number): Promise<boolean> => {
  const metrics = await fetchCrashMetrics();
  const feedback = await fetchUserFeedback();

  const crashRateAcceptable = metrics.crashRate < 1.0; // Less than 1%
  const feedbackPositive = feedback.averageRating >= 3.5;

  return crashRateAcceptable && feedbackPositive;
};
```

### Release Notes Best Practices

Write clear, informative release notes:

```markdown
What's New in Beta 1.2.0 (Build 45):

New Features:
- Added dark mode support
- Implemented offline data sync
- New onboarding tutorial

Bug Fixes:
- Fixed crash when uploading large images
- Resolved login issues on Android 14 devices
- Fixed notification badges not clearing

Known Issues:
- Dark mode may flicker on some Samsung devices
- Background sync limited to WiFi connections

We want your feedback! Use the in-app feedback button or email
beta@yourapp.com
```

### Managing Multiple Releases

Play Console allows you to manage multiple releases simultaneously:

1. **Draft Releases**: Prepare releases without publishing
2. **Halted Releases**: Pause a problematic release
3. **Release History**: Review all past releases

```bash
# Example: Using Fastlane for release management
# Fastfile configuration

lane :beta do
  gradle(
    task: 'bundle',
    build_type: 'Release'
  )

  upload_to_play_store(
    track: 'internal',
    aab: 'android/app/build/outputs/bundle/release/app-release.aab',
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )
end

lane :promote_to_closed do
  upload_to_play_store(
    track: 'internal',
    track_promote_to: 'alpha',
    skip_upload_apk: true,
    skip_upload_aab: true
  )
end
```

## Collecting Feedback

Gathering and organizing feedback from beta testers is crucial for improving your app.

### In-App Feedback Mechanisms

Implement feedback collection directly in your app:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
  deviceInfo: {
    platform: string;
    version: string;
    buildNumber: string;
    deviceModel: string;
    systemVersion: string;
  };
  timestamp: string;
}

const FeedbackForm: React.FC = () => {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const submitFeedback = async (): Promise<void> => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    const feedbackData: FeedbackData = {
      type: feedbackType,
      message: message.trim(),
      email: email.trim() || undefined,
      deviceInfo: {
        platform: Platform.OS,
        version: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        deviceModel: await DeviceInfo.getModel(),
        systemVersion: DeviceInfo.getSystemVersion(),
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch('https://api.yourapp.com/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        Alert.alert('Thank You', 'Your feedback has been submitted successfully!');
        setMessage('');
        setEmail('');
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Feedback</Text>

      <View style={styles.typeSelector}>
        {(['bug', 'feature', 'general'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              feedbackType === type && styles.typeButtonActive,
            ]}
            onPress={() => setFeedbackType(type)}
          >
            <Text style={[
              styles.typeButtonText,
              feedbackType === type && styles.typeButtonTextActive,
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.messageInput}
        placeholder="Describe your feedback..."
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <TextInput
        style={styles.emailInput}
        placeholder="Email (optional, for follow-up)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.submitButton} onPress={submitFeedback}>
        <Text style={styles.submitButtonText}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 15,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeedbackForm;
```

### Platform-Specific Feedback Tools

**TestFlight Feedback:**
- Users can take screenshots and annotate them
- Feedback is sent directly to App Store Connect
- Includes device and app version information automatically

**Google Play Console Feedback:**
- Users can leave reviews on the Play Store
- Pre-launch reports provide automated testing results
- Firebase integration for detailed analytics

### Organizing Feedback

Create a system for categorizing and prioritizing feedback:

```typescript
interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'ux' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'triaged' | 'in-progress' | 'resolved' | 'wont-fix';
  platform: 'ios' | 'android' | 'both';
  description: string;
  reportedBy: string;
  reportedAt: Date;
  affectedVersions: string[];
  votes: number;
}

const prioritizeFeedback = (items: FeedbackItem[]): FeedbackItem[] => {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return items.sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by vote count (more votes = higher priority)
    return b.votes - a.votes;
  });
};
```

## Crash Reporting in Beta

Monitoring crashes during beta testing helps you identify and fix critical issues before production.

### Setting Up Crash Reporting

Integrate a crash reporting service like Firebase Crashlytics:

```bash
# Install Firebase packages
npm install @react-native-firebase/app @react-native-firebase/crashlytics
cd ios && pod install && cd ..
```

Configure Crashlytics in your app:

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

// Initialize crash reporting
const initializeCrashlytics = async (): Promise<void> => {
  // Enable crash collection (can be toggled based on user consent)
  await crashlytics().setCrashlyticsCollectionEnabled(true);

  // Set user identifier for crash reports
  await crashlytics().setUserId('beta-tester-123');

  // Add custom attributes
  await crashlytics().setAttributes({
    beta_version: '1.2.0',
    testing_track: 'internal',
    device_type: 'physical',
  });
};

// Log non-fatal errors
const logError = (error: Error, context?: Record<string, string>): void => {
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      crashlytics().setAttribute(key, value);
    });
  }

  crashlytics().recordError(error);
};

// Example usage
try {
  await riskyOperation();
} catch (error) {
  logError(error as Error, {
    operation: 'riskyOperation',
    screen: 'HomeScreen',
  });
}
```

### Monitoring Crash Metrics

Track key crash metrics during beta:

```typescript
interface CrashMetrics {
  crashFreeUsersPercentage: number;
  totalCrashes: number;
  affectedUsers: number;
  topCrashingScreens: string[];
  crashesByVersion: Record<string, number>;
  crashesByDevice: Record<string, number>;
}

const acceptableCrashMetrics = {
  crashFreeUsersPercentage: 99.0, // Target: 99%+ crash-free users
  maxCrashesPerSession: 0.01,     // Less than 1% sessions have crashes
};

const evaluateBetaStability = (metrics: CrashMetrics): boolean => {
  return metrics.crashFreeUsersPercentage >= acceptableCrashMetrics.crashFreeUsersPercentage;
};
```

### Crash Analysis Workflow

1. **Monitor Daily**: Check crash reports every day during active beta
2. **Prioritize by Impact**: Focus on crashes affecting many users first
3. **Reproduce Locally**: Use crash stack traces to reproduce issues
4. **Fix and Verify**: Deploy fixes and verify resolution in subsequent builds
5. **Communicate**: Inform testers when critical crashes are fixed

## Iterating on Feedback

Successful beta testing requires a systematic approach to incorporating feedback.

### Feedback Loop Process

```typescript
interface FeedbackIteration {
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  feedbackReceived: number;
  issuesFixed: number;
  featuresAdded: number;
  buildVersion: string;
}

const feedbackIterationCycle = [
  'Collect feedback from current beta build',
  'Categorize and prioritize issues',
  'Plan fixes for next sprint',
  'Implement changes',
  'Internal QA testing',
  'Release new beta build',
  'Notify testers of updates',
  'Repeat cycle',
];
```

### Communication with Beta Testers

Keep your testers informed and engaged:

```typescript
interface BetaUpdateNotification {
  version: string;
  releaseDate: Date;
  highlights: string[];
  fixedIssues: string[];
  knownIssues: string[];
  feedbackRequest: string;
}

const createReleaseNotification = (update: BetaUpdateNotification): string => {
  return `
Beta Update: Version ${update.version}

Hi Beta Testers!

We have released a new beta version based on your valuable feedback.

Highlights:
${update.highlights.map(h => `- ${h}`).join('\n')}

Fixed Issues:
${update.fixedIssues.map(i => `- ${i}`).join('\n')}

Known Issues:
${update.knownIssues.map(i => `- ${i}`).join('\n')}

${update.feedbackRequest}

Thank you for helping us improve the app!

The Development Team
  `.trim();
};
```

### Measuring Beta Success

Define metrics to evaluate your beta program:

```typescript
interface BetaSuccessMetrics {
  // Engagement metrics
  activeTestersPercentage: number;    // % of invited testers who installed
  sessionFrequency: number;           // Average sessions per tester per week
  retentionRate: number;              // % of testers still active after 30 days

  // Quality metrics
  crashFreeRate: number;              // % of sessions without crashes
  bugReportsPerTester: number;        // Average bugs reported per tester
  averageAppRating: number;           // Internal beta rating

  // Feedback metrics
  feedbackResponseRate: number;       // % of testers who provided feedback
  featureRequestCount: number;        // Number of feature requests received
  netPromoterScore: number;           // NPS from beta testers
}

const evaluateBetaReadiness = (metrics: BetaSuccessMetrics): {
  ready: boolean;
  blockers: string[];
} => {
  const blockers: string[] = [];

  if (metrics.crashFreeRate < 99) {
    blockers.push(`Crash-free rate (${metrics.crashFreeRate}%) below threshold (99%)`);
  }

  if (metrics.averageAppRating < 4.0) {
    blockers.push(`Average rating (${metrics.averageAppRating}) below threshold (4.0)`);
  }

  if (metrics.activeTestersPercentage < 50) {
    blockers.push(`Low tester engagement (${metrics.activeTestersPercentage}%)`);
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
};
```

## Transitioning to Production

When your beta testing is complete, it is time to transition to production.

### Pre-Launch Checklist

```typescript
const productionReadinessChecklist = {
  technical: [
    'All critical bugs fixed',
    'Crash-free rate above 99%',
    'Performance benchmarks met',
    'Security audit completed',
    'API endpoints production-ready',
    'Analytics and monitoring configured',
  ],
  compliance: [
    'Privacy policy updated',
    'Terms of service finalized',
    'GDPR/CCPA compliance verified',
    'App store guidelines reviewed',
    'Content ratings completed',
  ],
  marketing: [
    'App store screenshots prepared',
    'App description finalized',
    'Keywords optimized',
    'Promotional graphics ready',
    'Press kit prepared',
  ],
  support: [
    'Help documentation published',
    'FAQ section created',
    'Support email configured',
    'Feedback channels established',
  ],
};
```

### Gradual Production Rollout

Both platforms support staged rollouts to production:

**iOS App Store:**
- Phased release option releases to random percentage of users over 7 days
- Can be paused or accelerated at any time
- Automatic updates only; manual updates get immediate access

**Google Play:**
- Percentage-based rollout (1%, 5%, 10%, 20%, 50%, 100%)
- Halting capability if issues arise
- Different rollout percentages for different countries

```typescript
const productionRolloutPlan = [
  { day: 1, percentage: 1, monitoring: 'Intensive crash monitoring' },
  { day: 2, percentage: 5, monitoring: 'Review initial user feedback' },
  { day: 3, percentage: 10, monitoring: 'Check server load and performance' },
  { day: 4, percentage: 25, monitoring: 'Analyze user engagement metrics' },
  { day: 5, percentage: 50, monitoring: 'Review app store ratings' },
  { day: 7, percentage: 100, monitoring: 'Full release complete' },
];
```

### Post-Launch Beta Continuation

Consider maintaining a beta track even after production launch:

```typescript
const continuousBetaStrategy = {
  purpose: [
    'Test new features before production',
    'Get early feedback on experimental changes',
    'Build a community of power users',
    'Reduce risk of production issues',
  ],

  cadence: {
    betaReleases: 'Weekly',
    productionReleases: 'Bi-weekly',
    majorUpdates: 'Beta first, then staged production rollout',
  },

  testerIncentives: [
    'Early access to new features',
    'Recognition in app credits',
    'Exclusive beta tester badge',
    'Direct line to development team',
  ],
};
```

## Conclusion

Setting up beta testing for your React Native app using TestFlight and Google Play Console is a critical investment in your app's success. By following the practices outlined in this guide, you can:

1. **Catch bugs early** through systematic testing across diverse devices
2. **Gather valuable feedback** that shapes your product roadmap
3. **Build a community** of engaged early adopters
4. **Reduce launch risk** through staged rollouts and iterative improvements
5. **Improve app quality** with crash reporting and performance monitoring

Remember that beta testing is not a one-time event but an ongoing process. Even after your app launches, maintaining a beta track for testing new features and updates will continue to provide value.

Start small with internal testing, expand to closed testing with targeted users, and when ready, open your beta to a broader audience. Each phase provides unique insights that will make your app better.

Happy testing, and may your production launches be smooth and successful!

## Additional Resources

- [Apple TestFlight Documentation](https://developer.apple.com/testflight/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [React Native Official Documentation](https://reactnative.dev/)
- [Firebase Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [Fastlane Documentation](https://docs.fastlane.tools/)
