# How to Implement Deep Linking in React Native Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Deep Linking, React Navigation, iOS, Android, Universal Links

Description: Learn how to implement deep linking in React Native apps to handle custom URL schemes and universal links on iOS and Android.

---

Deep linking is a powerful feature that allows users to navigate directly to specific content within your mobile application. Whether you're building an e-commerce app, social platform, or productivity tool, implementing deep links can significantly improve user engagement and conversion rates. In this comprehensive guide, we'll walk through everything you need to know about implementing deep linking in React Native applications.

## What is Deep Linking?

Deep linking refers to the practice of using a URL to link to a specific location within a mobile app rather than simply launching the app's home screen. When a user clicks on a deep link, they are taken directly to the relevant content, bypassing the need to navigate through multiple screens.

### Types of Deep Links

There are three main types of deep links:

1. **Traditional Deep Links**: Use custom URL schemes (e.g., `myapp://product/123`) to open specific app content. However, they only work if the app is already installed.

2. **Universal Links (iOS) / App Links (Android)**: Use standard HTTPS URLs that work seamlessly across web and mobile. If the app is installed, it opens directly; otherwise, the user is taken to the website.

3. **Deferred Deep Links**: Allow users who don't have the app installed to be redirected to the app store, and then taken to the intended content after installation.

## URL Schemes vs Universal Links

Understanding the difference between URL schemes and universal links is crucial for implementing the right solution for your app.

### Custom URL Schemes

Custom URL schemes are the traditional approach to deep linking. They use a custom protocol (e.g., `myapp://`) instead of `https://`.

**Advantages:**
- Easy to implement
- Works offline
- No server configuration required

**Disadvantages:**
- Not secure (any app can claim the same scheme)
- Only works if the app is installed
- No fallback mechanism

### Universal Links / App Links

Universal links (iOS) and App Links (Android) use standard HTTPS URLs that can open either your app or website.

**Advantages:**
- Secure and verified
- Fallback to website if app not installed
- Better user experience
- SEO benefits

**Disadvantages:**
- Requires server configuration
- More complex setup
- Requires hosting an association file

## Setting Up Your React Native Project

Before diving into platform-specific configurations, let's set up the necessary dependencies in your React Native project.

```bash
# Install React Navigation and dependencies
npm install @react-navigation/native @react-navigation/native-stack

# Install required peer dependencies
npm install react-native-screens react-native-safe-area-context

# For iOS, install CocoaPods dependencies
cd ios && pod install && cd ..
```

## Configuring iOS URL Schemes

To handle custom URL schemes on iOS, you need to modify your app's Info.plist file.

### Step 1: Register URL Scheme in Info.plist

Open `ios/YourAppName/Info.plist` and add the following configuration:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.yourcompany.yourapp</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

### Step 2: Handle Incoming URLs in AppDelegate

Modify your `ios/YourAppName/AppDelegate.mm` (or `.m` for older projects) to handle incoming URLs:

```objective-c
#import <React/RCTLinkingManager.h>

// Add this method to handle URL schemes
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

// For iOS 9+ universal links support
- (BOOL)application:(UIApplication *)application
   continueUserActivity:(NSUserActivity *)userActivity
   restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}
```

## Configuring Android Intent Filters

For Android, you need to configure intent filters in your AndroidManifest.xml.

### Step 1: Add Intent Filters

Open `android/app/src/main/AndroidManifest.xml` and add the following within your main `<activity>` tag:

```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask">

  <!-- Deep Link with custom scheme -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" />
  </intent-filter>

  <!-- Deep Link with https scheme for specific paths -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="https"
      android:host="www.yourapp.com"
      android:pathPrefix="/product" />
  </intent-filter>
</activity>
```

### Step 2: Configure Launch Mode

Setting `android:launchMode="singleTask"` ensures that only one instance of your app runs and new intents are delivered to the existing instance.

## React Navigation Linking Configuration

React Navigation provides built-in support for deep linking through its linking configuration.

### Basic Setup

Create a linking configuration object and pass it to your NavigationContainer:

```typescript
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Linking } from 'react-native';

// Define your navigation types
type RootStackParamList = {
  Home: undefined;
  Product: { productId: string };
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://www.yourapp.com', 'https://yourapp.com'],

  config: {
    screens: {
      Home: '',
      Product: {
        path: 'product/:productId',
        parse: {
          productId: (productId: string) => productId,
        },
      },
      Profile: {
        path: 'user/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Settings: 'settings',
    },
  },

  // Custom function to get the initial URL
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url;
  },

  // Subscribe to incoming links
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      subscription.remove();
    };
  },
};

// App component
function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Product" component={ProductScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Nested Navigation Configuration

For apps with nested navigators, configure the linking accordingly:

```typescript
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://www.yourapp.com'],

  config: {
    screens: {
      Home: {
        screens: {
          Feed: 'feed',
          Discover: 'discover',
        },
      },
      Product: {
        path: 'product/:productId',
        screens: {
          Details: 'details',
          Reviews: 'reviews',
        },
      },
    },
  },
};
```

## Universal Links Setup on iOS

Universal Links provide a secure and seamless deep linking experience on iOS.

### Step 1: Create apple-app-site-association File

Create a JSON file named `apple-app-site-association` (no file extension) and host it on your server:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.yourapp",
        "paths": [
          "/product/*",
          "/user/*",
          "/settings"
        ]
      }
    ]
  }
}
```

### Step 2: Host the File

The file must be hosted at either:
- `https://yourapp.com/.well-known/apple-app-site-association`
- `https://yourapp.com/apple-app-site-association`

Ensure the file is served with `Content-Type: application/json`.

### Step 3: Enable Associated Domains

In Xcode, go to your target's "Signing & Capabilities" tab and add the "Associated Domains" capability. Add your domain:

```
applinks:yourapp.com
applinks:www.yourapp.com
```

### Step 4: Verify the Configuration

Use Apple's validation tool to verify your setup:
```
https://app-site-association.cdn-apple.com/a/v1/yourapp.com
```

## App Links Setup on Android

Android App Links work similarly to Universal Links on iOS.

### Step 1: Create assetlinks.json File

Create a file named `assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.yourapp",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

### Step 2: Get SHA256 Fingerprint

Generate the SHA256 fingerprint from your signing certificate:

```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

### Step 3: Host the File

Host the file at:
```
https://yourapp.com/.well-known/assetlinks.json
```

### Step 4: Update AndroidManifest.xml

Add `android:autoVerify="true"` to your intent filter:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="yourapp.com" />
</intent-filter>
```

## Handling Incoming Links

Beyond the basic React Navigation setup, you may need to handle deep links manually in certain scenarios.

### Using the Linking API

```typescript
import { Linking } from 'react-native';
import { useEffect } from 'react';

function useDeepLinkHandler() {
  useEffect(() => {
    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is launched from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = ({ url }: { url: string }) => {
    console.log('Deep link received:', url);

    // Parse the URL
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const params = Object.fromEntries(parsedUrl.searchParams);

    // Route based on path
    switch (true) {
      case path.startsWith('/product/'):
        const productId = path.split('/')[2];
        navigateToProduct(productId);
        break;
      case path.startsWith('/user/'):
        const userId = path.split('/')[2];
        navigateToProfile(userId);
        break;
      default:
        navigateToHome();
    }
  };
}
```

### Creating a Deep Link Context

For more complex apps, create a context to manage deep link state:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';

interface DeepLinkContextType {
  pendingDeepLink: string | null;
  clearPendingDeepLink: () => void;
}

const DeepLinkContext = createContext<DeepLinkContextType | null>(null);

export function DeepLinkProvider({ children }: { children: React.ReactNode }) {
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      setPendingDeepLink(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        setPendingDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  const clearPendingDeepLink = () => setPendingDeepLink(null);

  return (
    <DeepLinkContext.Provider value={{ pendingDeepLink, clearPendingDeepLink }}>
      {children}
    </DeepLinkContext.Provider>
  );
}

export const useDeepLink = () => {
  const context = useContext(DeepLinkContext);
  if (!context) {
    throw new Error('useDeepLink must be used within DeepLinkProvider');
  }
  return context;
};
```

## Testing Deep Links

Testing deep links is crucial to ensure they work correctly across different scenarios.

### Testing on iOS Simulator

```bash
# Test custom URL scheme
xcrun simctl openurl booted "myapp://product/123"

# Test universal link
xcrun simctl openurl booted "https://yourapp.com/product/123"
```

### Testing on Android Emulator

```bash
# Test custom URL scheme
adb shell am start -W -a android.intent.action.VIEW -d "myapp://product/123" com.yourcompany.yourapp

# Test App Link
adb shell am start -W -a android.intent.action.VIEW -d "https://yourapp.com/product/123" com.yourcompany.yourapp
```

### Testing on Physical Devices

For iOS physical devices:
1. Send yourself a link via Messages or Notes
2. Tap the link to test the deep link behavior

For Android physical devices:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "myapp://product/123"
```

### Debug Logging

Add comprehensive logging to debug deep link issues:

```typescript
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://yourapp.com'],

  config: {
    // ... your config
  },

  async getInitialURL() {
    const url = await Linking.getInitialURL();
    console.log('[Deep Link] Initial URL:', url);
    return url;
  },

  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[Deep Link] Incoming URL:', url);
      listener(url);
    });

    return () => subscription.remove();
  },

  getStateFromPath(path, config) {
    console.log('[Deep Link] Parsing path:', path);
    const state = getStateFromPath(path, config);
    console.log('[Deep Link] Resulting state:', JSON.stringify(state, null, 2));
    return state;
  },
};
```

## Deferred Deep Linking

Deferred deep linking allows users to be taken to specific content even after installing the app for the first time.

### Implementing Deferred Deep Links

While React Native doesn't have built-in deferred deep linking, you can implement it using third-party services or a custom solution:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFERRED_LINK_KEY = 'deferred_deep_link';

// Store deferred link (call this from your website/marketing page)
async function storeDeferredLink(link: string) {
  // In practice, this would be stored server-side with a device identifier
  await AsyncStorage.setItem(DEFERRED_LINK_KEY, link);
}

// Check for deferred link on first launch
async function checkDeferredDeepLink() {
  const isFirstLaunch = await AsyncStorage.getItem('has_launched');

  if (!isFirstLaunch) {
    await AsyncStorage.setItem('has_launched', 'true');

    // Check server for any deferred deep link
    // This would typically involve fingerprinting or a click ID
    const deferredLink = await fetchDeferredLinkFromServer();

    if (deferredLink) {
      return deferredLink;
    }
  }

  return null;
}

// Usage in App component
function App() {
  useEffect(() => {
    checkDeferredDeepLink().then((link) => {
      if (link) {
        // Navigate to the deferred deep link destination
        handleDeepLink(link);
      }
    });
  }, []);

  // ... rest of app
}
```

### Using Third-Party Services

Popular services for deferred deep linking include:

- **Branch.io**: Comprehensive deep linking platform
- **Firebase Dynamic Links**: Google's solution (being deprecated)
- **Adjust**: Mobile attribution and deep linking
- **AppsFlyer**: Marketing analytics with deep linking

Example using Branch:

```typescript
import branch from 'react-native-branch';

// Subscribe to Branch links
branch.subscribe(({ error, params }) => {
  if (error) {
    console.error('Branch error:', error);
    return;
  }

  if (params['+clicked_branch_link']) {
    // Handle the deep link
    const productId = params.product_id;
    if (productId) {
      navigation.navigate('Product', { productId });
    }
  }
});
```

## Analytics for Deep Links

Tracking deep link performance is essential for understanding user behavior and optimizing marketing campaigns.

### Implementing Deep Link Analytics

```typescript
import analytics from '@react-native-firebase/analytics';

interface DeepLinkEvent {
  url: string;
  source: 'initial' | 'foreground';
  timestamp: number;
  screen?: string;
  params?: Record<string, string>;
}

class DeepLinkAnalytics {
  async trackDeepLinkOpened(event: DeepLinkEvent) {
    await analytics().logEvent('deep_link_opened', {
      url: event.url,
      source: event.source,
      timestamp: event.timestamp,
      screen: event.screen,
      ...event.params,
    });
  }

  async trackDeepLinkConversion(event: DeepLinkEvent & { action: string }) {
    await analytics().logEvent('deep_link_conversion', {
      url: event.url,
      action: event.action,
      timestamp: event.timestamp,
    });
  }

  async trackDeepLinkError(url: string, error: string) {
    await analytics().logEvent('deep_link_error', {
      url,
      error,
      timestamp: Date.now(),
    });
  }
}

export const deepLinkAnalytics = new DeepLinkAnalytics();

// Usage
function handleDeepLink({ url }: { url: string }) {
  deepLinkAnalytics.trackDeepLinkOpened({
    url,
    source: 'foreground',
    timestamp: Date.now(),
  });

  // ... handle navigation
}
```

### Key Metrics to Track

1. **Deep Link Opens**: Total number of times deep links are opened
2. **Conversion Rate**: Percentage of deep link opens that lead to desired actions
3. **Source Attribution**: Which channels are driving the most deep link traffic
4. **Error Rate**: Frequency of failed deep link handling
5. **Time to Engagement**: How long it takes users to complete actions after deep linking

## Common Issues and Solutions

### Issue 1: Deep Links Not Working on iOS

**Problem**: Universal links don't open the app.

**Solutions**:
- Verify the `apple-app-site-association` file is accessible and valid JSON
- Ensure the Team ID in the file matches your app's Team ID
- Check that Associated Domains is properly configured in Xcode
- Rebuild the app after making changes
- Long-press the link and select "Open in App" to reset iOS's decision

### Issue 2: Deep Links Not Working on Android

**Problem**: App Links don't open the app automatically.

**Solutions**:
- Verify the `assetlinks.json` file is accessible
- Ensure the SHA256 fingerprint matches your signing certificate
- Check `autoVerify="true"` is set on the intent filter
- Clear the app's default link handling in device settings
- Test with: `adb shell pm get-app-links com.yourcompany.yourapp`

### Issue 3: Navigation State Not Updating

**Problem**: The app opens but doesn't navigate to the correct screen.

**Solutions**:
```typescript
// Ensure navigation ref is ready
const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

const linking = {
  // ... config

  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      // Wait for navigator to be ready
      if (navigationRef.current?.isReady()) {
        listener(url);
      } else {
        // Queue the link for later processing
        pendingLink = url;
      }
    });

    return () => subscription.remove();
  },
};
```

### Issue 4: Query Parameters Not Parsed

**Problem**: URL query parameters aren't being extracted.

**Solutions**:
```typescript
config: {
  screens: {
    Search: {
      path: 'search',
      parse: {
        query: (query: string) => decodeURIComponent(query),
        page: (page: string) => parseInt(page, 10) || 1,
      },
    },
  },
},
```

### Issue 5: Deep Link Works in Development But Not Production

**Problem**: Deep links work in debug builds but fail in release.

**Solutions**:
- Ensure release signing certificate SHA256 is in `assetlinks.json`
- Verify production URL schemes are properly configured
- Check ProGuard rules aren't stripping necessary code
- Test with release builds locally before deploying

### Issue 6: Multiple Apps Handling Same Scheme

**Problem**: Another app intercepts your deep links.

**Solutions**:
- Use Universal Links / App Links instead of custom schemes
- Use a unique scheme that includes your company name (e.g., `companyname-appname://`)
- Register your URL scheme with the platform

## Best Practices Summary

1. **Always implement Universal Links / App Links** for production apps
2. **Keep URL schemes as backup** for backwards compatibility
3. **Test thoroughly** on both platforms and in different states (app running, backgrounded, killed)
4. **Implement proper error handling** for malformed or expired links
5. **Track analytics** to measure deep link effectiveness
6. **Document your URL structure** for marketing and development teams
7. **Use path-based routing** for cleaner URLs
8. **Validate links on the server** before redirecting to sensitive content
9. **Consider deferred deep linking** for user acquisition campaigns
10. **Keep association files up to date** when app bundle IDs or signing certificates change

## Conclusion

Implementing deep linking in React Native applications requires careful configuration across both iOS and Android platforms, but the benefits are substantial. Deep links improve user engagement, enable seamless marketing campaigns, and provide a better overall user experience.

Start with custom URL schemes for quick implementation, then progress to Universal Links and App Links for a more robust, secure solution. Remember to test extensively and track analytics to optimize your deep linking strategy over time.

By following this guide, you should have a solid foundation for implementing comprehensive deep linking in your React Native application. As your app grows, consider integrating third-party services for advanced features like deferred deep linking and cross-platform attribution.

---

## Further Reading

- [React Navigation Deep Linking Documentation](https://reactnavigation.org/docs/deep-linking/)
- [Apple Universal Links Documentation](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [React Native Linking API](https://reactnative.dev/docs/linking)
