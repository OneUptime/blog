# How to Implement Code Push for Over-the-Air Updates in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, CodePush, OTA Updates, App Center, Mobile Development, Deployment

Description: Learn how to implement over-the-air updates in React Native using CodePush for instant bug fixes without app store reviews.

---

## Introduction

One of the most significant advantages of React Native development is the ability to push updates directly to users' devices without going through the traditional app store review process. This capability, known as Over-the-Air (OTA) updates, is made possible by Microsoft's CodePush service, which is part of the App Center platform.

In this comprehensive guide, we will explore everything you need to know about implementing CodePush in your React Native applications, from initial setup to advanced deployment strategies.

## What is CodePush?

CodePush is a cloud service that enables React Native developers to deploy mobile app updates directly to users' devices. Unlike traditional app updates that require downloading a new version from the App Store or Google Play Store, CodePush allows you to push JavaScript bundle and asset updates instantly.

### How CodePush Works

When you build a React Native application, the JavaScript code is bundled into a single file (or set of files) that runs on top of the native shell. CodePush takes advantage of this architecture by allowing you to update the JavaScript bundle without modifying the native code.

Here is a simplified overview of the CodePush workflow:

1. **Initial Release**: You publish your app to the app stores with the CodePush SDK integrated
2. **Update Creation**: You make changes to your JavaScript code and create a new bundle
3. **Deployment**: You push the new bundle to the CodePush server
4. **Distribution**: The app checks for updates and downloads the new bundle
5. **Installation**: The app installs the update and restarts (or applies it on next launch)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer     │────▶│   App Center    │────▶│   User Device   │
│   Pushes Update │     │   CodePush      │     │   Downloads     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### What Can Be Updated with CodePush?

CodePush can update:

- JavaScript code (business logic, UI components)
- Images and assets bundled with JavaScript
- JSON configuration files

CodePush cannot update:

- Native code (Java, Kotlin, Objective-C, Swift)
- Native modules
- App permissions
- App icons and splash screens (native assets)

## When to Use OTA Updates

OTA updates are incredibly powerful, but they are not suitable for every scenario. Here are the ideal use cases:

### Good Use Cases for CodePush

1. **Bug Fixes**: Quickly patch critical bugs without waiting for app store approval
2. **UI Tweaks**: Adjust layouts, colors, and styling
3. **Content Updates**: Update text, labels, and localization strings
4. **Feature Flags**: Enable or disable features for specific user segments
5. **A/B Testing**: Deploy different versions to test user engagement
6. **Hotfixes**: Emergency patches for production issues

### When NOT to Use CodePush

1. **Native Code Changes**: Any modifications to native modules require a store update
2. **New Native Dependencies**: Adding libraries with native linking
3. **Permission Changes**: Requesting new device permissions
4. **Major Version Updates**: Significant changes that might break user experience
5. **App Store Policy Violations**: Updates that circumvent review guidelines

## Setting Up App Center

Before integrating CodePush into your React Native app, you need to set up an App Center account and create your application.

### Step 1: Create an App Center Account

Visit [https://appcenter.ms](https://appcenter.ms) and sign up for a free account. You can use your GitHub, Microsoft, Facebook, or Google account.

### Step 2: Create a New App

1. Click "Add new app" in the App Center dashboard
2. Enter your app name
3. Select the appropriate OS (iOS or Android)
4. Choose "React Native" as the platform
5. Click "Add new app"

You will need to create separate apps for iOS and Android.

### Step 3: Get Your Deployment Keys

After creating your apps, navigate to the "Distribute" section and select "CodePush". App Center automatically creates two deployment environments:

- **Staging**: For testing updates before production
- **Production**: For releasing updates to end users

To retrieve your deployment keys, use the App Center CLI:

```bash
# Install the App Center CLI
npm install -g appcenter-cli

# Login to App Center
appcenter login

# List your apps
appcenter apps list

# Get deployment keys for iOS
appcenter codepush deployment list -a <owner>/<app-name-ios> --displayKeys

# Get deployment keys for Android
appcenter codepush deployment list -a <owner>/<app-name-android> --displayKeys
```

Save these keys securely as you will need them during SDK integration.

## CodePush SDK Integration

Now let us integrate the CodePush SDK into your React Native application.

### Step 1: Install the Package

```bash
# Using npm
npm install react-native-code-push

# Using yarn
yarn add react-native-code-push
```

### Step 2: iOS Configuration

For iOS, you need to configure the deployment key and modify your AppDelegate.

#### Using CocoaPods

Add the following to your `Podfile`:

```ruby
pod 'CodePush', :path => '../node_modules/react-native-code-push'
```

Then run:

```bash
cd ios && pod install
```

#### Configure AppDelegate

Open `ios/<YourApp>/AppDelegate.mm` and make the following changes:

```objective-c
#import <CodePush/CodePush.h>

// In the application:didFinishLaunchingWithOptions: method
// Replace the existing bundle URL code with:

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [CodePush bundleURL];
#endif
}
```

#### Add Deployment Key to Info.plist

Add the following to your `Info.plist`:

```xml
<key>CodePushDeploymentKey</key>
<string>YOUR_IOS_DEPLOYMENT_KEY</string>
```

### Step 3: Android Configuration

For Android, you need to modify several files.

#### Update settings.gradle

Add the following to `android/settings.gradle`:

```gradle
include ':app', ':react-native-code-push'
project(':react-native-code-push').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-code-push/android/app')
```

#### Update build.gradle

In `android/app/build.gradle`, add:

```gradle
apply from: "../../node_modules/react-native-code-push/android/codepush.gradle"

android {
    // ... existing config

    buildTypes {
        release {
            // ... existing config
            resValue "string", "CodePushDeploymentKey", '"YOUR_ANDROID_DEPLOYMENT_KEY"'
        }

        releaseStaging {
            initWith release
            resValue "string", "CodePushDeploymentKey", '"YOUR_STAGING_DEPLOYMENT_KEY"'
            matchingFallbacks = ['release']
        }
    }
}
```

#### Update MainApplication.java

```java
import com.microsoft.codepush.react.CodePush;

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost =
        new ReactNativeHost(this) {

            @Override
            protected String getJSBundleFile() {
                return CodePush.getJSBundleFile();
            }

            // ... rest of the configuration
        };
}
```

### Step 4: Wrap Your Root Component

Finally, wrap your root component with the CodePush higher-order component:

```typescript
import codePush from 'react-native-code-push';

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

// Basic configuration
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
};

export default codePush(codePushOptions)(App);
```

## Update Strategies

CodePush provides several strategies for checking and installing updates. Understanding these options is crucial for providing a good user experience.

### Check Frequency Options

```typescript
import codePush from 'react-native-code-push';

// Check on every app start
codePush.CheckFrequency.ON_APP_START

// Check when app returns from background
codePush.CheckFrequency.ON_APP_RESUME

// Manual checking only
codePush.CheckFrequency.MANUAL
```

### Install Modes

```typescript
// Install and restart immediately
codePush.InstallMode.IMMEDIATE

// Install but wait for next app restart
codePush.InstallMode.ON_NEXT_RESTART

// Install but wait for next time app resumes from background
codePush.InstallMode.ON_NEXT_RESUME

// Install but wait for next time app is suspended in background
codePush.InstallMode.ON_NEXT_SUSPEND
```

### Recommended Configurations

#### Silent Updates (Background)

This approach updates silently without interrupting the user:

```typescript
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
};

export default codePush(codePushOptions)(App);
```

#### Active Updates (User Notification)

This approach notifies users about updates:

```typescript
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
  installMode: codePush.InstallMode.IMMEDIATE,
  updateDialog: {
    title: 'Update Available',
    optionalUpdateMessage: 'An update is available. Would you like to install it?',
    optionalIgnoreButtonLabel: 'Later',
    optionalInstallButtonLabel: 'Install',
  },
};

export default codePush(codePushOptions)(App);
```

## Mandatory vs Optional Updates

CodePush allows you to designate updates as mandatory or optional, giving you control over how critical updates are handled.

### Mandatory Updates

Mandatory updates force users to install the update before continuing to use the app. Use this for critical bug fixes or security patches.

```bash
# Release a mandatory update
appcenter codepush release-react -a <owner>/<app-name> -m

# Or with explicit flag
appcenter codepush release-react -a <owner>/<app-name> --mandatory
```

In your app, handle mandatory updates:

```typescript
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
  mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
  updateDialog: {
    mandatoryUpdateMessage: 'A critical update is required to continue using this app.',
    mandatoryContinueButtonLabel: 'Update Now',
  },
};
```

### Optional Updates

Optional updates allow users to defer the update:

```bash
# Release an optional update (default behavior)
appcenter codepush release-react -a <owner>/<app-name>
```

Configure optional update behavior:

```typescript
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
  updateDialog: {
    optionalUpdateMessage: 'A new version is available. Would you like to update?',
    optionalInstallButtonLabel: 'Update',
    optionalIgnoreButtonLabel: 'Not Now',
  },
};
```

## Rollback Capabilities

One of the most valuable features of CodePush is the ability to rollback problematic updates. This provides a safety net for production deployments.

### Automatic Rollback

CodePush automatically tracks update installation and will rollback if:

1. The app crashes shortly after installing an update
2. The update fails to install properly
3. The JavaScript bundle fails to load

### Manual Rollback

You can manually rollback to a previous version using the CLI:

```bash
# Rollback to the previous release
appcenter codepush rollback -a <owner>/<app-name> <deployment-name>

# Rollback to a specific release
appcenter codepush rollback -a <owner>/<app-name> <deployment-name> --target-release v5
```

### Programmatic Rollback

You can also trigger a rollback programmatically:

```typescript
import codePush from 'react-native-code-push';

// Check if the current update is the first run after an install
codePush.getUpdateMetadata(codePush.UpdateState.RUNNING).then((update) => {
  if (update && update.isFirstRun) {
    // This is the first run after a CodePush update
    // You can implement custom validation logic here

    // If something is wrong, trigger a rollback
    if (somethingIsWrong) {
      codePush.restartApp(true); // true triggers rollback
    }
  }
});
```

### Implementing Safe Updates with Health Checks

Here is a pattern for implementing safe updates with automatic rollback:

```typescript
import React, { useEffect, useState } from 'react';
import codePush from 'react-native-code-push';

const App: React.FC = () => {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const validateUpdate = async () => {
      try {
        const update = await codePush.getUpdateMetadata(
          codePush.UpdateState.RUNNING
        );

        if (update && update.isFirstRun) {
          // Perform health checks
          const healthCheckPassed = await performHealthChecks();

          if (!healthCheckPassed) {
            console.log('Health check failed, rolling back...');
            setIsHealthy(false);

            // Notify CodePush that this update should be rolled back
            codePush.notifyAppReady(); // Mark as successful first
            codePush.restartApp(true); // Then rollback
          } else {
            // Update is healthy, mark it as successful
            codePush.notifyAppReady();
          }
        }
      } catch (error) {
        console.error('Error validating update:', error);
      }
    };

    validateUpdate();
  }, []);

  // ... rest of your app
};

const performHealthChecks = async (): Promise<boolean> => {
  try {
    // Check API connectivity
    const apiResponse = await fetch('https://api.yourapp.com/health');
    if (!apiResponse.ok) return false;

    // Check critical features
    // Add your own validation logic here

    return true;
  } catch (error) {
    return false;
  }
};
```

## Deployment Environments

Managing multiple deployment environments is essential for a robust release process.

### Default Environments

App Center creates two environments by default:

- **Staging**: For internal testing and QA
- **Production**: For end users

### Creating Custom Environments

You can create additional environments for more granular control:

```bash
# Create a new deployment
appcenter codepush deployment add -a <owner>/<app-name> Beta

# List all deployments
appcenter codepush deployment list -a <owner>/<app-name>
```

### Promoting Releases Between Environments

After testing in Staging, promote releases to Production:

```bash
# Promote from Staging to Production
appcenter codepush promote -a <owner>/<app-name> -s Staging -d Production

# Promote with modifications
appcenter codepush promote -a <owner>/<app-name> \
  -s Staging \
  -d Production \
  --mandatory \
  --description "Promoted from staging"
```

### Environment-Specific Configuration

Configure your app to use different deployment keys based on the build variant:

```typescript
// config/codepush.ts
import { Platform } from 'react-native';
import Config from 'react-native-config';

interface DeploymentKeys {
  ios: {
    staging: string;
    production: string;
  };
  android: {
    staging: string;
    production: string;
  };
}

const deploymentKeys: DeploymentKeys = {
  ios: {
    staging: Config.CODEPUSH_IOS_STAGING_KEY || '',
    production: Config.CODEPUSH_IOS_PRODUCTION_KEY || '',
  },
  android: {
    staging: Config.CODEPUSH_ANDROID_STAGING_KEY || '',
    production: Config.CODEPUSH_ANDROID_PRODUCTION_KEY || '',
  },
};

export const getDeploymentKey = (environment: 'staging' | 'production'): string => {
  const platform = Platform.OS as 'ios' | 'android';
  return deploymentKeys[platform][environment];
};
```

## Version Targeting

CodePush allows you to target specific app versions with your updates, ensuring compatibility.

### Understanding Version Targeting

When you release an update, you can specify which binary versions should receive it:

```bash
# Target a specific version
appcenter codepush release-react -a <owner>/<app-name> -t "1.0.0"

# Target a range of versions
appcenter codepush release-react -a <owner>/<app-name> -t "1.0.0 - 1.2.0"

# Target all versions greater than or equal to 1.0.0
appcenter codepush release-react -a <owner>/<app-name> -t ">=1.0.0"

# Target all 1.x versions
appcenter codepush release-react -a <owner>/<app-name> -t "1.x"
```

### Version Targeting Best Practices

1. **Always specify a target version**: This prevents updates from being delivered to incompatible app versions

2. **Use semantic versioning**: Follow semver conventions for predictable targeting

3. **Test across versions**: Ensure your update works on all targeted versions

4. **Document version requirements**: Keep track of which features require specific app versions

### Handling Version Mismatches

```typescript
import codePush from 'react-native-code-push';
import { getVersion } from 'react-native-device-info';

const checkVersionCompatibility = async () => {
  const currentVersion = getVersion();
  const update = await codePush.checkForUpdate();

  if (update) {
    // The update is already filtered by App Center based on target version
    // But you can add additional client-side checks if needed
    console.log(`Update available for version ${currentVersion}`);
    console.log(`Update label: ${update.label}`);
    console.log(`Update description: ${update.description}`);
  }
};
```

## Update Dialogs UX

Providing a good user experience during updates is crucial. Here is how to customize the update dialog.

### Default Dialog Options

```typescript
const codePushOptions = {
  updateDialog: {
    // For optional updates
    optionalUpdateMessage: 'An update is available.',
    optionalInstallButtonLabel: 'Install',
    optionalIgnoreButtonLabel: 'Later',

    // For mandatory updates
    mandatoryUpdateMessage: 'A required update is available.',
    mandatoryContinueButtonLabel: 'Continue',

    // Common options
    title: 'Update Available',
    appendReleaseDescription: true,
    descriptionPrefix: '\n\nChanges:\n',
  },
};
```

### Custom Update Dialog Component

For more control, create a custom update dialog:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import codePush, { RemotePackage, DownloadProgress } from 'react-native-code-push';

interface UpdateDialogProps {
  visible: boolean;
  update: RemotePackage | null;
  onInstall: () => void;
  onDismiss: () => void;
  progress: DownloadProgress | null;
  isDownloading: boolean;
}

const CustomUpdateDialog: React.FC<UpdateDialogProps> = ({
  visible,
  update,
  onInstall,
  onDismiss,
  progress,
  isDownloading,
}) => {
  const downloadProgress = progress
    ? Math.round((progress.receivedBytes / progress.totalBytes) * 100)
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Update Available</Text>

          {update?.description && (
            <Text style={styles.description}>{update.description}</Text>
          )}

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.progressText}>
                Downloading... {downloadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${downloadProgress}%` }]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              {!update?.isMandatory && (
                <TouchableOpacity
                  style={[styles.button, styles.laterButton]}
                  onPress={onDismiss}
                >
                  <Text style={styles.laterButtonText}>Later</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.installButton]}
                onPress={onInstall}
              >
                <Text style={styles.installButtonText}>
                  {update?.isMandatory ? 'Update Now' : 'Install'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  progressText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  laterButton: {
    backgroundColor: '#F0F0F0',
  },
  laterButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  installButton: {
    backgroundColor: '#007AFF',
  },
  installButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

// Usage in your App component
const App: React.FC = () => {
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<RemotePackage | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await codePush.checkForUpdate();
      if (update) {
        setAvailableUpdate(update);
        setUpdateDialogVisible(true);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleInstall = async () => {
    if (!availableUpdate) return;

    setIsDownloading(true);

    try {
      await availableUpdate.download((progress) => {
        setDownloadProgress(progress);
      }).then((localPackage) => {
        localPackage.install(codePush.InstallMode.IMMEDIATE);
      });
    } catch (error) {
      console.error('Error installing update:', error);
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    if (!availableUpdate?.isMandatory) {
      setUpdateDialogVisible(false);
    }
  };

  return (
    <>
      <YourAppContent />
      <CustomUpdateDialog
        visible={updateDialogVisible}
        update={availableUpdate}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
        progress={downloadProgress}
        isDownloading={isDownloading}
      />
    </>
  );
};

export default codePush({ checkFrequency: codePush.CheckFrequency.MANUAL })(App);
```

## Testing OTA Updates

Thoroughly testing OTA updates is critical before releasing to production.

### Local Testing

#### Using the Staging Environment

1. Build your app with the Staging deployment key
2. Release an update to Staging
3. Launch the app and verify the update is received

```bash
# Release to staging
appcenter codepush release-react -a <owner>/<app-name> -d Staging

# View release history
appcenter codepush deployment history -a <owner>/<app-name> Staging
```

#### Testing with Debug Builds

You can test CodePush with debug builds by temporarily enabling it:

```typescript
// Only for testing purposes - do not use in production
const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
  installMode: codePush.InstallMode.IMMEDIATE,
};

// Override for testing
if (__DEV__) {
  // CodePush is typically disabled in dev mode
  // You can force enable it for testing
}
```

### Verifying Update Installation

Add logging to track update status:

```typescript
import codePush from 'react-native-code-push';

const logUpdateStatus = async () => {
  // Get currently running update
  const runningUpdate = await codePush.getUpdateMetadata(
    codePush.UpdateState.RUNNING
  );

  // Get pending update (downloaded but not yet installed)
  const pendingUpdate = await codePush.getUpdateMetadata(
    codePush.UpdateState.PENDING
  );

  // Get latest installed update
  const latestUpdate = await codePush.getUpdateMetadata(
    codePush.UpdateState.LATEST
  );

  console.log('Running update:', runningUpdate);
  console.log('Pending update:', pendingUpdate);
  console.log('Latest update:', latestUpdate);
};
```

### Automated Testing

Create automated tests to verify CodePush functionality:

```typescript
// __tests__/codepush.test.ts
import codePush from 'react-native-code-push';

jest.mock('react-native-code-push', () => ({
  checkForUpdate: jest.fn(),
  getUpdateMetadata: jest.fn(),
  sync: jest.fn(),
  UpdateState: {
    RUNNING: 'RUNNING',
    PENDING: 'PENDING',
    LATEST: 'LATEST',
  },
}));

describe('CodePush Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check for updates on app start', async () => {
    const mockUpdate = {
      label: 'v1',
      description: 'Bug fixes',
      isMandatory: false,
    };

    (codePush.checkForUpdate as jest.Mock).mockResolvedValue(mockUpdate);

    const update = await codePush.checkForUpdate();

    expect(update).toBeDefined();
    expect(update.label).toBe('v1');
  });

  it('should handle no update available', async () => {
    (codePush.checkForUpdate as jest.Mock).mockResolvedValue(null);

    const update = await codePush.checkForUpdate();

    expect(update).toBeNull();
  });
});
```

### Clear CodePush Cache for Testing

During development, you may need to clear the CodePush cache:

```typescript
// Clear all CodePush updates and restart with the bundled version
import codePush from 'react-native-code-push';

const clearUpdates = async () => {
  try {
    await codePush.clearUpdates();
    codePush.restartApp();
  } catch (error) {
    console.error('Error clearing updates:', error);
  }
};
```

## Best Practices

Follow these best practices to ensure successful CodePush deployments.

### 1. Use Semantic Versioning

Always follow semantic versioning for your app:

- **Major version**: Breaking changes
- **Minor version**: New features (backward compatible)
- **Patch version**: Bug fixes

```bash
# Target specific versions appropriately
appcenter codepush release-react -a myorg/myapp -t "~1.2.0"  # 1.2.x
appcenter codepush release-react -a myorg/myapp -t "^1.0.0"  # 1.x.x
```

### 2. Include Descriptive Release Notes

Always add descriptions to your releases:

```bash
appcenter codepush release-react -a <owner>/<app-name> \
  --description "Fixed login bug, improved performance on older devices"
```

### 3. Implement Gradual Rollouts

Use rollouts to minimize risk:

```bash
# Release to 25% of users initially
appcenter codepush release-react -a <owner>/<app-name> --rollout 25

# Increase rollout percentage
appcenter codepush patch -a <owner>/<app-name> Production --rollout 50

# Complete rollout
appcenter codepush patch -a <owner>/<app-name> Production --rollout 100
```

### 4. Monitor Release Metrics

Track your releases using App Center analytics:

```bash
# View deployment metrics
appcenter codepush deployment list -a <owner>/<app-name>

# View release history
appcenter codepush deployment history -a <owner>/<app-name> Production
```

### 5. Implement Error Boundaries

Protect your app from crashes that could trigger rollbacks:

```typescript
import React, { ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to your error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text>Something went wrong.</Text>
          <Button
            title="Try Again"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}
```

### 6. Notify CodePush of Successful Updates

Always call `notifyAppReady()` to confirm successful updates:

```typescript
import { useEffect } from 'react';
import codePush from 'react-native-code-push';

const App: React.FC = () => {
  useEffect(() => {
    // Notify CodePush that the update is successful
    codePush.notifyAppReady();
  }, []);

  return <YourAppContent />;
};
```

## Limitations and Considerations

Understanding CodePush limitations helps you plan your release strategy effectively.

### Technical Limitations

1. **JavaScript Only**: CodePush can only update JavaScript code and assets. Native code changes always require a store update.

2. **Bundle Size**: Large bundles take longer to download. Optimize your JavaScript bundle size.

3. **First Launch**: Users must launch the app at least once after a store install before receiving CodePush updates.

4. **Offline Users**: Users without internet connectivity cannot receive updates.

5. **iOS App Store Guidelines**: Apple requires that apps do not download executable code. While CodePush is generally accepted, ensure your usage complies with the latest guidelines.

### Platform-Specific Considerations

#### iOS

- Background downloads may be interrupted by iOS
- Updates must comply with App Store Review Guidelines (Section 3.3.2)
- Test on older iOS versions for compatibility

#### Android

- Split APKs may require additional configuration
- Test on various Android versions and manufacturers
- Consider Hermes engine compatibility

### Security Considerations

1. **Code Signing**: Enable code signing to verify update authenticity

```bash
# Generate keys for code signing
appcenter codepush deployment add -a <owner>/<app-name> Production --private-key-path ./private.pem

# Release with code signing
appcenter codepush release-react -a <owner>/<app-name> \
  --private-key-path ./private.pem
```

2. **Secure Storage**: Never store sensitive data in JavaScript code that could be exposed through updates

3. **Audit Trail**: Maintain logs of all CodePush releases for security audits

### Cost Considerations

App Center CodePush is free, but consider:

- Bandwidth usage for large updates
- Server costs for health check endpoints
- Analytics and monitoring tools

## Conclusion

CodePush provides a powerful way to deliver updates to your React Native applications instantly. By following the practices outlined in this guide, you can implement a robust OTA update system that improves your ability to respond to bugs and deliver new features quickly.

Key takeaways:

1. **Use CodePush for JavaScript-only updates**: Native code changes still require store updates
2. **Implement proper testing**: Always test updates in Staging before Production
3. **Plan your rollout strategy**: Use gradual rollouts and monitoring
4. **Handle errors gracefully**: Implement error boundaries and health checks
5. **Monitor your releases**: Track metrics and be ready to rollback if needed

With CodePush properly integrated, you can confidently ship updates knowing you have the ability to quickly fix issues without waiting for app store approval.

## Additional Resources

- [App Center CodePush Documentation](https://docs.microsoft.com/en-us/appcenter/distribution/codepush/)
- [react-native-code-push GitHub Repository](https://github.com/microsoft/react-native-code-push)
- [React Native Official Documentation](https://reactnative.dev/)
- [Semantic Versioning Specification](https://semver.org/)

---

*This guide was last updated on January 15, 2026. CodePush APIs and configurations may change over time. Always refer to the official documentation for the most current information.*
