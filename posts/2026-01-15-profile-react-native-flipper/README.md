# How to Profile React Native Applications with Flipper

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Flipper, Performance, Profiling, Debugging, Mobile Development

Description: Learn how to use Flipper to profile and debug React Native applications, identifying performance bottlenecks and optimizing your mobile app.

---

## Introduction

React Native has revolutionized mobile app development by enabling developers to build cross-platform applications using JavaScript. However, with this convenience comes the challenge of ensuring optimal performance across both iOS and Android platforms. This is where Flipper becomes an indispensable tool in your development arsenal.

Flipper is a powerful desktop debugging platform developed by Meta (formerly Facebook) specifically designed for mobile app development. It provides a unified interface for debugging iOS, Android, and React Native applications, offering deep insights into your app's behavior, performance, and network activity.

In this comprehensive guide, we'll explore how to leverage Flipper's extensive capabilities to profile and debug React Native applications effectively.

## What is Flipper?

Flipper is an extensible mobile app debugger that runs on your desktop. Unlike traditional debugging tools, Flipper operates as a platform that can be extended with plugins, making it incredibly versatile for various debugging scenarios.

### Key Features of Flipper

- **Cross-platform support**: Debug iOS, Android, and React Native apps from a single interface
- **Plugin architecture**: Extend functionality with built-in and custom plugins
- **Real-time inspection**: Monitor app behavior as it happens
- **Network monitoring**: Track all HTTP/HTTPS requests and responses
- **Layout inspection**: Visualize and debug UI hierarchies
- **Database inspection**: View and modify local databases
- **Performance profiling**: Identify bottlenecks and optimize app performance

## Setting Up Flipper with React Native

### Prerequisites

Before setting up Flipper, ensure you have the following:

- Node.js (version 14 or higher)
- React Native (version 0.62 or higher for built-in Flipper support)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installing Flipper Desktop App

First, download and install the Flipper desktop application:

```bash
# For macOS using Homebrew
brew install --cask flipper

# For Windows using Chocolatey
choco install flipper

# Or download directly from the official website
# https://fbflipper.com/
```

### Configuring React Native Project

Starting from React Native 0.62, Flipper integration comes built-in. However, you may need to configure it properly:

#### iOS Configuration

Open your `ios/Podfile` and ensure Flipper is enabled:

```ruby
# ios/Podfile
platform :ios, '13.0'

target 'YourApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :flipper_configuration => FlipperConfiguration.enabled,
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

Then install the pods:

```bash
cd ios && pod install && cd ..
```

#### Android Configuration

For Android, ensure your `android/app/build.gradle` includes Flipper:

```groovy
// android/app/build.gradle
android {
    // ... other configurations

    buildTypes {
        debug {
            // Enable Flipper in debug builds
        }
    }
}

dependencies {
    // Flipper dependencies
    debugImplementation("com.facebook.flipper:flipper:${FLIPPER_VERSION}") {
        exclude group:'com.facebook.fbjni'
    }
    debugImplementation("com.facebook.flipper:flipper-network-plugin:${FLIPPER_VERSION}") {
        exclude group:'com.facebook.fbjni'
    }
    debugImplementation("com.facebook.flipper:flipper-fresco-plugin:${FLIPPER_VERSION}")

    // Release implementation (no-op)
    releaseImplementation("com.facebook.flipper:flipper-noop:${FLIPPER_VERSION}")
}
```

Update `MainApplication.java` (or `MainApplication.kt` for Kotlin):

```java
// MainApplication.java
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin;
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin;
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin;

public class MainApplication extends Application implements ReactApplication {

    @Override
    public void onCreate() {
        super.onCreate();

        if (BuildConfig.DEBUG && FlipperUtils.shouldEnableFlipper(this)) {
            final FlipperClient client = AndroidFlipperClient.getInstance(this);

            client.addPlugin(new InspectorFlipperPlugin(this, DescriptorMapping.withDefaults()));
            client.addPlugin(new NetworkFlipperPlugin());
            client.addPlugin(new DatabasesFlipperPlugin(this));
            client.addPlugin(new SharedPreferencesFlipperPlugin(this));
            client.addPlugin(CrashReporterPlugin.getInstance());
            client.addPlugin(new FrescoFlipperPlugin());

            client.start();
        }
    }
}
```

### Verifying the Connection

1. Start the Flipper desktop app
2. Run your React Native application:

```bash
# For iOS
npx react-native run-ios

# For Android
npx react-native run-android
```

3. Your app should automatically appear in the Flipper sidebar under "Running Applications"

## Network Inspector Usage

The Network Inspector is one of Flipper's most valuable features, allowing you to monitor all network traffic from your React Native app.

### Setting Up Network Inspection

For React Native apps using `fetch` or `axios`, the network plugin typically works out of the box. However, for optimal functionality, you can configure it explicitly:

```javascript
// App.js or your network configuration file
import { Platform } from 'react-native';

if (__DEV__) {
  // Enable network inspection in development
  if (Platform.OS === 'ios') {
    // iOS network inspection is enabled by default
  } else {
    // Android may require additional configuration
  }
}
```

### Using the Network Plugin

Once configured, the Network plugin displays:

- **Request URL**: The endpoint being called
- **Method**: GET, POST, PUT, DELETE, etc.
- **Status**: HTTP status code
- **Duration**: Time taken for the request
- **Size**: Response size
- **Request/Response Headers**: Complete header information
- **Request/Response Body**: Payload data

### Analyzing Network Performance

```javascript
// Example: Monitoring API calls with performance logging
const fetchWithLogging = async (url, options = {}) => {
    const startTime = performance.now();

    try {
        const response = await fetch(url, options);
        const endTime = performance.now();

        console.log(`[Network] ${options.method || 'GET'} ${url} - ${endTime - startTime}ms`);

        return response;
    } catch (error) {
        console.error(`[Network Error] ${url}:`, error);
        throw error;
    }
};

// Usage
const fetchUserData = async (userId) => {
    const response = await fetchWithLogging(
        `https://api.example.com/users/${userId}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN'
            }
        }
    );

    return response.json();
};
```

### Filtering and Searching Requests

Flipper's Network plugin provides powerful filtering capabilities:

- Filter by URL pattern
- Filter by HTTP method
- Filter by status code
- Search within request/response bodies

## React DevTools Integration

Flipper seamlessly integrates with React DevTools, providing comprehensive component inspection and debugging capabilities.

### Installing React DevTools Plugin

The React DevTools plugin comes bundled with Flipper. To ensure it's enabled:

1. Open Flipper
2. Go to Plugin Manager (via the menu or sidebar)
3. Search for "React DevTools"
4. Enable if not already active

### Component Tree Inspection

With React DevTools integrated, you can:

- **View component hierarchy**: Navigate through your component tree
- **Inspect props and state**: See current values in real-time
- **Track component updates**: Identify unnecessary re-renders
- **Edit props in real-time**: Test different values without code changes

```javascript
// Example component for demonstration
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ProfileCard = ({ user, onPress }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const formattedName = useMemo(() => {
        return `${user.firstName} ${user.lastName}`.trim();
    }, [user.firstName, user.lastName]);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.header}>
                <Text style={styles.name}>{formattedName}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>

            {isExpanded && (
                <View style={styles.details}>
                    <Text style={styles.bio}>{user.bio}</Text>
                    <Text style={styles.location}>{user.location}</Text>
                </View>
            )}

            <TouchableOpacity onPress={toggleExpanded}>
                <Text style={styles.toggle}>
                    {isExpanded ? 'Show Less' : 'Show More'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        marginBottom: 8,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    details: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    bio: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    location: {
        fontSize: 12,
        color: '#888',
    },
    toggle: {
        fontSize: 14,
        color: '#007AFF',
        marginTop: 8,
    },
});

export default ProfileCard;
```

### Profiler Tab

The React DevTools Profiler within Flipper helps identify performance issues:

1. Click the "Profiler" tab in React DevTools
2. Click "Start Profiling"
3. Interact with your app
4. Click "Stop Profiling"
5. Analyze the flame graph and component render times

## Performance Profiling Plugin

Flipper's Performance plugin provides deep insights into your app's runtime performance.

### CPU Profiling

Monitor CPU usage to identify expensive operations:

```javascript
// Example: Performance monitoring wrapper
import { InteractionManager } from 'react-native';

class PerformanceMonitor {
    static measureOperation(operationName, operation) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            InteractionManager.runAfterInteractions(() => {
                Promise.resolve(operation())
                    .then(result => {
                        const duration = Date.now() - startTime;
                        console.log(`[Performance] ${operationName}: ${duration}ms`);
                        resolve(result);
                    })
                    .catch(reject);
            });
        });
    }

    static async measureAsync(operationName, asyncOperation) {
        const startTime = performance.now();

        try {
            const result = await asyncOperation();
            const duration = performance.now() - startTime;

            if (__DEV__) {
                console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
            }

            return result;
        } catch (error) {
            console.error(`[Performance Error] ${operationName}:`, error);
            throw error;
        }
    }
}

// Usage example
const loadUserProfile = async (userId) => {
    return PerformanceMonitor.measureAsync('loadUserProfile', async () => {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        return data;
    });
};
```

### Memory Profiling

Track memory usage to prevent leaks and optimize resource consumption:

```javascript
// Memory monitoring utility
class MemoryMonitor {
    constructor() {
        this.snapshots = [];
    }

    takeSnapshot(label) {
        if (__DEV__ && global.performance && performance.memory) {
            const snapshot = {
                label,
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
            };

            this.snapshots.push(snapshot);
            console.log(`[Memory] ${label}:`, {
                used: `${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                total: `${(snapshot.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            });

            return snapshot;
        }
        return null;
    }

    compareSnapshots(label1, label2) {
        const snapshot1 = this.snapshots.find(s => s.label === label1);
        const snapshot2 = this.snapshots.find(s => s.label === label2);

        if (snapshot1 && snapshot2) {
            const diff = snapshot2.usedJSHeapSize - snapshot1.usedJSHeapSize;
            console.log(`[Memory Diff] ${label1} -> ${label2}: ${(diff / 1024 / 1024).toFixed(2)} MB`);
            return diff;
        }
        return null;
    }

    clearSnapshots() {
        this.snapshots = [];
    }
}

export const memoryMonitor = new MemoryMonitor();
```

### Frame Rate Monitoring

Monitor UI performance by tracking frame rates:

```javascript
import { PerformanceObserver } from 'react-native-performance';

// FPS monitoring utility
class FPSMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.isMonitoring = false;
    }

    start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.frameCount = 0;
        this.lastTime = performance.now();

        this.monitor();
    }

    stop() {
        this.isMonitoring = false;
    }

    monitor() {
        if (!this.isMonitoring) return;

        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            console.log(`[FPS] Current: ${this.fps}`);

            if (this.fps < 30) {
                console.warn('[FPS Warning] Frame rate dropped below 30 FPS');
            }

            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        requestAnimationFrame(() => this.monitor());
    }

    getCurrentFPS() {
        return this.fps;
    }
}

export const fpsMonitor = new FPSMonitor();
```

## Layout Inspector

The Layout Inspector plugin allows you to visualize and debug your app's UI hierarchy.

### Using the Layout Inspector

1. Open Flipper and connect your app
2. Select the "Layout" plugin from the sidebar
3. Click on elements in your app to inspect them

### Features

- **Element selection**: Click on any UI element to see its properties
- **Hierarchy view**: Navigate the complete view hierarchy
- **Property inspection**: View layout properties, dimensions, and styling
- **Real-time updates**: See changes as they happen

### Debugging Layout Issues

```javascript
// Example: Debugging layout with inline styles
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const ResponsiveLayout = ({ children }) => {
    const isLandscape = width > height;

    return (
        <View
            style={[
                styles.container,
                isLandscape && styles.landscapeContainer
            ]}
            // Add testID for easier identification in Flipper
            testID="responsive-layout-container"
        >
            <View
                style={[
                    styles.sidebar,
                    isLandscape && styles.landscapeSidebar
                ]}
                testID="sidebar"
            >
                <Text style={styles.sidebarText}>Sidebar</Text>
            </View>

            <View
                style={[
                    styles.content,
                    isLandscape && styles.landscapeContent
                ]}
                testID="main-content"
            >
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
    },
    landscapeContainer: {
        flexDirection: 'row',
    },
    sidebar: {
        height: 60,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    landscapeSidebar: {
        width: 200,
        height: '100%',
    },
    sidebarText: {
        color: '#fff',
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    landscapeContent: {
        flex: 1,
    },
});

export default ResponsiveLayout;
```

## Database Inspection

Flipper's Database plugin allows you to inspect and modify local SQLite databases used by your React Native app.

### Setting Up Database Inspection

For apps using SQLite or Realm, the Database plugin provides:

- **Table browsing**: View all tables and their schemas
- **Data viewing**: Browse records in each table
- **Query execution**: Run custom SQL queries
- **Data modification**: Edit, add, or delete records

```javascript
// Example: SQLite database setup with debugging
import SQLite from 'react-native-sqlite-storage';

// Enable debugging in development
if (__DEV__) {
    SQLite.DEBUG(true);
    SQLite.enablePromise(true);
}

class DatabaseService {
    constructor() {
        this.db = null;
    }

    async initialize() {
        try {
            this.db = await SQLite.openDatabase({
                name: 'AppDatabase.db',
                location: 'default',
            });

            await this.createTables();
            console.log('[Database] Initialized successfully');

        } catch (error) {
            console.error('[Database] Initialization failed:', error);
            throw error;
        }
    }

    async createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createSettingsTable = `
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await this.db.executeSql(createUsersTable);
        await this.db.executeSql(createSettingsTable);
    }

    async insertUser(name, email) {
        const query = 'INSERT INTO users (name, email) VALUES (?, ?)';
        const result = await this.db.executeSql(query, [name, email]);

        if (__DEV__) {
            console.log('[Database] User inserted:', { name, email, id: result[0].insertId });
        }

        return result[0].insertId;
    }

    async getUsers() {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        const [result] = await this.db.executeSql(query);

        const users = [];
        for (let i = 0; i < result.rows.length; i++) {
            users.push(result.rows.item(i));
        }

        return users;
    }

    async executeRawQuery(query, params = []) {
        if (__DEV__) {
            console.log('[Database] Executing query:', query, params);
        }

        const [result] = await this.db.executeSql(query, params);
        return result;
    }
}

export const databaseService = new DatabaseService();
```

## Shared Preferences Viewer

The Shared Preferences plugin allows you to inspect and modify key-value storage used by your app.

### Viewing Shared Preferences

For React Native apps using AsyncStorage or similar storage solutions:

```javascript
// Example: AsyncStorage wrapper with debugging
import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
    constructor(namespace = 'app') {
        this.namespace = namespace;
    }

    getKey(key) {
        return `${this.namespace}:${key}`;
    }

    async setItem(key, value) {
        const fullKey = this.getKey(key);
        const serializedValue = JSON.stringify(value);

        try {
            await AsyncStorage.setItem(fullKey, serializedValue);

            if (__DEV__) {
                console.log('[Storage] Set:', fullKey, value);
            }
        } catch (error) {
            console.error('[Storage] Error setting item:', error);
            throw error;
        }
    }

    async getItem(key, defaultValue = null) {
        const fullKey = this.getKey(key);

        try {
            const value = await AsyncStorage.getItem(fullKey);
            const parsedValue = value ? JSON.parse(value) : defaultValue;

            if (__DEV__) {
                console.log('[Storage] Get:', fullKey, parsedValue);
            }

            return parsedValue;
        } catch (error) {
            console.error('[Storage] Error getting item:', error);
            return defaultValue;
        }
    }

    async removeItem(key) {
        const fullKey = this.getKey(key);

        try {
            await AsyncStorage.removeItem(fullKey);

            if (__DEV__) {
                console.log('[Storage] Removed:', fullKey);
            }
        } catch (error) {
            console.error('[Storage] Error removing item:', error);
            throw error;
        }
    }

    async getAllKeys() {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const namespaceKeys = allKeys.filter(
                key => key.startsWith(`${this.namespace}:`)
            );

            if (__DEV__) {
                console.log('[Storage] All keys:', namespaceKeys);
            }

            return namespaceKeys;
        } catch (error) {
            console.error('[Storage] Error getting keys:', error);
            return [];
        }
    }

    async clear() {
        const keys = await this.getAllKeys();

        try {
            await AsyncStorage.multiRemove(keys);

            if (__DEV__) {
                console.log('[Storage] Cleared namespace:', this.namespace);
            }
        } catch (error) {
            console.error('[Storage] Error clearing storage:', error);
            throw error;
        }
    }

    async debugDump() {
        if (!__DEV__) return;

        const keys = await this.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);

        console.log('[Storage] Debug dump:');
        pairs.forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }
}

export const storageService = new StorageService();
```

## Crash Reporter Plugin

The Crash Reporter plugin helps you track and debug application crashes.

### Setting Up Crash Reporting

```javascript
// Example: Custom crash reporter integration
import { NativeModules, Platform } from 'react-native';

class CrashReporter {
    constructor() {
        this.breadcrumbs = [];
        this.maxBreadcrumbs = 50;
    }

    initialize() {
        // Set up global error handler
        ErrorUtils.setGlobalHandler((error, isFatal) => {
            this.reportCrash(error, isFatal);
        });

        // Handle unhandled promise rejections
        const originalHandler = global.onunhandledrejection;
        global.onunhandledrejection = (event) => {
            this.reportError('Unhandled Promise Rejection', event.reason);
            if (originalHandler) {
                originalHandler(event);
            }
        };

        console.log('[CrashReporter] Initialized');
    }

    addBreadcrumb(category, message, data = {}) {
        const breadcrumb = {
            timestamp: new Date().toISOString(),
            category,
            message,
            data,
        };

        this.breadcrumbs.push(breadcrumb);

        // Keep only the last N breadcrumbs
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }

        if (__DEV__) {
            console.log('[Breadcrumb]', category, message);
        }
    }

    reportCrash(error, isFatal) {
        const crashReport = {
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
            version: Platform.Version,
            isFatal,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            breadcrumbs: [...this.breadcrumbs],
        };

        console.error('[CrashReporter] Crash detected:', crashReport);

        // In production, send to your crash reporting service
        if (!__DEV__) {
            this.sendCrashReport(crashReport);
        }
    }

    reportError(name, error, additionalData = {}) {
        const errorReport = {
            timestamp: new Date().toISOString(),
            name,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
            } : error,
            additionalData,
            breadcrumbs: [...this.breadcrumbs],
        };

        console.error('[CrashReporter] Error reported:', errorReport);
    }

    async sendCrashReport(report) {
        // Implement your crash reporting service integration
        try {
            await fetch('https://your-crash-service.com/api/crashes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(report),
            });
        } catch (error) {
            console.error('[CrashReporter] Failed to send report:', error);
        }
    }
}

export const crashReporter = new CrashReporter();
```

## Custom Flipper Plugins

Flipper's plugin architecture allows you to create custom plugins tailored to your app's needs.

### Creating a Custom Plugin

#### Desktop Plugin (JavaScript)

```javascript
// flipper-plugin-my-custom/src/index.tsx
import React, { useState, useEffect } from 'react';
import {
    PluginClient,
    createState,
    usePlugin,
    useValue,
    Layout,
    DataTable,
    DetailSidebar,
} from 'flipper-plugin';

type Events = {
    customEvent: CustomEventData;
};

type Methods = {
    getAppState(): Promise<AppState>;
};

interface CustomEventData {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
}

interface AppState {
    version: string;
    environment: string;
    features: string[];
}

export function plugin(client: PluginClient<Events, Methods>) {
    const events = createState<CustomEventData[]>([], { persist: 'events' });
    const selectedEvent = createState<CustomEventData | null>(null);

    client.onMessage('customEvent', (event) => {
        events.update((draft) => {
            draft.unshift(event);
            // Keep only last 100 events
            if (draft.length > 100) {
                draft.pop();
            }
        });
    });

    const clearEvents = () => {
        events.set([]);
    };

    const fetchAppState = async () => {
        return await client.send('getAppState');
    };

    return {
        events,
        selectedEvent,
        clearEvents,
        fetchAppState,
    };
}

export function Component() {
    const instance = usePlugin(plugin);
    const events = useValue(instance.events);
    const selectedEvent = useValue(instance.selectedEvent);

    const columns = [
        { key: 'timestamp', title: 'Time' },
        { key: 'type', title: 'Type' },
        { key: 'id', title: 'ID' },
    ];

    return (
        <Layout.Container grow>
            <DataTable
                columns={columns}
                records={events}
                onSelect={(record) => instance.selectedEvent.set(record)}
            />
            <DetailSidebar>
                {selectedEvent && (
                    <Layout.Container pad>
                        <h3>Event Details</h3>
                        <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
                    </Layout.Container>
                )}
            </DetailSidebar>
        </Layout.Container>
    );
}
```

#### React Native Client Plugin

```javascript
// src/flipper/CustomFlipperPlugin.js
import { addPlugin } from 'react-native-flipper';

class CustomFlipperPlugin {
    constructor() {
        this.connection = null;
        this.pendingEvents = [];
    }

    initialize() {
        addPlugin({
            getId: () => 'my-custom-plugin',
            onConnect: (connection) => {
                this.connection = connection;

                // Send any pending events
                this.pendingEvents.forEach(event => {
                    this.sendEvent(event);
                });
                this.pendingEvents = [];

                // Handle method calls from Flipper
                connection.receive('getAppState', (data, responder) => {
                    responder.success({
                        version: '1.0.0',
                        environment: __DEV__ ? 'development' : 'production',
                        features: ['feature1', 'feature2'],
                    });
                });

                console.log('[CustomFlipperPlugin] Connected');
            },
            onDisconnect: () => {
                this.connection = null;
                console.log('[CustomFlipperPlugin] Disconnected');
            },
            runInBackground: () => false,
        });
    }

    sendEvent(event) {
        const eventData = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...event,
        };

        if (this.connection) {
            this.connection.send('customEvent', eventData);
        } else {
            // Queue events if not connected
            this.pendingEvents.push(eventData);
        }
    }

    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }

    // Convenience methods for common event types
    logNavigation(screenName, params = {}) {
        this.sendEvent({
            type: 'navigation',
            data: { screenName, params },
        });
    }

    logUserAction(action, details = {}) {
        this.sendEvent({
            type: 'userAction',
            data: { action, details },
        });
    }

    logApiCall(endpoint, method, duration, status) {
        this.sendEvent({
            type: 'apiCall',
            data: { endpoint, method, duration, status },
        });
    }
}

export const customFlipperPlugin = new CustomFlipperPlugin();
```

## Profiling CPU and Memory

### Advanced CPU Profiling

```javascript
// src/utils/profiling.js
import { InteractionManager } from 'react-native';

class CPUProfiler {
    constructor() {
        this.profiles = new Map();
        this.isEnabled = __DEV__;
    }

    startProfile(name) {
        if (!this.isEnabled) return;

        this.profiles.set(name, {
            startTime: performance.now(),
            marks: [],
        });
    }

    addMark(profileName, markName) {
        if (!this.isEnabled) return;

        const profile = this.profiles.get(profileName);
        if (profile) {
            profile.marks.push({
                name: markName,
                time: performance.now() - profile.startTime,
            });
        }
    }

    endProfile(name) {
        if (!this.isEnabled) return null;

        const profile = this.profiles.get(name);
        if (!profile) return null;

        const endTime = performance.now();
        const duration = endTime - profile.startTime;

        const result = {
            name,
            duration,
            marks: profile.marks,
        };

        this.profiles.delete(name);

        console.log(`[CPU Profile] ${name}:`, {
            totalDuration: `${duration.toFixed(2)}ms`,
            marks: profile.marks.map(m => `${m.name}: ${m.time.toFixed(2)}ms`),
        });

        return result;
    }

    async profileAsync(name, asyncFn) {
        if (!this.isEnabled) return asyncFn();

        this.startProfile(name);

        try {
            const result = await asyncFn();
            this.endProfile(name);
            return result;
        } catch (error) {
            this.endProfile(name);
            throw error;
        }
    }

    profileInteraction(name, interactionFn) {
        if (!this.isEnabled) return interactionFn();

        this.startProfile(name);

        return InteractionManager.runAfterInteractions(() => {
            const result = interactionFn();
            this.endProfile(name);
            return result;
        });
    }
}

export const cpuProfiler = new CPUProfiler();
```

### Memory Leak Detection

```javascript
// src/utils/memoryLeakDetector.js
class MemoryLeakDetector {
    constructor() {
        this.componentRegistry = new WeakMap();
        this.mountedComponents = new Set();
    }

    registerComponent(instance, componentName) {
        if (!__DEV__) return;

        const id = this.generateId();
        this.componentRegistry.set(instance, {
            id,
            name: componentName,
            mountTime: Date.now(),
        });
        this.mountedComponents.add(id);

        console.log(`[MemoryLeakDetector] Component mounted: ${componentName} (${id})`);
    }

    unregisterComponent(instance) {
        if (!__DEV__) return;

        const info = this.componentRegistry.get(instance);
        if (info) {
            this.mountedComponents.delete(info.id);
            const lifetime = Date.now() - info.mountTime;
            console.log(`[MemoryLeakDetector] Component unmounted: ${info.name} (lifetime: ${lifetime}ms)`);
        }
    }

    checkForLeaks() {
        if (!__DEV__) return;

        console.log(`[MemoryLeakDetector] Currently mounted components: ${this.mountedComponents.size}`);
    }

    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
}

export const memoryLeakDetector = new MemoryLeakDetector();

// HOC for automatic tracking
export const withMemoryTracking = (WrappedComponent, componentName) => {
    return class extends React.Component {
        componentDidMount() {
            memoryLeakDetector.registerComponent(this, componentName || WrappedComponent.name);
        }

        componentWillUnmount() {
            memoryLeakDetector.unregisterComponent(this);
        }

        render() {
            return <WrappedComponent {...this.props} />;
        }
    };
};
```

## Best Practices for Mobile Debugging

### 1. Structured Logging

```javascript
// src/utils/logger.js
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

class Logger {
    constructor(options = {}) {
        this.minLevel = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
        this.prefix = options.prefix || 'App';
    }

    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        return {
            timestamp,
            level,
            prefix: this.prefix,
            message,
            data,
        };
    }

    debug(message, data) {
        if (this.minLevel <= LOG_LEVELS.DEBUG) {
            console.debug(`[${this.prefix}] DEBUG:`, message, data || '');
        }
    }

    info(message, data) {
        if (this.minLevel <= LOG_LEVELS.INFO) {
            console.info(`[${this.prefix}] INFO:`, message, data || '');
        }
    }

    warn(message, data) {
        if (this.minLevel <= LOG_LEVELS.WARN) {
            console.warn(`[${this.prefix}] WARN:`, message, data || '');
        }
    }

    error(message, error) {
        if (this.minLevel <= LOG_LEVELS.ERROR) {
            console.error(`[${this.prefix}] ERROR:`, message, error);
        }
    }

    group(label) {
        if (__DEV__) {
            console.group(`[${this.prefix}] ${label}`);
        }
    }

    groupEnd() {
        if (__DEV__) {
            console.groupEnd();
        }
    }
}

export const logger = new Logger();
```

### 2. Performance Budgets

```javascript
// src/utils/performanceBudget.js
const PERFORMANCE_BUDGETS = {
    screenLoad: 300,      // ms
    apiCall: 1000,        // ms
    listRender: 16,       // ms (60fps target)
    imageLoad: 500,       // ms
    animationFrame: 16,   // ms
};

class PerformanceBudgetMonitor {
    constructor() {
        this.violations = [];
    }

    check(category, duration, context = {}) {
        const budget = PERFORMANCE_BUDGETS[category];

        if (budget && duration > budget) {
            const violation = {
                category,
                budget,
                actual: duration,
                exceededBy: duration - budget,
                context,
                timestamp: Date.now(),
            };

            this.violations.push(violation);

            console.warn(
                `[Performance Budget Violation] ${category}:`,
                `Expected <${budget}ms, got ${duration.toFixed(2)}ms`,
                context
            );

            return false;
        }

        return true;
    }

    getViolations() {
        return [...this.violations];
    }

    clearViolations() {
        this.violations = [];
    }

    getReport() {
        const violationsByCategory = {};

        this.violations.forEach(v => {
            if (!violationsByCategory[v.category]) {
                violationsByCategory[v.category] = [];
            }
            violationsByCategory[v.category].push(v);
        });

        return {
            totalViolations: this.violations.length,
            byCategory: Object.entries(violationsByCategory).map(([category, violations]) => ({
                category,
                count: violations.length,
                averageExceededBy: violations.reduce((sum, v) => sum + v.exceededBy, 0) / violations.length,
            })),
        };
    }
}

export const performanceBudgetMonitor = new PerformanceBudgetMonitor();
```

### 3. Debug Mode Configuration

```javascript
// src/config/debug.js
export const DEBUG_CONFIG = {
    // Enable/disable specific debugging features
    networkLogging: __DEV__,
    performanceMonitoring: __DEV__,
    memoryTracking: __DEV__,
    componentTracking: __DEV__,
    stateLogging: __DEV__,

    // Flipper-specific settings
    flipper: {
        enabled: __DEV__,
        networkPlugin: true,
        layoutPlugin: true,
        databasePlugin: true,
        sharedPrefsPlugin: true,
        crashReporterPlugin: true,
    },

    // Performance thresholds
    thresholds: {
        slowRenderMs: 16,
        slowNetworkMs: 3000,
        highMemoryMB: 150,
    },
};

export const isDebugFeatureEnabled = (feature) => {
    return DEBUG_CONFIG[feature] === true;
};
```

### 4. Combining All Tools

```javascript
// src/debug/index.js
import { DEBUG_CONFIG } from '../config/debug';
import { logger } from '../utils/logger';
import { cpuProfiler } from '../utils/profiling';
import { memoryLeakDetector } from '../utils/memoryLeakDetector';
import { performanceBudgetMonitor } from '../utils/performanceBudget';
import { crashReporter } from '../utils/crashReporter';
import { customFlipperPlugin } from '../flipper/CustomFlipperPlugin';

class DebugManager {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized || !__DEV__) return;

        logger.info('Initializing debug tools...');

        // Initialize crash reporter
        crashReporter.initialize();

        // Initialize custom Flipper plugin
        if (DEBUG_CONFIG.flipper.enabled) {
            customFlipperPlugin.initialize();
        }

        this.initialized = true;
        logger.info('Debug tools initialized');
    }

    getStatus() {
        return {
            initialized: this.initialized,
            config: DEBUG_CONFIG,
            performanceReport: performanceBudgetMonitor.getReport(),
        };
    }
}

export const debugManager = new DebugManager();

// Initialize on app start
if (__DEV__) {
    debugManager.initialize();
}
```

## Conclusion

Flipper is an invaluable tool for React Native developers, providing comprehensive debugging and profiling capabilities that help identify and resolve performance issues efficiently. By leveraging its built-in plugins and creating custom ones tailored to your needs, you can gain deep insights into your application's behavior.

### Key Takeaways

1. **Set up Flipper early** in your development process to catch issues before they become problems
2. **Use the Network Inspector** to monitor API calls and optimize network performance
3. **Leverage React DevTools** integration for component-level debugging
4. **Monitor performance** continuously with the Performance plugin
5. **Create custom plugins** for app-specific debugging needs
6. **Implement structured logging** for consistent debug output
7. **Set performance budgets** to maintain app quality

By following the practices outlined in this guide, you'll be well-equipped to build high-performance React Native applications that provide excellent user experiences on both iOS and Android platforms.

## Additional Resources

- [Flipper Official Documentation](https://fbflipper.com/)
- [React Native Debugging Guide](https://reactnative.dev/docs/debugging)
- [React DevTools Documentation](https://react.dev/learn/react-developer-tools)
- [Performance Profiling in React Native](https://reactnative.dev/docs/performance)

---

Happy debugging!
