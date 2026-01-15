# How to Implement Redux Toolkit with TypeScript in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Redux Toolkit, TypeScript, State Management, Mobile Development

Description: Learn how to set up and use Redux Toolkit with TypeScript in React Native for scalable and type-safe state management.

---

## Introduction

State management is one of the most critical aspects of building scalable mobile applications. While React Native provides built-in state management through `useState` and `useContext`, complex applications often require a more robust solution. Redux Toolkit (RTK) has emerged as the official, opinionated, batteries-included toolset for efficient Redux development.

In this comprehensive guide, we'll explore how to implement Redux Toolkit with TypeScript in React Native, covering everything from basic setup to advanced patterns used in production applications.

## Why Redux Toolkit in React Native?

### The Evolution of Redux

Traditional Redux required significant boilerplate code: action types, action creators, reducers, and immutable update logic. Redux Toolkit addresses these pain points by providing:

- **Simplified store setup** with `configureStore`
- **Reduced boilerplate** with `createSlice`
- **Built-in immutability** via Immer
- **Async logic handling** with `createAsyncThunk`
- **Data fetching solution** through RTK Query

### Benefits for React Native Apps

1. **Predictable State**: Single source of truth for your entire app state
2. **Type Safety**: First-class TypeScript support eliminates runtime errors
3. **DevTools Integration**: Debug state changes even on mobile devices
4. **Performance**: Optimized selectors prevent unnecessary re-renders
5. **Offline Support**: Easy integration with persistence libraries

## Project Setup

Let's start by setting up a new React Native project with all necessary dependencies.

```bash
# Create a new React Native project
npx react-native init MyApp --template react-native-template-typescript

# Navigate to project directory
cd MyApp

# Install Redux Toolkit and React-Redux
npm install @reduxjs/toolkit react-redux

# Install additional dependencies for persistence and debugging
npm install @react-native-async-storage/async-storage redux-persist

# Install type definitions
npm install --save-dev @types/react-redux
```

## Store Configuration with TypeScript

The foundation of any Redux application is the store. Let's create a properly typed store configuration.

### Creating the Root Store

Create a new file `src/store/index.ts`:

```typescript
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your slice reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import settingsReducer from './slices/settingsSlice';
import { apiSlice } from './api/apiSlice';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  settings: settingsReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

// Persistence configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // Only persist these reducers
  blacklist: [apiSlice.reducerPath], // Never persist API cache
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
  devTools: __DEV__, // Enable DevTools only in development
});

// Create persistor
export const persistor = persistStore(store);

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Creating Typed Hooks

Create `src/store/hooks.ts` for type-safe Redux hooks:

```typescript
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Typed versions of useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Optional: Create a typed useStore hook
import { useStore } from 'react-redux';
import type { Store } from '@reduxjs/toolkit';

export const useAppStore = () => useStore<Store<RootState>>();
```

## Creating Slices with createSlice

Slices are the building blocks of Redux Toolkit. Each slice contains the reducer logic and actions for a specific feature.

### Authentication Slice

Create `src/store/slices/authSlice.ts`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for the slice state
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Define the initial state with proper typing
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Create the slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Simple action to set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Action to handle successful login
    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },

    // Action to handle login failure
    loginFailure: (state, action: PayloadAction<string>) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
    },

    // Action to handle logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },

    // Action to update user profile
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    // Action to refresh tokens
    refreshTokens: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string }>
    ) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },

    // Action to clear errors
    clearError: (state) => {
      state.error = null;
    },
  },
});

// Export actions
export const {
  setLoading,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  refreshTokens,
  clearError,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;
```

### User Slice with Prepare Callbacks

Create `src/store/slices/userSlice.ts`:

```typescript
import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  read: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  biometricAuth: boolean;
}

interface UserState {
  preferences: UserPreferences;
  notifications: Notification[];
  lastSyncTimestamp: number | null;
}

const initialState: UserState = {
  preferences: {
    theme: 'system',
    language: 'en',
    notifications: true,
    biometricAuth: false,
  },
  notifications: [],
  lastSyncTimestamp: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Update preferences with partial updates
    updatePreferences: (
      state,
      action: PayloadAction<Partial<UserPreferences>>
    ) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    // Add notification with prepare callback for auto-generated fields
    addNotification: {
      reducer: (state, action: PayloadAction<Notification>) => {
        state.notifications.unshift(action.payload);
        // Keep only last 50 notifications
        if (state.notifications.length > 50) {
          state.notifications = state.notifications.slice(0, 50);
        }
      },
      prepare: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => ({
        payload: {
          ...notification,
          id: nanoid(),
          timestamp: Date.now(),
          read: false,
        },
      }),
    },

    // Mark notification as read
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },

    // Mark all notifications as read
    markAllNotificationsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
    },

    // Remove notification
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Update sync timestamp
    updateSyncTimestamp: (state) => {
      state.lastSyncTimestamp = Date.now();
    },

    // Reset user state
    resetUserState: () => initialState,
  },
});

export const {
  updatePreferences,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  updateSyncTimestamp,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
```

## Typed Selectors and useSelector

Selectors are functions that extract specific pieces of state. Let's create properly typed selectors.

### Creating Selectors

Create `src/store/selectors/authSelectors.ts`:

```typescript
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Basic selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Memoized selectors using createSelector
export const selectUserDisplayName = createSelector([selectUser], (user) =>
  user ? user.name || user.email : 'Guest'
);

export const selectUserInitials = createSelector([selectUser], (user) => {
  if (!user?.name) return '?';
  const names = user.name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return names[0][0].toUpperCase();
});

export const selectAuthStatus = createSelector(
  [selectIsAuthenticated, selectAuthLoading, selectAuthError],
  (isAuthenticated, isLoading, error) => ({
    isAuthenticated,
    isLoading,
    error,
    status: isLoading
      ? 'loading'
      : error
      ? 'error'
      : isAuthenticated
      ? 'authenticated'
      : 'unauthenticated',
  })
);
```

### User Selectors

Create `src/store/selectors/userSelectors.ts`:

```typescript
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Basic selectors
export const selectUserState = (state: RootState) => state.user;
export const selectPreferences = (state: RootState) => state.user.preferences;
export const selectNotifications = (state: RootState) =>
  state.user.notifications;
export const selectTheme = (state: RootState) => state.user.preferences.theme;

// Memoized selectors
export const selectUnreadNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.filter((n) => !n.read)
);

export const selectUnreadCount = createSelector(
  [selectUnreadNotifications],
  (unread) => unread.length
);

export const selectNotificationsByType = createSelector(
  [selectNotifications, (_state: RootState, type: string) => type],
  (notifications, type) => notifications.filter((n) => n.type === type)
);

export const selectRecentNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.slice(0, 10)
);

// Parameterized selector factory
export const makeSelectNotificationById = () =>
  createSelector(
    [selectNotifications, (_state: RootState, id: string) => id],
    (notifications, id) => notifications.find((n) => n.id === id)
  );
```

### Using Selectors in Components

```typescript
import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectUnreadNotifications,
  selectUnreadCount,
} from '../store/selectors/userSelectors';
import { markNotificationRead } from '../store/slices/userSlice';

const NotificationBadge: React.FC = () => {
  const unreadCount = useAppSelector(selectUnreadCount);

  if (unreadCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};

const NotificationList: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectUnreadNotifications);

  const handlePress = (id: string) => {
    dispatch(markNotificationRead(id));
  };

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handlePress(item.id)}>
          <View style={styles.notification}>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};
```

## Async Thunks with createAsyncThunk

For handling asynchronous operations like API calls, Redux Toolkit provides `createAsyncThunk`.

### Authentication Thunks

Create `src/store/thunks/authThunks.ts`:

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { authApi } from '../../services/api';

// Define types for API responses
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  token: string;
  refreshToken: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Type for thunk API configuration
interface ThunkApiConfig {
  state: RootState;
  rejectValue: string;
}

// Login thunk
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginCredentials,
  ThunkApiConfig
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authApi.login(credentials);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data.message);
    }
    return rejectWithValue('An unexpected error occurred');
  }
});

// Register thunk
export const registerUser = createAsyncThunk<
  LoginResponse,
  RegisterData,
  ThunkApiConfig
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    const response = await authApi.register(data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      return rejectWithValue(error.response.data.message);
    }
    return rejectWithValue('Registration failed');
  }
});

// Logout thunk
export const logoutUser = createAsyncThunk<void, void, ThunkApiConfig>(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (auth.token) {
        await authApi.logout(auth.token);
      }
    } catch (error: any) {
      // Even if API call fails, we still want to clear local state
      console.warn('Logout API call failed:', error);
    }
  }
);

// Refresh token thunk
export const refreshAuthToken = createAsyncThunk<
  { token: string; refreshToken: string },
  void,
  ThunkApiConfig
>('auth/refreshToken', async (_, { getState, rejectWithValue }) => {
  try {
    const { auth } = getState();
    if (!auth.refreshToken) {
      return rejectWithValue('No refresh token available');
    }
    const response = await authApi.refreshToken(auth.refreshToken);
    return response.data;
  } catch (error: any) {
    return rejectWithValue('Token refresh failed');
  }
});

// Fetch user profile thunk
export const fetchUserProfile = createAsyncThunk<
  LoginResponse['user'],
  void,
  ThunkApiConfig
>('auth/fetchProfile', async (_, { getState, rejectWithValue }) => {
  try {
    const { auth } = getState();
    if (!auth.token) {
      return rejectWithValue('Not authenticated');
    }
    const response = await authApi.getProfile(auth.token);
    return response.data;
  } catch (error: any) {
    return rejectWithValue('Failed to fetch profile');
  }
});
```

### Handling Thunk States in Slice

Update `src/store/slices/authSlice.ts` to handle async thunks:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAuthToken,
  fetchUserProfile,
} from '../thunks/authThunks';

// ... (previous interface definitions)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ... (previous reducers)
  },
  extraReducers: (builder) => {
    // Login thunk handlers
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Login failed';
      });

    // Register thunk handlers
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Registration failed';
      });

    // Logout thunk handlers
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    });

    // Refresh token handlers
    builder
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        // Force logout on refresh failure
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });

    // Fetch profile handlers
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to fetch profile';
      });
  },
});

export default authSlice.reducer;
```

## RTK Query for Data Fetching

RTK Query is a powerful data fetching and caching tool built into Redux Toolkit.

### Setting Up API Slice

Create `src/store/api/apiSlice.ts`:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Define base types
interface BaseResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Define entity types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
}

interface Order {
  id: string;
  userId: string;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Create the API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.example.com/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Product', 'Order', 'User'],
  endpoints: (builder) => ({
    // Products endpoints
    getProducts: builder.query<
      PaginatedResponse<Product>,
      { page?: number; pageSize?: number; category?: string }
    >({
      query: ({ page = 1, pageSize = 20, category }) => ({
        url: '/products',
        params: { page, pageSize, category },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: 'Product' as const,
                id,
              })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    searchProducts: builder.query<Product[], string>({
      query: (searchTerm) => ({
        url: '/products/search',
        params: { q: searchTerm },
      }),
      providesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    // Orders endpoints
    getOrders: builder.query<PaginatedResponse<Order>, { page?: number }>({
      query: ({ page = 1 }) => ({
        url: '/orders',
        params: { page },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: 'Order' as const,
                id,
              })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),

    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),

    createOrder: builder.mutation<
      Order,
      { products: Array<{ productId: string; quantity: number }> }
    >({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),

    cancelOrder: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useSearchProductsQuery,
  useLazySearchProductsQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
} = apiSlice;
```

### Using RTK Query in Components

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  useGetProductsQuery,
  useLazySearchProductsQuery,
  useCreateOrderMutation,
} from '../store/api/apiSlice';

const ProductList: React.FC = () => {
  const [page, setPage] = useState(1);
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProductsQuery({ page, pageSize: 20 });

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (isError) {
    return (
      <View style={styles.error}>
        <Text>Error loading products</Text>
        <TouchableOpacity onPress={refetch}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={data?.items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} />
      }
      onEndReached={() => {
        if (data && page < data.totalPages) {
          setPage((p) => p + 1);
        }
      }}
      renderItem={({ item }) => (
        <View style={styles.productCard}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        </View>
      )}
    />
  );
};

const ProductSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [trigger, { data, isLoading, isFetching }] = useLazySearchProductsQuery();

  const handleSearch = () => {
    if (searchTerm.trim()) {
      trigger(searchTerm);
    }
  };

  return (
    <View>
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        onSubmitEditing={handleSearch}
        placeholder="Search products..."
      />
      {(isLoading || isFetching) && <ActivityIndicator />}
      {data && (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text>{item.name}</Text>
          )}
        />
      )}
    </View>
  );
};
```

## Persisting Redux State

For React Native apps, persisting state across app restarts is essential. We've already set up Redux Persist in our store configuration.

### Custom Storage Configuration

Create `src/store/storage.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Storage } from 'redux-persist';

// Custom storage wrapper with error handling
export const createStorage = (): Storage => ({
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing ${key} to storage:`, error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  },
});

// Selective persistence transform
import { createTransform } from 'redux-persist';

// Transform to encrypt sensitive data before persistence
export const sensitiveDataTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState: any, key) => {
    if (key === 'auth') {
      // Don't persist tokens in plain text (in production, use encryption)
      return {
        ...inboundState,
        token: null,
        refreshToken: null,
      };
    }
    return inboundState;
  },
  // Transform state being rehydrated
  (outboundState: any, key) => {
    return outboundState;
  },
  // Define which reducers this transform gets called for
  { whitelist: ['auth'] }
);
```

### Provider Setup

Update `App.tsx`:

```typescript
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

const LoadingView: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingView />} persistor={persistor}>
        <AppNavigator />
      </PersistGate>
    </Provider>
  );
};

export default App;
```

## Redux DevTools Integration

Debugging Redux state in React Native requires special setup.

### Using React Native Debugger

```typescript
// In your store configuration, DevTools are enabled automatically
// when __DEV__ is true

export const store = configureStore({
  reducer: persistedReducer,
  devTools: __DEV__, // Enables DevTools in development
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});
```

### Using Flipper

Create `src/store/flipperDebugger.ts`:

```typescript
// For Flipper Redux debugging support
import { Middleware } from '@reduxjs/toolkit';

let flipperReduxDebugger: any = null;

if (__DEV__) {
  try {
    // Dynamic import for development only
    const createDebugger = require('redux-flipper').default;
    flipperReduxDebugger = createDebugger();
  } catch (e) {
    console.log('Redux Flipper not available');
  }
}

export const getFlipperMiddleware = (): Middleware[] => {
  if (flipperReduxDebugger) {
    return [flipperReduxDebugger];
  }
  return [];
};
```

Update store configuration:

```typescript
import { getFlipperMiddleware } from './flipperDebugger';

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(apiSlice.middleware)
      .concat(getFlipperMiddleware()),
  devTools: __DEV__,
});
```

## Middleware Configuration

Custom middleware allows you to intercept actions and perform side effects.

### Logger Middleware

Create `src/store/middleware/logger.ts`:

```typescript
import { Middleware, isRejectedWithValue } from '@reduxjs/toolkit';

export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (__DEV__) {
    console.group(action.type);
    console.log('Dispatching:', action);
    const result = next(action);
    console.log('Next State:', store.getState());
    console.groupEnd();
    return result;
  }
  return next(action);
};

// Error logging middleware
export const errorLoggerMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    console.error('Rejected action:', action.type);
    console.error('Payload:', action.payload);
    console.error('Error:', action.error);
  }
  return next(action);
};
```

### API Error Handler Middleware

Create `src/store/middleware/apiErrorHandler.ts`:

```typescript
import { Middleware, isRejectedWithValue } from '@reduxjs/toolkit';
import { addNotification } from '../slices/userSlice';
import { logout } from '../slices/authSlice';

export const apiErrorHandler: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (isRejectedWithValue(action)) {
      const payload = action.payload as any;

      // Handle 401 Unauthorized errors
      if (payload?.status === 401) {
        dispatch(logout());
        dispatch(
          addNotification({
            type: 'error',
            message: 'Your session has expired. Please log in again.',
          })
        );
      }

      // Handle 403 Forbidden errors
      if (payload?.status === 403) {
        dispatch(
          addNotification({
            type: 'error',
            message: 'You do not have permission to perform this action.',
          })
        );
      }

      // Handle network errors
      if (payload?.status === 'FETCH_ERROR') {
        dispatch(
          addNotification({
            type: 'error',
            message: 'Network error. Please check your connection.',
          })
        );
      }

      // Handle server errors
      if (payload?.status >= 500) {
        dispatch(
          addNotification({
            type: 'error',
            message: 'Server error. Please try again later.',
          })
        );
      }
    }

    return next(action);
  };
```

## Best Practices for Large Apps

### Feature-Based Folder Structure

```
src/
├── store/
│   ├── index.ts              # Store configuration
│   ├── hooks.ts              # Typed hooks
│   ├── api/
│   │   └── apiSlice.ts       # RTK Query base API
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── userSlice.ts
│   │   └── index.ts          # Export all slices
│   ├── selectors/
│   │   ├── authSelectors.ts
│   │   ├── userSelectors.ts
│   │   └── index.ts
│   ├── thunks/
│   │   ├── authThunks.ts
│   │   └── index.ts
│   └── middleware/
│       ├── logger.ts
│       ├── apiErrorHandler.ts
│       └── index.ts
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── components/
│   │   └── hooks/
│   ├── products/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── api/
│   │   │   └── productsApi.ts  # Feature-specific API
│   │   └── hooks/
│   └── orders/
│       ├── screens/
│       ├── components/
│       ├── api/
│       │   └── ordersApi.ts
│       └── hooks/
```

### Injecting Endpoints

For large applications, split API definitions across features:

```typescript
// src/features/products/api/productsApi.ts
import { apiSlice } from '../../../store/api/apiSlice';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductReviews: builder.query({
      query: (productId: string) => `/products/${productId}/reviews`,
      providesTags: (result, error, productId) => [
        { type: 'Product', id: productId },
      ],
    }),
    addProductReview: builder.mutation({
      query: ({ productId, ...body }) => ({
        url: `/products/${productId}/reviews`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetProductReviewsQuery, useAddProductReviewMutation } =
  productsApi;
```

### Entity Adapters for Normalized State

```typescript
import {
  createSlice,
  createEntityAdapter,
  EntityState,
  PayloadAction,
} from '@reduxjs/toolkit';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

// Create entity adapter
const cartAdapter = createEntityAdapter<CartItem>({
  selectId: (item) => item.id,
  sortComparer: (a, b) => a.productId.localeCompare(b.productId),
});

interface CartState extends EntityState<CartItem> {
  lastUpdated: number | null;
}

const initialState: CartState = cartAdapter.getInitialState({
  lastUpdated: null,
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: cartAdapter.addOne,
    updateCartItem: cartAdapter.updateOne,
    removeFromCart: cartAdapter.removeOne,
    clearCart: (state) => {
      cartAdapter.removeAll(state);
      state.lastUpdated = Date.now();
    },
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      cartAdapter.setAll(state, action.payload);
      state.lastUpdated = Date.now();
    },
  },
});

// Export adapter selectors
export const {
  selectAll: selectAllCartItems,
  selectById: selectCartItemById,
  selectIds: selectCartItemIds,
  selectTotal: selectCartItemCount,
} = cartAdapter.getSelectors((state: RootState) => state.cart);

// Custom selectors
export const selectCartTotal = createSelector([selectAllCartItems], (items) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)
);

export const { addToCart, updateCartItem, removeFromCart, clearCart, setCartItems } =
  cartSlice.actions;

export default cartSlice.reducer;
```

## Testing Redux Logic

### Testing Reducers

Create `src/store/__tests__/authSlice.test.ts`:

```typescript
import authReducer, {
  loginSuccess,
  logout,
  updateProfile,
  setLoading,
} from '../slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setLoading', () => {
    const actual = authReducer(initialState, setLoading(true));
    expect(actual.isLoading).toBe(true);
  });

  it('should handle loginSuccess', () => {
    const payload = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'test-token',
      refreshToken: 'test-refresh-token',
    };

    const actual = authReducer(initialState, loginSuccess(payload));

    expect(actual.user).toEqual(payload.user);
    expect(actual.token).toBe(payload.token);
    expect(actual.isAuthenticated).toBe(true);
    expect(actual.isLoading).toBe(false);
  });

  it('should handle logout', () => {
    const loggedInState = {
      ...initialState,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      isAuthenticated: true,
    };

    const actual = authReducer(loggedInState, logout());

    expect(actual.user).toBeNull();
    expect(actual.token).toBeNull();
    expect(actual.isAuthenticated).toBe(false);
  });

  it('should handle updateProfile', () => {
    const loggedInState = {
      ...initialState,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      isAuthenticated: true,
    };

    const actual = authReducer(
      loggedInState,
      updateProfile({ name: 'Updated Name' })
    );

    expect(actual.user?.name).toBe('Updated Name');
    expect(actual.user?.email).toBe('test@example.com');
  });
});
```

### Testing Async Thunks

Create `src/store/__tests__/authThunks.test.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import { loginUser } from '../thunks/authThunks';
import { authApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api');

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('authThunks', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        auth: authReducer,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should handle successful login', async () => {
      const store = createTestStore();
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'test-token',
          refreshToken: 'test-refresh-token',
        },
      };

      mockAuthApi.login.mockResolvedValueOnce(mockResponse);

      await store.dispatch(
        loginUser({ email: 'test@example.com', password: 'password123' })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(state.token).toBe('test-token');
    });

    it('should handle login failure', async () => {
      const store = createTestStore();
      const errorMessage = 'Invalid credentials';

      mockAuthApi.login.mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await store.dispatch(
        loginUser({ email: 'test@example.com', password: 'wrong-password' })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });
});
```

### Testing Selectors

Create `src/store/__tests__/selectors.test.ts`:

```typescript
import {
  selectUserDisplayName,
  selectUserInitials,
  selectAuthStatus,
} from '../selectors/authSelectors';

describe('authSelectors', () => {
  const createState = (authOverrides = {}) => ({
    auth: {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      ...authOverrides,
    },
    user: {
      preferences: { theme: 'system', language: 'en', notifications: true, biometricAuth: false },
      notifications: [],
      lastSyncTimestamp: null,
    },
  });

  describe('selectUserDisplayName', () => {
    it('should return "Guest" when no user', () => {
      const state = createState();
      expect(selectUserDisplayName(state as any)).toBe('Guest');
    });

    it('should return user name when available', () => {
      const state = createState({
        user: { id: '1', email: 'test@example.com', name: 'John Doe' },
      });
      expect(selectUserDisplayName(state as any)).toBe('John Doe');
    });

    it('should return email when name is not available', () => {
      const state = createState({
        user: { id: '1', email: 'test@example.com', name: '' },
      });
      expect(selectUserDisplayName(state as any)).toBe('test@example.com');
    });
  });

  describe('selectUserInitials', () => {
    it('should return "?" when no user', () => {
      const state = createState();
      expect(selectUserInitials(state as any)).toBe('?');
    });

    it('should return initials from full name', () => {
      const state = createState({
        user: { id: '1', email: 'test@example.com', name: 'John Doe' },
      });
      expect(selectUserInitials(state as any)).toBe('JD');
    });

    it('should handle single name', () => {
      const state = createState({
        user: { id: '1', email: 'test@example.com', name: 'John' },
      });
      expect(selectUserInitials(state as any)).toBe('J');
    });
  });

  describe('selectAuthStatus', () => {
    it('should return loading status when loading', () => {
      const state = createState({ isLoading: true });
      const result = selectAuthStatus(state as any);
      expect(result.status).toBe('loading');
    });

    it('should return error status when error exists', () => {
      const state = createState({ error: 'Some error' });
      const result = selectAuthStatus(state as any);
      expect(result.status).toBe('error');
    });

    it('should return authenticated status when authenticated', () => {
      const state = createState({ isAuthenticated: true });
      const result = selectAuthStatus(state as any);
      expect(result.status).toBe('authenticated');
    });
  });
});
```

### Testing RTK Query

Create `src/store/__tests__/api.test.ts`:

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';

const server = setupServer(
  rest.get('https://api.example.com/v1/products', (req, res, ctx) => {
    return res(
      ctx.json({
        items: [
          { id: '1', name: 'Product 1', price: 10 },
          { id: '2', name: 'Product 2', price: 20 },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiSlice', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        [apiSlice.reducerPath]: apiSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
    });

  it('should fetch products successfully', async () => {
    const store = createTestStore();

    const result = await store.dispatch(
      apiSlice.endpoints.getProducts.initiate({ page: 1 })
    );

    expect(result.data?.items).toHaveLength(2);
    expect(result.data?.items[0].name).toBe('Product 1');
  });
});
```

## Conclusion

Redux Toolkit with TypeScript provides a powerful, type-safe foundation for state management in React Native applications. By following the patterns and practices outlined in this guide, you can:

1. **Reduce boilerplate** significantly compared to traditional Redux
2. **Ensure type safety** throughout your state management code
3. **Handle async operations** elegantly with createAsyncThunk
4. **Implement data fetching** efficiently with RTK Query
5. **Persist state** reliably across app restarts
6. **Debug effectively** with DevTools integration
7. **Scale confidently** with proper folder structure and patterns
8. **Test thoroughly** with unit tests for all Redux logic

The combination of Redux Toolkit's developer experience improvements and TypeScript's static typing creates a robust foundation for building complex React Native applications that are maintainable and scalable.

## Resources

- [Redux Toolkit Official Documentation](https://redux-toolkit.js.org/)
- [React-Redux Hooks Documentation](https://react-redux.js.org/api/hooks)
- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [Redux Persist GitHub](https://github.com/rt2zz/redux-persist)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
