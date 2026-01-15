# How to Build Tab and Drawer Navigation in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Navigation, Tab Navigation, Drawer Navigation, Mobile Development, TypeScript

Description: Learn how to implement tab and drawer navigation patterns in React Native using React Navigation with customization options.

---

Navigation is the backbone of any mobile application. Users expect intuitive ways to move between screens, and two of the most popular navigation patterns are tab navigation and drawer navigation. In this comprehensive guide, we will explore how to implement both patterns in React Native using React Navigation, complete with TypeScript support and advanced customization options.

## Prerequisites

Before diving in, ensure you have a React Native project set up. We will be using React Navigation 6.x, which is the latest stable version at the time of writing.

## Installing Dependencies

First, let us install the necessary packages:

```bash
# Core navigation packages
npm install @react-navigation/native

# Required peer dependencies
npm install react-native-screens react-native-safe-area-context

# Tab navigator
npm install @react-navigation/bottom-tabs

# Drawer navigator
npm install @react-navigation/drawer
npm install react-native-gesture-handler react-native-reanimated
```

For iOS, install the CocoaPods:

```bash
cd ios && pod install && cd ..
```

## Setting Up the Navigation Container

Every React Navigation app needs a `NavigationContainer` at the root. This component manages the navigation tree and contains the navigation state.

```tsx
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        {/* Navigators will go here */}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
```

## Part 1: Bottom Tab Navigator

### Basic Tab Navigator Setup

Let us start by creating a simple bottom tab navigator with three screens.

```tsx
// navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Define the type for our tab navigator parameters
export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
```

### Creating Screen Components

Here are simple screen components for our tabs:

```tsx
// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Text style={styles.subtitle}>Welcome to the app!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export default HomeScreen;
```

### Tab Bar Customization

React Navigation provides extensive customization options for the tab bar. Let us explore how to style it.

```tsx
// navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        // Tab bar styling
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        // Active tab styling
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        // Label styling
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        // Header styling
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
```

### Custom Tab Icons

Icons are essential for a polished tab bar. We will use a popular icon library.

```bash
npm install react-native-vector-icons
npm install @types/react-native-vector-icons --save-dev
```

Now let us add custom icons to each tab:

```tsx
// navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Define icon names for each tab
const TAB_ICONS: Record<keyof TabParamList, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = focused
            ? TAB_ICONS[route.name].focused
            : TAB_ICONS[route.name].unfocused;
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
```

### Custom Tab Icon Component

For more control, you can create a custom icon component:

```tsx
// components/TabBarIcon.tsx
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused, color, size }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [focused, scaleValue]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
      <Icon name={name} size={size} color={color} />
      {focused && <View style={[styles.indicator, { backgroundColor: color }]} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default TabBarIcon;
```

### Tab Badges Implementation

Badges are useful for showing notification counts or alerts. Here is how to implement them:

```tsx
// navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Badge component
interface BadgeProps {
  count: number;
}

const Badge: React.FC<BadgeProps> = ({ count }) => {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
};

// Icon with badge component
interface IconWithBadgeProps {
  name: string;
  color: string;
  size: number;
  badgeCount?: number;
}

const IconWithBadge: React.FC<IconWithBadgeProps> = ({ name, color, size, badgeCount = 0 }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon name={name} size={size} color={color} />
      <Badge count={badgeCount} />
    </View>
  );
};

const TabNavigator: React.FC = () => {
  // In a real app, this would come from a state management solution
  const notificationCount = 5;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          let badgeCount = 0;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              badgeCount = notificationCount;
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return (
            <IconWithBadge
              name={iconName}
              color={color}
              size={size}
              badgeCount={badgeCount}
            />
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    margin: 5,
  },
  badgeContainer: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default TabNavigator;
```

## Part 2: Drawer Navigator

### Basic Drawer Navigator Setup

Now let us implement a drawer navigator, which provides a side menu that slides in from the edge of the screen.

```tsx
// navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';

export type DrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
```

### Drawer Styling and Options

Let us customize the drawer appearance:

```tsx
// navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';

export type DrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();
const { width } = Dimensions.get('window');

const DRAWER_ICONS: Record<keyof DrawerParamList, string> = {
  Home: 'home-outline',
  Settings: 'settings-outline',
  About: 'information-circle-outline',
};

const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        // Drawer styling
        drawerStyle: {
          backgroundColor: '#ffffff',
          width: width * 0.75,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
        },
        // Drawer item styling
        drawerActiveBackgroundColor: '#E3F2FD',
        drawerActiveTintColor: '#1976D2',
        drawerInactiveTintColor: '#757575',
        drawerLabelStyle: {
          marginLeft: -16,
          fontSize: 16,
          fontWeight: '500',
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 4,
        },
        // Icons
        drawerIcon: ({ color, size }) => (
          <Icon name={DRAWER_ICONS[route.name]} size={size} color={color} />
        ),
        // Header styling
        headerStyle: {
          backgroundColor: '#1976D2',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ drawerLabel: 'Home' }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ drawerLabel: 'Settings' }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ drawerLabel: 'About Us' }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
```

### Custom Drawer Content

For a fully customized drawer, you can create your own drawer content component:

```tsx
// components/CustomDrawerContent.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  // In a real app, this would come from your auth/user state
  const user: UserProfile = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://via.placeholder.com/100',
  };

  const handleLogout = (): void => {
    // Implement logout logic
    console.log('Logout pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Navigation Items */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer Section */}
      <View style={styles.footer}>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.footerItem} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color="#FF3B30" />
          <Text style={styles.footerItemText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 16,
  },
  footer: {
    paddingBottom: 20,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  footerItemText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
    fontWeight: '500',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default CustomDrawerContent;
```

Now use this custom content in your drawer navigator:

```tsx
// navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions } from 'react-native';
import CustomDrawerContent from '../components/CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          width: width * 0.8,
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
```

### Drawer Gestures and Behavior

Control how the drawer responds to user interactions:

```tsx
// navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

const DrawerNavigator: React.FC = () => {
  const screenOptions: DrawerNavigationOptions = {
    // Enable swipe gesture
    swipeEnabled: true,
    // Swipe distance to trigger drawer (default is 20)
    swipeEdgeWidth: 50,
    // Minimum swipe distance to open drawer
    swipeMinDistance: 50,
    // Drawer position
    drawerPosition: 'left', // or 'right'
    // Drawer type
    drawerType: 'front', // 'front' | 'back' | 'slide' | 'permanent'
    // Overlay color when drawer is open
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    // Keyboard behavior
    keyboardDismissMode: 'on-drag',
  };

  return (
    <Drawer.Navigator screenOptions={screenOptions}>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
```

## Part 3: Combining Tabs and Drawers

In many apps, you will want to combine both navigation patterns. Here is how to nest them effectively.

### Strategy 1: Drawer Contains Tabs

This is the most common pattern where the drawer is the root navigator:

```tsx
// navigation/RootNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';

export type RootDrawerParamList = {
  MainTabs: undefined;
  Settings: undefined;
  Profile: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const RootNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // We will use the tab navigator's header
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};

export default RootNavigator;
```

### Strategy 2: Tabs Contain Drawer-Enabled Screens

Alternatively, you can have each tab control its own drawer:

```tsx
// navigation/HomeStack.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import HomeSettingsScreen from '../screens/HomeSettingsScreen';

const HomeDrawer = createDrawerNavigator();

const HomeStack: React.FC = () => {
  return (
    <HomeDrawer.Navigator>
      <HomeDrawer.Screen name="HomeMain" component={HomeScreen} />
      <HomeDrawer.Screen name="HomeSettings" component={HomeSettingsScreen} />
    </HomeDrawer.Navigator>
  );
};

export default HomeStack;
```

### Complete Navigation Structure with TypeScript

Here is a comprehensive example with full TypeScript support:

```tsx
// types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';

// Tab navigator params
export type TabParamList = {
  Home: undefined;
  Search: { query?: string };
  Notifications: undefined;
  Profile: { userId?: string };
};

// Drawer navigator params
export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  Settings: undefined;
  Help: undefined;
  About: undefined;
};

// Root stack params (if you have additional stacks)
export type RootStackParamList = {
  Main: NavigatorScreenParams<DrawerParamList>;
  Auth: undefined;
  Modal: { title: string; content: string };
};

// Declare global types for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

```tsx
// navigation/MainNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { TabParamList, DrawerParamList } from '../types/navigation';
import CustomDrawerContent from '../components/CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/AboutScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Hamburger menu button component
const DrawerToggleButton: React.FC = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={{ marginLeft: 16 }}
    >
      <Icon name="menu-outline" size={24} color="#ffffff" />
    </TouchableOpacity>
  );
};

// Tab Navigator Component
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerLeft: () => <DrawerToggleButton />,
        headerStyle: {
          backgroundColor: '#1976D2',
        },
        headerTintColor: '#ffffff',
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#757575',
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<keyof TabParamList, string> = {
            Home: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Notifications: focused ? 'notifications' : 'notifications-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main Drawer Navigator
const MainNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: '#E3F2FD',
        drawerActiveTintColor: '#1976D2',
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Icon name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerShown: true,
          drawerIcon: ({ color, size }) => (
            <Icon name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainNavigator;
```

## Part 4: Navigation State Management

### Accessing Navigation State

You can access the current navigation state for analytics or persistence:

```tsx
// App.tsx
import React, { useRef, useCallback } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainNavigator from './navigation/MainNavigator';

const PERSISTENCE_KEY = 'NAVIGATION_STATE';

const App: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [initialState, setInitialState] = React.useState<NavigationState | undefined>();
  const routeNameRef = useRef<string | undefined>();

  // Restore navigation state on app start
  React.useEffect(() => {
    const restoreState = async (): Promise<void> => {
      try {
        const savedState = await AsyncStorage.getItem(PERSISTENCE_KEY);
        if (savedState) {
          setInitialState(JSON.parse(savedState));
        }
      } catch (error) {
        console.warn('Failed to restore navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    restoreState();
  }, []);

  const onStateChange = useCallback(async (state: NavigationState | undefined) => {
    if (!state) return;

    // Get the current route name
    const currentRouteName = getActiveRouteName(state);
    const previousRouteName = routeNameRef.current;

    if (previousRouteName !== currentRouteName) {
      // Track screen view (e.g., with analytics)
      console.log('Screen changed:', currentRouteName);
    }

    routeNameRef.current = currentRouteName;

    // Persist navigation state
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
  }, []);

  if (!isReady) {
    return null; // Or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        initialState={initialState}
        onStateChange={onStateChange}
      >
        <MainNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

// Helper function to get the active route name
function getActiveRouteName(state: NavigationState): string {
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

export default App;
```

### Using Navigation Hooks with TypeScript

Properly typed navigation hooks make your code safer:

```tsx
// hooks/useTypedNavigation.ts
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { TabParamList, DrawerParamList } from '../types/navigation';

// Composite navigation type for screens inside tabs within drawer
type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  DrawerNavigationProp<DrawerParamList>
>;

// Custom hook for Home screen navigation
export const useHomeNavigation = () => {
  return useNavigation<HomeScreenNavigationProp>();
};

// Custom hook for accessing route params
export const useSearchRoute = () => {
  return useRoute<RouteProp<TabParamList, 'Search'>>();
};
```

```tsx
// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useHomeNavigation } from '../hooks/useTypedNavigation';

const HomeScreen: React.FC = () => {
  const navigation = useHomeNavigation();

  const handleOpenDrawer = (): void => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleGoToSearch = (): void => {
    navigation.navigate('Search', { query: 'react native' });
  };

  const handleGoToSettings = (): void => {
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <View style={styles.buttonContainer}>
        <Button title="Open Drawer" onPress={handleOpenDrawer} />
        <Button title="Go to Search" onPress={handleGoToSearch} />
        <Button title="Go to Settings" onPress={handleGoToSettings} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
});

export default HomeScreen;
```

## Part 5: Performance Optimization Tips

### Lazy Loading Screens

By default, React Navigation lazily loads screens. You can control this behavior:

```tsx
// navigation/TabNavigator.tsx
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        // Lazy load screens (default is true)
        lazy: true,
        // Keep screens mounted after first render
        unmountOnBlur: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="HeavyScreen"
        component={HeavyScreen}
        options={{
          // Override for specific screen
          unmountOnBlur: true,
        }}
      />
    </Tab.Navigator>
  );
};
```

### Optimizing Re-renders with useFocusEffect

Use `useFocusEffect` to run effects only when a screen is focused:

```tsx
// screens/DataScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface DataItem {
  id: string;
  title: string;
}

const DataScreen: React.FC = () => {
  const [data, setData] = React.useState<DataItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async (): Promise<void> => {
        setLoading(true);
        try {
          const response = await fetch('https://api.example.com/data');
          const result = await response.json();
          if (isActive) {
            setData(result);
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      fetchData();

      // Cleanup function
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.title}</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

export default DataScreen;
```

### Memoizing Screen Components

Prevent unnecessary re-renders with React.memo:

```tsx
// screens/ProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';

type ProfileScreenProps = BottomTabScreenProps<TabParamList, 'Profile'>;

const ProfileScreen: React.FC<ProfileScreenProps> = React.memo(({ route }) => {
  const { userId } = route.params ?? {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {userId && <Text style={styles.subtitle}>User ID: {userId}</Text>}
    </View>
  );
});

ProfileScreen.displayName = 'ProfileScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export default ProfileScreen;
```

### Optimizing Tab Bar with Custom Component

For complex tab bars, create a memoized custom component:

```tsx
// components/CustomTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Notifications: { focused: 'notifications', unfocused: 'notifications-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

interface TabItemProps {
  route: { key: string; name: string };
  index: number;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
}

const TabItem: React.FC<TabItemProps> = React.memo(({
  route,
  isFocused,
  onPress,
  onLongPress,
  label,
}) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.1 : 1, {
      damping: 10,
      stiffness: 100,
    });
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconConfig = TAB_ICONS[route.name] ?? { focused: 'help', unfocused: 'help-outline' };
  const iconName = isFocused ? iconConfig.focused : iconConfig.unfocused;
  const color = isFocused ? '#1976D2' : '#757575';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={animatedStyle}>
        <Icon name={iconName} size={24} color={color} />
      </Animated.View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
});

TabItem.displayName = 'TabItem';

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
        const isFocused = state.index === index;

        const onPress = (): void => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = (): void => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            label={label}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default React.memo(CustomTabBar);
```

Use the custom tab bar in your navigator:

```tsx
// navigation/TabNavigator.tsx
import CustomTabBar from '../components/CustomTabBar';

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

## Conclusion

In this comprehensive guide, we have covered everything you need to know about implementing tab and drawer navigation in React Native. From basic setups to advanced customizations, you now have the tools to create intuitive and performant navigation experiences for your users.

Key takeaways:

1. **Tab Navigation** is perfect for primary navigation between main sections of your app
2. **Drawer Navigation** works well for secondary navigation and settings
3. **Combining both** provides a comprehensive navigation system for complex apps
4. **TypeScript** adds type safety and improves developer experience
5. **Performance optimization** through lazy loading, memoization, and focused effects keeps your app responsive

Remember to always consider your users' needs when choosing navigation patterns. The best navigation is one that feels natural and helps users accomplish their goals efficiently.

## Additional Resources

- [React Navigation Documentation](https://reactnavigation.org/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)

Happy coding!
