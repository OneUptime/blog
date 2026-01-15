# How to Test React Native Navigation Flows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Testing, React Navigation, Mobile Development, Jest, TypeScript

Description: Learn how to effectively test navigation flows in React Native applications with React Navigation.

---

Navigation is the backbone of any mobile application. In React Native, React Navigation has become the de facto standard for handling navigation, but testing navigation flows can be challenging. This comprehensive guide will walk you through everything you need to know about testing navigation in React Native applications, from unit tests to end-to-end testing.

## Why Navigation Testing Matters

Before diving into the technical details, let's understand why testing navigation is crucial:

1. **User Experience**: Navigation issues directly impact user experience. A broken navigation flow can render your app unusable.
2. **Business Logic**: Many apps tie business logic to navigation events, such as authentication guards or analytics tracking.
3. **Deep Linking**: Modern apps support deep links that need to work reliably.
4. **Platform Differences**: Navigation behavior can differ between iOS and Android.

## Understanding Navigation Testing Challenges

Testing navigation in React Native presents several unique challenges:

### The Context Problem

React Navigation relies heavily on React Context. Components that use navigation hooks like `useNavigation()` or `useRoute()` must be wrapped in a navigation container. This creates complexity in test setups.

### Native Dependencies

React Navigation interacts with native modules for gestures, animations, and screen management. These dependencies need to be properly mocked in a test environment.

### Asynchronous Nature

Navigation actions are often asynchronous. Screen transitions, data loading, and animation completions all happen over time, requiring careful handling in tests.

### State Management

Navigation state can become complex, especially with nested navigators. Testing that the state updates correctly requires understanding the navigation state structure.

## Setting Up Your Testing Environment

First, let's set up a proper testing environment for navigation testing:

```typescript
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({ children }: { children: (insets: typeof inset) => React.ReactNode }) =>
      children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});
```

Install the necessary dependencies:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest
```

## Unit Testing Navigation Actions

Let's start with the most basic form of navigation testing: unit testing navigation actions.

### Testing Navigation Calls

```typescript
// HomeScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';

const Stack = createNativeStackNavigator();

const MockNavigator = ({ component, params = {} }: { component: React.ComponentType<any>; params?: object }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={component}
          initialParams={params}
        />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

describe('HomeScreen Navigation', () => {
  it('should navigate to Details screen when button is pressed', () => {
    const { getByTestId } = render(<MockNavigator component={HomeScreen} />);

    const navigateButton = getByTestId('navigate-to-details');
    fireEvent.press(navigateButton);

    // The navigation should have occurred
    // We can verify by checking if the Details screen content is rendered
  });
});
```

### Creating a Reusable Navigation Test Wrapper

For more complex scenarios, create a reusable test wrapper:

```typescript
// testUtils/navigationTestUtils.tsx
import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, RenderOptions } from '@testing-library/react-native';

type RootStackParamList = {
  Home: undefined;
  Details: { itemId: number; title: string };
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface NavigationTestWrapperProps {
  children?: React.ReactNode;
  screens: Array<{
    name: keyof RootStackParamList;
    component: React.ComponentType<any>;
    initialParams?: object;
  }>;
  initialRouteName?: keyof RootStackParamList;
  navigationRef?: React.RefObject<NavigationContainerRef<RootStackParamList>>;
}

export const NavigationTestWrapper: React.FC<NavigationTestWrapperProps> = ({
  screens,
  initialRouteName,
  navigationRef,
}) => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRouteName || screens[0].name}>
        {screens.map((screen) => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            initialParams={screen.initialParams}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export const renderWithNavigation = (
  screens: NavigationTestWrapperProps['screens'],
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialRouteName?: keyof RootStackParamList;
    navigationRef?: React.RefObject<NavigationContainerRef<RootStackParamList>>;
  }
) => {
  const { initialRouteName, navigationRef, ...renderOptions } = options || {};

  return render(
    <NavigationTestWrapper
      screens={screens}
      initialRouteName={initialRouteName}
      navigationRef={navigationRef}
    />,
    renderOptions
  );
};
```

## Mocking Navigation Context

When you want to test a component in isolation without the full navigation stack, you can mock the navigation context:

### Using Jest Mocks

```typescript
// __mocks__/@react-navigation/native.ts
const actualNav = jest.requireActual('@react-navigation/native');

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedReset = jest.fn();
const mockedSetParams = jest.fn();
const mockedSetOptions = jest.fn();

export const useNavigation = () => ({
  navigate: mockedNavigate,
  goBack: mockedGoBack,
  reset: mockedReset,
  setParams: mockedSetParams,
  setOptions: mockedSetOptions,
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    routes: [],
    index: 0,
  })),
});

export const useRoute = () => ({
  key: 'test-route-key',
  name: 'TestScreen',
  params: {},
});

export const useIsFocused = jest.fn(() => true);
export const useFocusEffect = jest.fn((callback) => callback());

export const mockedNavigation = {
  navigate: mockedNavigate,
  goBack: mockedGoBack,
  reset: mockedReset,
  setParams: mockedSetParams,
  setOptions: mockedSetOptions,
};

export const resetMockedNavigation = () => {
  mockedNavigate.mockClear();
  mockedGoBack.mockClear();
  mockedReset.mockClear();
  mockedSetParams.mockClear();
  mockedSetOptions.mockClear();
};

export const { NavigationContainer } = actualNav;
```

### Testing with Mocked Navigation

```typescript
// ProfileButton.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileButton from '../components/ProfileButton';
import { mockedNavigation, resetMockedNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native');

describe('ProfileButton', () => {
  beforeEach(() => {
    resetMockedNavigation();
  });

  it('should navigate to Profile screen with correct params', () => {
    const { getByTestId } = render(<ProfileButton userId="123" />);

    fireEvent.press(getByTestId('profile-button'));

    expect(mockedNavigation.navigate).toHaveBeenCalledWith('Profile', {
      userId: '123',
    });
  });

  it('should navigate to Profile screen without params when userId is not provided', () => {
    const { getByTestId } = render(<ProfileButton />);

    fireEvent.press(getByTestId('profile-button'));

    expect(mockedNavigation.navigate).toHaveBeenCalledWith('Profile', {
      userId: undefined,
    });
  });
});
```

## Testing Screen Parameters

Screen parameters are a crucial part of navigation. Here's how to test them effectively:

### Testing Parameter Passing

```typescript
// DetailsScreen.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DetailsScreen from '../screens/DetailsScreen';

const Stack = createNativeStackNavigator();

const renderDetailsScreen = (params: { itemId: number; title: string }) => {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Details"
          component={DetailsScreen}
          initialParams={params}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

describe('DetailsScreen', () => {
  it('should display the item title from params', async () => {
    const { getByText } = renderDetailsScreen({
      itemId: 42,
      title: 'Test Item',
    });

    await waitFor(() => {
      expect(getByText('Test Item')).toBeTruthy();
    });
  });

  it('should display the item ID from params', async () => {
    const { getByText } = renderDetailsScreen({
      itemId: 42,
      title: 'Test Item',
    });

    await waitFor(() => {
      expect(getByText('Item ID: 42')).toBeTruthy();
    });
  });

  it('should handle missing params gracefully', async () => {
    const { getByText } = renderDetailsScreen({
      itemId: 0,
      title: '',
    });

    await waitFor(() => {
      expect(getByText('No item selected')).toBeTruthy();
    });
  });
});
```

### Testing Parameter Updates

```typescript
// SettingsScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

describe('SettingsScreen Parameter Updates', () => {
  it('should update navigation params when settings change', async () => {
    const navigationRef = React.createRef<any>();

    const { getByTestId } = render(
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            initialParams={{ theme: 'light' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );

    fireEvent.press(getByTestId('toggle-theme'));

    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.routes[0].params?.theme).toBe('dark');
    });
  });
});
```

## Testing Navigation State

Understanding and testing navigation state is essential for complex navigation scenarios:

### Accessing Navigation State

```typescript
// NavigationStateTest.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import App from '../App';

type RootStackParamList = {
  Home: undefined;
  Details: { id: number };
  Profile: undefined;
};

describe('Navigation State', () => {
  it('should have correct initial navigation state', async () => {
    const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

    render(
      <NavigationContainer ref={navigationRef}>
        <App />
      </NavigationContainer>
    );

    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state).toBeDefined();
      expect(state?.routes.length).toBe(1);
      expect(state?.routes[0].name).toBe('Home');
      expect(state?.index).toBe(0);
    });
  });

  it('should update state after navigation', async () => {
    const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

    const { getByTestId } = render(
      <NavigationContainer ref={navigationRef}>
        <App />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId('navigate-to-details'));

    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.routes.length).toBe(2);
      expect(state?.routes[1].name).toBe('Details');
      expect(state?.index).toBe(1);
    });
  });

  it('should preserve state history for back navigation', async () => {
    const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

    const { getByTestId } = render(
      <NavigationContainer ref={navigationRef}>
        <App />
      </NavigationContainer>
    );

    // Navigate to multiple screens
    fireEvent.press(getByTestId('navigate-to-details'));
    fireEvent.press(getByTestId('navigate-to-profile'));

    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.routes.length).toBe(3);
      expect(state?.routes.map(r => r.name)).toEqual(['Home', 'Details', 'Profile']);
    });
  });
});
```

### Testing State Persistence

```typescript
// StatePersistence.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, InitialState } from '@react-navigation/native';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage');

const NAVIGATION_STATE_KEY = 'NAVIGATION_STATE';

describe('Navigation State Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should restore navigation state from storage', async () => {
    const savedState: InitialState = {
      routes: [
        { name: 'Home', key: 'home-key' },
        { name: 'Details', key: 'details-key', params: { id: 42 } },
      ],
      index: 1,
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(savedState)
    );

    const { getByText } = render(
      <NavigationContainer
        initialState={savedState}
        onStateChange={(state) => {
          AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
        }}
      >
        <App />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Details Screen')).toBeTruthy();
    });
  });

  it('should save navigation state on change', async () => {
    const { getByTestId } = render(
      <NavigationContainer
        onStateChange={(state) => {
          AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
        }}
      >
        <App />
      </NavigationContainer>
    );

    // Trigger navigation
    fireEvent.press(getByTestId('navigate-to-details'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedState = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedState.routes.length).toBe(2);
    });
  });
});
```

## Integration Testing Navigation

Integration tests verify that multiple components work together correctly:

### Testing Complete Navigation Flows

```typescript
// NavigationFlow.integration.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import App from '../App';

describe('Navigation Flow Integration', () => {
  it('should complete the onboarding flow', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Start on Welcome screen
    expect(getByText('Welcome')).toBeTruthy();

    // Navigate through onboarding
    fireEvent.press(getByTestId('get-started-button'));
    await waitFor(() => expect(getByText('Step 1: Create Account')).toBeTruthy());

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('next-button'));

    await waitFor(() => expect(getByText('Step 2: Profile Setup')).toBeTruthy());

    fireEvent.changeText(getByTestId('name-input'), 'John Doe');
    fireEvent.press(getByTestId('next-button'));

    await waitFor(() => expect(getByText('Step 3: Preferences')).toBeTruthy());

    fireEvent.press(getByTestId('finish-button'));

    // Should be on Home screen after onboarding
    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
      expect(queryByText('Welcome')).toBeNull();
    });
  });

  it('should handle authentication flow correctly', async () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    // Try to access protected screen
    fireEvent.press(getByTestId('profile-tab'));

    // Should redirect to login
    await waitFor(() => expect(getByText('Login Required')).toBeTruthy());

    // Complete login
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');
    fireEvent.press(getByTestId('login-button'));

    // Should now be on Profile screen
    await waitFor(() => expect(getByText('Your Profile')).toBeTruthy());
  });
});
```

### Testing Navigation Guards

```typescript
// NavigationGuards.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

describe('Navigation Guards', () => {
  it('should redirect unauthenticated users to login', async () => {
    const { getByTestId, getByText } = render(
      <AuthProvider initialState={{ isAuthenticated: false }}>
        <NavigationContainer>
          <App />
        </NavigationContainer>
      </AuthProvider>
    );

    // Try to navigate to a protected screen
    fireEvent.press(getByTestId('settings-button'));

    await waitFor(() => {
      expect(getByText('Please log in to continue')).toBeTruthy();
    });
  });

  it('should allow authenticated users to access protected screens', async () => {
    const { getByTestId, getByText } = render(
      <AuthProvider initialState={{ isAuthenticated: true, user: { name: 'John' } }}>
        <NavigationContainer>
          <App />
        </NavigationContainer>
      </AuthProvider>
    );

    fireEvent.press(getByTestId('settings-button'));

    await waitFor(() => {
      expect(getByText('Settings')).toBeTruthy();
    });
  });

  it('should redirect to home after logout', async () => {
    const { getByTestId, getByText } = render(
      <AuthProvider initialState={{ isAuthenticated: true, user: { name: 'John' } }}>
        <NavigationContainer>
          <App />
        </NavigationContainer>
      </AuthProvider>
    );

    // Navigate to settings
    fireEvent.press(getByTestId('settings-button'));
    await waitFor(() => expect(getByText('Settings')).toBeTruthy());

    // Logout
    fireEvent.press(getByTestId('logout-button'));

    // Should be redirected to home
    await waitFor(() => {
      expect(getByText('Welcome')).toBeTruthy();
    });
  });
});
```

## Testing Deep Links

Deep linking is crucial for modern mobile apps. Here's how to test it:

### Basic Deep Link Testing

```typescript
// DeepLinking.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import { Linking } from 'react-native';
import App from '../App';

const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      Details: 'details/:id',
      Profile: 'profile/:userId',
      Settings: 'settings',
    },
  },
};

describe('Deep Linking', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse deep link to Details screen', () => {
    const state = getStateFromPath('details/42', linking.config);

    expect(state?.routes[0].name).toBe('Details');
    expect(state?.routes[0].params).toEqual({ id: '42' });
  });

  it('should parse deep link to Profile screen', () => {
    const state = getStateFromPath('profile/user123', linking.config);

    expect(state?.routes[0].name).toBe('Profile');
    expect(state?.routes[0].params).toEqual({ userId: 'user123' });
  });

  it('should handle initial deep link on app launch', async () => {
    const initialURL = 'myapp://details/99';
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(initialURL);

    const { getByText } = render(
      <NavigationContainer linking={linking}>
        <App />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Item #99')).toBeTruthy();
    });
  });

  it('should handle deep link while app is running', async () => {
    const { getByText } = render(
      <NavigationContainer linking={linking}>
        <App />
      </NavigationContainer>
    );

    // Simulate receiving a deep link
    const linkingCallback = (Linking.addEventListener as jest.Mock).mock.calls[0][1];
    linkingCallback({ url: 'myapp://profile/user456' });

    await waitFor(() => {
      expect(getByText('Profile: user456')).toBeTruthy();
    });
  });
});
```

### Testing Complex Deep Link Scenarios

```typescript
// ComplexDeepLinking.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, getStateFromPath, getPathFromState } from '@react-navigation/native';
import App from '../App';

const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      MainTabs: {
        screens: {
          Feed: 'feed',
          Search: 'search',
          Profile: 'profile',
        },
      },
      Details: 'details/:id',
      Nested: {
        path: 'nested',
        screens: {
          Level1: 'level1',
          Level2: 'level2/:param',
        },
      },
    },
  },
};

describe('Complex Deep Linking', () => {
  it('should handle nested navigator deep links', () => {
    const state = getStateFromPath('nested/level2/test-param', linking.config);

    expect(state?.routes[0].name).toBe('Nested');
    expect(state?.routes[0].state?.routes[0].name).toBe('Level2');
    expect(state?.routes[0].state?.routes[0].params).toEqual({ param: 'test-param' });
  });

  it('should handle tab navigator deep links', () => {
    const state = getStateFromPath('feed', linking.config);

    expect(state?.routes[0].name).toBe('MainTabs');
    expect(state?.routes[0].state?.routes[0].name).toBe('Feed');
  });

  it('should generate correct path from state', () => {
    const state = {
      routes: [
        {
          name: 'Details',
          params: { id: '123' },
        },
      ],
    };

    const path = getPathFromState(state, linking.config);
    expect(path).toBe('/details/123');
  });

  it('should handle deep links with query parameters', () => {
    const state = getStateFromPath('details/42?ref=notification&source=push', linking.config);

    expect(state?.routes[0].name).toBe('Details');
    expect(state?.routes[0].params).toEqual({
      id: '42',
      ref: 'notification',
      source: 'push',
    });
  });
});
```

## Testing Back Button Behavior

Back button handling is critical, especially on Android:

```typescript
// BackButton.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import App from '../App';

describe('Back Button Behavior', () => {
  let backHandlerCallback: () => boolean;

  beforeEach(() => {
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should go back to previous screen on back press', async () => {
    const navigationRef = React.createRef<NavigationContainerRef<any>>();

    const { getByTestId, getByText } = render(
      <NavigationContainer ref={navigationRef}>
        <App />
      </NavigationContainer>
    );

    // Navigate to Details
    fireEvent.press(getByTestId('navigate-to-details'));
    await waitFor(() => expect(getByText('Details Screen')).toBeTruthy());

    // Press back button
    const handled = backHandlerCallback();
    expect(handled).toBe(true);

    // Should be back on Home
    await waitFor(() => expect(getByText('Home Screen')).toBeTruthy());
  });

  it('should exit app when back pressed on root screen', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    await waitFor(() => expect(getByText('Home Screen')).toBeTruthy());

    // Press back on root screen
    const handled = backHandlerCallback();

    // Should not handle (allow app to exit)
    expect(handled).toBe(false);
  });

  it('should handle custom back behavior', async () => {
    const onBeforeRemove = jest.fn((e) => {
      e.preventDefault();
    });

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <App onBeforeRemove={onBeforeRemove} />
      </NavigationContainer>
    );

    // Navigate to form screen
    fireEvent.press(getByTestId('navigate-to-form'));
    await waitFor(() => expect(getByText('Form Screen')).toBeTruthy());

    // Fill in form (mark as dirty)
    fireEvent.changeText(getByTestId('form-input'), 'Some text');

    // Try to go back
    backHandlerCallback();

    // Should show confirmation dialog
    await waitFor(() => {
      expect(getByText('Discard changes?')).toBeTruthy();
    });
  });
});
```

## Testing Tab Navigation

Tab navigation requires specific testing approaches:

```typescript
// TabNavigation.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

describe('Tab Navigation', () => {
  it('should render all tab buttons', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
  });

  it('should switch tabs when tab button is pressed', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );

    // Initially on Home tab
    expect(getByText('Home Screen Content')).toBeTruthy();

    // Switch to Search tab
    fireEvent.press(getByText('Search'));
    await waitFor(() => expect(getByText('Search Screen Content')).toBeTruthy());

    // Switch to Profile tab
    fireEvent.press(getByText('Profile'));
    await waitFor(() => expect(getByText('Profile Screen Content')).toBeTruthy());
  });

  it('should preserve tab state when switching between tabs', async () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );

    // Go to Search tab and enter a query
    fireEvent.press(getByText('Search'));
    await waitFor(() => expect(getByText('Search Screen Content')).toBeTruthy());

    fireEvent.changeText(getByTestId('search-input'), 'test query');

    // Switch to another tab and back
    fireEvent.press(getByText('Home'));
    fireEvent.press(getByText('Search'));

    // Search query should be preserved
    await waitFor(() => {
      expect(getByTestId('search-input').props.value).toBe('test query');
    });
  });

  it('should show correct tab bar badge', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );

    // Assuming notifications badge on Profile tab
    const profileBadge = getByTestId('profile-tab-badge');
    expect(profileBadge).toBeTruthy();
    expect(profileBadge.props.children).toBe('3');
  });

  it('should handle tab long press', async () => {
    const onTabLongPress = jest.fn();

    const { getByText } = render(
      <NavigationContainer>
        <TabNavigator onTabLongPress={onTabLongPress} />
      </NavigationContainer>
    );

    fireEvent(getByText('Home'), 'longPress');

    expect(onTabLongPress).toHaveBeenCalledWith('Home');
  });
});
```

## Testing Drawer Navigation

Drawer navigation has its own unique testing requirements:

```typescript
// DrawerNavigation.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerActions } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen name="Home" component={HomeScreen} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
    <Drawer.Screen name="About" component={AboutScreen} />
  </Drawer.Navigator>
);

describe('Drawer Navigation', () => {
  it('should open drawer when hamburger menu is pressed', async () => {
    const navigationRef = React.createRef<any>();

    const { getByTestId, getByText } = render(
      <NavigationContainer ref={navigationRef}>
        <DrawerNavigator />
      </NavigationContainer>
    );

    // Press hamburger menu
    fireEvent.press(getByTestId('drawer-toggle'));

    // Drawer should be open
    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.history?.some((h: any) => h.type === 'drawer')).toBe(true);
    });
  });

  it('should navigate to screen when drawer item is pressed', async () => {
    const navigationRef = React.createRef<any>();

    const { getByTestId, getByText } = render(
      <NavigationContainer ref={navigationRef}>
        <DrawerNavigator />
      </NavigationContainer>
    );

    // Open drawer
    navigationRef.current?.dispatch(DrawerActions.openDrawer());

    await waitFor(() => {
      expect(getByText('Settings')).toBeTruthy();
    });

    // Press Settings in drawer
    fireEvent.press(getByText('Settings'));

    // Should navigate to Settings
    await waitFor(() => {
      expect(getByText('Settings Screen Content')).toBeTruthy();
    });
  });

  it('should close drawer when pressing outside', async () => {
    const navigationRef = React.createRef<any>();

    const { getByTestId } = render(
      <NavigationContainer ref={navigationRef}>
        <DrawerNavigator />
      </NavigationContainer>
    );

    // Open drawer
    navigationRef.current?.dispatch(DrawerActions.openDrawer());

    // Press overlay
    fireEvent.press(getByTestId('drawer-overlay'));

    // Drawer should be closed
    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.history?.some((h: any) => h.type === 'drawer')).toBe(false);
    });
  });

  it('should toggle drawer with gesture', async () => {
    const navigationRef = React.createRef<any>();

    const { getByTestId } = render(
      <NavigationContainer ref={navigationRef}>
        <DrawerNavigator />
      </NavigationContainer>
    );

    // Simulate swipe from left edge
    const mainView = getByTestId('main-content');
    fireEvent(mainView, 'swipeRight', { nativeEvent: { translationX: 100 } });

    await waitFor(() => {
      const state = navigationRef.current?.getRootState();
      expect(state?.history?.some((h: any) => h.type === 'drawer')).toBe(true);
    });
  });
});
```

## Snapshot Testing with Navigation

Snapshot tests help catch unintended UI changes:

```typescript
// NavigationSnapshot.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import renderer from 'react-test-renderer';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';

const Stack = createNativeStackNavigator();

const App = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'My App' }}
      />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{ title: 'Details' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('Navigation Snapshots', () => {
  it('should match Home screen snapshot', () => {
    const tree = renderer.create(<App />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should match navigation header snapshot', () => {
    const { toJSON } = render(<App />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match Details screen with params snapshot', () => {
    const DetailsWithParams = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            initialParams={{ itemId: 42, title: 'Test Item' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );

    const tree = renderer.create(<DetailsWithParams />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

## E2E Navigation Testing

End-to-end testing ensures navigation works correctly in a real environment:

### Using Detox

```typescript
// e2e/navigation.e2e.ts
import { device, element, by, expect } from 'detox';

describe('Navigation E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate through the main flow', async () => {
    // Start on Home screen
    await expect(element(by.text('Welcome to Home'))).toBeVisible();

    // Navigate to Details
    await element(by.id('navigate-to-details')).tap();
    await expect(element(by.text('Details Screen'))).toBeVisible();

    // Navigate back
    await element(by.traits(['button'])).atIndex(0).tap();
    await expect(element(by.text('Welcome to Home'))).toBeVisible();
  });

  it('should handle deep link navigation', async () => {
    await device.openURL({ url: 'myapp://details/42' });

    await expect(element(by.text('Item #42'))).toBeVisible();
  });

  it('should handle tab navigation', async () => {
    await element(by.id('tab-search')).tap();
    await expect(element(by.id('search-screen'))).toBeVisible();

    await element(by.id('tab-profile')).tap();
    await expect(element(by.id('profile-screen'))).toBeVisible();

    await element(by.id('tab-home')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should handle drawer navigation', async () => {
    // Open drawer with gesture
    await element(by.id('main-screen')).swipe('right', 'fast', 0.5);
    await expect(element(by.id('drawer-menu'))).toBeVisible();

    // Navigate to Settings
    await element(by.text('Settings')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();
  });

  it('should handle back button on Android', async () => {
    // Navigate to nested screen
    await element(by.id('navigate-to-details')).tap();
    await element(by.id('navigate-to-nested')).tap();

    await expect(element(by.text('Nested Screen'))).toBeVisible();

    // Press hardware back button
    await device.pressBack();
    await expect(element(by.text('Details Screen'))).toBeVisible();

    await device.pressBack();
    await expect(element(by.text('Welcome to Home'))).toBeVisible();
  });

  it('should handle keyboard dismiss on navigation', async () => {
    await element(by.id('tab-search')).tap();
    await element(by.id('search-input')).tap();
    await element(by.id('search-input')).typeText('test query');

    // Keyboard should be visible
    // Navigate away
    await element(by.id('tab-home')).tap();

    // Keyboard should be dismissed
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

### Using Maestro

```yaml
# e2e/navigation.yaml
appId: com.myapp
---
- launchApp
- assertVisible: "Welcome to Home"

# Test stack navigation
- tapOn:
    id: "navigate-to-details"
- assertVisible: "Details Screen"
- back
- assertVisible: "Welcome to Home"

# Test tab navigation
- tapOn:
    id: "tab-search"
- assertVisible:
    id: "search-screen"
- tapOn:
    id: "tab-profile"
- assertVisible:
    id: "profile-screen"

# Test deep link
- openLink: "myapp://details/42"
- assertVisible: "Item #42"
```

## Best Practices for Navigation Testing

### 1. Use Data-TestID Consistently

```typescript
// HomeScreen.tsx
export const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View testID="home-screen">
      <Text testID="home-title">Welcome to Home</Text>
      <TouchableOpacity
        testID="navigate-to-details"
        onPress={() => navigation.navigate('Details')}
      >
        <Text>Go to Details</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 2. Create Test Utilities

```typescript
// testUtils/navigation.ts
export const waitForNavigation = async (expectedScreen: string) => {
  await waitFor(() => {
    expect(screen.getByTestId(`${expectedScreen.toLowerCase()}-screen`)).toBeTruthy();
  });
};

export const pressAndNavigate = async (buttonId: string, expectedScreen: string) => {
  fireEvent.press(screen.getByTestId(buttonId));
  await waitForNavigation(expectedScreen);
};
```

### 3. Test Edge Cases

```typescript
describe('Navigation Edge Cases', () => {
  it('should handle rapid navigation', async () => {
    const { getByTestId, getByText } = render(<App />);

    // Rapidly press navigation buttons
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByTestId('navigate-forward'));
    }

    // Should handle gracefully without crashing
    await waitFor(() => {
      expect(getByText('Final Screen')).toBeTruthy();
    });
  });

  it('should handle navigation during unmount', async () => {
    const { getByTestId, unmount } = render(<App />);

    // Start navigation
    fireEvent.press(getByTestId('navigate-with-delay'));

    // Unmount before navigation completes
    unmount();

    // Should not throw
  });
});
```

## Conclusion

Testing navigation in React Native applications requires a multi-layered approach:

1. **Unit Tests**: Test individual navigation actions and parameter passing
2. **Integration Tests**: Test complete navigation flows and screen interactions
3. **Snapshot Tests**: Catch unintended UI changes in navigation components
4. **E2E Tests**: Verify navigation works correctly on actual devices

Key takeaways:

- Always set up proper mocks for React Navigation dependencies
- Use a navigation ref to access and assert navigation state
- Test both happy paths and edge cases
- Consider platform-specific behavior (especially back button on Android)
- Use consistent testID attributes across your app
- Create reusable test utilities to reduce boilerplate

By implementing comprehensive navigation tests, you'll catch bugs early, ensure consistent user experiences, and make your app more maintainable. Remember that navigation is one of the most critical aspects of mobile apps - users expect it to work flawlessly every time.

## Resources

- [React Navigation Documentation](https://reactnavigation.org/docs/testing)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
