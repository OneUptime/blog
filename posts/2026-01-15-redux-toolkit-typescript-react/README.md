# How to Implement Redux Toolkit with TypeScript in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Redux Toolkit, TypeScript, State Management, Frontend, Best Practices

Description: Learn how to implement Redux Toolkit with TypeScript in React applications, including createSlice, RTK Query, proper typing patterns, and best practices for scalable state management.

---

State management in React applications becomes increasingly complex as your application grows. Redux Toolkit (RTK) provides a standardized, opinionated way to write Redux logic while dramatically reducing boilerplate code. Combined with TypeScript, you get type safety that catches errors at compile time and provides excellent developer experience through autocompletion.

This guide covers everything from basic setup to advanced patterns like RTK Query for data fetching, all with proper TypeScript typing.

## Why Redux Toolkit with TypeScript

Redux Toolkit addresses common complaints about Redux:

- **Too much boilerplate** - RTK reduces code by 50-70%
- **Too many packages to install** - RTK includes essential dependencies
- **Manual immutable updates** - Immer is built-in for immutable updates with mutable syntax
- **No standard project structure** - RTK provides conventional patterns

TypeScript adds:

- **Type inference** - Automatic typing for state, actions, and selectors
- **Compile-time safety** - Catch errors before runtime
- **Better refactoring** - IDE support for renaming and restructuring
- **Self-documenting code** - Types serve as documentation

## Project Setup

### Installation

```bash
npm install @reduxjs/toolkit react-redux

# TypeScript types are included in both packages
# No need for @types/react-redux with recent versions
```

### Project Structure

A well-organized Redux Toolkit project follows this structure:

```
src/
  app/
    store.ts          # Store configuration
    hooks.ts          # Typed hooks
  features/
    auth/
      authSlice.ts    # Auth state slice
      authApi.ts      # RTK Query API for auth
    users/
      usersSlice.ts   # Users state slice
      usersApi.ts     # RTK Query API for users
    posts/
      postsSlice.ts
      postsApi.ts
  types/
    index.ts          # Shared type definitions
```

## Store Configuration

### Creating the Store with TypeScript

```typescript
// src/app/store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import postsReducer from '../features/posts/postsSlice';
import { authApi } from '../features/auth/authApi';
import { usersApi } from '../features/users/usersApi';
import { postsApi } from '../features/posts/postsApi';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  posts: postsReducer,
  // RTK Query reducers
  [authApi.reducerPath]: authApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [postsApi.reducerPath]: postsApi.reducer,
});

// Configure store with middleware
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(
      authApi.middleware,
      usersApi.middleware,
      postsApi.middleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer types from store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Typed Hooks

Create custom hooks that are properly typed:

```typescript
// src/app/hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof store>();
```

These typed hooks provide:

- Automatic type inference for `useAppSelector`
- Correct dispatch type for async thunks
- No need to type `RootState` in every selector

### Provider Setup

```typescript
// src/main.tsx or src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

## Creating Slices with createSlice

### Basic Slice with TypeScript

```typescript
// src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the shape of the auth state
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Define the initial state with proper typing
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Create the slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action with payload
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },

    // PayloadAction provides type safety for the payload
    loginSuccess(state, action: PayloadAction<{ user: User; token: string }>) {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
    },

    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    updateProfile(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    clearError(state) {
      state.error = null;
    },
  },
});

// Export actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  clearError,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Export selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsLoading = (state: { auth: AuthState }) =>
  state.auth.isLoading;
```

### Slice with Prepare Callbacks

For actions that need to transform the payload before it reaches the reducer:

```typescript
// src/features/posts/postsSlice.ts
import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
}

interface PostsState {
  posts: Post[];
  selectedPost: Post | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: Post['status'] | 'all';
    authorId: string | null;
  };
}

const initialState: PostsState = {
  posts: [],
  selectedPost: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    authorId: null,
  },
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Using prepare callback to generate id and timestamps
    addPost: {
      reducer(state, action: PayloadAction<Post>) {
        state.posts.push(action.payload);
      },
      prepare(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString();
        return {
          payload: {
            ...postData,
            id: nanoid(),
            createdAt: now,
            updatedAt: now,
          },
        };
      },
    },

    updatePost: {
      reducer(state, action: PayloadAction<{ id: string; changes: Partial<Post> }>) {
        const index = state.posts.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.posts[index] = {
            ...state.posts[index],
            ...action.payload.changes,
          };
        }
      },
      prepare(id: string, changes: Partial<Omit<Post, 'id' | 'createdAt'>>) {
        return {
          payload: {
            id,
            changes: {
              ...changes,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      },
    },

    deletePost(state, action: PayloadAction<string>) {
      state.posts = state.posts.filter((p) => p.id !== action.payload);
      if (state.selectedPost?.id === action.payload) {
        state.selectedPost = null;
      }
    },

    selectPost(state, action: PayloadAction<string | null>) {
      if (action.payload === null) {
        state.selectedPost = null;
      } else {
        state.selectedPost = state.posts.find((p) => p.id === action.payload) || null;
      }
    },

    setStatusFilter(state, action: PayloadAction<Post['status'] | 'all'>) {
      state.filters.status = action.payload;
    },

    setAuthorFilter(state, action: PayloadAction<string | null>) {
      state.filters.authorId = action.payload;
    },

    setPosts(state, action: PayloadAction<Post[]>) {
      state.posts = action.payload;
    },
  },
});

export const {
  addPost,
  updatePost,
  deletePost,
  selectPost,
  setStatusFilter,
  setAuthorFilter,
  setPosts,
} = postsSlice.actions;

export default postsSlice.reducer;

// Memoized selectors
export const selectAllPosts = (state: { posts: PostsState }) => state.posts.posts;
export const selectSelectedPost = (state: { posts: PostsState }) =>
  state.posts.selectedPost;
export const selectPostsFilters = (state: { posts: PostsState }) =>
  state.posts.filters;

// Derived selector
export const selectFilteredPosts = (state: { posts: PostsState }) => {
  const { posts, filters } = state.posts;
  return posts.filter((post) => {
    if (filters.status !== 'all' && post.status !== filters.status) {
      return false;
    }
    if (filters.authorId && post.authorId !== filters.authorId) {
      return false;
    }
    return true;
  });
};
```

## Async Thunks with createAsyncThunk

### Basic Async Thunk

```typescript
// src/features/users/usersSlice.ts
import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  SerializedError,
} from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

interface UsersState {
  users: User[];
  selectedUser: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  selectedUser: null,
  status: 'idle',
  error: null,
};

// Define the return type and argument type for the thunk
export const fetchUsers = createAsyncThunk<
  User[], // Return type
  void, // Argument type (void means no arguments)
  { rejectValue: string } // ThunkAPI config
>('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/users');

    if (!response.ok) {
      return rejectWithValue('Failed to fetch users');
    }

    const data: User[] = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue('Network error occurred');
  }
});

// Thunk with arguments
export const fetchUserById = createAsyncThunk<
  User,
  string, // The user ID argument
  { rejectValue: string }
>('users/fetchUserById', async (userId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      return rejectWithValue(`User with ID ${userId} not found`);
    }

    const data: User = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue('Network error occurred');
  }
});

// Thunk with complex arguments
interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
}

export const createUser = createAsyncThunk<
  User,
  CreateUserPayload,
  { rejectValue: string }
>('users/createUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      return rejectWithValue(error.message || 'Failed to create user');
    }

    const data: User = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue('Network error occurred');
  }
});

// Delete user thunk
export const deleteUser = createAsyncThunk<
  string, // Returns the deleted user ID
  string, // Argument is the user ID
  { rejectValue: string }
>('users/deleteUser', async (userId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return rejectWithValue('Failed to delete user');
    }

    return userId;
  } catch (error) {
    return rejectWithValue('Network error occurred');
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  // Handle async thunk lifecycle
  extraReducers: (builder) => {
    builder
      // fetchUsers cases
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
      })

      // fetchUserById cases
      .addCase(fetchUserById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedUser = action.payload;
        // Also update in the users array if exists
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
      })

      // createUser cases
      .addCase(createUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users.push(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
      })

      // deleteUser cases
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
      });
  },
});

export const { clearSelectedUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;

// Selectors
export const selectAllUsers = (state: { users: UsersState }) => state.users.users;
export const selectSelectedUser = (state: { users: UsersState }) =>
  state.users.selectedUser;
export const selectUsersStatus = (state: { users: UsersState }) =>
  state.users.status;
export const selectUsersError = (state: { users: UsersState }) =>
  state.users.error;
```

### Thunk with Access to State

```typescript
import { RootState } from '../../app/store';

export const fetchUserPostsIfNeeded = createAsyncThunk<
  Post[],
  string,
  { state: RootState; rejectValue: string }
>('posts/fetchUserPostsIfNeeded', async (userId, { getState, rejectWithValue }) => {
  // Access current state
  const state = getState();
  const existingPosts = state.posts.posts.filter((p) => p.authorId === userId);

  // Skip fetch if we already have posts
  if (existingPosts.length > 0) {
    return existingPosts;
  }

  try {
    const response = await fetch(`/api/users/${userId}/posts`);
    if (!response.ok) {
      return rejectWithValue('Failed to fetch posts');
    }
    return await response.json();
  } catch (error) {
    return rejectWithValue('Network error');
  }
});
```

## RTK Query for Data Fetching

RTK Query is a powerful data fetching and caching tool built into Redux Toolkit. It eliminates the need for writing thunks for API calls.

### Basic API Setup

```typescript
// src/features/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../app/store';

// Base API configuration
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  // Tag types for cache invalidation
  tagTypes: ['User', 'Post', 'Comment'],
  endpoints: () => ({}),
});
```

### Users API with Full CRUD

```typescript
// src/features/users/usersApi.ts
import { baseApi } from '../api/baseApi';

// Define types
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: User['role'];
}

interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: User['role'];
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: User['role'];
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

// Inject endpoints into the base API
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/users
    getUsers: builder.query<UsersResponse, UsersQueryParams | void>({
      query: (params) => ({
        url: 'users',
        params: params || {},
      }),
      // Provide tags for cache invalidation
      providesTags: (result) =>
        result
          ? [
              ...result.users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    // GET /api/users/:id
    getUserById: builder.query<User, string>({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // POST /api/users
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (body) => ({
        url: 'users',
        method: 'POST',
        body,
      }),
      // Invalidate the list cache when a new user is created
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // PUT /api/users/:id
    updateUser: builder.mutation<User, UpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: 'PUT',
        body,
      }),
      // Invalidate specific user and list
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // DELETE /api/users/:id
    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
```

### Posts API with Relationships

```typescript
// src/features/posts/postsApi.ts
import { baseApi } from '../api/baseApi';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface CreatePostRequest {
  title: string;
  content: string;
  tags?: string[];
  status?: Post['status'];
}

interface UpdatePostRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  status?: Post['status'];
}

interface PostsQueryParams {
  page?: number;
  limit?: number;
  authorId?: string;
  status?: Post['status'];
  tag?: string;
}

export const postsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/posts
    getPosts: builder.query<{ posts: Post[]; total: number }, PostsQueryParams | void>({
      query: (params) => ({
        url: 'posts',
        params: params || {},
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map(({ id }) => ({ type: 'Post' as const, id })),
              { type: 'Post', id: 'LIST' },
            ]
          : [{ type: 'Post', id: 'LIST' }],
    }),

    // GET /api/posts/:id
    getPostById: builder.query<Post, string>({
      query: (id) => `posts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Post', id }],
    }),

    // GET /api/posts/:id/comments
    getPostComments: builder.query<Comment[], string>({
      query: (postId) => `posts/${postId}/comments`,
      providesTags: (result, error, postId) => [
        { type: 'Comment', id: `POST_${postId}` },
      ],
    }),

    // POST /api/posts
    createPost: builder.mutation<Post, CreatePostRequest>({
      query: (body) => ({
        url: 'posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),

    // PUT /api/posts/:id
    updatePost: builder.mutation<Post, UpdatePostRequest>({
      query: ({ id, ...body }) => ({
        url: `posts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
      ],
    }),

    // DELETE /api/posts/:id
    deletePost: builder.mutation<void, string>({
      query: (id) => ({
        url: `posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
      ],
    }),

    // POST /api/posts/:id/comments
    addComment: builder.mutation<Comment, { postId: string; content: string }>({
      query: ({ postId, content }) => ({
        url: `posts/${postId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'Comment', id: `POST_${postId}` },
      ],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostByIdQuery,
  useGetPostCommentsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useAddCommentMutation,
} = postsApi;
```

### Advanced RTK Query Patterns

```typescript
// src/features/auth/authApi.ts
import { baseApi } from '../api/baseApi';
import { loginSuccess, logout } from './authSlice';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user' | 'moderator';
  };
  token: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Login mutation with side effects
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
      // Handle successful login
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Dispatch action to update auth state
          dispatch(loginSuccess({ user: data.user, token: data.token }));
          // Store token in localStorage
          localStorage.setItem('token', data.token);
        } catch (error) {
          // Error handling is done by the mutation hook
        }
      },
    }),

    // Register mutation
    register: builder.mutation<LoginResponse, RegisterRequest>({
      query: (userData) => ({
        url: 'auth/register',
        method: 'POST',
        body: userData,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(loginSuccess({ user: data.user, token: data.token }));
          localStorage.setItem('token', data.token);
        } catch (error) {
          // Handle error
        }
      },
    }),

    // Logout mutation
    logout: builder.mutation<void, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Always logout locally, even if API call fails
          dispatch(logout());
          localStorage.removeItem('token');
          // Reset all API cache
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    // Get current user
    getCurrentUser: builder.query<LoginResponse['user'], void>({
      query: () => 'auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
} = authApi;
```

## Using Redux in Components

### Component with RTK Query

```typescript
// src/components/UsersList.tsx
import React, { useState } from 'react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
} from '../features/users/usersApi';

interface UserFormData {
  email: string;
  name: string;
  password: string;
}

const UsersList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Query with automatic refetching
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useGetUsersQuery(
    { page, limit: 10, search: searchTerm },
    {
      // Refetch when window regains focus
      refetchOnFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Poll every 30 seconds
      pollingInterval: 30000,
    }
  );

  // Mutations
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const handleCreateUser = async (formData: UserFormData) => {
    try {
      await createUser(formData).unwrap();
      // Success - cache is automatically invalidated
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (isError) {
    return (
      <div>
        Error loading users: {(error as any)?.data?.message || 'Unknown error'}
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search users..."
      />

      {isFetching && <span>Refreshing...</span>}

      <ul>
        {data?.users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
            <button
              onClick={() => handleDeleteUser(user.id)}
              disabled={isDeleting}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data || page * 10 >= data.total}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UsersList;
```

### Component with Slice Actions

```typescript
// src/components/PostEditor.tsx
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  addPost,
  updatePost,
  selectSelectedPost,
  selectPost,
} from '../features/posts/postsSlice';

interface PostFormData {
  title: string;
  content: string;
  tags: string;
  status: 'draft' | 'published';
}

interface PostEditorProps {
  authorId: string;
}

const PostEditor: React.FC<PostEditorProps> = ({ authorId }) => {
  const dispatch = useAppDispatch();
  const selectedPost = useAppSelector(selectSelectedPost);

  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    tags: '',
    status: 'draft',
  });

  // Populate form when editing existing post
  useEffect(() => {
    if (selectedPost) {
      setFormData({
        title: selectedPost.title,
        content: selectedPost.content,
        tags: selectedPost.tags.join(', '),
        status: selectedPost.status,
      });
    }
  }, [selectedPost]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const postData = {
      title: formData.title,
      content: formData.content,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: formData.status,
      authorId,
    };

    if (selectedPost) {
      // Update existing post
      dispatch(updatePost(selectedPost.id, postData));
    } else {
      // Create new post
      dispatch(addPost(postData));
    }

    // Clear form
    setFormData({ title: '', content: '', tags: '', status: 'draft' });
    dispatch(selectPost(null));
  };

  const handleCancel = () => {
    setFormData({ title: '', content: '', tags: '', status: 'draft' });
    dispatch(selectPost(null));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{selectedPost ? 'Edit Post' : 'Create New Post'}</h2>

      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={10}
          required
        />
      </div>

      <div>
        <label htmlFor="tags">Tags (comma-separated)</label>
        <input
          id="tags"
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as 'draft' | 'published',
            })
          }
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div>
        <button type="submit">
          {selectedPost ? 'Update Post' : 'Create Post'}
        </button>
        {selectedPost && (
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default PostEditor;
```

## Selectors with Reselect

Create memoized selectors for derived data:

```typescript
// src/features/posts/postsSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

// Base selectors
const selectPostsState = (state: RootState) => state.posts;
const selectAuthState = (state: RootState) => state.auth;

// Memoized selector for all posts
export const selectAllPosts = createSelector(
  [selectPostsState],
  (postsState) => postsState.posts
);

// Memoized selector for published posts only
export const selectPublishedPosts = createSelector(
  [selectAllPosts],
  (posts) => posts.filter((post) => post.status === 'published')
);

// Selector with parameters using factory pattern
export const makeSelectPostsByAuthor = () =>
  createSelector(
    [selectAllPosts, (state: RootState, authorId: string) => authorId],
    (posts, authorId) => posts.filter((post) => post.authorId === authorId)
  );

// Selector for current user's posts
export const selectCurrentUserPosts = createSelector(
  [selectAllPosts, selectAuthState],
  (posts, auth) => {
    if (!auth.user) return [];
    return posts.filter((post) => post.authorId === auth.user!.id);
  }
);

// Selector for posts statistics
export const selectPostsStatistics = createSelector(
  [selectAllPosts],
  (posts) => ({
    total: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
    archived: posts.filter((p) => p.status === 'archived').length,
  })
);

// Selector for unique tags
export const selectAllTags = createSelector(
  [selectAllPosts],
  (posts) => {
    const tags = new Set<string>();
    posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }
);
```

Usage in components:

```typescript
// src/components/PostsStats.tsx
import React, { useMemo } from 'react';
import { useAppSelector } from '../app/hooks';
import {
  selectPostsStatistics,
  makeSelectPostsByAuthor,
} from '../features/posts/postsSelectors';

interface PostsStatsProps {
  authorId?: string;
}

const PostsStats: React.FC<PostsStatsProps> = ({ authorId }) => {
  const stats = useAppSelector(selectPostsStatistics);

  // Create memoized selector instance for author-specific posts
  const selectPostsByAuthor = useMemo(makeSelectPostsByAuthor, []);
  const authorPosts = useAppSelector((state) =>
    authorId ? selectPostsByAuthor(state, authorId) : []
  );

  return (
    <div>
      <h3>Posts Statistics</h3>
      <ul>
        <li>Total: {stats.total}</li>
        <li>Published: {stats.published}</li>
        <li>Drafts: {stats.draft}</li>
        <li>Archived: {stats.archived}</li>
      </ul>
      {authorId && (
        <p>Author has {authorPosts.length} posts</p>
      )}
    </div>
  );
};

export default PostsStats;
```

## Testing Redux Toolkit

### Testing Slices

```typescript
// src/features/auth/__tests__/authSlice.test.ts
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  AuthState,
} from '../authSlice';

describe('auth slice', () => {
  const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle loginStart', () => {
    const actual = authReducer(initialState, loginStart());
    expect(actual.isLoading).toBe(true);
    expect(actual.error).toBe(null);
  });

  it('should handle loginSuccess', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test', role: 'user' as const };
    const token = 'test-token';

    const actual = authReducer(
      { ...initialState, isLoading: true },
      loginSuccess({ user, token })
    );

    expect(actual.isLoading).toBe(false);
    expect(actual.isAuthenticated).toBe(true);
    expect(actual.user).toEqual(user);
    expect(actual.token).toBe(token);
  });

  it('should handle loginFailure', () => {
    const actual = authReducer(
      { ...initialState, isLoading: true },
      loginFailure('Invalid credentials')
    );

    expect(actual.isLoading).toBe(false);
    expect(actual.isAuthenticated).toBe(false);
    expect(actual.error).toBe('Invalid credentials');
  });

  it('should handle logout', () => {
    const loggedInState: AuthState = {
      user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    const actual = authReducer(loggedInState, logout());

    expect(actual.user).toBe(null);
    expect(actual.token).toBe(null);
    expect(actual.isAuthenticated).toBe(false);
  });
});
```

### Testing Async Thunks

```typescript
// src/features/users/__tests__/usersSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import usersReducer, { fetchUsers, createUser } from '../usersSlice';

// Mock fetch
global.fetch = jest.fn();

describe('users async thunks', () => {
  const createTestStore = () =>
    configureStore({
      reducer: { users: usersReducer },
    });

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should fetch users successfully', async () => {
    const mockUsers = [
      { id: '1', email: 'user1@example.com', name: 'User 1', createdAt: '2024-01-01' },
      { id: '2', email: 'user2@example.com', name: 'User 2', createdAt: '2024-01-02' },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    const store = createTestStore();
    await store.dispatch(fetchUsers());

    const state = store.getState().users;
    expect(state.status).toBe('succeeded');
    expect(state.users).toEqual(mockUsers);
  });

  it('should handle fetch users failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const store = createTestStore();
    await store.dispatch(fetchUsers());

    const state = store.getState().users;
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Failed to fetch users');
  });

  it('should create user successfully', async () => {
    const newUser = {
      id: '3',
      email: 'new@example.com',
      name: 'New User',
      createdAt: '2024-01-03',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newUser),
    });

    const store = createTestStore();
    await store.dispatch(
      createUser({ email: 'new@example.com', name: 'New User', password: 'password' })
    );

    const state = store.getState().users;
    expect(state.users).toContainEqual(newUser);
  });
});
```

### Testing RTK Query

```typescript
// src/features/users/__tests__/usersApi.test.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usersApi, useGetUsersQuery } from '../usersApi';
import React from 'react';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: [
        { id: '1', email: 'test@example.com', name: 'Test User' },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('usersApi', () => {
  const createWrapper = () => {
    const store = configureStore({
      reducer: { [usersApi.reducerPath]: usersApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(usersApi.middleware),
    });

    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  it('should fetch users', async () => {
    const { result } = renderHook(() => useGetUsersQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.users).toHaveLength(1);
    expect(result.current.data?.users[0].name).toBe('Test User');
  });
});
```

## Best Practices

### Normalize State Shape

For relational data, normalize the state to avoid duplication:

```typescript
// src/features/entities/entitiesSlice.ts
import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
}

// Create entity adapter with custom sorting
const usersAdapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

// Adapter provides initial state with ids[] and entities{}
const initialState = usersAdapter.getInitialState({
  loading: false,
  error: null as string | null,
});

const entitiesSlice = createSlice({
  name: 'entities',
  initialState,
  reducers: {
    // Adapter provides CRUD operations
    userAdded: usersAdapter.addOne,
    usersReceived: usersAdapter.setAll,
    userUpdated: usersAdapter.updateOne,
    userRemoved: usersAdapter.removeOne,
    usersRemoved: usersAdapter.removeMany,
  },
});

export const {
  userAdded,
  usersReceived,
  userUpdated,
  userRemoved,
  usersRemoved,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;

// Export selectors
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors((state: { entities: typeof initialState }) => state.entities);
```

### Error Handling Pattern

```typescript
// src/utils/apiErrors.ts
interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export function isApiError(error: unknown): error is { data: ApiError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof (error as any).data === 'object'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.data.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
```

### Middleware for Logging

```typescript
// src/app/middleware/logger.ts
import { Middleware, isRejectedWithValue } from '@reduxjs/toolkit';

export const rtkQueryErrorLogger: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    console.error('RTK Query Error:', {
      type: action.type,
      payload: action.payload,
      meta: action.meta,
    });
  }
  return next(action);
};
```

## Summary

| Feature | Purpose | Key APIs |
|---------|---------|----------|
| **configureStore** | Create store with good defaults | `configureStore()` |
| **createSlice** | Define reducers and actions together | `createSlice()`, `PayloadAction` |
| **createAsyncThunk** | Handle async logic with lifecycle actions | `createAsyncThunk<Return, Arg, Config>()` |
| **RTK Query** | Data fetching and caching | `createApi()`, `fetchBaseQuery()` |
| **createEntityAdapter** | Normalize collections | `createEntityAdapter<T>()` |
| **createSelector** | Memoized derived state | `createSelector()` |
| **Typed Hooks** | Type-safe React hooks | `useDispatch.withTypes()`, `useSelector.withTypes()` |
| **PayloadAction** | Type action payloads | `PayloadAction<T>` |
| **extraReducers** | Handle external actions | `builder.addCase()` |
| **Tags** | Cache invalidation | `providesTags`, `invalidatesTags` |

Redux Toolkit with TypeScript provides a robust foundation for state management in React applications. The combination of RTK's simplified APIs and TypeScript's type safety creates maintainable, scalable applications with excellent developer experience. Start with slices for local state, add RTK Query for server state, and use entity adapters when dealing with normalized collections.
