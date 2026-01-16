# How to Set Up Flutter Development Environment on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Flutter, Dart, Mobile Development, Cross-Platform, Tutorial

Description: Complete guide to setting up Flutter for cross-platform development on Ubuntu.

---

Flutter is Google's open-source UI toolkit for building beautiful, natively compiled applications for mobile, web, desktop, and embedded devices from a single codebase. This comprehensive guide walks you through setting up a complete Flutter development environment on Ubuntu, from initial installation to advanced debugging techniques.

## Prerequisites

Before starting, ensure your Ubuntu system meets these requirements:

- Ubuntu 20.04 LTS or later (64-bit)
- At least 8 GB of RAM (16 GB recommended)
- 10 GB of free disk space (more for Android SDK)
- Git installed on your system

```bash
# Update your system packages
sudo apt update && sudo apt upgrade -y

# Install essential dependencies
sudo apt install -y curl git unzip xz-utils zip libglu1-mesa

# Install additional dependencies for Linux desktop development
sudo apt install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev libstdc++-12-dev
```

## Installing Flutter SDK

### Method 1: Manual Installation (Recommended)

The manual installation gives you full control over Flutter versions and locations.

```bash
# Create a directory for Flutter
mkdir -p ~/development

# Navigate to the development directory
cd ~/development

# Download the latest stable Flutter SDK
# Visit https://docs.flutter.dev/release/archive for the latest version
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.0-stable.tar.xz

# Extract the Flutter archive
tar xf flutter_linux_3.24.0-stable.tar.xz

# Remove the archive to save space
rm flutter_linux_3.24.0-stable.tar.xz
```

### Method 2: Using Snap (Quick Installation)

For a quicker setup, you can use Ubuntu's Snap package manager:

```bash
# Install Flutter via Snap
sudo snap install flutter --classic

# Initialize Flutter
flutter sdk-path
```

## Setting Up PATH Environment Variables

To run Flutter commands from any terminal location, you need to add Flutter to your system PATH.

```bash
# Open your shell configuration file
# For bash users:
nano ~/.bashrc

# For zsh users:
nano ~/.zshrc
```

Add the following lines at the end of the file:

```bash
# Flutter SDK path
export FLUTTER_HOME="$HOME/development/flutter"
export PATH="$FLUTTER_HOME/bin:$PATH"

# Android SDK path (we'll set this up later)
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/emulator:$PATH"

# Enable Flutter CLI completion (optional but helpful)
# This provides tab completion for Flutter commands
```

Apply the changes:

```bash
# Reload your shell configuration
source ~/.bashrc  # or source ~/.zshrc for zsh users

# Verify Flutter is in PATH
which flutter
# Expected output: /home/username/development/flutter/bin/flutter

# Check Flutter version
flutter --version
```

## Running Flutter Doctor Diagnostics

Flutter includes a diagnostic tool that checks your environment and reports any issues.

```bash
# Run the Flutter doctor command
flutter doctor

# For verbose output with detailed information
flutter doctor -v
```

Example output:

```
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.24.0, on Ubuntu 22.04.3 LTS 6.2.0-39-generic, locale en_US.UTF-8)
[✗] Android toolchain - develop for Android devices
    ✗ Unable to locate Android SDK.
[✗] Chrome - develop for the web (Cannot find Chrome executable at google-chrome)
[✗] Linux toolchain - develop for Linux desktop
[!] Android Studio (not installed)
[✓] VS Code (version 1.85.0)
[!] Connected device
    ! No devices available
[!] Network resources
    ✓ Network connection ok

! Doctor found issues in 4 categories.
```

Let's fix these issues one by one.

## Setting Up Android Development

### Installing Android Studio

Android Studio provides the Android SDK, emulator, and essential tools for Android development.

```bash
# Method 1: Install via Snap (Recommended)
sudo snap install android-studio --classic

# Method 2: Install via official repository
# Add the Android Studio PPA
sudo add-apt-repository ppa:maarten-fonville/android-studio
sudo apt update
sudo apt install android-studio
```

### First-Time Android Studio Setup

1. Launch Android Studio:
```bash
android-studio
```

2. Follow the setup wizard:
   - Select "Standard" installation type
   - Choose your UI theme
   - Accept all license agreements

3. The wizard will download:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Emulator
   - SDK Build-Tools

### Accept Android Licenses

```bash
# Accept all Android SDK licenses
flutter doctor --android-licenses

# Press 'y' to accept each license when prompted
```

### Setting Up Android Emulator

```bash
# List available system images
sdkmanager --list | grep system-images

# Install a system image for the emulator
sdkmanager "system-images;android-34;google_apis;x86_64"

# Create an Android Virtual Device (AVD)
avdmanager create avd -n pixel_7_api_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_7"

# List available emulators
flutter emulators

# Launch the emulator
flutter emulators --launch pixel_7_api_34

# Alternative: Launch emulator directly
emulator -avd pixel_7_api_34
```

### Enabling Hardware Acceleration (KVM)

For better emulator performance, enable KVM virtualization:

```bash
# Check if your CPU supports virtualization
egrep -c '(vmx|svm)' /proc/cpuinfo
# Output > 0 means virtualization is supported

# Install KVM and related packages
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils

# Add your user to the kvm group
sudo adduser $USER kvm

# Verify KVM installation
kvm-ok
# Expected output: INFO: /dev/kvm exists
#                  KVM acceleration can be used
```

Log out and log back in for the group changes to take effect.

## Setting Up VS Code for Flutter Development

VS Code is a lightweight, powerful editor that works excellently with Flutter.

### Installing VS Code

```bash
# Method 1: Install via Snap
sudo snap install code --classic

# Method 2: Install via official Microsoft repository
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

### Installing Essential Extensions

```bash
# Install Flutter extension (includes Dart extension)
code --install-extension Dart-Code.flutter

# Install additional helpful extensions
code --install-extension Dart-Code.dart-code
code --install-extension usernamehw.errorlens
code --install-extension pflannery.vscode-versionlens
code --install-extension streetsidesoftware.code-spell-checker
```

### VS Code Settings for Flutter

Create or update your VS Code settings for optimal Flutter development:

```json
// File: ~/.config/Code/User/settings.json
{
    // Dart and Flutter settings
    "dart.flutterSdkPath": "/home/username/development/flutter",
    "dart.previewFlutterUiGuides": true,
    "dart.previewFlutterUiGuidesCustomTracking": true,
    "dart.debugExternalPackageLibraries": false,
    "dart.debugSdkLibraries": false,

    // Editor settings for Flutter
    "editor.formatOnSave": true,
    "editor.formatOnType": true,
    "editor.selectionHighlight": false,
    "editor.suggest.snippetsPreventQuickSuggestions": false,
    "editor.suggestSelection": "first",
    "editor.tabCompletion": "onlySnippets",
    "editor.wordBasedSuggestions": "off",

    // File associations
    "[dart]": {
        "editor.formatOnSave": true,
        "editor.formatOnType": true,
        "editor.rulers": [80],
        "editor.selectionHighlight": false,
        "editor.suggest.snippetsPreventQuickSuggestions": false,
        "editor.suggestSelection": "first",
        "editor.tabCompletion": "onlySnippets",
        "editor.wordBasedSuggestions": "off"
    },

    // Exclude generated files from search
    "search.exclude": {
        "**/*.g.dart": true,
        "**/*.freezed.dart": true,
        "**/generated_plugin_registrant.dart": true
    }
}
```

## Creating Your First Flutter Project

Now let's create and run your first Flutter application.

```bash
# Create a new Flutter project
flutter create my_first_app

# Navigate to the project directory
cd my_first_app

# Examine the project structure
tree -L 2
```

Project structure explanation:

```
my_first_app/
├── android/          # Android-specific configuration and code
├── ios/              # iOS-specific configuration and code (requires macOS)
├── lib/              # Main Dart source code
│   └── main.dart     # Application entry point
├── linux/            # Linux desktop-specific code
├── macos/            # macOS desktop-specific code
├── web/              # Web-specific code
├── windows/          # Windows desktop-specific code
├── test/             # Unit and widget tests
├── pubspec.yaml      # Project dependencies and metadata
├── pubspec.lock      # Locked dependency versions
├── analysis_options.yaml  # Dart analyzer configuration
└── README.md         # Project documentation
```

### Understanding the Main Entry Point

Let's examine and modify the default `lib/main.dart`:

```dart
// lib/main.dart
// This is the entry point of your Flutter application

import 'package:flutter/material.dart';

// The main function is the entry point of the application
// runApp() inflates the given widget and attaches it to the screen
void main() {
  runApp(const MyApp());
}

// MyApp is the root widget of your application
// It's typically a StatelessWidget that sets up MaterialApp
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // MaterialApp is the top-level widget that provides
    // Material Design visual styling and navigation
    return MaterialApp(
      // Application title shown in task switchers
      title: 'My First Flutter App',

      // Define the app-wide theme
      theme: ThemeData(
        // Use Material 3 design system
        useMaterial3: true,
        // Set the primary color scheme
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),

      // Hide the debug banner in the top-right corner
      debugShowCheckedModeBanner: false,

      // Set the home page widget
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

// MyHomePage is a StatefulWidget because it needs to maintain state
// (the counter value that changes when the button is pressed)
class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // Properties passed to the widget
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

// The State class contains the mutable state for MyHomePage
class _MyHomePageState extends State<MyHomePage> {
  // Private state variable to track button presses
  int _counter = 0;

  // Method to increment the counter
  // setState() tells Flutter to rebuild the widget with new state
  void _incrementCounter() {
    setState(() {
      // This call to setState tells the Flutter framework that something has
      // changed in this State, which causes it to rerun the build method below
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Scaffold provides the basic Material Design visual layout structure
    return Scaffold(
      // AppBar is the toolbar at the top of the screen
      appBar: AppBar(
        // Use the theme's primary color for the app bar background
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),

      // Body contains the main content of the screen
      body: Center(
        // Column arranges children vertically
        child: Column(
          // Center children vertically within the column
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'You have pushed the button this many times:',
            ),
            // Display the counter value with large styling
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),

      // Floating action button in the bottom-right corner
      floatingActionButton: FloatingActionButton(
        // Call _incrementCounter when the button is pressed
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

## Running Your Flutter Application

### Running on Android Emulator

```bash
# List connected devices and emulators
flutter devices

# Run the app on the default device
flutter run

# Run on a specific device (use device ID from flutter devices)
flutter run -d emulator-5554

# Run in release mode for better performance
flutter run --release

# Run in profile mode for performance profiling
flutter run --profile
```

### Running on Physical Android Device

1. Enable Developer Options on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" seven times
   - Developer Options will appear in Settings

2. Enable USB Debugging:
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

3. Connect your device via USB:

```bash
# Verify the device is connected
flutter devices
# You should see your device listed

# Run the app on your physical device
flutter run -d <device-id>
```

### Running on Linux Desktop

```bash
# Verify Linux desktop support is enabled
flutter config --enable-linux-desktop

# Run on Linux desktop
flutter run -d linux
```

### Running on Web Browser

```bash
# Verify web support is enabled
flutter config --enable-web

# Install Chrome if not already installed
sudo apt install google-chrome-stable

# Run on Chrome
flutter run -d chrome

# Run on Chrome with specific port
flutter run -d chrome --web-port=8080

# Run in headless mode (useful for CI/CD)
flutter run -d web-server --web-port=8080
```

## Hot Reload Development

Hot reload is one of Flutter's most powerful features, allowing you to see changes instantly without restarting your app.

### Using Hot Reload

```bash
# When the app is running with 'flutter run':
# Press 'r' in the terminal for hot reload
# Press 'R' for hot restart (restarts the app state)
# Press 'q' to quit

# Hot reload preserves the app state
# Hot restart resets the app state to initial values
```

### Hot Reload vs Hot Restart

| Feature | Hot Reload | Hot Restart |
|---------|------------|-------------|
| Keyboard shortcut | `r` | `R` |
| Preserves state | Yes | No |
| Speed | Sub-second | A few seconds |
| Use case | UI changes, minor code changes | State-related changes, main() changes |

### VS Code Hot Reload

In VS Code, hot reload happens automatically when you save a file (Ctrl+S). You can also:
- Use the debug toolbar's reload button
- Use keyboard shortcut: Ctrl+Shift+F5 (hot restart)

### Code Example: Hot Reload in Action

Try modifying this widget and save to see hot reload:

```dart
// lib/widgets/greeting_card.dart
import 'package:flutter/material.dart';

class GreetingCard extends StatelessWidget {
  final String name;

  const GreetingCard({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    return Card(
      // Try changing the elevation and save - see instant update!
      elevation: 4,
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Try changing the icon and color
            Icon(
              Icons.waving_hand,
              size: 48,
              color: Colors.amber,
            ),
            const SizedBox(height: 16),
            // Try changing the text
            Text(
              'Hello, $name!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Welcome to Flutter development',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
```

## Building for Different Platforms

### Building for Android

```bash
# Build APK (debug)
flutter build apk --debug

# Build APK (release) - for distribution
flutter build apk --release

# Build APK split by ABI (smaller file sizes)
flutter build apk --split-per-abi

# Build App Bundle (recommended for Play Store)
flutter build appbundle --release

# The output files are located at:
# APK: build/app/outputs/flutter-apk/app-release.apk
# App Bundle: build/app/outputs/bundle/release/app-release.aab
```

### Building for iOS (Requires macOS)

```bash
# Note: iOS builds require macOS with Xcode installed
# These commands won't work on Ubuntu directly

# Build iOS app
flutter build ios --release

# Build IPA for distribution
flutter build ipa --release
```

### Building for Web

```bash
# Build for web (production)
flutter build web --release

# Build with specific renderer
flutter build web --web-renderer html      # Better compatibility
flutter build web --web-renderer canvaskit # Better performance

# Build with custom base href (for subdirectory deployment)
flutter build web --base-href /my-app/

# The output is in build/web/
# Deploy this directory to any static web host
```

### Building for Linux Desktop

```bash
# Build for Linux (debug)
flutter build linux --debug

# Build for Linux (release)
flutter build linux --release

# The output is in build/linux/x64/release/bundle/
# This directory contains the executable and required libraries

# Create a distributable package
cd build/linux/x64/release/bundle
tar -czvf my_first_app-linux-x64.tar.gz *
```

### Build Configuration Example

```yaml
# pubspec.yaml - Configure your app metadata
name: my_first_app
description: A demonstration Flutter application.
version: 1.0.0+1  # version: major.minor.patch+buildNumber

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Common packages for production apps
  http: ^1.1.0
  provider: ^6.1.1
  shared_preferences: ^2.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true

  # Add custom assets
  assets:
    - assets/images/
    - assets/icons/

  # Add custom fonts
  fonts:
    - family: CustomFont
      fonts:
        - asset: fonts/CustomFont-Regular.ttf
        - asset: fonts/CustomFont-Bold.ttf
          weight: 700
```

## Debugging and Flutter DevTools

### Using Flutter DevTools

Flutter DevTools is a suite of debugging and performance tools.

```bash
# Launch DevTools from command line
flutter pub global activate devtools
flutter pub global run devtools

# Or open DevTools while app is running
# Press 'd' in the terminal when app is running with 'flutter run'

# Open DevTools in browser
dart devtools
```

### DevTools Features

1. **Flutter Inspector**: Explore widget tree and properties
2. **Timeline View**: Analyze frame rendering performance
3. **Memory View**: Monitor memory usage and detect leaks
4. **Network View**: Monitor HTTP requests
5. **Logging View**: View print statements and logs
6. **App Size Tool**: Analyze app bundle size

### Debugging in VS Code

```json
// .vscode/launch.json - Debug configurations
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter: Debug",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "args": ["--debug"]
    },
    {
      "name": "Flutter: Profile",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "flutterMode": "profile"
    },
    {
      "name": "Flutter: Release",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "flutterMode": "release"
    }
  ]
}
```

### Debugging Code Examples

```dart
// lib/utils/debug_helper.dart
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

class DebugHelper {
  // Use debugPrint for logging (automatically truncates long messages)
  static void log(String message) {
    debugPrint('[${DateTime.now()}] $message');
  }

  // Use developer.log for more detailed logging
  static void logDetailed(String message, {String name = 'APP'}) {
    developer.log(
      message,
      name: name,
      time: DateTime.now(),
    );
  }

  // Conditional logging only in debug mode
  static void debugOnly(String message) {
    if (kDebugMode) {
      print('[DEBUG] $message');
    }
  }

  // Assert for debug-only checks
  static void assertCondition(bool condition, String message) {
    assert(condition, message);
  }

  // Timeline event for performance measurement
  static void startTimelineEvent(String name) {
    developer.Timeline.startSync(name);
  }

  static void endTimelineEvent() {
    developer.Timeline.finishSync();
  }
}

// Usage example in your app:
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    DebugHelper.startTimelineEvent('MyWidget build');

    // Widget building logic...
    final widget = Container(
      child: Text('Hello'),
    );

    DebugHelper.endTimelineEvent();
    DebugHelper.log('MyWidget built successfully');

    return widget;
  }
}
```

### Using Breakpoints and Debug Assertions

```dart
// lib/main.dart
import 'package:flutter/material.dart';

void main() {
  // Enable debug paint for visual debugging
  // debugPaintSizeEnabled = true;
  // debugPaintBaselinesEnabled = true;
  // debugPaintPointersEnabled = true;

  // Add error handling for debug mode
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    // Log to your error tracking service in production
  };

  runApp(const MyApp());
}

class DataService {
  // Use assertions to catch bugs early in development
  Future<List<String>> fetchData(int limit) async {
    // This assertion only runs in debug mode
    assert(limit > 0, 'Limit must be positive');
    assert(limit <= 100, 'Limit cannot exceed 100');

    // Fetch data logic...
    return ['item1', 'item2', 'item3'];
  }
}
```

## Managing Flutter Versions with FVM

FVM (Flutter Version Management) allows you to manage multiple Flutter versions per project.

### Installing FVM

```bash
# Install FVM using dart pub
dart pub global activate fvm

# Add FVM to your PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/.pub-cache/bin"

# Verify installation
fvm --version
```

### Using FVM

```bash
# List available Flutter releases
fvm releases

# Install a specific Flutter version
fvm install 3.24.0
fvm install 3.19.0
fvm install stable
fvm install beta

# List installed versions
fvm list

# Set Flutter version for current project
cd my_first_app
fvm use 3.24.0

# This creates .fvm directory with version configuration
# Add .fvm/flutter_sdk to .gitignore

# Set global Flutter version
fvm global 3.24.0

# Remove a Flutter version
fvm remove 3.19.0
```

### FVM Configuration

```json
// .fvm/fvm_config.json (auto-generated)
{
  "flutterSdkVersion": "3.24.0",
  "flavors": {}
}
```

```gitignore
# .gitignore - Add FVM entries
.fvm/flutter_sdk
```

### VS Code FVM Integration

```json
// .vscode/settings.json
{
  // Use FVM's Flutter SDK
  "dart.flutterSdkPath": ".fvm/flutter_sdk",

  // Search exclusions for FVM
  "search.exclude": {
    "**/.fvm": true
  },
  "files.watcherExclude": {
    "**/.fvm": true
  }
}
```

### Using FVM in CI/CD

```yaml
# .github/workflows/flutter.yml
name: Flutter CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install FVM
        run: dart pub global activate fvm

      - name: Install Flutter
        run: fvm install

      - name: Get dependencies
        run: fvm flutter pub get

      - name: Run tests
        run: fvm flutter test

      - name: Build APK
        run: fvm flutter build apk --release
```

## Useful Flutter Commands Reference

### Project Management

```bash
# Create new project with specific options
flutter create --org com.mycompany --project-name my_app --platforms android,ios,web my_app

# Create a package (library)
flutter create --template=package my_package

# Create a plugin
flutter create --template=plugin --platforms=android,ios my_plugin

# Get project dependencies
flutter pub get

# Upgrade dependencies to latest compatible versions
flutter pub upgrade

# Check for outdated packages
flutter pub outdated

# Add a package
flutter pub add provider
flutter pub add --dev flutter_lints

# Remove a package
flutter pub remove provider
```

### Code Generation and Analysis

```bash
# Analyze code for issues
flutter analyze

# Format code
dart format lib/

# Format entire project
dart format .

# Run code generators (build_runner)
flutter pub run build_runner build

# Run code generators and watch for changes
flutter pub run build_runner watch

# Delete generated files
flutter pub run build_runner clean
```

### Testing

```bash
# Run all tests
flutter test

# Run tests with coverage
flutter test --coverage

# Run specific test file
flutter test test/widget_test.dart

# Run tests matching a pattern
flutter test --name "should display"

# Generate coverage report
genhtml coverage/lcov.info -o coverage/html
```

### Cleaning and Maintenance

```bash
# Clean build artifacts
flutter clean

# Repair pub cache
flutter pub cache repair

# Clear pub cache
flutter pub cache clean

# Upgrade Flutter SDK
flutter upgrade

# Downgrade Flutter to previous version
flutter downgrade

# Switch Flutter channel
flutter channel stable
flutter channel beta
flutter channel master
```

### Device and Emulator Management

```bash
# List connected devices
flutter devices

# List available emulators
flutter emulators

# Create a new emulator
flutter emulators --create --name pixel_6

# Launch an emulator
flutter emulators --launch pixel_6

# Install app on all connected devices
flutter install

# Take a screenshot
flutter screenshot --out=screenshot.png

# Enable specific platform
flutter config --enable-linux-desktop
flutter config --enable-macos-desktop
flutter config --enable-windows-desktop
flutter config --enable-web
```

### Performance and Debugging

```bash
# Run with verbose logging
flutter run -v

# Run with specific flavor
flutter run --flavor production

# Run with dart-define for environment variables
flutter run --dart-define=API_URL=https://api.example.com

# Analyze app size
flutter build apk --analyze-size
flutter build appbundle --analyze-size

# Profile the app
flutter run --profile

# Enable Skia performance overlay
flutter run --enable-software-rendering
```

## Complete Example: Todo App

Here's a complete example of a simple Todo app demonstrating Flutter best practices:

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/todo.dart';
import 'providers/todo_provider.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // ChangeNotifierProvider makes TodoProvider available to all descendants
    return ChangeNotifierProvider(
      create: (context) => TodoProvider(),
      child: MaterialApp(
        title: 'Flutter Todo App',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        ),
        debugShowCheckedModeBanner: false,
        home: const HomeScreen(),
      ),
    );
  }
}
```

```dart
// lib/models/todo.dart
// Data model for a Todo item using immutable pattern

class Todo {
  final String id;
  final String title;
  final String description;
  final bool isCompleted;
  final DateTime createdAt;

  // Constructor with required and optional parameters
  Todo({
    required this.id,
    required this.title,
    this.description = '',
    this.isCompleted = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  // copyWith method for creating modified copies (immutability pattern)
  Todo copyWith({
    String? id,
    String? title,
    String? description,
    bool? isCompleted,
    DateTime? createdAt,
  }) {
    return Todo(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      isCompleted: isCompleted ?? this.isCompleted,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  // Factory constructor for creating Todo from JSON
  factory Todo.fromJson(Map<String, dynamic> json) {
    return Todo(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      isCompleted: json['isCompleted'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  // Convert Todo to JSON for persistence
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'isCompleted': isCompleted,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'Todo(id: $id, title: $title, isCompleted: $isCompleted)';
  }
}
```

```dart
// lib/providers/todo_provider.dart
// State management using ChangeNotifier pattern

import 'package:flutter/foundation.dart';
import '../models/todo.dart';

class TodoProvider extends ChangeNotifier {
  // Private list of todos
  final List<Todo> _todos = [];

  // Public getter returns unmodifiable list (prevents external mutation)
  List<Todo> get todos => List.unmodifiable(_todos);

  // Computed property for incomplete todos count
  int get incompleteCount => _todos.where((todo) => !todo.isCompleted).length;

  // Computed property for complete todos count
  int get completeCount => _todos.where((todo) => todo.isCompleted).length;

  // Add a new todo
  void addTodo(String title, {String description = ''}) {
    final todo = Todo(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      description: description,
    );
    _todos.add(todo);
    // Notify listeners to rebuild dependent widgets
    notifyListeners();
  }

  // Toggle todo completion status
  void toggleTodo(String id) {
    final index = _todos.indexWhere((todo) => todo.id == id);
    if (index != -1) {
      _todos[index] = _todos[index].copyWith(
        isCompleted: !_todos[index].isCompleted,
      );
      notifyListeners();
    }
  }

  // Update todo details
  void updateTodo(String id, {String? title, String? description}) {
    final index = _todos.indexWhere((todo) => todo.id == id);
    if (index != -1) {
      _todos[index] = _todos[index].copyWith(
        title: title,
        description: description,
      );
      notifyListeners();
    }
  }

  // Delete a todo
  void deleteTodo(String id) {
    _todos.removeWhere((todo) => todo.id == id);
    notifyListeners();
  }

  // Clear all completed todos
  void clearCompleted() {
    _todos.removeWhere((todo) => todo.isCompleted);
    notifyListeners();
  }
}
```

```dart
// lib/screens/home_screen.dart
// Main screen with todo list and add functionality

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/todo_provider.dart';
import '../widgets/todo_list_item.dart';
import '../widgets/add_todo_dialog.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Todos'),
        // Consumer rebuilds only when TodoProvider changes
        actions: [
          Consumer<TodoProvider>(
            builder: (context, provider, child) {
              if (provider.completeCount > 0) {
                return TextButton.icon(
                  onPressed: () => provider.clearCompleted(),
                  icon: const Icon(Icons.delete_sweep),
                  label: Text('Clear (${provider.completeCount})'),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: Consumer<TodoProvider>(
        builder: (context, provider, child) {
          final todos = provider.todos;

          if (todos.isEmpty) {
            // Empty state
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.task_outlined,
                    size: 64,
                    color: Theme.of(context).colorScheme.outline,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No todos yet!',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap + to add your first todo',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            );
          }

          // Todo list with animated item removal
          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: todos.length,
            itemBuilder: (context, index) {
              final todo = todos[index];
              return TodoListItem(
                key: ValueKey(todo.id),
                todo: todo,
                onToggle: () => provider.toggleTodo(todo.id),
                onDelete: () => provider.deleteTodo(todo.id),
              );
            },
          );
        },
      ),
      // Floating action button to add new todos
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddTodoDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Add Todo'),
      ),
    );
  }

  void _showAddTodoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const AddTodoDialog(),
    );
  }
}
```

```dart
// lib/widgets/todo_list_item.dart
// Reusable widget for displaying a single todo item

import 'package:flutter/material.dart';
import '../models/todo.dart';

class TodoListItem extends StatelessWidget {
  final Todo todo;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  const TodoListItem({
    super.key,
    required this.todo,
    required this.onToggle,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      // Dismissible enables swipe-to-delete functionality
      key: ValueKey(todo.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: ListTile(
        // Checkbox to toggle completion
        leading: Checkbox(
          value: todo.isCompleted,
          onChanged: (_) => onToggle(),
        ),
        // Title with strikethrough when completed
        title: Text(
          todo.title,
          style: TextStyle(
            decoration: todo.isCompleted
                ? TextDecoration.lineThrough
                : TextDecoration.none,
            color: todo.isCompleted
                ? Theme.of(context).colorScheme.outline
                : null,
          ),
        ),
        // Description if available
        subtitle: todo.description.isNotEmpty
            ? Text(
                todo.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              )
            : null,
        // Delete button
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline),
          onPressed: onDelete,
        ),
      ),
    );
  }
}
```

```dart
// lib/widgets/add_todo_dialog.dart
// Dialog for adding new todos

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/todo_provider.dart';

class AddTodoDialog extends StatefulWidget {
  const AddTodoDialog({super.key});

  @override
  State<AddTodoDialog> createState() => _AddTodoDialogState();
}

class _AddTodoDialogState extends State<AddTodoDialog> {
  // Form key for validation
  final _formKey = GlobalKey<FormState>();

  // Controllers for text fields
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void dispose() {
    // Always dispose controllers to prevent memory leaks
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _submit() {
    // Validate form before submitting
    if (_formKey.currentState?.validate() ?? false) {
      // Access provider without listening (read instead of watch)
      context.read<TodoProvider>().addTodo(
        _titleController.text.trim(),
        description: _descriptionController.text.trim(),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add New Todo'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Title field with validation
            TextFormField(
              controller: _titleController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Enter todo title',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.next,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Optional description field
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'Enter description',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Add'),
        ),
      ],
    );
  }
}
```

## Troubleshooting Common Issues

### Android License Not Accepted

```bash
# Accept all Android licenses
flutter doctor --android-licenses

# If that doesn't work, try:
yes | flutter doctor --android-licenses
```

### Flutter SDK Not Found

```bash
# Verify Flutter is in PATH
echo $PATH | grep flutter

# If not found, add to PATH
export PATH="$HOME/development/flutter/bin:$PATH"

# Make it permanent
echo 'export PATH="$HOME/development/flutter/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Build Failures

```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run

# If still failing, invalidate cache
rm -rf ~/.pub-cache
flutter pub get
```

### Emulator Not Starting

```bash
# Check KVM is working
kvm-ok

# Check available AVDs
emulator -list-avds

# Start emulator with verbose output
emulator -avd pixel_7_api_34 -verbose

# Cold boot the emulator
emulator -avd pixel_7_api_34 -no-snapshot-load
```

### Gradle Issues

```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version 8.4
cd ..

# Rebuild
flutter build apk
```

## Conclusion

You now have a fully configured Flutter development environment on Ubuntu, ready for building cross-platform applications. Flutter's hot reload capability makes development incredibly fast, and the single codebase approach allows you to target multiple platforms efficiently.

Remember these key commands as you continue your Flutter journey:

- `flutter doctor` - Check your environment
- `flutter run` - Run your app
- `flutter build` - Build for production
- `flutter test` - Run tests
- `flutter pub get` - Install dependencies

As you develop and deploy your Flutter applications, monitoring becomes crucial for maintaining a great user experience. Consider using [OneUptime](https://oneuptime.com) for comprehensive application monitoring. OneUptime provides real-time performance monitoring, error tracking, and uptime monitoring that integrates seamlessly with your Flutter applications. With OneUptime, you can:

- Monitor your backend APIs that your Flutter app communicates with
- Set up status pages to communicate with your users during outages
- Receive instant alerts when your services experience issues
- Track performance metrics and identify bottlenecks
- Monitor your CI/CD pipelines for Flutter builds

By combining Flutter's powerful development capabilities with OneUptime's robust monitoring solutions, you can ensure your applications not only perform well during development but continue to deliver exceptional experiences in production.

Happy coding with Flutter!
