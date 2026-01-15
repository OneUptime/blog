# How to Bridge Native Android Modules to React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Android, Native Module, Bridge, Kotlin, Java, Mobile Development

Description: Learn how to create native Android modules and bridge them to React Native for accessing native Android functionality.

---

React Native provides an excellent way to build cross-platform mobile applications using JavaScript. However, there are times when you need to access native Android functionality that isn't available through React Native's built-in APIs. This is where native modules come into play. In this comprehensive guide, we'll explore how to create native Android modules and bridge them to React Native.

## Understanding Native Module Architecture

Before diving into code, it's essential to understand how the React Native bridge works. The bridge acts as a communication layer between JavaScript and native code. When you call a native method from JavaScript, the request is serialized, passed through the bridge, and executed on the native side. The response follows the same path back to JavaScript.

### Key Components

1. **Native Module**: A Java or Kotlin class that extends `ReactContextBaseJavaModule`
2. **Package**: A class that implements `ReactPackage` and registers native modules
3. **Bridge**: The communication layer that handles serialization and deserialization
4. **JavaScript Interface**: The exported module that JavaScript code interacts with

### Data Flow

```
JavaScript Code
      |
      v
  JS Bridge
      |
      v
Native Bridge (MessageQueue)
      |
      v
Native Module (Java/Kotlin)
```

## Creating Your First Native Module in Java

Let's start by creating a simple native module in Java that provides device information.

### Step 1: Create the Module Class

Create a new Java file in your Android project at:
`android/app/src/main/java/com/yourapp/DeviceInfoModule.java`

```java
package com.yourapp;

import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.util.HashMap;
import java.util.Map;

public class DeviceInfoModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    // Constructor receives the React Application Context
    public DeviceInfoModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    // This name is how JavaScript will reference the module
    @NonNull
    @Override
    public String getName() {
        return "DeviceInfo";
    }

    // Expose constants to JavaScript
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("BRAND", Build.BRAND);
        constants.put("MODEL", Build.MODEL);
        constants.put("SDK_VERSION", Build.VERSION.SDK_INT);
        constants.put("DEVICE", Build.DEVICE);
        constants.put("MANUFACTURER", Build.MANUFACTURER);
        return constants;
    }

    // Synchronous method - blocks the JS thread
    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceIdSync() {
        return Settings.Secure.getString(
            reactContext.getContentResolver(),
            Settings.Secure.ANDROID_ID
        );
    }

    // Asynchronous method with Promise
    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        try {
            WritableMap deviceInfo = Arguments.createMap();
            deviceInfo.putString("brand", Build.BRAND);
            deviceInfo.putString("model", Build.MODEL);
            deviceInfo.putInt("sdkVersion", Build.VERSION.SDK_INT);
            deviceInfo.putString("device", Build.DEVICE);
            deviceInfo.putString("manufacturer", Build.MANUFACTURER);
            deviceInfo.putString("product", Build.PRODUCT);
            deviceInfo.putString("hardware", Build.HARDWARE);
            deviceInfo.putString("board", Build.BOARD);

            promise.resolve(deviceInfo);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get device info", e);
        }
    }

    // Method with Callback
    @ReactMethod
    public void getDeviceInfoWithCallback(Callback successCallback, Callback errorCallback) {
        try {
            WritableMap deviceInfo = Arguments.createMap();
            deviceInfo.putString("brand", Build.BRAND);
            deviceInfo.putString("model", Build.MODEL);

            successCallback.invoke(deviceInfo);
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
        }
    }
}
```

### Step 2: Create the Package Class

Create a package class to register the module:
`android/app/src/main/java/com/yourapp/DeviceInfoPackage.java`

```java
package com.yourapp;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DeviceInfoPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new DeviceInfoModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
```

### Step 3: Register the Package

Add the package to your `MainApplication.java`:

```java
import com.yourapp.DeviceInfoPackage;

@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new DeviceInfoPackage()); // Add this line
    return packages;
}
```

## Creating Native Modules in Kotlin

Kotlin provides a more concise syntax for creating native modules. Let's create the same module in Kotlin.

### Step 1: Create the Module Class

`android/app/src/main/java/com/yourapp/DeviceInfoModuleKotlin.kt`

```kotlin
package com.yourapp

import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = DeviceInfoModuleKotlin.NAME)
class DeviceInfoModuleKotlin(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "DeviceInfoKotlin"
    }

    override fun getName(): String = NAME

    // Expose constants to JavaScript
    override fun getConstants(): MutableMap<String, Any> = hashMapOf(
        "BRAND" to Build.BRAND,
        "MODEL" to Build.MODEL,
        "SDK_VERSION" to Build.VERSION.SDK_INT,
        "DEVICE" to Build.DEVICE,
        "MANUFACTURER" to Build.MANUFACTURER,
        "IS_EMULATOR" to isEmulator()
    )

    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.BRAND.startsWith("generic")
                || Build.DEVICE.startsWith("generic"))
    }

    // Synchronous method
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getDeviceIdSync(): String {
        return Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"
    }

    // Asynchronous method with Promise
    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val deviceInfo = Arguments.createMap().apply {
                putString("brand", Build.BRAND)
                putString("model", Build.MODEL)
                putInt("sdkVersion", Build.VERSION.SDK_INT)
                putString("device", Build.DEVICE)
                putString("manufacturer", Build.MANUFACTURER)
                putString("product", Build.PRODUCT)
                putString("hardware", Build.HARDWARE)
                putString("board", Build.BOARD)
                putString("display", Build.DISPLAY)
                putString("fingerprint", Build.FINGERPRINT)
                putBoolean("isEmulator", isEmulator())
            }
            promise.resolve(deviceInfo)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get device info", e)
        }
    }

    // Method with multiple parameters
    @ReactMethod
    fun logMessage(tag: String, message: String, level: Int, promise: Promise) {
        try {
            when (level) {
                0 -> android.util.Log.v(tag, message)
                1 -> android.util.Log.d(tag, message)
                2 -> android.util.Log.i(tag, message)
                3 -> android.util.Log.w(tag, message)
                4 -> android.util.Log.e(tag, message)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LOG_ERROR", "Failed to log message", e)
        }
    }

    // Method accepting ReadableMap and ReadableArray
    @ReactMethod
    fun processData(data: ReadableMap, items: ReadableArray, promise: Promise) {
        try {
            val result = Arguments.createMap()

            // Process the map
            val name = data.getString("name") ?: "unknown"
            val age = if (data.hasKey("age")) data.getInt("age") else 0

            result.putString("processedName", name.uppercase())
            result.putInt("processedAge", age)

            // Process the array
            val processedArray = Arguments.createArray()
            for (i in 0 until items.size()) {
                val item = items.getString(i)
                item?.let { processedArray.pushString(it.uppercase()) }
            }
            result.putArray("processedItems", processedArray)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PROCESS_ERROR", "Failed to process data", e)
        }
    }
}
```

### Step 2: Create the Package Class in Kotlin

`android/app/src/main/java/com/yourapp/DeviceInfoPackageKotlin.kt`

```kotlin
package com.yourapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DeviceInfoPackageKotlin : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(DeviceInfoModuleKotlin(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

## Understanding the @ReactMethod Annotation

The `@ReactMethod` annotation is crucial for exposing methods to JavaScript. Let's explore its features:

### Basic Usage

```java
@ReactMethod
public void simpleMethod() {
    // This method can be called from JavaScript
}
```

### Synchronous Methods

```java
@ReactMethod(isBlockingSynchronousMethod = true)
public String getSyncValue() {
    return "This returns immediately to JS";
}
```

**Warning**: Synchronous methods block the JavaScript thread. Use them sparingly and only for operations that complete quickly.

### Supported Parameter Types

React Native automatically converts JavaScript types to native types:

| JavaScript Type | Java Type | Kotlin Type |
|----------------|-----------|-------------|
| Boolean | Boolean | Boolean |
| Number (int) | Integer/Double | Int/Double |
| String | String | String |
| Array | ReadableArray | ReadableArray |
| Object | ReadableMap | ReadableMap |
| Function | Callback | Callback |

```java
@ReactMethod
public void methodWithTypes(
    boolean flag,
    int number,
    double decimal,
    String text,
    ReadableArray array,
    ReadableMap map,
    Callback callback
) {
    // Handle parameters
}
```

## Working with Callbacks and Promises

### Using Callbacks

Callbacks are the traditional way to handle asynchronous operations:

```java
@ReactMethod
public void fetchDataWithCallback(
    String url,
    Callback successCallback,
    Callback errorCallback
) {
    new Thread(() -> {
        try {
            // Simulate network request
            Thread.sleep(1000);
            String data = "Data from " + url;

            // Invoke success callback on main thread
            successCallback.invoke(data);
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
        }
    }).start();
}
```

JavaScript usage:

```javascript
import { NativeModules } from 'react-native';
const { DeviceInfo } = NativeModules;

DeviceInfo.fetchDataWithCallback(
  'https://api.example.com',
  (data) => console.log('Success:', data),
  (error) => console.error('Error:', error)
);
```

### Using Promises

Promises provide a cleaner async/await syntax:

```java
@ReactMethod
public void fetchDataWithPromise(String url, Promise promise) {
    new Thread(() -> {
        try {
            // Simulate network request
            Thread.sleep(1000);

            WritableMap result = Arguments.createMap();
            result.putString("url", url);
            result.putString("data", "Fetched data");
            result.putDouble("timestamp", System.currentTimeMillis());

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("FETCH_ERROR", "Failed to fetch data", e);
        }
    }).start();
}
```

JavaScript usage:

```javascript
import { NativeModules } from 'react-native';
const { DeviceInfo } = NativeModules;

// Using async/await
async function fetchData() {
  try {
    const result = await DeviceInfo.fetchDataWithPromise('https://api.example.com');
    console.log('Data:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Using .then()/.catch()
DeviceInfo.fetchDataWithPromise('https://api.example.com')
  .then(result => console.log('Data:', result))
  .catch(error => console.error('Error:', error));
```

## Sending Events to JavaScript

Native modules can send events to JavaScript without being explicitly called. This is useful for push notifications, sensor data, or any asynchronous native events.

### Creating an Event Emitter Module

```kotlin
package com.yourapp

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.Context

class SensorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var listenerCount = 0

    companion object {
        const val NAME = "SensorModule"
        const val EVENT_ACCELEROMETER = "onAccelerometerData"
        const val EVENT_ERROR = "onSensorError"
    }

    override fun getName(): String = NAME

    // Send events to JavaScript
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Track listener count for optimization
    @ReactMethod
    fun addListener(eventName: String) {
        if (listenerCount == 0) {
            startListening()
        }
        listenerCount++
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
        if (listenerCount <= 0) {
            listenerCount = 0
            stopListening()
        }
    }

    @ReactMethod
    fun startAccelerometer(promise: Promise) {
        try {
            sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

            if (accelerometer == null) {
                promise.reject("SENSOR_ERROR", "Accelerometer not available")
                return
            }

            sensorManager?.registerListener(
                this,
                accelerometer,
                SensorManager.SENSOR_DELAY_NORMAL
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", "Failed to start accelerometer", e)
        }
    }

    @ReactMethod
    fun stopAccelerometer(promise: Promise) {
        try {
            sensorManager?.unregisterListener(this)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", "Failed to stop accelerometer", e)
        }
    }

    private fun startListening() {
        // Initialize sensors when first listener is added
    }

    private fun stopListening() {
        sensorManager?.unregisterListener(this)
    }

    // SensorEventListener implementation
    override fun onSensorChanged(event: SensorEvent) {
        val params = Arguments.createMap().apply {
            putDouble("x", event.values[0].toDouble())
            putDouble("y", event.values[1].toDouble())
            putDouble("z", event.values[2].toDouble())
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        sendEvent(EVENT_ACCELEROMETER, params)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Handle accuracy changes if needed
    }
}
```

### JavaScript Event Listener

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { SensorModule } = NativeModules;
const sensorEventEmitter = new NativeEventEmitter(SensorModule);

// Subscribe to events
const subscription = sensorEventEmitter.addListener(
  'onAccelerometerData',
  (data) => {
    console.log('Accelerometer:', data.x, data.y, data.z);
  }
);

// Start the accelerometer
await SensorModule.startAccelerometer();

// Later, clean up
subscription.remove();
await SensorModule.stopAccelerometer();
```

## Exposing Constants

Constants are exposed once when the module is initialized and are available synchronously in JavaScript.

```java
@Override
public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();

    // Simple values
    constants.put("APP_VERSION", BuildConfig.VERSION_NAME);
    constants.put("BUILD_NUMBER", BuildConfig.VERSION_CODE);
    constants.put("DEBUG_MODE", BuildConfig.DEBUG);

    // Complex nested objects
    Map<String, Object> screenInfo = new HashMap<>();
    DisplayMetrics metrics = reactContext.getResources().getDisplayMetrics();
    screenInfo.put("width", metrics.widthPixels);
    screenInfo.put("height", metrics.heightPixels);
    screenInfo.put("density", metrics.density);
    constants.put("SCREEN", screenInfo);

    // Arrays
    String[] supportedFeatures = {"bluetooth", "nfc", "camera"};
    constants.put("SUPPORTED_FEATURES", Arrays.asList(supportedFeatures));

    return constants;
}
```

JavaScript usage:

```javascript
import { NativeModules } from 'react-native';
const { DeviceInfo } = NativeModules;

console.log('Version:', DeviceInfo.APP_VERSION);
console.log('Screen Width:', DeviceInfo.SCREEN.width);
console.log('Features:', DeviceInfo.SUPPORTED_FEATURES);
```

## Accessing Activity and Context

Native modules often need access to the current Activity or Application Context.

### Getting the Current Activity

```kotlin
@ReactMethod
fun openSettings(promise: Promise) {
    val activity = currentActivity

    if (activity == null) {
        promise.reject("ACTIVITY_ERROR", "Activity is null")
        return
    }

    try {
        val intent = Intent(Settings.ACTION_SETTINGS)
        activity.startActivity(intent)
        promise.resolve(true)
    } catch (e: Exception) {
        promise.reject("SETTINGS_ERROR", "Failed to open settings", e)
    }
}
```

### Starting an Activity for Result

```kotlin
class ActivityResultModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var resultPromise: Promise? = null

    companion object {
        const val REQUEST_CODE = 1001
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "ActivityResult"

    @ReactMethod
    fun pickImage(promise: Promise) {
        val activity = currentActivity

        if (activity == null) {
            promise.reject("ACTIVITY_ERROR", "Activity is null")
            return
        }

        resultPromise = promise

        val intent = Intent(Intent.ACTION_PICK).apply {
            type = "image/*"
        }
        activity.startActivityForResult(intent, REQUEST_CODE)
    }

    override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                val uri = data?.data?.toString()
                resultPromise?.resolve(uri)
            } else {
                resultPromise?.reject("CANCELLED", "User cancelled the operation")
            }
            resultPromise = null
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Handle new intents if needed
    }
}
```

### Lifecycle Events

```kotlin
class LifecycleModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "LifecycleModule"

    override fun onHostResume() {
        // App has come to the foreground
        sendEvent("appStateChange", "active")
    }

    override fun onHostPause() {
        // App has gone to the background
        sendEvent("appStateChange", "background")
    }

    override fun onHostDestroy() {
        // App is being destroyed
        sendEvent("appStateChange", "destroyed")
    }

    private fun sendEvent(eventName: String, state: String) {
        val params = Arguments.createMap()
        params.putString("state", state)

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
```

## Threading with Native Modules

By default, React Native executes native module methods on a background thread. Understanding threading is crucial for performance and avoiding crashes.

### Default Threading Behavior

```kotlin
@ReactMethod
fun heavyComputation(data: ReadableArray, promise: Promise) {
    // This runs on the native modules thread (background)
    // Safe to perform heavy operations here

    var result = 0L
    for (i in 0 until data.size()) {
        result += data.getInt(i)
    }

    promise.resolve(result.toDouble())
}
```

### Running on the Main/UI Thread

```kotlin
import android.os.Handler
import android.os.Looper

@ReactMethod
fun updateUI(message: String, promise: Promise) {
    // Run on main thread for UI operations
    Handler(Looper.getMainLooper()).post {
        try {
            // UI operations here
            currentActivity?.runOnUiThread {
                // Direct UI manipulation
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UI_ERROR", e.message, e)
        }
    }
}
```

### Using Coroutines in Kotlin

```kotlin
import kotlinx.coroutines.*

class CoroutineModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun getName(): String = "CoroutineModule"

    @ReactMethod
    fun fetchDataAsync(url: String, promise: Promise) {
        scope.launch {
            try {
                // Run on IO dispatcher for network/file operations
                val result = withContext(Dispatchers.IO) {
                    // Simulate network request
                    delay(1000)
                    "Data from $url"
                }

                // Switch to main thread if needed
                withContext(Dispatchers.Main) {
                    // UI operations
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", e.message, e)
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        // Cancel all coroutines when module is destroyed
        scope.cancel()
    }
}
```

### Thread Pool for Heavy Operations

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ThreadedModule extends ReactContextBaseJavaModule {

    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    @ReactMethod
    public void processInBackground(ReadableArray items, Promise promise) {
        executor.execute(() -> {
            try {
                WritableArray results = Arguments.createArray();

                for (int i = 0; i < items.size(); i++) {
                    String item = items.getString(i);
                    // Process item
                    results.pushString(item.toUpperCase());
                }

                promise.resolve(results);
            } catch (Exception e) {
                promise.reject("PROCESS_ERROR", e.getMessage(), e);
            }
        });
    }

    @Override
    public void invalidate() {
        super.invalidate();
        executor.shutdown();
    }
}
```

## Debugging Android Bridge

Debugging native modules requires different strategies than debugging JavaScript code.

### Using Android Logcat

```kotlin
import android.util.Log

companion object {
    private const val TAG = "DeviceInfoModule"
}

@ReactMethod
fun debugMethod(data: ReadableMap, promise: Promise) {
    Log.d(TAG, "debugMethod called with data: $data")

    try {
        val name = data.getString("name")
        Log.i(TAG, "Processing name: $name")

        // Your logic here

        Log.d(TAG, "Method completed successfully")
        promise.resolve(true)
    } catch (e: Exception) {
        Log.e(TAG, "Error in debugMethod", e)
        promise.reject("DEBUG_ERROR", e.message, e)
    }
}
```

View logs using:
```bash
adb logcat -s DeviceInfoModule:D
```

### React Native Debugging Bridge

```kotlin
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants

// Add performance markers
ReactMarker.logMarker(ReactMarkerConstants.NATIVE_MODULE_SETUP_START)
// Your code
ReactMarker.logMarker(ReactMarkerConstants.NATIVE_MODULE_SETUP_END)
```

### Debugging Tips

1. **Check Module Registration**
```javascript
import { NativeModules } from 'react-native';
console.log('Available modules:', Object.keys(NativeModules));
console.log('DeviceInfo:', NativeModules.DeviceInfo);
```

2. **Verify Method Exists**
```javascript
const { DeviceInfo } = NativeModules;
console.log('Methods:', Object.keys(DeviceInfo));
console.log('getDeviceInfo:', typeof DeviceInfo.getDeviceInfo);
```

3. **Handle Null/Undefined Gracefully**
```kotlin
@ReactMethod
fun safeMethod(data: ReadableMap?, promise: Promise) {
    if (data == null) {
        promise.reject("NULL_DATA", "Data parameter is null")
        return
    }

    val name = try {
        data.getString("name") ?: "default"
    } catch (e: Exception) {
        "default"
    }

    promise.resolve(name)
}
```

### Common Issues and Solutions

**Issue: Module not found**
```
Error: Cannot read property 'methodName' of undefined
```

Solution: Ensure the module is properly registered in the package and the package is added to MainApplication.

**Issue: Method not found**
```
Error: DeviceInfo.unknownMethod is not a function
```

Solution: Verify the method has the `@ReactMethod` annotation and rebuild the app.

**Issue: Promise never resolves**

Solution: Ensure all code paths call either `promise.resolve()` or `promise.reject()`.

```kotlin
@ReactMethod
fun safeAsyncMethod(promise: Promise) {
    try {
        // Your code
        if (someCondition) {
            promise.resolve(result)
            return  // Don't forget to return!
        }

        // Handle other cases
        promise.resolve(null)
    } catch (e: Exception) {
        promise.reject("ERROR", e.message, e)
    }
}
```

## Creating a TypeScript Wrapper

For better developer experience, create a TypeScript wrapper for your native module:

```typescript
// src/native/DeviceInfo.ts
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

interface DeviceInfoType {
  // Constants
  BRAND: string;
  MODEL: string;
  SDK_VERSION: number;
  DEVICE: string;
  MANUFACTURER: string;

  // Methods
  getDeviceIdSync(): string;
  getDeviceInfo(): Promise<DeviceInfoResult>;
  getDeviceInfoWithCallback(
    success: (info: DeviceInfoResult) => void,
    error: (message: string) => void
  ): void;
}

interface DeviceInfoResult {
  brand: string;
  model: string;
  sdkVersion: number;
  device: string;
  manufacturer: string;
  product: string;
  hardware: string;
  board: string;
}

const { DeviceInfo } = NativeModules as { DeviceInfo: DeviceInfoType };

// Validate module exists
if (!DeviceInfo) {
  throw new Error(
    'DeviceInfo native module is not available. ' +
    'Make sure you have rebuilt the app after adding the native module.'
  );
}

// Export typed interface
export const getDeviceId = (): string => {
  if (Platform.OS !== 'android') {
    throw new Error('getDeviceId is only available on Android');
  }
  return DeviceInfo.getDeviceIdSync();
};

export const getDeviceInfo = async (): Promise<DeviceInfoResult> => {
  if (Platform.OS !== 'android') {
    throw new Error('getDeviceInfo is only available on Android');
  }
  return DeviceInfo.getDeviceInfo();
};

export const constants = {
  brand: DeviceInfo.BRAND,
  model: DeviceInfo.MODEL,
  sdkVersion: DeviceInfo.SDK_VERSION,
  device: DeviceInfo.DEVICE,
  manufacturer: DeviceInfo.MANUFACTURER,
};

export default DeviceInfo;
```

## Best Practices

1. **Always handle errors**: Every native method should have proper error handling and reject promises with meaningful messages.

2. **Clean up resources**: Override `invalidate()` to clean up resources like threads, listeners, and connections.

3. **Use appropriate threading**: Don't block the UI thread with heavy operations.

4. **Minimize bridge traffic**: Batch data when possible and avoid frequent small calls across the bridge.

5. **Version your API**: Consider versioning your native module API for backward compatibility.

6. **Document thoroughly**: Document all methods, parameters, and return types for other developers.

7. **Test on real devices**: Emulators may not accurately represent native behavior.

8. **Handle Activity lifecycle**: Be aware that Activities can be destroyed and recreated.

## Conclusion

Bridging native Android modules to React Native opens up a world of possibilities for accessing device-specific functionality. Whether you choose Java or Kotlin, the key is understanding the communication patterns between JavaScript and native code.

Remember to:
- Keep methods focused and single-purpose
- Handle errors gracefully
- Use promises for asynchronous operations
- Clean up resources properly
- Test thoroughly on real devices

With these techniques, you can extend your React Native application with any native Android functionality while maintaining a clean, type-safe API for your JavaScript code.

Happy coding!
