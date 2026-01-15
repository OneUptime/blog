# How to Unit Test React Native Components with Jest

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Jest, Testing, Unit Tests, Mobile Development, TypeScript

Description: Learn how to write effective unit tests for React Native components using Jest and React Native Testing Library.

---

Unit testing is a cornerstone of building reliable React Native applications. By testing individual components in isolation, you can catch bugs early, ensure code quality, and maintain confidence when refactoring. This comprehensive guide walks you through everything you need to know about testing React Native components with Jest.

## Why Unit Test React Native Components?

Before diving into the technical details, let's understand why unit testing matters:

- **Early Bug Detection**: Catch issues before they reach production
- **Documentation**: Tests serve as living documentation for your components
- **Refactoring Confidence**: Make changes knowing tests will catch regressions
- **Better Design**: Writing testable code often leads to better architecture
- **Faster Development**: Automated tests are faster than manual testing

## Jest Setup for React Native

React Native projects created with the React Native CLI or Expo come with Jest pre-configured. However, let's understand the setup and customize it for optimal testing.

### Basic Configuration

Your `package.json` should include Jest configuration:

```json
{
  "jest": {
    "preset": "react-native",
    "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"],
    "moduleFileExtensions": ["ts", "tsx", "js", "jsx", "json", "node"],
    "transformIgnorePatterns": [
      "node_modules/(?!(react-native|@react-native|react-native-.*)/)"
    ],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    },
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.stories.{ts,tsx}"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

Alternatively, create a `jest.config.js` file for more flexibility:

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
  },
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
```

### Installing Dependencies

Install the required testing libraries:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
# or with yarn
yarn add --dev @testing-library/react-native @testing-library/jest-native jest-expo
```

### Setup File

Create a `jest.setup.js` file for global test configuration:

```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

## React Native Testing Library Basics

React Native Testing Library (RNTL) provides utilities to test React Native components in a way that resembles how users interact with your app.

### Core Principles

1. **Query by accessibility**: Use queries that reflect how users interact with your app
2. **Avoid implementation details**: Test behavior, not internal state
3. **Write maintainable tests**: Tests should survive refactoring

### Available Queries

RNTL provides several query methods, each with different use cases:

```typescript
import { render, screen } from '@testing-library/react-native';

// getBy* - throws error if not found (use when element should exist)
screen.getByText('Submit');
screen.getByTestId('submit-button');
screen.getByRole('button', { name: 'Submit' });
screen.getByPlaceholderText('Enter email');
screen.getByDisplayValue('john@example.com');
screen.getByLabelText('Email input');

// queryBy* - returns null if not found (use for asserting absence)
screen.queryByText('Error message');

// findBy* - returns promise (use for async elements)
await screen.findByText('Loaded content');

// getAllBy*, queryAllBy*, findAllBy* - for multiple elements
screen.getAllByRole('button');
```

## Testing Component Rendering

Let's start with basic rendering tests. Here's a simple Button component:

```typescript
// Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  testID,
}) => {
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator testID="button-loader" color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#6c757d',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

Now let's write comprehensive tests:

```typescript
// Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with correct title', () => {
      render(<Button title="Click me" onPress={mockOnPress} />);

      expect(screen.getByText('Click me')).toBeTruthy();
    });

    it('renders with testID when provided', () => {
      render(
        <Button title="Test" onPress={mockOnPress} testID="custom-button" />
      );

      expect(screen.getByTestId('custom-button')).toBeTruthy();
    });

    it('renders loading indicator when loading is true', () => {
      render(<Button title="Submit" onPress={mockOnPress} loading={true} />);

      expect(screen.getByTestId('button-loader')).toBeTruthy();
      expect(screen.queryByText('Submit')).toBeNull();
    });

    it('has correct accessibility role', () => {
      render(<Button title="Accessible" onPress={mockOnPress} />);

      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('has disabled accessibility state when disabled', () => {
      render(<Button title="Disabled" onPress={mockOnPress} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('has disabled accessibility state when loading', () => {
      render(<Button title="Loading" onPress={mockOnPress} loading={true} />);

      const button = screen.getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });
});
```

## Testing User Interactions

Testing how users interact with your components is crucial. Let's explore different interaction patterns.

### Basic Press Events

```typescript
// LoginForm.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    onSubmit(email, password);
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="email-input"
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email input"
      />
      <TextInput
        testID="password-input"
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password input"
      />
      {error ? <Text testID="error-message" style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        testID="submit-button"
        style={styles.button}
        onPress={handleSubmit}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: 'red', marginBottom: 12 },
});
```

```typescript
// LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form elements', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.getByTestId('submit-button')).toBeTruthy();
  });

  it('updates email input when user types', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    const emailInput = screen.getByTestId('email-input');
    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input when user types', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    const passwordInput = screen.getByTestId('password-input');
    fireEvent.changeText(passwordInput, 'secretpassword');

    expect(passwordInput.props.value).toBe('secretpassword');
  });

  it('shows error when submitting with empty fields', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.press(screen.getByTestId('submit-button'));

    expect(screen.getByTestId('error-message')).toBeTruthy();
    expect(screen.getByText('Please fill in all fields')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'invalid-email');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByTestId('submit-button'));

    expect(screen.getByText('Please enter a valid email')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct values on valid submission', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByTestId('submit-button'));

    expect(mockSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('clears error on successful submission', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    // First, trigger an error
    fireEvent.press(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('error-message')).toBeTruthy();

    // Then, fill in valid data and submit
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByTestId('submit-button'));

    expect(screen.queryByTestId('error-message')).toBeNull();
  });
});
```

## Testing Hooks

Custom hooks can be tested in isolation using `@testing-library/react-hooks` or by testing them through a component.

### Testing Custom Hooks

```typescript
// useCounter.ts
import { useState, useCallback } from 'react';

interface UseCounterOptions {
  initialValue?: number;
  min?: number;
  max?: number;
}

export const useCounter = (options: UseCounterOptions = {}) => {
  const { initialValue = 0, min = -Infinity, max = Infinity } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + 1, max));
  }, [max]);

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(prev - 1, min));
  }, [min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const setValue = useCallback(
    (value: number) => {
      setCount(Math.max(min, Math.min(value, max)));
    },
    [min, max]
  );

  return { count, increment, decrement, reset, setValue };
};
```

```typescript
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value of 0', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with custom initial value', () => {
    const { result } = renderHook(() => useCounter({ initialValue: 10 }));

    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter({ initialValue: 5 }));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('respects maximum value', () => {
    const { result } = renderHook(() => useCounter({ initialValue: 9, max: 10 }));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(10);
  });

  it('respects minimum value', () => {
    const { result } = renderHook(() => useCounter({ initialValue: 1, min: 0 }));

    act(() => {
      result.current.decrement();
      result.current.decrement();
    });

    expect(result.current.count).toBe(0);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter({ initialValue: 5 }));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });

  it('sets value within bounds', () => {
    const { result } = renderHook(() => useCounter({ min: 0, max: 100 }));

    act(() => {
      result.current.setValue(150);
    });

    expect(result.current.count).toBe(100);

    act(() => {
      result.current.setValue(-10);
    });

    expect(result.current.count).toBe(0);
  });
});
```

## Mocking Native Modules

React Native uses native modules that don't exist in the Jest environment. You need to mock them.

### Common Native Module Mocks

```javascript
// __mocks__/react-native-camera.js
export const RNCamera = {
  Constants: {
    Type: { back: 'back', front: 'front' },
    FlashMode: { on: 'on', off: 'off', auto: 'auto' },
  },
};

export default RNCamera;
```

```javascript
// __mocks__/@react-native-community/geolocation.js
export default {
  getCurrentPosition: jest.fn((success) =>
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    })
  ),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
};
```

```javascript
// jest.setup.js - Additional mocks
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getDeviceId: jest.fn(() => 'test-device-id'),
  getUniqueId: jest.fn(() => Promise.resolve('unique-id')),
  isEmulator: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
}));
```

## Mocking Navigation

React Navigation is commonly used and requires proper mocking.

### Navigation Mock Setup

```typescript
// testUtils.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    routes: [],
    index: 0,
  })),
};

export const mockRoute = {
  key: 'test-key',
  name: 'TestScreen',
  params: {},
};

export const createMockRoute = <T extends object>(params: T) => ({
  ...mockRoute,
  params,
});

// Wrapper for components that use navigation
export const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <NavigationContainer>{children}</NavigationContainer>;
};
```

### Testing Navigation Components

```typescript
// ProfileScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Profile: { userId: string };
  Settings: undefined;
  EditProfile: { userId: string };
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { userId } = route.params;

  return (
    <View style={styles.container}>
      <Text testID="user-id">User ID: {userId}</Text>
      <TouchableOpacity
        testID="settings-button"
        style={styles.button}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="edit-button"
        style={styles.button}
        onPress={() => navigation.navigate('EditProfile', { userId })}
      >
        <Text>Edit Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="back-button"
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  button: { padding: 12, marginVertical: 8, backgroundColor: '#eee', borderRadius: 8 },
});
```

```typescript
// ProfileScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import { mockNavigation, createMockRoute } from './testUtils';

// Mock the navigation hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => createMockRoute({ userId: 'user-123' }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the user ID from route params', () => {
    render(<ProfileScreen />);

    expect(screen.getByTestId('user-id')).toHaveTextContent('User ID: user-123');
  });

  it('navigates to Settings when settings button is pressed', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('settings-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  it('navigates to EditProfile with userId when edit button is pressed', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('edit-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile', {
      userId: 'user-123',
    });
  });

  it('goes back when back button is pressed', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
```

## Testing Async Operations

Many components involve asynchronous operations like API calls. Here's how to test them effectively.

### Component with Async Data Fetching

```typescript
// UserList.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserListProps {
  fetchUsers: () => Promise<User[]>;
  onUserPress: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ fetchUsers, onUserPress }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered} testID="loading-container">
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered} testID="error-container">
        <Text testID="error-message">{error}</Text>
        <TouchableOpacity testID="retry-button" onPress={loadUsers}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.centered} testID="empty-container">
        <Text testID="empty-message">No users found</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="user-list"
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          testID={`user-item-${item.id}`}
          style={styles.userItem}
          onPress={() => onUserPress(item)}
        >
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  userName: { fontSize: 16, fontWeight: '600' },
  userEmail: { fontSize: 14, color: '#666' },
});
```

```typescript
// UserList.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react-native';
import { UserList } from './UserList';

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com' },
];

describe('UserList', () => {
  const mockFetchUsers = jest.fn();
  const mockOnUserPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator initially', () => {
    mockFetchUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders user list after successful fetch', async () => {
    mockFetchUsers.mockResolvedValue(mockUsers);

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-list')).toBeTruthy();
    });

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
    expect(screen.getByText('Bob Wilson')).toBeTruthy();
  });

  it('displays error message when fetch fails', async () => {
    mockFetchUsers.mockRejectedValue(new Error('Network error'));

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    await waitFor(() => {
      expect(screen.getByTestId('error-container')).toBeTruthy();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load users');
  });

  it('retries fetch when retry button is pressed', async () => {
    mockFetchUsers
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockUsers);

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(screen.getByTestId('user-list')).toBeTruthy();
    });

    expect(mockFetchUsers).toHaveBeenCalledTimes(2);
  });

  it('displays empty message when no users returned', async () => {
    mockFetchUsers.mockResolvedValue([]);

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-container')).toBeTruthy();
    });

    expect(screen.getByTestId('empty-message')).toHaveTextContent('No users found');
  });

  it('calls onUserPress when a user item is pressed', async () => {
    mockFetchUsers.mockResolvedValue(mockUsers);

    render(<UserList fetchUsers={mockFetchUsers} onUserPress={mockOnUserPress} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('user-item-1'));

    expect(mockOnUserPress).toHaveBeenCalledWith(mockUsers[0]);
  });
});
```

## Snapshot Testing

Snapshot testing captures the rendered output and compares it against a stored snapshot.

### Using Snapshots Effectively

```typescript
// Card.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  imageUrl,
  footer,
}) => {
  return (
    <View style={styles.container}>
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} testID="card-image" />
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 200 },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
});
```

```typescript
// Card.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from './Card';

describe('Card Snapshots', () => {
  it('matches snapshot with basic props', () => {
    const { toJSON } = render(
      <Card title="Test Title" description="Test description text" />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with image', () => {
    const { toJSON } = render(
      <Card
        title="Card with Image"
        description="This card has an image"
        imageUrl="https://example.com/image.jpg"
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with footer', () => {
    const { toJSON } = render(
      <Card
        title="Card with Footer"
        description="This card has a footer"
        footer={<Text>Footer Content</Text>}
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with all props', () => {
    const { toJSON } = render(
      <Card
        title="Complete Card"
        description="This card has all props set"
        imageUrl="https://example.com/image.jpg"
        footer={<Text>Footer Content</Text>}
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });
});

// Best practices for snapshot testing
describe('Card Snapshot Best Practices', () => {
  it('uses inline snapshots for small components', () => {
    const { toJSON } = render(
      <Card title="Small" description="Inline snapshot test" />
    );

    // For smaller outputs, inline snapshots are more readable
    expect(toJSON()).toMatchInlineSnapshot();
  });
});
```

### Snapshot Testing Tips

1. **Keep snapshots small**: Test smaller components individually
2. **Review snapshot changes**: Always review diffs in pull requests
3. **Use inline snapshots**: For small outputs, inline snapshots are easier to review
4. **Don't over-rely on snapshots**: Combine with behavioral tests
5. **Update intentionally**: Only update snapshots when changes are intentional

## Code Coverage Setup

Configure Jest to collect and report code coverage.

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/types/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### Running Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Watch mode with coverage
npm test -- --coverage --watchAll

# Generate coverage for specific files
npm test -- --coverage --collectCoverageFrom='src/components/**/*.tsx'
```

## Testing Best Practices

### 1. Follow the Testing Trophy

```
    /\
   /  \      E2E Tests (few)
  /----\     Integration Tests (some)
 /------\    Unit Tests (many)
/________\   Static Analysis (base)
```

### 2. Test Behavior, Not Implementation

```typescript
// Bad: Testing implementation details
it('sets isLoading state to true', () => {
  const { result } = renderHook(() => useData());
  expect(result.current.isLoading).toBe(true);
});

// Good: Testing behavior
it('shows loading indicator while fetching data', async () => {
  render(<DataComponent />);
  expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  await waitFor(() => {
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });
});
```

### 3. Use Test IDs Strategically

```typescript
// Use semantic testIDs
<TouchableOpacity testID="submit-button" />
<TextInput testID="email-input" />
<View testID="error-container" />

// Avoid index-based testIDs when possible
// Bad: testID={`item-${index}`}
// Good: testID={`item-${item.id}`}
```

### 4. Organize Tests Clearly

```typescript
describe('ComponentName', () => {
  // Group by feature or behavior
  describe('rendering', () => {
    it('renders correctly with default props', () => {});
    it('renders correctly with custom props', () => {});
  });

  describe('user interactions', () => {
    it('handles button press', () => {});
    it('handles text input', () => {});
  });

  describe('error handling', () => {
    it('displays error message on failure', () => {});
    it('allows retry after error', () => {});
  });
});
```

### 5. Create Test Utilities

```typescript
// testUtils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './ThemeContext';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavigationContainer>{children}</NavigationContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

## CI Integration for Tests

Integrate tests into your CI/CD pipeline for automated quality checks.

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage --ci --reporters=default --reporters=jest-junit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./reports/junit

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            ./reports/junit
            ./coverage

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage is below 80%: $COVERAGE%"
            exit 1
          fi
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit",
    "test:update": "jest --updateSnapshot",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Pre-commit Hooks with Husky

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

## Conclusion

Unit testing React Native components with Jest is essential for building reliable mobile applications. By following the practices outlined in this guide, you can:

1. **Set up Jest properly** with the right configuration for React Native
2. **Use React Native Testing Library** to write tests that reflect user behavior
3. **Test component rendering** to ensure UI consistency
4. **Test user interactions** to verify functionality
5. **Test custom hooks** in isolation
6. **Mock native modules** and navigation effectively
7. **Handle async operations** in your tests
8. **Use snapshot testing** appropriately
9. **Configure code coverage** to track test completeness
10. **Integrate tests into CI/CD** for automated quality assurance

Remember that good tests are:
- **Fast**: They run quickly, encouraging frequent execution
- **Isolated**: They don't depend on external services or other tests
- **Repeatable**: They produce the same results every time
- **Self-validating**: They clearly pass or fail
- **Timely**: They're written alongside or before the code they test

Start with the most critical paths in your application, maintain high coverage on business logic, and continuously improve your test suite as your application grows. Happy testing!
