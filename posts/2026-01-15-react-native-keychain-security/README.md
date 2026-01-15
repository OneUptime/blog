# How to Secure Sensitive Data with React Native Keychain

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Security, Keychain, Secure Storage, Mobile Development, iOS, Android

Description: Learn how to securely store sensitive data in React Native using Keychain (iOS) and Keystore (Android) for maximum security.

---

Mobile applications frequently handle sensitive user data, from authentication tokens and API keys to personal information and financial credentials. How you store this data can make the difference between a secure application and one vulnerable to data breaches. In this comprehensive guide, we will explore how to use `react-native-keychain` to leverage the native secure storage mechanisms on both iOS and Android platforms.

## Why Secure Storage Matters

In the mobile ecosystem, data security is not just a feature but a fundamental requirement. Users trust applications with their most sensitive information, and a single security breach can have devastating consequences.

### The Risks of Insecure Storage

When sensitive data is stored insecurely, your application becomes vulnerable to several attack vectors:

1. **Device Theft**: If a device is stolen and data is stored in plain text, attackers can easily extract sensitive information.

2. **Malware and Rooted Devices**: On compromised devices, malicious applications can access data stored in unprotected locations.

3. **Backup Extraction**: Unencrypted data can be extracted from device backups.

4. **Memory Dumps**: Sensitive data stored in memory without proper protection can be captured through memory analysis.

5. **Regulatory Compliance**: Regulations like GDPR, HIPAA, and PCI-DSS mandate proper data protection practices.

### What Data Needs Secure Storage?

Not all data requires the same level of protection. Here is a classification to help you decide:

**High Sensitivity (Requires Secure Storage):**
- Authentication tokens (JWT, OAuth tokens)
- User credentials (passwords, PINs)
- API keys and secrets
- Encryption keys
- Payment information
- Biometric templates
- Personal health information

**Medium Sensitivity (Consider Secure Storage):**
- Session identifiers
- User preferences with privacy implications
- Cached personal data

**Low Sensitivity (Standard Storage Acceptable):**
- Application settings
- Non-sensitive cache data
- UI state

## Keychain vs AsyncStorage: Understanding the Difference

Before diving into implementation, it is crucial to understand why `AsyncStorage` is inadequate for sensitive data and why Keychain/Keystore provides superior security.

### AsyncStorage Limitations

`AsyncStorage` is a simple, unencrypted, asynchronous key-value storage system. While convenient for general-purpose storage, it has significant security limitations:

```typescript
// This is how AsyncStorage stores data - DO NOT use for sensitive data
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data is stored in plain text!
await AsyncStorage.setItem('userToken', 'eyJhbGciOiJIUzI1NiIs...');

// Anyone with device access can read this
const token = await AsyncStorage.getItem('userToken');
```

**Why AsyncStorage is Insecure:**

1. **No Encryption**: Data is stored in plain text on the file system.
2. **Accessible via Backups**: Data can be extracted from unencrypted backups.
3. **No Hardware Protection**: Does not leverage secure hardware enclaves.
4. **Visible in Debug Builds**: Easily accessible during development and on rooted devices.

### Keychain/Keystore Advantages

The native Keychain (iOS) and Keystore (Android) systems provide hardware-backed security:

```typescript
// Secure storage with react-native-keychain
import * as Keychain from 'react-native-keychain';

// Data is encrypted and hardware-protected
await Keychain.setGenericPassword('user@example.com', 'eyJhbGciOiJIUzI1NiIs...');

// Only accessible with proper authentication
const credentials = await Keychain.getGenericPassword();
```

**Security Benefits:**

1. **Hardware Encryption**: Data is encrypted using hardware-backed keys.
2. **Access Control**: Fine-grained control over when data can be accessed.
3. **Biometric Protection**: Optional biometric authentication for data access.
4. **Secure Enclave**: On supported devices, keys never leave secure hardware.
5. **Backup Protection**: Properly configured data is not included in backups.

## Setting Up react-native-keychain

Let us set up `react-native-keychain` in your React Native project.

### Installation

```bash
# Using npm
npm install react-native-keychain

# Using yarn
yarn add react-native-keychain
```

### iOS Configuration

For iOS, the library uses CocoaPods. Navigate to your iOS directory and install pods:

```bash
cd ios && pod install && cd ..
```

If you plan to use biometric authentication, add the following to your `Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID to secure your credentials</string>
```

### Android Configuration

For Android, the library should auto-link. However, ensure your `android/app/build.gradle` has the correct minimum SDK version:

```gradle
android {
    defaultConfig {
        minSdkVersion 23  // Required for Keystore
    }
}
```

For biometric authentication on Android, add these permissions to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### TypeScript Support

Create a types file if needed for better TypeScript support:

```typescript
// types/keychain.d.ts
declare module 'react-native-keychain' {
  export interface UserCredentials {
    username: string;
    password: string;
    service: string;
    storage: string;
  }

  export interface SharedWebCredentials {
    server: string;
    username: string;
    password: string;
  }

  export enum ACCESSIBLE {
    WHEN_UNLOCKED = 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK = 'AccessibleAfterFirstUnlock',
    ALWAYS = 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AccessibleAfterFirstUnlockThisDeviceOnly',
  }

  export enum ACCESS_CONTROL {
    USER_PRESENCE = 'UserPresence',
    BIOMETRY_ANY = 'BiometryAny',
    BIOMETRY_CURRENT_SET = 'BiometryCurrentSet',
    DEVICE_PASSCODE = 'DevicePasscode',
    APPLICATION_PASSWORD = 'ApplicationPassword',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE = 'BiometryAnyOrDevicePasscode',
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE = 'BiometryCurrentSetOrDevicePasscode',
  }

  export enum AUTHENTICATION_TYPE {
    DEVICE_PASSCODE_OR_BIOMETRICS = 'AuthenticationWithBiometricsDevicePasscode',
    BIOMETRICS = 'AuthenticationWithBiometrics',
  }

  export enum SECURITY_LEVEL {
    SECURE_SOFTWARE = 'SECURE_SOFTWARE',
    SECURE_HARDWARE = 'SECURE_HARDWARE',
    ANY = 'ANY',
  }

  export enum STORAGE_TYPE {
    FB = 'FacebookConceal',
    AES = 'KeystoreAESCBC',
    RSA = 'KeystoreRSAECB',
  }
}
```

## Storing Credentials Securely

Now let us explore how to store different types of sensitive data securely.

### Basic Credential Storage

The simplest use case is storing username and password combinations:

```typescript
import * as Keychain from 'react-native-keychain';

interface StorageResult {
  success: boolean;
  error?: string;
}

export async function storeCredentials(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password);
    return { success: true };
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Usage
await storeCredentials('user@example.com', 'securePassword123');
```

### Storing Authentication Tokens

For JWT or OAuth tokens, you can use the password field:

```typescript
export async function storeAuthToken(
  userId: string,
  token: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(userId, token, {
      service: 'com.yourapp.authtoken',
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Multiple Credential Storage

To store multiple credentials, use different service identifiers:

```typescript
const SERVICES = {
  AUTH: 'com.yourapp.auth',
  API_KEY: 'com.yourapp.apikey',
  ENCRYPTION_KEY: 'com.yourapp.encryption',
  REFRESH_TOKEN: 'com.yourapp.refresh',
} as const;

export async function storeMultipleCredentials(
  credentials: Record<string, { username: string; password: string }>
): Promise<void> {
  const promises = Object.entries(credentials).map(([service, cred]) =>
    Keychain.setGenericPassword(cred.username, cred.password, { service })
  );

  await Promise.all(promises);
}

// Usage
await storeMultipleCredentials({
  [SERVICES.AUTH]: { username: 'user', password: 'authToken' },
  [SERVICES.API_KEY]: { username: 'api', password: 'apiKeyValue' },
  [SERVICES.REFRESH_TOKEN]: { username: 'refresh', password: 'refreshToken' },
});
```

### Storing Complex Data

For complex data structures, serialize to JSON:

```typescript
interface SecureUserData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  permissions: string[];
}

export async function storeSecureUserData(
  data: SecureUserData
): Promise<StorageResult> {
  try {
    const serialized = JSON.stringify(data);
    await Keychain.setGenericPassword(data.userId, serialized, {
      service: 'com.yourapp.userdata',
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Retrieving Stored Data

Retrieving data is straightforward, but proper error handling is essential.

### Basic Retrieval

```typescript
export async function getCredentials(): Promise<Keychain.UserCredentials | null> {
  try {
    const credentials = await Keychain.getGenericPassword();

    if (credentials) {
      return credentials;
    }

    return null;
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return null;
  }
}

// Usage
const credentials = await getCredentials();
if (credentials) {
  console.log('Username:', credentials.username);
  console.log('Password:', credentials.password);
}
```

### Retrieving from Specific Services

```typescript
export async function getAuthToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.authtoken',
    });

    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.refresh',
    });

    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Failed to retrieve refresh token:', error);
    return null;
  }
}
```

### Retrieving Complex Data

```typescript
export async function getSecureUserData(): Promise<SecureUserData | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.userdata',
    });

    if (credentials) {
      return JSON.parse(credentials.password) as SecureUserData;
    }

    return null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
}
```

### Deleting Stored Data

```typescript
export async function clearCredentials(service?: string): Promise<boolean> {
  try {
    const result = await Keychain.resetGenericPassword(
      service ? { service } : undefined
    );
    return result;
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    return false;
  }
}

export async function clearAllSecureData(): Promise<void> {
  const services = [
    'com.yourapp.auth',
    'com.yourapp.apikey',
    'com.yourapp.encryption',
    'com.yourapp.refresh',
    'com.yourapp.userdata',
  ];

  await Promise.all(
    services.map(service => Keychain.resetGenericPassword({ service }))
  );
}
```

## Biometric-Protected Access

One of the most powerful features of `react-native-keychain` is biometric authentication support.

### Checking Biometric Availability

```typescript
export async function checkBiometricSupport(): Promise<{
  available: boolean;
  biometryType: Keychain.BIOMETRY_TYPE | null;
}> {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();

    return {
      available: biometryType !== null,
      biometryType,
    };
  } catch (error) {
    console.error('Failed to check biometric support:', error);
    return { available: false, biometryType: null };
  }
}

// Usage
const { available, biometryType } = await checkBiometricSupport();

if (available) {
  switch (biometryType) {
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      console.log('Face ID is available');
      break;
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      console.log('Touch ID is available');
      break;
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      console.log('Fingerprint authentication is available');
      break;
    case Keychain.BIOMETRY_TYPE.FACE:
      console.log('Face authentication is available');
      break;
    case Keychain.BIOMETRY_TYPE.IRIS:
      console.log('Iris authentication is available');
      break;
  }
}
```

### Storing with Biometric Protection

```typescript
export async function storeBiometricProtectedCredentials(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password, {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      service: 'com.yourapp.biometric',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Retrieving with Biometric Authentication

```typescript
interface BiometricOptions {
  promptMessage?: string;
  cancelButtonText?: string;
}

export async function getBiometricProtectedCredentials(
  options: BiometricOptions = {}
): Promise<Keychain.UserCredentials | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.biometric',
      authenticationPrompt: {
        title: options.promptMessage || 'Authenticate to access your credentials',
        cancel: options.cancelButtonText || 'Cancel',
      },
    });

    return credentials || null;
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific biometric errors
      if (error.message.includes('User canceled')) {
        console.log('User canceled biometric authentication');
      } else if (error.message.includes('Biometry not available')) {
        console.log('Biometric authentication not available');
      } else {
        console.error('Biometric authentication failed:', error.message);
      }
    }
    return null;
  }
}
```

### Biometric with Passcode Fallback

```typescript
export async function storeBiometricWithFallback(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password, {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      service: 'com.yourapp.secure',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Access Control Options

Understanding access control options is crucial for implementing the right security level.

### iOS Accessibility Options

```typescript
// When the device is unlocked
const whenUnlocked = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
};

// After first unlock (available until device restart)
const afterFirstUnlock = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
};

// Only on this device, when unlocked
const thisDeviceOnly = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Only when passcode is set
const requiresPasscode = {
  accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};
```

### Access Control Configurations

```typescript
// Require user presence (biometric or passcode)
const userPresence = {
  accessControl: Keychain.ACCESS_CONTROL.USER_PRESENCE,
};

// Require any enrolled biometric
const anyBiometric = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
};

// Require current biometric set (invalidates if biometrics change)
const currentBiometric = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
};

// Require device passcode
const devicePasscode = {
  accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
};

// Biometric or passcode fallback
const biometricOrPasscode = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
};
```

### Comprehensive Configuration Example

```typescript
export async function storeHighSecurityCredentials(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password, {
      // Require current biometric set - invalidates if user adds new biometrics
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      // Only accessible when device is unlocked
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      // Use biometric authentication
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      // Service identifier
      service: 'com.yourapp.highsecurity',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## iOS Keychain Specifics

iOS provides several unique features and considerations for Keychain usage.

### Keychain Sharing Between Apps

To share Keychain items between apps from the same developer:

```typescript
// Configure in your Xcode project:
// 1. Enable Keychain Sharing capability
// 2. Add a Keychain Group (e.g., com.yourcompany.shared)

export async function storeSharedCredentials(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password, {
      service: 'com.yourcompany.shared',
      accessGroup: 'TEAM_ID.com.yourcompany.shared',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Internet Credentials (Server Passwords)

```typescript
export async function storeServerCredentials(
  server: string,
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    await Keychain.setInternetCredentials(server, username, password);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getServerCredentials(
  server: string
): Promise<Keychain.UserCredentials | null> {
  try {
    const credentials = await Keychain.getInternetCredentials(server);
    return credentials || null;
  } catch (error) {
    console.error('Failed to retrieve server credentials:', error);
    return null;
  }
}

// Usage
await storeServerCredentials('api.yourapp.com', 'user@example.com', 'password');
const creds = await getServerCredentials('api.yourapp.com');
```

### iCloud Keychain Synchronization

By default, items with certain accessibility settings can sync to iCloud. To prevent this:

```typescript
export async function storeLocalOnlyCredentials(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    // _THIS_DEVICE_ONLY variants prevent iCloud sync
    await Keychain.setGenericPassword(username, password, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      service: 'com.yourapp.localonly',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Android Keystore Specifics

Android has its own set of features and considerations.

### Security Levels

```typescript
export async function getSecurityLevel(): Promise<Keychain.SECURITY_LEVEL | null> {
  try {
    const level = await Keychain.getSecurityLevel();
    return level;
  } catch (error) {
    console.error('Failed to get security level:', error);
    return null;
  }
}

// Usage
const securityLevel = await getSecurityLevel();

switch (securityLevel) {
  case Keychain.SECURITY_LEVEL.SECURE_HARDWARE:
    console.log('Hardware-backed security available (TEE/StrongBox)');
    break;
  case Keychain.SECURITY_LEVEL.SECURE_SOFTWARE:
    console.log('Software-only security');
    break;
  case Keychain.SECURITY_LEVEL.ANY:
    console.log('Basic security level');
    break;
}
```

### Storage Type Selection

```typescript
export async function storeWithSpecificStorage(
  username: string,
  password: string,
  storageType: Keychain.STORAGE_TYPE
): Promise<StorageResult> {
  try {
    await Keychain.setGenericPassword(username, password, {
      storage: storageType,
      service: 'com.yourapp.specificstorage',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Usage - prefer AES for Android
await storeWithSpecificStorage(
  'user',
  'password',
  Keychain.STORAGE_TYPE.AES
);
```

### Requiring Hardware-Backed Security

```typescript
export async function storeWithHardwareSecurity(
  username: string,
  password: string
): Promise<StorageResult> {
  try {
    const securityLevel = await Keychain.getSecurityLevel();

    if (securityLevel !== Keychain.SECURITY_LEVEL.SECURE_HARDWARE) {
      return {
        success: false,
        error: 'Hardware-backed security not available'
      };
    }

    await Keychain.setGenericPassword(username, password, {
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.AES,
      service: 'com.yourapp.hardware',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Handling Storage Errors

Proper error handling is essential for a robust implementation.

### Error Types and Handling

```typescript
enum KeychainErrorType {
  USER_CANCELED = 'USER_CANCELED',
  BIOMETRY_NOT_AVAILABLE = 'BIOMETRY_NOT_AVAILABLE',
  BIOMETRY_NOT_ENROLLED = 'BIOMETRY_NOT_ENROLLED',
  BIOMETRY_LOCKOUT = 'BIOMETRY_LOCKOUT',
  PASSCODE_NOT_SET = 'PASSCODE_NOT_SET',
  STORAGE_FAILURE = 'STORAGE_FAILURE',
  RETRIEVAL_FAILURE = 'RETRIEVAL_FAILURE',
  UNKNOWN = 'UNKNOWN',
}

interface KeychainError {
  type: KeychainErrorType;
  message: string;
  recoverable: boolean;
}

export function parseKeychainError(error: Error): KeychainError {
  const message = error.message.toLowerCase();

  if (message.includes('user cancel') || message.includes('cancelled')) {
    return {
      type: KeychainErrorType.USER_CANCELED,
      message: 'Authentication was canceled by the user',
      recoverable: true,
    };
  }

  if (message.includes('biometry not available') ||
      message.includes('biometric not available')) {
    return {
      type: KeychainErrorType.BIOMETRY_NOT_AVAILABLE,
      message: 'Biometric authentication is not available on this device',
      recoverable: false,
    };
  }

  if (message.includes('not enrolled') || message.includes('no biometrics')) {
    return {
      type: KeychainErrorType.BIOMETRY_NOT_ENROLLED,
      message: 'No biometrics are enrolled on this device',
      recoverable: true,
    };
  }

  if (message.includes('lockout') || message.includes('locked out')) {
    return {
      type: KeychainErrorType.BIOMETRY_LOCKOUT,
      message: 'Biometric authentication is locked due to too many attempts',
      recoverable: true,
    };
  }

  if (message.includes('passcode not set') || message.includes('no passcode')) {
    return {
      type: KeychainErrorType.PASSCODE_NOT_SET,
      message: 'Device passcode is not set',
      recoverable: true,
    };
  }

  return {
    type: KeychainErrorType.UNKNOWN,
    message: error.message,
    recoverable: false,
  };
}
```

### Comprehensive Error Handling Example

```typescript
export async function secureStoreWithErrorHandling(
  username: string,
  password: string
): Promise<{ success: boolean; error?: KeychainError }> {
  try {
    // Check biometric availability first
    const biometryType = await Keychain.getSupportedBiometryType();

    const options: Keychain.Options = {
      service: 'com.yourapp.secure',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    if (biometryType) {
      options.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;
      options.authenticationType = Keychain.AUTHENTICATION_TYPE.BIOMETRICS;
    }

    await Keychain.setGenericPassword(username, password, options);
    return { success: true };

  } catch (error) {
    if (error instanceof Error) {
      const parsedError = parseKeychainError(error);

      // Handle specific errors
      switch (parsedError.type) {
        case KeychainErrorType.BIOMETRY_NOT_ENROLLED:
          // Fallback to non-biometric storage
          try {
            await Keychain.setGenericPassword(username, password, {
              service: 'com.yourapp.secure',
              accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
            return { success: true };
          } catch (fallbackError) {
            return {
              success: false,
              error: parseKeychainError(fallbackError as Error)
            };
          }

        default:
          return { success: false, error: parsedError };
      }
    }

    return {
      success: false,
      error: {
        type: KeychainErrorType.UNKNOWN,
        message: 'An unknown error occurred',
        recoverable: false,
      }
    };
  }
}
```

## Security Best Practices

Follow these best practices to maximize the security of your stored data.

### 1. Use Appropriate Access Controls

```typescript
// For highly sensitive data (financial, health)
const highSecurityOptions: Keychain.Options = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
};

// For session tokens (needs to work in background)
const sessionOptions: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// For data that should persist across device transfers
const persistentOptions: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
};
```

### 2. Implement Secure Key Derivation

```typescript
import { createHash } from 'crypto';

export function deriveServiceKey(
  appId: string,
  userId: string,
  purpose: string
): string {
  const combined = `${appId}:${userId}:${purpose}`;
  return createHash('sha256').update(combined).digest('hex');
}

// Usage
const serviceKey = deriveServiceKey(
  'com.yourapp',
  'user123',
  'authtoken'
);

await Keychain.setGenericPassword(username, password, {
  service: serviceKey,
});
```

### 3. Implement Data Expiration

```typescript
interface StoredCredentialWithExpiry {
  data: string;
  expiresAt: number;
  createdAt: number;
}

export async function storeWithExpiry(
  key: string,
  data: string,
  expiryMs: number
): Promise<StorageResult> {
  try {
    const payload: StoredCredentialWithExpiry = {
      data,
      expiresAt: Date.now() + expiryMs,
      createdAt: Date.now(),
    };

    await Keychain.setGenericPassword(key, JSON.stringify(payload), {
      service: 'com.yourapp.expiring',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getWithExpiryCheck(
  key: string
): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.expiring',
    });

    if (!credentials) return null;

    const payload: StoredCredentialWithExpiry = JSON.parse(credentials.password);

    if (Date.now() > payload.expiresAt) {
      // Data expired, clear it
      await Keychain.resetGenericPassword({ service: 'com.yourapp.expiring' });
      return null;
    }

    return payload.data;
  } catch (error) {
    console.error('Failed to retrieve with expiry check:', error);
    return null;
  }
}
```

### 4. Clear Sensitive Data on Logout

```typescript
export async function secureLogout(): Promise<void> {
  const services = [
    'com.yourapp.auth',
    'com.yourapp.refresh',
    'com.yourapp.userdata',
    'com.yourapp.secure',
    'com.yourapp.biometric',
  ];

  try {
    await Promise.all(
      services.map(service =>
        Keychain.resetGenericPassword({ service }).catch(() => {
          // Ignore errors for non-existent services
        })
      )
    );
  } catch (error) {
    console.error('Error during secure logout:', error);
  }
}
```

### 5. Validate Data Integrity

```typescript
import { createHmac } from 'crypto';

interface IntegrityProtectedData {
  data: string;
  signature: string;
}

const INTEGRITY_KEY = 'your-secret-integrity-key'; // Store securely!

export function signData(data: string): string {
  return createHmac('sha256', INTEGRITY_KEY).update(data).digest('hex');
}

export function verifyData(data: string, signature: string): boolean {
  const expectedSignature = signData(data);
  return signature === expectedSignature;
}

export async function storeWithIntegrity(
  key: string,
  data: string
): Promise<StorageResult> {
  try {
    const payload: IntegrityProtectedData = {
      data,
      signature: signData(data),
    };

    await Keychain.setGenericPassword(key, JSON.stringify(payload), {
      service: 'com.yourapp.integrity',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getWithIntegrityCheck(
  key: string
): Promise<{ data: string; valid: boolean } | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.integrity',
    });

    if (!credentials) return null;

    const payload: IntegrityProtectedData = JSON.parse(credentials.password);
    const valid = verifyData(payload.data, payload.signature);

    return { data: payload.data, valid };
  } catch (error) {
    console.error('Failed to retrieve with integrity check:', error);
    return null;
  }
}
```

## Common Vulnerabilities to Avoid

Understanding and avoiding common security pitfalls is crucial.

### 1. Logging Sensitive Data

```typescript
// BAD: Never log sensitive data
async function badExample() {
  const credentials = await Keychain.getGenericPassword();
  console.log('Retrieved credentials:', credentials); // NEVER DO THIS!
}

// GOOD: Log only non-sensitive information
async function goodExample() {
  const credentials = await Keychain.getGenericPassword();
  if (credentials) {
    console.log('Successfully retrieved credentials for user:', credentials.username);
    // Never log the password/token itself
  }
}
```

### 2. Storing Sensitive Data in State

```typescript
// BAD: Storing password in component state
const [password, setPassword] = useState('');

// After authentication, password stays in memory
const handleLogin = async () => {
  await authenticate(password);
  // Password is still in state!
};

// GOOD: Clear sensitive data immediately
const handleLoginSecure = async () => {
  const tempPassword = password;
  setPassword(''); // Clear immediately

  try {
    await authenticate(tempPassword);
  } finally {
    // Ensure password reference is cleared
  }
};
```

### 3. Hardcoding Secrets

```typescript
// BAD: Hardcoded encryption keys
const ENCRYPTION_KEY = 'my-super-secret-key-12345';

// GOOD: Generate keys securely and store in Keychain
async function getOrCreateEncryptionKey(): Promise<string> {
  let credentials = await Keychain.getGenericPassword({
    service: 'com.yourapp.encryptionkey',
  });

  if (!credentials) {
    // Generate a random key
    const randomKey = generateSecureRandomKey();
    await Keychain.setGenericPassword('encryption', randomKey, {
      service: 'com.yourapp.encryptionkey',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return randomKey;
  }

  return credentials.password;
}
```

### 4. Ignoring Error Conditions

```typescript
// BAD: Ignoring errors
async function badErrorHandling() {
  try {
    await Keychain.setGenericPassword('user', 'token');
  } catch (e) {
    // Silent failure - user thinks data is saved!
  }
}

// GOOD: Proper error handling and user feedback
async function goodErrorHandling(): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('user', 'token');
    return true;
  } catch (error) {
    // Log for debugging (without sensitive data)
    console.error('Secure storage failed:', error);

    // Inform user
    showAlert('Unable to save credentials securely. Please try again.');

    // Report to error tracking (without sensitive data)
    reportError('KEYCHAIN_SAVE_FAILED', {
      errorType: error instanceof Error ? error.name : 'unknown'
    });

    return false;
  }
}
```

### 5. Using Weak Access Controls

```typescript
// BAD: Using ALWAYS accessible (deprecated and insecure)
await Keychain.setGenericPassword('user', 'token', {
  accessible: Keychain.ACCESSIBLE.ALWAYS, // DON'T USE
});

// GOOD: Use appropriate access control
await Keychain.setGenericPassword('user', 'token', {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
});
```

### 6. Not Clearing Data on Device Compromise

```typescript
// Implement a "panic" clear function
export async function emergencyClearAllData(): Promise<void> {
  const allServices = await getAllKnownServices();

  await Promise.all([
    ...allServices.map(service =>
      Keychain.resetGenericPassword({ service }).catch(() => {})
    ),
    clearAsyncStorage(),
    clearInMemoryState(),
  ]);
}

// Call this when:
// - User reports device stolen
// - Too many failed authentication attempts
// - Jailbreak/root detection triggers
```

## Complete Secure Storage Manager

Here is a complete implementation that incorporates all best practices:

```typescript
import * as Keychain from 'react-native-keychain';

interface SecureStorageConfig {
  appId: string;
  requireBiometrics: boolean;
  allowPasscodeFallback: boolean;
}

interface StorageResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

class SecureStorageManager {
  private config: SecureStorageConfig;
  private biometryAvailable: boolean | null = null;

  constructor(config: SecureStorageConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const biometryType = await Keychain.getSupportedBiometryType();
    this.biometryAvailable = biometryType !== null;
  }

  private getServiceKey(purpose: string): string {
    return `${this.config.appId}.${purpose}`;
  }

  private getOptions(requireAuth: boolean): Keychain.Options {
    const options: Keychain.Options = {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    if (requireAuth && this.biometryAvailable && this.config.requireBiometrics) {
      options.accessControl = this.config.allowPasscodeFallback
        ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
        : Keychain.ACCESS_CONTROL.BIOMETRY_ANY;
      options.authenticationType = Keychain.AUTHENTICATION_TYPE.BIOMETRICS;
    }

    return options;
  }

  async store(
    key: string,
    value: string,
    requireAuth: boolean = false
  ): Promise<StorageResult> {
    try {
      await Keychain.setGenericPassword(key, value, {
        ...this.getOptions(requireAuth),
        service: this.getServiceKey(key),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage failed',
      };
    }
  }

  async retrieve(
    key: string,
    promptMessage?: string
  ): Promise<StorageResult<string>> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.getServiceKey(key),
        authenticationPrompt: promptMessage
          ? { title: promptMessage }
          : undefined,
      });

      if (credentials) {
        return { success: true, data: credentials.password };
      }
      return { success: false, error: 'No data found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed',
      };
    }
  }

  async delete(key: string): Promise<StorageResult> {
    try {
      await Keychain.resetGenericPassword({
        service: this.getServiceKey(key),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
      };
    }
  }

  async clearAll(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }
}

// Usage
const secureStorage = new SecureStorageManager({
  appId: 'com.yourapp',
  requireBiometrics: true,
  allowPasscodeFallback: true,
});

await secureStorage.initialize();

// Store authentication token
await secureStorage.store('authToken', 'jwt-token-here');

// Store sensitive data with biometric protection
await secureStorage.store('paymentInfo', 'encrypted-card-data', true);

// Retrieve with biometric prompt
const result = await secureStorage.retrieve(
  'paymentInfo',
  'Authenticate to access payment information'
);
```

## Conclusion

Securing sensitive data in React Native applications is not optional but a fundamental requirement. The `react-native-keychain` library provides a robust, cross-platform solution that leverages the native secure storage capabilities of both iOS and Android.

Key takeaways:

1. **Never use AsyncStorage for sensitive data** - It provides no encryption or access control.

2. **Choose appropriate access controls** - Match the sensitivity of your data with the right accessibility and access control settings.

3. **Implement biometric protection** - For the most sensitive data, require biometric authentication with passcode fallback.

4. **Handle errors gracefully** - Always implement comprehensive error handling and provide appropriate fallbacks.

5. **Follow security best practices** - Clear data on logout, implement expiration, validate integrity, and never log sensitive information.

6. **Stay platform-aware** - Understand the differences between iOS Keychain and Android Keystore to optimize your implementation.

By following the patterns and practices outlined in this guide, you can build React Native applications that properly protect your users' most sensitive data, maintaining their trust and meeting regulatory requirements.

Remember that security is not a one-time implementation but an ongoing process. Regularly audit your secure storage implementation, keep your dependencies updated, and stay informed about new vulnerabilities and best practices in mobile security.
