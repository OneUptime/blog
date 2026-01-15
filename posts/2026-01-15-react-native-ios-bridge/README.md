# How to Bridge Native iOS Modules to React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, iOS, Native Module, Bridge, Swift, Objective-C, Mobile Development

Description: Learn how to create native iOS modules and bridge them to React Native for accessing native iOS functionality.

---

React Native provides an excellent framework for building cross-platform mobile applications using JavaScript. However, there are times when you need to access native iOS functionality that is not exposed through React Native's built-in APIs. This is where native modules come into play. In this comprehensive guide, we will explore how to create native iOS modules and bridge them to React Native, enabling you to unlock the full power of the iOS platform.

## Table of Contents

1. [When to Create Native Modules](#when-to-create-native-modules)
2. [Objective-C Module Basics](#objective-c-module-basics)
3. [Swift Module with Bridging Header](#swift-module-with-bridging-header)
4. [Exporting Methods to JavaScript](#exporting-methods-to-javascript)
5. [Handling Callbacks](#handling-callbacks)
6. [Promises in Native Modules](#promises-in-native-modules)
7. [Sending Events to JavaScript](#sending-events-to-javascript)
8. [Constants Export](#constants-export)
9. [Threading Considerations](#threading-considerations)
10. [TurboModules Overview](#turbomodules-overview)
11. [Testing Native Modules](#testing-native-modules)
12. [Debugging Bridge Issues](#debugging-bridge-issues)

---

## When to Create Native Modules

Before diving into the implementation details, it is important to understand when creating a native module is the right approach. Native modules should be considered when:

### Performance-Critical Operations

When your application requires high-performance computations, image processing, or complex algorithms, native code often outperforms JavaScript significantly. Native modules execute on the native thread without the overhead of the JavaScript bridge.

### Accessing Platform-Specific APIs

iOS provides many powerful APIs that are not exposed through React Native, such as:

- HealthKit for health and fitness data
- Core ML for machine learning
- ARKit for augmented reality
- CallKit for VoIP integration
- HomeKit for smart home devices

### Integrating Third-Party Native SDKs

Many enterprise SDKs (payment processors, analytics tools, authentication services) are only available as native libraries and require native module wrappers.

### Hardware Access

Direct access to hardware features like Bluetooth LE, NFC, or advanced camera controls often requires native implementation.

### Existing Native Code Reuse

If your organization has existing native iOS code or libraries, wrapping them in native modules allows reuse in React Native applications.

---

## Objective-C Module Basics

Let us start with the traditional approach using Objective-C. This remains widely supported and is often simpler for basic modules.

### Creating the Module Header

First, create a header file for your module:

```objective-c
// RNDeviceInfo.h

#import <React/RCTBridgeModule.h>

@interface RNDeviceInfo : NSObject <RCTBridgeModule>

@end
```

### Implementing the Module

Now implement the module in the corresponding `.m` file:

```objective-c
// RNDeviceInfo.m

#import "RNDeviceInfo.h"
#import <UIKit/UIKit.h>

@implementation RNDeviceInfo

// This macro exports the module to React Native
RCT_EXPORT_MODULE();

// Export a method to JavaScript
RCT_EXPORT_METHOD(getDeviceName:(RCTResponseSenderBlock)callback)
{
  NSString *deviceName = [[UIDevice currentDevice] name];
  callback(@[[NSNull null], deviceName]);
}

// Synchronous method export
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getSystemVersion)
{
  return [[UIDevice currentDevice] systemVersion];
}

@end
```

### Module Registration

The `RCT_EXPORT_MODULE()` macro automatically registers the module with React Native. By default, the module name matches the Objective-C class name. You can customize this:

```objective-c
RCT_EXPORT_MODULE(CustomModuleName);
```

### Accessing from JavaScript

Once registered, you can access the module from JavaScript:

```javascript
import { NativeModules } from 'react-native';

const { RNDeviceInfo } = NativeModules;

// Using the callback-based method
RNDeviceInfo.getDeviceName((error, name) => {
  if (error) {
    console.error(error);
  } else {
    console.log('Device name:', name);
  }
});

// Using the synchronous method (use sparingly)
const version = RNDeviceInfo.getSystemVersion();
console.log('System version:', version);
```

---

## Swift Module with Bridging Header

Swift is the modern language for iOS development, and creating native modules in Swift is fully supported. However, it requires some additional setup.

### Creating the Bridging Header

First, you need a bridging header to expose React Native's Objective-C headers to Swift:

```objective-c
// YourApp-Bridging-Header.h

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
```

### Configuring the Build Settings

In your Xcode project settings, ensure the bridging header path is set:

1. Select your project in Xcode
2. Go to Build Settings
3. Search for "Objective-C Bridging Header"
4. Set the path to your bridging header file

### Creating the Swift Module

```swift
// BiometricAuth.swift

import Foundation
import LocalAuthentication

@objc(BiometricAuth)
class BiometricAuth: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func authenticateUser(
    _ reason: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      reject("BIOMETRIC_NOT_AVAILABLE", "Biometric authentication is not available", error)
      return
    }

    context.evaluatePolicy(
      .deviceOwnerAuthenticationWithBiometrics,
      localizedReason: reason
    ) { success, authError in
      DispatchQueue.main.async {
        if success {
          resolve(["success": true])
        } else {
          reject("AUTH_FAILED", "Authentication failed", authError)
        }
      }
    }
  }

  @objc
  func getBiometryType(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      resolve("none")
      return
    }

    switch context.biometryType {
    case .faceID:
      resolve("FaceID")
    case .touchID:
      resolve("TouchID")
    case .opticID:
      resolve("OpticID")
    default:
      resolve("none")
    }
  }
}
```

### Creating the Objective-C Bridge File

Swift modules require an Objective-C file to expose methods to React Native:

```objective-c
// BiometricAuth.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BiometricAuth, NSObject)

RCT_EXTERN_METHOD(authenticateUser:(NSString *)reason
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getBiometryType:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

### Using the Swift Module in JavaScript

```javascript
import { NativeModules } from 'react-native';

const { BiometricAuth } = NativeModules;

async function authenticate() {
  try {
    const biometryType = await BiometricAuth.getBiometryType();
    console.log('Biometry type:', biometryType);

    if (biometryType !== 'none') {
      const result = await BiometricAuth.authenticateUser(
        'Authenticate to access your account'
      );
      console.log('Authentication successful:', result);
    }
  } catch (error) {
    console.error('Authentication error:', error);
  }
}
```

---

## Exporting Methods to JavaScript

React Native provides several macros for exporting methods with different signatures and behaviors.

### Basic Method Export

```objective-c
RCT_EXPORT_METHOD(simpleMethod)
{
  NSLog(@"Simple method called");
}
```

### Methods with Parameters

```objective-c
RCT_EXPORT_METHOD(methodWithParams:(NSString *)name
                  age:(NSInteger)age
                  active:(BOOL)isActive)
{
  NSLog(@"Name: %@, Age: %ld, Active: %d", name, (long)age, isActive);
}
```

### Supported Parameter Types

React Native automatically converts JavaScript types to native types:

| JavaScript | Objective-C |
|------------|-------------|
| string | NSString |
| number | NSInteger, float, double, CGFloat |
| boolean | BOOL |
| array | NSArray |
| object | NSDictionary |
| function | RCTResponseSenderBlock |

### Custom Method Names

You can specify a custom JavaScript name for your method:

```objective-c
RCT_REMAP_METHOD(fetchUserData,
                 fetchUserDataWithId:(NSString *)userId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  // Implementation
}
```

---

## Handling Callbacks

Callbacks are the traditional way to return asynchronous results from native modules.

### Single Callback Pattern

```objective-c
// Objective-C
RCT_EXPORT_METHOD(processData:(NSString *)data
                  callback:(RCTResponseSenderBlock)callback)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    // Simulate processing
    [NSThread sleepForTimeInterval:1.0];

    NSString *result = [data uppercaseString];

    // Callback with error (null) and result
    callback(@[[NSNull null], result]);
  });
}
```

```javascript
// JavaScript
RNMyModule.processData('hello world', (error, result) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', result); // "HELLO WORLD"
  }
});
```

### Success and Error Callbacks

```objective-c
RCT_EXPORT_METHOD(fetchData:(NSString *)url
                  onSuccess:(RCTResponseSenderBlock)onSuccess
                  onError:(RCTResponseSenderBlock)onError)
{
  NSURL *requestURL = [NSURL URLWithString:url];

  if (!requestURL) {
    onError(@[@"Invalid URL provided"]);
    return;
  }

  NSURLSession *session = [NSURLSession sharedSession];
  NSURLSessionDataTask *task = [session dataTaskWithURL:requestURL
    completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
      if (error) {
        onError(@[error.localizedDescription]);
      } else {
        NSString *responseString = [[NSString alloc] initWithData:data
                                                         encoding:NSUTF8StringEncoding];
        onSuccess(@[responseString]);
      }
    }];

  [task resume];
}
```

### Important Callback Rules

1. **Callbacks can only be invoked once** - attempting to call a callback multiple times will cause a crash
2. **Callbacks must be invoked** - failing to invoke a callback can lead to memory leaks
3. **Order matters** - callbacks in the JavaScript signature must match the native signature order

---

## Promises in Native Modules

Promises provide a cleaner, more modern approach for handling asynchronous operations and integrate well with async/await syntax.

### Promise-Based Method in Objective-C

```objective-c
RCT_EXPORT_METHOD(downloadFile:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *downloadURL = [NSURL URLWithString:url];

  if (!downloadURL) {
    reject(@"INVALID_URL", @"The provided URL is invalid", nil);
    return;
  }

  NSURLSession *session = [NSURLSession sharedSession];
  NSURLSessionDownloadTask *task = [session downloadTaskWithURL:downloadURL
    completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
      if (error) {
        reject(@"DOWNLOAD_ERROR", error.localizedDescription, error);
        return;
      }

      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;

      resolve(@{
        @"statusCode": @(httpResponse.statusCode),
        @"localPath": location.path ?: [NSNull null],
        @"mimeType": response.MIMEType ?: @"unknown"
      });
    }];

  [task resume];
}
```

### Promise-Based Method in Swift

```swift
@objc
func fetchUserProfile(
  _ userId: String,
  resolver resolve: @escaping RCTPromiseResolveBlock,
  rejecter reject: @escaping RCTPromiseRejectBlock
) {
  guard !userId.isEmpty else {
    reject("INVALID_USER_ID", "User ID cannot be empty", nil)
    return
  }

  // Simulated async operation
  DispatchQueue.global().async {
    // Simulate network delay
    Thread.sleep(forTimeInterval: 0.5)

    let profile: [String: Any] = [
      "id": userId,
      "name": "John Doe",
      "email": "john@example.com",
      "verified": true
    ]

    resolve(profile)
  }
}
```

### Using Promises in JavaScript

```javascript
import { NativeModules } from 'react-native';

const { FileDownloader, UserService } = NativeModules;

// Using .then/.catch
FileDownloader.downloadFile('https://example.com/file.pdf')
  .then((result) => {
    console.log('Download complete:', result);
    console.log('Status code:', result.statusCode);
    console.log('Local path:', result.localPath);
  })
  .catch((error) => {
    console.error('Download failed:', error.code, error.message);
  });

// Using async/await
async function loadUserProfile(userId) {
  try {
    const profile = await UserService.fetchUserProfile(userId);
    return profile;
  } catch (error) {
    if (error.code === 'INVALID_USER_ID') {
      console.error('Invalid user ID provided');
    } else {
      console.error('Failed to load profile:', error.message);
    }
    throw error;
  }
}
```

### Error Handling Best Practices

Always provide meaningful error codes and messages:

```objective-c
// Define error domain and codes
static NSString *const RNErrorDomain = @"com.myapp.native";

typedef NS_ENUM(NSInteger, RNErrorCode) {
  RNErrorCodeInvalidInput = 1001,
  RNErrorCodeNetworkFailure = 1002,
  RNErrorCodePermissionDenied = 1003,
  RNErrorCodeNotFound = 1004
};

// Usage in method
NSError *error = [NSError errorWithDomain:RNErrorDomain
                                     code:RNErrorCodePermissionDenied
                                 userInfo:@{NSLocalizedDescriptionKey: @"Camera permission denied"}];
reject(@"PERMISSION_DENIED", @"Camera permission denied", error);
```

---

## Sending Events to JavaScript

Native modules can send events to JavaScript without being explicitly called. This is essential for scenarios like push notifications, location updates, or sensor data.

### Creating an Event Emitter in Objective-C

```objective-c
// RNLocationManager.h

#import <React/RCTEventEmitter.h>

@interface RNLocationManager : RCTEventEmitter <RCTBridgeModule>

@end
```

```objective-c
// RNLocationManager.m

#import "RNLocationManager.h"
#import <CoreLocation/CoreLocation.h>

@interface RNLocationManager () <CLLocationManagerDelegate>

@property (nonatomic, strong) CLLocationManager *locationManager;
@property (nonatomic, assign) BOOL hasListeners;

@end

@implementation RNLocationManager

RCT_EXPORT_MODULE();

- (instancetype)init
{
  self = [super init];
  if (self) {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"onLocationUpdate", @"onLocationError", @"onAuthorizationChange"];
}

// Called when the first listener is added
- (void)startObserving
{
  self.hasListeners = YES;
}

// Called when the last listener is removed
- (void)stopObserving
{
  self.hasListeners = NO;
}

RCT_EXPORT_METHOD(startUpdates)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.locationManager requestWhenInUseAuthorization];
    [self.locationManager startUpdatingLocation];
  });
}

RCT_EXPORT_METHOD(stopUpdates)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.locationManager stopUpdatingLocation];
  });
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager
     didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  if (!self.hasListeners) {
    return;
  }

  CLLocation *location = locations.lastObject;

  [self sendEventWithName:@"onLocationUpdate" body:@{
    @"latitude": @(location.coordinate.latitude),
    @"longitude": @(location.coordinate.longitude),
    @"altitude": @(location.altitude),
    @"accuracy": @(location.horizontalAccuracy),
    @"timestamp": @([location.timestamp timeIntervalSince1970] * 1000)
  }];
}

- (void)locationManager:(CLLocationManager *)manager
       didFailWithError:(NSError *)error
{
  if (!self.hasListeners) {
    return;
  }

  [self sendEventWithName:@"onLocationError" body:@{
    @"code": @(error.code),
    @"message": error.localizedDescription
  }];
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  if (!self.hasListeners) {
    return;
  }

  NSString *status;
  switch (manager.authorizationStatus) {
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      status = @"whenInUse";
      break;
    case kCLAuthorizationStatusAuthorizedAlways:
      status = @"always";
      break;
    case kCLAuthorizationStatusDenied:
      status = @"denied";
      break;
    case kCLAuthorizationStatusRestricted:
      status = @"restricted";
      break;
    default:
      status = @"notDetermined";
  }

  [self sendEventWithName:@"onAuthorizationChange" body:@{@"status": status}];
}

@end
```

### Event Emitter in Swift

```swift
// RNSensorManager.swift

import Foundation
import CoreMotion

@objc(RNSensorManager)
class RNSensorManager: RCTEventEmitter {

  private let motionManager = CMMotionManager()
  private var hasListeners = false

  override init() {
    super.init()
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onAccelerometerData", "onGyroscopeData"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc
  func startAccelerometer(_ interval: Double) {
    guard motionManager.isAccelerometerAvailable else {
      return
    }

    motionManager.accelerometerUpdateInterval = interval / 1000.0
    motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
      guard let self = self, self.hasListeners, let data = data else {
        return
      }

      self.sendEvent(withName: "onAccelerometerData", body: [
        "x": data.acceleration.x,
        "y": data.acceleration.y,
        "z": data.acceleration.z,
        "timestamp": Date().timeIntervalSince1970 * 1000
      ])
    }
  }

  @objc
  func stopAccelerometer() {
    motionManager.stopAccelerometerUpdates()
  }
}
```

### Subscribing to Events in JavaScript

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { RNLocationManager } = NativeModules;
const locationEmitter = new NativeEventEmitter(RNLocationManager);

class LocationService {
  constructor() {
    this.subscriptions = [];
  }

  startTracking() {
    // Subscribe to events
    this.subscriptions.push(
      locationEmitter.addListener('onLocationUpdate', (location) => {
        console.log('Location update:', location);
        console.log(`Lat: ${location.latitude}, Lng: ${location.longitude}`);
      })
    );

    this.subscriptions.push(
      locationEmitter.addListener('onLocationError', (error) => {
        console.error('Location error:', error.message);
      })
    );

    this.subscriptions.push(
      locationEmitter.addListener('onAuthorizationChange', (data) => {
        console.log('Authorization status:', data.status);
      })
    );

    // Start native location updates
    RNLocationManager.startUpdates();
  }

  stopTracking() {
    // Clean up subscriptions
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];

    // Stop native location updates
    RNLocationManager.stopUpdates();
  }
}

export default new LocationService();
```

---

## Constants Export

Native modules can export constants that are available synchronously in JavaScript. This is useful for configuration values, enum mappings, or static data.

### Exporting Constants in Objective-C

```objective-c
// RNAppConstants.m

#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface RNAppConstants : NSObject <RCTBridgeModule>
@end

@implementation RNAppConstants

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES; // Required if accessing UIKit
}

- (NSDictionary *)constantsToExport
{
  UIDevice *device = [UIDevice currentDevice];
  UIScreen *screen = [UIScreen mainScreen];

  return @{
    @"deviceModel": device.model,
    @"systemName": device.systemName,
    @"systemVersion": device.systemVersion,
    @"screenWidth": @(screen.bounds.size.width),
    @"screenHeight": @(screen.bounds.size.height),
    @"screenScale": @(screen.scale),
    @"isSimulator": @(TARGET_OS_SIMULATOR),
    @"buildConfiguration": @{
      @"debug": @(DEBUG),
      @"version": [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: @"unknown",
      @"buildNumber": [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: @"unknown"
    },
    @"statusCodes": @{
      @"success": @0,
      @"invalidInput": @1,
      @"networkError": @2,
      @"permissionDenied": @3,
      @"notFound": @4
    }
  };
}

@end
```

### Exporting Constants in Swift

```swift
// RNFeatureFlags.swift

import Foundation

@objc(RNFeatureFlags)
class RNFeatureFlags: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func constantsToExport() -> [String: Any] {
    return [
      "features": [
        "darkMode": true,
        "biometricAuth": true,
        "pushNotifications": true,
        "offlineMode": false,
        "analytics": true
      ],
      "apiEndpoints": [
        "production": "https://api.example.com",
        "staging": "https://staging-api.example.com",
        "development": "https://dev-api.example.com"
      ],
      "supportedLocales": ["en", "es", "fr", "de", "ja", "zh"],
      "maxUploadSize": 10 * 1024 * 1024, // 10 MB
      "sessionTimeout": 30 * 60 * 1000    // 30 minutes
    ]
  }
}
```

### Accessing Constants in JavaScript

```javascript
import { NativeModules } from 'react-native';

const { RNAppConstants, RNFeatureFlags } = NativeModules;

// Constants are available synchronously
console.log('Device model:', RNAppConstants.deviceModel);
console.log('System version:', RNAppConstants.systemVersion);
console.log('Screen dimensions:', RNAppConstants.screenWidth, 'x', RNAppConstants.screenHeight);

// Nested constants
console.log('App version:', RNAppConstants.buildConfiguration.version);
console.log('Is debug:', RNAppConstants.buildConfiguration.debug);

// Feature flags
if (RNFeatureFlags.features.darkMode) {
  console.log('Dark mode is enabled');
}

// Using status codes
function handleError(code) {
  const { statusCodes } = RNAppConstants;

  switch (code) {
    case statusCodes.invalidInput:
      return 'Invalid input provided';
    case statusCodes.networkError:
      return 'Network error occurred';
    case statusCodes.permissionDenied:
      return 'Permission denied';
    case statusCodes.notFound:
      return 'Resource not found';
    default:
      return 'Unknown error';
  }
}
```

---

## Threading Considerations

Understanding threading is critical for native module development. Incorrect threading can lead to crashes, UI freezes, or unexpected behavior.

### The Main Queue

By default, native module methods are invoked on a background thread. UI operations must be performed on the main queue:

```objective-c
RCT_EXPORT_METHOD(showAlert:(NSString *)title message:(NSString *)message)
{
  // UI operations MUST be on main queue
  dispatch_async(dispatch_get_main_queue(), ^{
    UIAlertController *alert = [UIAlertController
      alertControllerWithTitle:title
      message:message
      preferredStyle:UIAlertControllerStyleAlert];

    UIAlertAction *okAction = [UIAlertAction
      actionWithTitle:@"OK"
      style:UIAlertActionStyleDefault
      handler:nil];

    [alert addAction:okAction];

    UIViewController *rootVC = [UIApplication sharedApplication].keyWindow.rootViewController;
    [rootVC presentViewController:alert animated:YES completion:nil];
  });
}
```

### Specifying Method Queue

You can specify which queue all methods should run on:

```objective-c
@implementation RNUIModule

RCT_EXPORT_MODULE();

// All methods will run on main queue
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(updateUI:(NSDictionary *)config)
{
  // This runs on main queue
  // Safe to perform UI operations
}

@end
```

### Custom Serial Queue

For thread-safe operations on shared resources:

```objective-c
@implementation RNDatabaseModule
{
  dispatch_queue_t _databaseQueue;
}

RCT_EXPORT_MODULE();

- (instancetype)init
{
  self = [super init];
  if (self) {
    _databaseQueue = dispatch_queue_create("com.myapp.database", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (dispatch_queue_t)methodQueue
{
  return _databaseQueue;
}

RCT_EXPORT_METHOD(executeQuery:(NSString *)query
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  // All database operations are serialized
  // Thread-safe access to database
}

@end
```

### Swift Threading

```swift
@objc(RNHeavyComputation)
class RNHeavyComputation: NSObject {

  private let processingQueue = DispatchQueue(
    label: "com.myapp.processing",
    qos: .userInitiated,
    attributes: .concurrent
  )

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func processImage(
    _ imagePath: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    processingQueue.async {
      // Heavy computation on background queue
      guard let image = UIImage(contentsOfFile: imagePath) else {
        reject("INVALID_IMAGE", "Could not load image", nil)
        return
      }

      // Process image...
      let processedPath = self.processImage(image)

      // Return result (can be called from any thread)
      resolve(["path": processedPath])
    }
  }

  private func processImage(_ image: UIImage) -> String {
    // Image processing logic
    return "/path/to/processed/image.png"
  }
}
```

### Best Practices

1. **Never block the main queue** with long-running operations
2. **Always dispatch UI updates** to the main queue
3. **Use serial queues** for thread-safe access to shared resources
4. **Consider using `dispatch_async`** for expensive operations
5. **Be careful with synchronous methods** - they block JavaScript execution

---

## TurboModules Overview

TurboModules are part of React Native's New Architecture, offering significant performance improvements over the traditional bridge.

### Key Benefits

1. **Lazy Loading**: Modules are loaded only when first accessed
2. **Synchronous Access**: Direct synchronous calls without bridge overhead
3. **Type Safety**: TypeScript/Flow types are enforced at runtime
4. **Reduced Memory**: Lower memory footprint due to lazy initialization

### Enabling the New Architecture

In your `ios/Podfile`:

```ruby
# Enable the New Architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

### Creating a TurboModule Spec

First, define the TypeScript specification:

```typescript
// NativeCalculator.ts

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
  multiply(a: number, b: number): Promise<number>;
  getConstants(): {
    PI: number;
    E: number;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

### Implementing TurboModule in Objective-C++

```objective-c
// RNCalculator.h

#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

@interface RNCalculator : NSObject <RCTBridgeModule, RCTTurboModule>
@end
```

```objective-c
// RNCalculator.mm

#import "RNCalculator.h"
#import <React/RCTBridge+Private.h>

@implementation RNCalculator

RCT_EXPORT_MODULE(NativeCalculator);

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCalculatorSpecJSI>(params);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(add:(double)a b:(double)b)
{
  return @(a + b);
}

RCT_EXPORT_METHOD(multiply:(double)a
                  b:(double)b
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  resolve(@(a * b));
}

- (NSDictionary *)constantsToExport
{
  return @{
    @"PI": @(M_PI),
    @"E": @(M_E)
  };
}

@end
```

### Migration Considerations

When migrating to TurboModules:

1. **Spec Files**: Create TypeScript spec files for all native modules
2. **Codegen**: Run codegen to generate native interfaces
3. **Backward Compatibility**: Modules can support both old and new architecture
4. **Testing**: Thoroughly test both synchronous and asynchronous methods

---

## Testing Native Modules

Testing native modules requires a combination of unit tests, integration tests, and end-to-end tests.

### Unit Testing with XCTest

```swift
// BiometricAuthTests.swift

import XCTest
@testable import YourApp

class BiometricAuthTests: XCTestCase {

  var biometricAuth: BiometricAuth!

  override func setUp() {
    super.setUp()
    biometricAuth = BiometricAuth()
  }

  override func tearDown() {
    biometricAuth = nil
    super.tearDown()
  }

  func testGetBiometryType() {
    let expectation = self.expectation(description: "Get biometry type")

    var resultType: String?
    var resultError: Error?

    biometricAuth.getBiometryType { result in
      resultType = result as? String
      expectation.fulfill()
    } rejecter: { code, message, error in
      resultError = error
      expectation.fulfill()
    }

    waitForExpectations(timeout: 5.0) { error in
      XCTAssertNil(resultError)
      XCTAssertNotNil(resultType)
      XCTAssertTrue(["FaceID", "TouchID", "OpticID", "none"].contains(resultType!))
    }
  }
}
```

### Mocking Native Modules in JavaScript

```javascript
// __mocks__/react-native.js

const ReactNative = jest.requireActual('react-native');

ReactNative.NativeModules.RNDeviceInfo = {
  getDeviceName: jest.fn((callback) => {
    callback(null, 'Mock iPhone');
  }),
  getSystemVersion: jest.fn(() => '17.0'),
};

ReactNative.NativeModules.BiometricAuth = {
  getBiometryType: jest.fn(() => Promise.resolve('FaceID')),
  authenticateUser: jest.fn(() => Promise.resolve({ success: true })),
};

module.exports = ReactNative;
```

### Integration Tests

```javascript
// __tests__/BiometricAuth.integration.test.js

import { NativeModules } from 'react-native';

describe('BiometricAuth Integration', () => {
  const { BiometricAuth } = NativeModules;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return biometry type', async () => {
    const type = await BiometricAuth.getBiometryType();
    expect(['FaceID', 'TouchID', 'OpticID', 'none']).toContain(type);
  });

  it('should handle authentication success', async () => {
    BiometricAuth.authenticateUser.mockResolvedValue({ success: true });

    const result = await BiometricAuth.authenticateUser('Test authentication');
    expect(result.success).toBe(true);
  });

  it('should handle authentication failure', async () => {
    BiometricAuth.authenticateUser.mockRejectedValue({
      code: 'AUTH_FAILED',
      message: 'User cancelled',
    });

    await expect(BiometricAuth.authenticateUser('Test')).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });
});
```

### End-to-End Testing with Detox

```javascript
// e2e/biometricAuth.e2e.js

describe('Biometric Authentication', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show biometric prompt', async () => {
    await element(by.id('login-button')).tap();

    // On simulator, biometric prompt won't appear
    // but we can verify the flow
    await expect(element(by.id('auth-status'))).toBeVisible();
  });

  it('should handle biometric success', async () => {
    // Enroll biometrics in simulator first
    await device.setBiometricEnrollment(true);

    await element(by.id('login-button')).tap();
    await device.matchFace(); // or matchFinger()

    await expect(element(by.id('welcome-screen'))).toBeVisible();
  });

  it('should handle biometric failure', async () => {
    await device.setBiometricEnrollment(true);

    await element(by.id('login-button')).tap();
    await device.unmatchFace();

    await expect(element(by.id('error-message'))).toBeVisible();
  });
});
```

---

## Debugging Bridge Issues

Debugging native modules can be challenging. Here are techniques and tools to help identify and resolve issues.

### Common Bridge Errors

#### Module Not Found

```javascript
// Error: Invariant Violation: Native module cannot be null

// Solution: Verify module registration
// 1. Check RCT_EXPORT_MODULE() is present
// 2. Rebuild the native project
// 3. Clear Metro cache: npx react-native start --reset-cache
```

#### Method Not Found

```javascript
// Error: undefined is not a function

// Verify method export
// Objective-C: RCT_EXPORT_METHOD() macro is correct
// Swift: @objc decorator and .m bridge file match
```

### Enabling Bridge Logging

Add logging to understand bridge communication:

```objective-c
// In AppDelegate.m or a debug configuration file

#if DEBUG
#import <React/RCTLog.h>

// Set log level
RCTSetLogThreshold(RCTLogLevelInfo);
#endif
```

### Native Debugging with Xcode

1. Set breakpoints in native code
2. Use LLDB commands in the debug console
3. Monitor memory with Instruments
4. Use the Debug Memory Graph for leak detection

### JavaScript Debugging

```javascript
// Add detailed logging for native calls
const originalNativeModules = { ...NativeModules };

Object.keys(NativeModules).forEach((moduleName) => {
  const module = NativeModules[moduleName];
  if (module && typeof module === 'object') {
    Object.keys(module).forEach((methodName) => {
      if (typeof module[methodName] === 'function') {
        const original = module[methodName];
        module[methodName] = (...args) => {
          console.log(`[NativeModule] ${moduleName}.${methodName}`, args);
          return original.apply(module, args);
        };
      }
    });
  }
});
```

### Debugging Event Emitters

```javascript
// Wrap event listeners with logging
const createDebugEmitter = (emitter, moduleName) => {
  const originalAddListener = emitter.addListener.bind(emitter);

  emitter.addListener = (eventName, callback) => {
    console.log(`[EventEmitter] Subscribing to ${moduleName}.${eventName}`);

    return originalAddListener(eventName, (...args) => {
      console.log(`[EventEmitter] ${moduleName}.${eventName} received:`, args);
      callback(...args);
    });
  };

  return emitter;
};

const debugLocationEmitter = createDebugEmitter(
  new NativeEventEmitter(NativeModules.RNLocationManager),
  'RNLocationManager'
);
```

### Flipper Integration

Flipper provides excellent debugging capabilities for React Native:

```objective-c
// AppDelegate.m

#if DEBUG
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

- (void)initializeFlipper:(UIApplication *)application
{
  FlipperClient *client = [FlipperClient sharedClient];
  [client addPlugin:[[FlipperKitReactPlugin alloc] init]];
  [client start];
}
#endif
```

### Troubleshooting Checklist

When a native module is not working:

1. **Clean Build**
   ```bash
   cd ios && pod deintegrate && pod install && cd ..
   npx react-native start --reset-cache
   ```

2. **Verify Registration**
   - Check `RCT_EXPORT_MODULE()` is present
   - Verify module name matches JavaScript import

3. **Check Method Signatures**
   - Ensure parameter types match
   - Verify promise resolver/rejecter order

4. **Review Threading**
   - Confirm UI operations are on main queue
   - Check for deadlocks in synchronous methods

5. **Inspect Bridge Communication**
   - Enable bridge logging
   - Use Flipper to inspect messages

6. **Memory Issues**
   - Check for retain cycles in closures
   - Verify proper cleanup in `dealloc`

---

## Conclusion

Creating native iOS modules for React Native opens up powerful possibilities for your mobile applications. Whether you need to access platform-specific APIs, integrate third-party SDKs, or optimize performance-critical code, native modules provide the bridge between JavaScript and the full power of iOS.

Key takeaways from this guide:

1. **Choose wisely**: Only create native modules when React Native's built-in capabilities are insufficient
2. **Start with Objective-C** for simpler modules, **use Swift** for complex logic with modern syntax
3. **Prefer promises** over callbacks for cleaner async handling
4. **Use event emitters** for continuous data streams
5. **Export constants** for static configuration
6. **Mind the threads**: Always dispatch UI operations to the main queue
7. **Consider TurboModules** for performance-critical applications
8. **Test thoroughly** at all levels: unit, integration, and e2e
9. **Debug systematically** using the tools and techniques discussed

As React Native continues to evolve with the New Architecture, native modules remain an essential tool for building high-quality, feature-rich mobile applications. Master these concepts, and you will be well-equipped to tackle any native integration challenge.

---

## Further Reading

- [React Native Official Documentation - Native Modules iOS](https://reactnative.dev/docs/native-modules-ios)
- [React Native New Architecture Working Group](https://github.com/reactwg/react-native-new-architecture)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Swift and Objective-C Interoperability](https://developer.apple.com/documentation/swift/imported-c-and-objective-c-apis)
