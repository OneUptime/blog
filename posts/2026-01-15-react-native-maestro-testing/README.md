# How to Set Up End-to-End Testing for React Native with Maestro

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Maestro, E2E Testing, Mobile Testing, Automation, Mobile Development

Description: Learn how to set up end-to-end testing for React Native apps using Maestro for simple, reliable, and fast mobile test automation.

End-to-end testing for mobile applications has historically been a painful experience. Flaky tests, complex setup procedures, and cryptic error messages have plagued teams for years. Enter Maestro, a mobile UI automation framework that promises to change all that. In this comprehensive guide, we will walk through everything you need to know to set up and run E2E tests for your React Native application using Maestro.

## What is Maestro?

Maestro is an open-source mobile UI testing framework developed by mobile.dev. It was created to address the fundamental problems that plague traditional mobile testing tools: flakiness, complexity, and slow feedback loops.

At its core, Maestro uses a declarative YAML-based syntax to define test flows. Instead of writing imperative test code that describes *how* to interact with elements, you write declarative flows that describe *what* you want to happen. Maestro handles the implementation details, including automatic waiting, retry logic, and element synchronization.

### Key Features of Maestro

**Simple YAML Syntax**: Tests are written in human-readable YAML files. No programming knowledge required to get started.

**Built-in Tolerance**: Maestro automatically waits for elements, handles animations, and retries failed assertions. This dramatically reduces test flakiness.

**Fast Execution**: Tests run significantly faster than traditional frameworks because Maestro optimizes element lookup and synchronization.

**Cross-Platform**: Write once, run on both iOS and Android. The same flow file works across platforms with minimal modifications.

**No Code Dependencies**: Unlike Detox or Appium, you do not need to modify your application code or add test IDs throughout your codebase.

**Maestro Studio**: A visual tool for building tests interactively by clicking on your app.

**Maestro Cloud**: A managed cloud service for running tests at scale on real devices.

## Maestro vs Detox: A Detailed Comparison

If you have worked with React Native testing before, you have likely encountered Detox. Let us compare the two frameworks to help you make an informed decision.

### Setup Complexity

**Detox**: Requires significant setup including native build configuration, detox CLI installation, test runner integration (Jest), and device configuration. You need to modify your React Native build scripts and potentially add detection code to your app.

**Maestro**: Install a single CLI tool and you are ready to go. No modifications to your app, no build configuration changes, no test runner setup.

### Test Syntax

**Detox** (JavaScript):
```javascript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Welcome'))).toBeVisible();
  });
});
```

**Maestro** (YAML):
```yaml
appId: com.myapp
---
- launchApp
- tapOn: "Email"
- inputText: "user@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Login"
- assertVisible: "Welcome"
```

### Flakiness

**Detox**: While better than Appium, Detox tests can still be flaky due to synchronization issues, especially with complex animations or network requests.

**Maestro**: Built from the ground up to be tolerant. Automatic retries, smart waiting, and tolerance mechanisms make tests significantly more stable.

### Learning Curve

**Detox**: Requires JavaScript/TypeScript knowledge, understanding of async/await patterns, Jest testing framework familiarity, and React Native build system knowledge.

**Maestro**: Anyone who can read YAML can write tests. QA engineers without programming backgrounds can contribute immediately.

### Performance

**Detox**: Test execution is reasonably fast but requires a full build cycle when tests change.

**Maestro**: Extremely fast iteration. Change a YAML file and re-run immediately. No compilation step.

### When to Choose Each

**Choose Detox if**:
- You need deep integration with React Native internals
- Your team is already proficient in JavaScript testing
- You require programmatic test generation or complex data manipulation
- You have existing Detox tests that work well

**Choose Maestro if**:
- You want faster test development and iteration
- You need non-developers to write and maintain tests
- Test flakiness is a significant problem for your team
- You value simplicity and maintainability
- You are starting fresh with E2E testing

## Installation and Setup

### Prerequisites

Before installing Maestro, ensure you have:
- macOS, Linux, or Windows (with WSL2)
- A working React Native development environment
- iOS Simulator (macOS only) or Android Emulator
- Node.js and npm/yarn (for your React Native app)

### Installing Maestro

On macOS and Linux, install Maestro using the following command:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

This downloads and installs the Maestro CLI to your system. After installation, add Maestro to your PATH:

```bash
export PATH="$PATH":"$HOME/.maestro/bin"
```

Add this line to your `.bashrc`, `.zshrc`, or equivalent shell configuration file for persistence.

Verify the installation:

```bash
maestro --version
```

### Setting Up Your React Native Project

Maestro works with any React Native app without code modifications. However, adding testIDs to key elements improves test reliability:

```jsx
// Before
<TouchableOpacity onPress={handleLogin}>
  <Text>Login</Text>
</TouchableOpacity>

// After (recommended but not required)
<TouchableOpacity
  testID="login-button"
  accessibilityLabel="Login"
  onPress={handleLogin}
>
  <Text>Login</Text>
</TouchableOpacity>
```

Maestro can find elements by text, testID, accessibility label, or other attributes. Adding testIDs makes your tests more resilient to text changes.

### Project Structure

Create a dedicated folder for your Maestro flows:

```
your-react-native-app/
  src/
  android/
  ios/
  maestro/
    flows/
      login.yaml
      signup.yaml
      checkout.yaml
    utils/
      common-steps.yaml
    config/
      .env.local
      .env.staging
```

## Writing Your First Maestro Flow

Let us create a simple login flow test:

### Basic Flow Structure

Create a file at `maestro/flows/login.yaml`:

```yaml
# App configuration
appId: com.yourcompany.yourapp
---
# Test steps
- launchApp

# Navigate to login screen if needed
- tapOn: "Sign In"

# Enter credentials
- tapOn:
    id: "email-input"
- inputText: "testuser@example.com"

- tapOn:
    id: "password-input"
- inputText: "SecurePassword123"

# Submit the form
- tapOn: "Login"

# Verify successful login
- assertVisible: "Welcome back"
- assertVisible: "Dashboard"
```

### Running Your First Test

Start your React Native app on a simulator or emulator:

```bash
# For iOS
npx react-native run-ios

# For Android
npx react-native run-android
```

Run the Maestro flow:

```bash
maestro test maestro/flows/login.yaml
```

You will see Maestro execute each step, with real-time output showing what is happening:

```
Running flow: login.yaml
 - launchApp
 - tapOn: Sign In
 - tapOn: email-input
 - inputText: testuser@example.com
 - tapOn: password-input
 - inputText: SecurePassword123
 - tapOn: Login
 - assertVisible: Welcome back
 - assertVisible: Dashboard

Flow completed successfully!
```

## YAML Flow Syntax Deep Dive

Maestro's YAML syntax is intuitive but powerful. Let us explore the key commands and their options.

### Launch and App Control

```yaml
# Launch the app (clears state)
- launchApp

# Launch with specific options
- launchApp:
    clearState: true
    clearKeychain: true  # iOS only

# Stop the app
- stopApp

# Kill and restart
- killApp
- launchApp
```

### Tap Commands

```yaml
# Tap by visible text
- tapOn: "Submit"

# Tap by testID
- tapOn:
    id: "submit-button"

# Tap by accessibility label
- tapOn:
    label: "Submit Form"

# Tap at specific coordinates (use sparingly)
- tapOn:
    point: "50%,50%"

# Long press
- longPressOn: "Delete Item"

# Double tap
- doubleTapOn: "Zoom Image"

# Tap with index (when multiple matches exist)
- tapOn:
    text: "Item"
    index: 0  # First matching element
```

### Text Input

```yaml
# Simple text input (taps field first)
- inputText: "Hello World"

# Input into specific field
- tapOn:
    id: "search-input"
- inputText: "search query"

# Clear and input
- clearText
- inputText: "New text"

# Input with keyboard handling
- inputText: "text"
- hideKeyboard
```

### Scrolling and Swiping

```yaml
# Scroll down until element visible
- scrollUntilVisible:
    element: "Load More"
    direction: DOWN

# Scroll in a specific container
- scrollUntilVisible:
    element: "Target Item"
    direction: DOWN
    container:
      id: "scroll-view"

# Swipe gestures
- swipe:
    direction: LEFT
    duration: 500

# Swipe on specific element
- swipe:
    direction: RIGHT
    element:
      id: "carousel"
```

### Waiting and Timing

```yaml
# Wait for element to appear
- waitForElement:
    text: "Loading complete"
    timeout: 10000  # 10 seconds

# Wait for element to disappear
- waitUntilNotVisible:
    text: "Loading..."

# Fixed delay (use sparingly)
- wait: 2000  # 2 seconds
```

## Element Selection Strategies

Effective element selection is crucial for maintainable tests. Here are the strategies in order of preference:

### 1. TestID (Most Reliable)

```yaml
- tapOn:
    id: "login-button"
```

TestIDs are stable across text changes and localization. Add them to critical interactive elements.

### 2. Accessibility Label

```yaml
- tapOn:
    label: "Submit order"
```

Good for apps that already have accessibility support. Labels are often more descriptive than testIDs.

### 3. Text Content

```yaml
- tapOn: "Sign In"
```

Simple and readable, but breaks if text changes or with localization.

### 4. Partial Text Matching

```yaml
- tapOn:
    text: "Sign.*"
    regex: true
```

Useful when text might vary slightly.

### 5. Combining Selectors

```yaml
- tapOn:
    text: "Delete"
    below: "Shopping Cart"

- tapOn:
    id: "item-row"
    containsChild: "Product Name"
```

### 6. Index-Based Selection

```yaml
# When multiple elements match
- tapOn:
    text: "Add"
    index: 2  # Third matching element
```

Use as a last resort when other methods fail.

## Assertions and Validations

Maestro provides several ways to verify your app's state:

### Visibility Assertions

```yaml
# Assert element is visible
- assertVisible: "Welcome"

# Assert with selector options
- assertVisible:
    id: "success-message"

# Assert element is NOT visible
- assertNotVisible: "Error"
- assertNotVisible:
    id: "loading-spinner"
```

### Content Assertions

```yaml
# Check if text exists anywhere on screen
- assertVisible:
    text: "Order #12345"

# Check text with regex
- assertVisible:
    text: "Order #[0-9]+"
    regex: true
```

### Element State Assertions

```yaml
# Assert element is enabled
- assertEnabled:
    id: "submit-button"

# Assert element is disabled
- assertDisabled:
    id: "submit-button"
```

### Custom Assertions with JavaScript

For complex validations, use inline JavaScript:

```yaml
- evalScript: |
    const balance = maestro.findElement({ id: 'balance' }).text;
    const numericBalance = parseFloat(balance.replace('$', ''));
    if (numericBalance < 0) {
      throw new Error('Balance should not be negative');
    }
```

## Handling Conditional Flows

Real-world apps often have conditional UI states. Maestro handles these gracefully:

### Optional Elements

```yaml
# Try to tap, but continue if not found
- tapOn:
    text: "Skip Tutorial"
    optional: true

# Continue with main flow
- tapOn: "Get Started"
```

### Conditional Execution

```yaml
# Run steps only if condition is met
- runFlow:
    when:
      visible: "Cookie Consent"
    commands:
      - tapOn: "Accept All"
```

### Platform-Specific Steps

```yaml
# iOS-only steps
- runFlow:
    when:
      platform: iOS
    commands:
      - tapOn: "Allow"  # iOS permission dialog

# Android-only steps
- runFlow:
    when:
      platform: Android
    commands:
      - tapOn: "ALLOW"  # Android permission dialog
```

### Error Recovery

```yaml
# Handle potential error states
- runFlow:
    when:
      visible: "Session Expired"
    commands:
      - tapOn: "Login Again"
      - inputText: "${EMAIL}"
      - inputText: "${PASSWORD}"
      - tapOn: "Submit"
```

## Test Data Management

Managing test data effectively is crucial for maintainable tests:

### Environment Variables

Create a `.env` file in your maestro directory:

```env
# maestro/.env.local
EMAIL=testuser@example.com
PASSWORD=SecurePassword123
API_URL=https://staging.api.example.com
```

Use variables in your flows:

```yaml
appId: com.yourapp
---
- launchApp
- tapOn:
    id: "email-input"
- inputText: "${EMAIL}"
- tapOn:
    id: "password-input"
- inputText: "${PASSWORD}"
```

Run with environment file:

```bash
maestro test --env maestro/.env.local maestro/flows/login.yaml
```

### External Data Files

For complex test data, use external YAML files:

```yaml
# maestro/data/users.yaml
admin:
  email: admin@example.com
  password: AdminPass123
  role: administrator

regular:
  email: user@example.com
  password: UserPass123
  role: user
```

Reference in your flow:

```yaml
appId: com.yourapp
env:
  DATA_FILE: maestro/data/users.yaml
---
- launchApp
- inputText: "${admin.email}"
```

### Dynamic Data Generation

Use JavaScript for dynamic data:

```yaml
- evalScript: |
    const timestamp = Date.now();
    output.uniqueEmail = `test+${timestamp}@example.com`;
    output.orderRef = `ORD-${timestamp}`;

- tapOn: "Email"
- inputText: "${output.uniqueEmail}"
```

### Parameterized Flows

Create reusable flows with parameters:

```yaml
# maestro/utils/login.yaml
appId: com.yourapp
---
- tapOn:
    id: "email-input"
- inputText: "${EMAIL}"
- tapOn:
    id: "password-input"
- inputText: "${PASSWORD}"
- tapOn: "Login"
- assertVisible: "Dashboard"
```

Call from other flows:

```yaml
appId: com.yourapp
env:
  EMAIL: specific@example.com
  PASSWORD: specificPassword
---
- launchApp
- runFlow: utils/login.yaml
- tapOn: "Profile"
```

## Running Tests on CI/CD

Integrating Maestro into your CI/CD pipeline ensures consistent quality across deployments.

### GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Build iOS app
        run: |
          cd ios && pod install
          npx react-native build-ios --mode Release

      - name: Boot iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15"

      - name: Install app on simulator
        run: |
          xcrun simctl install booted ios/build/Build/Products/Release-iphonesimulator/YourApp.app

      - name: Run Maestro tests
        run: |
          maestro test maestro/flows/

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-artifacts
          path: ~/.maestro/tests/

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Build Android app
        run: |
          cd android && ./gradlew assembleRelease

      - name: Run Maestro tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: |
            adb install android/app/build/outputs/apk/release/app-release.apk
            maestro test maestro/flows/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test

variables:
  ANDROID_SDK_ROOT: /opt/android-sdk

build-android:
  stage: build
  image: reactnativecommunity/react-native-android
  script:
    - npm ci
    - cd android && ./gradlew assembleRelease
  artifacts:
    paths:
      - android/app/build/outputs/apk/

e2e-android:
  stage: test
  image: reactnativecommunity/react-native-android
  services:
    - name: android-emulator
  before_script:
    - curl -Ls "https://get.maestro.mobile.dev" | bash
    - export PATH="$PATH:$HOME/.maestro/bin"
  script:
    - adb install android/app/build/outputs/apk/release/app-release.apk
    - maestro test maestro/flows/
  dependencies:
    - build-android
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  android: circleci/android@2.3
  node: circleci/node@5.1

jobs:
  e2e-android:
    executor:
      name: android/android-machine
      resource-class: large
      tag: 2023.11.1
    steps:
      - checkout
      - node/install:
          node-version: '20'
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Install Maestro
          command: |
            curl -Ls "https://get.maestro.mobile.dev" | bash
            echo 'export PATH="$PATH:$HOME/.maestro/bin"' >> $BASH_ENV
      - run:
          name: Build Android app
          command: cd android && ./gradlew assembleRelease
      - android/start-emulator-and-run-tests:
          run-tests-working-directory: .
          test-command: |
            adb install android/app/build/outputs/apk/release/app-release.apk
            maestro test maestro/flows/

workflows:
  e2e-tests:
    jobs:
      - e2e-android
```

## Maestro Cloud Integration

Maestro Cloud is a managed service that runs your tests on real devices in the cloud, providing parallel execution and detailed reporting.

### Setting Up Maestro Cloud

First, create an account at [cloud.mobile.dev](https://cloud.mobile.dev) and get your API key.

Install the Maestro Cloud CLI:

```bash
maestro cloud login
```

### Uploading and Running Tests

```bash
# Upload iOS app and run tests
maestro cloud \
  --app-file ios/build/YourApp.app \
  --flows maestro/flows/ \
  --api-key YOUR_API_KEY

# Upload Android app and run tests
maestro cloud \
  --app-file android/app/build/outputs/apk/release/app-release.apk \
  --flows maestro/flows/ \
  --api-key YOUR_API_KEY
```

### Advanced Cloud Configuration

Create a `maestro-cloud.yaml` configuration file:

```yaml
# maestro-cloud.yaml
appFile: android/app/build/outputs/apk/release/app-release.apk
flows: maestro/flows/
env:
  API_URL: https://staging.api.example.com
  TEST_USER: cloud-test@example.com
parallelism: 4
timeout: 30  # minutes
devices:
  - platform: android
    version: 14
  - platform: android
    version: 13
  - platform: ios
    version: 17
```

Run with configuration:

```bash
maestro cloud --config maestro-cloud.yaml
```

### CI Integration with Maestro Cloud

```yaml
# GitHub Actions example
- name: Run E2E tests on Maestro Cloud
  env:
    MAESTRO_CLOUD_API_KEY: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
  run: |
    maestro cloud \
      --app-file android/app/build/outputs/apk/release/app-release.apk \
      --flows maestro/flows/ \
      --api-key $MAESTRO_CLOUD_API_KEY
```

## Best Practices and Tips

### 1. Organize Flows by Feature

```
maestro/
  flows/
    auth/
      login.yaml
      signup.yaml
      forgot-password.yaml
      logout.yaml
    profile/
      view-profile.yaml
      edit-profile.yaml
    checkout/
      add-to-cart.yaml
      payment.yaml
      order-confirmation.yaml
  utils/
    login-helper.yaml
    navigation-helper.yaml
```

### 2. Create Reusable Flow Components

```yaml
# maestro/utils/login-helper.yaml
appId: com.yourapp
---
- tapOn:
    id: "email-input"
- inputText: "${EMAIL}"
- tapOn:
    id: "password-input"
- inputText: "${PASSWORD}"
- tapOn: "Login"
- waitForElement: "Dashboard"
```

Use in other flows:

```yaml
appId: com.yourapp
env:
  EMAIL: user@example.com
  PASSWORD: password123
---
- launchApp
- runFlow: utils/login-helper.yaml
# Continue with authenticated actions
```

### 3. Use Meaningful TestIDs

```jsx
// Bad
<Button testID="btn1" />
<Button testID="btn2" />

// Good
<Button testID="login-submit-button" />
<Button testID="signup-submit-button" />
```

### 4. Handle Loading States

```yaml
# Wait for loading to complete before asserting
- waitUntilNotVisible:
    text: "Loading..."
    timeout: 15000

- assertVisible: "Data loaded"
```

### 5. Use Maestro Studio for Test Development

```bash
maestro studio
```

Maestro Studio opens an interactive UI where you can:
- See your app's element hierarchy
- Click to generate test commands
- Test individual commands in real-time
- Export generated flows

### 6. Run Tests in Parallel Locally

```bash
# Run all flows in the directory
maestro test maestro/flows/

# Run specific test suites
maestro test maestro/flows/auth/
maestro test maestro/flows/checkout/
```

### 7. Screenshot and Recording

```yaml
# Take screenshot at specific point
- takeScreenshot: "after-login"

# Record video (Maestro Cloud)
# Enabled by default on cloud runs
```

### 8. Debug Failing Tests

```bash
# Run with verbose output
maestro test --debug-output maestro/flows/login.yaml

# Run single flow with detailed logging
maestro test maestro/flows/login.yaml --format junit
```

### 9. Handle Permissions Dialogs

```yaml
# Handle both iOS and Android permission prompts
- runFlow:
    when:
      visible: "Allow"
    commands:
      - tapOn: "Allow"

- runFlow:
    when:
      visible: "ALLOW"
    commands:
      - tapOn: "ALLOW"
```

### 10. Test Against Different App States

```yaml
# Fresh install test
- launchApp:
    clearState: true

# Test with existing data
- launchApp:
    clearState: false
```

### 11. Avoid Hardcoded Waits

```yaml
# Bad - arbitrary wait
- wait: 5000
- tapOn: "Submit"

# Good - wait for specific condition
- waitForElement:
    text: "Form Ready"
    timeout: 5000
- tapOn: "Submit"
```

### 12. Use Tags for Test Organization

```yaml
# maestro/flows/login.yaml
appId: com.yourapp
tags:
  - smoke
  - auth
  - critical
---
- launchApp
# ... test steps
```

Run tagged tests:

```bash
maestro test --include-tags smoke maestro/flows/
maestro test --exclude-tags slow maestro/flows/
```

## Troubleshooting Common Issues

### Element Not Found

```yaml
# Add timeout for slow-loading elements
- tapOn:
    text: "Submit"
    timeout: 10000

# Use waitForElement before interaction
- waitForElement:
    id: "submit-button"
    timeout: 15000
- tapOn:
    id: "submit-button"
```

### Keyboard Blocking Elements

```yaml
# Hide keyboard before tapping other elements
- inputText: "search query"
- hideKeyboard
- tapOn: "Search Results"
```

### Animation Issues

```yaml
# Wait for animations to complete
- waitUntilNotVisible:
    id: "loading-animation"

# Or use a brief pause (last resort)
- wait: 500
```

## Conclusion

Maestro represents a significant leap forward in mobile E2E testing. Its declarative YAML syntax, built-in tolerance for flakiness, and fast execution make it an excellent choice for React Native applications. By following the practices outlined in this guide, you can build a robust, maintainable test suite that catches bugs before they reach your users.

The key takeaways:
- Start simple with text-based selectors, then add testIDs for critical paths
- Use reusable flow components to keep tests DRY
- Leverage Maestro Studio for rapid test development
- Integrate with CI/CD early in your development process
- Consider Maestro Cloud for parallel execution on real devices

As mobile development continues to evolve, tools like Maestro make quality assurance more accessible and effective. The investment in E2E testing pays dividends in reduced bugs, faster releases, and improved user experience.

---

**Related Reading:**
- [Why We Resent Middle Managers (And Why OneUptime Doesn't Have Any)](https://oneuptime.com/blog/post/2025-08-29-why-we-resent-middle-managers-and-why-we-dont-have-them/view)
- [The Power of Three: How Small Teams Drive Big Results at OneUptime](https://oneuptime.com/blog/post/2025-03-13-power-of-three-how-small-teams-drive-big-results/view)
- [Native apps had a good run, but PWA has caught up and is the future](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
