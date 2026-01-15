# How to Implement Nested Navigation in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Navigation, Nested Navigation, Mobile Development, TypeScript

Description: Learn how to implement complex nested navigation patterns in React Native combining stacks, tabs, and drawers effectively.

---

Navigation is one of the most critical aspects of mobile app development. As your React Native application grows, you will inevitably need to combine multiple navigation patterns to create intuitive user experiences. This comprehensive guide explores nested navigation in React Native using React Navigation, the most popular navigation library in the ecosystem.

## Table of Contents

1. [Understanding Nested Navigators](#understanding-nested-navigators)
2. [Stack Inside Tabs Pattern](#stack-inside-tabs-pattern)
3. [Tabs Inside Stack Pattern](#tabs-inside-stack-pattern)
4. [Drawer with Nested Navigators](#drawer-with-nested-navigators)
5. [Navigating Between Nested Screens](#navigating-between-nested-screens)
6. [TypeScript Type Definitions](#typescript-type-definitions)
7. [Screen Options Inheritance](#screen-options-inheritance)
8. [Header Configuration](#header-configuration)
9. [Resetting Navigation State](#resetting-navigation-state)
10. [Focus Events](#focus-events)
11. [Common Patterns and Anti-Patterns](#common-patterns-and-anti-patterns)
12. [Debugging Nested Navigation](#debugging-nested-navigation)

## Prerequisites

Before diving in, ensure you have React Navigation installed:

```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs @react-navigation/drawer
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

## Understanding Nested Navigators

Nested navigation refers to rendering one navigator inside a screen of another navigator. This pattern allows you to create complex navigation structures that mirror real-world app requirements.

### Why Nest Navigators?

Consider a typical e-commerce app:
- A bottom tab bar for main sections (Home, Search, Cart, Profile)
- Each tab contains its own stack of screens
- A drawer menu for additional options
- Modal screens that overlay everything

This requires nesting multiple navigator types strategically.

### The Navigation Tree

Think of nested navigation as a tree structure:

```
Root Navigator (Stack)
├── Auth Stack
│   ├── Login Screen
│   └── Register Screen
└── Main Navigator (Drawer)
    ├── Drawer Content
    └── Tab Navigator
        ├── Home Stack
        │   ├── Home Screen
        │   └── Product Details
        ├── Search Stack
        │   ├── Search Screen
        │   └── Search Results
        └── Profile Stack
            ├── Profile Screen
            └── Edit Profile
```

## Stack Inside Tabs Pattern

The most common nested navigation pattern is having stack navigators inside each tab. This allows users to navigate deeper within a tab while maintaining the tab bar.

### Basic Implementation

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Button } from 'react-native';

// Screen Components
const HomeScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Home Screen</Text>
    <Button
      title="Go to Details"
      onPress={() => navigation.navigate('HomeDetails')}
    />
  </View>
);

const HomeDetailsScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Home Details</Text>
    <Button title="Go Back" onPress={() => navigation.goBack()} />
  </View>
);

const ProfileScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Profile Screen</Text>
    <Button
      title="Edit Profile"
      onPress={() => navigation.navigate('EditProfile')}
    />
  </View>
);

const EditProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Edit Profile Screen</Text>
  </View>
);

// Create navigators
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Stack navigators for each tab
const HomeStackNavigator = () => (
  <HomeStack.Navigator>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="HomeDetails" component={HomeDetailsScreen} />
  </HomeStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileStack.Navigator>
);

// Main Tab Navigator
const App = () => (
  <NavigationContainer>
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

export default App;
```

### Key Points

1. **Header Management**: Set `headerShown: false` on tab screens to avoid double headers
2. **Screen Naming**: Use unique names across all navigators to avoid conflicts
3. **Tab Persistence**: Each tab maintains its own navigation state

## Tabs Inside Stack Pattern

Sometimes you need tabs nested inside a stack navigator. This is useful when you want to show tabs only after authentication or on specific screens.

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Button } from 'react-native';

// Auth Screens
const LoginScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Login Screen</Text>
    <Button
      title="Login"
      onPress={() => navigation.replace('MainTabs')}
    />
  </View>
);

// Tab Screens
const DashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Dashboard</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Settings</Text>
  </View>
);

// Modal Screen (outside tabs)
const ModalScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Modal Screen</Text>
    <Button title="Close" onPress={() => navigation.goBack()} />
  </View>
);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const App = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Modal"
        component={ModalScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default App;
```

### Benefits of This Pattern

- **Clean Authentication Flow**: Show tabs only after login
- **Modal Screens**: Display modals that overlay the entire app including tabs
- **Flexible Transitions**: Control how tabs appear in the navigation flow

## Drawer with Nested Navigators

Drawer navigation combined with other navigators creates sophisticated navigation patterns commonly seen in enterprise applications.

```typescript
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Button, TouchableOpacity } from 'react-native';

// Screen Components
const HomeScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Home Screen</Text>
    <Button
      title="Open Drawer"
      onPress={() => navigation.openDrawer()}
    />
    <Button
      title="Go to Details"
      onPress={() => navigation.navigate('Details')}
    />
  </View>
);

const DetailsScreen = ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Details Screen</Text>
    <Button title="Go Back" onPress={() => navigation.goBack()} />
  </View>
);

const NotificationsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Notifications</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Settings</Text>
  </View>
);

const AboutScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>About</Text>
  </View>
);

// Create navigators
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Home Stack
const HomeStackNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="HomeMain"
      component={HomeScreen}
      options={({ navigation }) => ({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={{ marginLeft: 15 }}
          >
            <Text>Menu</Text>
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen name="Details" component={DetailsScreen} />
  </Stack.Navigator>
);

// Tab Navigator
const MainTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
  </Tab.Navigator>
);

// Drawer Navigator
const App = () => (
  <NavigationContainer>
    <Drawer.Navigator>
      <Drawer.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  </NavigationContainer>
);

export default App;
```

### Custom Drawer Content

For more control over the drawer, create custom content:

```typescript
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';

const CustomDrawerContent = (props: any) => {
  return (
    <DrawerContentScrollView {...props}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24 }}>My App</Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Logout"
        onPress={() => {
          // Handle logout
          props.navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }}
      />
    </DrawerContentScrollView>
  );
};

// Use it in Drawer.Navigator
<Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />}>
  {/* screens */}
</Drawer.Navigator>
```

## Navigating Between Nested Screens

Navigating between screens in nested navigators requires understanding navigation paths.

### Basic Navigation

```typescript
// Navigate to a screen in the same navigator
navigation.navigate('ScreenName');

// Navigate to a screen in a nested navigator
navigation.navigate('ParentScreen', {
  screen: 'NestedScreen',
  params: { itemId: 123 },
});

// Navigate deeply nested
navigation.navigate('TabNavigator', {
  screen: 'HomeTab',
  params: {
    screen: 'Details',
    params: { itemId: 456 },
  },
});
```

### Using navigation.getParent()

Access parent navigators to perform actions:

```typescript
const MyScreen = ({ navigation }: any) => {
  const handleOpenDrawer = () => {
    // Get parent drawer navigator
    const parent = navigation.getParent('DrawerNavigator');
    if (parent) {
      parent.openDrawer();
    }
  };

  const handleSwitchTab = () => {
    // Get parent tab navigator
    const tabNavigator = navigation.getParent('TabNavigator');
    if (tabNavigator) {
      tabNavigator.navigate('ProfileTab');
    }
  };

  return (
    <View>
      <Button title="Open Drawer" onPress={handleOpenDrawer} />
      <Button title="Switch Tab" onPress={handleSwitchTab} />
    </View>
  );
};
```

### Navigator IDs

Assign IDs to navigators for easier access:

```typescript
<Drawer.Navigator id="DrawerNavigator">
  {/* screens */}
</Drawer.Navigator>

<Tab.Navigator id="TabNavigator">
  {/* screens */}
</Tab.Navigator>
```

## TypeScript Type Definitions

Proper TypeScript typing for nested navigation prevents runtime errors and improves developer experience.

### Defining Navigation Types

```typescript
import { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { DrawerScreenProps } from '@react-navigation/drawer';

// Define param lists for each navigator
type HomeStackParamList = {
  HomeMain: undefined;
  ProductDetails: { productId: string };
  ProductReviews: { productId: string; reviewCount: number };
};

type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: { userId: string };
  Settings: undefined;
};

type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: undefined;
  Cart: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

type DrawerParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  Favorites: undefined;
  Orders: undefined;
  Support: undefined;
};

type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<DrawerParamList>;
  Modal: { title: string };
};

// Screen Props Types
type HomeScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, 'HomeMain'>,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    DrawerScreenProps<DrawerParamList>
  >
>;

type ProductDetailsProps = StackScreenProps<HomeStackParamList, 'ProductDetails'>;

// Usage in components
const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  // TypeScript knows all available navigation methods
  const goToProduct = () => {
    navigation.navigate('ProductDetails', { productId: '123' });
  };

  const switchToProfile = () => {
    navigation.navigate('Profile', {
      screen: 'ProfileMain',
    });
  };

  return (
    <View>
      <Button title="View Product" onPress={goToProduct} />
      <Button title="Go to Profile" onPress={switchToProfile} />
    </View>
  );
};

const ProductDetailsScreen: React.FC<ProductDetailsProps> = ({ route }) => {
  // TypeScript knows route.params.productId exists
  const { productId } = route.params;

  return (
    <View>
      <Text>Product ID: {productId}</Text>
    </View>
  );
};
```

### Global Type Declaration

Create a declaration file for global navigation types:

```typescript
// navigation.d.ts
import { RootStackParamList } from './types';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

This enables type checking for `useNavigation` hook without explicit typing:

```typescript
const navigation = useNavigation();
// TypeScript now knows about all screens
navigation.navigate('Main', { screen: 'MainTabs' });
```

## Screen Options Inheritance

Understanding how screen options propagate through nested navigators is crucial for consistent UI.

### Options Hierarchy

```typescript
// Navigator-level defaults
<Stack.Navigator
  screenOptions={{
    headerStyle: { backgroundColor: '#6200EE' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
>
  {/* All screens inherit these options */}

  <Stack.Screen
    name="Home"
    component={HomeScreen}
    // Screen-level options override navigator defaults
    options={{
      title: 'Welcome Home',
      headerStyle: { backgroundColor: '#03DAC6' }, // Overrides
    }}
  />

  <Stack.Screen
    name="Details"
    component={DetailsScreen}
    // Dynamic options based on route params
    options={({ route }) => ({
      title: route.params?.title || 'Details',
    })}
  />
</Stack.Navigator>
```

### Setting Options from Screen Component

```typescript
const ProfileScreen = ({ navigation }: any) => {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          title="Edit"
          onPress={() => navigation.navigate('EditProfile')}
        />
      ),
    });
  }, [navigation]);

  return (
    <View>
      <Text>Profile</Text>
    </View>
  );
};
```

### Options in Nested Navigators

When navigating to a nested screen, you can pass options:

```typescript
navigation.navigate('Home', {
  screen: 'Details',
  params: { itemId: 123 },
  // These options apply to the target screen
  initial: false, // Don't reset navigation state
});
```

## Header Configuration

Headers in nested navigators require careful configuration to avoid conflicts.

### Hiding Duplicate Headers

```typescript
// Parent Tab Navigator - hide its header
<Tab.Navigator screenOptions={{ headerShown: false }}>
  <Tab.Screen name="Home" component={HomeStack} />
</Tab.Navigator>

// Child Stack Navigator - shows its own header
const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="HomeMain"
      component={HomeScreen}
      options={{ title: 'Home' }}
    />
  </Stack.Navigator>
);
```

### Shared Header Elements

Create consistent headers across nested navigators:

```typescript
const commonHeaderOptions = {
  headerStyle: {
    backgroundColor: '#1a1a2e',
  },
  headerTintColor: '#eee',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  headerBackTitleVisible: false,
};

// Apply to multiple navigators
<HomeStack.Navigator screenOptions={commonHeaderOptions}>
  {/* screens */}
</HomeStack.Navigator>

<ProfileStack.Navigator screenOptions={commonHeaderOptions}>
  {/* screens */}
</ProfileStack.Navigator>
```

### Custom Header Component

```typescript
const CustomHeader = ({ navigation, route, options }: any) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{options.title || route.name}</Text>
      <View style={{ width: 50 }} />
    </View>
  );
};

<Stack.Navigator
  screenOptions={{
    header: (props) => <CustomHeader {...props} />,
  }}
>
  {/* screens */}
</Stack.Navigator>
```

## Resetting Navigation State

Resetting navigation state is essential for scenarios like logout or completing a flow.

### CommonActions.reset

```typescript
import { CommonActions } from '@react-navigation/native';

// Reset to a single screen
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  })
);

// Reset with nested navigation state
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'Main',
        state: {
          routes: [
            {
              name: 'Tabs',
              state: {
                routes: [{ name: 'Home' }],
              },
            },
          ],
        },
      },
    ],
  })
);
```

### StackActions for Stack Navigators

```typescript
import { StackActions } from '@react-navigation/stack';

// Replace current screen
navigation.dispatch(StackActions.replace('NewScreen', { param: 'value' }));

// Push a new screen (even if it's already in the stack)
navigation.dispatch(StackActions.push('Screen', { param: 'value' }));

// Pop multiple screens
navigation.dispatch(StackActions.pop(2));

// Pop to the first screen
navigation.dispatch(StackActions.popToTop());
```

### Tab-specific Reset

```typescript
import { TabActions } from '@react-navigation/native';

// Jump to a tab and reset its stack
navigation.dispatch(TabActions.jumpTo('Home'));

// Then reset the stack within that tab
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'HomeMain' }],
  })
);
```

## Focus Events

Handling focus events in nested navigators requires special attention since inner screens may not receive focus events properly.

### Using useFocusEffect

```typescript
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const ProductListScreen = () => {
  useFocusEffect(
    useCallback(() => {
      // Called when screen gains focus
      console.log('Screen focused');
      fetchProducts();

      return () => {
        // Called when screen loses focus
        console.log('Screen blurred');
        cleanup();
      };
    }, [])
  );

  return <View>{/* content */}</View>;
};
```

### Focus in Nested Screens

```typescript
const NestedScreen = ({ navigation }: any) => {
  React.useEffect(() => {
    // Listen to focus events from parent navigators
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Nested screen focused');
    });

    return unsubscribe;
  }, [navigation]);

  // Also listen to tab press events
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Prevent default behavior
      e.preventDefault();

      // Custom logic
      if (shouldReset) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'NestedMain' }],
        });
      }
    });

    return unsubscribe;
  }, [navigation]);

  return <View>{/* content */}</View>;
};
```

### beforeRemove Event

Prevent accidental navigation away from screens:

```typescript
const EditScreen = ({ navigation }: any) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  return <View>{/* form content */}</View>;
};
```

## Common Patterns and Anti-Patterns

### Recommended Patterns

**1. Authentication Flow Pattern**

```typescript
const RootNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
```

**2. Modal Pattern**

```typescript
<Stack.Navigator>
  <Stack.Group>
    <Stack.Screen name="Main" component={MainTabs} />
  </Stack.Group>
  <Stack.Group screenOptions={{ presentation: 'modal' }}>
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Group>
</Stack.Navigator>
```

**3. Conditional Tabs Pattern**

```typescript
const TabNavigator = () => {
  const { isAdmin } = useUser();

  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

### Anti-Patterns to Avoid

**1. Duplicate Screen Names**

```typescript
// BAD - Same screen name in different navigators
<HomeStack.Navigator>
  <HomeStack.Screen name="Details" component={HomeDetails} />
</HomeStack.Navigator>

<ProfileStack.Navigator>
  <ProfileStack.Screen name="Details" component={ProfileDetails} />
</ProfileStack.Navigator>

// GOOD - Unique names
<HomeStack.Navigator>
  <HomeStack.Screen name="HomeDetails" component={HomeDetails} />
</HomeStack.Navigator>

<ProfileStack.Navigator>
  <ProfileStack.Screen name="ProfileDetails" component={ProfileDetails} />
</ProfileStack.Navigator>
```

**2. Deeply Nested Navigation (More than 3 levels)**

```typescript
// BAD - Too deeply nested
Drawer > Tabs > Stack > Stack > Stack

// GOOD - Flatten structure where possible
Drawer > Tabs > Stack (with modals as separate group)
```

**3. Navigation Logic in Render**

```typescript
// BAD - Navigation in render causes infinite loops
const Screen = ({ navigation }) => {
  if (someCondition) {
    navigation.navigate('Other'); // Don't do this!
  }
  return <View />;
};

// GOOD - Use useEffect
const Screen = ({ navigation }) => {
  useEffect(() => {
    if (someCondition) {
      navigation.navigate('Other');
    }
  }, [someCondition, navigation]);

  return <View />;
};
```

**4. Passing Navigation as Prop Deep in Component Tree**

```typescript
// BAD - Prop drilling
<Parent navigation={navigation}>
  <Child navigation={navigation}>
    <GrandChild navigation={navigation} />
  </Child>
</Parent>

// GOOD - Use hooks
const GrandChild = () => {
  const navigation = useNavigation();
  // Use navigation directly
};
```

## Debugging Nested Navigation

Debugging nested navigation issues requires understanding the navigation state structure.

### Enabling Debug Logging

```typescript
<NavigationContainer
  onStateChange={(state) => {
    console.log('Navigation state:', JSON.stringify(state, null, 2));
  }}
>
  {/* navigators */}
</NavigationContainer>
```

### Using React Navigation Devtools

```typescript
import { useNavigationContainerRef } from '@react-navigation/native';

const App = () => {
  const navigationRef = useNavigationContainerRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Access navigation state after mounting
        console.log('Current state:', navigationRef.getCurrentRoute());
      }}
    >
      {/* navigators */}
    </NavigationContainer>
  );
};
```

### Common Issues and Solutions

**Issue: Screen not found error**

```typescript
// Error: The action 'NAVIGATE' with payload {"name":"Details"} was not handled

// Solution: Ensure the screen exists in the current navigator or specify the full path
navigation.navigate('ParentNavigator', {
  screen: 'Details',
});
```

**Issue: Double headers**

```typescript
// Solution: Hide header on parent navigator
<Tab.Navigator screenOptions={{ headerShown: false }}>
  <Tab.Screen name="Home" component={HomeStack} />
</Tab.Navigator>
```

**Issue: Tab bar disappears on nested screens**

```typescript
// This is expected behavior - the tab bar belongs to the Tab Navigator
// If you need the tab bar visible, ensure you're navigating within the stack
// inside the tab, not replacing the entire tab navigator
```

**Issue: Focus events not firing**

```typescript
// Use useFocusEffect instead of useEffect for focus-dependent logic
useFocusEffect(
  useCallback(() => {
    // This will fire when the screen gains focus
    // even when navigating back to it
  }, [])
);
```

### Inspecting Navigation State

```typescript
const DebugScreen = () => {
  const state = useNavigationState((state) => state);

  return (
    <ScrollView>
      <Text style={{ fontFamily: 'monospace' }}>
        {JSON.stringify(state, null, 2)}
      </Text>
    </ScrollView>
  );
};
```

## Conclusion

Nested navigation in React Native is a powerful tool for building complex app structures. The key principles to remember are:

1. **Plan your navigation hierarchy** before implementation
2. **Use unique screen names** across all navigators
3. **Manage headers carefully** to avoid duplication
4. **Type your navigation** with TypeScript for better maintainability
5. **Handle focus events** properly in nested screens
6. **Keep nesting shallow** - aim for no more than 3 levels deep
7. **Use navigator IDs** for easier parent access

By following these patterns and avoiding common anti-patterns, you can create intuitive, maintainable navigation structures that scale with your application's complexity.

## Additional Resources

- [React Navigation Official Documentation](https://reactnavigation.org/)
- [React Navigation GitHub Repository](https://github.com/react-navigation/react-navigation)
- [TypeScript with React Navigation](https://reactnavigation.org/docs/typescript/)

---

Happy coding! If you have questions or run into issues with nested navigation, the React Navigation community is active and helpful on GitHub and Stack Overflow.
