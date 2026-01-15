# How to Implement Global State Management with Zustand in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Zustand, State Management, TypeScript, Mobile Development

Description: Learn how to implement lightweight and performant global state management in React Native using Zustand.

---

## Introduction

State management is one of the most critical architectural decisions in any React Native application. While solutions like Redux have dominated the ecosystem for years, developers often find themselves writing excessive boilerplate code for simple state operations. Enter Zustand—a small, fast, and scalable state management solution that has gained tremendous popularity for its simplicity and performance.

In this comprehensive guide, we will explore how to implement global state management in React Native using Zustand. We will cover everything from basic store creation to advanced patterns like middleware, persistence, and multi-store architectures.

## Why Zustand for React Native?

Before diving into implementation details, let us understand why Zustand is an excellent choice for React Native applications:

### 1. Minimal Bundle Size

Zustand weighs in at approximately 1KB minified and gzipped. For mobile applications where bundle size directly impacts download times and startup performance, this is a significant advantage over alternatives like Redux (plus middleware) which can add several kilobytes to your bundle.

### 2. No Provider Required

Unlike Redux or Context-based solutions, Zustand does not require wrapping your application in a provider component. This eliminates unnecessary re-renders and simplifies your component tree.

### 3. Hooks-Based API

Zustand provides a clean, hooks-based API that feels natural in React Native applications. You simply call a hook to access state—no connect functions, no mapStateToProps, no dispatch calls.

### 4. TypeScript First

Zustand has excellent TypeScript support out of the box, making it easy to maintain type safety across your application.

### 5. Selective Re-renders

Components only re-render when the specific piece of state they subscribe to changes, leading to better performance in complex applications.

## Installation

Let us start by installing Zustand in your React Native project:

```bash
# Using npm
npm install zustand

# Using yarn
yarn add zustand

# Using pnpm
pnpm add zustand
```

For persistence (which we will cover later), you will also need:

```bash
npm install @react-native-async-storage/async-storage
```

## Basic Store Creation

Creating a store in Zustand is remarkably straightforward. Let us create a simple counter store to understand the basics:

```typescript
// stores/counterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

Now you can use this store in any component:

```typescript
// components/Counter.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useCounterStore } from '../stores/counterStore';

export const Counter: React.FC = () => {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <View style={styles.buttonRow}>
        <Button title="Decrement" onPress={decrement} />
        <Button title="Reset" onPress={reset} />
        <Button title="Increment" onPress={increment} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  count: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
```

## TypeScript Store Typing

Zustand works seamlessly with TypeScript. Let us explore more comprehensive typing patterns for real-world applications:

### Defining Complex State Types

```typescript
// types/user.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}
```

### Creating a Typed Store

```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { User, UserPreferences } from '../types/user';

interface UserState {
  // State
  user: User | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  language: 'en',
};

export const useUserStore = create<UserState>((set) => ({
  // Initial state
  user: null,
  preferences: defaultPreferences,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      error: null,
    }),

  updatePreferences: (newPreferences) =>
    set((state) => ({
      preferences: { ...state.preferences, ...newPreferences },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      preferences: defaultPreferences,
      error: null,
    }),
}));
```

### Using Generic Types for Reusable Patterns

```typescript
// stores/createEntityStore.ts
import { create, StateCreator } from 'zustand';

interface EntityState<T> {
  items: T[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface EntityActions<T> {
  setItems: (items: T[]) => void;
  addItem: (item: T) => void;
  updateItem: (id: string, updates: Partial<T>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type EntityStore<T> = EntityState<T> & EntityActions<T>;

export function createEntityStore<T extends { id: string }>() {
  return create<EntityStore<T>>((set) => ({
    items: [],
    selectedId: null,
    isLoading: false,
    error: null,

    setItems: (items) => set({ items }),

    addItem: (item) =>
      set((state) => ({ items: [...state.items, item] })),

    updateItem: (id, updates) =>
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      })),

    removeItem: (id) =>
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      })),

    selectItem: (id) => set({ selectedId: id }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),
  }));
}

// Usage
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export const useTaskStore = createEntityStore<Task>();
```

## Selecting State Slices

One of Zustand's most powerful features is the ability to select specific slices of state, preventing unnecessary re-renders when unrelated state changes.

### Basic Slice Selection

```typescript
// components/UserProfile.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useUserStore } from '../stores/userStore';

export const UserProfile: React.FC = () => {
  // Only re-renders when user changes, not when preferences change
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <Text>Not logged in</Text>;
  }

  return (
    <View style={styles.container}>
      {user.avatar && (
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      )}
      <Text style={styles.name}>
        {user.firstName} {user.lastName}
      </Text>
      <Text style={styles.email}>{user.email}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
});
```

### Selecting Multiple Values with Shallow Comparison

When selecting multiple values, use Zustand's shallow equality function to prevent unnecessary re-renders:

```typescript
// components/UserSettings.tsx
import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../stores/userStore';

export const UserSettings: React.FC = () => {
  // Using useShallow for object selection
  const { theme, notifications, updatePreferences } = useUserStore(
    useShallow((state) => ({
      theme: state.preferences.theme,
      notifications: state.preferences.notifications,
      updatePreferences: state.updatePreferences,
    }))
  );

  return (
    <View style={styles.container}>
      <View style={styles.setting}>
        <Text style={styles.label}>Notifications</Text>
        <Switch
          value={notifications}
          onValueChange={(value) => updatePreferences({ notifications: value })}
        />
      </View>
      <View style={styles.setting}>
        <Text style={styles.label}>Theme: {theme}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
  },
});
```

### Creating Custom Selector Hooks

For frequently used selections, create custom hooks:

```typescript
// stores/userStore.ts
// ... previous code ...

// Custom selector hooks
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserPreferences = () => useUserStore((state) => state.preferences);
export const useTheme = () => useUserStore((state) => state.preferences.theme);

// Memoized selectors for derived state
export const useUserDisplayName = () =>
  useUserStore((state) =>
    state.user ? `${state.user.firstName} ${state.user.lastName}` : 'Guest'
  );
```

## Actions and Mutations

Zustand provides flexible ways to define and organize actions. Let us explore various patterns:

### Grouping Related Actions

```typescript
// stores/cartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isCheckingOut: boolean;
}

interface CartActions {
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCheckingOut: (status: boolean) => void;
}

interface CartGetters {
  getTotal: () => number;
  getItemCount: () => number;
  getItemById: (id: string) => CartItem | undefined;
}

type CartStore = CartState & CartActions & CartGetters;

export const useCartStore = create<CartStore>((set, get) => ({
  // State
  items: [],
  isCheckingOut: false,

  // Actions
  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find(
        (i) => i.productId === item.productId
      );

      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...item,
            id: `cart-${Date.now()}`,
            quantity: 1,
          },
        ],
      };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),

  updateQuantity: (itemId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== itemId) };
      }
      return {
        items: state.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      };
    }),

  clearCart: () => set({ items: [], isCheckingOut: false }),

  setCheckingOut: (status) => set({ isCheckingOut: status }),

  // Getters (using get() to access current state)
  getTotal: () => {
    const state = get();
    return state.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  },

  getItemCount: () => {
    const state = get();
    return state.items.reduce((count, item) => count + item.quantity, 0);
  },

  getItemById: (id) => {
    const state = get();
    return state.items.find((item) => item.id === id);
  },
}));
```

### Using Actions Outside of Components

Zustand stores expose a getState method that allows you to access and modify state outside of React components:

```typescript
// services/analytics.ts
import { useCartStore } from '../stores/cartStore';

export const trackPurchase = () => {
  const state = useCartStore.getState();
  const total = state.getTotal();
  const itemCount = state.getItemCount();

  // Send to analytics service
  console.log(`Purchase tracked: ${itemCount} items, $${total.toFixed(2)}`);
};

// Can also modify state directly
export const emergencyClearCart = () => {
  useCartStore.getState().clearCart();
};
```

## Async Actions Handling

Real-world applications often require async operations like API calls. Here is how to handle them elegantly with Zustand:

### Basic Async Actions

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { User } from '../types/user';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.login(email, password);
      set({
        user: response.user,
        token: response.token,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.register(userData);
      set({
        user: response.user,
        token: response.token,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      const { token } = get();
      if (token) {
        await authApi.logout(token);
      }
    } finally {
      set({
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshToken: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const response = await authApi.refreshToken(token);
      set({ token: response.token });
    } catch (error) {
      // Token refresh failed, logout user
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
}));
```

### Using the Async Store in Components

```typescript
// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useShallow } from 'zustand/react/shallow';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { isLoading, error, login, clearError } = useAuthStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      error: state.error,
      login: state.login,
      clearError: state.clearError,
    }))
  );

  const handleLogin = async () => {
    try {
      await login(email, password);
      // Navigation will happen automatically based on auth state
    } catch {
      Alert.alert('Login Failed', 'Please check your credentials');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) clearError();
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (error) clearError();
        }}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
});
```

## Persisting State to Storage

For React Native applications, persisting state across app restarts is crucial. Zustand provides a persist middleware that works seamlessly with AsyncStorage:

### Setting Up Persistence

```typescript
// stores/persistedStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PersistedState {
  user: {
    id: string;
    name: string;
  } | null;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
  onboardingCompleted: boolean;
}

interface PersistedActions {
  setUser: (user: PersistedState['user']) => void;
  updatePreferences: (prefs: Partial<PersistedState['preferences']>) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const initialState: PersistedState = {
  user: null,
  preferences: {
    theme: 'light',
    language: 'en',
  },
  onboardingCompleted: false,
};

export const usePersistedStore = create<PersistedState & PersistedActions>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      completeOnboarding: () => set({ onboardingCompleted: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Partial Persistence

Sometimes you only want to persist certain parts of your state:

```typescript
// stores/authStoreWithPersistence.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;  // Don't persist
  error: string | null;  // Don't persist
}

interface AuthActions {
  setTokens: (token: string, refreshToken: string) => void;
  clearTokens: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      clearTokens: () => set({ token: null, refreshToken: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist token and refreshToken
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### Handling Migration

When your state shape changes between app versions, use migrations:

```typescript
// stores/migratedStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStateV2 {
  version: number;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
  };
}

export const useAppStore = create<AppStateV2>()(
  persist(
    (set) => ({
      version: 2,
      settings: {
        theme: 'system',
        notifications: {
          push: true,
          email: true,
          sms: false,
        },
      },
    }),
    {
      name: 'app-state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;

        if (version === 0 || version === 1) {
          // Migrate from v1 to v2
          // V1 had: { theme: string, notificationsEnabled: boolean }
          return {
            version: 2,
            settings: {
              theme: (state.theme as string) || 'system',
              notifications: {
                push: (state.notificationsEnabled as boolean) ?? true,
                email: true,
                sms: false,
              },
            },
          };
        }

        return state as AppStateV2;
      },
    }
  )
);
```

## Middleware Usage

Zustand supports middleware for extending store functionality. Let us explore common middleware patterns:

### Logging Middleware

```typescript
// middleware/logger.ts
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(
  f: StateCreator<T, [], []>,
  name?: string
) => StateCreator<T, [], []>;

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (...args) => {
    const prevState = get();
    set(...args);
    const nextState = get();

    if (__DEV__) {
      console.log(
        `%c${name || 'store'} state changed`,
        'color: #9E9E9E; font-weight: bold;'
      );
      console.log('%cprev state', 'color: #9E9E9E', prevState);
      console.log('%cnext state', 'color: #4CAF50', nextState);
    }
  };

  return f(loggedSet, get, store);
};

export const logger = loggerImpl as Logger;
```

### Using Multiple Middleware

```typescript
// stores/enhancedStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../middleware/logger';

interface TodoState {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

interface TodoActions {
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
}

export const useTodoStore = create<TodoState & TodoActions>()(
  devtools(
    persist(
      immer(
        logger(
          (set) => ({
            todos: [],

            addTodo: (text) =>
              set((state) => {
                state.todos.push({
                  id: `todo-${Date.now()}`,
                  text,
                  completed: false,
                });
              }),

            toggleTodo: (id) =>
              set((state) => {
                const todo = state.todos.find((t) => t.id === id);
                if (todo) {
                  todo.completed = !todo.completed;
                }
              }),

            removeTodo: (id) =>
              set((state) => {
                const index = state.todos.findIndex((t) => t.id === id);
                if (index !== -1) {
                  state.todos.splice(index, 1);
                }
              }),
          }),
          'todo-store'
        )
      ),
      {
        name: 'todo-storage',
        storage: createJSONStorage(() => AsyncStorage),
      }
    ),
    { name: 'TodoStore' }
  )
);
```

## Devtools Integration

While React Native does not have browser devtools, you can still debug Zustand stores effectively:

### Using Flipper Plugin

```typescript
// stores/debuggableStore.ts
import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DebugState {
  value: number;
  increment: () => void;
}

// Enable devtools in development
const createStore = <T>(
  storeCreator: StateCreator<T, [], []>,
  name: string
) => {
  if (__DEV__) {
    return create<T>()(devtools(storeCreator, { name }));
  }
  return create<T>()(storeCreator);
};

export const useDebugStore = createStore<DebugState>(
  (set) => ({
    value: 0,
    increment: () => set((state) => ({ value: state.value + 1 })),
  }),
  'DebugStore'
);
```

### Custom Debug Logging

```typescript
// utils/storeDebugger.ts
import { StoreApi } from 'zustand';

export function createStoreDebugger<T>(
  store: StoreApi<T>,
  storeName: string
) {
  if (!__DEV__) return () => {};

  return store.subscribe((state, prevState) => {
    const changes = findChanges(prevState as object, state as object);

    console.group(`${storeName} Update`);
    console.log('Changes:', changes);
    console.log('Full State:', state);
    console.groupEnd();
  });
}

function findChanges(prev: object, next: object): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  for (const key of Object.keys(next)) {
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) {
      changes[key] = {
        from: prev[key as keyof typeof prev],
        to: next[key as keyof typeof next],
      };
    }
  }

  return changes;
}

// Usage
// createStoreDebugger(useMyStore, 'MyStore');
```

## Store Hydration

Managing the hydration state is important for persisted stores to prevent UI flicker:

### Hydration Hook Pattern

```typescript
// hooks/useHydration.ts
import { useEffect, useState } from 'react';
import { usePersistedStore } from '../stores/persistedStore';

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Check if the store has been hydrated
    const unsubscribe = usePersistedStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Check if already hydrated
    if (usePersistedStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return hydrated;
}
```

### App-Level Hydration Gate

```typescript
// App.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useHydration } from './hooks/useHydration';
import { Navigation } from './navigation';

export default function App() {
  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Navigation />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Handling Multiple Store Hydration

```typescript
// hooks/useStoresHydration.ts
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useSettingsStore } from '../stores/settingsStore';

const stores = [useAuthStore, useUserStore, useSettingsStore];

export function useStoresHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      const allHydrated = stores.every((store) =>
        store.persist.hasHydrated()
      );
      if (allHydrated) {
        setHydrated(true);
      }
    };

    const unsubscribers = stores.map((store) =>
      store.persist.onFinishHydration(checkHydration)
    );

    // Initial check
    checkHydration();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return hydrated;
}
```

## Multiple Stores Pattern

For larger applications, organizing state into multiple focused stores improves maintainability:

### Store Organization Structure

```
stores/
  index.ts          # Re-exports all stores
  authStore.ts      # Authentication state
  userStore.ts      # User profile and preferences
  cartStore.ts      # Shopping cart
  productStore.ts   # Product catalog
  uiStore.ts        # UI state (modals, toasts, etc.)
```

### Combining Stores

```typescript
// stores/index.ts
export { useAuthStore } from './authStore';
export { useUserStore } from './userStore';
export { useCartStore } from './cartStore';
export { useProductStore } from './productStore';
export { useUIStore } from './uiStore';

// Combined hook for common selections
import { useShallow } from 'zustand/react/shallow';

export function useAppState() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useUserStore((s) => s.user);
  const cartItemCount = useCartStore((s) => s.getItemCount());

  return { isAuthenticated, user, cartItemCount };
}
```

### Cross-Store Communication

```typescript
// stores/orderStore.ts
import { create } from 'zustand';
import { useCartStore } from './cartStore';
import { useAuthStore } from './authStore';
import { orderApi } from '../services/api';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isProcessing: boolean;
  error: string | null;
}

interface OrderActions {
  placeOrder: () => Promise<void>;
  fetchOrders: () => Promise<void>;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: Date;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export const useOrderStore = create<OrderState & OrderActions>((set) => ({
  orders: [],
  currentOrder: null,
  isProcessing: false,
  error: null,

  placeOrder: async () => {
    // Access other stores
    const cartState = useCartStore.getState();
    const authState = useAuthStore.getState();

    if (!authState.isAuthenticated) {
      set({ error: 'Must be logged in to place order' });
      return;
    }

    if (cartState.items.length === 0) {
      set({ error: 'Cart is empty' });
      return;
    }

    set({ isProcessing: true, error: null });

    try {
      const order = await orderApi.createOrder({
        items: cartState.items,
        total: cartState.getTotal(),
      });

      set((state) => ({
        orders: [...state.orders, order],
        currentOrder: order,
        isProcessing: false,
      }));

      // Clear the cart after successful order
      cartState.clearCart();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Order failed',
        isProcessing: false,
      });
    }
  },

  fetchOrders: async () => {
    const authState = useAuthStore.getState();

    if (!authState.token) return;

    try {
      const orders = await orderApi.getOrders(authState.token);
      set({ orders });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      });
    }
  },
}));
```

### Store Subscriptions

```typescript
// stores/syncStores.ts
import { useAuthStore } from './authStore';
import { useUserStore } from './userStore';
import { useCartStore } from './cartStore';

export function initializeStoreSync() {
  // When auth state changes, update related stores
  const unsubAuth = useAuthStore.subscribe(
    (state) => state.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (wasAuthenticated && !isAuthenticated) {
        // User logged out - clear user data
        useUserStore.getState().reset();
        useCartStore.getState().clearCart();
      }
    }
  );

  return () => {
    unsubAuth();
  };
}

// Call in App.tsx
// useEffect(() => initializeStoreSync(), []);
```

## Best Practices and Patterns

### 1. Keep Stores Focused

Each store should manage a single domain or feature:

```typescript
// Good: Focused stores
const useAuthStore = create(...);     // Only authentication
const useUserStore = create(...);     // Only user data
const useNotificationStore = create(...); // Only notifications

// Avoid: Kitchen sink store
const useAppStore = create(...); // Auth + User + Cart + UI + ...
```

### 2. Normalize Complex State

For relational data, normalize your state structure:

```typescript
// stores/normalizedStore.ts
interface NormalizedState {
  users: Record<string, User>;
  posts: Record<string, Post>;
  comments: Record<string, Comment>;

  // Lookup arrays for ordering
  userIds: string[];
  postIds: string[];
}

export const useNormalizedStore = create<NormalizedState>((set) => ({
  users: {},
  posts: {},
  comments: {},
  userIds: [],
  postIds: [],

  // Actions work with IDs and objects
  addPost: (post: Post) =>
    set((state) => ({
      posts: { ...state.posts, [post.id]: post },
      postIds: [...state.postIds, post.id],
    })),
}));
```

### 3. Use Computed Values Wisely

Derive values in selectors rather than storing computed data:

```typescript
// Selector with computation
const useCartTotal = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

// For expensive computations, use useMemo in components
const MyComponent = () => {
  const items = useCartStore((state) => state.items);

  const expensiveCalculation = useMemo(() => {
    return items.reduce((acc, item) => {
      // Complex calculation
      return acc;
    }, initialValue);
  }, [items]);
};
```

### 4. Handle Loading and Error States Consistently

```typescript
// types/asyncState.ts
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function createAsyncState<T>(initial: T | null = null): AsyncState<T> {
  return {
    data: initial,
    isLoading: false,
    error: null,
  };
}

// Usage in stores
interface DataStore {
  users: AsyncState<User[]>;
  fetchUsers: () => Promise<void>;
}

export const useDataStore = create<DataStore>((set) => ({
  users: createAsyncState([]),

  fetchUsers: async () => {
    set((state) => ({
      users: { ...state.users, isLoading: true, error: null },
    }));

    try {
      const data = await api.getUsers();
      set((state) => ({
        users: { data, isLoading: false, error: null },
      }));
    } catch (error) {
      set((state) => ({
        users: {
          ...state.users,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed',
        },
      }));
    }
  },
}));
```

### 5. Reset Store State for Testing

```typescript
// stores/testableStore.ts
interface StoreState {
  count: number;
  increment: () => void;
}

const initialState = {
  count: 0,
};

export const useTestableStore = create<StoreState & { reset: () => void }>(
  (set) => ({
    ...initialState,
    increment: () => set((state) => ({ count: state.count + 1 })),
    reset: () => set(initialState),
  })
);

// In tests
beforeEach(() => {
  useTestableStore.getState().reset();
});
```

### 6. Type-Safe Action Creators

```typescript
// utils/createAction.ts
type ActionCreator<T, P extends unknown[]> = {
  (...args: P): void;
  type: string;
};

function createAction<T, P extends unknown[]>(
  set: (fn: (state: T) => Partial<T>) => void,
  type: string,
  reducer: (state: T, ...args: P) => Partial<T>
): ActionCreator<T, P> {
  const action = (...args: P) => {
    set((state) => reducer(state, ...args));
  };
  action.type = type;
  return action;
}
```

## Conclusion

Zustand provides an elegant and powerful solution for state management in React Native applications. Its minimal API, excellent TypeScript support, and flexible middleware system make it an ideal choice for projects of any size.

Key takeaways from this guide:

1. **Start simple**: Begin with basic stores and add complexity as needed
2. **Use TypeScript**: Take advantage of Zustand's excellent type inference
3. **Optimize renders**: Use selectors and shallow comparison to minimize re-renders
4. **Persist wisely**: Only persist what is necessary and handle migrations
5. **Organize logically**: Split state into focused, domain-specific stores
6. **Handle async properly**: Manage loading and error states consistently

By following these patterns and best practices, you can build maintainable, performant React Native applications with Zustand as your state management solution.

## Further Reading

- [Zustand Official Documentation](https://github.com/pmndrs/zustand)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Native Performance](https://reactnative.dev/docs/performance)
