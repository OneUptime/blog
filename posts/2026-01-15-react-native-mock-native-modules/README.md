# How to Mock Native Modules in React Native Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Testing, Mocking, Jest, Native Modules, Mobile Development

Description: Learn how to effectively mock native modules in React Native tests for reliable and fast unit testing.

---

Testing React Native applications presents unique challenges that web developers rarely encounter. One of the most significant hurdles is dealing with native modules-JavaScript interfaces that communicate with platform-specific code written in Swift, Objective-C, Kotlin, or Java. When running tests in a Node.js environment with Jest, these native modules simply don't exist, causing tests to fail with cryptic errors. This comprehensive guide will teach you everything you need to know about mocking native modules effectively.

## Why Mock Native Modules?

Before diving into the technical details, let's understand why mocking native modules is essential for React Native testing.

### The Core Problem

React Native applications run JavaScript code that communicates with native platform code through a "bridge." When you call a method like `CameraRoll.getPhotos()`, your JavaScript code sends a message across this bridge to native code that actually accesses the device's photo library.

However, when running tests with Jest, your code executes in Node.js-not on a mobile device or simulator. The native code simply doesn't exist in this environment. Without proper mocking, you'll encounter errors like:

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...):
'CameraRoll' could not be found.
```

### Benefits of Mocking Native Modules

1. **Test Isolation**: Mocks allow you to test JavaScript logic without depending on native implementations
2. **Speed**: Tests run in milliseconds rather than requiring device/simulator startup
3. **Determinism**: Mocked responses are predictable, eliminating flaky tests caused by device state
4. **CI/CD Compatibility**: Tests can run on any machine without platform-specific toolchains
5. **Edge Case Testing**: You can simulate error conditions that are difficult to reproduce on real devices

## Jest Module Mocking Basics

Jest provides several powerful mechanisms for mocking modules. Let's explore the fundamentals before tackling React Native-specific scenarios.

### Using jest.mock()

The `jest.mock()` function replaces a module with a mock implementation:

```typescript
// Basic module mock
jest.mock('some-module', () => ({
  someFunction: jest.fn(() => 'mocked value'),
  someConstant: 'mocked constant',
}));
```

### Using jest.fn() for Function Mocks

`jest.fn()` creates a mock function that tracks calls and can return controlled values:

```typescript
const mockFunction = jest.fn();

// Return a specific value
mockFunction.mockReturnValue('hello');

// Return different values on subsequent calls
mockFunction
  .mockReturnValueOnce('first call')
  .mockReturnValueOnce('second call');

// Return a resolved promise
mockFunction.mockResolvedValue({ data: 'success' });

// Return a rejected promise
mockFunction.mockRejectedValue(new Error('Failed'));
```

### Using jest.spyOn() for Partial Mocking

When you want to mock only specific methods while keeping others intact:

```typescript
import * as utils from './utils';

jest.spyOn(utils, 'specificMethod').mockReturnValue('mocked');
// Other methods in utils remain unchanged
```

## Setting Up Mocks in jest.setup.js

For React Native projects, centralizing your mocks in a setup file ensures consistency across all tests.

### Configuring Jest for React Native

First, ensure your `jest.config.js` is properly configured:

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
```

### Creating a Comprehensive Setup File

```typescript
// jest.setup.js
import 'react-native-gesture-handler/jestSetup';

// Silence specific warnings during tests
jest.spyOn(console, 'warn').mockImplementation((message) => {
  if (message.includes('Animated: `useNativeDriver`')) return;
  console.warn(message);
});

// Global timeout for async operations
jest.setTimeout(10000);

// Mock NativeModules that don't have JS implementations
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Additional setup code follows in subsequent sections
```

## Mocking React Native Core Modules

React Native's built-in modules require specific mocking approaches.

### Mocking the Animated API

The Animated API uses native drivers that don't exist in test environments:

```typescript
// jest.setup.js
jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');

  // Override Animated to use JS-only implementation
  reactNative.Animated.timing = (value, config) => ({
    start: (callback) => {
      value.setValue(config.toValue);
      callback && callback({ finished: true });
    },
    stop: jest.fn(),
    reset: jest.fn(),
  });

  reactNative.Animated.spring = (value, config) => ({
    start: (callback) => {
      value.setValue(config.toValue);
      callback && callback({ finished: true });
    },
    stop: jest.fn(),
    reset: jest.fn(),
  });

  reactNative.Animated.parallel = (animations) => ({
    start: (callback) => {
      animations.forEach((anim) => anim.start());
      callback && callback({ finished: true });
    },
    stop: jest.fn(),
  });

  return reactNative;
});
```

### Mocking Platform-Specific Code

```typescript
// jest.setup.js
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios', // or 'android' depending on test needs
  select: jest.fn((specifics) => specifics.ios || specifics.default),
  Version: 14,
  isPad: false,
  isTVOS: false,
  isTV: false,
  constants: {
    reactNativeVersion: { major: 0, minor: 72, patch: 0 },
  },
}));
```

### Mocking Dimensions and Window Metrics

```typescript
// jest.setup.js
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({
    width: 375,
    height: 812,
    scale: 3,
    fontScale: 1,
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
```

### Mocking Linking API

```typescript
// jest.setup.js
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
```

### Mocking PermissionsAndroid

```typescript
// jest.setup.js
jest.mock(
  'react-native/Libraries/PermissionsAndroid/PermissionsAndroid',
  () => ({
    PERMISSIONS: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn(() => Promise.resolve(true)),
    request: jest.fn(() => Promise.resolve('granted')),
    requestMultiple: jest.fn(() =>
      Promise.resolve({
        'android.permission.CAMERA': 'granted',
        'android.permission.READ_EXTERNAL_STORAGE': 'granted',
      })
    ),
  })
);
```

## Mocking Third-Party Native Libraries

Third-party libraries often require custom mock implementations.

### Mocking React Native Firebase

```typescript
// __mocks__/@react-native-firebase/app.ts
export default {
  initializeApp: jest.fn(() => Promise.resolve()),
  app: jest.fn(() => ({
    name: '[DEFAULT]',
    options: {},
  })),
  apps: [],
};

// __mocks__/@react-native-firebase/auth.ts
const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
};

export default () => ({
  currentUser: mockUser,
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: mockUser })
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: mockUser })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockUser);
    return jest.fn(); // unsubscribe function
  }),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
});

// __mocks__/@react-native-firebase/firestore.ts
const mockCollection = {
  doc: jest.fn(() => mockDoc),
  add: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  where: jest.fn(() => mockCollection),
  orderBy: jest.fn(() => mockCollection),
  limit: jest.fn(() => mockCollection),
  get: jest.fn(() =>
    Promise.resolve({
      docs: [],
      empty: true,
      size: 0,
    })
  ),
  onSnapshot: jest.fn((callback) => {
    callback({ docs: [], empty: true });
    return jest.fn();
  }),
};

const mockDoc = {
  get: jest.fn(() =>
    Promise.resolve({
      exists: true,
      data: () => ({ field: 'value' }),
      id: 'doc-id',
    })
  ),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((callback) => {
    callback({ exists: true, data: () => ({}) });
    return jest.fn();
  }),
};

export default () => ({
  collection: jest.fn(() => mockCollection),
  doc: jest.fn(() => mockDoc),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
});
```

### Mocking React Native Device Info

```typescript
// __mocks__/react-native-device-info.ts
export default {
  getUniqueId: jest.fn(() => Promise.resolve('unique-device-id')),
  getUniqueIdSync: jest.fn(() => 'unique-device-id'),
  getDeviceId: jest.fn(() => 'iPhone14,2'),
  getModel: jest.fn(() => 'iPhone 13 Pro'),
  getBrand: jest.fn(() => 'Apple'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '16.0'),
  getBuildNumber: jest.fn(() => '1'),
  getVersion: jest.fn(() => '1.0.0'),
  getReadableVersion: jest.fn(() => '1.0.0.1'),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  isEmulatorSync: jest.fn(() => false),
  getApplicationName: jest.fn(() => 'MyApp'),
  getBundleId: jest.fn(() => 'com.myapp.bundle'),
  getDeviceName: jest.fn(() => Promise.resolve("John's iPhone")),
  getDeviceNameSync: jest.fn(() => "John's iPhone"),
  getFirstInstallTime: jest.fn(() => Promise.resolve(1640000000000)),
  getLastUpdateTime: jest.fn(() => Promise.resolve(1640000000000)),
  getManufacturer: jest.fn(() => Promise.resolve('Apple')),
  hasNotch: jest.fn(() => true),
  hasDynamicIsland: jest.fn(() => false),
  getApiLevel: jest.fn(() => Promise.resolve(31)),
  getApiLevelSync: jest.fn(() => 31),
};
```

## Manual Mocks vs Automatic Mocks

Understanding when to use each approach is crucial for maintainable tests.

### Automatic Mocks with jest.mock()

Jest can automatically mock modules by replacing all exports with mock functions:

```typescript
// Automatic mock - all exports become jest.fn()
jest.mock('some-native-library');

// In your test
import { someFunction } from 'some-native-library';

test('uses automatic mock', () => {
  someFunction(); // This is now a jest.fn()
  expect(someFunction).toHaveBeenCalled();
});
```

### Manual Mocks with __mocks__ Directory

For complex modules, create manual mocks in a `__mocks__` directory:

```
project-root/
├── __mocks__/
│   ├── react-native-camera.ts
│   ├── @react-native-async-storage/
│   │   └── async-storage.ts
│   └── react-native-fs.ts
├── src/
└── package.json
```

```typescript
// __mocks__/react-native-fs.ts
const RNFS = {
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
  MainBundlePath: '/mock/bundle',

  readFile: jest.fn(() => Promise.resolve('file contents')),
  writeFile: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() =>
    Promise.resolve([
      {
        name: 'file.txt',
        path: '/mock/documents/file.txt',
        size: 1024,
        isFile: () => true,
        isDirectory: () => false,
      },
    ])
  ),
  stat: jest.fn(() =>
    Promise.resolve({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
      ctime: new Date(),
    })
  ),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ statusCode: 200, bytesWritten: 1024 }),
  })),
};

export default RNFS;
```

### When to Use Each Approach

**Use Automatic Mocks When:**
- The module has simple, independent functions
- You only need to verify that functions are called
- You don't care about return values

**Use Manual Mocks When:**
- The module has complex interdependencies
- Return values affect application logic
- You need consistent mock behavior across tests
- The module requires specific TypeScript types

## Mocking Async Native Methods

Many native modules return promises that need careful handling in tests.

### Basic Async Mock Patterns

```typescript
// Mock that resolves immediately
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() =>
    Promise.resolve({
      available: true,
      biometryType: 'FaceID',
    })
  ),
  simplePrompt: jest.fn(() =>
    Promise.resolve({
      success: true,
    })
  ),
}));

// Test async behavior
import BiometricModule from 'react-native-biometrics';

test('handles biometric authentication', async () => {
  const result = await BiometricModule.simplePrompt({
    promptMessage: 'Authenticate',
  });

  expect(result.success).toBe(true);
  expect(BiometricModule.simplePrompt).toHaveBeenCalledWith({
    promptMessage: 'Authenticate',
  });
});
```

### Testing Error Scenarios

```typescript
// In your test file, override the mock for specific tests
import BiometricModule from 'react-native-biometrics';

jest.mock('react-native-biometrics');

describe('Biometric Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles successful authentication', async () => {
    (BiometricModule.simplePrompt as jest.Mock).mockResolvedValueOnce({
      success: true,
    });

    const result = await authenticateUser();
    expect(result).toBe(true);
  });

  test('handles failed authentication', async () => {
    (BiometricModule.simplePrompt as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'User cancelled',
    });

    const result = await authenticateUser();
    expect(result).toBe(false);
  });

  test('handles biometric not available', async () => {
    (BiometricModule.isSensorAvailable as jest.Mock).mockResolvedValueOnce({
      available: false,
      error: 'No biometric hardware',
    });

    await expect(authenticateUser()).rejects.toThrow(
      'Biometrics not available'
    );
  });

  test('handles unexpected errors', async () => {
    (BiometricModule.simplePrompt as jest.Mock).mockRejectedValueOnce(
      new Error('Hardware error')
    );

    await expect(authenticateUser()).rejects.toThrow('Hardware error');
  });
});
```

### Mocking Event Emitters

Some native modules emit events that your code listens to:

```typescript
// __mocks__/react-native-ble-plx.ts
import { EventEmitter } from 'events';

const mockEmitter = new EventEmitter();

export class BleManager {
  private listeners: Map<string, Function[]> = new Map();

  startDeviceScan = jest.fn((uuids, options, callback) => {
    // Simulate finding a device after a short delay
    setTimeout(() => {
      callback(null, {
        id: 'device-001',
        name: 'Test Device',
        rssi: -50,
      });
    }, 100);
  });

  stopDeviceScan = jest.fn();

  connectToDevice = jest.fn((deviceId) =>
    Promise.resolve({
      id: deviceId,
      name: 'Test Device',
      discoverAllServicesAndCharacteristics: jest.fn(() =>
        Promise.resolve({
          id: deviceId,
          services: jest.fn(() => Promise.resolve([])),
        })
      ),
    })
  );

  onStateChange = jest.fn((callback, emitCurrentState) => {
    if (emitCurrentState) {
      callback('PoweredOn');
    }
    return { remove: jest.fn() };
  });

  state = jest.fn(() => Promise.resolve('PoweredOn'));

  destroy = jest.fn();
}

// Helper to simulate state changes in tests
export const simulateStateChange = (state: string) => {
  mockEmitter.emit('stateChange', state);
};
```

## Mocking Navigation Libraries

React Navigation is widely used and requires comprehensive mocking.

### Mocking React Navigation Core

```typescript
// jest.setup.js or __mocks__/@react-navigation/native.ts
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockSetOptions = jest.fn();
const mockSetParams = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');

  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      setOptions: mockSetOptions,
      setParams: mockSetParams,
      addListener: mockAddListener,
      dispatch: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      getParent: jest.fn(),
      getState: jest.fn(() => ({
        routes: [],
        index: 0,
      })),
    }),
    useRoute: () => ({
      key: 'test-route-key',
      name: 'TestScreen',
      params: {},
    }),
    useIsFocused: jest.fn(() => true),
    useFocusEffect: jest.fn((callback) => callback()),
    useNavigationState: jest.fn((selector) =>
      selector({
        routes: [{ name: 'TestScreen', key: 'test-key' }],
        index: 0,
      })
    ),
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
    createNavigationContainerRef: jest.fn(() => ({
      current: null,
      isReady: jest.fn(() => true),
      navigate: mockNavigate,
      goBack: mockGoBack,
    })),
  };
});

// Export mocks for test assertions
export { mockNavigate, mockGoBack, mockReset };
```

### Mocking Stack Navigator

```typescript
// __mocks__/@react-navigation/native-stack.ts
import React from 'react';

const createNativeStackNavigator = jest.fn(() => ({
  Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Screen: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Group: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

export { createNativeStackNavigator };
```

### Testing Navigation Behavior

```typescript
// UserProfile.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import UserProfile from '../UserProfile';

jest.mock('@react-navigation/native');

describe('UserProfile', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    jest.clearAllMocks();
  });

  test('navigates to settings on button press', () => {
    const { getByText } = render(<UserProfile />);

    fireEvent.press(getByText('Settings'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  test('navigates to edit profile with params', () => {
    const { getByText } = render(<UserProfile userId="123" />);

    fireEvent.press(getByText('Edit Profile'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile', {
      userId: '123',
    });
  });

  test('goes back on cancel', () => {
    const { getByText } = render(<UserProfile />);

    fireEvent.press(getByText('Cancel'));

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
```

## Mocking Camera and Image Picker

Camera and image selection are common features requiring careful mocking.

### Mocking React Native Image Picker

```typescript
// __mocks__/react-native-image-picker.ts
export const launchCamera = jest.fn(() =>
  Promise.resolve({
    didCancel: false,
    errorCode: undefined,
    errorMessage: undefined,
    assets: [
      {
        uri: 'file:///mock/camera/photo.jpg',
        type: 'image/jpeg',
        fileName: 'photo.jpg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
      },
    ],
  })
);

export const launchImageLibrary = jest.fn(() =>
  Promise.resolve({
    didCancel: false,
    errorCode: undefined,
    errorMessage: undefined,
    assets: [
      {
        uri: 'file:///mock/library/image.jpg',
        type: 'image/jpeg',
        fileName: 'image.jpg',
        fileSize: 512000,
        width: 1280,
        height: 720,
      },
    ],
  })
);

// Helper functions to simulate different scenarios in tests
export const mockCameraCancel = () => {
  (launchCamera as jest.Mock).mockResolvedValueOnce({
    didCancel: true,
  });
};

export const mockCameraError = (errorCode: string, errorMessage: string) => {
  (launchCamera as jest.Mock).mockResolvedValueOnce({
    didCancel: false,
    errorCode,
    errorMessage,
  });
};

export const mockLibraryMultipleSelection = (count: number) => {
  const assets = Array.from({ length: count }, (_, i) => ({
    uri: `file:///mock/library/image${i}.jpg`,
    type: 'image/jpeg',
    fileName: `image${i}.jpg`,
    fileSize: 512000,
    width: 1280,
    height: 720,
  }));

  (launchImageLibrary as jest.Mock).mockResolvedValueOnce({
    didCancel: false,
    assets,
  });
};
```

### Mocking React Native Camera (Vision Camera)

```typescript
// __mocks__/react-native-vision-camera.ts
import React from 'react';
import { View } from 'react-native';

export const Camera = React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => ({
    takePhoto: jest.fn(() =>
      Promise.resolve({
        path: '/mock/path/photo.jpg',
        width: 1920,
        height: 1080,
      })
    ),
    takeSnapshot: jest.fn(() =>
      Promise.resolve({
        path: '/mock/path/snapshot.jpg',
        width: 1920,
        height: 1080,
      })
    ),
    startRecording: jest.fn(),
    stopRecording: jest.fn(() =>
      Promise.resolve({
        path: '/mock/path/video.mp4',
        duration: 10,
      })
    ),
    focus: jest.fn(() => Promise.resolve()),
  }));

  return <View testID="mock-camera" {...props} />;
});

export const useCameraDevices = jest.fn(() => ({
  back: {
    id: 'back-camera',
    position: 'back',
    hasFlash: true,
    hasTorch: true,
    supportsPhotoCapture: true,
    supportsVideoCapture: true,
  },
  front: {
    id: 'front-camera',
    position: 'front',
    hasFlash: false,
    hasTorch: false,
    supportsPhotoCapture: true,
    supportsVideoCapture: true,
  },
}));

export const useCameraDevice = jest.fn((position: 'back' | 'front') => ({
  id: `${position}-camera`,
  position,
  hasFlash: position === 'back',
  hasTorch: position === 'back',
  supportsPhotoCapture: true,
  supportsVideoCapture: true,
  formats: [],
}));

export const useCameraPermission = jest.fn(() => ({
  hasPermission: true,
  requestPermission: jest.fn(() => Promise.resolve(true)),
}));

export const useMicrophonePermission = jest.fn(() => ({
  hasPermission: true,
  requestPermission: jest.fn(() => Promise.resolve(true)),
}));

export const useFrameProcessor = jest.fn();
export const useCodeScanner = jest.fn(() => ({}));
```

## Mocking AsyncStorage and MMKV

Persistent storage mocking is essential for testing data persistence logic.

### Mocking AsyncStorage

```typescript
// __mocks__/@react-native-async-storage/async-storage.ts
let mockStorage: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockStorage[key] || null);
  }),

  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),

  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),

  mergeItem: jest.fn((key: string, value: string) => {
    const existing = mockStorage[key];
    if (existing) {
      const merged = {
        ...JSON.parse(existing),
        ...JSON.parse(value),
      };
      mockStorage[key] = JSON.stringify(merged);
    } else {
      mockStorage[key] = value;
    }
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    mockStorage = {};
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(mockStorage));
  }),

  multiGet: jest.fn((keys: string[]) => {
    return Promise.resolve(
      keys.map((key) => [key, mockStorage[key] || null])
    );
  }),

  multiSet: jest.fn((keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
    return Promise.resolve();
  }),

  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => {
      delete mockStorage[key];
    });
    return Promise.resolve();
  }),

  multiMerge: jest.fn((keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => {
      const existing = mockStorage[key];
      if (existing) {
        mockStorage[key] = JSON.stringify({
          ...JSON.parse(existing),
          ...JSON.parse(value),
        });
      } else {
        mockStorage[key] = value;
      }
    });
    return Promise.resolve();
  }),
};

// Helper to reset storage between tests
export const resetMockStorage = () => {
  mockStorage = {};
  jest.clearAllMocks();
};

// Helper to pre-populate storage for tests
export const setMockStorageData = (data: Record<string, string>) => {
  mockStorage = { ...data };
};

export default AsyncStorage;
```

### Mocking MMKV

```typescript
// __mocks__/react-native-mmkv.ts
let mockStorage: Record<string, any> = {};

export class MMKV {
  private id: string;

  constructor(configuration?: { id?: string }) {
    this.id = configuration?.id || 'default';
  }

  set(key: string, value: boolean | string | number | Uint8Array): void {
    mockStorage[`${this.id}:${key}`] = value;
  }

  getBoolean(key: string): boolean | undefined {
    return mockStorage[`${this.id}:${key}`] as boolean | undefined;
  }

  getString(key: string): string | undefined {
    return mockStorage[`${this.id}:${key}`] as string | undefined;
  }

  getNumber(key: string): number | undefined {
    return mockStorage[`${this.id}:${key}`] as number | undefined;
  }

  getBuffer(key: string): Uint8Array | undefined {
    return mockStorage[`${this.id}:${key}`] as Uint8Array | undefined;
  }

  contains(key: string): boolean {
    return `${this.id}:${key}` in mockStorage;
  }

  delete(key: string): void {
    delete mockStorage[`${this.id}:${key}`];
  }

  getAllKeys(): string[] {
    const prefix = `${this.id}:`;
    return Object.keys(mockStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }

  clearAll(): void {
    const prefix = `${this.id}:`;
    Object.keys(mockStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => delete mockStorage[k]);
  }

  recrypt(_key: string | undefined): void {
    // No-op for tests
  }

  addOnValueChangedListener(
    _onValueChanged: (key: string) => void
  ): () => void {
    return () => {};
  }
}

// Helper functions for testing
export const resetMMKVMock = () => {
  mockStorage = {};
};

export const setMMKVMockData = (
  data: Record<string, any>,
  instanceId = 'default'
) => {
  Object.entries(data).forEach(([key, value]) => {
    mockStorage[`${instanceId}:${key}`] = value;
  });
};

export const useMMKVBoolean = jest.fn((key: string, instance?: MMKV) => {
  const mmkv = instance || new MMKV();
  return [
    mmkv.getBoolean(key),
    (value: boolean) => mmkv.set(key, value),
  ] as const;
});

export const useMMKVString = jest.fn((key: string, instance?: MMKV) => {
  const mmkv = instance || new MMKV();
  return [
    mmkv.getString(key),
    (value: string) => mmkv.set(key, value),
  ] as const;
});

export const useMMKVNumber = jest.fn((key: string, instance?: MMKV) => {
  const mmkv = instance || new MMKV();
  return [
    mmkv.getNumber(key),
    (value: number) => mmkv.set(key, value),
  ] as const;
});
```

## TypeScript Considerations

Properly typing your mocks ensures type safety and better IDE support.

### Typing Mock Functions

```typescript
// types/testing.d.ts
import type { Mock } from 'jest';

declare global {
  namespace jest {
    interface MockWithArgs<T extends (...args: any[]) => any>
      extends Mock<ReturnType<T>, Parameters<T>> {
      mockResolvedValue(value: Awaited<ReturnType<T>>): this;
      mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
      mockRejectedValue(value: unknown): this;
      mockRejectedValueOnce(value: unknown): this;
    }
  }
}

// Usage in mocks
import type { launchCamera as LaunchCameraType } from 'react-native-image-picker';

export const launchCamera: jest.MockWithArgs<typeof LaunchCameraType> =
  jest.fn();
```

### Creating Type-Safe Mock Factories

```typescript
// test-utils/mockFactories.ts
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const createMockUser = (
  overrides: Partial<FirebaseAuthTypes.User> = {}
): FirebaseAuthTypes.User => ({
  uid: 'test-uid',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  photoURL: null,
  phoneNumber: null,
  providerId: 'firebase',
  isAnonymous: false,
  tenantId: null,
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-15T00:00:00.000Z',
  },
  providerData: [],
  refreshToken: 'mock-refresh-token',
  delete: jest.fn(() => Promise.resolve()),
  getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
  getIdTokenResult: jest.fn(() =>
    Promise.resolve({
      token: 'mock-id-token',
      authTime: '2024-01-15T00:00:00.000Z',
      issuedAtTime: '2024-01-15T00:00:00.000Z',
      expirationTime: '2024-01-15T01:00:00.000Z',
      signInProvider: 'password',
      claims: {},
    })
  ),
  reload: jest.fn(() => Promise.resolve()),
  toJSON: jest.fn(() => ({})),
  ...overrides,
} as FirebaseAuthTypes.User);

// Usage in tests
test('displays user information', () => {
  const mockUser = createMockUser({
    displayName: 'Custom Name',
    email: 'custom@example.com',
  });

  // Use mockUser in your test
});
```

### Module Declaration for Custom Mocks

```typescript
// types/mocks.d.ts
declare module 'react-native-biometrics' {
  export interface BiometryResult {
    available: boolean;
    biometryType?: 'TouchID' | 'FaceID' | 'Biometrics';
    error?: string;
  }

  export interface SimplePromptResult {
    success: boolean;
    error?: string;
  }

  export interface SimplePromptOptions {
    promptMessage: string;
    fallbackPromptMessage?: string;
    cancelButtonText?: string;
  }

  export function isSensorAvailable(): Promise<BiometryResult>;
  export function simplePrompt(
    options: SimplePromptOptions
  ): Promise<SimplePromptResult>;
}
```

## Maintaining Mock Accuracy

Keeping mocks in sync with actual library implementations is crucial for reliable tests.

### Strategies for Mock Maintenance

**1. Version-Pinned Mocks:**

```typescript
// __mocks__/react-native-image-picker.ts
/**
 * Mock for react-native-image-picker
 * @version 7.1.0
 * @see https://github.com/react-native-image-picker/react-native-image-picker
 *
 * Last updated: 2024-01-15
 * Review on library updates
 */
```

**2. Interface-Based Mocks:**

```typescript
// Create interfaces that mirror the library's API
interface ImagePickerResponse {
  didCancel: boolean;
  errorCode?: 'camera_unavailable' | 'permission' | 'others';
  errorMessage?: string;
  assets?: Array<{
    uri: string;
    type: string;
    fileName: string;
    fileSize: number;
    width: number;
    height: number;
  }>;
}

// Use the interface in your mock
export const launchCamera = jest.fn(
  (): Promise<ImagePickerResponse> =>
    Promise.resolve({
      didCancel: false,
      assets: [/* ... */],
    })
);
```

**3. Integration Test Validation:**

```typescript
// integration-tests/mockValidation.test.ts
import { launchCamera as realLaunchCamera } from 'react-native-image-picker';
import { launchCamera as mockLaunchCamera } from '../__mocks__/react-native-image-picker';

describe('Mock API Validation', () => {
  test('mock matches real API signature', () => {
    // Verify function signatures match
    expect(typeof mockLaunchCamera).toBe(typeof realLaunchCamera);
  });

  test('mock returns expected shape', async () => {
    const result = await mockLaunchCamera({});

    // Verify result shape
    expect(result).toHaveProperty('didCancel');
    expect(result).toHaveProperty('assets');
  });
});
```

**4. Automated Mock Updates:**

```javascript
// scripts/update-mocks.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOCKED_PACKAGES = [
  'react-native-image-picker',
  '@react-native-async-storage/async-storage',
  'react-native-device-info',
];

function checkForUpdates() {
  MOCKED_PACKAGES.forEach((pkg) => {
    try {
      const output = execSync(`npm outdated ${pkg} --json`, {
        encoding: 'utf8',
      });
      const outdated = JSON.parse(output);

      if (outdated[pkg]) {
        console.warn(`
          Warning: ${pkg} has updates available.
          Current: ${outdated[pkg].current}
          Latest: ${outdated[pkg].latest}
          Please review the mock in __mocks__/${pkg}.ts
        `);
      }
    } catch (error) {
      // npm outdated exits with code 1 when updates exist
    }
  });
}

checkForUpdates();
```

### Common Pitfalls and Solutions

**Pitfall 1: Mocks Diverging from Reality**

```typescript
// BAD: Mock doesn't match current API
jest.mock('some-library', () => ({
  oldMethod: jest.fn(), // This method was removed in v2.0
}));

// GOOD: Keep mocks updated with library changes
jest.mock('some-library', () => ({
  newMethod: jest.fn(), // Updated to match v2.0 API
}));
```

**Pitfall 2: Over-Mocking**

```typescript
// BAD: Mocking everything
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  // ... hundreds of mocks
}));

// GOOD: Only mock what's necessary
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    NativeModules: {
      ...actual.NativeModules,
      SpecificModule: {
        specificMethod: jest.fn(),
      },
    },
  };
});
```

**Pitfall 3: Not Resetting Mocks**

```typescript
// BAD: Mocks retain state between tests
test('first test', () => {
  mockFunction.mockReturnValue('first');
  expect(mockFunction()).toBe('first');
});

test('second test', () => {
  // mockFunction still returns 'first'!
  expect(mockFunction()).toBe('default'); // FAILS
});

// GOOD: Reset mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks(); // Clears call history
  // OR
  jest.resetAllMocks(); // Clears history AND resets return values
  // OR
  jest.restoreAllMocks(); // Restores original implementations
});
```

## Conclusion

Mocking native modules in React Native tests is essential for building a reliable, fast, and maintainable test suite. By understanding the various mocking strategies-from basic `jest.mock()` calls to comprehensive manual mocks-you can effectively test your application's JavaScript logic without depending on native implementations.

Key takeaways:

1. **Centralize mocks** in `jest.setup.js` for consistency across tests
2. **Use manual mocks** in the `__mocks__` directory for complex modules
3. **Keep mocks updated** when upgrading dependencies
4. **Test error scenarios** by overriding mock implementations per-test
5. **Leverage TypeScript** for type-safe mocks and better IDE support
6. **Reset mocks properly** between tests to avoid state pollution

By following these practices, you'll be able to write comprehensive tests for your React Native applications, catching bugs early and shipping with confidence. Remember that mocks are a tool to isolate your code for testing-they should complement, not replace, integration and end-to-end tests that verify real device behavior.
