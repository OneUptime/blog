# How to Optimize React Native App Startup Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Startup Time, Performance, Optimization, Mobile Development, User Experience

Description: Learn how to optimize React Native app startup time for a better user experience with fast cold and warm starts.

---

App startup time is one of the most critical performance metrics for mobile applications. Users expect apps to launch instantly, and slow startup times can lead to user frustration, app abandonment, and negative reviews. In React Native applications, startup performance requires special attention due to the JavaScript bridge and bundle loading process.

This comprehensive guide covers everything you need to know about optimizing React Native app startup time, from understanding the fundamentals to implementing advanced optimization techniques.

## Understanding Cold vs Warm Start

Before diving into optimizations, it's essential to understand the different types of app starts.

### Cold Start

A cold start occurs when your app launches from scratch. The system creates a new process for your app, and the following happens:

1. The operating system loads the app process
2. Native modules are initialized
3. The JavaScript engine starts
4. The JavaScript bundle is loaded and parsed
5. React components are mounted
6. The initial UI is rendered

Cold starts are the slowest because everything needs to be initialized from scratch. This is what users experience when they first open your app or after the system has killed it to reclaim memory.

```javascript
// Example of measuring cold start time
const startTime = global.performance.now();

AppRegistry.registerComponent('MyApp', () => {
  const endTime = global.performance.now();
  console.log(`Cold start time: ${endTime - startTime}ms`);
  return App;
});
```

### Warm Start

A warm start happens when your app is already in memory but was in the background. The process still exists, so:

1. The app process is brought to the foreground
2. Activity or view controller is recreated if needed
3. React components may re-mount

Warm starts are significantly faster because the JavaScript engine and most native modules are already initialized.

### Hot Start

A hot start is the fastest scenario where the app is simply brought back from the background with everything intact. No re-initialization is required.

## Measuring Startup Time

You can't optimize what you can't measure. Here are several approaches to measure startup time accurately.

### Using Performance API

```javascript
// In your index.js or App.js
import { AppRegistry, PerformanceObserver } from 'react-native';

// Mark the start time as early as possible
const appStartTime = global.performance.now();

// Create a performance observer
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

observer.observe({ entryTypes: ['measure'] });

// In your main App component
function App() {
  useEffect(() => {
    const mountTime = global.performance.now();
    const startupDuration = mountTime - appStartTime;

    performance.measure('App Startup', {
      start: appStartTime,
      end: mountTime,
    });

    console.log(`Total startup time: ${startupDuration}ms`);
  }, []);

  return <MainNavigator />;
}
```

### Native Measurement on Android

```java
// In your MainActivity.java
public class MainActivity extends ReactActivity {
    private static long startTime;

    static {
        startTime = System.currentTimeMillis();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        long endTime = System.currentTimeMillis();
        Log.d("StartupTime", "Native startup: " + (endTime - startTime) + "ms");
    }
}
```

### Native Measurement on iOS

```objective-c
// In AppDelegate.m
#import <sys/time.h>

static struct timeval startTime;

__attribute__((constructor))
static void recordStartTime() {
    gettimeofday(&startTime, NULL);
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

    struct timeval endTime;
    gettimeofday(&endTime, NULL);

    double elapsedTime = (endTime.tv_sec - startTime.tv_sec) * 1000.0 +
                         (endTime.tv_usec - startTime.tv_usec) / 1000.0;

    NSLog(@"Native startup time: %.2f ms", elapsedTime);

    // ... rest of initialization
}
```

### Using Flipper Performance Plugin

Flipper provides excellent tools for measuring React Native performance:

```javascript
// Install the flipper-plugin-react-native-performance package
// Then add to your app initialization:

import { PerformanceProfiler } from 'react-native-performance-flipper-reporter';

if (__DEV__) {
  PerformanceProfiler.configure({
    destabilized: true,
  });
}
```

## Hermes Engine for Faster Startup

Hermes is a JavaScript engine optimized specifically for React Native. It significantly improves startup time through bytecode precompilation.

### Enabling Hermes on Android

```groovy
// android/app/build.gradle
project.ext.react = [
    enableHermes: true,  // Enable Hermes
    hermesCommand: "../../node_modules/hermes-engine/%OS-BIN%/hermes",
]

dependencies {
    // Use Hermes instead of JSC
    if (project.ext.react.get("enableHermes", false)) {
        def hermesPath = "../../node_modules/hermes-engine/android/";
        implementation files(hermesPath + "hermes-release.aar")
    } else {
        implementation jscFlavor
    }
}
```

### Enabling Hermes on iOS

```ruby
# ios/Podfile
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true,
  :fabric_enabled => flags[:fabric_enabled],
)
```

### Benefits of Hermes

1. **Bytecode Precompilation**: JavaScript is compiled to bytecode at build time, not runtime
2. **Reduced Memory Usage**: Hermes uses less memory than JavaScriptCore
3. **Smaller App Size**: The engine itself is smaller
4. **Faster TTI**: Time to Interactive is significantly reduced

```javascript
// You can check if Hermes is enabled
const isHermes = () => !!global.HermesInternal;

if (isHermes()) {
  console.log('Hermes is enabled');
}
```

### Hermes Performance Comparison

Typical improvements with Hermes:

| Metric | Without Hermes | With Hermes | Improvement |
|--------|---------------|-------------|-------------|
| TTI | 4.3s | 2.1s | 51% |
| Bundle Size | 13MB | 8MB | 38% |
| Memory Usage | 185MB | 136MB | 26% |

## Lazy Loading and Code Splitting

Loading everything at startup is unnecessary and wasteful. Implement lazy loading to defer non-critical code.

### React.lazy for Component Lazy Loading

```javascript
import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Instead of direct import
// import HeavyComponent from './HeavyComponent';

// Use lazy loading
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    }>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Dynamic Imports for Features

```javascript
// Feature loader utility
class FeatureLoader {
  static cache = new Map();

  static async load(featureName) {
    if (this.cache.has(featureName)) {
      return this.cache.get(featureName);
    }

    let feature;
    switch (featureName) {
      case 'analytics':
        feature = await import('./features/analytics');
        break;
      case 'notifications':
        feature = await import('./features/notifications');
        break;
      case 'payments':
        feature = await import('./features/payments');
        break;
      default:
        throw new Error(`Unknown feature: ${featureName}`);
    }

    this.cache.set(featureName, feature);
    return feature;
  }
}

// Usage
async function initializeAnalytics() {
  const analytics = await FeatureLoader.load('analytics');
  analytics.initialize();
}
```

### Screen-Level Code Splitting with React Navigation

```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';

// Lazy load screens
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));

const Stack = createNativeStackNavigator();

function LazyScreen({ component: Component, ...props }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={(props) => <LazyScreen component={HomeScreen} {...props} />}
      />
      <Stack.Screen
        name="Profile"
        component={(props) => <LazyScreen component={ProfileScreen} {...props} />}
      />
      <Stack.Screen
        name="Settings"
        component={(props) => <LazyScreen component={SettingsScreen} {...props} />}
      />
    </Stack.Navigator>
  );
}
```

## Optimizing JavaScript Bundle

The JavaScript bundle size directly impacts startup time. Here are strategies to optimize it.

### Analyze Bundle Size

```bash
# Generate bundle stats
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android-release.bundle \
  --sourcemap-output android-release.bundle.map

# Analyze with source-map-explorer
npx source-map-explorer android-release.bundle android-release.bundle.map
```

### Configure Metro Bundler for Optimization

```javascript
// metro.config.js
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true, // Enable inline requires
        },
      }),
      minifierPath: 'metro-minify-terser',
      minifierConfig: {
        compress: {
          drop_console: true, // Remove console statements in production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        mangle: {
          toplevel: true,
        },
      },
    },
    resolver: {
      sourceExts: [...sourceExts, 'cjs'],
      assetExts: assetExts.filter(ext => ext !== 'svg'),
    },
  };
})();
```

### Tree Shaking with Proper Imports

```javascript
// Bad - imports entire library
import _ from 'lodash';
const result = _.map(array, fn);

// Good - imports only what's needed
import map from 'lodash/map';
const result = map(array, fn);

// Even better - use native methods when possible
const result = array.map(fn);
```

### Remove Unused Dependencies

```javascript
// package.json - audit and remove unused packages
{
  "scripts": {
    "analyze": "npx depcheck",
    "unused": "npx unimported"
  }
}
```

## Native Initialization Optimization

Native module initialization can significantly impact startup time. Optimize your native code for faster launches.

### Android Native Optimization

```java
// Use lazy initialization for native modules
public class MyNativeModule extends ReactContextBaseJavaModule {
    private ExpensiveResource resource;

    // Don't initialize in constructor
    public MyNativeModule(ReactApplicationContext context) {
        super(context);
        // Don't do: this.resource = new ExpensiveResource();
    }

    // Initialize on first use
    private ExpensiveResource getResource() {
        if (resource == null) {
            resource = new ExpensiveResource();
        }
        return resource;
    }

    @ReactMethod
    public void doSomething(Promise promise) {
        // Resource is only created when this method is called
        getResource().performAction();
        promise.resolve(true);
    }
}
```

### iOS Native Optimization

```objective-c
// Defer heavy initialization with dispatch_once
@implementation MyNativeModule {
    ExpensiveResource *_resource;
}

- (ExpensiveResource *)resource {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        self->_resource = [[ExpensiveResource alloc] init];
    });
    return _resource;
}

RCT_EXPORT_METHOD(doSomething:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // Resource is only created when this method is called
    [self.resource performAction];
    resolve(@YES);
}

@end
```

### Optimize Native Module Loading Order

```java
// MainApplication.java
@Override
protected List<ReactPackage> getPackages() {
    return Arrays.asList(
        new MainReactPackage(),
        // Load critical packages first
        new CriticalPackage(),
        // Defer non-critical packages
        // new NonCriticalPackage() // Load this later
    );
}
```

## Splash Screen Strategies

A well-implemented splash screen improves perceived performance while your app loads.

### Using react-native-splash-screen

```javascript
// Installation and setup
// npm install react-native-splash-screen

// In your App.js
import SplashScreen from 'react-native-splash-screen';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Hide splash screen after app is ready
    const initializeApp = async () => {
      await loadInitialData();
      await setupServices();
      SplashScreen.hide();
    };

    initializeApp();
  }, []);

  return <MainApp />;
}
```

### Android Splash Screen Configuration

```xml
<!-- android/app/src/main/res/values/styles.xml -->
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_screen</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>

    <style name="SplashTheme" parent="AppTheme">
        <item name="android:windowBackground">@drawable/splash_screen</item>
    </style>
</resources>
```

```xml
<!-- android/app/src/main/res/drawable/splash_screen.xml -->
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/logo"/>
    </item>
</layer-list>
```

### iOS Splash Screen with Launch Screen Storyboard

Create a LaunchScreen.storyboard in Xcode with your splash screen design. This displays instantly while your app loads.

### Animated Splash Screen Transition

```javascript
import React, { useEffect, useRef } from 'react';
import { Animated, View, Image, StyleSheet } from 'react-native';

function AnimatedSplash({ onAnimationEnd, children }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(onAnimationEnd);
    }
  }, [isReady]);

  return (
    <View style={styles.container}>
      {children}
      {!isReady && (
        <Animated.View
          style={[
            styles.splash,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image source={require('./assets/logo.png')} />
        </Animated.View>
      )}
    </View>
  );
}
```

## Deferring Non-Critical Initialization

Not everything needs to load at startup. Defer non-essential tasks to improve initial load time.

### Using InteractionManager

```javascript
import { InteractionManager } from 'react-native';

function App() {
  useEffect(() => {
    // Critical initialization first
    initializeAuth();

    // Defer non-critical tasks until after interactions complete
    InteractionManager.runAfterInteractions(() => {
      // These run after animations and interactions
      initializeAnalytics();
      preloadImages();
      setupPushNotifications();
      syncOfflineData();
    });
  }, []);

  return <MainApp />;
}
```

### Prioritized Initialization Queue

```javascript
class InitializationQueue {
  static priorities = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  static queue = [];
  static isProcessing = false;

  static add(task, priority = this.priorities.MEDIUM) {
    this.queue.push({ task, priority });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  static async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Process critical tasks synchronously
    const criticalTasks = this.queue.filter(
      item => item.priority === this.priorities.CRITICAL
    );

    for (const { task } of criticalTasks) {
      await task();
    }

    // Process other tasks after interactions
    InteractionManager.runAfterInteractions(async () => {
      const remainingTasks = this.queue.filter(
        item => item.priority !== this.priorities.CRITICAL
      );

      for (const { task } of remainingTasks) {
        await task();
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      this.isProcessing = false;
    });
  }
}

// Usage
InitializationQueue.add(() => initializeAuth(), InitializationQueue.priorities.CRITICAL);
InitializationQueue.add(() => setupAnalytics(), InitializationQueue.priorities.LOW);
InitializationQueue.add(() => loadUserPreferences(), InitializationQueue.priorities.HIGH);
InitializationQueue.process();
```

### Idle Callback Pattern

```javascript
// Custom hook for deferred initialization
function useDeferredInit(initFn, dependencies = []) {
  useEffect(() => {
    let cancelled = false;

    const scheduleInit = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          if (!cancelled) initFn();
        });
      } else {
        setTimeout(() => {
          if (!cancelled) initFn();
        }, 100);
      }
    };

    InteractionManager.runAfterInteractions(scheduleInit);

    return () => {
      cancelled = true;
    };
  }, dependencies);
}

// Usage
function App() {
  useDeferredInit(() => {
    // Non-critical initialization
    loadCachedData();
    setupDeepLinking();
  });

  return <MainApp />;
}
```

## RAM Bundles for Android

RAM (Random Access Memory) bundles allow loading JavaScript modules on demand, significantly improving startup time on Android.

### Enabling RAM Bundles

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    // Enable indexed RAM bundle format
    createModuleIdFactory: () => {
      let nextId = 0;
      const moduleIds = new Map();

      return (path) => {
        if (!moduleIds.has(path)) {
          moduleIds.set(path, nextId++);
        }
        return moduleIds.get(path);
      };
    },
  },
};
```

### Building RAM Bundle

```bash
# Build indexed RAM bundle for Android
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ \
  --indexed-ram-bundle
```

### Android Configuration for RAM Bundles

```java
// MainApplication.java
@Override
protected String getJSBundleFile() {
    return "assets://index.android.bundle";
}

@Override
protected String getBundleAssetName() {
    return "index.android.bundle";
}
```

### Preloading Critical Modules

```javascript
// preload.js - Preload essential modules
require('./src/core/auth');
require('./src/core/navigation');
require('./src/core/api');

// In metro.config.js
module.exports = {
  serializer: {
    getModulesRunBeforeMainModule() {
      return [require.resolve('./preload.js')];
    },
  },
};
```

## Inline Requires Optimization

Inline requires defer the loading of modules until they're actually needed.

### Enabling Inline Requires

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),
  },
};
```

### Manual Inline Requires

```javascript
// Instead of top-level imports
import HeavyLibrary from 'heavy-library';

function processData(data) {
  return HeavyLibrary.process(data);
}

// Use inline requires
function processData(data) {
  const HeavyLibrary = require('heavy-library');
  return HeavyLibrary.process(data);
}
```

### Blocklist for Inline Requires

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: {
          blockList: {
            // Don't inline these modules (always load at startup)
            'react-native': true,
            'react': true,
            '@react-navigation/native': true,
          },
        },
      },
    }),
  },
};
```

### Conditional Requires Pattern

```javascript
// Conditional loading based on feature flags
function getPaymentProcessor() {
  if (FeatureFlags.useNewPaymentSystem) {
    return require('./payments/NewPaymentProcessor');
  }
  return require('./payments/LegacyPaymentProcessor');
}

// Platform-specific requires
function getPlatformModule() {
  if (Platform.OS === 'ios') {
    return require('./platform/ios');
  }
  return require('./platform/android');
}
```

## Third-Party Library Impact

Third-party libraries can significantly impact startup time. Audit and optimize your dependencies.

### Auditing Library Impact

```javascript
// Create a startup profiler
const libraryTimings = {};

function profileRequire(moduleName) {
  const start = performance.now();
  const module = require(moduleName);
  const end = performance.now();

  libraryTimings[moduleName] = end - start;
  console.log(`${moduleName}: ${(end - start).toFixed(2)}ms`);

  return module;
}

// Usage during development
const moment = profileRequire('moment');
const lodash = profileRequire('lodash');
```

### Replacing Heavy Libraries

```javascript
// Replace moment.js with date-fns or dayjs
// Before: ~300KB
import moment from 'moment';
const formatted = moment().format('YYYY-MM-DD');

// After: ~2KB per function
import { format } from 'date-fns';
const formatted = format(new Date(), 'yyyy-MM-dd');

// Or use dayjs: ~6KB total
import dayjs from 'dayjs';
const formatted = dayjs().format('YYYY-MM-DD');
```

### Lazy Loading Heavy Libraries

```javascript
// Lazy load libraries only when needed
class LibraryLoader {
  static chartLibrary = null;
  static pdfLibrary = null;

  static async getChartLibrary() {
    if (!this.chartLibrary) {
      this.chartLibrary = await import('react-native-charts-wrapper');
    }
    return this.chartLibrary;
  }

  static async getPdfLibrary() {
    if (!this.pdfLibrary) {
      this.pdfLibrary = await import('react-native-pdf');
    }
    return this.pdfLibrary;
  }
}

// Usage
async function renderChart(data) {
  const Charts = await LibraryLoader.getChartLibrary();
  return <Charts.LineChart data={data} />;
}
```

### Native Module Optimization

```javascript
// Check if native modules support lazy loading
// react-native.config.js
module.exports = {
  dependencies: {
    'heavy-native-module': {
      platforms: {
        android: {
          // Defer package linking
        },
      },
    },
  },
};
```

## Startup Time Monitoring

Continuous monitoring ensures startup performance doesn't regress over time.

### Custom Startup Metrics

```javascript
// StartupMetrics.js
class StartupMetrics {
  static marks = {};
  static measures = [];

  static mark(name) {
    this.marks[name] = performance.now();
  }

  static measure(name, startMark, endMark) {
    const duration = this.marks[endMark] - this.marks[startMark];
    this.measures.push({ name, duration });
    return duration;
  }

  static getReport() {
    return {
      marks: { ...this.marks },
      measures: [...this.measures],
      totalStartupTime: this.marks.appReady - this.marks.nativeStart,
    };
  }

  static async sendToAnalytics() {
    const report = this.getReport();

    await fetch('https://analytics.example.com/startup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  }
}

// Usage throughout your app
// In native code, mark 'nativeStart'
StartupMetrics.mark('jsStart');
// ... after JS initialization
StartupMetrics.mark('jsReady');
// ... after React mount
StartupMetrics.mark('reactMounted');
// ... after app is interactive
StartupMetrics.mark('appReady');

StartupMetrics.measure('JS Init', 'jsStart', 'jsReady');
StartupMetrics.measure('React Mount', 'jsReady', 'reactMounted');
StartupMetrics.measure('Total Startup', 'jsStart', 'appReady');
```

### Integration with Analytics Platforms

```javascript
// Firebase Performance Monitoring
import perf from '@react-native-firebase/perf';

async function measureStartup() {
  const trace = await perf().startTrace('app_startup');

  // Add custom attributes
  trace.putAttribute('app_version', '1.0.0');
  trace.putAttribute('hermes_enabled', String(!!global.HermesInternal));

  // Add metrics
  trace.putMetric('js_bundle_size', bundleSize);

  // Stop when app is ready
  await trace.stop();
}

// Sentry Performance Monitoring
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
});
```

### Automated Performance Testing

```javascript
// __tests__/startup.perf.test.js
import { measureStartupTime } from '../utils/performance';

describe('Startup Performance', () => {
  it('should start within acceptable time', async () => {
    const startupTime = await measureStartupTime();

    // Set acceptable thresholds
    expect(startupTime.coldStart).toBeLessThan(3000); // 3 seconds
    expect(startupTime.warmStart).toBeLessThan(1000); // 1 second
    expect(startupTime.jsInitTime).toBeLessThan(500);  // 500ms
  });

  it('should not regress from baseline', async () => {
    const current = await measureStartupTime();
    const baseline = require('./baseline.json');

    // Allow 10% regression tolerance
    const tolerance = 1.1;

    expect(current.coldStart).toBeLessThan(baseline.coldStart * tolerance);
  });
});
```

### Dashboard for Startup Metrics

```javascript
// components/PerformanceDashboard.js (dev only)
function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const report = StartupMetrics.getReport();
    setMetrics(report);
  }, []);

  if (!__DEV__ || !metrics) return null;

  return (
    <View style={styles.dashboard}>
      <Text style={styles.title}>Startup Metrics</Text>
      {metrics.measures.map((measure, index) => (
        <View key={index} style={styles.metric}>
          <Text>{measure.name}</Text>
          <Text style={styles.value}>{measure.duration.toFixed(2)}ms</Text>
        </View>
      ))}
      <Text style={styles.total}>
        Total: {metrics.totalStartupTime.toFixed(2)}ms
      </Text>
    </View>
  );
}
```

## Putting It All Together

Here's a comprehensive startup optimization checklist:

### Pre-Build Optimizations

1. Enable Hermes engine
2. Configure Metro bundler with inline requires
3. Set up RAM bundles for Android
4. Audit and remove unused dependencies
5. Replace heavy libraries with lighter alternatives

### Code-Level Optimizations

1. Implement lazy loading for screens and components
2. Use dynamic imports for features
3. Defer non-critical initialization with InteractionManager
4. Use conditional requires for platform-specific code
5. Implement prioritized initialization queue

### Native Optimizations

1. Optimize native module initialization
2. Configure efficient splash screens
3. Defer heavy native operations
4. Use lazy initialization patterns

### Monitoring

1. Implement startup metrics collection
2. Set up performance baselines
3. Configure automated performance tests
4. Integrate with analytics platforms

## Conclusion

Optimizing React Native app startup time is a continuous process that requires attention to multiple areas: JavaScript bundle optimization, native code efficiency, proper use of lazy loading, and ongoing monitoring. By implementing the techniques covered in this guide, you can achieve significant improvements in your app's startup performance.

Remember that optimization is iterative. Start by measuring your current startup time, identify the biggest bottlenecks, implement targeted optimizations, and measure again. Focus on the optimizations that provide the biggest impact for your specific app.

Key takeaways:

1. **Enable Hermes** - It's the single most impactful optimization for startup time
2. **Measure continuously** - You can't improve what you don't measure
3. **Defer non-critical work** - Not everything needs to load at startup
4. **Audit dependencies** - Third-party libraries often have hidden costs
5. **Use lazy loading** - Load code only when it's needed
6. **Implement proper splash screens** - Improve perceived performance

With these optimizations in place, your React Native app will launch faster, providing a better user experience and improved app store ratings.
