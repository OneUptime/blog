# How to Use React Query (TanStack Query) for Server State Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, React Query, TanStack Query, State Management, Data Fetching, Caching

Description: Learn how to manage server state in React applications using TanStack Query, including data fetching, mutations, caching strategies, and optimistic updates.

---

Server state management is fundamentally different from client state management. Client state lives entirely in your application, while server state exists remotely, can be modified by other users, and requires asynchronous APIs to access. React Query (now TanStack Query) provides a powerful, declarative approach to handling server state with built-in caching, background updates, and error handling.

## Why React Query?

Traditional approaches to data fetching in React often involve managing loading states, error states, and cached data manually. This leads to boilerplate code scattered across components.

```javascript
// Traditional approach - lots of boilerplate
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetchUser(userId)
      .then(data => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, [userId]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <UserCard user={user} />;
}
```

React Query eliminates this boilerplate while adding powerful features like automatic caching, background refetching, and stale-while-revalidate patterns.

## Installation and Setup

### Installation

```bash
npm install @tanstack/react-query
# or
yarn add @tanstack/react-query
# or
pnpm add @tanstack/react-query
```

For development tools:

```bash
npm install @tanstack/react-query-devtools
```

### Provider Setup

Wrap your application with QueryClientProvider:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## useQuery - Fetching Data

The `useQuery` hook is the foundation of data fetching in React Query.

### Basic Usage

```jsx
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage error={error} />;

  return (
    <div>
      <UserCard user={data} />
      {isFetching && <RefreshIndicator />}
    </div>
  );
}
```

### Query Keys

Query keys uniquely identify cached data. They can be strings or arrays with complex objects:

```jsx
// Simple key
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

// Key with parameters
useQuery({ queryKey: ['todo', todoId], queryFn: () => fetchTodo(todoId) });

// Key with filters
useQuery({
  queryKey: ['todos', { status: 'active', page: 1 }],
  queryFn: () => fetchTodos({ status: 'active', page: 1 }),
});

// Keys are serialized, so object order does not matter
// These are equivalent:
['todos', { page: 1, status: 'active' }]
['todos', { status: 'active', page: 1 }]
```

### Query Functions

Query functions must return a promise that resolves with data or throws an error:

```jsx
// Using fetch
const fetchUser = async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
};

// Using axios
import axios from 'axios';

const fetchUser = async (userId) => {
  const { data } = await axios.get(`/api/users/${userId}`);
  return data;
};

// Query function receives query context
useQuery({
  queryKey: ['user', userId],
  queryFn: async ({ queryKey, signal }) => {
    const [, userId] = queryKey;
    const response = await fetch(`/api/users/${userId}`, { signal });
    return response.json();
  },
});
```

### Query States

React Query provides multiple state variables to handle different scenarios:

```jsx
function DataDisplay() {
  const {
    data,           // The resolved data
    error,          // Error object if query failed
    isLoading,      // True on first load (no cached data)
    isFetching,     // True whenever fetching (including background)
    isError,        // True if query is in error state
    isSuccess,      // True if query succeeded
    isPending,      // True if no cached data and no query attempt
    isStale,        // True if data is considered stale
    refetch,        // Function to manually refetch
    status,         // 'pending' | 'error' | 'success'
    fetchStatus,    // 'fetching' | 'paused' | 'idle'
  } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  // Handle different states
  if (isPending) return <Skeleton />;
  if (isLoading) return <Spinner />;
  if (isError) return <Error message={error.message} />;

  return (
    <div>
      <Data data={data} />
      {isFetching && <SmallSpinner />}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Enabled Option - Dependent Queries

Control when queries run using the `enabled` option:

```jsx
// Query only runs when userId is truthy
function UserPosts({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });

  // This query depends on the user being loaded
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchUserPosts(user.id),
    enabled: !!user?.id,
  });

  return <PostList posts={posts} />;
}
```

### Placeholder and Initial Data

Provide immediate data while fetching:

```jsx
// Placeholder data - not persisted to cache
useQuery({
  queryKey: ['todo', todoId],
  queryFn: () => fetchTodo(todoId),
  placeholderData: { id: todoId, title: 'Loading...', completed: false },
});

// Initial data from another query's cache
useQuery({
  queryKey: ['todo', todoId],
  queryFn: () => fetchTodo(todoId),
  initialData: () => {
    return queryClient
      .getQueryData(['todos'])
      ?.find(todo => todo.id === todoId);
  },
  initialDataUpdatedAt: () => {
    return queryClient.getQueryState(['todos'])?.dataUpdatedAt;
  },
});

// Previous data while refetching
import { keepPreviousData } from '@tanstack/react-query';

useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),
  placeholderData: keepPreviousData,
});
```

## useMutation - Modifying Data

The `useMutation` hook handles create, update, and delete operations.

### Basic Mutation

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateTodo() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newTodo) => {
      return fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(newTodo),
        headers: { 'Content-Type': 'application/json' },
      }).then(res => res.json());
    },
    onSuccess: () => {
      // Invalidate and refetch todos
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    mutation.mutate({
      title: formData.get('title'),
      completed: false,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="New todo" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding...' : 'Add Todo'}
      </button>
      {mutation.isError && <p>Error: {mutation.error.message}</p>}
      {mutation.isSuccess && <p>Todo added!</p>}
    </form>
  );
}
```

### Mutation Lifecycle Callbacks

```jsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (variables) => {
    // Called before mutation function fires
    // Useful for optimistic updates
    console.log('Starting mutation with:', variables);

    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos']);

    // Return context for rollback
    return { previousTodos };
  },
  onError: (error, variables, context) => {
    // Called if mutation fails
    console.error('Mutation failed:', error);

    // Rollback to previous value
    if (context?.previousTodos) {
      queryClient.setQueryData(['todos'], context.previousTodos);
    }
  },
  onSuccess: (data, variables, context) => {
    // Called if mutation succeeds
    console.log('Mutation succeeded:', data);
  },
  onSettled: (data, error, variables, context) => {
    // Called regardless of success or failure
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

### Optimistic Updates

Update the UI immediately before the server responds:

```jsx
function TodoItem({ todo }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (todoId) => {
      return fetch(`/api/todos/${todoId}/toggle`, { method: 'PATCH' })
        .then(res => res.json());
    },
    onMutate: async (todoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update
      queryClient.setQueryData(['todos'], (old) =>
        old.map(t =>
          t.id === todoId ? { ...t, completed: !t.completed } : t
        )
      );

      return { previousTodos };
    },
    onError: (err, todoId, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    onSettled: () => {
      // Sync with server
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <li
      onClick={() => toggleMutation.mutate(todo.id)}
      style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
    >
      {todo.title}
    </li>
  );
}
```

### Mutation with Async/Await

```jsx
function UpdateUser({ user }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the specific user in cache
      queryClient.setQueryData(['user', user.id], updatedUser);
      // Invalidate user list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ name });
      alert('User updated!');
    } catch (error) {
      alert('Failed to update user');
    }
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSave} disabled={updateMutation.isPending}>
        Save
      </button>
    </div>
  );
}
```

## Caching Strategies

React Query's caching is what makes it powerful. Understanding the cache lifecycle is essential.

### Cache Configuration

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time until data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes

      // Time until inactive data is garbage collected
      gcTime: 1000 * 60 * 30, // 30 minutes

      // Refetch behavior
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Retry behavior
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### Stale Time vs GC Time

```jsx
// staleTime: How long data is considered fresh
// gcTime: How long inactive data stays in cache

// Example: User profile that rarely changes
useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 1000 * 60 * 10, // Fresh for 10 minutes
  gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
});

// Example: Live data that changes frequently
useQuery({
  queryKey: ['stock', symbol],
  queryFn: () => fetchStockPrice(symbol),
  staleTime: 0, // Always stale
  refetchInterval: 5000, // Refetch every 5 seconds
});
```

### Cache Invalidation

```jsx
const queryClient = useQueryClient();

// Invalidate all queries
queryClient.invalidateQueries();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['todos'] });

// Invalidate with exact match
queryClient.invalidateQueries({ queryKey: ['todo', 5], exact: true });

// Invalidate with predicate
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'todos',
});

// Invalidate and refetch immediately
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'active', // Only refetch active queries
});
```

### Manual Cache Updates

```jsx
const queryClient = useQueryClient();

// Set data directly
queryClient.setQueryData(['user', userId], newUserData);

// Update data with function
queryClient.setQueryData(['todos'], (oldTodos) => {
  return [...oldTodos, newTodo];
});

// Get current data
const todos = queryClient.getQueryData(['todos']);

// Prefetch data
await queryClient.prefetchQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});

// Remove query from cache
queryClient.removeQueries({ queryKey: ['todos'] });

// Reset queries to initial state
queryClient.resetQueries({ queryKey: ['todos'] });
```

## Advanced Patterns

### Parallel Queries

Fetch multiple resources simultaneously:

```jsx
function Dashboard({ userId }) {
  // Multiple queries run in parallel
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
  });

  const statsQuery = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => fetchUserStats(userId),
  });

  const isLoading = userQuery.isLoading || postsQuery.isLoading || statsQuery.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <UserCard user={userQuery.data} />
      <PostList posts={postsQuery.data} />
      <StatsPanel stats={statsQuery.data} />
    </div>
  );
}
```

### useQueries - Dynamic Parallel Queries

```jsx
import { useQueries } from '@tanstack/react-query';

function UsersList({ userIds }) {
  const userQueries = useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })),
  });

  const isLoading = userQueries.some(query => query.isLoading);
  const users = userQueries.map(query => query.data).filter(Boolean);

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Infinite Queries

Handle paginated data with infinite scroll:

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/posts?cursor=${pageParam}&limit=10`);
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: 0,
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {data.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </React.Fragment>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more...'
          : hasNextPage
          ? 'Load More'
          : 'No more posts'}
      </button>
    </div>
  );
}
```

### Prefetching

Load data before it is needed:

```jsx
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

function PostLink({ postId, children }) {
  const queryClient = useQueryClient();

  // Prefetch on hover
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['post', postId],
      queryFn: () => fetchPost(postId),
      staleTime: 1000 * 60 * 5, // Only prefetch if data is older than 5 min
    });
  };

  return (
    <Link to={`/posts/${postId}`} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}

// Prefetch in route loader (React Router v6)
export const postLoader = (queryClient) => async ({ params }) => {
  await queryClient.ensureQueryData({
    queryKey: ['post', params.postId],
    queryFn: () => fetchPost(params.postId),
  });
  return null;
};
```

### Query Cancellation

Cancel queries when components unmount or dependencies change:

```jsx
function SearchResults({ searchTerm }) {
  const { data } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async ({ signal }) => {
      // Pass signal to fetch for automatic cancellation
      const response = await fetch(`/api/search?q=${searchTerm}`, { signal });
      return response.json();
    },
    enabled: searchTerm.length > 2,
  });

  return <ResultList results={data} />;
}

// With axios
const fetchSearchResults = async ({ queryKey, signal }) => {
  const [, searchTerm] = queryKey;
  const { data } = await axios.get('/api/search', {
    params: { q: searchTerm },
    signal,
  });
  return data;
};
```

### Select and Transform Data

```jsx
// Transform data at query level
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.filter(todo => !todo.completed),
});

// Memoized selector for performance
const selectActiveTodos = useCallback(
  (data) => data.filter(todo => !todo.completed),
  []
);

useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: selectActiveTodos,
});
```

## Error Handling

### Global Error Handling

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry on 4xx errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handler
      if (error.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      }
      console.error('Query error:', error, 'Query:', query.queryKey);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('Mutation error:', error);
    },
  }),
});
```

### Error Boundaries

```jsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <h2>Something went wrong</h2>
              <p>{error.message}</p>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          <MainContent />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Use throwOnError to trigger error boundary
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  throwOnError: true,
});
```

## Testing React Query

### Setup for Tests

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Do not retry in tests
      gcTime: Infinity, // Keep cache during tests
    },
  },
});

const renderWithClient = (ui) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
};

export { renderWithClient, createTestQueryClient };
```

### Testing Queries

```jsx
import { renderWithClient } from './test-utils';
import { screen, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';

// Mock the API
jest.mock('./api', () => ({
  fetchUser: jest.fn(),
}));

describe('UserProfile', () => {
  it('displays user data after loading', async () => {
    const mockUser = { id: 1, name: 'John Doe' };
    require('./api').fetchUser.mockResolvedValue(mockUser);

    renderWithClient(<UserProfile userId={1} />);

    // Initially shows loading
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Eventually shows user data
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('displays error message on failure', async () => {
    require('./api').fetchUser.mockRejectedValue(new Error('Failed'));

    renderWithClient(<UserProfile userId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Mutations

```jsx
import { renderWithClient } from './test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CreateTodo from './CreateTodo';

describe('CreateTodo', () => {
  it('creates a new todo on submit', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 1, title: 'New todo' });
    require('./api').createTodo = mockCreate;

    renderWithClient(<CreateTodo />);

    fireEvent.change(screen.getByPlaceholderText(/title/i), {
      target: { value: 'New todo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ title: 'New todo' });
    });
  });
});
```

## Best Practices

### Query Key Factory

Organize query keys for consistency:

```jsx
// query-keys.js
export const queryKeys = {
  all: ['todos'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters) => [...queryKeys.lists(), { filters }] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id) => [...queryKeys.details(), id] as const,
};

// Usage
useQuery({
  queryKey: queryKeys.detail(todoId),
  queryFn: () => fetchTodo(todoId),
});

// Invalidation
queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
```

### Custom Hooks

Encapsulate query logic in custom hooks:

```jsx
// hooks/useUser.js
export function useUser(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['user', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Usage
function UserProfile({ userId }) {
  const { data: user, isLoading } = useUser(userId);
  const updateUser = useUpdateUser();

  // ...
}
```

### Handling Authentication

```jsx
// Create authenticated fetch wrapper
const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh and retry
    await refreshToken();
    return authenticatedFetch(url, options);
  }

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
};

// Use in queries
useQuery({
  queryKey: ['user', 'me'],
  queryFn: () => authenticatedFetch('/api/users/me'),
});
```

### Suspense Mode

```jsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

function UserProfile({ userId }) {
  // This will suspend until data is available
  const { data } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  return <UserCard user={data} />;
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

## Summary Table

| Feature | Hook/Method | Use Case |
|---------|-------------|----------|
| **Data Fetching** | `useQuery` | GET requests, reading data |
| **Data Mutation** | `useMutation` | POST, PUT, DELETE operations |
| **Parallel Queries** | Multiple `useQuery` | Fetch independent resources |
| **Dynamic Queries** | `useQueries` | Fetch array of resources |
| **Infinite Scroll** | `useInfiniteQuery` | Paginated lists |
| **Cache Access** | `useQueryClient` | Manual cache operations |
| **Prefetching** | `prefetchQuery` | Preload data on hover/mount |
| **Invalidation** | `invalidateQueries` | Refetch after mutations |
| **Optimistic Updates** | `onMutate` callback | Instant UI feedback |
| **Error Recovery** | `QueryErrorResetBoundary` | Error boundary integration |
| **Suspense** | `useSuspenseQuery` | React Suspense integration |

## Configuration Reference

| Option | Default | Description |
|--------|---------|-------------|
| `staleTime` | 0 | Time in ms until data is considered stale |
| `gcTime` | 5 minutes | Time in ms until inactive data is garbage collected |
| `retry` | 3 | Number of retry attempts on failure |
| `refetchOnMount` | true | Refetch when component mounts |
| `refetchOnWindowFocus` | true | Refetch when window regains focus |
| `refetchOnReconnect` | true | Refetch when network reconnects |
| `refetchInterval` | false | Polling interval in ms |
| `enabled` | true | Whether query should run |

## Conclusion

React Query transforms how you handle server state in React applications. By providing automatic caching, background updates, and optimistic mutations, it eliminates boilerplate while improving both developer experience and user experience. The key concepts to master are:

1. **Query Keys** - Unique identifiers for cached data that enable automatic refetching and invalidation
2. **Stale Time** - Control when cached data is considered fresh vs stale
3. **Invalidation** - Trigger refetches after mutations to keep data synchronized
4. **Optimistic Updates** - Provide instant feedback while mutations complete
5. **Custom Hooks** - Encapsulate query logic for reusability and testing

Start with basic queries and mutations, then progressively adopt advanced patterns like optimistic updates and infinite queries as your application grows. The DevTools are invaluable for understanding cache behavior during development.
