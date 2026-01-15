# How to Implement Pull-to-Refresh and Infinite Scroll in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Pull-to-Refresh, Infinite Scroll, FlatList, Mobile Development, UX

Description: Learn how to implement pull-to-refresh and infinite scroll patterns in React Native for dynamic content loading.

---

Pull-to-refresh and infinite scroll are two essential patterns in mobile app development that significantly enhance user experience. Pull-to-refresh allows users to manually trigger content updates by pulling down on a list, while infinite scroll automatically loads more content as users approach the end of the visible items. In this comprehensive guide, we will explore how to implement both patterns in React Native, along with best practices for handling various edge cases.

## Understanding the Basics

Before diving into implementation, let's understand why these patterns matter:

- **Pull-to-refresh** gives users control over when to fetch fresh data
- **Infinite scroll** provides seamless content consumption without pagination buttons
- **Combined**, they create a modern, intuitive mobile experience

React Native provides excellent built-in support for both patterns through `FlatList` and related components.

## Pull-to-Refresh with RefreshControl

The `RefreshControl` component is React Native's built-in solution for implementing pull-to-refresh functionality. Here's a basic implementation:

```typescript
import React, { useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface DataItem {
  id: string;
  title: string;
  description: string;
}

const BasicPullToRefresh: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async (): Promise<DataItem[]> => {
    // Simulate API call
    const response = await fetch('https://api.example.com/items');
    return response.json();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const newData = await fetchData();
      setData(newData);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderItem = ({ item }: { item: DataItem }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']} // Android
          tintColor="#007AFF" // iOS
          title="Pull to refresh" // iOS only
          titleColor="#007AFF" // iOS only
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

export default BasicPullToRefresh;
```

## Custom Refresh Indicator

Sometimes the default refresh indicator doesn't match your app's design. Here's how to create a custom refresh indicator:

```typescript
import React, { useState, useRef, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  Animated,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
} from 'react-native';

interface CustomRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const REFRESH_THRESHOLD = 80;

const CustomRefreshControl: React.FC<CustomRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      Animated.spring(pullDistance, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return scrollY.current <= 0 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && !refreshing) {
          const resistance = 0.4;
          pullDistance.setValue(gestureState.dy * resistance);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy * 0.4 >= REFRESH_THRESHOLD && !refreshing) {
          handleRefresh();
        } else {
          Animated.spring(pullDistance, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const rotation = pullDistance.interpolate({
    inputRange: [0, REFRESH_THRESHOLD],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.refreshIndicator,
          {
            height: pullDistance,
            opacity: pullDistance.interpolate({
              inputRange: [0, REFRESH_THRESHOLD / 2, REFRESH_THRESHOLD],
              outputRange: [0, 0.5, 1],
            }),
          },
        ]}
      >
        {refreshing ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Animated.Text
            style={[styles.arrow, { transform: [{ rotate: rotation }] }]}
          >
            ↓
          </Animated.Text>
        )}
      </Animated.View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  refreshIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  arrow: {
    fontSize: 24,
    color: '#007AFF',
  },
});
```

## Infinite Scroll Basics

Infinite scroll in React Native is implemented using the `onEndReached` prop of `FlatList`. Here's a basic example:

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface Post {
  id: string;
  title: string;
  body: string;
}

const PAGE_SIZE = 20;

const InfiniteScrollList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchPosts = async (pageNumber: number): Promise<Post[]> => {
    const response = await fetch(
      `https://api.example.com/posts?page=${pageNumber}&limit=${PAGE_SIZE}`
    );
    return response.json();
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const initialPosts = await fetchPosts(1);
      setPosts(initialPosts);
      setHasMore(initialPosts.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const morePosts = await fetchPosts(nextPage);

      if (morePosts.length > 0) {
        setPosts((prev) => [...prev, ...morePosts]);
        setPage(nextPage);
        setHasMore(morePosts.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.postItem}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postBody}>{item.body}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  postBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
});

export default InfiniteScrollList;
```

## onEndReached Configuration

The `onEndReachedThreshold` prop determines how far from the end the user must scroll before `onEndReached` is triggered. Understanding this value is crucial:

```typescript
// Trigger when user is within last 50% of content
onEndReachedThreshold={0.5}

// Trigger when user is within last 20% of content
onEndReachedThreshold={0.2}

// Trigger when user reaches the very end
onEndReachedThreshold={0}

// Trigger when user is 1 screen height away from end
onEndReachedThreshold={1}
```

Here's a more robust configuration:

```typescript
import React, { useState, useCallback, useRef } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface ConfigurableInfiniteScrollProps {
  threshold?: number;
  debounceTime?: number;
}

const ConfigurableInfiniteScroll: React.FC<ConfigurableInfiniteScrollProps> = ({
  threshold = 0.5,
  debounceTime = 500,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const lastLoadTime = useRef<number>(0);

  const loadMore = useCallback(() => {
    const now = Date.now();

    // Debounce mechanism
    if (now - lastLoadTime.current < debounceTime) {
      return;
    }
    lastLoadTime.current = now;

    if (loading) return;

    // Load more data logic here
    setLoading(true);
    // ... fetch logic
    setLoading(false);
  }, [loading, debounceTime]);

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <View><Text>{item.title}</Text></View>}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={threshold}
      // Additional performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={21}
    />
  );
};
```

## Loading More Data with Pagination Strategies

Different APIs use different pagination strategies. Here's how to handle the most common ones:

### Offset-Based Pagination

```typescript
interface OffsetPaginationState {
  items: any[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

const useOffsetPagination = (fetchFn: (offset: number, limit: number) => Promise<any[]>) => {
  const [state, setState] = useState<OffsetPaginationState>({
    items: [],
    offset: 0,
    limit: 20,
    hasMore: true,
  });
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !state.hasMore) return;

    setLoading(true);
    try {
      const newItems = await fetchFn(state.offset, state.limit);
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...newItems],
        offset: prev.offset + newItems.length,
        hasMore: newItems.length === prev.limit,
      }));
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setLoading(false);
    }
  }, [state, loading, fetchFn]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const newItems = await fetchFn(0, state.limit);
      setState((prev) => ({
        ...prev,
        items: newItems,
        offset: newItems.length,
        hasMore: newItems.length === prev.limit,
      }));
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [state.limit, fetchFn]);

  return { ...state, loading, loadMore, refresh };
};
```

### Cursor-Based Pagination

```typescript
interface CursorPaginationState {
  items: any[];
  cursor: string | null;
  hasMore: boolean;
}

const useCursorPagination = (
  fetchFn: (cursor: string | null, limit: number) => Promise<{ items: any[]; nextCursor: string | null }>
) => {
  const [state, setState] = useState<CursorPaginationState>({
    items: [],
    cursor: null,
    hasMore: true,
  });
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !state.hasMore) return;

    setLoading(true);
    try {
      const { items: newItems, nextCursor } = await fetchFn(state.cursor, 20);
      setState((prev) => ({
        items: [...prev.items, ...newItems],
        cursor: nextCursor,
        hasMore: nextCursor !== null,
      }));
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setLoading(false);
    }
  }, [state, loading, fetchFn]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { items: newItems, nextCursor } = await fetchFn(null, 20);
      setState({
        items: newItems,
        cursor: nextCursor,
        hasMore: nextCursor !== null,
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  return { ...state, loading, loadMore, refresh };
};
```

## Preventing Duplicate Loads

One common issue with infinite scroll is triggering multiple load requests. Here's a robust solution:

```typescript
import React, { useState, useCallback, useRef } from 'react';
import { FlatList, View, ActivityIndicator, StyleSheet } from 'react-native';

type LoadingState = 'idle' | 'loading' | 'refreshing' | 'loadingMore';

const useSafeInfiniteScroll = <T extends { id: string }>() => {
  const [items, setItems] = useState<T[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const itemIdsRef = useRef(new Set<string>());

  const addItems = useCallback((newItems: T[], replace: boolean = false) => {
    if (replace) {
      itemIdsRef.current.clear();
    }

    // Filter out duplicates
    const uniqueNewItems = newItems.filter((item) => {
      if (itemIdsRef.current.has(item.id)) {
        return false;
      }
      itemIdsRef.current.add(item.id);
      return true;
    });

    setItems((prev) => (replace ? uniqueNewItems : [...prev, ...uniqueNewItems]));
  }, []);

  const loadMore = useCallback(async (fetchFn: (page: number) => Promise<T[]>) => {
    // Multiple safeguards against duplicate loads
    if (loadingRef.current) return;
    if (loadingState !== 'idle') return;
    if (!hasMore) return;

    loadingRef.current = true;
    setLoadingState('loadingMore');

    try {
      const nextPage = pageRef.current + 1;
      const newItems = await fetchFn(nextPage);

      if (newItems.length > 0) {
        addItems(newItems);
        pageRef.current = nextPage;
      }
      setHasMore(newItems.length > 0);
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      loadingRef.current = false;
      setLoadingState('idle');
    }
  }, [loadingState, hasMore, addItems]);

  const refresh = useCallback(async (fetchFn: (page: number) => Promise<T[]>) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoadingState('refreshing');

    try {
      const newItems = await fetchFn(1);
      addItems(newItems, true);
      pageRef.current = 1;
      setHasMore(newItems.length > 0);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      loadingRef.current = false;
      setLoadingState('idle');
    }
  }, [addItems]);

  return {
    items,
    loadingState,
    hasMore,
    loadMore,
    refresh,
    isRefreshing: loadingState === 'refreshing',
    isLoadingMore: loadingState === 'loadingMore',
  };
};
```

## Empty State Handling

Providing meaningful feedback when there's no data is crucial for user experience:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}) => (
  <View style={styles.emptyContainer}>
    {icon && (
      <Text style={styles.emptyIcon}>{icon}</Text>
    )}
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Usage in FlatList
const ListWithEmptyState: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    // Refresh logic
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="!"
          title="Something went wrong"
          message={error}
          actionLabel="Try Again"
          onAction={handleRefresh}
        />
      );
    }

    return (
      <EmptyState
        icon="O"
        title="No items yet"
        message="Pull down to refresh or check back later."
        actionLabel="Refresh"
        onAction={handleRefresh}
      />
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <View />}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={data.length === 0 ? styles.emptyList : undefined}
    />
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyList: {
    flexGrow: 1,
  },
});
```

## Error State Handling

Robust error handling improves user trust and app reliability:

```typescript
import React, { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';

interface ErrorBoundaryState {
  error: Error | null;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const useErrorHandling = () => {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    error: null,
    retryCount: 0,
  });

  const handleError = useCallback((error: Error) => {
    setErrorState((prev) => ({
      error,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState({ error: null, retryCount: 0 });
  }, []);

  const canRetry = errorState.retryCount < MAX_RETRIES;

  return { ...errorState, handleError, clearError, canRetry };
};

const ErrorAwareList: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const { error, handleError, clearError, canRetry } = useErrorHandling();

  const fetchWithRetry = async (
    fetchFn: () => Promise<any>,
    retries: number = MAX_RETRIES
  ): Promise<any> => {
    try {
      return await fetchFn();
    } catch (err) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(fetchFn, retries - 1);
      }
      throw err;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    setLoadMoreError(null);

    try {
      const result = await fetchWithRetry(() =>
        fetch('https://api.example.com/items').then((r) => r.json())
      );
      setData(result);
    } catch (err) {
      handleError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, [clearError, handleError]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const result = await fetch(
        `https://api.example.com/items?offset=${data.length}`
      ).then((r) => r.json());
      setData((prev) => [...prev, ...result]);
    } catch (err) {
      setLoadMoreError('Failed to load more items. Tap to retry.');
    } finally {
      setLoadingMore(false);
    }
  }, [data.length, loadingMore]);

  const renderFooter = () => {
    if (loadMoreError) {
      return (
        <TouchableOpacity style={styles.errorFooter} onPress={loadMore}>
          <Text style={styles.errorText}>{loadMoreError}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      );
    }

    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" />
        </View>
      );
    }

    return null;
  };

  if (error && data.length === 0) {
    return (
      <View style={styles.fullScreenError}>
        <Text style={styles.errorTitle}>Unable to load content</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {canRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <View style={styles.item}><Text>{item.title}</Text></View>}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  errorFooter: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 4,
  },
  retryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  fullScreenError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
```

## Combining Both Patterns

Here's a complete implementation combining pull-to-refresh and infinite scroll:

```typescript
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Article {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}

const PAGE_SIZE = 20;

const CombinedScrollList: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);

  const fetchArticles = async (
    page: number
  ): Promise<PaginatedResponse<Article>> => {
    const response = await fetch(
      `https://api.example.com/articles?page=${page}&limit=${PAGE_SIZE}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch articles');
    }

    return response.json();
  };

  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchArticles(1);
      setArticles(response.data);
      setHasMore(response.hasMore);
      pageRef.current = 1;
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const onRefresh = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetchArticles(1);
      setArticles(response.data);
      setHasMore(response.hasMore);
      pageRef.current = 1;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || loadingMore) return;

    isLoadingRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = pageRef.current + 1;
      const response = await fetchArticles(nextPage);

      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newArticles = response.data.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });

      setHasMore(response.hasMore);
      pageRef.current = nextPage;
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore, loadingMore]);

  const renderArticle = ({ item }: { item: Article }) => (
    <View style={styles.articleCard}>
      <Text style={styles.articleTitle}>{item.title}</Text>
      <Text style={styles.articleSummary} numberOfLines={2}>
        {item.summary}
      </Text>
      <Text style={styles.articleDate}>
        {new Date(item.publishedAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more articles...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (refreshing) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No articles found</Text>
        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
      </View>
    );
  };

  const renderEndOfList = () => {
    if (hasMore || articles.length === 0) return null;

    return (
      <View style={styles.endOfList}>
        <Text style={styles.endOfListText}>You've reached the end</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={articles}
      renderItem={renderArticle}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        <>
          {renderFooter()}
          {renderEndOfList()}
        </>
      }
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={articles.length === 0 && styles.emptyListContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  articleCard: {
    padding: 16,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  articleSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 12,
    color: '#999',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  endOfList: {
    padding: 24,
    alignItems: 'center',
  },
  endOfListText: {
    color: '#999',
    fontSize: 14,
  },
});

export default CombinedScrollList;
```

## Performance Optimization

Performance is critical when dealing with long lists. Here are key optimizations:

```typescript
import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface OptimizedListProps {
  data: any[];
  onLoadMore: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ITEM_HEIGHT = 80;

const OptimizedList: React.FC<OptimizedListProps> = ({
  data,
  onLoadMore,
  onRefresh,
  refreshing,
}) => {
  // Memoize the item layout calculation for better scroll performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Memoize render function with React.memo for child component
  const MemoizedItem = React.memo(({ item }: { item: any }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  ));

  const renderItem = useCallback(
    ({ item }: { item: any }) => <MemoizedItem item={item} />,
    []
  );

  // Memoize empty component
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.empty}>
        <Text>No items</Text>
      </View>
    ),
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}

      // Refresh control
      refreshing={refreshing}
      onRefresh={onRefresh}

      // Infinite scroll
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}

      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={11}
      initialNumToRender={10}

      // Memory optimization
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}

      // Rendering optimizations
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: ITEM_HEIGHT,
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Additional Performance Tips

```typescript
// 1. Use FlashList for extremely long lists (from Shopify)
import { FlashList } from '@shopify/flash-list';

const HighPerformanceList = () => (
  <FlashList
    data={data}
    renderItem={renderItem}
    estimatedItemSize={80}
    onEndReached={loadMore}
    onEndReachedThreshold={0.5}
  />
);

// 2. Debounce scroll events for better performance
const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

// 3. Use InteractionManager for heavy operations
import { InteractionManager } from 'react-native';

const loadHeavyData = () => {
  InteractionManager.runAfterInteractions(() => {
    // Heavy data processing here
    // This ensures animations complete first
  });
};

// 4. Optimize images in list items
import FastImage from 'react-native-fast-image';

const OptimizedImageItem = ({ item }) => (
  <View style={styles.item}>
    <FastImage
      style={styles.image}
      source={{
        uri: item.imageUrl,
        priority: FastImage.priority.normal,
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
    <Text>{item.title}</Text>
  </View>
);
```

## Testing Scroll Behaviors

Testing scroll behaviors requires special consideration. Here's how to test both patterns:

```typescript
import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { FlatList } from 'react-native';

// Mock component for testing
const TestableScrollList = ({
  onRefresh,
  onEndReached,
}: {
  onRefresh: () => Promise<void>;
  onEndReached: () => void;
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [data, setData] = React.useState([
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <FlatList
      testID="scroll-list"
      data={data}
      renderItem={({ item }) => <Text testID={`item-${item.id}`}>{item.title}</Text>}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
};

describe('ScrollList', () => {
  it('should trigger refresh when pulled down', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <TestableScrollList onRefresh={mockRefresh} onEndReached={jest.fn()} />
    );

    const list = getByTestId('scroll-list');

    // Simulate refresh control activation
    const refreshControl = list.props.refreshControl;

    await act(async () => {
      refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('should trigger load more when scrolled to end', async () => {
    const mockLoadMore = jest.fn();
    const { getByTestId } = render(
      <TestableScrollList onRefresh={jest.fn()} onEndReached={mockLoadMore} />
    );

    const list = getByTestId('scroll-list');

    // Simulate scroll to end
    act(() => {
      list.props.onEndReached();
    });

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should not trigger multiple load more calls simultaneously', async () => {
    const mockLoadMore = jest.fn();
    const { getByTestId } = render(
      <TestableScrollList onRefresh={jest.fn()} onEndReached={mockLoadMore} />
    );

    const list = getByTestId('scroll-list');

    // Simulate multiple rapid scroll events
    act(() => {
      list.props.onEndReached();
      list.props.onEndReached();
      list.props.onEndReached();
    });

    // Due to guards, should only be called once
    // (This depends on your implementation)
  });

  it('should show loading indicator during refresh', async () => {
    let resolveRefresh: () => void;
    const mockRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const { getByTestId, queryByTestId } = render(
      <TestableScrollList onRefresh={mockRefresh} onEndReached={jest.fn()} />
    );

    const list = getByTestId('scroll-list');
    const refreshControl = list.props.refreshControl;

    // Start refresh
    act(() => {
      refreshControl.props.onRefresh();
    });

    // Check refreshing state
    expect(list.props.refreshing).toBe(true);

    // Complete refresh
    await act(async () => {
      resolveRefresh();
    });

    await waitFor(() => {
      expect(list.props.refreshing).toBe(false);
    });
  });
});

// Integration test example
describe('ScrollList Integration', () => {
  it('should load initial data and allow infinite scroll', async () => {
    const mockApi = {
      fetchPage: jest.fn((page: number) =>
        Promise.resolve(
          Array.from({ length: 10 }, (_, i) => ({
            id: `${page}-${i}`,
            title: `Item ${page}-${i}`,
          }))
        )
      ),
    };

    const { getByTestId, findAllByTestId } = render(
      <IntegrationTestList api={mockApi} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockApi.fetchPage).toHaveBeenCalledWith(1);
    });

    // Find all items
    const items = await findAllByTestId(/^item-/);
    expect(items).toHaveLength(10);

    // Trigger load more
    const list = getByTestId('scroll-list');
    act(() => {
      list.props.onEndReached();
    });

    // Wait for second page
    await waitFor(() => {
      expect(mockApi.fetchPage).toHaveBeenCalledWith(2);
    });

    // Should now have 20 items
    const updatedItems = await findAllByTestId(/^item-/);
    expect(updatedItems).toHaveLength(20);
  });
});
```

## Conclusion

Implementing pull-to-refresh and infinite scroll in React Native requires attention to several key areas:

1. **User Experience**: Provide clear visual feedback during loading states
2. **Error Handling**: Gracefully handle network failures and edge cases
3. **Performance**: Optimize rendering and memory usage for smooth scrolling
4. **Testing**: Thoroughly test scroll behaviors and edge cases

By following the patterns and best practices outlined in this guide, you can create robust, performant, and user-friendly scrolling experiences in your React Native applications.

### Key Takeaways

- Use `RefreshControl` for built-in pull-to-refresh support
- Configure `onEndReachedThreshold` appropriately for your content
- Implement guards to prevent duplicate load requests
- Handle empty, loading, and error states comprehensively
- Optimize performance with memoization and proper FlatList configuration
- Test scroll behaviors with appropriate testing strategies

### Further Reading

- [React Native FlatList Documentation](https://reactnative.dev/docs/flatlist)
- [Shopify FlashList](https://shopify.github.io/flash-list/)
- [React Native Performance Guide](https://reactnative.dev/docs/performance)

Happy coding!
