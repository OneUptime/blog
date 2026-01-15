# How to Implement Stack Navigation with React Navigation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Navigation, Stack Navigation, Mobile Development, TypeScript

Description: Learn how to implement stack navigation in React Native using React Navigation with TypeScript for type-safe navigation.

---

Stack navigation is one of the most fundamental navigation patterns in mobile applications. It allows users to navigate between screens where each new screen is placed on top of a stack. When users go back, the current screen is popped off the stack, revealing the previous screen. In this comprehensive guide, we'll explore how to implement stack navigation in React Native using React Navigation with TypeScript.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing React Navigation](#installing-react-navigation)
3. [Setting Up the Navigation Container](#setting-up-the-navigation-container)
4. [Creating a Stack Navigator](#creating-a-stack-navigator)
5. [Screen Options Configuration](#screen-options-configuration)
6. [Passing Parameters Between Screens](#passing-parameters-between-screens)
7. [TypeScript Type Definitions](#typescript-type-definitions)
8. [Custom Header Components](#custom-header-components)
9. [Screen Transitions and Animations](#screen-transitions-and-animations)
10. [Nested Stack Navigators](#nested-stack-navigators)
11. [Navigation Events and Lifecycle](#navigation-events-and-lifecycle)
12. [Deep Linking with Stack Navigation](#deep-linking-with-stack-navigation)
13. [Best Practices and Patterns](#best-practices-and-patterns)

## Prerequisites

Before we begin, ensure you have:

- Node.js installed (v18 or higher recommended)
- React Native development environment set up
- Basic knowledge of React Native and TypeScript
- A React Native project initialized

## Installing React Navigation

First, let's install the required packages for React Navigation. Open your terminal and run:

```bash
# Install the core package
npm install @react-navigation/native

# Install dependencies for React Native
npm install react-native-screens react-native-safe-area-context

# Install the stack navigator
npm install @react-navigation/stack

# Install gesture handler for stack navigation
npm install react-native-gesture-handler
```

For iOS, you'll also need to install the native dependencies:

```bash
cd ios && pod install && cd ..
```

Additionally, you need to add the following import at the very top of your entry file (e.g., `index.js` or `App.tsx`):

```typescript
import 'react-native-gesture-handler';
```

This import must be at the top of your entry file, before any other imports, to ensure proper initialization of the gesture handler.

## Setting Up the Navigation Container

The `NavigationContainer` is a component that manages the navigation tree and contains the navigation state. It must wrap all navigator structures in your app.

Create a new file called `App.tsx`:

```typescript
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
```

The `NavigationContainer` provides several useful props:

```typescript
import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';

const App: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        console.log('Navigation container is ready');
      }}
      onStateChange={(state) => {
        console.log('New navigation state:', state);
      }}
      fallback={<LoadingScreen />}
    >
      <AppNavigator />
    </NavigationContainer>
  );
};
```

## Creating a Stack Navigator

Now let's create a basic stack navigator. Create a file called `navigation/AppNavigator.tsx`:

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screen components
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Define the parameter list for type safety
export type RootStackParamList = {
  Home: undefined;
  Details: { itemId: number; title: string };
  Profile: { userId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
```

Let's create the screen components. First, `screens/HomeScreen.tsx`:

```typescript
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Button
        title="Go to Details"
        onPress={() =>
          navigation.navigate('Details', {
            itemId: 42,
            title: 'Sample Item',
          })
        }
      />
      <Button
        title="Go to Profile"
        onPress={() =>
          navigation.navigate('Profile', {
            userId: 'user-123',
          })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default HomeScreen;
```

And `screens/DetailsScreen.tsx`:

```typescript
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type DetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;
type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

interface DetailsScreenProps {
  navigation: DetailsScreenNavigationProp;
  route: DetailsScreenRouteProp;
}

const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation, route }) => {
  const { itemId, title } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details Screen</Text>
      <Text style={styles.info}>Item ID: {itemId}</Text>
      <Text style={styles.info}>Title: {title}</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
      <Button
        title="Go to Home"
        onPress={() => navigation.navigate('Home')}
      />
      <Button
        title="Replace with Profile"
        onPress={() =>
          navigation.replace('Profile', { userId: 'user-456' })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default DetailsScreen;
```

## Screen Options Configuration

You can customize the appearance and behavior of screens using screen options. There are multiple ways to configure them:

### Navigator-level options

```typescript
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200EE',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
        gestureEnabled: true,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};
```

### Screen-level options

```typescript
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={{
    title: 'Item Details',
    headerStyle: {
      backgroundColor: '#03DAC6',
    },
    headerTintColor: '#000',
    headerRight: () => (
      <TouchableOpacity onPress={() => alert('Menu pressed')}>
        <Text style={{ marginRight: 15 }}>Menu</Text>
      </TouchableOpacity>
    ),
  }}
/>
```

### Dynamic options based on route params

```typescript
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={({ route, navigation }) => ({
    title: route.params.title,
    headerRight: () => (
      <TouchableOpacity
        onPress={() => navigation.navigate('Profile', { userId: 'user-123' })}
      >
        <Text style={{ marginRight: 15 }}>Profile</Text>
      </TouchableOpacity>
    ),
  })}
/>
```

### Setting options from within a screen

```typescript
import React, { useLayoutEffect } from 'react';

const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation, route }) => {
  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params.title,
      headerRight: () => (
        <Button onPress={() => setCount((c) => c + 1)} title="Update" />
      ),
    });
  }, [navigation, route.params.title]);

  return (
    // Screen content
  );
};
```

## Passing Parameters Between Screens

React Navigation provides several ways to pass and access parameters between screens.

### Passing parameters when navigating

```typescript
// Pass parameters when navigating
navigation.navigate('Details', {
  itemId: 42,
  title: 'Sample Item',
});

// You can also pass parameters with push
navigation.push('Details', {
  itemId: 43,
  title: 'Another Item',
});
```

### Accessing parameters in the destination screen

```typescript
const DetailsScreen: React.FC<DetailsScreenProps> = ({ route }) => {
  // Access parameters from route.params
  const { itemId, title } = route.params;

  return (
    <View>
      <Text>Item ID: {itemId}</Text>
      <Text>Title: {title}</Text>
    </View>
  );
};
```

### Setting initial parameters

```typescript
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  initialParams={{ itemId: 0, title: 'Default Title' }}
/>
```

### Updating parameters

```typescript
// Update parameters from within a screen
navigation.setParams({
  title: 'Updated Title',
});
```

### Passing parameters back to the previous screen

```typescript
// In DetailsScreen - pass data back
navigation.navigate({
  name: 'Home',
  params: { selectedItem: itemId },
  merge: true,
});

// In HomeScreen - receive the data
const HomeScreen: React.FC<HomeScreenProps> = ({ route }) => {
  const selectedItem = route.params?.selectedItem;

  useEffect(() => {
    if (selectedItem) {
      console.log('Received selected item:', selectedItem);
    }
  }, [selectedItem]);

  return (
    // Screen content
  );
};
```

## TypeScript Type Definitions

Type safety is crucial in React Navigation. Here's a comprehensive approach to typing your navigation:

### Define the param list type

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  Details: { itemId: number; title: string };
  Profile: { userId: string };
  Settings: { section?: string };
  Search: { query: string; filters?: SearchFilters };
};

export interface SearchFilters {
  category: string;
  minPrice?: number;
  maxPrice?: number;
}
```

### Create typed navigation hooks

```typescript
// navigation/hooks.ts
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Generic navigation hook
export const useAppNavigation = <T extends keyof RootStackParamList>() => {
  return useNavigation<StackNavigationProp<RootStackParamList, T>>();
};

// Generic route hook
export const useAppRoute = <T extends keyof RootStackParamList>() => {
  return useRoute<RouteProp<RootStackParamList, T>>();
};

// Screen-specific hooks
export const useHomeNavigation = () => {
  return useNavigation<StackNavigationProp<RootStackParamList, 'Home'>>();
};

export const useDetailsRoute = () => {
  return useRoute<RouteProp<RootStackParamList, 'Details'>>();
};
```

### Type the navigation prop in screen components

```typescript
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// Using composite props
type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation, route }) => {
  // Both navigation and route are fully typed
  const { itemId, title } = route.params;

  return (
    // Screen content
  );
};

// Alternative: Separate navigation and route props
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

interface ProfileScreenProps {
  navigation: StackNavigationProp<RootStackParamList, 'Profile'>;
  route: RouteProp<RootStackParamList, 'Profile'>;
}
```

### Global type declaration for useNavigation

```typescript
// navigation/types.ts
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

This allows you to use `useNavigation()` without explicitly typing it each time:

```typescript
// Now this is automatically typed
const navigation = useNavigation();
navigation.navigate('Details', { itemId: 1, title: 'Test' }); // Type-safe!
```

## Custom Header Components

You can create fully custom headers to match your app's design:

### Simple custom header

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomHeaderProps extends StackHeaderProps {
  title: string;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  navigation,
  route,
  options,
  back,
}) => {
  const insets = useSafeAreaInsets();
  const title =
    options.headerTitle !== undefined
      ? options.headerTitle
      : options.title !== undefined
      ? options.title
      : route.name;

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {back && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigation.goBack}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title as string}</Text>
        <View style={styles.rightContainer}>
          {options.headerRight &&
            options.headerRight({ canGoBack: !!back })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6200EE',
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  rightContainer: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
});

export default CustomHeader;
```

### Using the custom header

```typescript
<Stack.Navigator
  screenOptions={{
    header: (props) => <CustomHeader {...props} />,
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Details" component={DetailsScreen} />
</Stack.Navigator>
```

### Animated header with scroll

```typescript
import React from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';

interface AnimatedHeaderProps {
  scrollY: Animated.Value;
  title: string;
}

const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 60;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({ scrollY, title }) => {
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <Animated.Text style={[styles.heroTitle, { opacity: heroOpacity }]}>
        {title}
      </Animated.Text>
      <Animated.Text style={[styles.collapsedTitle, { opacity: titleOpacity }]}>
        {title}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#6200EE',
    overflow: 'hidden',
    zIndex: 1,
  },
  heroTitle: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  collapsedTitle: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default AnimatedHeader;
```

## Screen Transitions and Animations

React Navigation provides various animation presets and allows custom animations:

### Built-in animation presets

```typescript
import {
  CardStyleInterpolators,
  TransitionPresets,
  TransitionSpecs,
} from '@react-navigation/stack';

<Stack.Navigator
  screenOptions={{
    // Horizontal slide animation (iOS-like)
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    transitionSpec: {
      open: TransitionSpecs.TransitionIOSSpec,
      close: TransitionSpecs.TransitionIOSSpec,
    },
  }}
>
  {/* Screens */}
</Stack.Navigator>

// Or use preset combinations
<Stack.Navigator
  screenOptions={{
    ...TransitionPresets.SlideFromRightIOS,
  }}
>
  {/* Screens */}
</Stack.Navigator>
```

### Available transition presets

```typescript
// Slide from right (iOS default)
TransitionPresets.SlideFromRightIOS

// Modal presentation (iOS)
TransitionPresets.ModalPresentationIOS

// Modal slide from bottom (iOS)
TransitionPresets.ModalSlideFromBottomIOS

// Fade transition
TransitionPresets.FadeFromBottomAndroid

// Default Android transition
TransitionPresets.DefaultTransition

// Scale transition
TransitionPresets.ScaleFromCenterAndroid
```

### Custom transition animations

```typescript
import { StackCardInterpolationProps } from '@react-navigation/stack';
import { Animated } from 'react-native';

const forFade = ({ current }: StackCardInterpolationProps) => ({
  cardStyle: {
    opacity: current.progress,
  },
});

const forSlideFromBottom = ({
  current,
  layouts,
}: StackCardInterpolationProps) => ({
  cardStyle: {
    transform: [
      {
        translateY: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.height, 0],
        }),
      },
    ],
  },
});

const forRotate = ({
  current,
  next,
  layouts,
}: StackCardInterpolationProps) => ({
  cardStyle: {
    transform: [
      {
        rotateY: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['90deg', '0deg'],
        }),
      },
      {
        scale: next
          ? next.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.9],
            })
          : 1,
      },
    ],
  },
  overlayStyle: {
    opacity: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    }),
  },
});

// Use custom animation
<Stack.Screen
  name="Modal"
  component={ModalScreen}
  options={{
    cardStyleInterpolator: forSlideFromBottom,
    gestureDirection: 'vertical',
  }}
/>
```

### Custom gesture configuration

```typescript
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={{
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    gestureResponseDistance: 100, // Distance from edge to trigger gesture
    cardOverlayEnabled: true,
  }}
/>
```

## Nested Stack Navigators

You can nest multiple stack navigators for complex navigation structures:

### Basic nested structure

```typescript
// navigation/MainStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import SettingsStackNavigator from './SettingsStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';

export type MainStackParamList = {
  Home: undefined;
  SettingsStack: undefined;
  ProfileStack: { userId: string };
};

const MainStack = createStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen
        name="SettingsStack"
        component={SettingsStackNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />
    </MainStack.Navigator>
  );
};

export default MainStackNavigator;
```

```typescript
// navigation/SettingsStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';

export type SettingsStackParamList = {
  Settings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: { category?: string };
};

const SettingsStack = createStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator: React.FC = () => {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
      <SettingsStack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy' }}
      />
    </SettingsStack.Navigator>
  );
};

export default SettingsStackNavigator;
```

### Navigating between nested navigators

```typescript
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Define composite navigation type
type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MainStackParamList, 'Home'>,
  StackNavigationProp<SettingsStackParamList>
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View>
      {/* Navigate to nested stack */}
      <Button
        title="Go to Settings"
        onPress={() => navigation.navigate('SettingsStack')}
      />

      {/* Navigate to specific screen in nested stack */}
      <Button
        title="Go to Privacy Settings"
        onPress={() =>
          navigation.navigate('SettingsStack', {
            screen: 'PrivacySettings',
            params: { category: 'security' },
          })
        }
      />
    </View>
  );
};
```

### Type-safe nested navigation

```typescript
// navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type SettingsStackParamList = {
  Settings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: { category?: string };
};

export type ProfileStackParamList = {
  Profile: { userId: string };
  EditProfile: undefined;
  FollowersList: { userId: string };
};

export type MainStackParamList = {
  Home: undefined;
  SettingsStack: NavigatorScreenParams<SettingsStackParamList>;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

// Now navigation.navigate is fully typed for nested navigators
navigation.navigate('SettingsStack', {
  screen: 'PrivacySettings',
  params: { category: 'account' },
});
```

## Navigation Events and Lifecycle

React Navigation provides hooks and listeners for handling navigation events:

### Focus and blur events

```typescript
import React, { useEffect } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

const DetailsScreen: React.FC = () => {
  const isFocused = useIsFocused();

  // Using useEffect with isFocused
  useEffect(() => {
    if (isFocused) {
      console.log('Screen is focused');
      // Fetch data, start animations, etc.
    }
  }, [isFocused]);

  // Using useFocusEffect (recommended for side effects)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Screen focused');

      // Subscribe to events, fetch data, etc.
      const subscription = subscribeToData();

      return () => {
        console.log('Screen blurred');
        // Cleanup: unsubscribe, cancel requests, etc.
        subscription.unsubscribe();
      };
    }, [])
  );

  return (
    // Screen content
  );
};
```

### Navigation event listeners

```typescript
import React, { useEffect } from 'react';

const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation }) => {
  useEffect(() => {
    // Listen to focus event
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('Screen focused');
    });

    // Listen to blur event
    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('Screen blurred');
    });

    // Listen to before remove event (useful for preventing back navigation)
    const unsubscribeBeforeRemove = navigation.addListener(
      'beforeRemove',
      (e) => {
        if (hasUnsavedChanges) {
          // Prevent default behavior (going back)
          e.preventDefault();

          // Show confirmation dialog
          Alert.alert(
            'Discard changes?',
            'You have unsaved changes. Are you sure you want to leave?',
            [
              { text: "Don't leave", style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => navigation.dispatch(e.data.action),
              },
            ]
          );
        }
      }
    );

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      unsubscribeBeforeRemove();
    };
  }, [navigation, hasUnsavedChanges]);

  return (
    // Screen content
  );
};
```

### State persistence

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';

const PERSISTENCE_KEY = 'NAVIGATION_STATE';

const App: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [initialState, setInitialState] = React.useState();

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString
          ? JSON.parse(savedStateString)
          : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) =>
        AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
      }
    >
      <AppNavigator />
    </NavigationContainer>
  );
};
```

## Deep Linking with Stack Navigation

Deep linking allows users to navigate to specific screens via URLs:

### Basic deep linking configuration

```typescript
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      Details: {
        path: 'details/:itemId',
        parse: {
          itemId: (itemId: string) => parseInt(itemId, 10),
        },
        stringify: {
          itemId: (itemId: number) => itemId.toString(),
        },
      },
      Profile: 'profile/:userId',
      Settings: 'settings',
    },
  },
};

const App: React.FC = () => {
  return (
    <NavigationContainer
      linking={linking}
      fallback={<LoadingScreen />}
    >
      <AppNavigator />
    </NavigationContainer>
  );
};
```

### Nested navigator deep linking

```typescript
const linking: LinkingOptions<MainStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      SettingsStack: {
        screens: {
          Settings: 'settings',
          NotificationSettings: 'settings/notifications',
          PrivacySettings: 'settings/privacy/:category?',
        },
      },
      ProfileStack: {
        screens: {
          Profile: 'profile/:userId',
          EditProfile: 'profile/:userId/edit',
          FollowersList: 'profile/:userId/followers',
        },
      },
    },
  },
};
```

### Handling deep links programmatically

```typescript
import { useNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';

const App: React.FC = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      // Parse the URL and navigate accordingly
      if (url.includes('details/')) {
        const itemId = url.split('details/')[1];
        navigationRef.navigate('Details', {
          itemId: parseInt(itemId, 10),
          title: 'Deep Linked Item',
        });
      }
    };

    // Handle initial URL (when app is launched from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <AppNavigator />
    </NavigationContainer>
  );
};
```

### Testing deep links

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://details/123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "myapp://details/123" com.myapp

# React Native CLI
npx uri-scheme open "myapp://details/123" --ios
npx uri-scheme open "myapp://details/123" --android
```

## Best Practices and Patterns

### 1. Centralize navigation types

```typescript
// navigation/types.ts
export type RootStackParamList = {
  // All your screen types
};

// Declare global types for automatic typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### 2. Create typed navigation utilities

```typescript
// navigation/utils.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function resetToHome() {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }
}
```

### 3. Separate navigation logic from screens

```typescript
// hooks/useScreenNavigation.ts
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

export const useDetailsNavigation = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'Details'>>();

  const goToProfile = (userId: string) => {
    navigation.navigate('Profile', { userId });
  };

  const goBack = () => {
    navigation.goBack();
  };

  const replaceWithHome = () => {
    navigation.replace('Home');
  };

  return { goToProfile, goBack, replaceWithHome };
};
```

### 4. Use screen components pattern

```typescript
// screens/index.ts
export { default as HomeScreen } from './HomeScreen';
export { default as DetailsScreen } from './DetailsScreen';
export { default as ProfileScreen } from './ProfileScreen';

// navigation/AppNavigator.tsx
import { HomeScreen, DetailsScreen, ProfileScreen } from '../screens';
```

### 5. Handle loading and error states

```typescript
const App: React.FC = () => {
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  return (
    <NavigationContainer
      onReady={() => setIsNavigationReady(true)}
      fallback={<SplashScreen />}
    >
      {isNavigationReady ? (
        <AppNavigator />
      ) : (
        <LoadingIndicator />
      )}
    </NavigationContainer>
  );
};
```

### 6. Implement analytics tracking

```typescript
import analytics from '@react-native-firebase/analytics';

const App: React.FC = () => {
  const routeNameRef = useRef<string>();

  return (
    <NavigationContainer
      onReady={() => {
        routeNameRef.current = navigationRef.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.getCurrentRoute()?.name;

        if (previousRouteName !== currentRouteName) {
          await analytics().logScreenView({
            screen_name: currentRouteName,
            screen_class: currentRouteName,
          });
        }

        routeNameRef.current = currentRouteName;
      }}
    >
      <AppNavigator />
    </NavigationContainer>
  );
};
```

### 7. Optimize screen rendering

```typescript
// Use React.memo for screen components
const DetailsScreen: React.FC<DetailsScreenProps> = React.memo(
  ({ navigation, route }) => {
    // Screen implementation
  }
);

// Lazy load screens for better performance
const ProfileScreen = React.lazy(() => import('../screens/ProfileScreen'));

// In navigator
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  options={{
    lazy: true, // Enable lazy loading
  }}
/>
```

### 8. Handle hardware back button (Android)

```typescript
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const DetailsScreen: React.FC<DetailsScreenProps> = ({ navigation }) => {
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Custom back behavior
        if (hasUnsavedChanges) {
          showDiscardAlert();
          return true; // Prevent default behavior
        }
        return false; // Use default behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [hasUnsavedChanges])
  );

  return (
    // Screen content
  );
};
```

## Conclusion

Stack navigation is a powerful and flexible navigation pattern that forms the foundation of most React Native applications. By following the patterns and best practices outlined in this guide, you can create a robust, type-safe, and maintainable navigation system.

Key takeaways:

1. **Type Safety**: Always define param lists and use TypeScript for compile-time safety
2. **Modularity**: Separate navigation logic into reusable hooks and utilities
3. **Performance**: Use lazy loading and memoization for better performance
4. **User Experience**: Implement smooth transitions and proper gesture handling
5. **Deep Linking**: Configure deep links for better app discoverability
6. **Analytics**: Track navigation events for user behavior insights

React Navigation continues to evolve, so make sure to check the official documentation for the latest features and best practices. Happy coding!

## Additional Resources

- [React Navigation Official Documentation](https://reactnavigation.org/)
- [TypeScript with React Navigation](https://reactnavigation.org/docs/typescript/)
- [Deep Linking Guide](https://reactnavigation.org/docs/deep-linking/)
- [Screen Options Reference](https://reactnavigation.org/docs/screen-options/)
