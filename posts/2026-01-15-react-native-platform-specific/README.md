# How to Write Platform-Specific Code in React Native (iOS vs Android)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Platform-Specific, iOS, Android, Cross-Platform, Mobile Development

Description: Learn how to write platform-specific code in React Native to handle iOS and Android differences effectively.

---

React Native promises a unified codebase for both iOS and Android platforms, but the reality is that these platforms have fundamental differences in their design philosophies, user expectations, and native capabilities. Writing truly excellent cross-platform applications requires understanding when and how to implement platform-specific code. This comprehensive guide will walk you through every technique available for handling platform differences in React Native.

## Understanding the Need for Platform-Specific Code

Before diving into implementation details, it is important to understand why platform-specific code is necessary. iOS and Android differ in several key areas:

- **Design Guidelines**: iOS follows Human Interface Guidelines while Android follows Material Design
- **Navigation Patterns**: iOS uses edge swipe gestures and bottom tabs, Android uses back button and drawer navigation
- **Typography**: System fonts, sizes, and weights differ between platforms
- **Native Components**: Some components look and behave differently on each platform
- **Permission Systems**: Each platform handles permissions differently
- **Hardware Interactions**: Camera, biometrics, and sensors have platform-specific APIs

## The Platform Module

React Native provides the `Platform` module as your primary tool for handling platform differences. This module is imported from `react-native` and offers several utilities.

### Basic Import and Usage

```typescript
import { Platform } from 'react-native';

// Check the current platform
console.log(Platform.OS); // 'ios' or 'android'

// Check the platform version
console.log(Platform.Version);
// iOS: '16.0' (string)
// Android: 33 (number representing API level)
```

### Understanding Platform.Version

The version property behaves differently on each platform:

```typescript
import { Platform } from 'react-native';

const checkPlatformVersion = (): string => {
  if (Platform.OS === 'ios') {
    // iOS returns a string like '16.0' or '15.4.1'
    const iosVersion = Platform.Version as string;
    const majorVersion = parseInt(iosVersion.split('.')[0], 10);

    if (majorVersion >= 16) {
      return 'Running iOS 16 or later';
    }
    return `Running iOS ${majorVersion}`;
  }

  if (Platform.OS === 'android') {
    // Android returns the API level as a number
    const apiLevel = Platform.Version as number;

    if (apiLevel >= 33) {
      return 'Running Android 13 (API 33) or later';
    }
    if (apiLevel >= 31) {
      return 'Running Android 12 (API 31-32)';
    }
    return `Running Android API level ${apiLevel}`;
  }

  return 'Unknown platform';
};
```

## Platform.OS Checks

The most straightforward approach for platform-specific code is using conditional statements with `Platform.OS`.

### Simple Conditional Rendering

```typescript
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

const PlatformAwareComponent: React.FC = () => {
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && (
        <Text style={styles.text}>
          Welcome iOS user! Enjoy our app designed for Apple devices.
        </Text>
      )}

      {Platform.OS === 'android' && (
        <Text style={styles.text}>
          Welcome Android user! Experience Material Design at its finest.
        </Text>
      )}

      <Text style={styles.commonText}>
        This content appears on both platforms.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  text: {
    fontSize: 16,
    marginBottom: 12,
  },
  commonText: {
    fontSize: 14,
    color: '#666',
  },
});

export default PlatformAwareComponent;
```

### Conditional Logic in Functions

```typescript
import { Platform, Alert, ToastAndroid } from 'react-native';

const showNotification = (message: string): void => {
  if (Platform.OS === 'android') {
    // Android has native Toast support
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS uses Alert or custom toast implementation
    Alert.alert('Notification', message);
  }
};

const getDefaultPadding = (): number => {
  // iOS typically needs more padding for the notch/Dynamic Island
  return Platform.OS === 'ios' ? 44 : 24;
};

const getAnimationDuration = (): number => {
  // Android Material Design recommends slightly longer animations
  return Platform.OS === 'android' ? 300 : 250;
};
```

## Platform.select Helper

The `Platform.select` method provides a cleaner syntax for platform-specific values. It accepts an object with platform keys and returns the appropriate value.

### Basic Platform.select Usage

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.select({
      ios: '#F5F5F7',      // Apple's signature light gray
      android: '#FAFAFA',  // Material Design surface color
      default: '#FFFFFF',  // Fallback for web or other platforms
    }),
  },

  header: {
    height: Platform.select({
      ios: 88,     // iOS navigation bar height with status bar
      android: 56, // Material Design app bar height
      default: 64,
    }),
    paddingTop: Platform.select({
      ios: 44,     // Account for iOS status bar
      android: 0,
      default: 0,
    }),
  },

  shadowStyle: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});
```

### Complex Platform.select with Components

```typescript
import React from 'react';
import { Platform, View, Text, TouchableOpacity, TouchableNativeFeedback } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
}

const PlatformButton: React.FC<ButtonProps> = ({ onPress, title }) => {
  const ButtonWrapper = Platform.select({
    android: TouchableNativeFeedback,
    default: TouchableOpacity,
  });

  const rippleConfig = Platform.select({
    android: {
      background: TouchableNativeFeedback.Ripple('#DDDDDD', false),
    },
    default: {},
  });

  return (
    <ButtonWrapper onPress={onPress} {...rippleConfig}>
      <View style={buttonStyles.container}>
        <Text style={buttonStyles.text}>{title}</Text>
      </View>
    </ButtonWrapper>
  );
};

const buttonStyles = {
  container: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Platform.select({
      ios: '#007AFF',     // iOS system blue
      android: '#6200EE', // Material Design primary
      default: '#0066CC',
    }),
    borderRadius: Platform.select({
      ios: 8,
      android: 4,
      default: 6,
    }),
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: Platform.select({
      ios: '600' as const,
      android: '500' as const,
      default: '600' as const,
    }),
    textAlign: 'center' as const,
  },
};

export default PlatformButton;
```

## Platform-Specific File Extensions

React Native's bundler automatically resolves platform-specific files based on file extensions. This is the most powerful technique for handling significant platform differences.

### File Extension Priority

The bundler checks files in this order:

1. `Component.ios.tsx` or `Component.android.tsx`
2. `Component.native.tsx`
3. `Component.tsx`

### Example: Platform-Specific Components

Create separate files for each platform:

**DatePickerComponent.ios.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
}

const DatePickerComponent: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        onChange={(event, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate);
          }
        }}
        style={styles.picker}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  picker: {
    height: 200,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
});

export default DatePickerComponent;
```

**DatePickerComponent.android.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
}

const DatePickerComponent: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.buttonText}>{formatDate(value)}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate && event.type !== 'dismissed') {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#212121',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 1,
  },
  buttonText: {
    fontSize: 16,
    color: '#424242',
  },
});

export default DatePickerComponent;
```

**Usage in your application:**

```typescript
// The bundler automatically picks the right file
import DatePickerComponent from './DatePickerComponent';

const MyScreen: React.FC = () => {
  const [date, setDate] = useState(new Date());

  return (
    <DatePickerComponent
      value={date}
      onChange={setDate}
      label="Select Date"
    />
  );
};
```

## Platform-Specific Styling

Styling differences between platforms go beyond simple value changes. Each platform has unique styling capabilities and expectations.

### Shadow Implementation

iOS and Android handle shadows completely differently:

```typescript
import { Platform, StyleSheet, ViewStyle } from 'react-native';

interface ShadowConfig {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetX?: number;
  offsetY?: number;
  elevation?: number;
}

const createShadow = (config: ShadowConfig): ViewStyle => {
  const {
    color = '#000000',
    opacity = 0.15,
    radius = 8,
    offsetX = 0,
    offsetY = 4,
    elevation = 4,
  } = config;

  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation: elevation,
      // Android elevation creates gray shadows by default
      // For colored shadows on Android 9+, use the following
      shadowColor: color,
    },
    default: {},
  }) as ViewStyle;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    ...createShadow({
      opacity: 0.1,
      radius: 12,
      offsetY: 6,
      elevation: 6,
    }),
  },

  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...createShadow({
      opacity: 0.3,
      radius: 8,
      offsetY: 4,
      elevation: 8,
    }),
  },
});
```

### Font Handling

Each platform has different system fonts and font weight support:

```typescript
import { Platform, StyleSheet, TextStyle } from 'react-native';

interface TypographyStyles {
  largeTitle: TextStyle;
  title1: TextStyle;
  title2: TextStyle;
  headline: TextStyle;
  body: TextStyle;
  caption: TextStyle;
}

const typography: TypographyStyles = {
  largeTitle: {
    fontSize: Platform.select({ ios: 34, android: 32, default: 34 }),
    fontWeight: Platform.select({ ios: '700', android: '400', default: '700' }),
    letterSpacing: Platform.select({ ios: 0.37, android: 0, default: 0.37 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  title1: {
    fontSize: Platform.select({ ios: 28, android: 24, default: 28 }),
    fontWeight: Platform.select({ ios: '700', android: '500', default: '700' }),
    letterSpacing: Platform.select({ ios: 0.36, android: 0, default: 0.36 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  title2: {
    fontSize: Platform.select({ ios: 22, android: 20, default: 22 }),
    fontWeight: Platform.select({ ios: '700', android: '500', default: '700' }),
    letterSpacing: Platform.select({ ios: 0.35, android: 0.15, default: 0.35 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  headline: {
    fontSize: Platform.select({ ios: 17, android: 16, default: 17 }),
    fontWeight: Platform.select({ ios: '600', android: '500', default: '600' }),
    letterSpacing: Platform.select({ ios: -0.41, android: 0.15, default: -0.41 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  body: {
    fontSize: Platform.select({ ios: 17, android: 16, default: 17 }),
    fontWeight: '400',
    letterSpacing: Platform.select({ ios: -0.41, android: 0.5, default: -0.41 }),
    lineHeight: Platform.select({ ios: 22, android: 24, default: 22 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },

  caption: {
    fontSize: Platform.select({ ios: 12, android: 12, default: 12 }),
    fontWeight: '400',
    letterSpacing: Platform.select({ ios: 0, android: 0.4, default: 0 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
};

export default typography;
```

## Native Component Differences

Many React Native components behave differently on each platform. Understanding these differences is crucial for creating polished apps.

### TextInput Differences

```typescript
import React, { useState } from 'react';
import { Platform, TextInput, View, StyleSheet } from 'react-native';

interface PlatformTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
}

const PlatformTextInput: React.FC<PlatformTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Platform.select({
          ios: '#8E8E93',
          android: '#9E9E9E',
          default: '#999999',
        })}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        // iOS-specific props
        clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : undefined}
        enablesReturnKeyAutomatically={Platform.OS === 'ios'}
        // Android-specific props
        underlineColorAndroid="transparent"
        autoComplete={Platform.OS === 'android' ? 'off' : undefined}
        // Platform-specific keyboard appearance
        keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
        // Autofill behavior differs
        textContentType={Platform.OS === 'ios' && secureTextEntry ? 'password' : undefined}
        autoCapitalize="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  input: {
    height: Platform.select({ ios: 44, android: 48, default: 44 }),
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: Platform.select({
      ios: '#F2F2F7',
      android: '#FFFFFF',
      default: '#F5F5F5',
    }),
    borderRadius: Platform.select({ ios: 10, android: 4, default: 8 }),
    borderWidth: Platform.select({ ios: 0, android: 1, default: 1 }),
    borderColor: '#E0E0E0',
    color: '#000000',
  },
});

export default PlatformTextInput;
```

### ScrollView and List Differences

```typescript
import React from 'react';
import {
  Platform,
  ScrollView,
  RefreshControl,
  View,
  StyleSheet,
  FlatList,
} from 'react-native';

interface PlatformScrollViewProps {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
}

const PlatformScrollView: React.FC<PlatformScrollViewProps> = ({
  children,
  refreshing,
  onRefresh,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={Platform.OS !== 'ios'}
      bounces={Platform.OS === 'ios'}
      overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          // iOS-specific
          tintColor={Platform.OS === 'ios' ? '#007AFF' : undefined}
          // Android-specific
          colors={Platform.OS === 'android' ? ['#6200EE', '#03DAC6'] : undefined}
          progressBackgroundColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        />
      }
    >
      {children}
    </ScrollView>
  );
};

interface ListItem {
  id: string;
  title: string;
}

interface PlatformFlatListProps {
  data: ListItem[];
  renderItem: ({ item }: { item: ListItem }) => React.ReactElement;
}

const PlatformFlatList: React.FC<PlatformFlatListProps> = ({
  data,
  renderItem,
}) => {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      // Performance optimizations per platform
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={Platform.select({ ios: 10, android: 5, default: 10 })}
      windowSize={Platform.select({ ios: 21, android: 11, default: 21 })}
      initialNumToRender={Platform.select({ ios: 10, android: 5, default: 10 })}
      // Visual adjustments
      showsVerticalScrollIndicator={Platform.OS !== 'ios'}
      ItemSeparatorComponent={
        Platform.OS === 'ios'
          ? () => <View style={styles.iosSeparator} />
          : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.select({ ios: 34, android: 16, default: 16 }),
  },
  iosSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
});

export { PlatformScrollView, PlatformFlatList };
```

## Keyboard Behavior Differences

Keyboard handling is one of the most significant differences between iOS and Android.

```typescript
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  View,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface KeyboardAwareFormProps {
  children: React.ReactNode;
}

const KeyboardAwareForm: React.FC<KeyboardAwareFormProps> = ({ children }) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Different event names for each platform
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // iOS uses 'padding' behavior, Android uses 'height'
  const keyboardBehavior = Platform.select({
    ios: 'padding' as const,
    android: 'height' as const,
    default: 'padding' as const,
  });

  // iOS needs vertical offset for navigation headers
  const keyboardVerticalOffset = Platform.select({
    ios: 88, // Navigation bar + status bar
    android: 0,
    default: 0,
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.inner}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
};

// Hook for keyboard-aware bottom spacing
const useKeyboardBottomInset = (): number => {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      // Android includes software navigation bar in keyboard height
      const height = event.endCoordinates.height;
      setBottomInset(height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setBottomInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return bottomInset;
};

// Dismiss keyboard helper
const dismissKeyboard = (): void => {
  Keyboard.dismiss();
};

// Check if keyboard is dismissible by tapping outside
const getKeyboardDismissMode = (): 'none' | 'on-drag' | 'interactive' => {
  return Platform.select({
    ios: 'interactive',
    android: 'on-drag',
    default: 'none',
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
});

export { KeyboardAwareForm, useKeyboardBottomInset, dismissKeyboard, getKeyboardDismissMode };
```

## Navigation Patterns Per Platform

iOS and Android have distinct navigation expectations that affect user experience.

```typescript
import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Platform-specific screen options
const getScreenOptions = () => ({
  headerStyle: {
    backgroundColor: Platform.select({
      ios: '#F8F8F8',
      android: '#FFFFFF',
      default: '#FFFFFF',
    }),
  },
  headerTitleStyle: {
    fontWeight: Platform.select({
      ios: '600' as const,
      android: '500' as const,
      default: '600' as const,
    }),
    fontSize: Platform.select({
      ios: 17,
      android: 20,
      default: 17,
    }),
  },
  headerTitleAlign: Platform.select({
    ios: 'center' as const,
    android: 'left' as const,
    default: 'center' as const,
  }),
  headerShadowVisible: Platform.OS === 'ios',
  animation: Platform.select({
    ios: 'default' as const,
    android: 'fade_from_bottom' as const,
    default: 'default' as const,
  }),
  // iOS uses swipe from edge, Android uses back button
  gestureEnabled: Platform.OS === 'ios',
  fullScreenGestureEnabled: Platform.OS === 'ios',
});

// Platform-appropriate tab bar
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          height: Platform.select({ ios: 84, android: 60, default: 60 }),
          paddingBottom: Platform.select({ ios: 28, android: 8, default: 8 }),
          paddingTop: 8,
          backgroundColor: Platform.select({
            ios: '#F8F8F8',
            android: '#FFFFFF',
            default: '#FFFFFF',
          }),
          borderTopWidth: Platform.select({
            ios: StyleSheet.hairlineWidth,
            android: 0,
            default: StyleSheet.hairlineWidth,
          }),
          elevation: Platform.select({ ios: 0, android: 8, default: 0 }),
        },
        tabBarActiveTintColor: Platform.select({
          ios: '#007AFF',
          android: '#6200EE',
          default: '#007AFF',
        }),
        tabBarInactiveTintColor: Platform.select({
          ios: '#8E8E93',
          android: '#757575',
          default: '#8E8E93',
        }),
        tabBarLabelStyle: {
          fontSize: Platform.select({ ios: 10, android: 12, default: 10 }),
          fontWeight: Platform.select({
            ios: '500' as const,
            android: '400' as const,
            default: '500' as const,
          }),
        },
      }}
    >
      {/* Tab screens */}
    </Tab.Navigator>
  );
};

// Android-style drawer navigation
const DrawerNavigator: React.FC = () => {
  // Drawer is more common on Android
  if (Platform.OS !== 'android') {
    return <TabNavigator />;
  }

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          width: 280,
          backgroundColor: '#FFFFFF',
        },
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerActiveTintColor: '#6200EE',
        drawerInactiveTintColor: '#757575',
      }}
    >
      {/* Drawer screens */}
    </Drawer.Navigator>
  );
};

// Custom back button handling
const useBackHandler = (onBack: () => boolean): void => {
  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const { BackHandler } = require('react-native');
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);

    return () => subscription.remove();
  }, [onBack]);
};

export { getScreenOptions, TabNavigator, DrawerNavigator, useBackHandler };
```

## Permission Handling Differences

Permission systems differ significantly between iOS and Android:

```typescript
import { Platform, Alert, Linking } from 'react-native';
import {
  request,
  check,
  PERMISSIONS,
  RESULTS,
  Permission,
  openSettings,
} from 'react-native-permissions';

type PermissionType = 'camera' | 'photoLibrary' | 'location' | 'notifications';

interface PermissionConfig {
  ios: Permission;
  android: Permission;
}

const permissionMap: Record<PermissionType, PermissionConfig> = {
  camera: {
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  },
  photoLibrary: {
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
    // Android 13+ uses different permission
    android: Platform.Version >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  },
  location: {
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  },
  notifications: {
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
    android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
  },
};

const getPermission = (type: PermissionType): Permission => {
  const config = permissionMap[type];
  return Platform.OS === 'ios' ? config.ios : config.android;
};

const checkPermission = async (type: PermissionType): Promise<boolean> => {
  const permission = getPermission(type);
  const result = await check(permission);

  return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
};

const requestPermission = async (type: PermissionType): Promise<boolean> => {
  const permission = getPermission(type);
  const currentStatus = await check(permission);

  // Handle "never ask again" on Android
  if (Platform.OS === 'android' && currentStatus === RESULTS.BLOCKED) {
    Alert.alert(
      'Permission Required',
      `Please enable ${type} permission in your device settings to use this feature.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => openSettings() },
      ]
    );
    return false;
  }

  // iOS shows system dialog, Android may show dialog or be blocked
  const result = await request(permission);

  if (result === RESULTS.BLOCKED) {
    // Permission permanently denied
    const message = Platform.select({
      ios: `Please enable ${type} access in Settings > Privacy > ${type}.`,
      android: `Please enable ${type} permission in app settings.`,
      default: 'Permission denied.',
    });

    Alert.alert('Permission Denied', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => openSettings() },
    ]);
    return false;
  }

  return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
};

// Platform-specific permission rationale
const showPermissionRationale = (
  type: PermissionType,
  onAccept: () => void,
  onDecline: () => void
): void => {
  const rationales: Record<PermissionType, { title: string; message: string }> = {
    camera: {
      title: 'Camera Access',
      message: Platform.select({
        ios: 'We need camera access to take photos for your profile.',
        android: 'This app needs camera access to take photos. We will only access the camera when you choose to take a photo.',
        default: 'Camera access is required.',
      }),
    },
    photoLibrary: {
      title: 'Photo Library Access',
      message: Platform.select({
        ios: 'We need access to your photos to let you choose a profile picture.',
        android: 'This app needs access to your photos to let you select images. We will not access your photos without your action.',
        default: 'Photo access is required.',
      }),
    },
    location: {
      title: 'Location Access',
      message: Platform.select({
        ios: 'We use your location to show nearby services and provide better recommendations.',
        android: 'This app collects location data to show nearby services even when the app is in the background.',
        default: 'Location access is required.',
      }),
    },
    notifications: {
      title: 'Notification Permission',
      message: Platform.select({
        ios: 'Enable notifications to receive important updates and messages.',
        android: 'Allow notifications to stay updated with important messages and alerts.',
        default: 'Notifications are required.',
      }),
    },
  };

  const { title, message } = rationales[type];

  Alert.alert(title, message, [
    { text: 'Not Now', style: 'cancel', onPress: onDecline },
    { text: 'Continue', onPress: onAccept },
  ]);
};

export {
  checkPermission,
  requestPermission,
  showPermissionRationale,
  PermissionType,
};
```

## Design Guideline Adherence

Following platform design guidelines creates native-feeling experiences:

```typescript
import { Platform, Dimensions, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safe area values
const getSafeAreaInsets = () => ({
  top: Platform.select({
    ios: 47, // iPhone 14 Pro notch/Dynamic Island
    android: StatusBar.currentHeight || 24,
    default: 0,
  }),
  bottom: Platform.select({
    ios: 34, // Home indicator area
    android: 0,
    default: 0,
  }),
  left: 0,
  right: 0,
});

// Standard spacing following each platform's guidelines
const spacing = {
  // iOS uses 8-point grid, Android uses 4-point grid
  xs: Platform.select({ ios: 4, android: 4, default: 4 }),
  sm: Platform.select({ ios: 8, android: 8, default: 8 }),
  md: Platform.select({ ios: 16, android: 16, default: 16 }),
  lg: Platform.select({ ios: 24, android: 24, default: 24 }),
  xl: Platform.select({ ios: 32, android: 32, default: 32 }),

  // Content margins
  screenHorizontal: Platform.select({ ios: 16, android: 16, default: 16 }),
  screenVertical: Platform.select({ ios: 20, android: 16, default: 16 }),

  // List item spacing
  listItemVertical: Platform.select({ ios: 11, android: 16, default: 12 }),
  listItemHorizontal: Platform.select({ ios: 16, android: 16, default: 16 }),
};

// Touch target sizes (minimum recommended)
const touchTargets = {
  minimum: Platform.select({ ios: 44, android: 48, default: 44 }),
  comfortable: Platform.select({ ios: 44, android: 56, default: 48 }),
};

// Border radius conventions
const borderRadius = {
  small: Platform.select({ ios: 6, android: 4, default: 4 }),
  medium: Platform.select({ ios: 10, android: 8, default: 8 }),
  large: Platform.select({ ios: 14, android: 12, default: 12 }),
  extraLarge: Platform.select({ ios: 20, android: 16, default: 16 }),
  pill: Platform.select({ ios: 9999, android: 9999, default: 9999 }),
  // iOS specific
  card: Platform.select({ ios: 12, android: 8, default: 10 }),
  button: Platform.select({ ios: 8, android: 4, default: 6 }),
  input: Platform.select({ ios: 10, android: 4, default: 8 }),
};

// Color palettes following guidelines
const colors = {
  primary: Platform.select({
    ios: '#007AFF',    // iOS system blue
    android: '#6200EE', // Material primary
    default: '#007AFF',
  }),
  secondary: Platform.select({
    ios: '#5856D6',    // iOS system purple
    android: '#03DAC6', // Material secondary
    default: '#5856D6',
  }),
  success: Platform.select({
    ios: '#34C759',    // iOS system green
    android: '#4CAF50', // Material green
    default: '#34C759',
  }),
  warning: Platform.select({
    ios: '#FF9500',    // iOS system orange
    android: '#FF9800', // Material orange
    default: '#FF9500',
  }),
  error: Platform.select({
    ios: '#FF3B30',    // iOS system red
    android: '#F44336', // Material red
    default: '#FF3B30',
  }),
  background: Platform.select({
    ios: '#F2F2F7',    // iOS grouped background
    android: '#FAFAFA', // Material background
    default: '#F5F5F5',
  }),
  surface: Platform.select({
    ios: '#FFFFFF',
    android: '#FFFFFF',
    default: '#FFFFFF',
  }),
  textPrimary: Platform.select({
    ios: '#000000',
    android: '#212121',
    default: '#000000',
  }),
  textSecondary: Platform.select({
    ios: '#8E8E93',
    android: '#757575',
    default: '#666666',
  }),
  separator: Platform.select({
    ios: '#C6C6C8',
    android: '#E0E0E0',
    default: '#DDDDDD',
  }),
};

// Animation durations following platform conventions
const animations = {
  fast: Platform.select({ ios: 200, android: 150, default: 200 }),
  normal: Platform.select({ ios: 300, android: 225, default: 300 }),
  slow: Platform.select({ ios: 500, android: 375, default: 500 }),
  // Standard easing curves
  easing: Platform.select({
    ios: 'ease-in-out',
    android: 'ease-out', // Material uses deceleration curve
    default: 'ease-in-out',
  }),
};

export {
  getSafeAreaInsets,
  spacing,
  touchTargets,
  borderRadius,
  colors,
  animations,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
```

## Testing on Both Platforms

Comprehensive testing ensures your app works correctly on both platforms:

```typescript
import { Platform } from 'react-native';

// Utility for platform-specific test cases
const describePlatform = (
  platformName: 'ios' | 'android',
  description: string,
  testFn: () => void
): void => {
  if (Platform.OS === platformName) {
    describe(description, testFn);
  } else {
    describe.skip(description, testFn);
  }
};

// Test helper for platform-specific assertions
const expectPlatformValue = <T>(
  value: T,
  expected: { ios: T; android: T }
): void => {
  const platformExpected = Platform.OS === 'ios' ? expected.ios : expected.android;
  expect(value).toBe(platformExpected);
};

// Example test suite
describe('Platform-specific behavior', () => {
  describe('Common functionality', () => {
    it('should work on both platforms', () => {
      // Test cross-platform code
    });
  });

  describePlatform('ios', 'iOS-specific tests', () => {
    it('should use iOS system font', () => {
      // iOS-specific assertions
    });

    it('should handle swipe back gesture', () => {
      // Test iOS navigation
    });
  });

  describePlatform('android', 'Android-specific tests', () => {
    it('should use Roboto font', () => {
      // Android-specific assertions
    });

    it('should handle hardware back button', () => {
      // Test Android navigation
    });
  });
});

// E2E test utilities for Detox
const platformAction = {
  // Swipe back on iOS, tap back on Android
  goBack: async (element: Detox.NativeElement): Promise<void> => {
    if (Platform.OS === 'ios') {
      await element.swipe('right', 'fast', 0.9);
    } else {
      await device.pressBack();
    }
  },

  // Long press durations differ
  longPress: async (element: Detox.NativeElement): Promise<void> => {
    const duration = Platform.OS === 'ios' ? 500 : 800;
    await element.longPress(duration);
  },

  // Scroll behavior
  scrollTo: async (
    element: Detox.NativeElement,
    direction: 'up' | 'down'
  ): Promise<void> => {
    const speed = Platform.OS === 'ios' ? 'fast' : 'slow';
    await element.scroll(200, direction, NaN, speed);
  },
};

// Snapshot testing configuration
const snapshotConfig = {
  // Different baseline images per platform
  getSnapshotPath: (testName: string): string => {
    return `__snapshots__/${Platform.OS}/${testName}.png`;
  },

  // Tolerance for visual differences
  threshold: Platform.select({
    ios: 0.01,     // iOS rendering is more consistent
    android: 0.05, // Android has more variation across devices
    default: 0.01,
  }),
};

export {
  describePlatform,
  expectPlatformValue,
  platformAction,
  snapshotConfig,
};
```

## Best Practices for Cross-Platform Development

Here are the essential practices for maintaining clean, scalable platform-specific code:

### 1. Create a Platform Utilities Module

```typescript
// utils/platform.ts
import { Platform, Dimensions, PixelRatio } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const iosVersion = isIOS ? parseInt(Platform.Version as string, 10) : 0;
export const androidApiLevel = isAndroid ? (Platform.Version as number) : 0;

// Device type detection
const { width, height } = Dimensions.get('window');
export const isSmallDevice = width < 375;
export const isTablet = (width >= 768) || (height >= 768 && width >= 600);

// Pixel density helpers
export const pixelRatio = PixelRatio.get();
export const fontScale = PixelRatio.getFontScale();

// Normalize sizes across devices
export const normalize = (size: number): number => {
  const scale = width / 375; // Based on iPhone 8 width
  const newSize = size * scale;

  if (isIOS) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};
```

### 2. Use Feature Flags for Platform Differences

```typescript
// config/features.ts
import { Platform } from 'react-native';

interface FeatureFlags {
  useNativeDriver: boolean;
  enableHapticFeedback: boolean;
  useSystemFonts: boolean;
  enableEdgeSwipe: boolean;
  showStatusBarBackground: boolean;
  useBottomTabs: boolean;
  enablePullToRefresh: boolean;
}

export const featureFlags: FeatureFlags = {
  useNativeDriver: true,
  enableHapticFeedback: Platform.OS === 'ios',
  useSystemFonts: true,
  enableEdgeSwipe: Platform.OS === 'ios',
  showStatusBarBackground: Platform.OS === 'android',
  useBottomTabs: Platform.OS === 'ios',
  enablePullToRefresh: true,
};
```

### 3. Centralize Platform-Specific Constants

```typescript
// constants/platform.ts
import { Platform, StatusBar } from 'react-native';

export const HEADER_HEIGHT = Platform.select({
  ios: 44,
  android: 56,
  default: 44,
});

export const STATUS_BAR_HEIGHT = Platform.select({
  ios: 47,
  android: StatusBar.currentHeight || 24,
  default: 0,
});

export const TAB_BAR_HEIGHT = Platform.select({
  ios: 84,
  android: 56,
  default: 56,
});

export const BOTTOM_SAFE_AREA = Platform.select({
  ios: 34,
  android: 0,
  default: 0,
});
```

### 4. Document Platform Differences

```typescript
/**
 * PlatformAwareButton Component
 *
 * Platform Differences:
 * - iOS: Uses TouchableOpacity with opacity feedback
 * - Android: Uses TouchableNativeFeedback with ripple effect
 *
 * Props:
 * @param onPress - Callback when button is pressed
 * @param title - Button text
 * @param variant - 'primary' | 'secondary' | 'outline'
 *
 * Notes:
 * - Android ripple requires overflow: 'hidden' on parent
 * - iOS haptic feedback is enabled for primary buttons
 */
```

### 5. Implement Platform-Specific Hooks

```typescript
// hooks/usePlatformBackHandler.ts
import { useEffect, useCallback } from 'react';
import { Platform, BackHandler } from 'react-native';

type BackHandlerCallback = () => boolean;

export const usePlatformBackHandler = (
  handler: BackHandlerCallback,
  dependencies: React.DependencyList = []
): void => {
  const memoizedHandler = useCallback(handler, dependencies);

  useEffect(() => {
    // Only relevant on Android
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      memoizedHandler
    );

    return () => subscription.remove();
  }, [memoizedHandler]);
};

// hooks/usePlatformStatusBar.ts
import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';

interface StatusBarConfig {
  barStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
  translucent?: boolean;
}

export const usePlatformStatusBar = (config: StatusBarConfig): void => {
  useEffect(() => {
    const { barStyle = 'dark-content', backgroundColor = '#FFFFFF', translucent = true } = config;

    StatusBar.setBarStyle(barStyle);

    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(backgroundColor);
      StatusBar.setTranslucent(translucent);
    }
  }, [config]);
};
```

## Conclusion

Writing platform-specific code in React Native is not about abandoning the cross-platform philosophy, but about embracing the unique characteristics of each platform to deliver the best possible user experience. The techniques covered in this guide provide you with a comprehensive toolkit:

1. **Platform.OS** for simple conditional checks
2. **Platform.select** for clean platform-specific values
3. **File extensions** (.ios.tsx, .android.tsx) for significant component differences
4. **Platform-aware styling** that respects each platform's design language
5. **Proper keyboard and navigation handling** following platform conventions
6. **Permission management** that accounts for system differences
7. **Testing strategies** that validate behavior on both platforms

Remember these key principles:

- Start with shared code and only diverge when necessary
- Keep platform-specific logic centralized and well-documented
- Test thoroughly on both platforms throughout development
- Follow each platform's design guidelines for a native feel
- Use feature flags to manage platform differences cleanly

By mastering these techniques, you can create React Native applications that feel truly native on both iOS and Android while maintaining a largely unified codebase. The goal is not to fight against platform differences but to embrace them thoughtfully, giving users the experience they expect on their chosen platform.

---

*Building cross-platform mobile applications requires balancing code reuse with platform-specific optimization. With the techniques outlined in this guide, you are well-equipped to make informed decisions about when to share code and when to implement platform-specific solutions.*
