# How to Handle Platform-Specific Permissions in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Permissions, iOS, Android, Privacy, Mobile Development

Description: Learn how to properly request and handle platform-specific permissions in React Native for camera, location, notifications, and more.

---

Mobile applications often require access to device features like the camera, location, contacts, or storage. Both iOS and Android have robust permission systems to protect user privacy, and React Native developers must navigate both platforms' requirements. In this comprehensive guide, we will explore how to properly request, check, and handle permissions in React Native applications.

## Understanding Mobile Permissions

### Why Permissions Matter

Modern mobile operating systems implement permission models to give users control over their data and device features. When your app needs access to sensitive resources, it must explicitly request permission from the user.

Key reasons why permissions are critical:

1. **User Privacy**: Users should control what data apps can access
2. **Security**: Limiting access reduces potential attack surfaces
3. **Trust**: Transparent permission handling builds user confidence
4. **App Store Compliance**: Both Apple and Google require proper permission handling

### Platform Differences

iOS and Android handle permissions differently:

**iOS:**
- Permissions are requested once and remembered
- Users can change permissions only in Settings
- Requires explicit usage descriptions in Info.plist
- Some permissions have "limited" states (like photo library)

**Android:**
- Permissions can be requested multiple times (until "Don't ask again")
- Some permissions are granted automatically (normal permissions)
- Dangerous permissions require runtime requests
- Android 11+ introduced one-time permissions

## Setting Up react-native-permissions

The `react-native-permissions` library provides a unified API for handling permissions across both platforms.

### Installation

```bash
# Using npm
npm install react-native-permissions

# Using yarn
yarn add react-native-permissions
```

### iOS Setup

For iOS, you need to install pods and configure your Podfile:

```bash
cd ios && pod install
```

Update your `ios/Podfile` to specify which permissions your app needs:

```ruby
# ios/Podfile

target 'YourApp' do
  # ... other configurations

  permissions_path = '../node_modules/react-native-permissions/ios'

  # Add only the permissions you need
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  pod 'Permission-PhotoLibrary', :path => "#{permissions_path}/PhotoLibrary"
  pod 'Permission-Microphone', :path => "#{permissions_path}/Microphone"
  pod 'Permission-LocationWhenInUse', :path => "#{permissions_path}/LocationWhenInUse"
  pod 'Permission-LocationAlways', :path => "#{permissions_path}/LocationAlways"
  pod 'Permission-Notifications', :path => "#{permissions_path}/Notifications"
  pod 'Permission-Contacts', :path => "#{permissions_path}/Contacts"
  pod 'Permission-BluetoothPeripheral', :path => "#{permissions_path}/BluetoothPeripheral"
  pod 'Permission-MediaLibrary', :path => "#{permissions_path}/MediaLibrary"
  pod 'Permission-Motion', :path => "#{permissions_path}/Motion"
end
```

Run pod install again after modifying the Podfile:

```bash
cd ios && pod install
```

### Configuring iOS Info.plist

iOS requires usage description strings for each permission. Add these to your `ios/YourApp/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Camera -->
  <key>NSCameraUsageDescription</key>
  <string>We need access to your camera to take photos and scan documents.</string>

  <!-- Photo Library -->
  <key>NSPhotoLibraryUsageDescription</key>
  <string>We need access to your photo library to let you select images.</string>
  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>We need permission to save photos to your library.</string>

  <!-- Location -->
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>We need your location to show nearby places and provide directions.</string>
  <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
  <string>We need continuous location access to track your workouts and provide navigation.</string>
  <key>NSLocationAlwaysUsageDescription</key>
  <string>We need background location access to track your trips.</string>

  <!-- Microphone -->
  <key>NSMicrophoneUsageDescription</key>
  <string>We need microphone access to record audio messages and videos.</string>

  <!-- Contacts -->
  <key>NSContactsUsageDescription</key>
  <string>We need access to your contacts to help you connect with friends.</string>

  <!-- Calendars -->
  <key>NSCalendarsUsageDescription</key>
  <string>We need calendar access to schedule and manage your events.</string>

  <!-- Bluetooth -->
  <key>NSBluetoothAlwaysUsageDescription</key>
  <string>We need Bluetooth access to connect to nearby devices.</string>
  <key>NSBluetoothPeripheralUsageDescription</key>
  <string>We need Bluetooth access to communicate with accessories.</string>

  <!-- Motion -->
  <key>NSMotionUsageDescription</key>
  <string>We use motion data to track your steps and activity.</string>

  <!-- Face ID -->
  <key>NSFaceIDUsageDescription</key>
  <string>We use Face ID for secure authentication.</string>

  <!-- Media Library -->
  <key>NSAppleMusicUsageDescription</key>
  <string>We need access to your music library to play your songs.</string>

  <!-- Speech Recognition -->
  <key>NSSpeechRecognitionUsageDescription</key>
  <string>We use speech recognition for voice commands.</string>
</dict>
</plist>
```

### Android Manifest Permissions

For Android, declare permissions in `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourapp">

    <!-- Camera -->
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Location -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- Storage (for Android 12 and below) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <!-- Media (for Android 13+) -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

    <!-- Microphone -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- Contacts -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />

    <!-- Calendar -->
    <uses-permission android:name="android.permission.READ_CALENDAR" />
    <uses-permission android:name="android.permission.WRITE_CALENDAR" />

    <!-- Phone -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CALL_PHONE" />

    <!-- Bluetooth (for Android 12+) -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

    <!-- Notifications (for Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Activity Recognition -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        ...>
        <!-- Your activities and services -->
    </application>
</manifest>
```

## Checking Permission Status

Before requesting a permission, always check its current status:

```typescript
import { Platform } from 'react-native';
import {
  check,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';

// Define platform-specific permissions
const getCameraPermission = (): Permission => {
  return Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  }) as Permission;
};

const getLocationPermission = (): Permission => {
  return Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission;
};

// Check permission status
const checkCameraPermission = async (): Promise<string> => {
  const permission = getCameraPermission();
  const result = await check(permission);

  switch (result) {
    case RESULTS.UNAVAILABLE:
      console.log('This feature is not available on this device');
      return 'unavailable';

    case RESULTS.DENIED:
      console.log('Permission has not been requested yet or was denied but requestable');
      return 'denied';

    case RESULTS.GRANTED:
      console.log('Permission is granted');
      return 'granted';

    case RESULTS.LIMITED:
      console.log('Permission is granted but with limitations (iOS only)');
      return 'limited';

    case RESULTS.BLOCKED:
      console.log('Permission is denied and not requestable anymore');
      return 'blocked';

    default:
      return 'unknown';
  }
};
```

### Understanding Permission Results

The library returns these possible states:

| Result | iOS | Android | Description |
|--------|-----|---------|-------------|
| `UNAVAILABLE` | Yes | Yes | Feature not available on device |
| `DENIED` | Yes | Yes | Permission not yet requested or denied but can request again |
| `GRANTED` | Yes | Yes | Permission granted |
| `LIMITED` | Yes | No | Limited access (iOS 14+ photo library) |
| `BLOCKED` | Yes | Yes | Denied permanently, must go to settings |

## Requesting Permissions at Runtime

Here is how to properly request permissions:

```typescript
import { Platform, Alert } from 'react-native';
import {
  request,
  check,
  PERMISSIONS,
  RESULTS,
  Permission,
  PermissionStatus,
} from 'react-native-permissions';

interface PermissionResult {
  status: PermissionStatus;
  canRequest: boolean;
}

// Generic permission request function
const requestPermission = async (permission: Permission): Promise<PermissionResult> => {
  // First, check current status
  const currentStatus = await check(permission);

  if (currentStatus === RESULTS.GRANTED || currentStatus === RESULTS.LIMITED) {
    return { status: currentStatus, canRequest: false };
  }

  if (currentStatus === RESULTS.BLOCKED) {
    return { status: currentStatus, canRequest: false };
  }

  // Request the permission
  const requestStatus = await request(permission);

  return {
    status: requestStatus,
    canRequest: requestStatus === RESULTS.DENIED,
  };
};

// Request camera permission with proper handling
const requestCameraPermission = async (): Promise<boolean> => {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  }) as Permission;

  const result = await requestPermission(permission);

  if (result.status === RESULTS.GRANTED) {
    return true;
  }

  if (result.status === RESULTS.BLOCKED) {
    // Permission permanently denied
    showSettingsAlert('Camera');
    return false;
  }

  return false;
};

// Request location permission
const requestLocationPermission = async (): Promise<boolean> => {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission;

  const result = await requestPermission(permission);

  return result.status === RESULTS.GRANTED;
};

// Request multiple permissions
const requestMultiplePermissions = async (): Promise<void> => {
  const permissions = Platform.select({
    ios: [
      PERMISSIONS.IOS.CAMERA,
      PERMISSIONS.IOS.PHOTO_LIBRARY,
      PERMISSIONS.IOS.MICROPHONE,
    ],
    android: [
      PERMISSIONS.ANDROID.CAMERA,
      PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
      PERMISSIONS.ANDROID.RECORD_AUDIO,
    ],
  }) as Permission[];

  const results = await requestMultiple(permissions);

  // Handle each result
  for (const [permission, status] of Object.entries(results)) {
    console.log(`${permission}: ${status}`);
  }
};
```

## Handling Denied Permissions

When users deny permissions, provide helpful guidance:

```typescript
import { Alert, Linking, Platform } from 'react-native';
import { openSettings } from 'react-native-permissions';

// Show alert to guide user to settings
const showSettingsAlert = (permissionName: string): void => {
  Alert.alert(
    `${permissionName} Permission Required`,
    `To use this feature, please enable ${permissionName.toLowerCase()} access in your device settings.`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => openSettings(),
      },
    ],
    { cancelable: true }
  );
};

// More detailed settings guidance
const showDetailedSettingsAlert = (permissionName: string): void => {
  const instructions = Platform.select({
    ios: `Go to Settings > Your App > ${permissionName} and enable access.`,
    android: `Go to Settings > Apps > Your App > Permissions > ${permissionName} and select "Allow".`,
  });

  Alert.alert(
    `${permissionName} Access Needed`,
    `This feature requires ${permissionName.toLowerCase()} access.\n\n${instructions}`,
    [
      {
        text: 'Not Now',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => openSettings(),
      },
    ]
  );
};
```

## Handling "Don't Ask Again" Scenario

On Android, users can select "Don't ask again" when denying a permission. Here is how to handle this:

```typescript
import { Platform, PermissionsAndroid } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';

interface PermissionState {
  granted: boolean;
  blocked: boolean;
  shouldShowRationale: boolean;
}

// Check if we should show rationale (Android only)
const checkShouldShowRationale = async (
  permission: string
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // Map react-native-permissions to PermissionsAndroid
    const androidPermissionMap: Record<string, string> = {
      [PERMISSIONS.ANDROID.CAMERA]: PermissionsAndroid.PERMISSIONS.CAMERA,
      [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      [PERMISSIONS.ANDROID.RECORD_AUDIO]:
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      [PERMISSIONS.ANDROID.READ_CONTACTS]:
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    };

    const androidPermission = androidPermissionMap[permission];
    if (!androidPermission) {
      return false;
    }

    return await PermissionsAndroid.shouldShowRequestPermissionRationale(
      androidPermission
    );
  } catch (error) {
    console.error('Error checking rationale:', error);
    return false;
  }
};

// Complete permission flow with rationale
const requestPermissionWithRationale = async (
  permission: Permission,
  rationaleConfig: {
    title: string;
    message: string;
    buttonPositive: string;
    buttonNegative: string;
  }
): Promise<PermissionState> => {
  // Check current status
  const currentStatus = await check(permission);

  if (currentStatus === RESULTS.GRANTED) {
    return { granted: true, blocked: false, shouldShowRationale: false };
  }

  if (currentStatus === RESULTS.BLOCKED) {
    return { granted: false, blocked: true, shouldShowRationale: false };
  }

  // Check if we should show rationale
  const shouldShowRationale = await checkShouldShowRationale(permission);

  if (shouldShowRationale) {
    // Show rationale dialog before requesting
    const userAccepted = await new Promise<boolean>((resolve) => {
      Alert.alert(
        rationaleConfig.title,
        rationaleConfig.message,
        [
          {
            text: rationaleConfig.buttonNegative,
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: rationaleConfig.buttonPositive,
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });

    if (!userAccepted) {
      return { granted: false, blocked: false, shouldShowRationale: true };
    }
  }

  // Request the permission
  const result = await request(permission);

  return {
    granted: result === RESULTS.GRANTED,
    blocked: result === RESULTS.BLOCKED,
    shouldShowRationale: false,
  };
};

// Usage example
const handleCameraPermission = async (): Promise<boolean> => {
  const result = await requestPermissionWithRationale(
    Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
    }) as Permission,
    {
      title: 'Camera Permission Needed',
      message:
        'We need camera access to let you take photos and scan QR codes. Your photos are never shared without your consent.',
      buttonPositive: 'Allow Camera',
      buttonNegative: 'Not Now',
    }
  );

  if (result.blocked) {
    showSettingsAlert('Camera');
    return false;
  }

  return result.granted;
};
```

## Creating a Permission Hook

Create a reusable hook for permission management:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import {
  check,
  request,
  openSettings,
  RESULTS,
  Permission,
  PermissionStatus,
} from 'react-native-permissions';

interface UsePermissionReturn {
  status: PermissionStatus | null;
  isGranted: boolean;
  isBlocked: boolean;
  isDenied: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<PermissionStatus>;
  checkPermission: () => Promise<PermissionStatus>;
  openAppSettings: () => Promise<void>;
}

const usePermission = (permission: Permission): UsePermissionReturn => {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    setIsLoading(true);
    try {
      const result = await check(permission);
      setStatus(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    setIsLoading(true);
    try {
      const result = await request(permission);
      setStatus(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  const openAppSettings = useCallback(async (): Promise<void> => {
    await openSettings();
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Re-check permission when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkPermission]);

  return {
    status,
    isGranted: status === RESULTS.GRANTED || status === RESULTS.LIMITED,
    isBlocked: status === RESULTS.BLOCKED,
    isDenied: status === RESULTS.DENIED,
    isLoading,
    requestPermission,
    checkPermission,
    openAppSettings,
  };
};

// Usage in a component
const CameraScreen: React.FC = () => {
  const cameraPermission = usePermission(
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CAMERA
      : PERMISSIONS.ANDROID.CAMERA
  );

  if (cameraPermission.isLoading) {
    return <LoadingSpinner />;
  }

  if (cameraPermission.isBlocked) {
    return (
      <View style={styles.container}>
        <Text>Camera access is blocked</Text>
        <Button
          title="Open Settings"
          onPress={cameraPermission.openAppSettings}
        />
      </View>
    );
  }

  if (!cameraPermission.isGranted) {
    return (
      <View style={styles.container}>
        <Text>We need camera access to continue</Text>
        <Button
          title="Grant Permission"
          onPress={cameraPermission.requestPermission}
        />
      </View>
    );
  }

  return <CameraView />;
};
```

## Best Practices for Permission UX

### 1. Request Permissions in Context

Always request permissions when the user initiates an action that requires them:

```typescript
const PhotoButton: React.FC = () => {
  const handlePress = async (): Promise<void> => {
    const hasPermission = await requestCameraPermission();

    if (hasPermission) {
      // Open camera
      navigation.navigate('Camera');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>Take Photo</Text>
    </TouchableOpacity>
  );
};
```

### 2. Pre-Permission Education Screens

Show users why you need access before requesting:

```typescript
const LocationOnboardingScreen: React.FC = () => {
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);

  const handleContinue = async (): Promise<void> => {
    const result = await requestLocationPermission();

    if (result) {
      navigation.navigate('Home');
    } else {
      // Handle denial
      setShowPermissionRequest(true);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('./location-illustration.png')} />
      <Text style={styles.title}>Find Places Near You</Text>
      <Text style={styles.description}>
        Enable location access to discover restaurants, shops, and events
        in your area. We only use your location while you are using the app.
      </Text>
      <View style={styles.benefits}>
        <BenefitItem icon="map" text="Personalized recommendations" />
        <BenefitItem icon="navigation" text="Turn-by-turn directions" />
        <BenefitItem icon="bell" text="Alerts for nearby deals" />
      </View>
      <Button title="Enable Location" onPress={handleContinue} />
      <TextButton title="Maybe Later" onPress={() => navigation.navigate('Home')} />
    </View>
  );
};
```

### 3. Graceful Degradation

Provide alternative functionality when permissions are denied:

```typescript
const ContactsScreen: React.FC = () => {
  const contactsPermission = usePermission(
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CONTACTS
      : PERMISSIONS.ANDROID.READ_CONTACTS
  );

  if (!contactsPermission.isGranted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Add Friends</Text>
        <Text style={styles.description}>
          You can still invite friends manually without contact access.
        </Text>
        <Button
          title="Enter Email or Phone"
          onPress={() => navigation.navigate('ManualInvite')}
        />
        <TextButton
          title="Grant Contacts Access"
          onPress={contactsPermission.requestPermission}
        />
      </View>
    );
  }

  return <ContactsList />;
};
```

### 4. Timing Matters

Do not request permissions immediately on app launch:

```typescript
// BAD: Requesting on app launch
const App: React.FC = () => {
  useEffect(() => {
    // Users do not understand why you need this yet
    requestCameraPermission();
    requestLocationPermission();
    requestNotificationPermission();
  }, []);

  return <MainNavigator />;
};

// GOOD: Request when needed
const App: React.FC = () => {
  return <MainNavigator />;
};

// Request in relevant screens
const ScannerScreen: React.FC = () => {
  useEffect(() => {
    // User understands why camera is needed
    requestCameraPermission();
  }, []);

  return <QRScanner />;
};
```

## Testing Permissions

### Manual Testing Checklist

1. **Fresh Install**
   - Verify permissions show as DENIED initially
   - Test the request flow for each permission
   - Verify granted permissions work correctly

2. **Permission Denial**
   - Test single denial (can request again)
   - Test "Don't ask again" (BLOCKED state)
   - Verify settings redirect works

3. **Settings Changes**
   - Grant permission in settings, return to app
   - Revoke permission in settings, return to app
   - Verify app state updates correctly

4. **Edge Cases**
   - Test with airplane mode (location)
   - Test with disabled hardware (camera on emulator)
   - Test permission behavior across app restarts

### Automated Testing

```typescript
// __tests__/permissions.test.ts
import { check, request, RESULTS } from 'react-native-permissions';

// Mock the library
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  openSettings: jest.fn(),
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    GRANTED: 'granted',
    LIMITED: 'limited',
    BLOCKED: 'blocked',
  },
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
}));

describe('Permission handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when permission is already granted', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

    const result = await checkCameraPermission();

    expect(result).toBe('granted');
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('should request permission when denied', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
    (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

    const result = await requestCameraPermission();

    expect(result).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should handle blocked permission', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

    const result = await requestCameraPermission();

    expect(result).toBe(false);
    // Verify settings alert was shown
  });

  it('should handle unavailable permission', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.UNAVAILABLE);

    const result = await checkCameraPermission();

    expect(result).toBe('unavailable');
  });
});
```

### E2E Testing with Detox

```typescript
// e2e/permissions.e2e.ts
describe('Permissions', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { camera: 'unset', location: 'unset' },
    });
  });

  it('should request camera permission when opening scanner', async () => {
    await element(by.id('scan-button')).tap();

    // On iOS, check for system permission dialog
    if (device.getPlatform() === 'ios') {
      await expect(element(by.label('Allow "App" to access the camera'))).toBeVisible();
    }
  });

  it('should show permission denied screen when camera blocked', async () => {
    await device.launchApp({
      permissions: { camera: 'never' },
      newInstance: true,
    });

    await element(by.id('scan-button')).tap();

    await expect(element(by.id('permission-denied-screen'))).toBeVisible();
    await expect(element(by.id('open-settings-button'))).toBeVisible();
  });

  it('should work correctly when permission is granted', async () => {
    await device.launchApp({
      permissions: { camera: 'yes' },
      newInstance: true,
    });

    await element(by.id('scan-button')).tap();

    await expect(element(by.id('camera-view'))).toBeVisible();
  });
});
```

## Common Pitfalls and Solutions

### 1. Not Handling All Permission States

```typescript
// BAD: Missing states
const checkPermission = async (): Promise<boolean> => {
  const result = await check(permission);
  return result === RESULTS.GRANTED;
};

// GOOD: Handle all states
const checkPermission = async (): Promise<PermissionState> => {
  const result = await check(permission);

  switch (result) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return { canUse: true, needsRequest: false };
    case RESULTS.DENIED:
      return { canUse: false, needsRequest: true };
    case RESULTS.BLOCKED:
      return { canUse: false, needsRequest: false, blocked: true };
    case RESULTS.UNAVAILABLE:
      return { canUse: false, needsRequest: false, unavailable: true };
    default:
      return { canUse: false, needsRequest: false };
  }
};
```

### 2. Not Refreshing Permission Status

```typescript
// BAD: Not checking after app returns from settings
const PermissionScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission().then(setHasPermission);
  }, []);

  return <View />;
};

// GOOD: Re-check when app becomes active
const PermissionScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPermission().then(setHasPermission);
      }
    });

    checkPermission().then(setHasPermission);

    return () => subscription.remove();
  }, []);

  return <View />;
};
```

### 3. Forgetting Platform-Specific Permissions

```typescript
// BAD: Using wrong permission on platform
const permission = PERMISSIONS.IOS.CAMERA; // Will fail on Android

// GOOD: Platform-specific selection
const permission = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
}) as Permission;
```

## Conclusion

Handling permissions correctly in React Native requires understanding both iOS and Android permission models. Key takeaways:

1. **Always check before requesting** - Know the current state before asking
2. **Request in context** - Ask when the user needs the feature
3. **Handle all states** - GRANTED, DENIED, BLOCKED, LIMITED, UNAVAILABLE
4. **Provide clear rationale** - Explain why you need access
5. **Offer alternatives** - Graceful degradation when denied
6. **Guide to settings** - Help users enable blocked permissions
7. **Re-check on foreground** - Users may change permissions in settings
8. **Test thoroughly** - Cover all permission states and edge cases

By following these practices, you will create a better user experience while maintaining proper access to device features.

## Additional Resources

- [react-native-permissions Documentation](https://github.com/zoontek/react-native-permissions)
- [Apple Human Interface Guidelines - Permissions](https://developer.apple.com/design/human-interface-guidelines/privacy)
- [Android Permissions Best Practices](https://developer.android.com/training/permissions/requesting)
- [React Native Official Documentation](https://reactnative.dev/)
