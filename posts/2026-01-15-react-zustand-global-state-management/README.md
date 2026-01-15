# How to Implement Global State Management with Zustand in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Zustand, State Management, Hooks, TypeScript, Frontend

Description: Learn how to implement efficient and scalable global state management in React applications using Zustand, a lightweight and performant state management library.

---

## Introduction

State management is one of the most critical aspects of building React applications. As applications grow in complexity, managing state across multiple components becomes increasingly challenging. While React's built-in useState and useContext hooks work well for simple cases, they often fall short when dealing with complex global state requirements.

Enter **Zustand** - a small, fast, and scalable state management solution for React. Zustand (German for "state") offers a minimalist API that eliminates boilerplate code while providing powerful features like middleware support, devtools integration, and excellent TypeScript support.

In this comprehensive guide, we'll explore everything you need to know about implementing global state management with Zustand in React applications.

## Why Choose Zustand?

Before diving into implementation details, let's understand why Zustand has become a popular choice among React developers:

### 1. Minimal Boilerplate

Unlike Redux, which requires actions, reducers, and action creators, Zustand allows you to define your entire store in just a few lines of code.

### 2. No Provider Required

Zustand doesn't require wrapping your application in a Provider component. Your stores are accessible from anywhere in your application.

### 3. Excellent Performance

Zustand uses a subscription-based model that only re-renders components when the specific state they subscribe to changes.

### 4. TypeScript First

Zustand was designed with TypeScript in mind, offering excellent type inference and safety.

### 5. Middleware Support

Zustand supports middleware for logging, persistence, devtools integration, and more.

### 6. Small Bundle Size

At just ~1KB gzipped, Zustand adds minimal overhead to your application.

## Installation and Setup

Let's start by setting up Zustand in a React project.

### Installing Zustand

```bash
# Using npm
npm install zustand

# Using yarn
yarn add zustand

# Using pnpm
pnpm add zustand
```

### Project Structure

For a well-organized codebase, we recommend the following structure:

```
src/
├── stores/
│   ├── index.ts
│   ├── useUserStore.ts
│   ├── useCartStore.ts
│   ├── useThemeStore.ts
│   └── useNotificationStore.ts
├── components/
├── hooks/
└── App.tsx
```

## Creating Your First Store

Let's create a simple counter store to understand the basics:

### Basic Store Example

```typescript
// src/stores/useCounterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  incrementBy: (amount: number) => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
}));

export default useCounterStore;
```

### Using the Store in Components

```tsx
// src/components/Counter.tsx
import React from 'react';
import useCounterStore from '../stores/useCounterStore';

const Counter: React.FC = () => {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      <div className="button-group">
        <button onClick={decrement}>-</button>
        <button onClick={increment}>+</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
};

export default Counter;
```

## Advanced Store Patterns

Now let's explore more advanced patterns for real-world applications.

### 1. User Authentication Store

```typescript
// src/stores/useUserStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  clearError: () => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: true }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          // Simulated API call
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Invalid credentials');
          }

          const user = await response.json();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          });
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
        // Clear any stored tokens
        localStorage.removeItem('auth-token');
      },

      updateProfile: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useUserStore;
```

### 2. Shopping Cart Store

```typescript
// src/stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Computed values (getters)
  totalItems: () => number;
  totalPrice: () => number;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        isOpen: false,

        totalItems: () => {
          return get().items.reduce((total, item) => total + item.quantity, 0);
        },

        totalPrice: () => {
          return get().items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );
        },

        addItem: (item) => {
          set((state) => {
            const existingItem = state.items.find((i) => i.id === item.id);

            if (existingItem) {
              return {
                items: state.items.map((i) =>
                  i.id === item.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
                ),
              };
            }

            return {
              items: [...state.items, { ...item, quantity: 1 }],
            };
          }, false, 'addItem');
        },

        removeItem: (id) => {
          set(
            (state) => ({
              items: state.items.filter((item) => item.id !== id),
            }),
            false,
            'removeItem'
          );
        },

        updateQuantity: (id, quantity) => {
          set(
            (state) => ({
              items: quantity <= 0
                ? state.items.filter((item) => item.id !== id)
                : state.items.map((item) =>
                    item.id === id ? { ...item, quantity } : item
                  ),
            }),
            false,
            'updateQuantity'
          );
        },

        clearCart: () => set({ items: [] }, false, 'clearCart'),

        toggleCart: () => set((state) => ({ isOpen: !state.isOpen }), false, 'toggleCart'),
      }),
      {
        name: 'cart-storage',
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: 'CartStore' }
  )
);

export default useCartStore;
```

### 3. Theme Store with System Preference Detection

```typescript
// src/stores/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme);
        set({ theme, resolvedTheme });

        // Apply theme to document
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolvedTheme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on rehydration
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(state.resolvedTheme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const resolvedTheme = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedTheme });
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolvedTheme);
    }
  });
}

export default useThemeStore;
```

### 4. Notification/Toast Store

```typescript
// src/stores/useNotificationStore.ts
import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

interface NotificationState {
  notifications: Notification[];

  // Actions
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;

  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const generateId = (): string => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = generateId();
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => set({ notifications: [] }),

  success: (title, message) => {
    return get().addNotification({ type: 'success', title, message });
  },

  error: (title, message) => {
    return get().addNotification({ type: 'error', title, message, duration: 8000 });
  },

  warning: (title, message) => {
    return get().addNotification({ type: 'warning', title, message });
  },

  info: (title, message) => {
    return get().addNotification({ type: 'info', title, message });
  },
}));

export default useNotificationStore;
```

## TypeScript Integration Best Practices

Zustand provides excellent TypeScript support. Here are some best practices for type-safe stores.

### 1. Defining State Interfaces

Always define explicit interfaces for your state:

```typescript
// src/types/store.types.ts

// Define separate interfaces for state and actions
interface UserStateData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UserStateActions {
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

// Combine for the complete store type
type UserState = UserStateData & UserStateActions;
```

### 2. Using Generics for Reusable Patterns

```typescript
// src/stores/createAsyncStore.ts
import { create, StateCreator } from 'zustand';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface AsyncActions<T> {
  setData: (data: T) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AsyncStore<T> = AsyncState<T> & AsyncActions<T>;

const createAsyncStore = <T>(): StateCreator<AsyncStore<T>> => {
  return (set) => ({
    data: null,
    isLoading: false,
    error: null,

    setData: (data) => set({ data, isLoading: false, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    reset: () => set({ data: null, isLoading: false, error: null }),
  });
};

// Usage
interface Product {
  id: string;
  name: string;
  price: number;
}

const useProductStore = create<AsyncStore<Product[]>>(createAsyncStore<Product[]>());

export { createAsyncStore, useProductStore };
export type { AsyncStore };
```

### 3. Type-Safe Selectors

```typescript
// src/stores/useUserStore.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  setUser: (user: User) => void;
}

const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  permissions: [],
  setUser: (user) => set({ user, isAuthenticated: true }),
}));

// Type-safe selector hooks
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const usePermissions = () => useUserStore((state) => state.permissions);

// Selector with shallow comparison for object/array selections
export const useUserProfile = () => useUserStore(
  useShallow((state) => ({
    name: state.user?.name,
    email: state.user?.email,
  }))
);

// Check specific permission
export const useHasPermission = (permission: string): boolean => {
  return useUserStore((state) => state.permissions.includes(permission));
};

export default useUserStore;
```

## Middleware Deep Dive

Zustand supports various middleware for enhanced functionality.

### 1. Persist Middleware

```typescript
// src/stores/usePersistentStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';

interface AppSettings {
  language: string;
  notifications: boolean;
  autoSave: boolean;
  fontSize: number;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  language: 'en',
  notifications: true,
  autoSave: true,
  fontSize: 14,
};

// Custom storage with encryption (example)
const encryptedStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    if (value) {
      // Decrypt value here if needed
      return value;
    }
    return null;
  },
  setItem: (name: string, value: string): void => {
    // Encrypt value here if needed
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

const persistOptions: PersistOptions<SettingsState> = {
  name: 'app-settings',
  storage: createJSONStorage(() => encryptedStorage),
  version: 1,
  migrate: (persistedState, version) => {
    if (version === 0) {
      // Migration logic from version 0 to 1
      return {
        ...persistedState,
        settings: {
          ...defaultSettings,
          ...(persistedState as SettingsState).settings,
        },
      };
    }
    return persistedState as SettingsState;
  },
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    persistOptions
  )
);

export default useSettingsStore;
```

### 2. Devtools Middleware

```typescript
// src/stores/useDebugStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DebugState {
  logs: string[];
  isDebugMode: boolean;
  addLog: (message: string) => void;
  clearLogs: () => void;
  toggleDebugMode: () => void;
}

const useDebugStore = create<DebugState>()(
  devtools(
    (set) => ({
      logs: [],
      isDebugMode: process.env.NODE_ENV === 'development',

      addLog: (message) => {
        set(
          (state) => ({
            logs: [...state.logs, `[${new Date().toISOString()}] ${message}`],
          }),
          false,
          'debug/addLog'
        );
      },

      clearLogs: () => {
        set({ logs: [] }, false, 'debug/clearLogs');
      },

      toggleDebugMode: () => {
        set(
          (state) => ({ isDebugMode: !state.isDebugMode }),
          false,
          'debug/toggleMode'
        );
      },
    }),
    {
      name: 'DebugStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

export default useDebugStore;
```

### 3. Immer Middleware for Immutable Updates

```typescript
// src/stores/useComplexStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: Task[];
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

interface ProjectState {
  projects: Project[];
  addProject: (name: string) => void;
  addTask: (projectId: string, title: string) => void;
  toggleTask: (projectId: string, taskId: string) => void;
  addSubtask: (projectId: string, taskId: string, title: string) => void;
}

const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    projects: [],

    addProject: (name) => {
      set((state) => {
        state.projects.push({
          id: `project-${Date.now()}`,
          name,
          tasks: [],
        });
      });
    },

    addTask: (projectId, title) => {
      set((state) => {
        const project = state.projects.find((p) => p.id === projectId);
        if (project) {
          project.tasks.push({
            id: `task-${Date.now()}`,
            title,
            completed: false,
            subtasks: [],
          });
        }
      });
    },

    toggleTask: (projectId, taskId) => {
      set((state) => {
        const project = state.projects.find((p) => p.id === projectId);
        if (project) {
          const task = project.tasks.find((t) => t.id === taskId);
          if (task) {
            task.completed = !task.completed;
          }
        }
      });
    },

    addSubtask: (projectId, taskId, title) => {
      set((state) => {
        const project = state.projects.find((p) => p.id === projectId);
        if (project) {
          const task = project.tasks.find((t) => t.id === taskId);
          if (task) {
            task.subtasks.push({
              id: `subtask-${Date.now()}`,
              title,
              completed: false,
              subtasks: [],
            });
          }
        }
      });
    },
  }))
);

export default useProjectStore;
```

### 4. Combining Multiple Middleware

```typescript
// src/stores/useFullFeaturedStore.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AppState {
  count: number;
  user: { name: string } | null;
  increment: () => void;
  setUser: (name: string) => void;
}

const useFullFeaturedStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          count: 0,
          user: null,

          increment: () => {
            set((state) => {
              state.count += 1;
            });
          },

          setUser: (name) => {
            set((state) => {
              state.user = { name };
            });
          },
        }))
      ),
      { name: 'full-featured-store' }
    ),
    { name: 'FullFeaturedStore' }
  )
);

// Subscribe to specific state changes
useFullFeaturedStore.subscribe(
  (state) => state.count,
  (count) => {
    console.log('Count changed to:', count);
  }
);

export default useFullFeaturedStore;
```

## Performance Optimization

### 1. Selective Subscriptions

```tsx
// BAD - Re-renders on any state change
const Component = () => {
  const state = useStore(); // Subscribes to entire store
  return <div>{state.count}</div>;
};

// GOOD - Only re-renders when count changes
const Component = () => {
  const count = useStore((state) => state.count);
  return <div>{count}</div>;
};
```

### 2. Using useShallow for Object Selections

```tsx
import { useShallow } from 'zustand/react/shallow';

// Without useShallow - creates new object reference every render
const Component = () => {
  const { name, email } = useStore((state) => ({
    name: state.user?.name,
    email: state.user?.email,
  })); // Re-renders on ANY state change!

  return <div>{name} - {email}</div>;
};

// With useShallow - only re-renders when name or email actually change
const Component = () => {
  const { name, email } = useStore(
    useShallow((state) => ({
      name: state.user?.name,
      email: state.user?.email,
    }))
  );

  return <div>{name} - {email}</div>;
};
```

### 3. Memoized Selectors

```typescript
// src/stores/selectors.ts
import { useMemo } from 'react';
import useCartStore from './useCartStore';

// Memoized expensive computation
export const useCartSummary = () => {
  const items = useCartStore((state) => state.items);

  return useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const averageItemPrice = totalItems > 0 ? totalPrice / totalItems : 0;

    return {
      totalItems,
      totalPrice,
      averageItemPrice,
      formattedTotal: `$${totalPrice.toFixed(2)}`,
    };
  }, [items]);
};
```

## Testing Zustand Stores

### 1. Unit Testing Store Logic

```typescript
// src/stores/__tests__/useCounterStore.test.ts
import { act } from '@testing-library/react';
import useCounterStore from '../useCounterStore';

describe('useCounterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCounterStore.setState({ count: 0 });
  });

  it('should initialize with count of 0', () => {
    const { count } = useCounterStore.getState();
    expect(count).toBe(0);
  });

  it('should increment count', () => {
    const { increment } = useCounterStore.getState();

    act(() => {
      increment();
    });

    expect(useCounterStore.getState().count).toBe(1);
  });

  it('should decrement count', () => {
    useCounterStore.setState({ count: 5 });
    const { decrement } = useCounterStore.getState();

    act(() => {
      decrement();
    });

    expect(useCounterStore.getState().count).toBe(4);
  });

  it('should reset count to 0', () => {
    useCounterStore.setState({ count: 10 });
    const { reset } = useCounterStore.getState();

    act(() => {
      reset();
    });

    expect(useCounterStore.getState().count).toBe(0);
  });

  it('should increment by specific amount', () => {
    const { incrementBy } = useCounterStore.getState();

    act(() => {
      incrementBy(5);
    });

    expect(useCounterStore.getState().count).toBe(5);
  });
});
```

### 2. Testing Components with Stores

```tsx
// src/components/__tests__/Counter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Counter from '../Counter';
import useCounterStore from '../../stores/useCounterStore';

describe('Counter Component', () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0 });
  });

  it('should display current count', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('should increment count when + button is clicked', () => {
    render(<Counter />);

    fireEvent.click(screen.getByText('+'));

    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('should decrement count when - button is clicked', () => {
    useCounterStore.setState({ count: 5 });
    render(<Counter />);

    fireEvent.click(screen.getByText('-'));

    expect(screen.getByText('Count: 4')).toBeInTheDocument();
  });

  it('should reset count when Reset button is clicked', () => {
    useCounterStore.setState({ count: 10 });
    render(<Counter />);

    fireEvent.click(screen.getByText('Reset'));

    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});
```

### 3. Mocking Stores in Tests

```tsx
// src/test-utils/mockStores.ts
import { create } from 'zustand';

// Create a mock store for testing
export const createMockUserStore = (initialState = {}) => {
  return create(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    setUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    ...initialState,
  }));
};

// Usage in tests
jest.mock('../stores/useUserStore', () => ({
  __esModule: true,
  default: createMockUserStore({
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));
```

## Real-World Example: Complete Application State

Let's put it all together with a complete e-commerce application state management system.

### Store Index File

```typescript
// src/stores/index.ts
export { default as useUserStore } from './useUserStore';
export { default as useCartStore } from './useCartStore';
export { default as useThemeStore } from './useThemeStore';
export { default as useNotificationStore } from './useNotificationStore';

// Re-export selector hooks
export { useUser, useIsAuthenticated } from './useUserStore';
export { useCartSummary } from './useCartStore';

// Re-export types
export type { User } from './useUserStore';
export type { CartItem } from './useCartStore';
```

### Using Multiple Stores Together

```tsx
// src/components/Header.tsx
import React from 'react';
import { useUserStore, useCartStore, useThemeStore } from '../stores';

const Header: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const totalItems = useCartStore((state) => state.totalItems());
  const toggleCart = useCartStore((state) => state.toggleCart);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return (
    <header className="app-header">
      <div className="logo">My Store</div>

      <nav className="nav-actions">
        <button onClick={toggleTheme} className="theme-toggle">
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button onClick={toggleCart} className="cart-button">
          Cart ({totalItems})
        </button>

        {user ? (
          <div className="user-menu">
            <span>Welcome, {user.name}</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <a href="/login">Login</a>
        )}
      </nav>
    </header>
  );
};

export default Header;
```

## Summary Table

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Basic Store** | Simple state with actions | Counter, toggles, simple forms |
| **Persist Middleware** | Saves state to storage | User preferences, cart items, auth tokens |
| **Devtools Middleware** | Redux DevTools integration | Development debugging |
| **Immer Middleware** | Immutable updates with mutable syntax | Complex nested state updates |
| **subscribeWithSelector** | Subscribe to specific state changes | Side effects, analytics |
| **Selective Subscriptions** | Subscribe only to needed state | Performance optimization |
| **useShallow** | Shallow comparison for objects | Selecting multiple state values |
| **TypeScript Interfaces** | Type-safe state definitions | Large applications, team projects |
| **Custom Selectors** | Memoized computed values | Expensive calculations, derived state |
| **Store Composition** | Multiple stores working together | Modular architecture |

## Best Practices Checklist

1. **Store Organization**
   - Keep stores focused and single-purpose
   - Use separate files for each store
   - Export stores and selectors from an index file

2. **TypeScript**
   - Always define explicit interfaces for state
   - Use generics for reusable patterns
   - Create type-safe selector hooks

3. **Performance**
   - Use selective subscriptions
   - Apply useShallow for object selections
   - Memoize expensive computations

4. **Testing**
   - Reset store state before each test
   - Test stores independently from components
   - Use mock stores for component tests

5. **Middleware**
   - Use persist for user data
   - Enable devtools in development
   - Consider immer for complex updates

## Conclusion

Zustand provides an elegant solution for global state management in React applications. Its minimal API, excellent TypeScript support, and powerful middleware system make it an excellent choice for projects of any size.

Key takeaways:

- **Simplicity**: Zustand reduces boilerplate compared to Redux while maintaining predictable state management
- **Performance**: Selective subscriptions and shallow comparisons ensure optimal rendering
- **Flexibility**: Middleware support allows you to extend functionality as needed
- **Type Safety**: First-class TypeScript support catches errors at compile time
- **Testing**: Easy to test both stores and components

Whether you're building a small application or a large-scale enterprise system, Zustand provides the tools you need for effective state management. Start with the basics and gradually adopt more advanced patterns as your application grows.

For more information, visit the [official Zustand documentation](https://github.com/pmndrs/zustand) and explore the examples in the repository.

Happy coding!
