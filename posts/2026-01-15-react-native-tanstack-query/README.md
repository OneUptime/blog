# How to Use React Query (TanStack Query) for Server State in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TanStack Query, React Query, Server State, API, TypeScript

Description: Learn how to manage server state in React Native applications using TanStack Query for efficient data fetching and caching.

---

## Introduction

Managing server state in React Native applications has always been a challenging task. Unlike client state, which is predictable and synchronous, server state is asynchronous, shared across components, and requires careful handling of caching, background updates, and error states. TanStack Query (formerly React Query) has emerged as the go-to solution for server state management in React applications, and it works seamlessly with React Native.

In this comprehensive guide, we will explore how to leverage TanStack Query to build robust, performant React Native applications with efficient data fetching, caching, and synchronization capabilities.

## Server State vs Client State

Before diving into TanStack Query, it is essential to understand the difference between server state and client state.

### Client State

Client state is data that:
- Lives entirely in the client application
- Is synchronous and immediately available
- Is controlled by the application itself
- Examples: UI state, form inputs, local preferences

```typescript
// Example of client state
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState('home');
const [theme, setTheme] = useState<'light' | 'dark'>('light');
```

### Server State

Server state is data that:
- Is persisted remotely on a server or database
- Requires asynchronous APIs for fetching and updating
- Can be shared across multiple users or applications
- Has the potential to become stale or outdated
- Examples: user profiles, product listings, notifications

```typescript
// Example of server state (what we will manage with TanStack Query)
// User data fetched from an API
// Product listings from a database
// Real-time notifications
```

The key challenges with server state include:
- Caching responses efficiently
- Deduplicating multiple requests for the same data
- Background updates to keep data fresh
- Handling pagination and infinite loading
- Managing loading and error states
- Optimistic updates for better UX

TanStack Query addresses all these challenges elegantly.

## Setting Up TanStack Query in React Native

Let us start by installing the necessary packages and configuring TanStack Query in a React Native project.

### Installation

```bash
# Using npm
npm install @tanstack/react-query

# Using yarn
yarn add @tanstack/react-query

# For persistence (optional but recommended for React Native)
npm install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client

# For async storage
npm install @react-native-async-storage/async-storage
```

### Basic Configuration

Create a query client and wrap your application with the QueryClientProvider:

```typescript
// src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache is garbage collected after 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests 3 times
      retry: 3,
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for web, less so for mobile)
      refetchOnWindowFocus: false,
      // Refetch when network reconnects
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
};

export default App;
```

## Basic Queries Implementation

Now let us implement our first query to fetch data from an API.

### Creating an API Service

First, set up a basic API service:

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'https://api.example.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// API functions
export const fetchUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
};

export const fetchUser = async (userId: string): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${userId}`);
  return response.data;
};

export const fetchPosts = async (): Promise<Post[]> => {
  const response = await apiClient.get<Post[]>('/posts');
  return response.data;
};

export const fetchPost = async (postId: string): Promise<Post> => {
  const response = await apiClient.get<Post>(`/posts/${postId}`);
  return response.data;
};
```

### Using useQuery Hook

Now let us use the `useQuery` hook to fetch and display data:

```typescript
// src/screens/UsersScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers, User } from '../services/api';

const UsersScreen: React.FC = () => {
  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </View>
  );

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={renderUser}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default UsersScreen;
```

## Query Keys Best Practices

Query keys are fundamental to TanStack Query. They uniquely identify your queries and determine when cached data is used or refetched.

### Query Key Structure

```typescript
// src/queryKeys.ts
// Organize query keys in a factory pattern for consistency

export const queryKeys = {
  // All user-related queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (userId: string) =>
      [...queryKeys.users.details(), userId] as const,
  },

  // All post-related queries
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: PostFilters) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (postId: string) =>
      [...queryKeys.posts.details(), postId] as const,
    byUser: (userId: string) =>
      [...queryKeys.posts.all, 'user', userId] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) =>
      [...queryKeys.comments.all, 'post', postId] as const,
  },
};

// Types for filters
interface UserFilters {
  search?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
}

interface PostFilters {
  category?: string;
  sortBy?: 'date' | 'popularity';
  page?: number;
}
```

### Using Query Keys

```typescript
// src/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { fetchUsers, fetchUser } from '../services/api';

export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: filters ? queryKeys.users.list(filters) : queryKeys.users.lists(),
    queryFn: () => fetchUsers(filters),
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !!userId, // Only fetch if userId is provided
  });
};
```

## Mutations for Data Updates

Mutations are used for creating, updating, and deleting data. Let us implement a complete CRUD example.

### Setting Up Mutations

```typescript
// src/services/api.ts (additional functions)
export interface CreatePostInput {
  title: string;
  content: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
}

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  const response = await apiClient.post<Post>('/posts', input);
  return response.data;
};

export const updatePost = async (
  postId: string,
  input: UpdatePostInput
): Promise<Post> => {
  const response = await apiClient.patch<Post>(`/posts/${postId}`, input);
  return response.data;
};

export const deletePost = async (postId: string): Promise<void> => {
  await apiClient.delete(`/posts/${postId}`);
};
```

### Creating Custom Mutation Hooks

```typescript
// src/hooks/usePosts.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import {
  createPost,
  updatePost,
  deletePost,
  CreatePostInput,
  UpdatePostInput,
  Post,
} from '../services/api';

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: (newPost) => {
      // Invalidate and refetch posts list
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });

      // Optionally, add the new post to the cache immediately
      queryClient.setQueryData<Post[]>(queryKeys.posts.lists(), (oldPosts) => {
        return oldPosts ? [newPost, ...oldPosts] : [newPost];
      });
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      input,
    }: {
      postId: string;
      input: UpdatePostInput;
    }) => updatePost(postId, input),
    onSuccess: (updatedPost, { postId }) => {
      // Update the specific post in cache
      queryClient.setQueryData(queryKeys.posts.detail(postId), updatedPost);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_, postId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(postId) });

      // Update lists cache
      queryClient.setQueryData<Post[]>(queryKeys.posts.lists(), (oldPosts) => {
        return oldPosts?.filter((post) => post.id !== postId) ?? [];
      });
    },
  });
};
```

### Using Mutations in Components

```typescript
// src/screens/CreatePostScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCreatePost } from '../hooks/usePosts';

const CreatePostScreen: React.FC = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const createPostMutation = useCreatePost();

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    createPostMutation.mutate(
      { title, content },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Post created successfully');
          navigation.goBack();
        },
        onError: (error) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'Failed to create post'
          );
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Post title"
        value={title}
        onChangeText={setTitle}
        editable={!createPostMutation.isPending}
      />
      <TextInput
        style={[styles.input, styles.contentInput]}
        placeholder="Post content"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        editable={!createPostMutation.isPending}
      />
      <TouchableOpacity
        style={[
          styles.button,
          createPostMutation.isPending && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={createPostMutation.isPending}
      >
        {createPostMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Post</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  contentInput: {
    height: 150,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatePostScreen;
```

## Optimistic Updates

Optimistic updates provide instant feedback by updating the UI before the server confirms the change. This significantly improves perceived performance.

```typescript
// src/hooks/useOptimisticPost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { updatePost, UpdatePostInput, Post } from '../services/api';

export const useOptimisticUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      input,
    }: {
      postId: string;
      input: UpdatePostInput;
    }) => updatePost(postId, input),

    // Optimistically update before the mutation
    onMutate: async ({ postId, input }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.posts.detail(postId),
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.lists() });

      // Snapshot the previous values
      const previousPost = queryClient.getQueryData<Post>(
        queryKeys.posts.detail(postId)
      );
      const previousPosts = queryClient.getQueryData<Post[]>(
        queryKeys.posts.lists()
      );

      // Optimistically update the detail query
      if (previousPost) {
        queryClient.setQueryData<Post>(queryKeys.posts.detail(postId), {
          ...previousPost,
          ...input,
          updatedAt: new Date().toISOString(),
        });
      }

      // Optimistically update the list query
      if (previousPosts) {
        queryClient.setQueryData<Post[]>(
          queryKeys.posts.lists(),
          previousPosts.map((post) =>
            post.id === postId
              ? { ...post, ...input, updatedAt: new Date().toISOString() }
              : post
          )
        );
      }

      // Return context with previous values for rollback
      return { previousPost, previousPosts };
    },

    // If mutation fails, roll back to previous values
    onError: (_error, { postId }, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(
          queryKeys.posts.detail(postId),
          context.previousPost
        );
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKeys.posts.lists(), context.previousPosts);
      }
    },

    // Always refetch after error or success to ensure consistency
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(postId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
};
```

## Infinite Queries for Pagination

Infinite queries are perfect for implementing "load more" functionality in lists.

```typescript
// src/services/api.ts (pagination types and function)
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export const fetchPostsPaginated = async (
  cursor?: string,
  limit: number = 20
): Promise<PaginatedResponse<Post>> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const response = await apiClient.get<PaginatedResponse<Post>>(
    `/posts?${params.toString()}`
  );
  return response.data;
};
```

```typescript
// src/hooks/useInfinitePosts.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { fetchPostsPaginated } from '../services/api';

export const useInfinitePosts = () => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.lists(), 'infinite'],
    queryFn: ({ pageParam }) => fetchPostsPaginated(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      // Optional: for bidirectional infinite scroll
      return undefined;
    },
  });
};
```

```typescript
// src/screens/InfinitePostsScreen.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useInfinitePosts } from '../hooks/useInfinitePosts';
import { Post } from '../services/api';

const InfinitePostsScreen: React.FC = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfinitePosts();

  // Flatten all pages into a single array
  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'An error occurred'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    color: '#666',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default InfinitePostsScreen;
```

## Query Invalidation Strategies

Understanding when and how to invalidate queries is crucial for maintaining data consistency.

```typescript
// src/utils/queryInvalidation.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';

export const invalidationStrategies = {
  // Invalidate all queries (use sparingly)
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },

  // Invalidate specific entity
  invalidateUser: (queryClient: QueryClient, userId: string) => {
    // Invalidate specific user
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.detail(userId),
    });
    // Also invalidate user lists since they contain this user
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.lists(),
    });
  },

  // Invalidate all posts by a user
  invalidateUserPosts: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.posts.byUser(userId),
    });
  },

  // Invalidate based on predicate
  invalidateStaleData: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        // Invalidate queries that are older than 10 minutes
        const queryAge = Date.now() - (query.state.dataUpdatedAt || 0);
        return queryAge > 10 * 60 * 1000;
      },
    });
  },

  // Refetch active queries only (queries currently being used)
  refetchActiveQueries: (queryClient: QueryClient) => {
    queryClient.refetchQueries({
      type: 'active',
    });
  },

  // Reset queries (clear cache and refetch)
  resetAllPosts: (queryClient: QueryClient) => {
    queryClient.resetQueries({
      queryKey: queryKeys.posts.all,
    });
  },
};
```

## Offline Support and Persistence

React Native applications often need to work offline. TanStack Query provides excellent offline support through persistence.

```typescript
// src/config/queryPersistence.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

// Create the async storage persister
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_CACHE',
  throttleTime: 1000, // Throttle writes to storage
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Configure query client for persistence
export const createPersistedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours (for persistence)
        retry: 3,
        refetchOnReconnect: true,
        networkMode: 'offlineFirst', // Use cached data when offline
      },
      mutations: {
        retry: 1,
        networkMode: 'offlineFirst',
      },
    },
  });
};
```

```typescript
// src/App.tsx (with persistence)
import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  asyncStoragePersister,
  createPersistedQueryClient,
} from './config/queryPersistence';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';

const queryClient = createPersistedQueryClient();

const App: React.FC = () => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist successful queries
            return query.state.status === 'success';
          },
        },
      }}
    >
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </PersistQueryClientProvider>
  );
};

export default App;
```

### Handling Online/Offline State

```typescript
// src/hooks/useOnlineStatus.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export const useOnlineManager = () => {
  useEffect(() => {
    // Set up online manager to work with React Native's NetInfo
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(
        state.isConnected != null &&
          state.isConnected &&
          Boolean(state.isInternetReachable)
      );
    });
  }, []);
};

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(
        state.isConnected != null &&
          state.isConnected &&
          Boolean(state.isInternetReachable)
      );
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
};
```

## Error and Loading States

Proper handling of loading and error states is essential for a good user experience.

```typescript
// src/components/QueryStateHandler.tsx
import React, { ReactNode } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface QueryStateHandlerProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export const QueryStateHandler: React.FC<QueryStateHandlerProps> = ({
  isLoading,
  isError,
  error,
  isEmpty = false,
  emptyMessage = 'No data available',
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'An unexpected error occurred'}
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

### Global Error Handling

```typescript
// src/config/queryErrorHandler.ts
import { QueryCache, MutationCache } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const createQueryCache = () => {
  return new QueryCache({
    onError: (error, query) => {
      // Only show error toasts for background refetch errors
      if (query.state.data !== undefined) {
        console.error('Background refetch error:', error);
      }
    },
  });
};

export const createMutationCache = () => {
  return new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Global mutation error handling
      if (mutation.options.onError === undefined) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      // Global mutation success handling (optional)
      console.log('Mutation successful:', mutation.options.mutationKey);
    },
  });
};
```

## Prefetching Data

Prefetching allows you to fetch data before it is needed, improving perceived performance.

```typescript
// src/hooks/usePrefetch.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../queryKeys';
import { fetchUser, fetchPost, fetchPostsPaginated } from '../services/api';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchUser = useCallback(
    (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn: () => fetchUser(userId),
        staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
      });
    },
    [queryClient]
  );

  const prefetchPost = useCallback(
    (postId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.posts.detail(postId),
        queryFn: () => fetchPost(postId),
        staleTime: 1000 * 60 * 5,
      });
    },
    [queryClient]
  );

  const prefetchInfinitePosts = useCallback(() => {
    queryClient.prefetchInfiniteQuery({
      queryKey: [...queryKeys.posts.lists(), 'infinite'],
      queryFn: ({ pageParam }) => fetchPostsPaginated(pageParam),
      initialPageParam: undefined,
    });
  }, [queryClient]);

  return {
    prefetchUser,
    prefetchPost,
    prefetchInfinitePosts,
  };
};
```

### Prefetching on Navigation

```typescript
// src/screens/PostListScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { usePrefetch } from '../hooks/usePrefetch';
import { queryKeys } from '../queryKeys';
import { fetchPosts, Post } from '../services/api';

const PostListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { prefetchPost } = usePrefetch();

  const { data: posts } = useQuery({
    queryKey: queryKeys.posts.lists(),
    queryFn: fetchPosts,
  });

  const handlePostPress = (postId: string) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handlePostHover = (postId: string) => {
    // Prefetch when user hovers (or in mobile, when item becomes visible)
    prefetchPost(postId);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => handlePostPress(item.id)}
      onPressIn={() => handlePostHover(item.id)}
    >
      <Text style={styles.postTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      onViewableItemsChanged={({ viewableItems }) => {
        // Prefetch visible items
        viewableItems.forEach((item) => {
          if (item.item?.id) {
            prefetchPost(item.item.id);
          }
        });
      }}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
    />
  );
};

const styles = StyleSheet.create({
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PostListScreen;
```

## DevTools for Debugging

While React Query DevTools is primarily designed for web, you can still debug effectively in React Native.

### React Native Flipper Plugin

```typescript
// src/config/devtools.ts
import { QueryClient } from '@tanstack/react-query';

// For development debugging
export const setupDevtools = (queryClient: QueryClient) => {
  if (__DEV__) {
    // Log all queries
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated') {
        console.log('Query updated:', {
          queryKey: event.query.queryKey,
          state: event.query.state.status,
          dataUpdatedAt: event.query.state.dataUpdatedAt,
        });
      }
    });

    // Log all mutations
    queryClient.getMutationCache().subscribe((event) => {
      if (event?.type === 'updated') {
        console.log('Mutation updated:', {
          mutationKey: event.mutation.options.mutationKey,
          state: event.mutation.state.status,
        });
      }
    });
  }
};
```

### Custom Debug Component

```typescript
// src/components/QueryDebugger.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

export const QueryDebugger: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const queryClient = useQueryClient();

  if (!__DEV__) return null;

  const queries = queryClient.getQueryCache().getAll();
  const mutations = queryClient.getMutationCache().getAll();

  return (
    <>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.debugButtonText}>Q</Text>
      </TouchableOpacity>

      <Modal visible={isVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Query Debugger</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>
              Queries ({queries.length})
            </Text>
            {queries.map((query, index) => (
              <View key={index} style={styles.queryItem}>
                <Text style={styles.queryKey}>
                  {JSON.stringify(query.queryKey)}
                </Text>
                <Text style={styles.queryStatus}>
                  Status: {query.state.status}
                </Text>
                <Text style={styles.queryMeta}>
                  Data updated:{' '}
                  {query.state.dataUpdatedAt
                    ? new Date(query.state.dataUpdatedAt).toLocaleTimeString()
                    : 'Never'}
                </Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>
              Mutations ({mutations.length})
            </Text>
            {mutations.map((mutation, index) => (
              <View key={index} style={styles.queryItem}>
                <Text style={styles.queryKey}>
                  {JSON.stringify(mutation.options.mutationKey)}
                </Text>
                <Text style={styles.queryStatus}>
                  Status: {mutation.state.status}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#16213e',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 12,
  },
  queryItem: {
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  queryKey: {
    color: '#4ecdc4',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  queryStatus: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  queryMeta: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
});

export default QueryDebugger;
```

## Conclusion

TanStack Query transforms how you manage server state in React Native applications. By abstracting away the complexities of caching, synchronization, and background updates, it allows you to focus on building great user experiences.

Key takeaways from this guide:

1. **Understand the distinction** between server state and client state, and use TanStack Query specifically for server state management.

2. **Structure your query keys** using a factory pattern for consistency and easier invalidation.

3. **Implement mutations** with proper error handling and cache updates to keep your UI in sync.

4. **Use optimistic updates** for better perceived performance, but always handle rollback scenarios.

5. **Leverage infinite queries** for efficient pagination and "load more" functionality.

6. **Set up persistence** for offline support, which is crucial for mobile applications.

7. **Handle loading and error states** gracefully to provide a polished user experience.

8. **Prefetch data** when possible to reduce perceived loading times.

9. **Use debugging tools** during development to understand query behavior.

With these patterns and practices, you will be well-equipped to build robust, performant React Native applications that handle server state elegantly. TanStack Query continues to evolve, so be sure to check the official documentation for the latest features and best practices.

## Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Native Documentation](https://reactnative.dev/)
- [TanStack Query GitHub Repository](https://github.com/TanStack/query)
