# How to Implement GraphQL with Apollo Client in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, GraphQL, Apollo Client, API, Mobile Development, TypeScript

Description: Learn how to integrate GraphQL with Apollo Client in React Native for efficient and type-safe data fetching.

---

## Introduction

GraphQL has revolutionized how mobile applications communicate with backend services. Unlike REST APIs where you might need multiple endpoints to fetch related data, GraphQL allows you to request exactly what you need in a single query. When combined with Apollo Client in React Native, you get a powerful, type-safe, and efficient data layer for your mobile applications.

In this comprehensive guide, we will walk through implementing GraphQL with Apollo Client in a React Native application. We will cover everything from basic setup to advanced features like caching, subscriptions, and offline support.

## Why GraphQL for Mobile Development?

Before diving into implementation, let us understand why GraphQL is particularly beneficial for mobile applications:

### 1. Reduced Data Transfer

Mobile devices often operate on limited bandwidth. GraphQL allows you to request only the fields you need, reducing payload sizes significantly.

```graphql
# Instead of fetching entire user objects
query GetUserProfile {
  user(id: "123") {
    name
    avatar
    # Only what we need for the profile screen
  }
}
```

### 2. Single Request for Related Data

Instead of making multiple REST calls, you can fetch related data in one request:

```graphql
query GetPostWithComments {
  post(id: "456") {
    title
    content
    author {
      name
      avatar
    }
    comments(first: 10) {
      text
      createdAt
      author {
        name
      }
    }
  }
}
```

### 3. Strongly Typed Schema

GraphQL's type system enables powerful tooling, autocompletion, and automatic TypeScript type generation.

## Setting Up Your React Native Project

Let us start by creating a new React Native project and installing the necessary dependencies.

### Initialize the Project

```bash
npx react-native init GraphQLApp --template react-native-template-typescript
cd GraphQLApp
```

### Install Apollo Client Dependencies

```bash
npm install @apollo/client graphql
# For React Native specific requirements
npm install @apollo/client @react-native-async-storage/async-storage
```

For TypeScript code generation:

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

## Configuring Apollo Client

Create a dedicated file for Apollo Client configuration. This setup includes caching, error handling, and authentication.

### Basic Apollo Client Setup

```typescript
// src/apollo/client.ts
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';

// HTTP Link for GraphQL endpoint
const httpLink = createHttpLink({
  uri: 'https://api.yourapp.com/graphql',
});

// Authentication Link
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error Handling Link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login or refresh token
        handleAuthError();
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    // Handle network errors (offline state, server down, etc.)
  }
});

// Logging Link for Development
const loggingLink = new ApolloLink((operation, forward) => {
  console.log(`GraphQL Request: ${operation.operationName}`);
  const startTime = Date.now();

  return forward(operation).map((response) => {
    const duration = Date.now() - startTime;
    console.log(`GraphQL Response: ${operation.operationName} (${duration}ms)`);
    return response;
  });
});

// Configure Cache
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Configure field-level caching policies
        posts: {
          keyArgs: ['filter', 'orderBy'],
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    User: {
      // Use custom key fields
      keyFields: ['id', 'email'],
    },
    Post: {
      fields: {
        // Custom field read policies
        isLikedByMe: {
          read(_, { readField }) {
            const likes = readField('likes') as Array<{ id: string }>;
            const currentUserId = getCurrentUserId();
            return likes?.some((like) => like.id === currentUserId) ?? false;
          },
        },
      },
    },
  },
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([loggingLink, errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function for auth errors
function handleAuthError(): void {
  // Implement your auth error handling logic
  AsyncStorage.removeItem('authToken');
  // Navigate to login screen
}

function getCurrentUserId(): string | null {
  // Implement to return current user ID
  return null;
}
```

### Setting Up Apollo Provider

Wrap your application with the Apollo Provider:

```typescript
// App.tsx
import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './src/apollo/client';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ApolloProvider>
  );
};

export default App;
```

## TypeScript Code Generation

Set up GraphQL Code Generator for automatic type generation from your schema.

### Configuration File

```typescript
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://api.yourapp.com/graphql',
  documents: ['src/**/*.graphql', 'src/**/*.tsx'],
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        skipTypename: false,
        dedupeFragments: true,
        enumsAsTypes: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: true,
        },
      },
    },
    './src/generated/schema.json': {
      plugins: ['introspection'],
    },
  },
  hooks: {
    afterOneFileWrite: ['prettier --write'],
  },
};

export default config;
```

### Add Scripts to package.json

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

## Writing Queries with useQuery

Let us create a practical example of fetching and displaying data.

### Define GraphQL Operations

```graphql
# src/graphql/operations/posts.graphql

fragment PostFields on Post {
  id
  title
  content
  createdAt
  updatedAt
  author {
    id
    name
    avatar
  }
  likesCount
  commentsCount
}

query GetPosts($filter: PostFilterInput, $first: Int!, $after: String) {
  posts(filter: $filter, first: $first, after: $after) {
    edges {
      node {
        ...PostFields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

query GetPost($id: ID!) {
  post(id: $id) {
    ...PostFields
    comments(first: 20) {
      edges {
        node {
          id
          text
          createdAt
          author {
            id
            name
            avatar
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### Using Generated Hooks

After running code generation, use the generated hooks:

```typescript
// src/screens/PostsScreen.tsx
import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useGetPostsQuery, PostFieldsFragment } from '../generated/graphql';
import { PostCard } from '../components/PostCard';
import { ErrorView } from '../components/ErrorView';

const POSTS_PER_PAGE = 10;

export const PostsScreen: React.FC = () => {
  const { data, loading, error, refetch, fetchMore } = useGetPostsQuery({
    variables: {
      first: POSTS_PER_PAGE,
      filter: { published: true },
    },
    notifyOnNetworkStatusChange: true,
  });

  const posts = data?.posts.edges.map((edge) => edge.node) ?? [];
  const pageInfo = data?.posts.pageInfo;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || loading) return;

    await fetchMore({
      variables: {
        after: pageInfo.endCursor,
      },
    });
  }, [fetchMore, pageInfo, loading]);

  const renderPost = useCallback(
    ({ item }: { item: PostFieldsFragment }) => (
      <PostCard post={item} />
    ),
    []
  );

  const renderFooter = useCallback(() => {
    if (!loading || !posts.length) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }, [loading, posts.length]);

  if (error && !data) {
    return (
      <ErrorView
        message={error.message}
        onRetry={handleRefresh}
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={loading && !!data} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

## Mutations with useMutation

Implement data modification operations with proper optimistic updates.

### Define Mutations

```graphql
# src/graphql/operations/mutations.graphql

mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ...PostFields
  }
}

mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
  updatePost(id: $id, input: $input) {
    ...PostFields
  }
}

mutation DeletePost($id: ID!) {
  deletePost(id: $id) {
    id
  }
}

mutation LikePost($postId: ID!) {
  likePost(postId: $postId) {
    id
    likesCount
    isLikedByMe
  }
}

mutation AddComment($postId: ID!, $text: String!) {
  addComment(postId: $postId, text: $text) {
    id
    text
    createdAt
    author {
      id
      name
      avatar
    }
  }
}
```

### Using Mutations with Optimistic Updates

```typescript
// src/hooks/usePostMutations.ts
import { useCallback } from 'react';
import {
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useLikePostMutation,
  useAddCommentMutation,
  GetPostsDocument,
  GetPostsQuery,
  GetPostDocument,
  CreatePostInput,
  UpdatePostInput,
} from '../generated/graphql';
import { useCurrentUser } from './useCurrentUser';

export function usePostMutations() {
  const { user } = useCurrentUser();

  const [createPost, { loading: creating }] = useCreatePostMutation({
    update(cache, { data }) {
      if (!data?.createPost) return;

      // Update the posts list cache
      cache.modify({
        fields: {
          posts(existingPosts = { edges: [] }) {
            const newPostRef = cache.writeFragment({
              data: data.createPost,
              fragment: PostFieldsFragmentDoc,
            });
            return {
              ...existingPosts,
              edges: [
                { __typename: 'PostEdge', node: newPostRef, cursor: data.createPost.id },
                ...existingPosts.edges,
              ],
              totalCount: (existingPosts.totalCount || 0) + 1,
            };
          },
        },
      });
    },
  });

  const [updatePost, { loading: updating }] = useUpdatePostMutation({
    // Optimistic response for instant UI feedback
    optimisticResponse: ({ id, input }) => ({
      __typename: 'Mutation',
      updatePost: {
        __typename: 'Post',
        id,
        ...input,
        updatedAt: new Date().toISOString(),
      },
    }),
  });

  const [deletePost, { loading: deleting }] = useDeletePostMutation({
    update(cache, { data }) {
      if (!data?.deletePost) return;

      // Remove from cache
      cache.evict({ id: cache.identify(data.deletePost) });
      cache.gc();
    },
    optimisticResponse: ({ id }) => ({
      __typename: 'Mutation',
      deletePost: {
        __typename: 'Post',
        id,
      },
    }),
  });

  const [likePost, { loading: liking }] = useLikePostMutation({
    optimisticResponse: ({ postId }) => ({
      __typename: 'Mutation',
      likePost: {
        __typename: 'Post',
        id: postId,
        likesCount: 0, // Will be corrected by server response
        isLikedByMe: true,
      },
    }),
  });

  const [addComment, { loading: commenting }] = useAddCommentMutation({
    update(cache, { data }, { variables }) {
      if (!data?.addComment || !variables?.postId) return;

      // Update the post's comments in cache
      cache.modify({
        id: cache.identify({ __typename: 'Post', id: variables.postId }),
        fields: {
          comments(existingComments = { edges: [] }) {
            const newCommentRef = cache.writeFragment({
              data: data.addComment,
              fragment: gql`
                fragment NewComment on Comment {
                  id
                  text
                  createdAt
                  author {
                    id
                    name
                    avatar
                  }
                }
              `,
            });
            return {
              ...existingComments,
              edges: [
                ...existingComments.edges,
                { __typename: 'CommentEdge', node: newCommentRef },
              ],
            };
          },
          commentsCount(existing = 0) {
            return existing + 1;
          },
        },
      });
    },
    optimisticResponse: ({ postId, text }) => ({
      __typename: 'Mutation',
      addComment: {
        __typename: 'Comment',
        id: `temp-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
        author: {
          __typename: 'User',
          id: user?.id || '',
          name: user?.name || '',
          avatar: user?.avatar || null,
        },
      },
    }),
  });

  // Wrapped mutation handlers with error handling
  const handleCreatePost = useCallback(
    async (input: CreatePostInput) => {
      try {
        const result = await createPost({ variables: { input } });
        return { success: true, data: result.data?.createPost };
      } catch (error) {
        console.error('Failed to create post:', error);
        return { success: false, error };
      }
    },
    [createPost]
  );

  const handleUpdatePost = useCallback(
    async (id: string, input: UpdatePostInput) => {
      try {
        const result = await updatePost({ variables: { id, input } });
        return { success: true, data: result.data?.updatePost };
      } catch (error) {
        console.error('Failed to update post:', error);
        return { success: false, error };
      }
    },
    [updatePost]
  );

  const handleDeletePost = useCallback(
    async (id: string) => {
      try {
        await deletePost({ variables: { id } });
        return { success: true };
      } catch (error) {
        console.error('Failed to delete post:', error);
        return { success: false, error };
      }
    },
    [deletePost]
  );

  const handleLikePost = useCallback(
    async (postId: string) => {
      try {
        await likePost({ variables: { postId } });
        return { success: true };
      } catch (error) {
        console.error('Failed to like post:', error);
        return { success: false, error };
      }
    },
    [likePost]
  );

  const handleAddComment = useCallback(
    async (postId: string, text: string) => {
      try {
        const result = await addComment({ variables: { postId, text } });
        return { success: true, data: result.data?.addComment };
      } catch (error) {
        console.error('Failed to add comment:', error);
        return { success: false, error };
      }
    },
    [addComment]
  );

  return {
    createPost: handleCreatePost,
    updatePost: handleUpdatePost,
    deletePost: handleDeletePost,
    likePost: handleLikePost,
    addComment: handleAddComment,
    loading: creating || updating || deleting || liking || commenting,
  };
}
```

## Advanced Caching Strategies

Apollo Client provides powerful caching capabilities. Let us explore advanced patterns.

### Custom Type Policies

```typescript
// src/apollo/typePolicies.ts
import { TypePolicies, FieldPolicy } from '@apollo/client';

// Pagination helper for cursor-based pagination
function cursorPagination<T = any>(): FieldPolicy<T> {
  return {
    keyArgs: ['filter', 'orderBy'],
    merge(existing: any = { edges: [], pageInfo: {} }, incoming: any) {
      // If it's a refresh (no cursor), replace entirely
      if (!incoming.pageInfo?.startCursor) {
        return incoming;
      }

      return {
        ...incoming,
        edges: [...(existing.edges || []), ...incoming.edges],
      };
    },
  };
}

// Offset-based pagination helper
function offsetPagination<T = any>(): FieldPolicy<T> {
  return {
    keyArgs: ['filter', 'orderBy'],
    merge(existing: any[] = [], incoming: any[], { args }) {
      const offset = args?.offset || 0;
      const merged = existing.slice(0);

      for (let i = 0; i < incoming.length; i++) {
        merged[offset + i] = incoming[i];
      }

      return merged;
    },
    read(existing: any[], { args }) {
      if (!existing) return undefined;

      const offset = args?.offset || 0;
      const limit = args?.limit || existing.length;

      return existing.slice(offset, offset + limit);
    },
  };
}

export const typePolicies: TypePolicies = {
  Query: {
    fields: {
      posts: cursorPagination(),
      searchResults: offsetPagination(),
      // Cache redirect - use cached data from different query
      post: {
        read(_, { args, toReference }) {
          return toReference({
            __typename: 'Post',
            id: args?.id,
          });
        },
      },
      user: {
        read(_, { args, toReference }) {
          return toReference({
            __typename: 'User',
            id: args?.id,
          });
        },
      },
    },
  },
  Post: {
    keyFields: ['id'],
    fields: {
      comments: cursorPagination(),
      // Local-only computed field
      formattedDate: {
        read(_, { readField }) {
          const createdAt = readField('createdAt') as string;
          return new Date(createdAt).toLocaleDateString();
        },
      },
      // Transform field data
      content: {
        read(content: string) {
          // Sanitize or transform content
          return content?.trim();
        },
      },
    },
  },
  User: {
    keyFields: ['id'],
    fields: {
      fullName: {
        read(_, { readField }) {
          const firstName = readField('firstName');
          const lastName = readField('lastName');
          return `${firstName} ${lastName}`;
        },
      },
    },
  },
};
```

### Cache Persistence

```typescript
// src/apollo/cachePersistence.ts
import { InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache } from 'apollo3-cache-persist';

const CACHE_KEY = 'apollo-cache';

export async function setupCachePersistence(
  cache: InMemoryCache
): Promise<void> {
  try {
    await persistCache({
      cache,
      storage: AsyncStorage,
      key: CACHE_KEY,
      maxSize: 1024 * 1024 * 10, // 10 MB
      debug: __DEV__,
      trigger: 'background',
    });
  } catch (error) {
    console.error('Failed to setup cache persistence:', error);
  }
}

export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear persisted cache:', error);
  }
}
```

## Real-Time Updates with Subscriptions

Implement real-time features using GraphQL subscriptions.

### Configure WebSocket Link

```typescript
// src/apollo/subscriptionClient.ts
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = new HttpLink({
  uri: 'https://api.yourapp.com/graphql',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://api.yourapp.com/graphql',
    connectionParams: async () => {
      const token = await AsyncStorage.getItem('authToken');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    on: {
      connected: () => console.log('WebSocket connected'),
      error: (error) => console.error('WebSocket error:', error),
      closed: () => console.log('WebSocket closed'),
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Split link based on operation type
export const splitLink = split(
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
```

### Define Subscriptions

```graphql
# src/graphql/operations/subscriptions.graphql

subscription OnPostCreated {
  postCreated {
    ...PostFields
  }
}

subscription OnPostUpdated($postId: ID!) {
  postUpdated(postId: $postId) {
    ...PostFields
  }
}

subscription OnNewComment($postId: ID!) {
  commentAdded(postId: $postId) {
    id
    text
    createdAt
    author {
      id
      name
      avatar
    }
  }
}

subscription OnNotification {
  notificationReceived {
    id
    type
    message
    data
    createdAt
    read
  }
}
```

### Using Subscriptions in Components

```typescript
// src/hooks/useRealTimeUpdates.ts
import { useEffect } from 'react';
import {
  useOnPostCreatedSubscription,
  useOnNewCommentSubscription,
  useOnNotificationSubscription,
  GetPostsDocument,
} from '../generated/graphql';
import { useApolloClient } from '@apollo/client';

export function useRealTimePostUpdates() {
  const client = useApolloClient();

  const { data: newPost } = useOnPostCreatedSubscription();

  useEffect(() => {
    if (!newPost?.postCreated) return;

    // Update cache with new post
    client.cache.modify({
      fields: {
        posts(existingPosts = { edges: [] }) {
          const newPostRef = client.cache.writeFragment({
            data: newPost.postCreated,
            fragment: PostFieldsFragmentDoc,
          });

          // Check if post already exists
          const exists = existingPosts.edges.some(
            (edge: any) => edge.node.__ref === newPostRef?.__ref
          );

          if (exists) return existingPosts;

          return {
            ...existingPosts,
            edges: [
              {
                __typename: 'PostEdge',
                node: newPostRef,
                cursor: newPost.postCreated.id,
              },
              ...existingPosts.edges,
            ],
          };
        },
      },
    });
  }, [newPost, client]);
}

export function useRealTimeComments(postId: string) {
  const client = useApolloClient();

  const { data: newComment } = useOnNewCommentSubscription({
    variables: { postId },
    skip: !postId,
  });

  useEffect(() => {
    if (!newComment?.commentAdded) return;

    client.cache.modify({
      id: client.cache.identify({ __typename: 'Post', id: postId }),
      fields: {
        comments(existingComments = { edges: [] }) {
          const newCommentRef = client.cache.writeFragment({
            data: newComment.commentAdded,
            fragment: gql`
              fragment NewComment on Comment {
                id
                text
                createdAt
                author {
                  id
                  name
                  avatar
                }
              }
            `,
          });

          return {
            ...existingComments,
            edges: [
              ...existingComments.edges,
              { __typename: 'CommentEdge', node: newCommentRef },
            ],
          };
        },
        commentsCount(existing = 0) {
          return existing + 1;
        },
      },
    });
  }, [newComment, client, postId]);
}

// Real-time notifications hook
export function useNotifications() {
  const { data, loading } = useOnNotificationSubscription();

  useEffect(() => {
    if (data?.notificationReceived) {
      // Show local notification
      showLocalNotification(data.notificationReceived);
    }
  }, [data]);

  return { notification: data?.notificationReceived, loading };
}
```

## Comprehensive Error Handling

Implement robust error handling for better user experience.

```typescript
// src/apollo/errorHandling.ts
import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';

export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}

interface ParsedError {
  code: ErrorCode;
  message: string;
  field?: string;
  retryable: boolean;
}

export function parseGraphQLError(error: ApolloError): ParsedError[] {
  const errors: ParsedError[] = [];

  // Handle GraphQL errors
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach((graphQLError: GraphQLError) => {
      const code = (graphQLError.extensions?.code as ErrorCode) || ErrorCode.INTERNAL_ERROR;
      const field = graphQLError.extensions?.field as string | undefined;

      errors.push({
        code,
        message: getUserFriendlyMessage(code, graphQLError.message),
        field,
        retryable: isRetryable(code),
      });
    });
  }

  // Handle network errors
  if (error.networkError) {
    errors.push({
      code: ErrorCode.NETWORK_ERROR,
      message: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
    });
  }

  return errors.length > 0 ? errors : [{
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
  }];
}

function getUserFriendlyMessage(code: ErrorCode, defaultMessage: string): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.UNAUTHENTICATED]: 'Your session has expired. Please log in again.',
    [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
    [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.VALIDATION_ERROR]: defaultMessage,
    [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
    [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  };

  return messages[code] || defaultMessage;
}

function isRetryable(code: ErrorCode): boolean {
  return [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.INTERNAL_ERROR,
    ErrorCode.RATE_LIMITED,
  ].includes(code);
}

// Error boundary hook for components
export function useErrorHandler() {
  const handleError = useCallback((error: ApolloError) => {
    const parsedErrors = parseGraphQLError(error);

    parsedErrors.forEach((parsedError) => {
      switch (parsedError.code) {
        case ErrorCode.UNAUTHENTICATED:
          // Navigate to login
          navigationRef.navigate('Login');
          break;
        case ErrorCode.FORBIDDEN:
          Alert.alert('Access Denied', parsedError.message);
          break;
        case ErrorCode.RATE_LIMITED:
          // Implement exponential backoff
          break;
        default:
          // Show error toast or alert
          showErrorToast(parsedError.message);
      }
    });

    return parsedErrors;
  }, []);

  return { handleError };
}
```

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    // Report to error tracking service
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Button title="Try Again" onPress={this.handleRetry} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
```

## Offline Support

Implement offline-first capabilities for your React Native app.

```typescript
// src/apollo/offlineSupport.ts
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { QueueLink } from '@apollo/client/link/queue';
import { RetryLink } from '@apollo/client/link/retry';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_MUTATIONS_KEY = 'offline-mutations';

// Queue link for offline mutations
export const queueLink = new QueueLink();

// Retry link with exponential backoff
export const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 30000,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, operation) => {
      // Retry on network errors
      return !!error && operation.operationName !== 'Login';
    },
  },
});

// Network status monitoring
export function setupNetworkStatusListener(
  client: ApolloClient<NormalizedCacheObject>
): () => void {
  let isOnline = true;

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const wasOnline = isOnline;
    isOnline = state.isConnected ?? false;

    if (!wasOnline && isOnline) {
      // Coming back online
      console.log('Network restored - processing offline queue');
      queueLink.open();

      // Refetch active queries
      client.refetchQueries({
        include: 'active',
      });
    } else if (wasOnline && !isOnline) {
      // Going offline
      console.log('Network lost - queuing mutations');
      queueLink.close();
    }
  });

  return unsubscribe;
}

// Persist offline mutations
export async function persistOfflineMutation(mutation: any): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_MUTATIONS_KEY);
    const mutations = existing ? JSON.parse(existing) : [];
    mutations.push({
      ...mutation,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(OFFLINE_MUTATIONS_KEY, JSON.stringify(mutations));
  } catch (error) {
    console.error('Failed to persist offline mutation:', error);
  }
}

// Replay offline mutations on app start
export async function replayOfflineMutations(
  client: ApolloClient<NormalizedCacheObject>
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_MUTATIONS_KEY);
    if (!stored) return;

    const mutations = JSON.parse(stored);

    for (const mutation of mutations) {
      try {
        await client.mutate({
          mutation: mutation.query,
          variables: mutation.variables,
        });
      } catch (error) {
        console.error('Failed to replay mutation:', error);
      }
    }

    // Clear after replay
    await AsyncStorage.removeItem(OFFLINE_MUTATIONS_KEY);
  } catch (error) {
    console.error('Failed to replay offline mutations:', error);
  }
}

// Hook for checking network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  return { isOnline };
}
```

### Offline-Aware Component

```typescript
// src/components/OfflineIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetworkStatus } from '../apollo/offlineSupport';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>
        You are offline. Changes will be synced when you reconnect.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f44336',
    padding: 10,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});
```

## Pagination Patterns

Implement efficient pagination for large data sets.

### Infinite Scroll with Cursor Pagination

```typescript
// src/hooks/usePaginatedQuery.ts
import { useCallback, useMemo } from 'react';
import { DocumentNode, useQuery, QueryHookOptions } from '@apollo/client';

interface PaginationConfig {
  first?: number;
  pageSize?: number;
}

interface PaginatedResult<TData, TVariables> {
  data: TData | undefined;
  loading: boolean;
  error: any;
  items: any[];
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoadingMore: boolean;
  isRefreshing: boolean;
}

export function usePaginatedQuery<TData, TVariables>(
  query: DocumentNode,
  options: QueryHookOptions<TData, TVariables> & PaginationConfig,
  extractData: (data: TData) => {
    edges: Array<{ node: any; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }
): PaginatedResult<TData, TVariables> {
  const pageSize = options.pageSize || options.first || 20;

  const { data, loading, error, fetchMore, refetch, networkStatus } = useQuery<
    TData,
    TVariables
  >(query, {
    ...options,
    variables: {
      ...options.variables,
      first: pageSize,
    } as TVariables,
    notifyOnNetworkStatusChange: true,
  });

  const extractedData = useMemo(() => {
    if (!data) return null;
    return extractData(data);
  }, [data, extractData]);

  const items = useMemo(() => {
    return extractedData?.edges.map((edge) => edge.node) || [];
  }, [extractedData]);

  const hasNextPage = extractedData?.pageInfo.hasNextPage ?? false;
  const endCursor = extractedData?.pageInfo.endCursor;

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loading) return;

    await fetchMore({
      variables: {
        after: endCursor,
        first: pageSize,
      },
    });
  }, [fetchMore, endCursor, hasNextPage, loading, pageSize]);

  const refresh = useCallback(async () => {
    await refetch({
      ...options.variables,
      first: pageSize,
      after: null,
    } as TVariables);
  }, [refetch, options.variables, pageSize]);

  return {
    data,
    loading,
    error,
    items,
    hasNextPage,
    loadMore,
    refresh,
    isLoadingMore: networkStatus === 3,
    isRefreshing: networkStatus === 4,
  };
}
```

## Performance Optimization Tips

### 1. Use Fragments Wisely

```typescript
// src/graphql/fragments/index.ts
import { gql } from '@apollo/client';

// Base fragment for list views (minimal data)
export const PostListItemFragment = gql`
  fragment PostListItem on Post {
    id
    title
    excerpt
    createdAt
    author {
      id
      name
      avatar
    }
    likesCount
    commentsCount
  }
`;

// Extended fragment for detail views (full data)
export const PostDetailFragment = gql`
  fragment PostDetail on Post {
    ...PostListItem
    content
    tags
    updatedAt
    isLikedByMe
  }
  ${PostListItemFragment}
`;
```

### 2. Batch Requests

```typescript
// src/apollo/batchLink.ts
import { BatchHttpLink } from '@apollo/client/link/batch-http';

export const batchLink = new BatchHttpLink({
  uri: 'https://api.yourapp.com/graphql',
  batchMax: 10,
  batchInterval: 20, // ms
});
```

### 3. Prefetching

```typescript
// src/hooks/usePrefetch.ts
import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { GetPostDocument, GetPostQueryVariables } from '../generated/graphql';

export function usePrefetch() {
  const client = useApolloClient();

  const prefetchPost = useCallback(
    (postId: string) => {
      client.query<GetPostQuery, GetPostQueryVariables>({
        query: GetPostDocument,
        variables: { id: postId },
      });
    },
    [client]
  );

  return { prefetchPost };
}

// Usage in list component
const PostListItem: React.FC<{ post: Post }> = ({ post }) => {
  const { prefetchPost } = usePrefetch();
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('PostDetail', { id: post.id });
  };

  const handlePressIn = () => {
    // Prefetch on touch start for faster navigation
    prefetchPost(post.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
    >
      {/* Post content */}
    </TouchableOpacity>
  );
};
```

## Testing GraphQL Components

```typescript
// src/__tests__/PostsScreen.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import { PostsScreen } from '../screens/PostsScreen';
import { GetPostsDocument } from '../generated/graphql';

const mockPosts = {
  posts: {
    edges: [
      {
        node: {
          id: '1',
          title: 'Test Post',
          content: 'Test content',
          createdAt: '2024-01-01',
          author: {
            id: '1',
            name: 'John Doe',
            avatar: null,
          },
          likesCount: 5,
          commentsCount: 3,
        },
        cursor: '1',
      },
    ],
    pageInfo: {
      hasNextPage: false,
      endCursor: '1',
    },
    totalCount: 1,
  },
};

const mocks = [
  {
    request: {
      query: GetPostsDocument,
      variables: {
        first: 10,
        filter: { published: true },
      },
    },
    result: {
      data: mockPosts,
    },
  },
];

describe('PostsScreen', () => {
  it('renders posts correctly', async () => {
    const { getByText, queryByText } = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <PostsScreen />
      </MockedProvider>
    );

    // Initially shows loading
    expect(getByText('Loading posts...')).toBeTruthy();

    // After loading, shows posts
    await waitFor(() => {
      expect(queryByText('Loading posts...')).toBeNull();
      expect(getByText('Test Post')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    const errorMocks = [
      {
        request: {
          query: GetPostsDocument,
          variables: {
            first: 10,
            filter: { published: true },
          },
        },
        error: new Error('Network error'),
      },
    ];

    const { getByText } = render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <PostsScreen />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });
});
```

## Conclusion

Implementing GraphQL with Apollo Client in React Native provides a powerful, type-safe, and efficient data layer for your mobile applications. Key takeaways from this guide:

1. **Type Safety**: Use GraphQL Code Generator to automatically generate TypeScript types and hooks from your schema.

2. **Caching**: Leverage Apollo's intelligent caching with custom type policies to minimize network requests.

3. **Optimistic Updates**: Provide instant UI feedback by predicting server responses.

4. **Real-Time Features**: Implement subscriptions for live data updates.

5. **Offline Support**: Build resilient apps that work seamlessly offline.

6. **Error Handling**: Implement comprehensive error handling for better user experience.

7. **Performance**: Use fragments, batching, and prefetching to optimize performance.

By following these patterns and best practices, you can build robust, scalable, and performant React Native applications that deliver excellent user experiences.

## Additional Resources

- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [GraphQL Specification](https://graphql.org/learn/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)

Happy coding!
