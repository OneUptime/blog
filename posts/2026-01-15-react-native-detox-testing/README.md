# How to Write Integration Tests for React Native with Detox

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Detox, Integration Testing, E2E Testing, Mobile Development, Automation

Description: Learn how to write reliable integration tests for React Native applications using Detox for end-to-end test automation.

---

## Introduction

Testing mobile applications has always been challenging due to the asynchronous nature of mobile platforms, complex user interactions, and the need to validate behavior across multiple devices. For React Native developers, finding a testing solution that works reliably across both iOS and Android while handling the framework's unique characteristics has been particularly difficult.

Enter Detox - a gray-box end-to-end testing framework specifically designed for React Native applications. Unlike traditional black-box testing tools, Detox synchronizes with your application's internal state, dramatically reducing test flakiness and improving reliability.

In this comprehensive guide, we'll explore everything you need to know about writing integration tests for React Native applications using Detox, from initial setup to advanced testing patterns and CI/CD integration.

## What is Detox?

Detox is an end-to-end testing and automation framework for mobile applications, developed by Wix. It's designed specifically with React Native in mind, though it also supports native iOS and Android applications.

### Key Features of Detox

**Gray-Box Testing Approach**

Unlike black-box testing tools that interact with your app without any knowledge of its internal state, Detox operates as a gray-box testing framework. It monitors your application's activity and automatically waits for the app to become idle before executing test commands. This includes waiting for:

- Network requests to complete
- Animations to finish
- JavaScript thread to become idle
- Native UI thread to stabilize

**Cross-Platform Support**

Write your tests once and run them on both iOS and Android platforms. While there may be some platform-specific adjustments needed, the core testing API remains consistent across platforms.

**Built-in Synchronization**

Detox automatically synchronizes with your app, eliminating the need for arbitrary waits and sleeps that plague other testing frameworks. This results in faster, more reliable tests.

**Native Testing Infrastructure**

Detox uses platform-native testing frameworks under the hood - XCUITest for iOS and Espresso for Android - ensuring robust and performant test execution.

## Prerequisites

Before we begin, ensure you have the following installed on your development machine:

- Node.js 18 or higher
- React Native CLI and a working React Native project
- Xcode 15+ (for iOS testing)
- Android Studio with Android SDK (for Android testing)
- macOS (required for iOS testing; Android testing works on macOS, Linux, and Windows)

## Detox Installation and Setup

Let's walk through the complete installation and setup process for Detox.

### Step 1: Install Detox CLI

First, install the Detox CLI globally:

```bash
npm install -g detox-cli
```

### Step 2: Add Detox to Your Project

Navigate to your React Native project and install Detox as a development dependency:

```bash
npm install detox --save-dev
```

### Step 3: Install Jest-Circus Test Runner

Detox works best with Jest as the test runner. Install the required packages:

```bash
npm install jest jest-circus --save-dev
```

### Step 4: Initialize Detox Configuration

Run the Detox initialization command to generate the configuration file:

```bash
detox init
```

This creates a `.detoxrc.js` configuration file and an `e2e` directory with a sample test file.

### Step 5: Install Platform-Specific Dependencies

For iOS, ensure you have `applesimutils` installed:

```bash
brew tap wix/brew
brew install applesimutils
```

For Android, ensure your `ANDROID_HOME` environment variable is set correctly:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Configuring Detox for iOS and Android

The `.detoxrc.js` file is the heart of your Detox configuration. Let's create a comprehensive configuration for both platforms.

### Complete Detox Configuration

```javascript
// .detoxrc.js
/** @type {Detox.DetoxConfig} */
module.exports = {
  logger: {
    level: process.env.CI ? 'debug' : 'info',
  },
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  artifacts: {
    rootDir: './e2e/artifacts',
    plugins: {
      log: { enabled: true },
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testDone: true,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: true,
      },
      instruments: { enabled: false },
      uiHierarchy: 'enabled',
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build: 'xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/YourApp.app',
      build: 'xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};
```

### Jest Configuration for Detox

Create the Jest configuration file at `e2e/jest.config.js`:

```javascript
// e2e/jest.config.js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

## Writing Your First Detox Test

Now that we have Detox configured, let's write our first test. Create a test file at `e2e/firstTest.test.js`:

```javascript
// e2e/firstTest.test.js
describe('Example App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the welcome screen', async () => {
    await expect(element(by.id('welcome-screen'))).toBeVisible();
  });

  it('should display the welcome message', async () => {
    await expect(element(by.text('Welcome to React Native!'))).toBeVisible();
  });

  it('should navigate to the details screen when button is pressed', async () => {
    await element(by.id('navigate-button')).tap();
    await expect(element(by.id('details-screen'))).toBeVisible();
  });
});
```

### Adding Test IDs to Your Components

For Detox to find your components, you need to add `testID` props to your React Native components:

```jsx
// WelcomeScreen.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container} testID="welcome-screen">
      <Text style={styles.title}>Welcome to React Native!</Text>
      <TouchableOpacity
        style={styles.button}
        testID="navigate-button"
        onPress={() => navigation.navigate('Details')}
      >
        <Text style={styles.buttonText}>Go to Details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default WelcomeScreen;
```

### Running Your Tests

Build and run your tests with these commands:

```bash
# Build the app for iOS
detox build --configuration ios.sim.debug

# Run tests on iOS
detox test --configuration ios.sim.debug

# Build the app for Android
detox build --configuration android.emu.debug

# Run tests on Android
detox test --configuration android.emu.debug
```

## Element Matchers and Actions

Detox provides a powerful API for finding elements and performing actions on them. Let's explore the available matchers and actions in detail.

### Element Matchers

Matchers are used to locate elements in your application:

```javascript
// Match by testID (recommended)
element(by.id('button-submit'));

// Match by text content
element(by.text('Submit'));

// Match by partial text (label)
element(by.label('Submit'));

// Match by type (native view type)
element(by.type('RCTTextInput'));

// Match by accessibility traits
element(by.traits(['button']));

// Match by index when multiple elements match
element(by.id('list-item')).atIndex(0);

// Combine matchers with and()
element(by.id('button').and(by.text('Submit')));

// Match elements within a parent
element(by.id('submit-button').withAncestor(by.id('form-container')));

// Match parent of an element
element(by.id('form-container').withDescendant(by.id('submit-button')));
```

### Element Actions

Actions simulate user interactions with elements:

```javascript
// Tap actions
await element(by.id('button')).tap();
await element(by.id('button')).longPress();
await element(by.id('button')).longPress(2000); // Long press for 2 seconds
await element(by.id('button')).multiTap(3); // Triple tap
await element(by.id('button')).tapAtPoint({ x: 10, y: 10 });

// Text input actions
await element(by.id('input')).typeText('Hello World');
await element(by.id('input')).replaceText('New Text');
await element(by.id('input')).clearText();
await element(by.id('input')).tapBackspaceKey();
await element(by.id('input')).tapReturnKey();

// Scroll actions
await element(by.id('scrollView')).scroll(100, 'down');
await element(by.id('scrollView')).scroll(100, 'up');
await element(by.id('scrollView')).scrollTo('bottom');
await element(by.id('scrollView')).scrollTo('top');
await element(by.id('scrollView')).scrollTo('left');
await element(by.id('scrollView')).scrollTo('right');

// Scroll until element is visible
await waitFor(element(by.id('target-element')))
  .toBeVisible()
  .whileElement(by.id('scrollView'))
  .scroll(50, 'down');

// Swipe actions
await element(by.id('card')).swipe('left');
await element(by.id('card')).swipe('right', 'fast');
await element(by.id('card')).swipe('up', 'slow', 0.5);

// Pinch actions (for zoom gestures)
await element(by.id('image')).pinch(1.5); // Zoom in
await element(by.id('image')).pinch(0.5); // Zoom out
```

### Expectations

Verify the state of your UI using expectations:

```javascript
// Visibility expectations
await expect(element(by.id('element'))).toBeVisible();
await expect(element(by.id('element'))).not.toBeVisible();
await expect(element(by.id('element'))).toExist();
await expect(element(by.id('element'))).not.toExist();

// Focus expectations
await expect(element(by.id('input'))).toBeFocused();
await expect(element(by.id('input'))).not.toBeFocused();

// Text expectations
await expect(element(by.id('label'))).toHaveText('Expected Text');
await expect(element(by.id('input'))).toHaveValue('input value');

// Toggle expectations
await expect(element(by.id('switch'))).toHaveToggleValue(true);

// Slider expectations
await expect(element(by.id('slider'))).toHaveSliderPosition(0.5);

// Label expectations
await expect(element(by.id('element'))).toHaveLabel('Accessibility Label');

// ID expectations
await expect(element(by.id('element'))).toHaveId('element');
```

## Synchronization Handling

One of Detox's greatest strengths is its automatic synchronization. However, there are scenarios where you need to fine-tune this behavior.

### Understanding Synchronization

Detox automatically waits for:

- The React Native bridge to become idle
- All pending network requests to complete
- All animations to finish
- The JavaScript thread to be idle
- All timers (setTimeout, setInterval) to fire

### Disabling Automatic Synchronization

Sometimes you need to interact with elements during ongoing animations or while network requests are pending:

```javascript
describe('Async Operations', () => {
  it('should handle continuous animations', async () => {
    // Disable synchronization
    await device.disableSynchronization();

    // Perform actions while animation is running
    await element(by.id('animated-element')).tap();

    // Re-enable synchronization
    await device.enableSynchronization();

    // Continue with synchronized tests
    await expect(element(by.id('result'))).toBeVisible();
  });
});
```

### Using waitFor for Custom Waiting

When automatic synchronization isn't enough, use `waitFor`:

```javascript
// Wait for an element to become visible
await waitFor(element(by.id('loading-complete')))
  .toBeVisible()
  .withTimeout(10000);

// Wait for an element to disappear
await waitFor(element(by.id('loading-spinner')))
  .not.toBeVisible()
  .withTimeout(5000);

// Wait for element to exist
await waitFor(element(by.id('dynamic-element')))
  .toExist()
  .withTimeout(8000);

// Wait while scrolling
await waitFor(element(by.id('list-item-50')))
  .toBeVisible()
  .whileElement(by.id('scrollView'))
  .scroll(100, 'down');
```

### Handling Infinite Loops and Timers

If your app has infinite timers or animations that prevent synchronization, you can handle them:

```javascript
// In your app code, use Detox-friendly patterns
import { isDetoxSync } from './utils/detoxHelpers';

// Example: Conditional polling in your app
const POLL_INTERVAL = isDetoxSync() ? 60000 : 5000; // Longer interval during tests

// Or disable certain features during testing
if (!isDetoxSync()) {
  startBackgroundPolling();
}
```

## Testing Navigation Flows

Navigation is a critical part of any mobile application. Let's explore how to test various navigation patterns.

### Testing Stack Navigation

```javascript
describe('Stack Navigation', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate through a multi-screen flow', async () => {
    // Start on Home screen
    await expect(element(by.id('home-screen'))).toBeVisible();

    // Navigate to Profile
    await element(by.id('profile-button')).tap();
    await expect(element(by.id('profile-screen'))).toBeVisible();

    // Navigate to Settings
    await element(by.id('settings-button')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();

    // Go back to Profile
    await element(by.id('back-button')).tap();
    await expect(element(by.id('profile-screen'))).toBeVisible();

    // Go back to Home
    await element(by.id('back-button')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should handle deep linking', async () => {
    // Open app with deep link
    await device.launchApp({
      newInstance: true,
      url: 'myapp://profile/123',
    });

    // Verify we're on the correct screen with correct data
    await expect(element(by.id('profile-screen'))).toBeVisible();
    await expect(element(by.id('user-id'))).toHaveText('123');
  });
});
```

### Testing Tab Navigation

```javascript
describe('Tab Navigation', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should switch between tabs', async () => {
    // Verify initial tab
    await expect(element(by.id('home-tab-content'))).toBeVisible();

    // Switch to Search tab
    await element(by.id('search-tab')).tap();
    await expect(element(by.id('search-tab-content'))).toBeVisible();
    await expect(element(by.id('home-tab-content'))).not.toBeVisible();

    // Switch to Profile tab
    await element(by.id('profile-tab')).tap();
    await expect(element(by.id('profile-tab-content'))).toBeVisible();

    // Return to Home tab
    await element(by.id('home-tab')).tap();
    await expect(element(by.id('home-tab-content'))).toBeVisible();
  });

  it('should maintain tab state when switching', async () => {
    // Navigate to Search tab and perform a search
    await element(by.id('search-tab')).tap();
    await element(by.id('search-input')).typeText('React Native');
    await element(by.id('search-button')).tap();

    // Switch to another tab
    await element(by.id('home-tab')).tap();

    // Return to Search tab
    await element(by.id('search-tab')).tap();

    // Verify search results are still visible
    await expect(element(by.id('search-results'))).toBeVisible();
  });
});
```

### Testing Modal and Drawer Navigation

```javascript
describe('Modal Navigation', () => {
  it('should open and close modals', async () => {
    // Open modal
    await element(by.id('open-modal-button')).tap();
    await expect(element(by.id('modal-container'))).toBeVisible();

    // Interact with modal content
    await element(by.id('modal-input')).typeText('Modal data');

    // Close modal
    await element(by.id('close-modal-button')).tap();
    await expect(element(by.id('modal-container'))).not.toBeVisible();
  });

  it('should dismiss modal on backdrop tap', async () => {
    await element(by.id('open-modal-button')).tap();
    await expect(element(by.id('modal-container'))).toBeVisible();

    // Tap outside modal (backdrop)
    await element(by.id('modal-backdrop')).tap();
    await expect(element(by.id('modal-container'))).not.toBeVisible();
  });
});

describe('Drawer Navigation', () => {
  it('should open and close drawer', async () => {
    // Open drawer with swipe
    await element(by.id('main-screen')).swipe('right');
    await expect(element(by.id('drawer-menu'))).toBeVisible();

    // Navigate from drawer
    await element(by.id('drawer-settings-item')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();

    // Drawer should be closed after navigation
    await expect(element(by.id('drawer-menu'))).not.toBeVisible();
  });
});
```

## Handling Animations

Animations can cause test flakiness if not handled properly. Detox provides several strategies for dealing with animations.

### Waiting for Animations to Complete

Detox automatically waits for React Native's Animated API, but you may need additional handling:

```javascript
describe('Animation Handling', () => {
  it('should wait for fade-in animation', async () => {
    await element(by.id('show-content-button')).tap();

    // waitFor handles animation completion
    await waitFor(element(by.id('animated-content')))
      .toBeVisible()
      .withTimeout(3000);

    await expect(element(by.id('animated-content'))).toBeVisible();
  });

  it('should handle slide animations', async () => {
    await element(by.id('slide-in-button')).tap();

    // Wait for the animated element
    await waitFor(element(by.id('slide-panel')))
      .toBeVisible()
      .withTimeout(2000);

    // Interact with the panel
    await element(by.id('panel-button')).tap();
  });
});
```

### Disabling Animations for Tests

For more reliable tests, consider disabling animations in your test environment:

```javascript
// In your app's entry point or test setup
import { UIManager, LayoutAnimation } from 'react-native';

if (__DEV__ && process.env.DETOX_RUNNING) {
  // Disable layout animations
  LayoutAnimation.configureNext = () => {};

  // Optionally speed up Animated
  // This requires additional setup in your app
}
```

### React Native Reanimated Handling

If you're using React Native Reanimated, additional setup is required:

```javascript
// jest-setup.js for Detox
require('react-native-reanimated').setUpTests();

// In your app code for tests
import { withReanimatedTimer, advanceAnimationByTime } from 'react-native-reanimated';

// Use reduced motion in tests
import { ReduceMotion } from 'react-native-reanimated';
// Configure based on test environment
```

## Network Mocking in Detox

Testing network-dependent features requires mocking API responses. Detox integrates well with various mocking strategies.

### Using a Mock Server

Set up a local mock server for your tests:

```javascript
// e2e/mockServer.js
const express = require('express');

const createMockServer = () => {
  const app = express();
  app.use(express.json());

  // Mock endpoints
  app.get('/api/users', (req, res) => {
    res.json([
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ]);
  });

  app.get('/api/users/:id', (req, res) => {
    res.json({
      id: req.params.id,
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        bio: 'Software Developer',
        location: 'San Francisco',
      },
    });
  });

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'test@example.com' && password === 'password123') {
      res.json({ token: 'mock-jwt-token', user: { id: 1, email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/users', (req, res) => {
    res.status(201).json({ id: 3, ...req.body });
  });

  // Error scenarios
  app.get('/api/error', (req, res) => {
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.get('/api/timeout', (req, res) => {
    // Simulate timeout - don't respond
  });

  return app;
};

module.exports = { createMockServer };
```

### Integrating Mock Server with Tests

```javascript
// e2e/globalSetup.js
const { createMockServer } = require('./mockServer');

let server;

module.exports = async () => {
  const app = createMockServer();
  server = app.listen(3001, () => {
    console.log('Mock server running on port 3001');
  });
  global.__MOCK_SERVER__ = server;
};

// e2e/globalTeardown.js
module.exports = async () => {
  if (global.__MOCK_SERVER__) {
    global.__MOCK_SERVER__.close();
  }
};
```

### Testing Network Scenarios

```javascript
describe('Network Operations', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display user list from API', async () => {
    await element(by.id('fetch-users-button')).tap();

    await waitFor(element(by.id('user-list')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('John Doe'))).toBeVisible();
    await expect(element(by.text('Jane Smith'))).toBeVisible();
  });

  it('should handle login flow', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should display error message on failed login', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should handle network errors gracefully', async () => {
    // Navigate to a screen that triggers the error endpoint
    await element(by.id('trigger-error-button')).tap();

    await waitFor(element(by.id('error-message')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('Something went wrong'))).toBeVisible();
    await expect(element(by.id('retry-button'))).toBeVisible();
  });
});
```

### Using MSW (Mock Service Worker)

For more sophisticated mocking, consider using MSW:

```javascript
// e2e/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
    ]);
  }),

  http.post('https://api.example.com/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com') {
      return HttpResponse.json({ token: 'mock-token' });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
];
```

## Debugging Detox Tests

When tests fail, effective debugging is crucial. Detox provides several tools and techniques for diagnosing issues.

### Enabling Artifacts

Configure artifacts in `.detoxrc.js` to capture screenshots and videos:

```javascript
artifacts: {
  rootDir: './e2e/artifacts',
  plugins: {
    screenshot: {
      shouldTakeAutomaticSnapshots: true,
      keepOnlyFailedTestsArtifacts: true,
      takeWhen: {
        testStart: false,
        testDone: true,
      },
    },
    video: {
      enabled: true,
      keepOnlyFailedTestsArtifacts: true,
    },
    log: {
      enabled: true,
    },
    uiHierarchy: 'enabled',
  },
},
```

### Taking Manual Screenshots

```javascript
it('should capture state for debugging', async () => {
  await element(by.id('complex-form')).tap();

  // Take a screenshot at a specific point
  await device.takeScreenshot('form-initial-state');

  await element(by.id('submit-button')).tap();

  // Capture after action
  await device.takeScreenshot('form-after-submit');
});
```

### Using the Detox CLI Debug Mode

Run tests with verbose output:

```bash
# Maximum verbosity
detox test --configuration ios.sim.debug --loglevel trace

# Record all test artifacts
detox test --configuration ios.sim.debug --record-logs all --record-videos all

# Run specific test file
detox test --configuration ios.sim.debug e2e/login.test.js

# Run tests matching a pattern
detox test --configuration ios.sim.debug --testNamePattern "login"
```

### Debugging Element Location Issues

```javascript
it('should debug element visibility', async () => {
  // Get the UI hierarchy
  await device.takeScreenshot('debug-ui');

  // Try multiple matchers to find the element
  try {
    await expect(element(by.id('target-element'))).toBeVisible();
  } catch (error) {
    console.log('Element not found by id');

    // Try alternative matchers
    try {
      await expect(element(by.text('Target'))).toBeVisible();
      console.log('Found by text');
    } catch {
      console.log('Element not found by text either');
    }
  }
});
```

### Using Console Logs in Tests

```javascript
describe('Debug Suite', () => {
  it('should log test progress', async () => {
    console.log('Starting test...');

    await device.launchApp();
    console.log('App launched');

    const isVisible = await element(by.id('home-screen')).isVisible();
    console.log(`Home screen visible: ${isVisible}`);

    await element(by.id('button')).tap();
    console.log('Button tapped');
  });
});
```

## CI/CD Integration

Integrating Detox tests into your CI/CD pipeline ensures consistent quality across releases.

### GitHub Actions Configuration

```yaml
# .github/workflows/detox.yml
name: Detox E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  detox-ios:
    runs-on: macos-14
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install macOS dependencies
        run: |
          brew tap wix/brew
          brew install applesimutils

      - name: Install CocoaPods dependencies
        run: |
          cd ios
          pod install

      - name: Build iOS app for Detox
        run: detox build --configuration ios.sim.release

      - name: Run Detox tests on iOS
        run: detox test --configuration ios.sim.release --cleanup --headless

      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: detox-artifacts-ios
          path: e2e/artifacts

  detox-android:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Enable KVM for Android emulator
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: AVD cache
        uses: actions/cache@v4
        id: avd-cache
        with:
          path: |
            ~/.android/avd/*
            ~/.android/adb*
          key: avd-34-x86_64

      - name: Create AVD and generate snapshot
        if: steps.avd-cache.outputs.cache-hit != 'true'
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          force-avd-creation: false
          emulator-options: -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim
          disable-animations: true
          script: echo "Generated AVD snapshot for caching"

      - name: Build Android app for Detox
        run: detox build --configuration android.emu.release

      - name: Run Detox tests on Android
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          force-avd-creation: false
          emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim
          disable-animations: true
          script: detox test --configuration android.emu.release --cleanup --headless

      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: detox-artifacts-android
          path: e2e/artifacts
```

### Bitrise Configuration

```yaml
# bitrise.yml
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git

workflows:
  detox-ios:
    steps:
      - activate-ssh-key@4: {}
      - git-clone@8: {}
      - npm@1:
          inputs:
            - command: ci
      - script@1:
          inputs:
            - content: |
                brew tap wix/brew
                brew install applesimutils
      - cocoapods-install@2: {}
      - script@1:
          inputs:
            - content: |
                detox build --configuration ios.sim.release
      - script@1:
          inputs:
            - content: |
                detox test --configuration ios.sim.release --cleanup
      - deploy-to-bitrise-io@2:
          inputs:
            - deploy_path: e2e/artifacts
          is_always_run: true
```

### CircleCI Configuration

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.2
  android: circleci/android@2.4

jobs:
  detox-ios:
    macos:
      xcode: 15.2.0
    resource_class: macos.m1.medium.gen1
    steps:
      - checkout
      - node/install:
          node-version: '20'
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Install applesimutils
          command: |
            brew tap wix/brew
            brew install applesimutils
      - run:
          name: Install CocoaPods
          command: cd ios && pod install
      - run:
          name: Build for Detox
          command: detox build --configuration ios.sim.release
      - run:
          name: Run Detox tests
          command: detox test --configuration ios.sim.release --cleanup
      - store_artifacts:
          path: e2e/artifacts

  detox-android:
    executor:
      name: android/android-machine
      resource-class: large
      tag: 2024.01.1
    steps:
      - checkout
      - node/install:
          node-version: '20'
      - run:
          name: Install dependencies
          command: npm ci
      - android/create-avd:
          avd-name: Pixel_API_34
          install: true
          system-image: system-images;android-34;google_apis;x86_64
      - android/start-emulator:
          avd-name: Pixel_API_34
          post-emulator-launch-assemble-command: ''
      - run:
          name: Build for Detox
          command: detox build --configuration android.emu.release
      - run:
          name: Run Detox tests
          command: detox test --configuration android.emu.release --cleanup --headless
      - store_artifacts:
          path: e2e/artifacts

workflows:
  e2e-tests:
    jobs:
      - detox-ios
      - detox-android
```

## Best Practices for Reliable Tests

Following best practices ensures your Detox tests remain maintainable and reliable over time.

### 1. Use Meaningful Test IDs

Create a consistent naming convention for your test IDs:

```jsx
// Good - descriptive and consistent
<Button testID="login-submit-button" />
<TextInput testID="login-email-input" />
<View testID="home-screen" />

// Avoid - generic or unclear
<Button testID="btn1" />
<TextInput testID="input" />
<View testID="container" />
```

### 2. Create Page Objects

Organize your tests using the Page Object pattern:

```javascript
// e2e/pages/LoginPage.js
class LoginPage {
  get emailInput() {
    return element(by.id('login-email-input'));
  }

  get passwordInput() {
    return element(by.id('login-password-input'));
  }

  get submitButton() {
    return element(by.id('login-submit-button'));
  }

  get errorMessage() {
    return element(by.id('login-error-message'));
  }

  async login(email, password) {
    await this.emailInput.typeText(email);
    await this.passwordInput.typeText(password);
    await this.submitButton.tap();
  }

  async expectErrorMessage(message) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(message);
  }
}

module.exports = new LoginPage();
```

Using Page Objects in tests:

```javascript
// e2e/login.test.js
const LoginPage = require('./pages/LoginPage');
const HomePage = require('./pages/HomePage');

describe('Login Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with valid credentials', async () => {
    await LoginPage.login('user@example.com', 'password123');
    await expect(HomePage.welcomeMessage).toBeVisible();
  });

  it('should show error with invalid credentials', async () => {
    await LoginPage.login('wrong@example.com', 'wrongpassword');
    await LoginPage.expectErrorMessage('Invalid credentials');
  });
});
```

### 3. Implement Test Utilities

Create reusable utility functions:

```javascript
// e2e/utils/testHelpers.js
const waitForElement = async (elementMatcher, timeout = 10000) => {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .withTimeout(timeout);
};

const scrollToElement = async (scrollViewId, targetElementId) => {
  await waitFor(element(by.id(targetElementId)))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(100, 'down');
};

const clearAndType = async (elementId, text) => {
  await element(by.id(elementId)).clearText();
  await element(by.id(elementId)).typeText(text);
};

const dismissKeyboard = async () => {
  if (device.getPlatform() === 'ios') {
    await element(by.id('keyboard-dismiss-area')).tap();
  } else {
    await device.pressBack();
  }
};

module.exports = {
  waitForElement,
  scrollToElement,
  clearAndType,
  dismissKeyboard,
};
```

### 4. Handle Platform Differences

Account for iOS and Android differences:

```javascript
// e2e/utils/platformHelpers.js
const platform = device.getPlatform();

const getBackButton = () => {
  if (platform === 'ios') {
    return element(by.id('back-button'));
  }
  return element(by.type('android.widget.ImageButton'));
};

const goBack = async () => {
  if (platform === 'ios') {
    await element(by.id('back-button')).tap();
  } else {
    await device.pressBack();
  }
};

const dismissAlert = async () => {
  if (platform === 'ios') {
    await element(by.label('OK')).tap();
  } else {
    await element(by.text('OK')).tap();
  }
};

module.exports = {
  platform,
  getBackButton,
  goBack,
  dismissAlert,
};
```

### 5. Keep Tests Independent

Each test should be able to run independently:

```javascript
describe('Shopping Cart', () => {
  beforeEach(async () => {
    // Reset app state before each test
    await device.reloadReactNative();

    // Login and navigate to cart
    await LoginPage.login('test@example.com', 'password');
    await HomePage.navigateToCart();
  });

  afterEach(async () => {
    // Clean up if needed
    await CartPage.clearCart();
  });

  it('should add item to cart', async () => {
    await CartPage.addItem('Product 1');
    await expect(CartPage.itemCount).toHaveText('1');
  });

  it('should remove item from cart', async () => {
    await CartPage.addItem('Product 1');
    await CartPage.removeItem('Product 1');
    await expect(CartPage.emptyCartMessage).toBeVisible();
  });
});
```

### 6. Use Appropriate Timeouts

Configure timeouts based on the operation:

```javascript
// Quick UI operations - shorter timeout
await waitFor(element(by.id('button')))
  .toBeVisible()
  .withTimeout(2000);

// Network operations - moderate timeout
await waitFor(element(by.id('api-data')))
  .toBeVisible()
  .withTimeout(10000);

// Complex operations - longer timeout
await waitFor(element(by.id('file-upload-complete')))
  .toBeVisible()
  .withTimeout(30000);
```

### 7. Avoid Hardcoded Waits

Never use arbitrary delays:

```javascript
// Bad - arbitrary wait
await element(by.id('button')).tap();
await new Promise(resolve => setTimeout(resolve, 3000)); // Don't do this!
await expect(element(by.id('result'))).toBeVisible();

// Good - wait for specific condition
await element(by.id('button')).tap();
await waitFor(element(by.id('result')))
  .toBeVisible()
  .withTimeout(5000);
```

### 8. Document Test Coverage

Maintain documentation of what your tests cover:

```javascript
/**
 * Authentication Tests
 *
 * Covers:
 * - User login with email/password
 * - Login error handling
 * - Social login (Google, Apple)
 * - Password reset flow
 * - Session persistence
 * - Logout functionality
 *
 * Not covered:
 * - Two-factor authentication (requires manual testing)
 * - Biometric login (hardware dependent)
 */
describe('Authentication', () => {
  // Tests...
});
```

## Conclusion

Detox provides a powerful, reliable solution for end-to-end testing of React Native applications. By leveraging its gray-box testing capabilities, automatic synchronization, and cross-platform support, you can build a comprehensive test suite that catches bugs before they reach production.

Key takeaways from this guide:

1. **Set up properly**: Take time to configure Detox correctly for both iOS and Android platforms
2. **Use meaningful test IDs**: Create consistent, descriptive identifiers for your UI elements
3. **Leverage automatic synchronization**: Trust Detox's synchronization capabilities and avoid arbitrary waits
4. **Handle animations appropriately**: Use waitFor and synchronization controls when dealing with animations
5. **Mock network requests**: Use a mock server or MSW for reliable, fast tests
6. **Debug effectively**: Utilize artifacts, screenshots, and logging to diagnose failures
7. **Integrate with CI/CD**: Automate your tests to run on every code change
8. **Follow best practices**: Use page objects, keep tests independent, and maintain documentation

With these practices in place, your React Native application will have a robust testing foundation that provides confidence in your releases and speeds up development by catching issues early.

## Additional Resources

- [Detox Official Documentation](https://wix.github.io/Detox/)
- [Detox GitHub Repository](https://github.com/wix/Detox)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/)
- [React Navigation Testing](https://reactnavigation.org/docs/testing/)

Happy testing!
