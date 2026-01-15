# How to Reduce React Native App Bundle Size for Faster Downloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Bundle Size, Optimization, Performance, Mobile Development, App Store

Description: Learn techniques to reduce your React Native app bundle size for faster downloads and better user experience.

---

## Introduction

In the mobile app ecosystem, bundle size matters more than you might think. A larger app bundle means longer download times, higher data usage for users, and potentially fewer installations. Studies show that for every 6MB increase in app size, install conversion rates drop by approximately 1%. For React Native applications, which inherently include a JavaScript runtime and bridge, optimizing bundle size becomes even more critical.

This comprehensive guide walks you through proven strategies to reduce your React Native app bundle size, from analyzing what's consuming space to implementing advanced optimization techniques. Whether you're targeting the Google Play Store, Apple App Store, or both, these techniques will help you deliver a leaner, faster application.

## Why Bundle Size Matters

Before diving into optimization techniques, let's understand why bundle size is crucial:

1. **User Experience**: Smaller apps download faster, especially on slower networks
2. **Installation Rates**: Users are more likely to complete downloads of smaller apps
3. **Storage Constraints**: Users with limited device storage may skip larger apps
4. **App Store Limits**: Google Play warns users about apps over 150MB; Apple has a 200MB cellular download limit
5. **Update Frequency**: Smaller updates mean users are more likely to keep apps current

## Analyzing Your Bundle Size

The first step in optimization is understanding what's contributing to your bundle size. You can't optimize what you don't measure.

### Using React Native Bundle Visualizer

The `react-native-bundle-visualizer` package provides an interactive treemap of your bundle:

```bash
# Install the package
npm install --save-dev react-native-bundle-visualizer

# Run the visualizer
npx react-native-bundle-visualizer
```

This generates an interactive HTML report showing exactly which modules and dependencies consume the most space.

### Analyzing Android APK

For Android, you can use Android Studio's APK Analyzer:

1. Build your release APK: `cd android && ./gradlew assembleRelease`
2. Open Android Studio
3. Navigate to Build > Analyze APK
4. Select your APK from `android/app/build/outputs/apk/release/`

The analyzer breaks down:
- **classes.dex**: Compiled Java/Kotlin code
- **lib/**: Native libraries for different architectures
- **res/**: Resources like layouts and drawables
- **assets/**: JavaScript bundle and other assets

### Analyzing iOS IPA

For iOS, use Xcode's App Thinning report:

1. Archive your app in Xcode
2. Select "Distribute App" > "Development"
3. Check "App Thinning" and select "All compatible device variants"
4. Export and review the App Thinning Size Report

### Source Map Explorer

For detailed JavaScript bundle analysis:

```bash
# Install source-map-explorer
npm install --save-dev source-map-explorer

# Generate bundle with source maps
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output android-release.bundle --sourcemap-output android-release.bundle.map

# Analyze the bundle
npx source-map-explorer android-release.bundle android-release.bundle.map
```

## Metro Bundler Optimization

Metro is React Native's JavaScript bundler. Optimizing its configuration can significantly reduce bundle size.

### Configure metro.config.js

Create or update your `metro.config.js`:

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Enable inline requires for smaller bundles
      },
    }),
    minifierConfig: {
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
      },
      output: {
        ascii_only: true,
        quote_style: 3,
        wrap_iife: true,
      },
      sourceMap: {
        includeSources: false,
      },
      toplevel: true,
      compress: {
        reduce_funcs: false,
        drop_console: true, // Remove console.log statements in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
  },
  resolver: {
    // Exclude unnecessary files from the bundle
    blockList: [
      /node_modules\/.*\/__(tests|mocks|fixtures)__\/.*/,
      /node_modules\/.*\.(test|spec)\.(js|ts|tsx)$/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### Inline Requires

Inline requires defer the loading of modules until they're actually needed:

```javascript
// Before: Module loaded immediately
import HeavyComponent from './HeavyComponent';

function MyScreen() {
  const [showHeavy, setShowHeavy] = useState(false);
  return showHeavy ? <HeavyComponent /> : <Button onPress={() => setShowHeavy(true)} />;
}

// After: Module loaded only when needed
function MyScreen() {
  const [showHeavy, setShowHeavy] = useState(false);

  const HeavyComponent = showHeavy ? require('./HeavyComponent').default : null;

  return showHeavy ? <HeavyComponent /> : <Button onPress={() => setShowHeavy(true)} />;
}
```

## Tree Shaking Unused Code

Tree shaking eliminates dead code from your bundle. While Metro has limited tree shaking compared to webpack, you can still benefit from it.

### Use ES Modules

Always use ES module syntax for better tree shaking:

```javascript
// Bad: CommonJS - entire module is included
const _ = require('lodash');
const result = _.map(array, fn);

// Good: ES Modules - only map function is included
import { map } from 'lodash-es';
const result = map(array, fn);

// Better: Import specific functions
import map from 'lodash/map';
const result = map(array, fn);
```

### Configure Babel for Tree Shaking

Update your `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Transform imports for better tree shaking
    ['babel-plugin-transform-imports', {
      'lodash': {
        transform: 'lodash/${member}',
        preventFullImport: true,
      },
      '@mui/material': {
        transform: '@mui/material/${member}',
        preventFullImport: true,
      },
      '@mui/icons-material': {
        transform: '@mui/icons-material/${member}',
        preventFullImport: true,
      },
    }],
    // Remove prop-types in production
    ['transform-react-remove-prop-types', {
      mode: 'remove',
      removeImport: true,
      ignoreFilenames: ['node_modules'],
    }],
  ],
  env: {
    production: {
      plugins: [
        'transform-remove-console', // Remove console.* calls
      ],
    },
  },
};
```

### Analyze and Remove Dead Code

Use tools to identify unused exports:

```bash
# Install ts-prune for TypeScript projects
npm install -g ts-prune

# Find unused exports
ts-prune | grep -v '(used in module)'
```

## Optimizing Images and Assets

Images often constitute the largest portion of app size. Proper optimization can dramatically reduce bundle size.

### Choose the Right Format

| Format | Best For | Compression |
|--------|----------|-------------|
| WebP | Photos, complex images | 25-35% smaller than PNG/JPEG |
| PNG | Icons, simple graphics with transparency | Lossless |
| JPEG | Photos without transparency | Lossy, configurable quality |
| SVG | Icons, logos, simple graphics | Vector, infinitely scalable |

### Convert to WebP

```bash
# Install cwebp
brew install webp  # macOS
apt-get install webp  # Ubuntu

# Convert single image
cwebp -q 80 input.png -o output.webp

# Batch convert all PNGs in a directory
for file in *.png; do cwebp -q 80 "$file" -o "${file%.png}.webp"; done
```

### Use SVG for Icons

Replace PNG icons with SVG using `react-native-svg`:

```javascript
import Svg, { Path } from 'react-native-svg';

const HomeIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </Svg>
);
```

### Optimize Existing Images

Create a script to optimize all images:

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

const QUALITY = 80;
const MAX_WIDTH = 1920;

async function optimizeImages() {
  const images = glob.sync('src/**/*.{png,jpg,jpeg}');

  for (const imagePath of images) {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Skip already optimized images
    if (metadata.width <= MAX_WIDTH) continue;

    const outputPath = imagePath.replace(/\.(png|jpg|jpeg)$/, '.webp');

    await image
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const originalSize = fs.statSync(imagePath).size;
    const newSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`${path.basename(imagePath)}: ${savings}% smaller`);
  }
}

optimizeImages();
```

### Use Resolution-Specific Assets

React Native automatically selects the appropriate resolution:

```
assets/
  icon.png      # @1x (mdpi)
  icon@2x.png   # @2x (xhdpi)
  icon@3x.png   # @3x (xxhdpi)
```

For Android, consider using vector drawables for icons instead of multiple PNG files.

## Enabling ProGuard for Android

ProGuard shrinks, optimizes, and obfuscates your Java code, significantly reducing APK size.

### Enable ProGuard

Update `android/app/build.gradle`:

```groovy
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Configure ProGuard Rules

Create or update `android/app/proguard-rules.pro`:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# OkHttp (if using)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Retrofit (if using)
-keepattributes Signature
-keepattributes Exceptions
-keep class retrofit2.** { *; }

# Remove logging
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Optimization
-optimizationpasses 5
-allowaccessmodification
-dontpreverify
```

### Using R8 (Recommended)

R8 is the default code shrinker in Android Gradle Plugin 3.4+ and is more efficient than ProGuard:

```groovy
// android/gradle.properties
android.enableR8=true
android.enableR8.fullMode=true
```

## Bitcode and iOS Optimization

### App Thinning

iOS App Thinning automatically optimizes your app for each device. Ensure it's enabled:

1. In Xcode, select your target
2. Go to Build Settings
3. Set "Enable Bitcode" to Yes (for supported architectures)
4. Build Settings > "Strip Debug Symbols During Copy" = Yes

### Remove Unused Architectures

Update your Podfile to exclude simulator architectures in release builds:

```ruby
# ios/Podfile
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Remove simulator architectures for release builds
      if config.name == 'Release'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      end

      # Strip unused architectures
      config.build_settings['STRIP_INSTALLED_PRODUCT'] = 'YES'
      config.build_settings['STRIP_STYLE'] = 'all'
    end
  end
end
```

### Dead Code Stripping

Enable dead code stripping in Xcode:

```
Build Settings:
  - Dead Code Stripping: Yes
  - Strip Debug Symbols During Copy: Yes
  - Strip Linked Product: Yes
  - Strip Style: All Symbols
```

## App Bundle vs APK

### Understanding Android App Bundles

Android App Bundles (AAB) allow Google Play to generate optimized APKs for each device configuration:

```groovy
// android/app/build.gradle
android {
    bundle {
        language {
            enableSplit = true  // Split by language
        }
        density {
            enableSplit = true  // Split by screen density
        }
        abi {
            enableSplit = true  // Split by CPU architecture
        }
    }
}
```

### Building an App Bundle

```bash
cd android
./gradlew bundleRelease
```

The bundle is generated at `android/app/build/outputs/bundle/release/app-release.aab`.

### Size Savings

App Bundles typically provide 15-35% size reduction compared to universal APKs because users download only the resources needed for their specific device.

### Testing App Bundles Locally

Use `bundletool` to test how your app bundle will be delivered:

```bash
# Install bundletool
brew install bundletool

# Generate APKs from bundle
bundletool build-apks \
  --bundle=app-release.aab \
  --output=app-release.apks \
  --ks=my-release-key.keystore \
  --ks-pass=pass:keystore-password \
  --ks-key-alias=my-key-alias \
  --key-pass=pass:key-password

# Check the size
bundletool get-size total --apks=app-release.apks
```

## Dynamic Imports and Code Splitting

While React Native doesn't support code splitting as comprehensively as web applications, you can still implement lazy loading patterns.

### Lazy Loading Screens

```javascript
import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Lazy load heavy screens
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'));

const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

// In your navigator
function AppNavigator() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
```

### Conditional Feature Loading

```javascript
// features/index.js
export const loadFeature = async (featureName) => {
  switch (featureName) {
    case 'charts':
      return await import('./charts');
    case 'camera':
      return await import('./camera');
    case 'maps':
      return await import('./maps');
    default:
      throw new Error(`Unknown feature: ${featureName}`);
  }
};

// Usage
const ChartsFeature = () => {
  const [ChartComponent, setChartComponent] = useState(null);

  useEffect(() => {
    loadFeature('charts').then(module => {
      setChartComponent(() => module.default);
    });
  }, []);

  if (!ChartComponent) return <LoadingSpinner />;
  return <ChartComponent />;
};
```

### RAM Bundles (Advanced)

For very large apps, consider using RAM bundles to load JavaScript modules on demand:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    // Enable RAM bundle format
    createModuleIdFactory: require('metro/src/lib/createModuleIdFactory'),
  },
};
```

Build with RAM bundle format:

```bash
# For Android
npx react-native ram-bundle --platform android --dev false \
  --entry-file index.js --bundle-output android.bundle

# For iOS
npx react-native ram-bundle --platform ios --dev false \
  --entry-file index.js --bundle-output ios.bundle
```

## Removing Unused Dependencies

Dependencies can quickly bloat your bundle. Regular audits are essential.

### Analyze Dependencies

```bash
# List all dependencies with their sizes
npx cost-of-modules

# Find unused dependencies
npx depcheck

# Analyze dependency tree
npm ls --all
```

### Common Bloated Dependencies

Replace these common heavy dependencies with lighter alternatives:

| Heavy Package | Size | Alternative | Size |
|--------------|------|-------------|------|
| moment | 290KB | date-fns | 75KB (tree-shakeable) |
| lodash | 531KB | lodash-es (tree-shakeable) | Only imported functions |
| axios | 29KB | Native fetch | 0KB |
| uuid | 12KB | nanoid | 1KB |

### Replacing Moment.js

```javascript
// Before: moment (290KB)
import moment from 'moment';
const formatted = moment().format('YYYY-MM-DD');

// After: date-fns (only ~2KB for format function)
import { format } from 'date-fns';
const formatted = format(new Date(), 'yyyy-MM-dd');
```

### Auditing Native Dependencies

Some npm packages include native code that adds significant size:

```bash
# List native dependencies
npx react-native config | grep -A 20 "dependencies"
```

Review each native dependency and consider if it's truly necessary. Native libraries like `react-native-maps`, `react-native-camera`, or `react-native-webview` can add several MB each.

## Font Subsetting

Custom fonts often include thousands of glyphs you'll never use. Font subsetting removes unnecessary characters.

### Using Glyphhanger

```bash
# Install glyphhanger
npm install -g glyphhanger

# Subset font to only include characters you use
glyphhanger --subset=CustomFont.ttf --whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-_()[]{}@#$%^&*+=:;'\"/\\|~\`<>€£¥"

# Or subset based on actual usage in your app
glyphhanger http://localhost:3000 --subset=CustomFont.ttf
```

### Using fonttools

```bash
# Install fonttools
pip install fonttools

# Subset font
pyftsubset "CustomFont.ttf" \
  --output-file="CustomFont-subset.ttf" \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features="*"
```

### Font Loading Strategy

Instead of bundling fonts, consider loading them at runtime:

```javascript
import { useFonts } from 'expo-font';
// or
import { Font } from 'expo-font';

// Load fonts asynchronously
const [fontsLoaded] = useFonts({
  'CustomFont-Regular': require('./assets/fonts/CustomFont-Regular.ttf'),
  'CustomFont-Bold': require('./assets/fonts/CustomFont-Bold.ttf'),
});
```

### System Fonts

When possible, use system fonts to avoid bundling any font files:

```javascript
const styles = StyleSheet.create({
  text: {
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
});
```

## Hermes Engine Benefits

Hermes is a JavaScript engine optimized for React Native, offering significant improvements in bundle size, memory usage, and startup time.

### Enabling Hermes

For Android, update `android/app/build.gradle`:

```groovy
project.ext.react = [
    enableHermes: true
]
```

For iOS, update `ios/Podfile`:

```ruby
use_react_native!(
  :hermes_enabled => true
)
```

Then reinstall pods:

```bash
cd ios && pod install
```

### Hermes Benefits

1. **Smaller Bundle Size**: Hermes compiles JavaScript to bytecode, which is more compact
2. **Faster Startup**: Bytecode loads faster than parsing JavaScript
3. **Lower Memory Usage**: More efficient memory management
4. **Better Performance**: Optimized for mobile devices

### Bytecode Compilation

Hermes precompiles JavaScript to bytecode:

```bash
# The Hermes bytecode is generated automatically during release builds
# You can manually compile for testing:
npx hermes -emit-binary -out bundle.hbc bundle.js
```

### Measuring Hermes Impact

Compare bundle sizes before and after enabling Hermes:

```bash
# Without Hermes
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output bundle.js
ls -la bundle.js

# With Hermes (bytecode)
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output bundle.hbc
ls -la bundle.hbc
```

Typical savings: 30-50% smaller JavaScript bundle size.

## Monitoring Bundle Size in CI

Automated bundle size monitoring prevents regressions and ensures optimizations persist over time.

### GitHub Actions Workflow

Create `.github/workflows/bundle-size.yml`:

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main, master]

jobs:
  bundle-size:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Android Bundle
        run: |
          npx react-native bundle \
            --platform android \
            --dev false \
            --entry-file index.js \
            --bundle-output android.bundle

      - name: Build iOS Bundle
        run: |
          npx react-native bundle \
            --platform ios \
            --dev false \
            --entry-file index.js \
            --bundle-output ios.bundle

      - name: Check bundle sizes
        run: |
          ANDROID_SIZE=$(wc -c < android.bundle)
          IOS_SIZE=$(wc -c < ios.bundle)

          echo "Android bundle: $ANDROID_SIZE bytes"
          echo "iOS bundle: $IOS_SIZE bytes"

          # Fail if bundles exceed limits (adjust as needed)
          MAX_SIZE=5000000  # 5MB

          if [ $ANDROID_SIZE -gt $MAX_SIZE ]; then
            echo "Android bundle exceeds $MAX_SIZE bytes!"
            exit 1
          fi

          if [ $IOS_SIZE -gt $MAX_SIZE ]; then
            echo "iOS bundle exceeds $MAX_SIZE bytes!"
            exit 1
          fi

      - name: Upload bundle analysis
        uses: actions/upload-artifact@v4
        with:
          name: bundle-analysis
          path: |
            android.bundle
            ios.bundle

  analyze-dependencies:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Analyze dependencies
        run: |
          npx cost-of-modules --less > dependency-costs.txt
          cat dependency-costs.txt

      - name: Check for unused dependencies
        run: |
          npx depcheck --json > depcheck-results.json
          cat depcheck-results.json
```

### Bundle Size Comparison Action

Create a custom action to compare bundle sizes between branches:

```yaml
# .github/workflows/bundle-comparison.yml
name: Bundle Size Comparison

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  compare:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies (PR)
        run: npm ci

      - name: Build PR bundle
        run: |
          npx react-native bundle \
            --platform android \
            --dev false \
            --entry-file index.js \
            --bundle-output pr-bundle.js

      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.base_ref }}
          clean: false

      - name: Install dependencies (base)
        run: npm ci

      - name: Build base bundle
        run: |
          npx react-native bundle \
            --platform android \
            --dev false \
            --entry-file index.js \
            --bundle-output base-bundle.js

      - name: Compare sizes
        id: compare
        run: |
          PR_SIZE=$(wc -c < pr-bundle.js)
          BASE_SIZE=$(wc -c < base-bundle.js)
          DIFF=$((PR_SIZE - BASE_SIZE))
          PERCENT=$(echo "scale=2; ($DIFF / $BASE_SIZE) * 100" | bc)

          echo "pr_size=$PR_SIZE" >> $GITHUB_OUTPUT
          echo "base_size=$BASE_SIZE" >> $GITHUB_OUTPUT
          echo "diff=$DIFF" >> $GITHUB_OUTPUT
          echo "percent=$PERCENT" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const prSize = ${{ steps.compare.outputs.pr_size }};
            const baseSize = ${{ steps.compare.outputs.base_size }};
            const diff = ${{ steps.compare.outputs.diff }};
            const percent = ${{ steps.compare.outputs.percent }};

            const emoji = diff > 0 ? '' : '';
            const sign = diff > 0 ? '+' : '';

            const body = `## Bundle Size Report ${emoji}

            | Metric | Value |
            |--------|-------|
            | Base bundle | ${(baseSize / 1024).toFixed(2)} KB |
            | PR bundle | ${(prSize / 1024).toFixed(2)} KB |
            | Difference | ${sign}${(diff / 1024).toFixed(2)} KB (${sign}${percent}%) |
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Pre-commit Hooks

Add bundle size checks to pre-commit hooks:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Quick bundle size check
echo "Checking bundle size..."

# Build a quick bundle analysis
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle-check.js \
  --reset-cache 2>/dev/null

SIZE=$(wc -c < /tmp/bundle-check.js)
MAX_SIZE=5000000  # 5MB

if [ $SIZE -gt $MAX_SIZE ]; then
  echo "Bundle size ($SIZE bytes) exceeds maximum ($MAX_SIZE bytes)"
  echo "Please optimize your bundle before committing."
  exit 1
fi

echo "Bundle size OK: $SIZE bytes"
```

## Advanced Optimization Techniques

### Native Module Optimization

If you have custom native modules, ensure they're optimized:

```java
// Android: Use ProGuard consumer rules in your native module
// android/src/main/proguard-rules.pro
-keep class com.yourmodule.** { *; }
-keepclassmembers class com.yourmodule.** { *; }
```

```objectivec
// iOS: Mark unused code as dead
#if !DEBUG
  // This code will be stripped in release builds
#endif
```

### Removing Debug Code

Create a build-time flag system:

```javascript
// config.js
export const __DEV__ = process.env.NODE_ENV !== 'production';

// Usage
if (__DEV__) {
  console.log('Debug info:', data);
  // This entire block will be removed in production
}
```

### Asset Compression

Compress assets during the build process:

```javascript
// scripts/compress-assets.js
const zlib = require('zlib');
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('assets/**/*.json');

files.forEach(file => {
  const content = fs.readFileSync(file);
  const compressed = zlib.gzipSync(content);
  fs.writeFileSync(`${file}.gz`, compressed);

  console.log(`${file}: ${content.length} -> ${compressed.length} bytes`);
});
```

## Checklist: Bundle Size Optimization

Use this checklist to ensure you've covered all optimization opportunities:

### Analysis
- [ ] Run bundle visualizer to identify large modules
- [ ] Analyze APK with Android Studio
- [ ] Generate iOS App Thinning report
- [ ] Review dependency sizes with cost-of-modules

### JavaScript Optimization
- [ ] Enable inline requires in Metro config
- [ ] Configure Babel for production optimizations
- [ ] Remove console.log statements in production
- [ ] Implement lazy loading for heavy screens
- [ ] Use ES modules for better tree shaking

### Dependencies
- [ ] Remove unused dependencies (depcheck)
- [ ] Replace heavy libraries with lighter alternatives
- [ ] Audit native module necessity

### Assets
- [ ] Convert images to WebP format
- [ ] Use SVG for icons and simple graphics
- [ ] Implement resolution-specific assets
- [ ] Subset custom fonts
- [ ] Consider system fonts where appropriate

### Android Specific
- [ ] Enable ProGuard/R8 minification
- [ ] Enable resource shrinking
- [ ] Build and publish as App Bundle (AAB)
- [ ] Enable Hermes engine

### iOS Specific
- [ ] Enable Bitcode (where supported)
- [ ] Enable dead code stripping
- [ ] Remove unused architectures
- [ ] Verify App Thinning is working

### CI/CD
- [ ] Set up bundle size monitoring
- [ ] Configure size limits in CI
- [ ] Add bundle comparison for PRs
- [ ] Set up pre-commit hooks

## Conclusion

Reducing your React Native app's bundle size is an ongoing process that requires attention during development and throughout the app's lifecycle. By implementing the techniques covered in this guide, including proper bundle analysis, Metro optimization, image compression, ProGuard configuration, Hermes adoption, and CI monitoring, you can significantly reduce your app's download size and improve user experience.

Remember these key takeaways:

1. **Measure First**: Always analyze your bundle before optimizing. Tools like react-native-bundle-visualizer and Android Studio's APK Analyzer are invaluable.

2. **Target the Big Wins**: Focus on the largest contributors to bundle size first. Usually, these are images, fonts, and heavy dependencies.

3. **Automate Monitoring**: Set up CI pipelines to track bundle size changes and prevent regressions.

4. **Use Platform Features**: Take advantage of Android App Bundles and iOS App Thinning for significant automatic optimizations.

5. **Enable Hermes**: The Hermes engine provides substantial improvements in bundle size, startup time, and memory usage.

6. **Regular Audits**: Schedule periodic dependency audits to remove unused packages and update to lighter alternatives.

By following these practices, you'll deliver a faster, more efficient app that users are more likely to download and keep on their devices. Start with the techniques that provide the biggest impact for your specific app, and progressively implement additional optimizations as needed.

Happy optimizing!
