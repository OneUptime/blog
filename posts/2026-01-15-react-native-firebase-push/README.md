# How to Set Up Push Notifications with Firebase in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Firebase, Push Notifications, FCM, iOS, Android, Mobile Development

Description: Learn how to implement push notifications in React Native using Firebase Cloud Messaging (FCM) for iOS and Android.

---

Push notifications are a crucial feature for modern mobile applications. They help you re-engage users, deliver real-time updates, and provide a better overall user experience. In this comprehensive guide, we'll walk through setting up push notifications in React Native using Firebase Cloud Messaging (FCM).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Installing React Native Firebase](#installing-react-native-firebase)
4. [iOS APNs Configuration](#ios-apns-configuration)
5. [Android FCM Configuration](#android-fcm-configuration)
6. [Requesting Notification Permissions](#requesting-notification-permissions)
7. [Handling Foreground Notifications](#handling-foreground-notifications)
8. [Handling Background Notifications](#handling-background-notifications)
9. [Data-Only Messages](#data-only-messages)
10. [Notification Channels (Android)](#notification-channels-android)
11. [Deep Linking from Notifications](#deep-linking-from-notifications)
12. [Token Management](#token-management)
13. [Testing Push Notifications](#testing-push-notifications)
14. [Troubleshooting Common Issues](#troubleshooting-common-issues)
15. [Conclusion](#conclusion)

---

## Prerequisites

Before we begin, ensure you have the following:

- Node.js (v18 or later)
- React Native CLI or Expo (bare workflow)
- Xcode (for iOS development)
- Android Studio (for Android development)
- A Firebase account
- An Apple Developer account (for iOS push notifications)

## Firebase Project Setup

### Step 1: Create a Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter your project name and click **Continue**
4. Choose whether to enable Google Analytics (recommended) and click **Create Project**
5. Wait for the project to be created and click **Continue**

### Step 2: Register Your Apps

#### For Android:

1. In the Firebase Console, click the **Android** icon to add an Android app
2. Enter your Android package name (found in `android/app/build.gradle` as `applicationId`)
3. Enter a nickname for your app (optional)
4. Enter your SHA-1 certificate (optional but recommended for certain features)
5. Click **Register app**
6. Download the `google-services.json` file
7. Place it in your `android/app/` directory

#### For iOS:

1. Click **Add app** and select the **iOS** icon
2. Enter your iOS bundle ID (found in Xcode under your target's General tab)
3. Enter a nickname for your app (optional)
4. Enter your App Store ID (optional)
5. Click **Register app**
6. Download the `GoogleService-Info.plist` file
7. Add it to your iOS project in Xcode (drag it into the project navigator)

---

## Installing React Native Firebase

### Step 1: Install the Core Module

First, install the core React Native Firebase package:

```bash
npm install @react-native-firebase/app
```

### Step 2: Install the Messaging Module

Next, install the messaging module for push notifications:

```bash
npm install @react-native-firebase/messaging
```

### Step 3: iOS Setup

Navigate to the iOS directory and install pods:

```bash
cd ios && pod install && cd ..
```

### Step 4: Android Setup

#### Update `android/build.gradle`:

Add the Google services classpath to your project-level `build.gradle`:

```gradle
buildscript {
    dependencies {
        // ... other dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

#### Update `android/app/build.gradle`:

Apply the Google services plugin at the bottom of your app-level `build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## iOS APNs Configuration

Push notifications on iOS require Apple Push Notification service (APNs) configuration. This is essential for FCM to deliver messages to iOS devices.

### Step 1: Enable Push Notifications Capability

1. Open your project in Xcode
2. Select your project in the navigator
3. Select your app target
4. Go to the **Signing & Capabilities** tab
5. Click **+ Capability**
6. Add **Push Notifications**
7. Also add **Background Modes** and enable **Remote notifications**

### Step 2: Create an APNs Key

1. Go to the [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Keys** from the sidebar
4. Click the **+** button to create a new key
5. Enter a name for the key
6. Enable **Apple Push Notifications service (APNs)**
7. Click **Continue** and then **Register**
8. Download the `.p8` file and note the **Key ID**
9. Also note your **Team ID** (found in Membership details)

### Step 3: Upload the APNs Key to Firebase

1. In the Firebase Console, go to **Project Settings**
2. Select the **Cloud Messaging** tab
3. Under **Apple app configuration**, click **Upload** next to APNs Authentication Key
4. Upload your `.p8` file
5. Enter your Key ID and Team ID
6. Click **Upload**

### Step 4: Update AppDelegate

In your `ios/YourApp/AppDelegate.mm`, add the following imports and method:

```objective-c
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];

  // Request notification permissions early (optional)
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;

  // ... rest of your code
  return YES;
}

// Handle notification registration
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [FIRMessaging messaging].APNSToken = deviceToken;
}

@end
```

---

## Android FCM Configuration

Android requires less configuration than iOS, but there are still some important steps.

### Step 1: Verify google-services.json

Ensure your `google-services.json` file is in the `android/app/` directory and contains the correct project information.

### Step 2: Update AndroidManifest.xml

Add the following to your `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Required for push notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

    <application ...>
        <!-- Set custom default icon for notifications -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />

        <!-- Set custom default color for notifications -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/notification_color" />

        <!-- Default notification channel -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="default_channel" />
    </application>
</manifest>
```

### Step 3: Create Notification Icon

Create a notification icon (`ic_notification.png`) and place it in the appropriate drawable folders:
- `android/app/src/main/res/drawable-mdpi/`
- `android/app/src/main/res/drawable-hdpi/`
- `android/app/src/main/res/drawable-xhdpi/`
- `android/app/src/main/res/drawable-xxhdpi/`
- `android/app/src/main/res/drawable-xxxhdpi/`

---

## Requesting Notification Permissions

Both iOS and Android 13+ require explicit user permission for notifications. Here's how to request them:

### Create a Permission Handler

```typescript
// src/services/notifications/permissions.ts
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('iOS Authorization status:', authStatus);
    return enabled;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // Android < 13 doesn't require runtime permission
  }

  return false;
}

export async function checkNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().hasPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}
```

### Request Permission on App Start

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { requestNotificationPermission } from './src/services/notifications/permissions';

function App(): React.JSX.Element {
  useEffect(() => {
    const initializeNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        console.log('Notification permission granted');
        // Initialize other notification features
      } else {
        console.log('Notification permission denied');
      }
    };

    initializeNotifications();
  }, []);

  return (
    // Your app content
  );
}

export default App;
```

---

## Handling Foreground Notifications

When your app is in the foreground, FCM delivers messages but doesn't display them by default. You need to handle them manually.

### Using onMessage Listener

```typescript
// src/services/notifications/foreground.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

export function setupForegroundHandler(): () => void {
  const unsubscribe = messaging().onMessage(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('Foreground message received:', remoteMessage);

      const { notification, data } = remoteMessage;

      if (notification) {
        // Display an alert or custom UI
        Alert.alert(
          notification.title || 'New Notification',
          notification.body || '',
          [
            {
              text: 'View',
              onPress: () => handleNotificationPress(data),
            },
            {
              text: 'Dismiss',
              style: 'cancel',
            },
          ]
        );
      }
    }
  );

  return unsubscribe;
}

function handleNotificationPress(data: Record<string, string> | undefined): void {
  if (data?.screen) {
    // Navigate to the appropriate screen
    console.log('Navigate to:', data.screen);
  }
}
```

### Using a Local Notification Library

For a better user experience, use `@notifee/react-native` to display local notifications:

```bash
npm install @notifee/react-native
cd ios && pod install && cd ..
```

```typescript
// src/services/notifications/foreground.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

export function setupForegroundHandler(): () => void {
  const unsubscribe = messaging().onMessage(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('Foreground message received:', remoteMessage);

      const { notification, data, messageId } = remoteMessage;

      if (notification) {
        // Create a channel (required for Android)
        const channelId = await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
        });

        // Display the notification
        await notifee.displayNotification({
          id: messageId,
          title: notification.title,
          body: notification.body,
          data: data,
          android: {
            channelId,
            smallIcon: 'ic_notification',
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            foregroundPresentationOptions: {
              badge: true,
              sound: true,
              banner: true,
              list: true,
            },
          },
        });
      }
    }
  );

  return unsubscribe;
}
```

---

## Handling Background Notifications

Background and quit state notifications are handled differently. You need to set up a background handler.

### Register Background Handler

```typescript
// index.js (your app's entry point)
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background handler BEFORE AppRegistry.registerComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message received:', remoteMessage);

  // Perform any background processing here
  // Note: You have limited time to process the message

  const { data } = remoteMessage;

  if (data?.type === 'sync') {
    // Trigger a background sync
    await performBackgroundSync();
  }
});

async function performBackgroundSync(): Promise<void> {
  // Implement your sync logic
  console.log('Performing background sync...');
}

AppRegistry.registerComponent(appName, () => App);
```

### Handle Notification Open (Background/Quit State)

```typescript
// src/services/notifications/background.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { NavigationContainerRef } from '@react-navigation/native';

type RootStackParamList = {
  Home: undefined;
  Details: { id: string };
  Profile: { userId: string };
};

let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

export function setNavigationRef(
  ref: NavigationContainerRef<RootStackParamList>
): void {
  navigationRef = ref;
}

export async function handleInitialNotification(): Promise<void> {
  // Check if app was opened from a notification (quit state)
  const remoteMessage = await messaging().getInitialNotification();

  if (remoteMessage) {
    console.log('App opened from quit state by notification:', remoteMessage);
    handleNotificationNavigation(remoteMessage);
  }
}

export function setupNotificationOpenHandler(): () => void {
  // Handle notification opened from background state
  const unsubscribe = messaging().onNotificationOpenedApp(
    (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('App opened from background by notification:', remoteMessage);
      handleNotificationNavigation(remoteMessage);
    }
  );

  return unsubscribe;
}

function handleNotificationNavigation(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): void {
  const { data } = remoteMessage;

  if (!navigationRef || !data) return;

  // Navigate based on notification data
  switch (data.type) {
    case 'order':
      navigationRef.navigate('Details', { id: data.orderId });
      break;
    case 'profile':
      navigationRef.navigate('Profile', { userId: data.userId });
      break;
    default:
      navigationRef.navigate('Home');
  }
}
```

---

## Data-Only Messages

Data-only messages are useful when you want complete control over how notifications are displayed or when you need to perform background processing without showing a notification.

### Sending Data-Only Messages

When sending from your server or Firebase Console, omit the `notification` payload and only include `data`:

```json
{
  "to": "<FCM_TOKEN>",
  "data": {
    "type": "silent_update",
    "action": "refresh_data",
    "timestamp": "1705276800"
  },
  "content_available": true,
  "priority": "high"
}
```

### Handling Data-Only Messages

```typescript
// src/services/notifications/dataMessages.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

interface DataMessagePayload {
  type: string;
  action?: string;
  title?: string;
  body?: string;
  [key: string]: string | undefined;
}

export function setupDataMessageHandler(): () => void {
  const unsubscribe = messaging().onMessage(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      // Check if this is a data-only message
      if (!remoteMessage.notification && remoteMessage.data) {
        await handleDataMessage(remoteMessage.data as DataMessagePayload);
      }
    }
  );

  return unsubscribe;
}

async function handleDataMessage(data: DataMessagePayload): Promise<void> {
  console.log('Data-only message received:', data);

  switch (data.type) {
    case 'silent_update':
      // Refresh data without showing notification
      await refreshAppData();
      break;

    case 'custom_notification':
      // Show a custom notification
      await showCustomNotification(data);
      break;

    case 'badge_update':
      // Update app badge count
      await updateBadgeCount(parseInt(data.count || '0', 10));
      break;

    default:
      console.log('Unknown data message type:', data.type);
  }
}

async function refreshAppData(): Promise<void> {
  // Implement your data refresh logic
  console.log('Refreshing app data...');
}

async function showCustomNotification(data: DataMessagePayload): Promise<void> {
  const channelId = await notifee.createChannel({
    id: 'custom',
    name: 'Custom Notifications',
  });

  await notifee.displayNotification({
    title: data.title || 'Notification',
    body: data.body || '',
    android: {
      channelId,
      smallIcon: 'ic_notification',
    },
  });
}

async function updateBadgeCount(count: number): Promise<void> {
  await notifee.setBadgeCount(count);
}
```

---

## Notification Channels (Android)

Android 8.0 (API level 26) and above require notification channels. Users can customize notification behavior per channel.

### Creating Notification Channels

```typescript
// src/services/notifications/channels.ts
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

interface ChannelConfig {
  id: string;
  name: string;
  description?: string;
  importance: AndroidImportance;
  visibility?: AndroidVisibility;
  sound?: string;
  vibration?: boolean;
  lights?: boolean;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default notifications',
    importance: AndroidImportance.DEFAULT,
  },
  {
    id: 'high_priority',
    name: 'High Priority',
    description: 'Important notifications that require immediate attention',
    importance: AndroidImportance.HIGH,
    vibration: true,
    lights: true,
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Chat and direct messages',
    importance: AndroidImportance.HIGH,
    sound: 'message_sound',
  },
  {
    id: 'updates',
    name: 'Updates',
    description: 'App updates and news',
    importance: AndroidImportance.LOW,
  },
  {
    id: 'silent',
    name: 'Silent',
    description: 'Background updates',
    importance: AndroidImportance.MIN,
    vibration: false,
  },
];

export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const channel of CHANNELS) {
    await notifee.createChannel({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      importance: channel.importance,
      visibility: channel.visibility,
      vibration: channel.vibration,
      lights: channel.lights,
      sound: channel.sound,
    });
  }

  console.log('Notification channels created');
}

export async function deleteNotificationChannel(channelId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.deleteChannel(channelId);
}

export async function getNotificationChannels(): Promise<string[]> {
  if (Platform.OS !== 'android') return [];
  const channels = await notifee.getChannels();
  return channels.map((channel) => channel.id);
}
```

### Channel Groups

```typescript
// src/services/notifications/channelGroups.ts
import notifee from '@notifee/react-native';
import { Platform } from 'react-native';

export async function createChannelGroups(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.createChannelGroup({
    id: 'social',
    name: 'Social',
    description: 'Notifications related to social features',
  });

  await notifee.createChannelGroup({
    id: 'commerce',
    name: 'Commerce',
    description: 'Order and payment notifications',
  });

  // Create channels within groups
  await notifee.createChannel({
    id: 'friend_requests',
    name: 'Friend Requests',
    groupId: 'social',
    importance: notifee.AndroidImportance.HIGH,
  });

  await notifee.createChannel({
    id: 'order_updates',
    name: 'Order Updates',
    groupId: 'commerce',
    importance: notifee.AndroidImportance.HIGH,
  });
}
```

---

## Deep Linking from Notifications

Deep linking allows you to navigate users directly to specific content within your app.

### Configure Deep Linking

First, set up deep linking in your React Navigation:

```typescript
// src/navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';

type RootStackParamList = {
  Home: undefined;
  Product: { productId: string };
  Order: { orderId: string };
  Profile: { userId: string };
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: 'home',
      Product: 'product/:productId',
      Order: 'order/:orderId',
      Profile: 'profile/:userId',
    },
  },
  async getInitialURL(): Promise<string | null> {
    // Check if the app was opened from a notification
    const remoteMessage = await messaging().getInitialNotification();

    if (remoteMessage?.data?.deepLink) {
      return remoteMessage.data.deepLink as string;
    }

    return null;
  },
  subscribe(listener: (url: string) => void): () => void {
    // Listen for notification opens
    const unsubscribeNotification = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        const deepLink = remoteMessage.data?.deepLink;
        if (deepLink) {
          listener(deepLink as string);
        }
      }
    );

    return () => {
      unsubscribeNotification();
    };
  },
};
```

### Navigation Setup

```typescript
// App.tsx
import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { linking } from './src/navigation/linking';
import { setNavigationRef } from './src/services/notifications/background';

type RootStackParamList = {
  Home: undefined;
  Product: { productId: string };
  Order: { orderId: string };
  Profile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Product" component={ProductScreen} />
        <Stack.Screen name="Order" component={OrderScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

### Sending Deep Link Notifications

```json
{
  "to": "<FCM_TOKEN>",
  "notification": {
    "title": "Your order has shipped!",
    "body": "Track your package now"
  },
  "data": {
    "deepLink": "myapp://order/12345",
    "orderId": "12345"
  }
}
```

---

## Token Management

FCM tokens are essential for targeting specific devices. They can change, so proper management is crucial.

### Complete Token Management Service

```typescript
// src/services/notifications/tokenManager.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = '@fcm_token';

interface TokenData {
  token: string;
  timestamp: number;
  synced: boolean;
}

class TokenManager {
  private static instance: TokenManager;
  private currentToken: string | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async initialize(): Promise<void> {
    // Get initial token
    await this.getToken();

    // Listen for token refresh
    this.setupTokenRefreshListener();
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();

      if (token !== this.currentToken) {
        this.currentToken = token;
        await this.saveToken(token);
        await this.syncTokenWithServer(token);
      }

      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  private setupTokenRefreshListener(): void {
    messaging().onTokenRefresh(async (newToken: string) => {
      console.log('FCM token refreshed:', newToken);

      const oldToken = this.currentToken;
      this.currentToken = newToken;

      await this.saveToken(newToken);
      await this.syncTokenWithServer(newToken, oldToken);
    });
  }

  private async saveToken(token: string): Promise<void> {
    const tokenData: TokenData = {
      token,
      timestamp: Date.now(),
      synced: false,
    };

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  }

  async getStoredToken(): Promise<TokenData | null> {
    const data = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  private async syncTokenWithServer(
    newToken: string,
    oldToken?: string | null
  ): Promise<void> {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('https://your-api.com/fcm-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth headers as needed
        },
        body: JSON.stringify({
          token: newToken,
          oldToken: oldToken || undefined,
          platform: Platform.OS,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        // Mark token as synced
        const tokenData = await this.getStoredToken();
        if (tokenData) {
          tokenData.synced = true;
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
        }
        console.log('Token synced with server');
      }
    } catch (error) {
      console.error('Failed to sync token with server:', error);
    }
  }

  async deleteToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      this.currentToken = null;
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Failed to delete FCM token:', error);
    }
  }
}

export const tokenManager = TokenManager.getInstance();
```

### Topic Subscriptions

```typescript
// src/services/notifications/topics.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOPICS_STORAGE_KEY = '@subscribed_topics';

export async function subscribeToTopic(topic: string): Promise<void> {
  try {
    await messaging().subscribeToTopic(topic);
    await saveSubscribedTopic(topic);
    console.log(`Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to subscribe to topic ${topic}:`, error);
    throw error;
  }
}

export async function unsubscribeFromTopic(topic: string): Promise<void> {
  try {
    await messaging().unsubscribeFromTopic(topic);
    await removeSubscribedTopic(topic);
    console.log(`Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    throw error;
  }
}

export async function getSubscribedTopics(): Promise<string[]> {
  const data = await AsyncStorage.getItem(TOPICS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveSubscribedTopic(topic: string): Promise<void> {
  const topics = await getSubscribedTopics();
  if (!topics.includes(topic)) {
    topics.push(topic);
    await AsyncStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
  }
}

async function removeSubscribedTopic(topic: string): Promise<void> {
  const topics = await getSubscribedTopics();
  const filtered = topics.filter((t) => t !== topic);
  await AsyncStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(filtered));
}

// Common topic subscriptions
export async function setupDefaultTopics(): Promise<void> {
  await subscribeToTopic('all_users');
  await subscribeToTopic('announcements');
}
```

---

## Testing Push Notifications

### Method 1: Firebase Console

1. Go to the Firebase Console
2. Navigate to **Engage > Messaging**
3. Click **Create your first campaign** or **New campaign**
4. Select **Firebase Notification messages**
5. Enter notification details (title, body, image)
6. Target by topic, user segment, or specific device (using FCM token)
7. Schedule and send

### Method 2: Using cURL

```bash
# Send to a specific device
curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H 'Authorization: key=YOUR_SERVER_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test notification"
    },
    "data": {
      "type": "test",
      "deepLink": "myapp://home"
    }
  }'

# Send to a topic
curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H 'Authorization: key=YOUR_SERVER_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "/topics/all_users",
    "notification": {
      "title": "Announcement",
      "body": "New feature available!"
    }
  }'
```

### Method 3: Using a Test Script

```typescript
// scripts/testNotification.ts
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

async function sendTestNotification(token: string): Promise<void> {
  const message: admin.messaging.Message = {
    token,
    notification: {
      title: 'Test Notification',
      body: 'This is a test from the server',
    },
    data: {
      type: 'test',
      timestamp: Date.now().toString(),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        icon: 'ic_notification',
        color: '#FF5722',
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Run with: npx ts-node scripts/testNotification.ts
const testToken = 'YOUR_TEST_DEVICE_TOKEN';
sendTestNotification(testToken);
```

### Method 4: Using the Notifee Testing Tool

```typescript
// src/utils/testNotifications.ts
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

export async function displayTestNotification(): Promise<void> {
  // Create a channel first
  const channelId = await notifee.createChannel({
    id: 'test',
    name: 'Test Notifications',
    importance: AndroidImportance.HIGH,
  });

  // Display the notification
  await notifee.displayNotification({
    title: 'Local Test Notification',
    body: 'This notification was triggered locally for testing',
    android: {
      channelId,
      smallIcon: 'ic_notification',
      pressAction: {
        id: 'default',
      },
    },
    ios: {
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
}

// Listen for notification events (useful for debugging)
notifee.onForegroundEvent(({ type, detail }) => {
  switch (type) {
    case EventType.DISMISSED:
      console.log('User dismissed notification', detail.notification);
      break;
    case EventType.PRESS:
      console.log('User pressed notification', detail.notification);
      break;
    case EventType.ACTION_PRESS:
      console.log('User pressed action', detail.pressAction);
      break;
  }
});
```

---

## Troubleshooting Common Issues

### iOS Issues

**1. Notifications not appearing:**
- Verify APNs key is uploaded to Firebase
- Check that Push Notifications capability is enabled in Xcode
- Ensure Background Modes > Remote notifications is enabled
- Verify the bundle ID matches between Xcode and Firebase

**2. Token not generating:**
```typescript
// Check if APNs token is being set
import messaging from '@react-native-firebase/messaging';

const apnsToken = await messaging().getAPNSToken();
console.log('APNs Token:', apnsToken);

if (!apnsToken) {
  console.log('APNs token not available - check provisioning profile');
}
```

**3. Simulator limitations:**
- Push notifications don't work on the iOS Simulator by default
- Use a physical device for testing
- Alternatively, use Xcode 11.4+ with a special payload file

### Android Issues

**1. Notifications not appearing:**
- Check that `google-services.json` is in the correct location
- Verify the package name matches
- Ensure notification channels are created for Android 8+

**2. Background handler not working:**
```typescript
// Ensure the handler is registered in index.js, not in a component
// The handler must be registered before AppRegistry.registerComponent
```

**3. Custom sounds not playing:**
- Place sound files in `android/app/src/main/res/raw/`
- Reference without file extension: `sound: 'custom_sound'`

### General Issues

**1. Token refresh issues:**
```typescript
// Force token refresh
await messaging().deleteToken();
const newToken = await messaging().getToken();
```

**2. Messages not received:**
- Check internet connectivity
- Verify server key is correct
- Ensure the token is valid and not stale

---

## Conclusion

Implementing push notifications in React Native with Firebase Cloud Messaging provides a robust solution for engaging users on both iOS and Android platforms. This guide covered:

- Setting up Firebase and installing necessary packages
- Configuring iOS APNs and Android FCM
- Requesting and managing notification permissions
- Handling notifications in foreground, background, and quit states
- Working with data-only messages for silent updates
- Creating and managing Android notification channels
- Implementing deep linking for better user experience
- Managing FCM tokens and topic subscriptions
- Testing strategies for push notifications

Remember these best practices:

1. **Always request permissions gracefully** - Explain why you need notification access
2. **Use appropriate notification channels** - Let users control notification preferences
3. **Handle all app states** - Foreground, background, and quit state
4. **Keep tokens synced** - Listen for token refresh and update your server
5. **Test thoroughly** - Test on real devices, both iOS and Android
6. **Monitor delivery** - Use Firebase Analytics to track notification effectiveness

With these implementations in place, you'll have a solid push notification system that enhances user engagement and provides timely, relevant information to your app users.

---

## Additional Resources

- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Notifee Documentation](https://notifee.app/)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
