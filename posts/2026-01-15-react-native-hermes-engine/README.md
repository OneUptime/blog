# How to Use Hermes Engine for Better React Native Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Hermes, Performance, JavaScript Engine, Mobile Development, Optimization

Description: Learn how to enable and optimize the Hermes JavaScript engine in React Native for improved performance and smaller app sizes.

---

## Introduction

React Native has revolutionized mobile app development by enabling developers to build cross-platform applications using JavaScript. However, JavaScript execution performance has always been a critical factor in delivering smooth user experiences. Enter Hermes, a JavaScript engine specifically optimized for running React Native applications.

In this comprehensive guide, we will explore everything you need to know about Hermes, from understanding its architecture to implementing it in your projects and optimizing your applications for maximum performance.

## What is Hermes Engine?

Hermes is an open-source JavaScript engine developed by Meta (formerly Facebook) specifically designed to improve the performance of React Native applications. Unlike traditional JavaScript engines that were designed for web browsers, Hermes was built from the ground up with mobile constraints in mind.

### Key Characteristics of Hermes

Hermes focuses on three primary objectives:

1. **Fast Application Startup** - Hermes significantly reduces the time it takes for your app to become interactive
2. **Reduced Memory Usage** - Optimized memory management leads to better performance on resource-constrained devices
3. **Smaller Application Size** - Hermes can reduce overall app size compared with JavaScriptCore

### How Hermes Works

Hermes operates differently from traditional JavaScript engines. Instead of parsing and compiling JavaScript at runtime, Hermes uses ahead-of-time (AOT) compilation to convert JavaScript source code into optimized bytecode during the build process. This bytecode is then executed directly by the Hermes runtime on the device.

```javascript
// Traditional JS Engine Flow:
// Source Code -> Parse -> Compile -> Execute (all at runtime)

// Hermes Engine Flow:
// Build Time: Source Code -> Parse -> Compile -> Bytecode
// Runtime: Bytecode -> Execute
```

This approach eliminates the parsing and compilation overhead during app startup, resulting in significantly faster Time-to-Interactive (TTI) metrics.

## Hermes vs JavaScriptCore (JSC) Comparison

Before Hermes, React Native used JavaScriptCore (JSC) as its default JavaScript engine. Understanding the differences between these two engines is crucial for making informed decisions about your application architecture.

### Architecture Differences

| Feature | Hermes | JavaScriptCore |
|---------|--------|----------------|
| Compilation | Ahead-of-Time (AOT) bytecode | Runtime parsing/compilation; JIT only where the platform allows it |
| Bytecode Format | Custom optimized format | WebKit bytecode |
| Target Platform | Mobile-first | Browser-first |
| Memory Model | Optimized for mobile | General purpose |

### Performance Comparison

```text
Benchmark Results (typical improvements with Hermes):

App Startup Time:
- JSC: ~4.5 seconds
- Hermes: ~2.0 seconds
- Improvement: ~55% faster

Memory Usage:
- JSC: ~185 MB
- Hermes: ~136 MB
- Improvement: ~26% reduction

App Size:
- JSC: ~12 MB
- Hermes: ~8 MB
- Improvement: ~33% smaller
```

### When to Choose Hermes Over JSC

Hermes is recommended when:

- Your app has slow startup times
- Memory usage is a concern, especially on lower-end devices
- You want to reduce your app's download size
- You need consistent performance across different device types

JSC might still be preferred when:

- You need specific JavaScript features not yet supported by Hermes
- You have existing debugging workflows tied to JSC

## Enabling Hermes on Android

Starting with React Native 0.70, Hermes is enabled by default for new projects. However, if you are working with an older project or need to manually configure Hermes, follow these steps.

### Step 1: Update android/gradle.properties

First, ensure your project is configured to use Hermes. The new architecture flag is separate and should only be enabled when you are ready to adopt Fabric and TurboModules:

```properties
# android/gradle.properties

# Enable Hermes

hermesEnabled=true

# Optional: enable the new architecture separately
newArchEnabled=false
```

### Step 2: Configure android/app/build.gradle for older projects

For React Native versions before the Gradle plugin configuration was introduced, verify that your build.gradle file is set up correctly:

```groovy
// android/app/build.gradle

project.ext.react = [
    enableHermes: true,  // Enable Hermes
    hermesFlagsDebug: ["-O", "-output-source-map"],
    hermesFlagsRelease: ["-O", "-w"],
]

apply from: "../../node_modules/react-native/react.gradle"

android {
    // ... other configurations

    buildTypes {
        debug {
            // Hermes specific configurations for debug
        }
        release {
            // Enable ProGuard/R8 minification
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}

dependencies {
    // React Native adds the matching Hermes dependency when enableHermes is true
}
```

### Step 3: For React Native 0.70+

With newer versions of React Native, the configuration is simplified. Hermes is already the default in current React Native templates, but you can keep the flag explicit:

```groovy
// android/app/build.gradle

react {
    hermesEnabled = true
}
```

### Step 4: Clean and Rebuild

After making these changes, clean and rebuild your Android project:

```bash
# Navigate to android directory
cd android

# Clean the project
./gradlew clean

# Build the project
./gradlew assembleDebug

# Or for release
./gradlew assembleRelease
```

### Verifying Hermes is Enabled on Android

You can verify that Hermes is running in your application by checking the HermesInternal global:

```javascript
// App.js or any component
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

const App = () => {
    useEffect(() => {
        const isHermes = () => !!global.HermesInternal;
        console.log('Hermes enabled:', isHermes());
    }, []);

    return (
        <View>
            <Text>
                {global.HermesInternal ? 'Hermes Enabled' : 'Hermes Disabled'}
            </Text>
        </View>
    );
};

export default App;
```

## Enabling Hermes on iOS

Hermes support for iOS was introduced in React Native 0.64 and has been continuously improved. Hermes is enabled by default in current React Native templates, but older projects can still enable it explicitly.

### Step 1: Update Podfile

Modify your iOS Podfile to enable Hermes:

```ruby
# ios/Podfile

require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'
prepare_react_native_project!

# Enable Hermes
hermes_enabled = true

target 'YourAppName' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => hermes_enabled,
    :fabric_enabled => false,
    # Additional configuration options
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
end
```

### Step 2: For React Native 0.70+ projects

If you want to keep the setting explicit in a newer project:

```ruby
# ios/Podfile

hermes_enabled = true

target 'YourAppName' do
  use_react_native!(
    :hermes_enabled => hermes_enabled
  )
end
```

### Step 3: Install Pods and Build

After updating your Podfile, install the pods and rebuild:

```bash
# Navigate to ios directory
cd ios

# Install pods
pod install

# Return to project root
cd ..

# Build the iOS app
npx react-native run-ios
```

### Step 4: Xcode Configuration

If the iOS build fails after changing engines, clean derived data and rebuild:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx react-native run-ios --mode Debug
```

### Verifying Hermes on iOS

Use the same JavaScript check as Android:

```javascript
const checkHermes = () => {
    if (global.HermesInternal) {
        console.log('Hermes is enabled on iOS');
        console.log('Hermes version:', global.HermesInternal?.getRuntimeProperties?.()?.['OSS Release Version']);
    } else {
        console.log('Hermes is not enabled');
    }
};

checkHermes();
```

## Performance Benefits

Using Hermes brings numerous performance improvements to many React Native applications. Let us examine these benefits in detail.

### Faster Startup Time

The most significant benefit of Hermes is reduced Time-to-Interactive (TTI). This is achieved through:

1. **Bytecode Precompilation**: JavaScript is compiled to bytecode at build time
2. **On-demand Bytecode Loading**: Bytecode can be loaded into memory as needed
3. **Optimized Parsing**: Reduced parsing overhead at runtime

```javascript
// Before Hermes
// App startup: ~4000ms

// After Hermes
// App startup: ~1800ms

// Example performance measurement inside React Native JavaScript
const measureStartup = () => {
    const startTime = global.performance.now();

    // Your app initialization code

    const endTime = global.performance.now();
    console.log(`Startup time: ${endTime - startTime}ms`);
};
```

### Improved Frame Rates

Hermes contributes to smoother animations and interactions:

```javascript
const measureFrameRate = () => {
    let frameCount = 0;
    let lastTime = Date.now();

    const countFrame = () => {
        frameCount++;
        const currentTime = Date.now();

        if (currentTime - lastTime >= 1000) {
            console.log(`FPS: ${frameCount}`);
            frameCount = 0;
            lastTime = currentTime;
        }

        requestAnimationFrame(countFrame);
    };

    requestAnimationFrame(countFrame);
};
```

### Real-World Performance Metrics

Here are typical improvements seen in production applications:

```text
Performance Metrics Comparison:

Time to Interactive (TTI):
- Without Hermes: 3.8s
- With Hermes: 1.6s
- Improvement: 58%

JavaScript Execution Time:
- Without Hermes: 890ms
- With Hermes: 420ms
- Improvement: 53%

First Contentful Paint (FCP):
- Without Hermes: 2.1s
- With Hermes: 1.2s
- Improvement: 43%
```

## App Size Improvements

One of Hermes's key advantages is a reduction in overall application size for many apps.

### How Hermes Reduces App Size

Hermes can help reduce application size through:

1. **Bytecode vs Source Code**: Hermes bytecode can be more compact and faster to load than plain JavaScript
2. **Bundled Engine Size**: Hermes is optimized for React Native and is bundled with a matching React Native release
3. **Optimized Data Structures**: More efficient representation of code

### Measuring Bytecode Size

```bash
# Generate a JavaScript bundle and source map
npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output bundle.js \
    --sourcemap-output bundle.map

# Compile the generated bundle to Hermes bytecode with the hermesc binary
hermesc -O -emit-binary -out bundle.hbc bundle.js

# Compare file sizes
ls -la bundle.js
ls -la bundle.hbc  # Hermes bytecode bundle
```

### App Size Comparison Example

```text
App Size Analysis:

Plain JavaScript Bundle:
- bundle.js: 4.2 MB
- Minified: 1.8 MB

Hermes Bytecode Bundle:
- bundle.hbc: size varies by app and React Native version
- Improvement: measure against your own release build

Total APK Size Impact:
- Without Hermes: 45 MB
- With Hermes: 38 MB
- Savings: 7 MB (15.5%)
```

### Optimizing App Size with Hermes

```javascript
// babel.config.js - Optimize for Hermes
module.exports = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
        // Remove console logs in production
        ['transform-remove-console', { exclude: ['error', 'warn'] }],
        // Optimize lodash imports
        'lodash',
    ],
};
```

## Bytecode Precompilation

Bytecode precompilation is the cornerstone of Hermes's performance improvements. Understanding this process helps you optimize your build pipeline.

### How Bytecode Precompilation Works

```text
Compilation Pipeline:

1. Source Code (JavaScript)
   |
   v
2. Babel Transformation
   |
   v
3. Metro Bundling
   |
   v
4. Hermes Compilation (hermesc)
   |
   v
5. Bytecode Bundle (.hbc)
```

### Configuring Hermes Compiler Options

```groovy
// android/app/build.gradle
react {
    hermesEnabled = true

    // Flags passed to the Hermes compiler
    hermesFlags = ["-O", "-output-source-map"]
}
```

### Manual Bytecode Compilation

For advanced use cases, you can compile bytecode manually:

```bash
# Compile JavaScript to Hermes bytecode
hermesc -emit-binary -out bundle.hbc bundle.js

# With optimizations
hermesc -O -emit-binary -out bundle.hbc bundle.js

# Generate source maps
hermesc -emit-binary -output-source-map -out bundle.hbc bundle.js
```

### Verifying Bytecode

```bash
# Check if a file is valid Hermes bytecode
hbcdump bundle.hbc

# Get bytecode information
hbcdump -pretty-disassemble -c disassemble bundle.hbc
```

## Debugging with Hermes

Debugging React Native applications with Hermes requires some specific approaches and tools.

### React Native DevTools Integration

Hermes supports the modern React Native DevTools debugging experience:

1. Run your app in debug mode
2. Open the React Native Dev Menu and select "Open DevTools"
3. Or press `j` in the React Native CLI terminal
4. Use the Console, Sources, Components, Profiler, Network, and Memory panels to inspect the running app

### React Native DevTools and Flipper

React Native DevTools is the default debugging experience in current React Native versions. Flipper's bundled React Native integration was deprecated in React Native 0.73 and removed from newer templates, although Flipper can still be added manually for native debugging:

```java
// Enable Flipper in your app
// android/app/src/debug/java/com/yourapp/ReactNativeFlipper.java

import android.content.Context;

import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.react.ReactFlipperPlugin;
import com.facebook.react.ReactInstanceManager;

public class ReactNativeFlipper {
    public static void initializeFlipper(Context context, ReactInstanceManager reactInstanceManager) {
        final FlipperClient client = AndroidFlipperClient.getInstance(context);

        client.addPlugin(new InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()));
        client.addPlugin(new ReactFlipperPlugin());
        client.addPlugin(new NetworkFlipperPlugin());

        client.start();
    }
}
```

### Source Maps for Debugging

Hermes source maps are generated during native builds when source map output is enabled. For Metro configuration, extend React Native's default config rather than replacing it:

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

### Console Logging with Hermes

Hermes supports standard console methods:

```javascript
// Debugging utilities
const debugLog = (message, data) => {
    if (__DEV__) {
        console.log(`[DEBUG] ${message}`, data);
        console.trace('Stack trace');
    }
};

// Performance timing
console.time('operation');
// ... your code
console.timeEnd('operation');

// Group related logs
console.group('User Actions');
console.log('Action 1');
console.log('Action 2');
console.groupEnd();
```

## Hermes Profiler Usage

The Hermes profiler is a powerful tool for identifying performance bottlenecks in your application.

### Enabling the Profiler

```javascript
// Enable Hermes profiling
const startProfiling = () => {
    if (global.HermesInternal) {
        global.HermesInternal.enableSamplingProfiler?.();
        console.log('Hermes profiler enabled');
    }
};

const stopProfiling = () => {
    if (global.HermesInternal) {
        const profilePath = global.HermesInternal.disableSamplingProfiler?.();
        console.log('Profile saved to:', profilePath);
        return profilePath;
    }
};
```

### Using the Profiler in Development

```javascript
// Profile a specific operation
import { Button, View } from 'react-native';

const ProfiledComponent = () => {
    const handleProfile = async () => {
        // Start profiling
        if (global.HermesInternal?.enableSamplingProfiler) {
            global.HermesInternal.enableSamplingProfiler();
        }

        // Perform operations to profile
        await performExpensiveOperation();

        // Stop profiling and get results
        if (global.HermesInternal?.disableSamplingProfiler) {
            const profile = global.HermesInternal.disableSamplingProfiler();
            console.log('Profile data:', profile);
        }
    };

    return (
        <View>
            <Button title="Start Profiling" onPress={handleProfile} />
        </View>
    );
};
```

### Analyzing Profiler Output

The Hermes profiler output can be converted to a Chrome DevTools-compatible format:

```bash
# Convert Hermes profile to Chrome trace format
npx react-native profile-hermes

# Or use the standalone transformer package
npx hermes-profile-transformer profile.cpuprofile

# Open the trace in Chrome
# 1. Open Chrome
# 2. Navigate to chrome://tracing
# 3. Load the converted trace file
```

### Command Line Profiling

```bash
# Profile your app from the command line
adb shell am broadcast \
    -a com.facebook.react.ACTION_START_SAMPLING_PROFILER \
    -n com.yourapp/.MainActivity

# Run your app operations...

# Stop profiling
adb shell am broadcast \
    -a com.facebook.react.ACTION_STOP_SAMPLING_PROFILER \
    -n com.yourapp/.MainActivity

# Pull the profile from the device
adb pull /data/data/com.yourapp/cache/sampling-profiler-*.cpuprofile
```

## Memory Usage Improvements

Hermes provides significant memory optimizations that are crucial for mobile applications.

### Memory Model Differences

```text
Memory Allocation Comparison:

JavaScriptCore:
- Initial heap: ~50 MB
- Peak usage: ~200 MB
- GC pressure: High

Hermes:
- Initial heap: ~30 MB
- Peak usage: ~136 MB
- GC pressure: Low
```

### Memory Optimization Techniques

```javascript
// Optimize memory usage with Hermes

// 1. Use WeakMap for object-keyed caching
const cache = new WeakMap();

const getCachedData = (key) => {
    if (cache.has(key)) {
        return cache.get(key);
    }
    const data = fetchData(key);
    cache.set(key, data);
    return data;
};

// 2. Clean up listeners and subscriptions
import { useEffect } from 'react';

const MemoryEfficientComponent = () => {
    useEffect(() => {
        const subscription = eventEmitter.addListener('event', handler);

        // Clean up on unmount
        return () => {
            subscription.remove();
        };
    }, []);

    return null;
};

// 3. Avoid memory leaks with proper cleanup
class DataManager {
    constructor() {
        this.data = [];
        this.listeners = new Set();
    }

    cleanup() {
        this.data = [];
        this.listeners.clear();
    }
}
```

### Monitoring Memory Usage

```javascript
// Monitor memory in development
const logMemoryUsage = () => {
    if (global.HermesInternal) {
        const runtimeProperties = global.HermesInternal.getRuntimeProperties?.();
        if (runtimeProperties) {
            console.log('Hermes Runtime Properties:', runtimeProperties);
        }
    }

    // Native memory info (requires native module)
    if (global.nativePerformanceNow) {
        console.log('Performance timestamp:', global.nativePerformanceNow());
    }
};

// Call periodically in development
if (__DEV__) {
    setInterval(logMemoryUsage, 10000);
}
```

### Garbage Collection with Hermes

Hermes uses a garbage collector optimized for mobile:

```javascript
// Understanding GC behavior
// Hermes is designed to reduce memory use and GC pause impact in mobile apps

// Force garbage collection (development only)
if (__DEV__ && global.gc) {
    global.gc();
}

// Monitor operation timing; use native profilers for precise memory data
const monitorGC = () => {
    const start = global.performance.now();

    // Perform operations
    performOperations();

    const end = global.performance.now();
    console.log(`Operation time: ${end - start}ms`);
};
```

## Compatibility Considerations

While Hermes provides excellent performance, there are some compatibility considerations to keep in mind.

### JavaScript Feature Support

Hermes supports ES6+ features with some exceptions:

```javascript
// Supported JavaScript syntax in React Native through Hermes and Babel
const obj = { property: 'supported' };
const value = null;

const supportedFeatures = {
    arrowFunctions: () => 'supported',
    classes: class Example {},
    templateLiterals: `supported`,
    destructuring: (() => {
        const { a, b } = { a: 1, b: 2 };
        return { a, b };
    })(),
    spreadOperator: [1, 2, 3],
    asyncAwait: async (promise) => await promise,
    optionalChaining: obj?.property,
    nullishCoalescing: value ?? 'default',
};

// Use feature detection for runtime APIs such as Intl, WeakRef, or BigInt.
```

### Checking Feature Support

```javascript
// Check for specific feature support
const checkFeatureSupport = () => {
    const features = {
        proxy: typeof Proxy !== 'undefined',
        weakRef: typeof WeakRef !== 'undefined',
        bigInt: typeof BigInt !== 'undefined',
        intl: typeof Intl !== 'undefined',
        symbolIterator: typeof Symbol.iterator !== 'undefined',
    };

    console.log('Feature support:', features);
    return features;
};

// Use feature detection
const safeProxy = (target, handler) => {
    if (typeof Proxy !== 'undefined') {
        return new Proxy(target, handler);
    }
    console.warn('Proxy not supported, using fallback');
    return target;
};
```

### Library Compatibility

Some libraries may need configuration for Hermes:

```javascript
// babel.config.js - Handling library compatibility
module.exports = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
        // Ensure compatibility with older syntax
        '@babel/plugin-transform-flow-strip-types',

        // Handle decorator syntax
        ['@babel/plugin-proposal-decorators', { legacy: true }],

        // Add library-specific transforms only when a dependency requires them
    ],
};
```

### Handling Incompatibilities

```javascript
// Polyfill pattern for missing features
if (!global.Intl) {
    global.Intl = require('intl');
    require('intl/locale-data/jsonp/en');
}

// Alternative implementations
const formatNumber = (num, locale = 'en-US') => {
    if (global.Intl?.NumberFormat) {
        return new Intl.NumberFormat(locale).format(num);
    }
    // Fallback implementation
    return num.toLocaleString();
};
```

## Best Practices with Hermes

Follow these best practices to get the most out of Hermes in your React Native applications.

### Code Optimization

```javascript
// 1. Use inline requires for faster startup
const LazyComponent = () => {
    const HeavyLibrary = require('heavy-library');
    return <HeavyLibrary.Component />;
};

// 2. Optimize imports
// Bad: Import entire library
import _ from 'lodash';

// Good: Import only needed functions
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// 3. Use const and let instead of var
const immutableValue = 'constant';
let mutableValue = 'can change';

// 4. Prefer arrow functions for lexical this
class Component {
    handlePress = () => {
        // 'this' is correctly bound
        this.setState({ pressed: true });
    };
}
```

### Build Configuration Best Practices

```groovy
// android/app/build.gradle
android {
    buildTypes {
        release {
            // Enable minification
            minifyEnabled true
            shrinkResources true

            // ProGuard rules for Hermes
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

}
```

### Metro Configuration

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
        babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
        assetExts: assetExts.filter(ext => ext !== 'svg'),
        sourceExts: [...sourceExts, 'svg'],
    },
};

module.exports = mergeConfig(defaultConfig, config);
```

### Performance Monitoring

```javascript
// Implement performance monitoring
class PerformanceMonitor {
    static marks = {};

    static mark(name) {
        this.marks[name] = global.performance.now();
    }

    static measure(name, startMark, endMark) {
        const start = this.marks[startMark];
        const end = this.marks[endMark] || global.performance.now();
        const duration = end - start;

        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    static measureComponent(componentName, renderFn) {
        this.mark(`${componentName}_start`);
        const result = renderFn();
        this.mark(`${componentName}_end`);
        this.measure(
            `${componentName} render`,
            `${componentName}_start`,
            `${componentName}_end`
        );
        return result;
    }
}
```

### Error Handling

```javascript
// Proper error handling with Hermes
import { ErrorUtils } from 'react-native';

// Global error handler
const globalErrorHandler = (error, isFatal) => {
    console.error('Global error:', error);
    console.error('Is fatal:', isFatal);

    // Report to crash analytics
    crashAnalytics.recordError(error, { isFatal });
};

ErrorUtils.setGlobalHandler(globalErrorHandler);

// Component error boundary
class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Component error:', error);
        console.error('Error info:', errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <FallbackComponent />;
        }
        return this.props.children;
    }
}
```

### Testing with Hermes

```javascript
// jest.config.js - Configure Jest for Hermes
module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|react-native-.*)/)',
    ],
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};

// Test performance characteristics
describe('Performance Tests', () => {
    it('should complete operation within threshold', async () => {
        const start = performance.now();

        await performOperation();

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // 100ms threshold
    });
});
```

## Troubleshooting Common Issues

### Build Errors

```bash
# Clear all caches and rebuild
cd android && ./gradlew clean && cd ..
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

### Runtime Errors

```javascript
// Debug Hermes-specific issues
if (global.HermesInternal) {
    console.log('Hermes Runtime Properties:');
    console.log(global.HermesInternal.getRuntimeProperties?.());
}

// Check for unsupported features
const checkUnsupportedFeatures = () => {
    try {
        // Test feature
        eval('const proxy = new Proxy({}, {})');
    } catch (error) {
        console.warn('Feature not supported:', error.message);
    }
};
```

### Performance Issues

```javascript
// Identify performance bottlenecks
const diagnosePerformance = () => {
    // Check JS thread blocking
    const jsThreadCheck = setInterval(() => {
        const now = Date.now();
        setTimeout(() => {
            const delay = Date.now() - now - 100;
            if (delay > 16) {
                console.warn(`JS thread blocked for ${delay}ms`);
            }
        }, 100);
    }, 1000);

    return () => clearInterval(jsThreadCheck);
};
```

## Conclusion

Hermes is a powerful JavaScript engine that can significantly improve the performance of your React Native applications. By understanding its architecture, properly configuring it for both Android and iOS, and following best practices, you can achieve:

- Up to 50-70% faster app startup times
- 20-30% reduction in memory usage
- Smaller app sizes for many apps
- Smoother animations and interactions

Key takeaways:

1. **Use Hermes** in your project configuration for both platforms
2. **Use bytecode precompilation** to optimize startup time
3. **Monitor performance** using the Hermes profiler and debugging tools
4. **Follow best practices** for code organization and optimization
5. **Test thoroughly** to ensure compatibility with all your dependencies

As React Native continues to evolve with the new architecture (Fabric and TurboModules), Hermes will become even more integral to achieving optimal performance. Start integrating Hermes into your projects today to provide your users with the best possible mobile experience.

## Additional Resources

- [Official Hermes Documentation](https://hermesengine.dev/)
- [React Native Performance Guide](https://reactnative.dev/docs/performance)
- [Hermes GitHub Repository](https://github.com/facebook/hermes)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [Metro Bundler Configuration](https://facebook.github.io/metro/docs/configuration)

---

By following this comprehensive guide, you should now have a solid understanding of how to leverage Hermes to build faster, more efficient React Native applications. Happy coding!
