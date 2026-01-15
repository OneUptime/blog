# How to Build a React App with GraphQL using Apollo Client

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, GraphQL, Apollo Client, API, Data Fetching, Frontend

Description: Learn how to build a modern React application with GraphQL using Apollo Client for efficient data fetching, caching, and state management.

---

## Introduction

GraphQL has revolutionized the way we think about APIs and data fetching in modern web applications. Unlike traditional REST APIs, GraphQL allows clients to request exactly the data they need, nothing more and nothing less. When combined with React and Apollo Client, you get a powerful stack for building data-driven applications with excellent developer experience.

In this comprehensive guide, we will walk through building a React application with GraphQL using Apollo Client. We will cover everything from initial setup to advanced patterns including queries, mutations, caching strategies, and best practices.

## What is GraphQL?

GraphQL is a query language for APIs and a runtime for executing those queries with your existing data. It was developed by Facebook in 2012 and open-sourced in 2015. Here are some key benefits:

- **Declarative Data Fetching**: Request exactly the data you need
- **Single Endpoint**: All operations go through one endpoint
- **Strong Typing**: Schema defines the shape of your data
- **Introspection**: APIs are self-documenting
- **Real-time Updates**: Built-in support for subscriptions

## What is Apollo Client?

Apollo Client is a comprehensive state management library for JavaScript that enables you to manage both local and remote data with GraphQL. It integrates seamlessly with React and provides:

- **Declarative Data Fetching**: Write queries and let Apollo handle the rest
- **Intelligent Caching**: Normalized caching out of the box
- **Error Handling**: Built-in error and loading states
- **Optimistic UI**: Update the UI before server response
- **Pagination**: Helpers for cursor and offset-based pagination

## Prerequisites

Before we begin, make sure you have the following installed:

- Node.js (version 16 or higher)
- npm or yarn
- Basic knowledge of React and JavaScript/TypeScript
- A GraphQL API endpoint (we will use a mock API for this tutorial)

## Project Setup

Let us start by creating a new React application using Vite, which provides a fast and modern development experience.

### Step 1: Create a New React Project

```bash
npm create vite@latest graphql-react-app -- --template react-ts
cd graphql-react-app
npm install
```

### Step 2: Install Apollo Client Dependencies

```bash
npm install @apollo/client graphql
```

This installs:
- `@apollo/client`: The core Apollo Client library with React hooks
- `graphql`: The JavaScript reference implementation for GraphQL

### Step 3: Project Structure

Let us organize our project with a clean structure:

```
src/
├── components/
│   ├── UserList.tsx
│   ├── UserDetail.tsx
│   ├── CreateUser.tsx
│   └── UpdateUser.tsx
├── graphql/
│   ├── client.ts
│   ├── queries.ts
│   └── mutations.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

## Setting Up Apollo Client

Now let us configure Apollo Client to connect to our GraphQL API.

### Creating the Apollo Client Instance

Create a new file `src/graphql/client.ts`:

```typescript
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// HTTP connection to the API
const httpLink = new HttpLink({
  uri: 'https://your-graphql-api.com/graphql',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Logging link for development
const loggingLink = new ApolloLink((operation, forward) => {
  console.log(`Starting request for ${operation.operationName}`);
  return forward(operation).map((response) => {
    console.log(`Received response for ${operation.operationName}`);
    return response;
  });
});

// Create the Apollo Client instance
export const client = new ApolloClient({
  link: from([errorLink, loggingLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          users: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
```

### Wrapping Your App with ApolloProvider

Update your `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { client } from './graphql/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
```

## Defining Types

Create type definitions in `src/types/index.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  avatar: string;
  bio: string;
  location: string;
  website: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
}

export interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
}
```

## Writing GraphQL Queries

Create your queries in `src/graphql/queries.ts`:

```typescript
import { gql } from '@apollo/client';

// Fragment for reusable user fields
export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    role
    createdAt
    updatedAt
  }
`;

// Fragment for user profile
export const USER_PROFILE_FIELDS = gql`
  fragment UserProfileFields on UserProfile {
    avatar
    bio
    location
    website
  }
`;

// Query to get all users
export const GET_USERS = gql`
  ${USER_FIELDS}
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      ...UserFields
    }
    usersCount
  }
`;

// Query to get a single user by ID
export const GET_USER = gql`
  ${USER_FIELDS}
  ${USER_PROFILE_FIELDS}
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserFields
      profile {
        ...UserProfileFields
      }
    }
  }
`;

// Query to get user with posts
export const GET_USER_WITH_POSTS = gql`
  ${USER_FIELDS}
  query GetUserWithPosts($id: ID!) {
    user(id: $id) {
      ...UserFields
      posts {
        id
        title
        content
        published
        createdAt
      }
    }
  }
`;

// Query to search users
export const SEARCH_USERS = gql`
  ${USER_FIELDS}
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      ...UserFields
    }
  }
`;

// Query to get posts with pagination
export const GET_POSTS = gql`
  query GetPosts($first: Int, $after: String) {
    posts(first: $first, after: $after) {
      edges {
        node {
          id
          title
          content
          published
          createdAt
          author {
            id
            name
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
```

## Writing GraphQL Mutations

Create your mutations in `src/graphql/mutations.ts`:

```typescript
import { gql } from '@apollo/client';
import { USER_FIELDS } from './queries';

// Mutation to create a new user
export const CREATE_USER = gql`
  ${USER_FIELDS}
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
`;

// Mutation to update an existing user
export const UPDATE_USER = gql`
  ${USER_FIELDS}
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserFields
    }
  }
`;

// Mutation to delete a user
export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      success
      message
    }
  }
`;

// Mutation to create a post
export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      published
      createdAt
      author {
        id
        name
      }
    }
  }
`;

// Mutation to update a post
export const UPDATE_POST = gql`
  mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      id
      title
      content
      published
      updatedAt
    }
  }
`;

// Mutation to delete a post
export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      id
      success
    }
  }
`;

// Mutation to update user profile
export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($userId: ID!, $input: UpdateProfileInput!) {
    updateUserProfile(userId: $userId, input: $input) {
      id
      profile {
        avatar
        bio
        location
        website
      }
    }
  }
`;
```

## Using Queries with React Hooks

Now let us create components that use these queries.

### UserList Component

Create `src/components/UserList.tsx`:

```typescript
import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_USERS } from '../graphql/queries';
import { User } from '../types';

interface GetUsersData {
  users: User[];
  usersCount: number;
}

interface GetUsersVars {
  limit?: number;
  offset?: number;
}

export const UserList: React.FC = () => {
  const { loading, error, data, fetchMore, refetch } = useQuery<
    GetUsersData,
    GetUsersVars
  >(GET_USERS, {
    variables: { limit: 10, offset: 0 },
    notifyOnNetworkStatusChange: true,
  });

  if (loading && !data) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error loading users</h3>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    );
  }

  const handleLoadMore = () => {
    if (data) {
      fetchMore({
        variables: {
          offset: data.users.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...fetchMoreResult,
            users: [...prev.users, ...fetchMoreResult.users],
          };
        },
      });
    }
  };

  return (
    <div className="user-list">
      <h2>Users ({data?.usersCount || 0})</h2>
      <button onClick={() => refetch()} className="refresh-btn">
        Refresh
      </button>

      <ul className="users">
        {data?.users.map((user) => (
          <li key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className={`role-badge ${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </div>
            <div className="user-meta">
              <small>Created: {new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
          </li>
        ))}
      </ul>

      {data && data.users.length < data.usersCount && (
        <button
          onClick={handleLoadMore}
          className="load-more-btn"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};
```

### UserDetail Component

Create `src/components/UserDetail.tsx`:

```typescript
import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER } from '../graphql/queries';
import { User } from '../types';

interface GetUserData {
  user: User;
}

interface GetUserVars {
  id: string;
}

interface UserDetailProps {
  userId: string;
}

export const UserDetail: React.FC<UserDetailProps> = ({ userId }) => {
  const { loading, error, data } = useQuery<GetUserData, GetUserVars>(
    GET_USER,
    {
      variables: { id: userId },
      skip: !userId, // Skip query if no userId provided
    }
  );

  if (!userId) {
    return <p>Please select a user to view details.</p>;
  }

  if (loading) {
    return <div className="loading">Loading user details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }

  if (!data?.user) {
    return <div className="not-found">User not found</div>;
  }

  const { user } = data;

  return (
    <div className="user-detail">
      <div className="user-header">
        {user.profile?.avatar && (
          <img
            src={user.profile.avatar}
            alt={user.name}
            className="avatar"
          />
        )}
        <div>
          <h2>{user.name}</h2>
          <p className="email">{user.email}</p>
          <span className={`role-badge ${user.role.toLowerCase()}`}>
            {user.role}
          </span>
        </div>
      </div>

      {user.profile && (
        <div className="user-profile">
          <h3>Profile</h3>
          {user.profile.bio && <p className="bio">{user.profile.bio}</p>}
          {user.profile.location && (
            <p className="location">
              <strong>Location:</strong> {user.profile.location}
            </p>
          )}
          {user.profile.website && (
            <p className="website">
              <strong>Website:</strong>{' '}
              <a href={user.profile.website} target="_blank" rel="noopener noreferrer">
                {user.profile.website}
              </a>
            </p>
          )}
        </div>
      )}

      <div className="user-timestamps">
        <p>
          <strong>Member since:</strong>{' '}
          {new Date(user.createdAt).toLocaleDateString()}
        </p>
        <p>
          <strong>Last updated:</strong>{' '}
          {new Date(user.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};
```

### Lazy Query Example

Sometimes you want to execute a query on demand rather than when a component mounts:

```typescript
import React, { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_USERS } from '../graphql/queries';
import { User } from '../types';

interface SearchUsersData {
  searchUsers: User[];
}

interface SearchUsersVars {
  query: string;
  limit?: number;
}

export const UserSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchUsers, { loading, error, data }] = useLazyQuery<
    SearchUsersData,
    SearchUsersVars
  >(SEARCH_USERS);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchUsers({
        variables: { query: searchTerm, limit: 20 },
      });
    }
  };

  return (
    <div className="user-search">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error">{error.message}</p>}

      {data?.searchUsers && (
        <ul className="search-results">
          {data.searchUsers.length === 0 ? (
            <li>No users found</li>
          ) : (
            data.searchUsers.map((user) => (
              <li key={user.id}>
                <span>{user.name}</span>
                <span>{user.email}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
```

## Using Mutations with React Hooks

### CreateUser Component

Create `src/components/CreateUser.tsx`:

```typescript
import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_USER } from '../graphql/mutations';
import { GET_USERS } from '../graphql/queries';
import { User, UserRole, CreateUserInput } from '../types';

interface CreateUserData {
  createUser: User;
}

interface CreateUserVars {
  input: CreateUserInput;
}

export const CreateUser: React.FC = () => {
  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    role: UserRole.USER,
  });

  const [createUser, { loading, error, data }] = useMutation<
    CreateUserData,
    CreateUserVars
  >(CREATE_USER, {
    // Update cache after mutation
    update(cache, { data: mutationData }) {
      if (!mutationData) return;

      // Read existing users from cache
      const existingData = cache.readQuery<{ users: User[]; usersCount: number }>({
        query: GET_USERS,
        variables: { limit: 10, offset: 0 },
      });

      if (existingData) {
        // Write updated users list to cache
        cache.writeQuery({
          query: GET_USERS,
          variables: { limit: 10, offset: 0 },
          data: {
            users: [mutationData.createUser, ...existingData.users],
            usersCount: existingData.usersCount + 1,
          },
        });
      }
    },
    onCompleted: (data) => {
      console.log('User created:', data.createUser);
      // Reset form
      setFormData({ name: '', email: '', role: UserRole.USER });
    },
    onError: (error) => {
      console.error('Error creating user:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createUser({
        variables: { input: formData },
      });
    } catch (err) {
      // Error is handled by onError callback
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="create-user">
      <h2>Create New User</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value={UserRole.USER}>User</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.MODERATOR}>Moderator</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <p>Error: {error.message}</p>
        </div>
      )}

      {data && (
        <div className="success-message">
          <p>User "{data.createUser.name}" created successfully!</p>
        </div>
      )}
    </div>
  );
};
```

### UpdateUser Component with Optimistic UI

Create `src/components/UpdateUser.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { UPDATE_USER } from '../graphql/mutations';
import { GET_USER } from '../graphql/queries';
import { User, UpdateUserInput } from '../types';

interface UpdateUserProps {
  userId: string;
}

export const UpdateUser: React.FC<UpdateUserProps> = ({ userId }) => {
  const [formData, setFormData] = useState<UpdateUserInput>({});

  const { data: userData } = useQuery<{ user: User }>(GET_USER, {
    variables: { id: userId },
  });

  const [updateUser, { loading, error }] = useMutation(UPDATE_USER, {
    optimisticResponse: {
      updateUser: {
        __typename: 'User',
        id: userId,
        ...userData?.user,
        ...formData,
        updatedAt: new Date().toISOString(),
      },
    },
    onCompleted: () => {
      console.log('User updated successfully');
    },
  });

  useEffect(() => {
    if (userData?.user) {
      setFormData({
        name: userData.user.name,
        email: userData.user.email,
        role: userData.user.role,
      });
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateUser({
      variables: {
        id: userId,
        input: formData,
      },
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!userData?.user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="update-user">
      <h2>Update User</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update User'}
        </button>
      </form>

      {error && <p className="error">{error.message}</p>}
    </div>
  );
};
```

### Delete with Cache Eviction

```typescript
import React from 'react';
import { useMutation } from '@apollo/client';
import { DELETE_USER } from '../graphql/mutations';

interface DeleteUserProps {
  userId: string;
  onDeleted?: () => void;
}

export const DeleteUser: React.FC<DeleteUserProps> = ({ userId, onDeleted }) => {
  const [deleteUser, { loading }] = useMutation(DELETE_USER, {
    variables: { id: userId },
    update(cache, { data }) {
      if (data?.deleteUser.success) {
        // Evict the user from cache
        cache.evict({ id: `User:${userId}` });
        // Clean up any dangling references
        cache.gc();
      }
    },
    onCompleted: (data) => {
      if (data.deleteUser.success && onDeleted) {
        onDeleted();
      }
    },
  });

  return (
    <button
      onClick={() => deleteUser()}
      disabled={loading}
      className="delete-btn"
    >
      {loading ? 'Deleting...' : 'Delete User'}
    </button>
  );
};
```

## Advanced Caching Strategies

Apollo Client provides powerful caching capabilities. Let us explore some advanced patterns.

### Cache Configuration

```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Merge paginated results
        posts: {
          keyArgs: false,
          merge(existing = { edges: [], pageInfo: {} }, incoming) {
            return {
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
        // Use arguments for cache key
        user: {
          keyArgs: ['id'],
        },
      },
    },
    User: {
      // Use 'id' field as cache identifier
      keyFields: ['id'],
      fields: {
        // Transform field data
        fullName: {
          read(_, { readField }) {
            const firstName = readField<string>('firstName');
            const lastName = readField<string>('lastName');
            return `${firstName} ${lastName}`;
          },
        },
      },
    },
    Post: {
      keyFields: ['id'],
      fields: {
        // Local-only field
        isBookmarked: {
          read(existing = false) {
            return existing;
          },
        },
      },
    },
  },
});
```

### Reading and Writing Cache Directly

```typescript
import { useApolloClient } from '@apollo/client';

const MyComponent: React.FC = () => {
  const client = useApolloClient();

  const readUserFromCache = (userId: string) => {
    return client.readFragment({
      id: `User:${userId}`,
      fragment: gql`
        fragment UserData on User {
          id
          name
          email
        }
      `,
    });
  };

  const writeUserToCache = (user: User) => {
    client.writeFragment({
      id: `User:${user.id}`,
      fragment: gql`
        fragment UserData on User {
          id
          name
          email
        }
      `,
      data: user,
    });
  };

  const clearCache = () => {
    client.clearStore();
  };

  const resetCache = () => {
    client.resetStore(); // Also refetches active queries
  };

  return (
    // Component JSX
  );
};
```

### Fetch Policies

Apollo Client supports various fetch policies:

```typescript
const { data } = useQuery(GET_USERS, {
  // Fetch policies:
  // 'cache-first' - Default. Returns cache if available, else network
  // 'cache-only' - Only returns cache, never network
  // 'cache-and-network' - Returns cache immediately, then fetches network
  // 'network-only' - Always fetches from network, stores in cache
  // 'no-cache' - Always fetches from network, doesn't store in cache
  // 'standby' - Only reads from cache, manual network calls

  fetchPolicy: 'cache-and-network',

  // Next fetch policy after initial fetch
  nextFetchPolicy: 'cache-first',
});
```

## Error Handling

Proper error handling is crucial for a good user experience.

### Global Error Handling

```typescript
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      switch (err.extensions?.code) {
        case 'UNAUTHENTICATED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'FORBIDDEN':
          // Show permission error
          console.error('Permission denied');
          break;
        default:
          console.error(`GraphQL Error: ${err.message}`);
      }
    }
  }

  if (networkError) {
    console.error(`Network Error: ${networkError.message}`);
    // Optionally retry the request
    if ('statusCode' in networkError && networkError.statusCode === 503) {
      return forward(operation);
    }
  }
});
```

### Component-Level Error Handling

```typescript
import React from 'react';
import { useQuery } from '@apollo/client';

const UserList: React.FC = () => {
  const { loading, error, data, refetch } = useQuery(GET_USERS, {
    errorPolicy: 'all', // Still returns partial data on error
  });

  if (error) {
    // Check for specific error types
    const isNetworkError = error.networkError;
    const isGraphQLError = error.graphQLErrors?.length > 0;

    return (
      <div className="error-container">
        {isNetworkError && (
          <div className="network-error">
            <h3>Connection Error</h3>
            <p>Unable to connect to the server. Please check your internet connection.</p>
          </div>
        )}

        {isGraphQLError && (
          <div className="graphql-error">
            <h3>Data Error</h3>
            {error.graphQLErrors.map((err, index) => (
              <p key={index}>{err.message}</p>
            ))}
          </div>
        )}

        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  // Render data...
};
```

## Subscriptions for Real-Time Data

Apollo Client supports GraphQL subscriptions for real-time updates.

### Setting Up WebSocket Link

```typescript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: 'https://your-api.com/graphql',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://your-api.com/graphql',
    connectionParams: {
      authToken: localStorage.getItem('token'),
    },
  })
);

// Split link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

### Using Subscriptions

```typescript
import { gql, useSubscription } from '@apollo/client';

const USER_CREATED = gql`
  subscription OnUserCreated {
    userCreated {
      id
      name
      email
    }
  }
`;

const NewUserNotification: React.FC = () => {
  const { data, loading } = useSubscription(USER_CREATED, {
    onData: ({ data }) => {
      console.log('New user created:', data.data?.userCreated);
    },
  });

  if (loading) return null;

  return (
    <div className="notification">
      {data?.userCreated && (
        <p>New user joined: {data.userCreated.name}</p>
      )}
    </div>
  );
};
```

## Testing Apollo Components

### Mocking Apollo Client

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { UserList } from './UserList';
import { GET_USERS } from '../graphql/queries';

const mocks = [
  {
    request: {
      query: GET_USERS,
      variables: { limit: 10, offset: 0 },
    },
    result: {
      data: {
        users: [
          { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'ADMIN' },
        ],
        usersCount: 2,
      },
    },
  },
];

describe('UserList', () => {
  it('renders users successfully', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <UserList />
      </MockedProvider>
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_USERS,
          variables: { limit: 10, offset: 0 },
        },
        error: new Error('Failed to fetch users'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <UserList />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading users/)).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### 1. Use Fragments for Reusability

```typescript
const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    role
  }
`;

const GET_USERS = gql`
  ${USER_FIELDS}
  query GetUsers {
    users {
      ...UserFields
    }
  }
`;
```

### 2. Organize GraphQL Operations

Keep queries, mutations, and fragments in separate files:

```
src/graphql/
├── client.ts
├── fragments/
│   ├── user.ts
│   └── post.ts
├── queries/
│   ├── users.ts
│   └── posts.ts
└── mutations/
    ├── users.ts
    └── posts.ts
```

### 3. Use Type Generation

Use GraphQL Code Generator to auto-generate TypeScript types:

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

Create `codegen.yml`:

```yaml
schema: 'https://your-api.com/graphql'
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.tsx:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
      withComponent: false
```

### 4. Handle Loading and Error States Consistently

Create reusable components:

```typescript
interface QueryWrapperProps<T> {
  loading: boolean;
  error?: ApolloError;
  data?: T;
  children: (data: T) => React.ReactNode;
}

function QueryWrapper<T>({ loading, error, data, children }: QueryWrapperProps<T>) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <NoData />;
  return <>{children(data)}</>;
}
```

### 5. Implement Proper Cache Invalidation

```typescript
const [createUser] = useMutation(CREATE_USER, {
  refetchQueries: [
    { query: GET_USERS },
    'GetUserCount', // Query name
  ],
  awaitRefetchQueries: true,
});
```

## Summary

In this comprehensive guide, we covered building a React application with GraphQL using Apollo Client. Here is a summary of the key concepts:

| Concept | Description | Key Methods/Features |
|---------|-------------|---------------------|
| Apollo Client Setup | Initialize and configure Apollo Client | `ApolloClient`, `InMemoryCache`, `ApolloProvider` |
| Queries | Fetch data from GraphQL API | `useQuery`, `useLazyQuery`, `gql` |
| Mutations | Modify data on the server | `useMutation`, optimistic updates |
| Fragments | Reusable query pieces | `gql` template literals |
| Caching | Store and manage data locally | `InMemoryCache`, `typePolicies`, `fetchPolicy` |
| Error Handling | Handle network and GraphQL errors | `errorLink`, `errorPolicy` |
| Subscriptions | Real-time data updates | `useSubscription`, `GraphQLWsLink` |
| Testing | Mock Apollo Client for tests | `MockedProvider` |
| Cache Updates | Manually update cache after mutations | `cache.writeQuery`, `cache.evict` |
| Type Safety | TypeScript integration | GraphQL Code Generator |

## Key Takeaways

1. **Apollo Client simplifies data management** - It handles caching, loading states, and error handling out of the box.

2. **Use the right fetch policy** - Choose between `cache-first`, `network-only`, `cache-and-network`, etc., based on your needs.

3. **Leverage fragments** - They promote code reuse and ensure consistency across queries.

4. **Update cache after mutations** - Use the `update` function or `refetchQueries` to keep your UI in sync.

5. **Implement optimistic updates** - Provide instant feedback to users while waiting for server responses.

6. **Handle errors gracefully** - Both at the global level and within individual components.

7. **Use TypeScript** - Combined with GraphQL Code Generator, it provides excellent type safety.

8. **Test your components** - `MockedProvider` makes it easy to test Apollo-connected components.

## Conclusion

Apollo Client is a powerful tool for building React applications with GraphQL. Its comprehensive feature set, including intelligent caching, declarative data fetching, and excellent developer experience, makes it an excellent choice for modern web applications.

By following the patterns and best practices outlined in this guide, you can build robust, performant, and maintainable React applications that leverage the full power of GraphQL.

Start small with basic queries and mutations, then gradually incorporate advanced features like subscriptions, optimistic UI, and custom cache policies as your application grows.

Happy coding!
