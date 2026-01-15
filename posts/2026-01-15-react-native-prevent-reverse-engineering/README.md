# How to Prevent Reverse Engineering of React Native Apps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Security, Reverse Engineering, Code Protection, Mobile Development, Obfuscation

Description: Learn techniques to protect your React Native app from reverse engineering and code extraction attacks.

---

Mobile applications are valuable targets for attackers seeking to extract business logic, API keys, authentication mechanisms, and proprietary algorithms. React Native apps face unique challenges because they bundle JavaScript code that can be more easily analyzed than traditional native binaries. This comprehensive guide explores proven techniques to protect your React Native application from reverse engineering attacks.

## Understanding the Threat Landscape

Before implementing protections, you need to understand what attackers can do with a reverse-engineered app:

### Common Attack Objectives

1. **API Key Extraction**: Attackers search for hardcoded API keys, tokens, and secrets
2. **Business Logic Theft**: Proprietary algorithms and workflows can be copied
3. **Authentication Bypass**: Understanding auth flows enables credential theft
4. **License Circumvention**: Paid features can be unlocked illegally
5. **Malware Injection**: Modified apps can be redistributed with malicious code
6. **Competitive Intelligence**: Competitors may analyze your implementation

### React Native-Specific Vulnerabilities

React Native apps have a predictable structure that attackers know well:

```
android/app/src/main/assets/
├── index.android.bundle    # Your JavaScript code
├── index.android.bundle.map  # Source maps (if included)
└── assets/                 # Static resources
```

On iOS, the bundle is located at:

```
Payload/YourApp.app/
├── main.jsbundle           # Your JavaScript code
└── assets/                 # Static resources
```

An attacker with basic knowledge can extract an APK or IPA file and access these bundles within minutes. The JavaScript bundle, while minified, is not encrypted by default and can be beautified to restore readable code.

## React Native Bundle Analysis

Understanding how attackers analyze your app helps you build better defenses.

### Extracting the Bundle

On Android, extracting is trivial:

```bash
# Rename APK to ZIP and extract
unzip myapp.apk -d extracted_app

# The bundle is immediately accessible
cat extracted_app/assets/index.android.bundle
```

On iOS, the process requires a jailbroken device or decrypted IPA:

```bash
# Using tools like frida-ios-dump
frida-ios-dump com.yourcompany.app

# Or extracting from a decrypted IPA
unzip decrypted.ipa -d extracted_app
```

### Bundle Structure Analysis

A typical React Native bundle contains:

```javascript
// Metro bundler output structure
__d(function(g,r,i,a,m,e,d){
  // Module 0: Entry point
},0,[1,2,3]);

__d(function(g,r,i,a,m,e,d){
  // Module 1: Your component
  var _react = r(d[0]);
  function MyComponent() {
    // Your business logic here
  }
},1,[2,3,4]);

// ... hundreds more modules
```

Attackers use tools like `react-native-decompiler` to restore readable code:

```bash
npx react-native-decompiler -i index.android.bundle -o output/
```

This creates a directory structure mirroring your source code, making analysis straightforward.

## JavaScript Obfuscation

Obfuscation transforms your code into functionally equivalent but harder-to-read versions.

### Metro Bundler Minification

Metro's default minification provides basic protection:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        toplevel: true,
      },
    },
  },
};
```

However, minification is easily reversed. For stronger protection, use dedicated obfuscation tools.

### JavaScript Obfuscator Integration

Integrate `javascript-obfuscator` into your build pipeline:

```javascript
// scripts/obfuscate-bundle.js
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

const bundlePath = process.argv[2];
const bundle = fs.readFileSync(bundlePath, 'utf8');

const obfuscatedBundle = JavaScriptObfuscator.obfuscate(bundle, {
  // Control flow flattening makes logic hard to follow
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,

  // Dead code injection adds noise
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,

  // String encoding hides literals
  stringArray: true,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayThreshold: 0.75,

  // Identifier renaming
  identifierNamesGenerator: 'hexadecimal',

  // Self-defending code
  selfDefending: true,

  // Disable console output
  disableConsoleOutput: true,

  // Debug protection
  debugProtection: true,
  debugProtectionInterval: 2000,
}).getObfuscatedCode();

fs.writeFileSync(bundlePath, obfuscatedBundle);
console.log('Bundle obfuscated successfully');
```

Add this to your build process:

```json
{
  "scripts": {
    "build:android": "react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle && node scripts/obfuscate-bundle.js android/app/src/main/assets/index.android.bundle",
    "build:ios": "react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle && node scripts/obfuscate-bundle.js ios/main.jsbundle"
  }
}
```

### Obfuscation Trade-offs

Be aware of the costs:

| Protection Level | Bundle Size Increase | Performance Impact | Reversibility |
|-----------------|---------------------|-------------------|---------------|
| Minification only | Baseline | None | Easy |
| Light obfuscation | +20-30% | 5-10% slower | Moderate |
| Heavy obfuscation | +50-100% | 20-40% slower | Difficult |

Test thoroughly on low-end devices before shipping heavily obfuscated code.

## Hermes Bytecode Benefits

Hermes is Facebook's JavaScript engine optimized for React Native. It compiles JavaScript to bytecode, providing both performance and security benefits.

### Enabling Hermes

In your `android/app/build.gradle`:

```groovy
project.ext.react = [
    enableHermes: true,
    hermesCommand: "../../node_modules/hermes-engine/%OS-BIN%/hermes",
]
```

For iOS, in your `Podfile`:

```ruby
use_react_native!(
  :hermes_enabled => true
)
```

### Hermes Security Advantages

1. **Bytecode Format**: The `.hbc` format is not human-readable JavaScript
2. **Custom Engine**: Fewer existing tools for analysis compared to V8/JSC
3. **Stripped Symbols**: Function names can be removed from bytecode
4. **Smaller Attack Surface**: Less runtime code to exploit

### Analyzing Hermes Bytecode

While not impenetrable, Hermes bytecode requires specialized tools:

```bash
# Disassembling Hermes bytecode
hbcdump index.android.bundle

# Output is low-level bytecode, not JavaScript
Function<global>0(1 params, 15 registers, 0 symbols):
    LoadConstUndefined r0
    CreateEnvironment r1
    LoadConstString r2, "use strict"
    ...
```

Reconstructing original JavaScript from this is significantly harder than deobfuscating minified code.

### Hermes with Additional Obfuscation

For maximum protection, apply obfuscation before Hermes compilation:

```bash
# 1. Bundle JavaScript
npx react-native bundle --platform android ...

# 2. Obfuscate the bundle
node scripts/obfuscate-bundle.js android/app/src/main/assets/index.android.bundle

# 3. Hermes compiles obfuscated JS to bytecode
# This happens automatically during the Gradle build
```

## ProGuard and R8 for Android

ProGuard and R8 protect your native Java/Kotlin code on Android.

### Basic Configuration

In `android/app/build.gradle`:

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

### React Native ProGuard Rules

Create `android/app/proguard-rules.pro`:

```proguard
# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactProp *;
    @com.facebook.react.bridge.ReactPropGroup *;
}

# JavaScript Interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Obfuscate everything else aggressively
-repackageclasses ''
-allowaccessmodification
-overloadaggressively

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Encrypt string literals
-adaptclassstrings
-adaptresourcefilenames
-adaptresourcefilecontents
```

### R8 Full Mode

Enable R8 full mode for more aggressive optimization:

```properties
# gradle.properties
android.enableR8.fullMode=true
```

This provides better code shrinking and obfuscation but requires more careful testing.

## iOS Binary Protection

iOS apps compiled with Xcode have different protection mechanisms.

### Bitcode and Symbol Stripping

In Xcode, enable these settings for release builds:

```
Build Settings:
- Enable Bitcode: Yes
- Strip Debug Symbols During Copy: Yes
- Strip Linked Product: Yes
- Strip Style: All Symbols
- Deployment Postprocessing: Yes
```

### LLVM Obfuscation

For enhanced protection, consider LLVM-based obfuscators:

```bash
# Using obfuscator-llvm
./build.sh -DLLVM_ENABLE_PROJECTS="obfuscator" -DLLVM_TARGETS_TO_BUILD="X86;ARM;AArch64"
```

Then configure your Xcode project to use the obfuscating compiler.

### App Store Encryption

Apple automatically encrypts your binary with FairPlay DRM. However, this can be bypassed on jailbroken devices using tools like `dumpdecrypted` or `Clutch`. Don't rely solely on App Store encryption.

## Detecting Debugging and Tampering

Runtime detection helps identify when your app is being analyzed.

### Debug Detection on Android

```java
// DebugDetector.java
public class DebugDetector {

    public static boolean isDebuggerConnected() {
        return Debug.isDebuggerConnected() || Debug.waitingForDebugger();
    }

    public static boolean isDebuggable() {
        return (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    public static boolean hasDebugKey() {
        try {
            PackageInfo info = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            for (Signature signature : info.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                String currentSignature = Base64.encodeToString(md.digest(), Base64.DEFAULT);
                // Check against known debug key hash
                if (currentSignature.contains("debug")) {
                    return true;
                }
            }
        } catch (Exception e) {
            return true; // Fail secure
        }
        return false;
    }

    public static boolean detectFrida() {
        // Check for Frida server
        try {
            Socket socket = new Socket("127.0.0.1", 27042);
            socket.close();
            return true;
        } catch (Exception e) {
            // Not running
        }

        // Check for Frida libraries
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/self/maps"));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("frida") || line.contains("gadget")) {
                    return true;
                }
            }
        } catch (Exception e) {
            // Can't read maps
        }

        return false;
    }
}
```

### Debug Detection on iOS

```objective-c
// DebugDetector.m
#import <sys/sysctl.h>
#import <dlfcn.h>

@implementation DebugDetector

+ (BOOL)isDebuggerAttached {
    int mib[4];
    struct kinfo_proc info;
    size_t size = sizeof(info);

    info.kp_proc.p_flag = 0;
    mib[0] = CTL_KERN;
    mib[1] = KERN_PROC;
    mib[2] = KERN_PROC_PID;
    mib[3] = getpid();

    if (sysctl(mib, 4, &info, &size, NULL, 0) == -1) {
        return YES; // Fail secure
    }

    return (info.kp_proc.p_flag & P_TRACED) != 0;
}

+ (BOOL)detectFrida {
    // Check for Frida dylibs
    uint32_t count = _dyld_image_count();
    for (uint32_t i = 0; i < count; i++) {
        const char *name = _dyld_get_image_name(i);
        if (strstr(name, "frida") || strstr(name, "FridaGadget")) {
            return YES;
        }
    }

    // Check for Frida server port
    struct sockaddr_in sa;
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    sa.sin_family = AF_INET;
    sa.sin_port = htons(27042);
    inet_pton(AF_INET, "127.0.0.1", &sa.sin_addr);

    if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) == 0) {
        close(sock);
        return YES;
    }
    close(sock);

    return NO;
}

+ (BOOL)isJailbroken {
    // Check for common jailbreak files
    NSArray *jailbreakPaths = @[
        @"/Applications/Cydia.app",
        @"/Library/MobileSubstrate/MobileSubstrate.dylib",
        @"/bin/bash",
        @"/usr/sbin/sshd",
        @"/etc/apt",
        @"/private/var/lib/apt/",
        @"/usr/bin/ssh"
    ];

    for (NSString *path in jailbreakPaths) {
        if ([[NSFileManager defaultManager] fileExistsAtPath:path]) {
            return YES;
        }
    }

    // Check if we can write outside sandbox
    NSError *error;
    [@"jailbreak_test" writeToFile:@"/private/jailbreak_test.txt"
                       atomically:YES
                         encoding:NSUTF8StringEncoding
                            error:&error];
    if (!error) {
        [[NSFileManager defaultManager] removeItemAtPath:@"/private/jailbreak_test.txt" error:nil];
        return YES;
    }

    return NO;
}

@end
```

### JavaScript-Side Detection

Create a React Native module to expose detection to JavaScript:

```javascript
// SecurityModule.js
import { NativeModules, Platform } from 'react-native';

const { SecurityModule } = NativeModules;

export const checkSecurityStatus = async () => {
  const checks = {
    debuggerAttached: await SecurityModule.isDebuggerAttached(),
    deviceRooted: await SecurityModule.isDeviceRooted(),
    fridaDetected: await SecurityModule.detectFrida(),
    emulator: await SecurityModule.isEmulator(),
    hookingDetected: await SecurityModule.detectHooking(),
  };

  const isCompromised = Object.values(checks).some(v => v === true);

  if (isCompromised) {
    // Log the incident
    await reportSecurityIncident(checks);

    // Take action based on your policy
    // Options: warn user, limit features, terminate app
  }

  return { isCompromised, checks };
};
```

## Runtime Integrity Checks

Beyond detecting debuggers, verify your app hasn't been modified.

### Hash Verification

Calculate and verify hashes of critical code sections:

```javascript
// integrityCheck.js
import { NativeModules } from 'react-native';
import CryptoJS from 'crypto-js';

const EXPECTED_BUNDLE_HASH = 'a1b2c3d4e5f6...'; // Set during build

export const verifyBundleIntegrity = async () => {
  try {
    // Get bundle contents (native module required)
    const bundleContents = await NativeModules.SecurityModule.getBundleContents();

    // Calculate hash
    const actualHash = CryptoJS.SHA256(bundleContents).toString();

    if (actualHash !== EXPECTED_BUNDLE_HASH) {
      console.error('Bundle integrity check failed');
      // Handle tampering
      return false;
    }

    return true;
  } catch (error) {
    // Fail secure
    return false;
  }
};
```

### Native Code Integrity

On Android, verify the APK signature:

```java
// SignatureValidator.java
public class SignatureValidator {

    private static final String EXPECTED_SIGNATURE = "YOUR_RELEASE_SIGNATURE_HASH";

    public static boolean validateSignature(Context context) {
        try {
            PackageInfo info = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);

            SigningInfo signingInfo = info.signingInfo;
            Signature[] signatures = signingInfo.getApkContentsSigners();

            for (Signature signature : signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                md.update(signature.toByteArray());
                String currentSignature = bytesToHex(md.digest());

                if (EXPECTED_SIGNATURE.equals(currentSignature)) {
                    return true;
                }
            }
        } catch (Exception e) {
            // Fail secure
        }
        return false;
    }
}
```

### Memory Integrity Monitoring

Detect runtime memory modifications:

```java
// MemoryIntegrityMonitor.java
public class MemoryIntegrityMonitor {

    private static Map<String, Integer> methodHashes = new HashMap<>();

    public static void registerMethod(String name, Method method) {
        // Store hash of method bytecode
        int hash = calculateMethodHash(method);
        methodHashes.put(name, hash);
    }

    public static boolean verifyMethod(String name, Method method) {
        Integer expectedHash = methodHashes.get(name);
        if (expectedHash == null) return false;

        int currentHash = calculateMethodHash(method);
        return expectedHash.equals(currentHash);
    }

    // Run periodic checks
    public static void startMonitoring() {
        Timer timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                for (Map.Entry<String, Integer> entry : methodHashes.entrySet()) {
                    // Verify each registered method
                    // Take action if modification detected
                }
            }
        }, 0, 30000); // Check every 30 seconds
    }
}
```

## Protecting API Keys and Secrets

Never hardcode secrets in your JavaScript code. Use these strategies instead.

### Environment-Based Configuration

Use `react-native-config` with build-time injection:

```bash
# .env.production (never commit this)
API_KEY=your_production_key
API_SECRET=your_production_secret
```

```javascript
// config.js
import Config from 'react-native-config';

export const API_KEY = Config.API_KEY;
export const API_SECRET = Config.API_SECRET;
```

These values are still in the bundle but separated from source control.

### Native Secret Storage

Store secrets in native code with obfuscation:

```java
// SecretsModule.java
public class SecretsModule extends ReactContextBaseJavaModule {

    // XOR-encoded secret (not in plain text)
    private static final byte[] ENCODED_API_KEY = {
        0x4A, 0x2B, 0x1C, 0x5D, 0x3E, 0x7F, 0x0A, 0x9B
    };
    private static final byte[] XOR_KEY = {
        0x1F, 0x5A, 0x7C, 0x3D, 0x6E, 0x2F, 0x4A, 0xDB
    };

    @ReactMethod
    public void getApiKey(Promise promise) {
        byte[] decoded = new byte[ENCODED_API_KEY.length];
        for (int i = 0; i < ENCODED_API_KEY.length; i++) {
            decoded[i] = (byte) (ENCODED_API_KEY[i] ^ XOR_KEY[i % XOR_KEY.length]);
        }
        promise.resolve(new String(decoded));
    }
}
```

### Secure Key Storage APIs

Use platform secure storage for user-specific secrets:

```javascript
// secureStorage.js
import * as Keychain from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';

export const storeSecret = async (key, value) => {
  if (Platform.OS === 'ios') {
    await Keychain.setGenericPassword(key, value, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
  } else {
    await EncryptedStorage.setItem(key, value);
  }
};

export const retrieveSecret = async (key) => {
  if (Platform.OS === 'ios') {
    const credentials = await Keychain.getGenericPassword();
    return credentials ? credentials.password : null;
  } else {
    return await EncryptedStorage.getItem(key);
  }
};
```

### Backend-Mediated Keys

For highest security, never send sensitive keys to the client:

```javascript
// api.js
export const makeSecureRequest = async (endpoint, data) => {
  // Client sends request to your backend
  const response = await fetch('https://your-backend.com/proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint,
      data,
    }),
  });

  // Backend adds API key and forwards request
  // API key never touches client device
  return response.json();
};
```

## Code Signing Validation

Ensure your app hasn't been repackaged and resigned.

### Android Signature Verification

```java
// SignatureVerifier.java
public class SignatureVerifier {

    // SHA-256 hash of your release signing certificate
    private static final String RELEASE_SIGNATURE = "AB:CD:EF:12:34:56:78:90:...";

    public static boolean verify(Context context) {
        try {
            PackageInfo packageInfo = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);

            for (Signature signature : packageInfo.signatures) {
                String currentSignature = getSignatureHash(signature);
                if (RELEASE_SIGNATURE.equals(currentSignature)) {
                    return true;
                }
            }
        } catch (Exception e) {
            Log.e("SignatureVerifier", "Verification failed", e);
        }
        return false;
    }

    private static String getSignatureHash(Signature signature) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        digest.update(signature.toByteArray());
        byte[] hashBytes = digest.digest();

        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex).append(":");
        }
        return hexString.toString().toUpperCase();
    }
}
```

### iOS Code Signing Validation

```objective-c
// CodeSigningValidator.m
#import <Foundation/Foundation.h>

@implementation CodeSigningValidator

+ (BOOL)validateCodeSignature {
    // Get the embedded provisioning profile
    NSString *profilePath = [[NSBundle mainBundle] pathForResource:@"embedded" ofType:@"mobileprovision"];

    if (!profilePath) {
        // No provisioning profile - might be App Store build
        // Verify bundle identifier instead
        NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
        return [bundleId isEqualToString:@"com.yourcompany.yourapp"];
    }

    NSData *profileData = [NSData dataWithContentsOfFile:profilePath];
    if (!profileData) return NO;

    // Parse and verify provisioning profile
    // Check team identifier, app identifier, etc.

    return YES;
}

+ (BOOL)verifyBinaryIntegrity {
    // Get code signature status
    SecStaticCodeRef staticCode;
    NSURL *bundleURL = [[NSBundle mainBundle] bundleURL];

    OSStatus status = SecStaticCodeCreateWithPath((__bridge CFURLRef)bundleURL,
                                                   kSecCSDefaultFlags,
                                                   &staticCode);
    if (status != errSecSuccess) return NO;

    status = SecStaticCodeCheckValidity(staticCode,
                                         kSecCSDefaultFlags,
                                         NULL);
    CFRelease(staticCode);

    return status == errSecSuccess;
}

@end
```

## Security Through Architecture

Code protection alone isn't enough. Design your architecture for security.

### Client-Server Trust Boundaries

Never trust the client. Implement validation on the server:

```javascript
// Client-side (can be bypassed)
const purchaseItem = async (itemId) => {
  const userBalance = await getBalance();
  if (userBalance >= item.price) {
    // This check can be bypassed!
    await api.purchase(itemId);
  }
};

// Server-side (secure)
app.post('/purchase', authenticate, async (req, res) => {
  const { itemId } = req.body;
  const user = req.user;

  // Server verifies everything
  const item = await Item.findById(itemId);
  const balance = await user.getBalance();

  if (balance < item.price) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Process purchase atomically
  await db.transaction(async (trx) => {
    await user.deductBalance(item.price, trx);
    await user.addItem(item, trx);
  });

  res.json({ success: true });
});
```

### Certificate Pinning

Prevent man-in-the-middle attacks:

```javascript
// Using react-native-ssl-pinning
import { fetch } from 'react-native-ssl-pinning';

export const secureApi = {
  get: async (url) => {
    return fetch(url, {
      method: 'GET',
      timeoutInterval: 10000,
      sslPinning: {
        certs: ['your_server_cert'], // Certificate in app bundle
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};
```

### Request Signing

Sign API requests to detect tampering:

```javascript
// requestSigning.js
import CryptoJS from 'crypto-js';

const signRequest = (method, url, body, timestamp) => {
  const message = `${method}|${url}|${JSON.stringify(body)}|${timestamp}`;
  const signature = CryptoJS.HmacSHA256(message, getSigningKey()).toString();
  return signature;
};

export const makeSignedRequest = async (method, url, body) => {
  const timestamp = Date.now().toString();
  const signature = signRequest(method, url, body, timestamp);

  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    body: JSON.stringify(body),
  });
};
```

Server validates the signature:

```javascript
// Server-side validation
const validateSignature = (req) => {
  const { method, url, body } = req;
  const timestamp = req.headers['x-timestamp'];
  const providedSignature = req.headers['x-signature'];

  // Reject old requests
  const age = Date.now() - parseInt(timestamp);
  if (age > 300000) { // 5 minutes
    return false;
  }

  const expectedSignature = signRequest(method, url, body, timestamp);
  return providedSignature === expectedSignature;
};
```

## Layered Defense Approach

No single protection is unbreakable. Use defense in depth.

### Implementation Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 1: Obfuscation                  │
│   JavaScript obfuscation + Hermes bytecode + ProGuard   │
├─────────────────────────────────────────────────────────┤
│                    Layer 2: Detection                    │
│   Debug detection + Root/Jailbreak + Emulator + Frida   │
├─────────────────────────────────────────────────────────┤
│                    Layer 3: Integrity                    │
│   Code signing + Bundle hashing + Memory monitoring     │
├─────────────────────────────────────────────────────────┤
│                    Layer 4: Architecture                 │
│   Server validation + Certificate pinning + Request signing│
├─────────────────────────────────────────────────────────┤
│                    Layer 5: Response                     │
│   Incident logging + Feature limiting + App termination │
└─────────────────────────────────────────────────────────┘
```

### Security Checklist

Use this checklist for your release builds:

```markdown
## Pre-Release Security Checklist

### Build Configuration
- [ ] Hermes enabled for bytecode compilation
- [ ] JavaScript obfuscation applied
- [ ] ProGuard/R8 enabled with aggressive settings
- [ ] Debug symbols stripped
- [ ] Console logs removed
- [ ] Source maps excluded from bundle

### Runtime Protection
- [ ] Debugger detection implemented
- [ ] Root/jailbreak detection active
- [ ] Frida/hooking detection enabled
- [ ] Emulator detection (if required)
- [ ] Integrity checks running

### Secrets Management
- [ ] No hardcoded API keys in JavaScript
- [ ] Sensitive keys stored in native code or backend
- [ ] Secure storage used for user credentials
- [ ] Environment variables properly configured

### Network Security
- [ ] Certificate pinning enabled
- [ ] Request signing implemented
- [ ] HTTPS enforced everywhere
- [ ] Token refresh mechanism tested

### Architecture
- [ ] All business logic validated server-side
- [ ] Payment processing on backend only
- [ ] License checks performed server-side
- [ ] Rate limiting on sensitive endpoints
```

### Incident Response

Prepare for when protections are bypassed:

```javascript
// incidentResponse.js
export const handleSecurityIncident = async (incident) => {
  // Log the incident
  await analytics.logEvent('security_incident', {
    type: incident.type,
    details: incident.details,
    deviceId: await getDeviceId(),
    timestamp: Date.now(),
  });

  // Determine response based on severity
  switch (incident.severity) {
    case 'critical':
      // Debugger attached, Frida detected
      await clearSensitiveData();
      terminateApp();
      break;

    case 'high':
      // Root/jailbreak detected
      showSecurityWarning();
      disableSensitiveFeatures();
      break;

    case 'medium':
      // Emulator detected
      logForReview();
      break;

    case 'low':
      // Suspicious but not confirmed
      incrementRiskScore();
      break;
  }
};
```

## Conclusion

Protecting React Native apps from reverse engineering requires a multi-layered approach. No single technique provides complete security, but combining multiple defenses significantly raises the bar for attackers.

Key takeaways:

1. **Enable Hermes** - Bytecode compilation is your first line of defense
2. **Apply obfuscation** - Make static analysis time-consuming
3. **Implement detection** - Know when your app is being analyzed
4. **Verify integrity** - Detect tampering at runtime
5. **Protect secrets** - Never hardcode sensitive data
6. **Design securely** - Server-side validation is non-negotiable
7. **Monitor and respond** - Prepare for when protections fail

Remember that security is an ongoing process. Attackers continuously develop new techniques, so regularly review and update your protections. The goal isn't to make reverse engineering impossible, but to make it expensive enough that attackers move to easier targets.

Most importantly, balance security with user experience. Overly aggressive protections can cause false positives, frustrating legitimate users. Test thoroughly across device types and conditions before deploying security measures to production.

By implementing the techniques in this guide, you'll significantly improve your React Native app's resistance to reverse engineering while maintaining the smooth experience your users expect.
