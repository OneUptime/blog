# How to Protect React Native Apps from Jailbreak/Root Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Security, Jailbreak Detection, Root Detection, Mobile Development, App Protection

Description: Learn how to detect jailbroken iOS devices and rooted Android devices in React Native to protect sensitive app functionality.

---

## Introduction

Mobile application security is a critical concern for developers, especially when building apps that handle sensitive data such as financial information, personal health records, or corporate secrets. One fundamental aspect of mobile security is detecting whether an app is running on a compromised device—specifically, a jailbroken iOS device or a rooted Android device.

In this comprehensive guide, we will explore why jailbreak and root detection matters, the risks associated with compromised devices, and how to implement robust detection mechanisms in your React Native applications.

## Why Detect Jailbreak and Root?

### Understanding Jailbreaking and Rooting

**Jailbreaking** (iOS) and **Rooting** (Android) are processes that remove the manufacturer-imposed restrictions on mobile devices. While these modifications can provide users with more control over their devices, they also introduce significant security vulnerabilities.

When a device is jailbroken or rooted:

- The operating system's security sandbox is compromised
- Malicious apps can gain elevated privileges
- System files can be modified or replaced
- Security certificates can be manipulated
- Apps can be tampered with or reverse-engineered more easily

### Business Reasons for Detection

There are several legitimate business reasons to detect compromised devices:

1. **Regulatory Compliance**: Industries like finance, healthcare, and government often require apps to operate only on secure, unmodified devices
2. **Intellectual Property Protection**: Preventing reverse engineering and code theft
3. **Fraud Prevention**: Reducing the risk of payment fraud and account takeover
4. **Data Security**: Protecting sensitive user data from malware
5. **License Enforcement**: Preventing piracy and unauthorized access

## Risks of Running on Compromised Devices

### Security Vulnerabilities

Running your app on a jailbroken or rooted device exposes it to numerous threats:

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPROMISED DEVICE                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Malware   │  │   Keylogger │  │   Screen    │         │
│  │   Access    │  │   Capture   │  │   Recording │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Memory    │  │   Network   │  │   SSL       │         │
│  │   Dumping   │  │   Sniffing  │  │   Bypass    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Code      │  │   Data      │  │   Runtime   │         │
│  │   Injection │  │   Theft     │  │   Hooking   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Common Attack Vectors

1. **Runtime Manipulation**: Tools like Frida, Xposed, or Cydia Substrate can hook into your app's runtime
2. **Memory Inspection**: Sensitive data in memory can be read by other processes
3. **Network Interception**: HTTPS traffic can be intercepted using custom certificates
4. **Code Modification**: App binaries can be patched to bypass security checks
5. **Data Extraction**: Databases, keychains, and shared preferences can be accessed

## Setting Up jail-monkey Library

The most popular library for jailbreak and root detection in React Native is `jail-monkey`. Let's walk through the setup process.

### Installation

First, install the library using npm or yarn:

```bash
# Using npm
npm install jail-monkey --save

# Using yarn
yarn add jail-monkey
```

### iOS Configuration

For iOS, you need to link the native module. If you're using React Native 0.60+, autolinking should handle this automatically. Otherwise:

```bash
cd ios && pod install && cd ..
```

If autolinking doesn't work, manually link the library:

```bash
react-native link jail-monkey
```

### Android Configuration

For Android, the library should autolink in React Native 0.60+. If you need manual linking:

1. Add to `android/settings.gradle`:

```groovy
include ':jail-monkey'
project(':jail-monkey').projectDir = new File(rootProject.projectDir, '../node_modules/jail-monkey/android')
```

2. Add to `android/app/build.gradle`:

```groovy
dependencies {
    implementation project(':jail-monkey')
}
```

3. Add to `MainApplication.java`:

```java
import com.gantix.JailMonkey.JailMonkeyPackage;

@Override
protected List<ReactPackage> getPackages() {
    return Arrays.asList(
        new MainReactPackage(),
        new JailMonkeyPackage()
    );
}
```

## Basic Usage

Here's how to use jail-monkey in your React Native application:

```typescript
import JailMonkey from 'jail-monkey';

// Check if device is jailbroken/rooted
const isCompromised = JailMonkey.isJailBroken();

// Check if running on an emulator/simulator
const isEmulator = JailMonkey.isOnExternalStorage();

// Check if mock location is enabled (Android)
const hasMockLocation = JailMonkey.canMockLocation();

// Check if app is running in debug mode
const isDebuggedMode = JailMonkey.isDebuggedMode();

// Get the ADB (Android Debug Bridge) status
const adbEnabled = JailMonkey.AdbEnabled();
```

## iOS Jailbreak Detection Methods

jail-monkey uses several techniques to detect jailbroken iOS devices. Understanding these methods helps you appreciate the detection capabilities and limitations.

### File System Checks

The library checks for the presence of files and directories commonly associated with jailbreaking:

```typescript
// Files checked include:
const jailbreakPaths = [
    '/Applications/Cydia.app',
    '/Applications/blackra1n.app',
    '/Applications/FakeCarrier.app',
    '/Applications/Icy.app',
    '/Applications/IntelliScreen.app',
    '/Applications/MxTube.app',
    '/Applications/RockApp.app',
    '/Applications/SBSettings.app',
    '/Applications/WinterBoard.app',
    '/Library/MobileSubstrate/MobileSubstrate.dylib',
    '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
    '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
    '/private/var/lib/apt',
    '/private/var/lib/apt/',
    '/private/var/lib/cydia',
    '/private/var/mobile/Library/SBSettings/Themes',
    '/private/var/stash',
    '/private/var/tmp/cydia.log',
    '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
    '/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist',
    '/usr/bin/sshd',
    '/usr/libexec/sftp-server',
    '/usr/sbin/sshd',
    '/bin/bash',
    '/etc/apt',
];
```

### URL Scheme Detection

The library attempts to open Cydia's URL scheme:

```typescript
// Checking if Cydia URL scheme is available
const canOpenCydia = () => {
    return Linking.canOpenURL('cydia://package/com.example.package');
};
```

### Sandbox Integrity Check

Jailbroken devices often have a compromised sandbox. The library tests if the app can write to restricted locations:

```typescript
// Attempting to write outside the sandbox
const checkSandboxIntegrity = () => {
    try {
        const testPath = '/private/jailbreak_test.txt';
        // If write succeeds, sandbox is compromised
        return writeToPath(testPath);
    } catch {
        return false;
    }
};
```

### Fork Detection

On a non-jailbroken device, the `fork()` system call should fail:

```typescript
// Native implementation checks if fork() succeeds
// Success indicates a jailbroken device
```

## Android Root Detection Methods

Android root detection uses different techniques due to the platform's different architecture.

### Su Binary Detection

The most common indicator of a rooted device is the presence of the `su` binary:

```typescript
// Paths checked for su binary
const suPaths = [
    '/system/app/Superuser.apk',
    '/sbin/su',
    '/system/bin/su',
    '/system/xbin/su',
    '/data/local/xbin/su',
    '/data/local/bin/su',
    '/system/sd/xbin/su',
    '/system/bin/failsafe/su',
    '/data/local/su',
    '/su/bin/su',
    '/su/bin',
    '/system/xbin/daemonsu',
];
```

### Build Tags Check

Rooted devices often have modified build tags:

```typescript
// Checking for test-keys in build tags
import { NativeModules } from 'react-native';

const checkBuildTags = () => {
    const buildTags = NativeModules.JailMonkey.getBuildTags();
    return buildTags.includes('test-keys');
};
```

### Dangerous Properties Check

Certain system properties indicate a rooted device:

```typescript
// Properties that indicate root
const dangerousProps = [
    'ro.debuggable',
    'ro.secure',
];
```

### Root Management Apps Detection

The library checks for installed root management applications:

```typescript
// Common root management apps
const rootApps = [
    'com.noshufou.android.su',
    'com.noshufou.android.su.elite',
    'eu.chainfire.supersu',
    'com.koushikdutta.superuser',
    'com.thirdparty.superuser',
    'com.yellowes.su',
    'com.topjohnwu.magisk',
    'com.kingroot.kinguser',
    'com.kingo.root',
    'com.smedialink.oneclickroot',
    'com.zhiqupk.root.global',
    'com.alephzain.framaroot',
];
```

## Detecting Common Bypass Tools

Sophisticated attackers use bypass tools to hide the jailbreak/root status from detection libraries. It's important to detect these tools as well.

### Frida Detection

Frida is a dynamic instrumentation toolkit commonly used to bypass security checks:

```typescript
import { NativeModules, Platform } from 'react-native';

const detectFrida = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        // Check for Frida server port
        const fridaPorts = [27042, 27043];
        for (const port of fridaPorts) {
            const isOpen = await checkPort(port);
            if (isOpen) return true;
        }

        // Check for Frida-related files
        const fridaFiles = [
            '/data/local/tmp/frida-server',
            '/data/local/tmp/re.frida.server',
        ];
        for (const file of fridaFiles) {
            if (await fileExists(file)) return true;
        }
    }

    return false;
};
```

### Xposed Framework Detection

Xposed allows runtime modification of apps and the system:

```typescript
const detectXposed = (): boolean => {
    if (Platform.OS === 'android') {
        // Check for Xposed installer
        const xposedPackages = [
            'de.robv.android.xposed.installer',
            'com.saurik.substrate',
            'de.robv.android.xposed',
        ];

        // Check loaded modules
        try {
            const stackTrace = new Error().stack;
            if (stackTrace?.includes('de.robv.android.xposed')) {
                return true;
            }
        } catch {}

        return false;
    }
    return false;
};
```

### Magisk Detection

Magisk is a popular rooting solution that hides root from detection:

```typescript
const detectMagisk = async (): Promise<boolean> => {
    // Magisk hide renames the su binary
    const magiskPaths = [
        '/sbin/.magisk',
        '/sbin/.core',
        '/data/adb/magisk',
        '/data/adb/magisk.img',
        '/data/adb/magisk.db',
    ];

    for (const path of magiskPaths) {
        if (await fileExists(path)) return true;
    }

    // Check for Magisk Manager package
    const magiskPackages = [
        'com.topjohnwu.magisk',
        'io.github.vvb2060.magisk', // Magisk Delta
    ];

    return false;
};
```

### Liberty Lite / Shadow Detection (iOS)

These tweaks specifically hide jailbreak status:

```typescript
const detectHidingTweaks = (): boolean => {
    // Check for Liberty Lite
    const libertyPaths = [
        '/usr/lib/liberty',
        '/Library/MobileSubstrate/DynamicLibraries/zzzzzLiberty.dylib',
    ];

    // Check for Shadow
    const shadowPaths = [
        '/Library/MobileSubstrate/DynamicLibraries/Shadow.dylib',
    ];

    return [...libertyPaths, ...shadowPaths].some(fileExists);
};
```

## Creating a Comprehensive Security Check

Now let's create a complete security check module that combines all detection methods:

```typescript
// security/DeviceIntegrity.ts
import JailMonkey from 'jail-monkey';
import { Platform, NativeModules } from 'react-native';

export interface SecurityCheckResult {
    isCompromised: boolean;
    isJailbroken: boolean;
    isRooted: boolean;
    isEmulator: boolean;
    isDebugMode: boolean;
    hasMockLocation: boolean;
    hasAdbEnabled: boolean;
    detectedThreats: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const performSecurityCheck = async (): Promise<SecurityCheckResult> => {
    const detectedThreats: string[] = [];

    // Basic jail-monkey checks
    const isJailbroken = JailMonkey.isJailBroken();
    const isEmulator = JailMonkey.isOnExternalStorage();
    const isDebugMode = JailMonkey.isDebuggedMode();
    const hasMockLocation = Platform.OS === 'android' && JailMonkey.canMockLocation();
    const hasAdbEnabled = Platform.OS === 'android' && JailMonkey.AdbEnabled();

    if (isJailbroken) {
        detectedThreats.push('Device is jailbroken/rooted');
    }

    if (isEmulator) {
        detectedThreats.push('Running on emulator/simulator');
    }

    if (isDebugMode) {
        detectedThreats.push('Debug mode enabled');
    }

    if (hasMockLocation) {
        detectedThreats.push('Mock location enabled');
    }

    if (hasAdbEnabled) {
        detectedThreats.push('ADB is enabled');
    }

    // Calculate risk level
    const riskLevel = calculateRiskLevel(detectedThreats);

    return {
        isCompromised: isJailbroken || isEmulator,
        isJailbroken: Platform.OS === 'ios' && isJailbroken,
        isRooted: Platform.OS === 'android' && isJailbroken,
        isEmulator,
        isDebugMode,
        hasMockLocation,
        hasAdbEnabled,
        detectedThreats,
        riskLevel,
    };
};

const calculateRiskLevel = (threats: string[]): SecurityCheckResult['riskLevel'] => {
    if (threats.length === 0) return 'low';
    if (threats.length === 1) return 'medium';
    if (threats.length <= 3) return 'high';
    return 'critical';
};
```

## Response Strategies

Once you've detected a compromised device, you need to decide how to respond. The appropriate response depends on your app's security requirements and user experience considerations.

### Strategy 1: Block App Access

For high-security applications, completely blocking access might be appropriate:

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { performSecurityCheck, SecurityCheckResult } from './security/DeviceIntegrity';

const App: React.FC = () => {
    const [securityStatus, setSecurityStatus] = useState<SecurityCheckResult | null>(null);

    useEffect(() => {
        const checkSecurity = async () => {
            const result = await performSecurityCheck();
            setSecurityStatus(result);
        };
        checkSecurity();
    }, []);

    if (securityStatus?.isCompromised) {
        return (
            <View style={styles.blockedContainer}>
                <Text style={styles.blockedTitle}>
                    Security Alert
                </Text>
                <Text style={styles.blockedMessage}>
                    This app cannot run on modified devices for security reasons.
                    Please use an unmodified device to access this application.
                </Text>
            </View>
        );
    }

    return <MainApp />;
};

const styles = StyleSheet.create({
    blockedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8d7da',
        padding: 20,
    },
    blockedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#721c24',
        marginBottom: 16,
    },
    blockedMessage: {
        fontSize: 16,
        color: '#721c24',
        textAlign: 'center',
        lineHeight: 24,
    },
});
```

### Strategy 2: Limit Functionality

For apps that want to maintain some usability, limit sensitive features:

```typescript
// hooks/useSecurityContext.ts
import React, { createContext, useContext, useEffect, useState } from 'react';
import { performSecurityCheck, SecurityCheckResult } from '../security/DeviceIntegrity';

interface SecurityContextType {
    securityStatus: SecurityCheckResult | null;
    canAccessSensitiveFeatures: boolean;
    canMakePayments: boolean;
    canViewConfidentialData: boolean;
}

const SecurityContext = createContext<SecurityContextType>({
    securityStatus: null,
    canAccessSensitiveFeatures: true,
    canMakePayments: true,
    canViewConfidentialData: true,
});

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [securityStatus, setSecurityStatus] = useState<SecurityCheckResult | null>(null);

    useEffect(() => {
        performSecurityCheck().then(setSecurityStatus);
    }, []);

    const canAccessSensitiveFeatures = !securityStatus?.isCompromised;
    const canMakePayments = securityStatus?.riskLevel === 'low';
    const canViewConfidentialData = !securityStatus?.isCompromised && !securityStatus?.isDebugMode;

    return (
        <SecurityContext.Provider
            value={{
                securityStatus,
                canAccessSensitiveFeatures,
                canMakePayments,
                canViewConfidentialData,
            }}
        >
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurityContext = () => useContext(SecurityContext);
```

### Strategy 3: Silent Logging and Monitoring

For analytics purposes, silently log compromised device usage:

```typescript
// security/SecurityAnalytics.ts
import { performSecurityCheck } from './DeviceIntegrity';
import analytics from '@segment/analytics-react-native';

export const logSecurityStatus = async (userId?: string) => {
    const securityCheck = await performSecurityCheck();

    if (securityCheck.isCompromised) {
        analytics.track('Security_Compromised_Device', {
            userId,
            isJailbroken: securityCheck.isJailbroken,
            isRooted: securityCheck.isRooted,
            isEmulator: securityCheck.isEmulator,
            riskLevel: securityCheck.riskLevel,
            detectedThreats: securityCheck.detectedThreats,
            timestamp: new Date().toISOString(),
        });
    }

    return securityCheck;
};
```

## Graceful Degradation

Implementing graceful degradation allows your app to remain functional while protecting sensitive operations.

```typescript
// components/SecureFeature.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSecurityContext } from '../hooks/useSecurityContext';

interface SecureFeatureProps {
    requiredRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onDenied?: () => void;
}

export const SecureFeature: React.FC<SecureFeatureProps> = ({
    requiredRiskLevel,
    children,
    fallback,
    onDenied,
}) => {
    const { securityStatus } = useSecurityContext();

    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const currentRiskIndex = riskLevels.indexOf(securityStatus?.riskLevel || 'low');
    const requiredRiskIndex = riskLevels.indexOf(requiredRiskLevel);

    const isAllowed = currentRiskIndex <= requiredRiskIndex;

    if (!isAllowed) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <View style={styles.deniedContainer}>
                <Text style={styles.deniedText}>
                    This feature is not available on your device due to security restrictions.
                </Text>
                <TouchableOpacity
                    style={styles.learnMoreButton}
                    onPress={() => {
                        Alert.alert(
                            'Security Information',
                            'Some features are restricted on modified devices to protect your security and privacy.',
                            [{ text: 'OK' }]
                        );
                        onDenied?.();
                    }}
                >
                    <Text style={styles.learnMoreText}>Learn More</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    deniedContainer: {
        padding: 20,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        margin: 16,
    },
    deniedText: {
        color: '#856404',
        fontSize: 14,
        textAlign: 'center',
    },
    learnMoreButton: {
        marginTop: 12,
        alignSelf: 'center',
    },
    learnMoreText: {
        color: '#0066cc',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
```

## App Behavior on Detection

### Configuring Different Behaviors

Create a configuration system for different security policies:

```typescript
// security/SecurityPolicy.ts
export interface SecurityPolicy {
    allowEmulators: boolean;
    allowDebugMode: boolean;
    allowMockLocation: boolean;
    blockOnJailbreak: boolean;
    blockOnRoot: boolean;
    enableSilentLogging: boolean;
    warnUser: boolean;
    restrictedFeatures: string[];
}

export const SecurityPolicies: Record<string, SecurityPolicy> = {
    // Strict policy for banking apps
    strict: {
        allowEmulators: false,
        allowDebugMode: false,
        allowMockLocation: false,
        blockOnJailbreak: true,
        blockOnRoot: true,
        enableSilentLogging: true,
        warnUser: true,
        restrictedFeatures: ['payments', 'transfers', 'sensitiveData'],
    },

    // Moderate policy for general apps
    moderate: {
        allowEmulators: true,
        allowDebugMode: false,
        allowMockLocation: false,
        blockOnJailbreak: false,
        blockOnRoot: false,
        enableSilentLogging: true,
        warnUser: true,
        restrictedFeatures: ['payments'],
    },

    // Relaxed policy for content apps
    relaxed: {
        allowEmulators: true,
        allowDebugMode: true,
        allowMockLocation: true,
        blockOnJailbreak: false,
        blockOnRoot: false,
        enableSilentLogging: true,
        warnUser: false,
        restrictedFeatures: [],
    },
};
```

### Implementing Policy-Based Security

```typescript
// security/SecurityManager.ts
import { SecurityPolicy, SecurityPolicies } from './SecurityPolicy';
import { performSecurityCheck, SecurityCheckResult } from './DeviceIntegrity';

export class SecurityManager {
    private policy: SecurityPolicy;
    private securityStatus: SecurityCheckResult | null = null;

    constructor(policyName: keyof typeof SecurityPolicies = 'moderate') {
        this.policy = SecurityPolicies[policyName];
    }

    async initialize(): Promise<void> {
        this.securityStatus = await performSecurityCheck();

        if (this.policy.enableSilentLogging) {
            this.logSecurityStatus();
        }
    }

    shouldBlockApp(): boolean {
        if (!this.securityStatus) return false;

        if (this.policy.blockOnJailbreak && this.securityStatus.isJailbroken) {
            return true;
        }

        if (this.policy.blockOnRoot && this.securityStatus.isRooted) {
            return true;
        }

        if (!this.policy.allowEmulators && this.securityStatus.isEmulator) {
            return true;
        }

        return false;
    }

    isFeatureAllowed(featureName: string): boolean {
        if (!this.securityStatus) return true;

        const isRestricted = this.policy.restrictedFeatures.includes(featureName);

        if (isRestricted && this.securityStatus.isCompromised) {
            return false;
        }

        return true;
    }

    getWarningMessage(): string | null {
        if (!this.policy.warnUser || !this.securityStatus?.isCompromised) {
            return null;
        }

        return 'Your device appears to be modified. Some features may be restricted for security purposes.';
    }

    private logSecurityStatus(): void {
        // Implement logging to your analytics service
        console.log('Security Status:', this.securityStatus);
    }
}
```

## Handling False Positives

False positives can frustrate legitimate users. Implementing a robust false positive handling strategy is crucial.

### User Appeal System

```typescript
// components/SecurityAppeal.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';

interface SecurityAppealProps {
    onAppealSubmitted: (details: AppealDetails) => void;
    securityStatus: SecurityCheckResult;
}

interface AppealDetails {
    userEmail: string;
    deviceInfo: string;
    appealReason: string;
    securityStatus: SecurityCheckResult;
}

export const SecurityAppeal: React.FC<SecurityAppealProps> = ({
    onAppealSubmitted,
    securityStatus,
}) => {
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!email || !reason) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        onAppealSubmitted({
            userEmail: email,
            deviceInfo: `Platform: ${Platform.OS}, Version: ${Platform.Version}`,
            appealReason: reason,
            securityStatus,
        });

        Alert.alert(
            'Appeal Submitted',
            'We will review your appeal and contact you within 24-48 hours.'
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Security Appeal</Text>
            <Text style={styles.description}>
                If you believe this security restriction is an error, please submit an appeal.
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Your email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Please explain why you believe this is an error"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit Appeal</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

### Allowlisting Known Devices

```typescript
// security/DeviceAllowlist.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALLOWLIST_KEY = '@security_allowlist';

export const DeviceAllowlist = {
    async isAllowlisted(deviceId: string): Promise<boolean> {
        try {
            const allowlist = await AsyncStorage.getItem(ALLOWLIST_KEY);
            if (!allowlist) return false;

            const devices = JSON.parse(allowlist);
            return devices.includes(deviceId);
        } catch {
            return false;
        }
    },

    async addToAllowlist(deviceId: string): Promise<void> {
        try {
            const allowlist = await AsyncStorage.getItem(ALLOWLIST_KEY);
            const devices = allowlist ? JSON.parse(allowlist) : [];

            if (!devices.includes(deviceId)) {
                devices.push(deviceId);
                await AsyncStorage.setItem(ALLOWLIST_KEY, JSON.stringify(devices));
            }
        } catch (error) {
            console.error('Failed to add device to allowlist:', error);
        }
    },
};
```

## Limitations of Detection

It's important to understand that no detection method is foolproof. Here are the key limitations:

### Technical Limitations

1. **Kernel-Level Hiding**: Advanced tools can hide root/jailbreak at the kernel level
2. **Detection Evasion**: Dedicated hiding tools like Magisk Hide, Liberty Lite, and Shadow are specifically designed to bypass detection
3. **Race Conditions**: Detection can sometimes be bypassed by timing attacks
4. **False Negatives**: New jailbreak/root methods may not be detected immediately
5. **Binary Patching**: Sophisticated attackers can patch the detection code itself

### Practical Considerations

```typescript
// Document known limitations
export const SECURITY_LIMITATIONS = {
    disclaimer: `
        Security Note:

        While this app implements jailbreak/root detection, no detection
        method is 100% reliable. Advanced users may be able to bypass
        these checks using specialized tools.

        This detection serves as one layer in a defense-in-depth strategy
        and should not be the sole security measure for protecting
        sensitive operations.

        Additional server-side validation and monitoring are recommended
        for high-security applications.
    `,

    knownBypassTools: [
        'Magisk Hide',
        'Liberty Lite',
        'Shadow',
        'Hestia',
        'A-Bypass',
        'HideJB',
        'Choicy',
        'KernBypass',
    ],

    recommendations: [
        'Implement server-side validation',
        'Use certificate pinning',
        'Encrypt sensitive data at rest',
        'Implement behavioral analysis',
        'Use code obfuscation',
        'Monitor for anomalies',
    ],
};
```

## Defense in Depth Approach

Jailbreak/root detection should be just one part of a comprehensive security strategy.

### Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH LAYERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Device Integrity                                       │
│  ├── Jailbreak/Root Detection                                   │
│  ├── Emulator Detection                                         │
│  └── Debug Mode Detection                                       │
│                                                                  │
│  Layer 2: Application Security                                   │
│  ├── Code Obfuscation                                           │
│  ├── Anti-Tampering                                             │
│  └── Integrity Verification                                     │
│                                                                  │
│  Layer 3: Communication Security                                 │
│  ├── Certificate Pinning                                        │
│  ├── TLS 1.3                                                    │
│  └── Request Signing                                            │
│                                                                  │
│  Layer 4: Data Security                                          │
│  ├── Encryption at Rest                                         │
│  ├── Secure Key Storage                                         │
│  └── Data Minimization                                          │
│                                                                  │
│  Layer 5: Server-Side Security                                   │
│  ├── API Security                                               │
│  ├── Behavioral Analysis                                        │
│  └── Fraud Detection                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementing Certificate Pinning

```typescript
// security/CertificatePinning.ts
// Using react-native-ssl-pinning

import { fetch as sslFetch } from 'react-native-ssl-pinning';

export const secureApiCall = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    return sslFetch(endpoint, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        sslPinning: {
            certs: ['certificate_name'], // Your pinned certificates
        },
        timeoutInterval: 30000,
    });
};
```

### Behavioral Analysis

```typescript
// security/BehavioralAnalysis.ts
interface UserBehavior {
    sessionDuration: number;
    actionFrequency: number;
    navigationPattern: string[];
    inputSpeed: number[];
    touchPressure: number[];
}

export const analyzeBehavior = (behavior: UserBehavior): number => {
    // Return a trust score from 0 to 100
    let trustScore = 100;

    // Check for automated behavior patterns
    if (behavior.actionFrequency > 100) {
        trustScore -= 20;
    }

    // Check for consistent input speed (might indicate bot)
    const speedVariance = calculateVariance(behavior.inputSpeed);
    if (speedVariance < 10) {
        trustScore -= 15;
    }

    // Check for unusual navigation patterns
    if (hasAnomalousNavigation(behavior.navigationPattern)) {
        trustScore -= 25;
    }

    return Math.max(0, trustScore);
};
```

## Complete Implementation Example

Here's a complete example bringing everything together:

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { SecurityProvider } from './hooks/useSecurityContext';
import { SecurityManager } from './security/SecurityManager';
import { BlockedScreen } from './screens/BlockedScreen';
import { MainNavigator } from './navigation/MainNavigator';
import { LoadingScreen } from './screens/LoadingScreen';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [securityManager] = useState(() => new SecurityManager('moderate'));

    useEffect(() => {
        const initializeSecurity = async () => {
            try {
                await securityManager.initialize();
                setIsBlocked(securityManager.shouldBlockApp());
            } catch (error) {
                console.error('Security initialization failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeSecurity();
    }, [securityManager]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isBlocked) {
        return <BlockedScreen securityManager={securityManager} />;
    }

    return (
        <SecurityProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" />
                <MainNavigator />
            </SafeAreaView>
        </SecurityProvider>
    );
};

export default App;
```

## Best Practices Summary

1. **Don't rely solely on client-side detection** - Always validate security-critical operations server-side
2. **Use multiple detection methods** - Combine different techniques for better coverage
3. **Update detection regularly** - Keep up with new jailbreak/root methods and bypass tools
4. **Handle false positives gracefully** - Provide users with appeal mechanisms
5. **Consider user experience** - Balance security with usability
6. **Log and monitor** - Track detection results for security analytics
7. **Use code obfuscation** - Make it harder to reverse engineer your detection logic
8. **Implement defense in depth** - Layer multiple security measures
9. **Test thoroughly** - Test on both jailbroken/rooted and stock devices
10. **Stay informed** - Follow security research and update your approach

## Conclusion

Protecting React Native apps from jailbroken and rooted devices is an important security measure, but it should be part of a broader security strategy. The `jail-monkey` library provides a solid foundation for detection, but remember that determined attackers can often bypass client-side checks.

By implementing a defense-in-depth approach, combining device integrity checks with certificate pinning, code obfuscation, server-side validation, and behavioral analysis, you can significantly improve your app's security posture.

Always consider the trade-off between security and user experience, and provide clear communication to users about why certain restrictions exist. Security should protect users, not frustrate them.

## Additional Resources

- [jail-monkey GitHub Repository](https://github.com/GantMan/jail-monkey)
- [OWASP Mobile Security Testing Guide](https://owasp.org/www-project-mobile-security-testing-guide/)
- [iOS Security Guide](https://support.apple.com/guide/security/welcome/web)
- [Android Security Best Practices](https://developer.android.com/topic/security/best-practices)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
