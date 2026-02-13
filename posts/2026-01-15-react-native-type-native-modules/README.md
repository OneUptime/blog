# How to Type Native Modules and Native Components in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TypeScript, Native Modules, Type Definitions, Mobile Development, Bridge

Description: Learn how to create TypeScript type definitions for native modules and components in React Native.

---

React Native's ability to bridge JavaScript with native iOS and Android code is one of its most powerful features. However, this bridge can become a source of runtime errors when TypeScript types don't accurately reflect native implementations. This comprehensive guide explores how to properly type native modules and components, ensuring type safety across the JavaScript-native boundary.

## Why Type Native Modules?

Native modules represent the interface between your JavaScript code and platform-specific functionality. Without proper typing, you lose several critical benefits:

### Type Safety at the Bridge

The JavaScript-native bridge is a common source of runtime errors. When you call a native method with incorrect parameters or expect the wrong return type, the error only manifests at runtime-often in production. Proper typing catches these issues during development.

```typescript
// Without types - no compile-time safety
const result = NativeModules.MyModule.someMethod(param);

// With types - full IntelliSense and compile-time checking
const result: string = await TypedMyModule.someMethod(param);
```

### Documentation Through Types

Type definitions serve as living documentation. When team members need to understand what a native module provides, they can inspect the types rather than diving into Objective-C, Swift, Kotlin, or Java code.

### Refactoring Confidence

When native implementations change, TypeScript immediately highlights all affected JavaScript code, making refactoring safer and more predictable.

## TurboModule Type Generation

React Native's New Architecture introduces TurboModules, which use code generation (Codegen) to create type-safe interfaces automatically.

### Setting Up Codegen

First, configure Codegen in your `package.json`:

```json
{
  "codegenConfig": {
    "name": "MyAppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/native",
    "android": {
      "javaPackageName": "com.myapp.native"
    }
  }
}
```

### Writing Spec Files

TurboModules require spec files that define the interface:

```typescript
// src/native/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Synchronous method
  getDeviceId(): string;

  // Asynchronous method with Promise
  getBatteryLevel(): Promise<number>;

  // Method with object parameter
  setConfiguration(config: {
    enableLogging: boolean;
    logLevel: string;
  }): void;

  // Method with callback
  fetchData(
    url: string,
    callback: (error: string | null, data: string | null) => void
  ): void;

  // Optional method (may not be implemented on all platforms)
  getCarrierName?(): string;

  // Constants exposed to JavaScript
  getConstants(): {
    platform: string;
    version: string;
    buildNumber: number;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
```

### Generated Types

When you run Codegen, it generates native interfaces that match your TypeScript specs. This ensures the native implementation must conform to your defined types:

```bash
# iOS
cd ios && pod install

# Android
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

## Manual Type Definitions

For legacy native modules or third-party libraries without TurboModule support, you'll need to create manual type definitions.

### Basic Module Typing

```typescript
// types/native-modules.d.ts
import { NativeModules } from 'react-native';

interface CameraModuleInterface {
  takePicture(options: CameraOptions): Promise<PhotoResult>;
  startRecording(options: RecordingOptions): Promise<void>;
  stopRecording(): Promise<VideoResult>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
}

interface CameraOptions {
  quality: 'low' | 'medium' | 'high';
  flashMode: 'off' | 'on' | 'auto';
  cameraType: 'front' | 'back';
  aspectRatio?: string;
}

interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  exif?: Record<string, unknown>;
}

interface RecordingOptions {
  maxDuration?: number;
  maxFileSize?: number;
  quality: 'low' | 'medium' | 'high';
}

interface VideoResult {
  uri: string;
  duration: number;
  size: number;
}

declare module 'react-native' {
  interface NativeModulesStatic {
    CameraModule: CameraModuleInterface;
  }
}

// Export typed module for direct import
export const CameraModule = NativeModules.CameraModule as CameraModuleInterface;
```

### Creating a Type-Safe Wrapper

For better developer experience, wrap native modules with a typed facade:

```typescript
// modules/Camera.ts
import { NativeModules, Platform } from 'react-native';

interface CameraModuleInterface {
  takePicture(options: CameraOptions): Promise<PhotoResult>;
  startRecording(options: RecordingOptions): Promise<void>;
  stopRecording(): Promise<VideoResult>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
}

// Platform-specific interfaces for methods with different signatures
interface IOSCameraModule extends CameraModuleInterface {
  setLivePhotoEnabled(enabled: boolean): void;
}

interface AndroidCameraModule extends CameraModuleInterface {
  setZoomLevel(level: number): void;
}

const CameraModuleNative = NativeModules.CameraModule;

// Validate module exists
if (!CameraModuleNative) {
  throw new Error(
    'CameraModule native module is not available. ' +
    'Make sure you have linked the native module correctly.'
  );
}

// Type-safe wrapper with runtime validation
export const Camera: CameraModuleInterface = {
  async takePicture(options: CameraOptions): Promise<PhotoResult> {
    validateCameraOptions(options);
    return CameraModuleNative.takePicture(options);
  },

  async startRecording(options: RecordingOptions): Promise<void> {
    validateRecordingOptions(options);
    return CameraModuleNative.startRecording(options);
  },

  async stopRecording(): Promise<VideoResult> {
    return CameraModuleNative.stopRecording();
  },

  async hasPermission(): Promise<boolean> {
    return CameraModuleNative.hasPermission();
  },

  async requestPermission(): Promise<boolean> {
    return CameraModuleNative.requestPermission();
  },
};

// Platform-specific exports
export const IOSCamera = Platform.OS === 'ios'
  ? (CameraModuleNative as IOSCameraModule)
  : null;

export const AndroidCamera = Platform.OS === 'android'
  ? (CameraModuleNative as AndroidCameraModule)
  : null;
```

## Typing Native Methods

Native methods can have various signatures. Here's how to type them correctly:

### Synchronous Methods

```typescript
interface SyncModule {
  // Simple return type
  getVersion(): string;

  // Complex return type
  getDeviceInfo(): {
    model: string;
    systemVersion: string;
    uniqueId: string;
  };

  // With parameters
  formatCurrency(amount: number, currencyCode: string): string;

  // Void return
  logEvent(eventName: string, properties: Record<string, unknown>): void;
}
```

### Asynchronous Methods with Promises

```typescript
interface AsyncModule {
  // Simple Promise
  fetchUser(userId: string): Promise<User>;

  // Promise that may reject with specific error
  authenticate(credentials: Credentials): Promise<AuthResult>;

  // Promise with void resolution
  saveData(key: string, value: string): Promise<void>;

  // Promise with nullable result
  findItem(query: string): Promise<Item | null>;

  // Promise with array result
  searchItems(query: string, limit: number): Promise<Item[]>;
}

// Define the error type for native errors
interface NativeError {
  code: string;
  message: string;
  userInfo?: Record<string, unknown>;
}

// Wrapper with error handling
async function safeAuthenticate(
  credentials: Credentials
): Promise<AuthResult> {
  try {
    return await NativeModules.AuthModule.authenticate(credentials);
  } catch (error) {
    const nativeError = error as NativeError;
    if (nativeError.code === 'INVALID_CREDENTIALS') {
      throw new InvalidCredentialsError(nativeError.message);
    }
    throw error;
  }
}
```

## Typing Callbacks and Promises

### Callback Pattern

Some native modules use callbacks instead of Promises:

```typescript
interface CallbackModule {
  // Error-first callback
  fetchData(
    url: string,
    callback: (error: Error | null, data: string | null) => void
  ): void;

  // Success-only callback
  onComplete(callback: (result: CompletionResult) => void): void;

  // Progress callback with completion
  downloadFile(
    url: string,
    onProgress: (progress: number) => void,
    onComplete: (error: Error | null, filePath: string | null) => void
  ): void;

  // Subscription-style callback returning cleanup function
  subscribe(
    topic: string,
    callback: (message: Message) => void
  ): () => void;
}
```

### Promisifying Callbacks

Create typed Promise wrappers for callback-based APIs:

```typescript
// utilities/promisify.ts
type CallbackFunction<T> = (error: Error | null, result: T | null) => void;

export function promisify<TArgs extends unknown[], TResult>(
  fn: (...args: [...TArgs, CallbackFunction<TResult>]) => void
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs): Promise<TResult> => {
    return new Promise((resolve, reject) => {
      fn(...args, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as TResult);
        }
      });
    });
  };
}

// Usage
const fetchDataAsync = promisify(NativeModules.DataModule.fetchData);
const data: string = await fetchDataAsync('https://api.example.com/data');
```

## Native Component Prop Types

Native components (ViewManagers) require careful prop typing to ensure the JavaScript interface matches native expectations.

### Basic Component Props

```typescript
// components/NativeMap.tsx
import {
  requireNativeComponent,
  ViewProps,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
} from 'react-native';

// Define the coordinate type
interface Coordinate {
  latitude: number;
  longitude: number;
}

// Define marker type
interface MapMarker {
  id: string;
  coordinate: Coordinate;
  title?: string;
  description?: string;
  icon?: string;
}

// Define event payload types
interface RegionChangeEvent {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  isGesture: boolean;
}

interface MarkerPressEvent {
  markerId: string;
  coordinate: Coordinate;
}

// Define component props
interface NativeMapProps extends ViewProps {
  // Region control
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  // Map configuration
  mapType?: 'standard' | 'satellite' | 'hybrid';
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  rotateEnabled?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;

  // Markers
  markers?: MapMarker[];

  // Event handlers
  onRegionChange?: (event: NativeSyntheticEvent<RegionChangeEvent>) => void;
  onRegionChangeComplete?: (event: NativeSyntheticEvent<RegionChangeEvent>) => void;
  onMarkerPress?: (event: NativeSyntheticEvent<MarkerPressEvent>) => void;
  onMapReady?: () => void;

  // Style
  style?: StyleProp<ViewStyle>;
}

// Create the native component with proper typing
const NativeMapView = requireNativeComponent<NativeMapProps>('RNMapView');

// Export a wrapper component for better DX
export const MapView: React.FC<NativeMapProps> = (props) => {
  return <NativeMapView {...props} />;
};
```

### Native Component with Commands

For components that expose imperative methods:

```typescript
// components/NativeVideoPlayer.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  ViewProps,
  Platform,
  NativeSyntheticEvent,
} from 'react-native';

// Native commands interface
interface VideoPlayerCommands {
  play(): void;
  pause(): void;
  seekTo(position: number): void;
  setVolume(volume: number): void;
}

// Event types
interface PlaybackStateEvent {
  isPlaying: boolean;
  position: number;
  duration: number;
  bufferedPosition: number;
}

interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

// Props interface
interface NativeVideoPlayerProps extends ViewProps {
  source: { uri: string } | { require: number };
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  volume?: number;
  rate?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  onPlaybackStateChange?: (event: NativeSyntheticEvent<PlaybackStateEvent>) => void;
  onError?: (event: NativeSyntheticEvent<ErrorEvent>) => void;
  onEnd?: () => void;
  onLoad?: (event: NativeSyntheticEvent<{ duration: number }>) => void;
}

const NativeVideoPlayerView =
  requireNativeComponent<NativeVideoPlayerProps>('RNVideoPlayer');

const COMPONENT_NAME = 'RNVideoPlayer';

// Helper to dispatch commands
function dispatchCommand(
  viewRef: React.RefObject<any>,
  commandName: string,
  args: unknown[] = []
): void {
  const handle = findNodeHandle(viewRef.current);
  if (handle == null) {
    console.warn('VideoPlayer: Cannot dispatch command, view not found');
    return;
  }

  const commands = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands;
  if (!commands) {
    console.warn('VideoPlayer: Commands not found in ViewManager config');
    return;
  }

  const commandId = commands[commandName];
  if (commandId == null) {
    console.warn(`VideoPlayer: Command '${commandName}' not found`);
    return;
  }

  UIManager.dispatchViewManagerCommand(handle, commandId, args);
}

// Typed ref interface
export interface VideoPlayerRef extends VideoPlayerCommands {}

// Wrapper component with forwarded ref
export const VideoPlayer = forwardRef<VideoPlayerRef, NativeVideoPlayerProps>(
  (props, ref) => {
    const nativeRef = useRef(null);

    useImperativeHandle(ref, () => ({
      play() {
        dispatchCommand(nativeRef, 'play');
      },
      pause() {
        dispatchCommand(nativeRef, 'pause');
      },
      seekTo(position: number) {
        dispatchCommand(nativeRef, 'seekTo', [position]);
      },
      setVolume(volume: number) {
        dispatchCommand(nativeRef, 'setVolume', [volume]);
      },
    }));

    return <NativeVideoPlayerView ref={nativeRef} {...props} />;
  }
);
```

## NativeEventEmitter Typing

Native modules often emit events to JavaScript. Properly typing these events is crucial.

### Creating Typed Event Emitters

```typescript
// modules/BluetoothModule.ts
import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

// Define all possible events and their payloads
interface BluetoothEventMap {
  deviceDiscovered: {
    id: string;
    name: string;
    rssi: number;
    advertisementData: Record<string, unknown>;
  };
  deviceConnected: {
    id: string;
    name: string;
  };
  deviceDisconnected: {
    id: string;
    reason: string;
  };
  stateChanged: {
    state: 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'off' | 'on';
  };
  characteristicValueChanged: {
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
    value: string; // Base64 encoded
  };
}

// Type-safe event names
type BluetoothEventName = keyof BluetoothEventMap;

// Native module interface
interface BluetoothModuleInterface {
  startScan(serviceUuids?: string[]): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  read(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<string>;
  write(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    value: string
  ): Promise<void>;
}

const BluetoothNative = NativeModules.BluetoothModule as BluetoothModuleInterface;
const bluetoothEmitter = new NativeEventEmitter(NativeModules.BluetoothModule);

// Type-safe event subscription
function addBluetoothListener<E extends BluetoothEventName>(
  eventName: E,
  callback: (event: BluetoothEventMap[E]) => void
): EmitterSubscription {
  return bluetoothEmitter.addListener(eventName, callback);
}

// Export typed API
export const Bluetooth = {
  ...BluetoothNative,

  addListener: addBluetoothListener,

  // Convenience methods for common events
  onDeviceDiscovered(
    callback: (device: BluetoothEventMap['deviceDiscovered']) => void
  ): EmitterSubscription {
    return addBluetoothListener('deviceDiscovered', callback);
  },

  onStateChanged(
    callback: (state: BluetoothEventMap['stateChanged']) => void
  ): EmitterSubscription {
    return addBluetoothListener('stateChanged', callback);
  },
};
```

### Creating a Typed Event Emitter Hook

```typescript
// hooks/useBluetoothEvent.ts
import { useEffect } from 'react';
import { Bluetooth, BluetoothEventMap } from '../modules/BluetoothModule';

export function useBluetoothEvent<E extends keyof BluetoothEventMap>(
  eventName: E,
  callback: (event: BluetoothEventMap[E]) => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const subscription = Bluetooth.addListener(eventName, callback);
    return () => subscription.remove();
  }, [eventName, ...deps]);
}

// Usage
function BluetoothScanner() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);

  useBluetoothEvent('deviceDiscovered', (event) => {
    // event is fully typed as BluetoothEventMap['deviceDiscovered']
    setDevices((prev) => [...prev, event]);
  });

  return <DeviceList devices={devices} />;
}
```

## Platform-Specific Types

React Native applications often have platform-specific native code. Type definitions should reflect these differences.

### Conditional Types Based on Platform

```typescript
// types/platform-specific.ts
import { Platform } from 'react-native';

// iOS-specific types
interface IOSHaptics {
  impactLight(): void;
  impactMedium(): void;
  impactHeavy(): void;
  notificationSuccess(): void;
  notificationWarning(): void;
  notificationError(): void;
  selectionChanged(): void;
}

// Android-specific types
interface AndroidHaptics {
  vibrate(duration: number): void;
  vibratePattern(pattern: number[], repeat: number): void;
  cancel(): void;
}

// Union type for cross-platform usage
type HapticsModule = IOSHaptics | AndroidHaptics;

// Type guards
function isIOSHaptics(haptics: HapticsModule): haptics is IOSHaptics {
  return Platform.OS === 'ios';
}

function isAndroidHaptics(haptics: HapticsModule): haptics is AndroidHaptics {
  return Platform.OS === 'android';
}

// Platform-specific module loading
const Haptics: HapticsModule = Platform.select({
  ios: NativeModules.IOSHaptics as IOSHaptics,
  android: NativeModules.AndroidHaptics as AndroidHaptics,
})!;

// Cross-platform wrapper
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy'): void {
  if (isIOSHaptics(Haptics)) {
    switch (type) {
      case 'light':
        Haptics.impactLight();
        break;
      case 'medium':
        Haptics.impactMedium();
        break;
      case 'heavy':
        Haptics.impactHeavy();
        break;
    }
  } else if (isAndroidHaptics(Haptics)) {
    const durations = { light: 10, medium: 20, heavy: 30 };
    Haptics.vibrate(durations[type]);
  }
}
```

### Platform-Specific Component Props

```typescript
// components/NativeDatePicker.tsx
import { Platform, ViewProps } from 'react-native';

// Common props
interface BaseDatePickerProps extends ViewProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

// iOS-specific props
interface IOSDatePickerProps extends BaseDatePickerProps {
  mode: 'date' | 'time' | 'datetime' | 'countdown';
  display?: 'default' | 'spinner' | 'compact' | 'inline';
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  locale?: string;
  timeZoneOffsetInMinutes?: number;
}

// Android-specific props
interface AndroidDatePickerProps extends BaseDatePickerProps {
  mode: 'date' | 'time';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  is24Hour?: boolean;
}

// Platform-conditional type
type DatePickerProps = Platform['OS'] extends 'ios'
  ? IOSDatePickerProps
  : AndroidDatePickerProps;

// Or use a discriminated union for runtime checking
type PlatformDatePickerProps =
  | ({ platform: 'ios' } & IOSDatePickerProps)
  | ({ platform: 'android' } & AndroidDatePickerProps);
```

## Third-Party Library Types

Many third-party native libraries lack TypeScript definitions. Here's how to create them.

### Augmenting Existing Modules

```typescript
// types/react-native-keychain.d.ts
declare module 'react-native-keychain' {
  export interface UserCredentials {
    username: string;
    password: string;
    service: string;
    storage?: string;
  }

  export interface SetOptions {
    accessControl?: AccessControl;
    accessible?: Accessible;
    accessGroup?: string;
    service?: string;
    securityLevel?: SecurityLevel;
    storage?: Storage;
  }

  export interface GetOptions {
    authenticationPrompt?: AuthenticationPrompt;
    service?: string;
    accessControl?: AccessControl;
  }

  export interface AuthenticationPrompt {
    title?: string;
    subtitle?: string;
    description?: string;
    cancel?: string;
  }

  export enum AccessControl {
    UserPresence = 'UserPresence',
    BiometryAny = 'BiometryAny',
    BiometryCurrentSet = 'BiometryCurrentSet',
    DevicePasscode = 'DevicePasscode',
    BiometryAnyOrDevicePasscode = 'BiometryAnyOrDevicePasscode',
    BiometryCurrentSetOrDevicePasscode = 'BiometryCurrentSetOrDevicePasscode',
  }

  export enum Accessible {
    WhenUnlocked = 'AccessibleWhenUnlocked',
    AfterFirstUnlock = 'AccessibleAfterFirstUnlock',
    Always = 'AccessibleAlways',
    WhenPasscodeSetThisDeviceOnly = 'AccessibleWhenPasscodeSetThisDeviceOnly',
    WhenUnlockedThisDeviceOnly = 'AccessibleWhenUnlockedThisDeviceOnly',
    AfterFirstUnlockThisDeviceOnly = 'AccessibleAfterFirstUnlockThisDeviceOnly',
  }

  export enum SecurityLevel {
    Secure = 'SECURE_SOFTWARE',
    SecureHardware = 'SECURE_HARDWARE',
  }

  export enum Storage {
    SharedPreferences = 'sharedPreferences',
    KeychainAES = 'keychainAES',
    RSA = 'RSA',
  }

  export function setGenericPassword(
    username: string,
    password: string,
    options?: SetOptions
  ): Promise<boolean>;

  export function getGenericPassword(
    options?: GetOptions
  ): Promise<false | UserCredentials>;

  export function resetGenericPassword(
    options?: { service?: string }
  ): Promise<boolean>;

  export function hasInternetCredentials(
    server: string
  ): Promise<false | 'credentials'>;

  export function setInternetCredentials(
    server: string,
    username: string,
    password: string,
    options?: SetOptions
  ): Promise<boolean>;

  export function getInternetCredentials(
    server: string,
    options?: GetOptions
  ): Promise<false | UserCredentials>;

  export function resetInternetCredentials(
    server: string
  ): Promise<boolean>;

  export function getSupportedBiometryType(): Promise<
    null | 'TouchID' | 'FaceID' | 'Fingerprint' | 'Iris'
  >;

  export function canImplyAuthentication(
    options?: { authenticationType?: AuthenticationType }
  ): Promise<boolean>;

  export enum AuthenticationType {
    DevicePasscodeOrBiometrics = 'AuthenticationWithBiometricsDevicePasscode',
    Biometrics = 'AuthenticationWithBiometrics',
  }
}
```

### Creating Declaration Files for Untyped Libraries

```typescript
// types/react-native-custom-tabs.d.ts
declare module 'react-native-custom-tabs' {
  export interface CustomTabsOptions {
    toolbarColor?: string;
    enableUrlBarHiding?: boolean;
    showPageTitle?: boolean;
    enableDefaultShare?: boolean;
    animations?: {
      startEnter?: string;
      startExit?: string;
      endEnter?: string;
      endExit?: string;
    };
    headers?: Record<string, string>;
    forceCloseOnRedirection?: boolean;
  }

  export function openURL(
    url: string,
    options?: CustomTabsOptions
  ): Promise<boolean>;

  export function isAvailable(): Promise<boolean>;

  const CustomTabs: {
    openURL: typeof openURL;
    isAvailable: typeof isAvailable;
  };

  export default CustomTabs;
}
```

## Declaration File Creation

Organizing type declarations properly ensures maintainability and discoverability.

### Project Structure

```
src/
  types/
    native-modules/
      index.d.ts           # Re-exports all module types
      camera.d.ts          # Camera module types
      bluetooth.d.ts       # Bluetooth module types
      haptics.d.ts         # Haptics module types
    native-components/
      index.d.ts           # Re-exports all component types
      map-view.d.ts        # Map component types
      video-player.d.ts    # Video player types
    third-party/
      react-native-keychain.d.ts
      react-native-custom-tabs.d.ts
    globals.d.ts           # Global type augmentations
    index.d.ts             # Main entry point
```

### Global Augmentations

```typescript
// types/globals.d.ts
import 'react-native';

declare module 'react-native' {
  // Augment NativeModulesStatic
  interface NativeModulesStatic {
    CameraModule: import('./native-modules/camera').CameraModuleInterface;
    BluetoothModule: import('./native-modules/bluetooth').BluetoothModuleInterface;
    HapticsModule: import('./native-modules/haptics').HapticsModuleInterface;
  }
}

// Global type utilities
declare global {
  // Native event type helper
  type NativeEvent<T> = import('react-native').NativeSyntheticEvent<T>;

  // Platform-specific type helper
  type PlatformSpecific<IOS, Android> =
    typeof import('react-native').Platform.OS extends 'ios' ? IOS : Android;
}

export {};
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "jsx": "react-native",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@types/*": ["src/types/*"],
      "@modules/*": ["src/modules/*"],
      "@components/*": ["src/components/*"]
    },
    "typeRoots": [
      "./node_modules/@types",
      "./src/types"
    ]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Validation Testing

Ensure your type definitions match the actual native implementation.

### Runtime Type Validation

```typescript
// utils/typeValidation.ts
import { z } from 'zod';

// Define runtime validators that match TypeScript types
const PhotoResultSchema = z.object({
  uri: z.string().url(),
  width: z.number().positive(),
  height: z.number().positive(),
  exif: z.record(z.unknown()).optional(),
});

const VideoResultSchema = z.object({
  uri: z.string(),
  duration: z.number().nonnegative(),
  size: z.number().positive(),
});

// Wrapper that validates native responses
export async function takePictureValidated(
  options: CameraOptions
): Promise<PhotoResult> {
  const result = await NativeModules.CameraModule.takePicture(options);
  return PhotoResultSchema.parse(result);
}

// Generic validated wrapper factory
export function createValidatedMethod<TInput, TOutput>(
  method: (input: TInput) => Promise<unknown>,
  outputSchema: z.ZodSchema<TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const result = await method(input);
    return outputSchema.parse(result);
  };
}
```

### Integration Tests for Types

```typescript
// __tests__/native-module-types.test.ts
import { NativeModules } from 'react-native';
import { CameraModule } from '../types/native-modules/camera';

describe('CameraModule Type Compliance', () => {
  it('should have all required methods', () => {
    const module = NativeModules.CameraModule;

    expect(typeof module.takePicture).toBe('function');
    expect(typeof module.startRecording).toBe('function');
    expect(typeof module.stopRecording).toBe('function');
    expect(typeof module.hasPermission).toBe('function');
    expect(typeof module.requestPermission).toBe('function');
  });

  it('should return correctly typed photo result', async () => {
    const result = await NativeModules.CameraModule.takePicture({
      quality: 'high',
      flashMode: 'auto',
      cameraType: 'back',
    });

    // Type assertion tests
    expect(typeof result.uri).toBe('string');
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');

    // Validate URI format
    expect(result.uri).toMatch(/^(file:|content:|ph:)/);

    // Validate dimensions are positive
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('should handle optional exif data', async () => {
    const result = await NativeModules.CameraModule.takePicture({
      quality: 'high',
      flashMode: 'off',
      cameraType: 'back',
    });

    if (result.exif) {
      expect(typeof result.exif).toBe('object');
    }
  });
});
```

### Type-Level Testing with ts-expect-error

```typescript
// __tests__/type-tests.ts
// This file contains compile-time type tests

import { CameraModule } from '../modules/Camera';

// Test: takePicture requires quality
// @ts-expect-error - quality is required
CameraModule.takePicture({ flashMode: 'auto', cameraType: 'back' });

// Test: quality must be valid value
// @ts-expect-error - 'ultra' is not a valid quality
CameraModule.takePicture({ quality: 'ultra', flashMode: 'auto', cameraType: 'back' });

// Test: return type is Promise<PhotoResult>
async function testReturnType() {
  const result = await CameraModule.takePicture({
    quality: 'high',
    flashMode: 'auto',
    cameraType: 'back',
  });

  // This should compile without error
  const uri: string = result.uri;
  const width: number = result.width;
  const height: number = result.height;

  // @ts-expect-error - uri is string, not number
  const wrongType: number = result.uri;
}
```

## Best Practices for Native Types

### 1. Use Strict Types Over `any`

```typescript
// Bad - loses type safety
interface BadModule {
  processData(data: any): Promise<any>;
}

// Good - explicit types
interface GoodModule {
  processData(data: ProcessInput): Promise<ProcessOutput>;
}
```

### 2. Document Native Constraints

```typescript
interface FileSystemModule {
  /**
   * Writes data to a file at the specified path.
   *
   * @param path - Absolute file path. On iOS, must be within app sandbox.
   *               On Android, requires WRITE_EXTERNAL_STORAGE permission for external paths.
   * @param data - Content to write. Maximum size: 50MB
   * @param encoding - File encoding. Defaults to 'utf8'
   * @throws {NativeError} code: 'E_FILE_NOT_FOUND' if parent directory doesn't exist
   * @throws {NativeError} code: 'E_PERMISSION_DENIED' if write permission is missing
   * @throws {NativeError} code: 'E_DISK_FULL' if storage is full
   */
  writeFile(
    path: string,
    data: string,
    encoding?: 'utf8' | 'ascii' | 'base64'
  ): Promise<void>;
}
```

### 3. Use Branded Types for Native Identifiers

```typescript
// Create branded types for type-safe identifiers
type DeviceId = string & { readonly __brand: 'DeviceId' };
type ServiceUUID = string & { readonly __brand: 'ServiceUUID' };
type CharacteristicUUID = string & { readonly __brand: 'CharacteristicUUID' };

// Factory functions to create branded types
function createDeviceId(id: string): DeviceId {
  return id as DeviceId;
}

// Now methods can require specific ID types
interface BluetoothModule {
  connect(deviceId: DeviceId): Promise<void>;
  readCharacteristic(
    deviceId: DeviceId,
    serviceUuid: ServiceUUID,
    characteristicUuid: CharacteristicUUID
  ): Promise<string>;
}

// This prevents mixing up different ID types
const deviceId = createDeviceId('AA:BB:CC:DD:EE:FF');
const serviceUuid = createServiceUUID('180D');

// TypeScript error: Cannot assign CharacteristicUUID to ServiceUUID parameter
// Bluetooth.readCharacteristic(deviceId, characteristicUuid, serviceUuid);
```

### 4. Handle Null and Undefined Explicitly

```typescript
interface StorageModule {
  // Clearly indicate that result may be null
  getItem(key: string): Promise<string | null>;

  // Use undefined for optional parameters
  setItem(key: string, value: string, options?: StorageOptions): Promise<void>;

  // Return type indicates possible empty result
  getAllKeys(): Promise<string[]>; // Empty array instead of null
}
```

### 5. Version Your Type Definitions

```typescript
/**
 * @version 2.0.0
 * @since 1.0.0
 * @deprecated getDeviceId is deprecated since 1.5.0, use getUniqueId instead
 */
interface DeviceInfoModule {
  /** @deprecated Use getUniqueId instead */
  getDeviceId(): string;

  /** @since 1.5.0 */
  getUniqueId(): Promise<string>;

  /** @since 2.0.0 */
  getDeviceToken(): Promise<string>;
}
```

### 6. Create Type Guards for Runtime Safety

```typescript
interface NativeResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function isSuccessResponse<T>(
  response: NativeResponse<T>
): response is NativeResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

function isErrorResponse<T>(
  response: NativeResponse<T>
): response is NativeResponse<T> & { success: false; error: NonNullable<NativeResponse<T>['error']> } {
  return response.success === false && response.error !== undefined;
}

// Usage
async function fetchFromNative<T>(method: string): Promise<T> {
  const response = await NativeModules.DataModule[method]() as NativeResponse<T>;

  if (isSuccessResponse(response)) {
    return response.data; // TypeScript knows data exists
  }

  if (isErrorResponse(response)) {
    throw new NativeError(response.error.code, response.error.message);
  }

  throw new Error('Unexpected response format');
}
```

## Conclusion

Properly typing native modules and components in React Native requires attention to detail and a deep understanding of both TypeScript and the native platforms. By following the patterns and practices outlined in this guide, you can create type-safe interfaces that catch errors at compile time, provide excellent developer experience through IntelliSense, and serve as living documentation for your native bridge code.

The key takeaways are:

1. Use TurboModules and Codegen for new native modules to get automatic type generation
2. Create comprehensive manual type definitions for legacy modules and third-party libraries
3. Type all aspects of native communication: methods, callbacks, events, and component props
4. Handle platform differences explicitly with conditional types and type guards
5. Validate types at runtime during development to ensure they match native implementations
6. Organize type declarations in a maintainable project structure
7. Write type-level tests to prevent type regressions

With these practices in place, your React Native TypeScript codebase will be more robust, maintainable, and pleasant to work with across the JavaScript-native boundary.
