# How to Implement FlatList Optimization for Large Lists in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, FlatList, Performance, Lists, Optimization, Mobile Development

Description: Learn how to optimize FlatList performance in React Native for smooth scrolling with large datasets and complex list items.

---

Lists are the backbone of most mobile applications. Whether you're building a social media feed, an e-commerce product catalog, or a messaging app, efficiently rendering large lists is crucial for delivering a smooth user experience. React Native's FlatList component is purpose-built for this challenge, but using it effectively requires understanding its optimization features.

In this comprehensive guide, we'll explore every aspect of FlatList optimization, from basic configuration to advanced performance tuning techniques.

## FlatList vs ScrollView: Why It Matters

Before diving into optimization, let's understand why FlatList exists in the first place.

### The ScrollView Problem

```tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

// Anti-pattern: Don't do this with large datasets
const BadListExample = ({ items }: { items: Item[] }) => {
  return (
    <ScrollView>
      {items.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      ))}
    </ScrollView>
  );
};
```

ScrollView renders all its children at once. With 1,000 items, it creates 1,000 views immediately, consuming massive amounts of memory and causing significant frame drops during the initial render.

### The FlatList Solution

```tsx
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Item {
  id: string;
  title: string;
}

const GoodListExample = ({ items }: { items: Item[] }) => {
  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.item}>
      <Text>{item.title}</Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
```

FlatList only renders items currently visible on screen (plus a small buffer), dramatically reducing memory usage and improving performance.

### When to Use Each

| Use Case | Component |
|----------|-----------|
| Small, fixed lists (< 20 items) | ScrollView |
| Large or dynamic lists | FlatList |
| Horizontal scrolling galleries | FlatList (horizontal) |
| Complex nested scrolling | SectionList or nested FlatList |

## Understanding Virtualization

Virtualization is the core concept behind FlatList's performance. It works by maintaining a "window" of rendered items around the current scroll position.

### How Virtualization Works

```
┌─────────────────────────────────┐
│     Items Above Window          │  ← Not rendered (recycled)
│         (Memory freed)          │
├─────────────────────────────────┤
│     Buffer Zone (Above)         │  ← Rendered but off-screen
├─────────────────────────────────┤
│                                 │
│     Visible Viewport            │  ← Rendered and visible
│                                 │
├─────────────────────────────────┤
│     Buffer Zone (Below)         │  ← Rendered but off-screen
├─────────────────────────────────┤
│     Items Below Window          │  ← Not rendered (recycled)
│         (Memory freed)          │
└─────────────────────────────────┘
```

### The Virtualization Trade-off

Virtualization saves memory but introduces computational overhead:
- Items must be measured or pre-calculated
- Scroll position calculations become more complex
- Rapid scrolling can reveal blank areas before items render

Understanding this trade-off is key to proper optimization.

## getItemLayout: The Single Biggest Optimization

If your list items have consistent heights, `getItemLayout` is the most impactful optimization you can make.

### Why getItemLayout Matters

Without `getItemLayout`, FlatList must measure each item as it renders, which:
- Causes layout thrashing
- Makes scroll-to-index operations inaccurate
- Increases CPU usage during scrolling

### Implementing getItemLayout

```tsx
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Item {
  id: string;
  title: string;
}

const ITEM_HEIGHT = 72;

const OptimizedList = ({ items }: { items: Item[] }) => {
  const getItemLayout = (
    _data: Item[] | null | undefined,
    index: number
  ) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      getItemLayout={getItemLayout}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72, // Must match ITEM_HEIGHT exactly
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
  },
});
```

### Handling Items with Separators

When using `ItemSeparatorComponent`, include separator height in calculations:

```tsx
const ITEM_HEIGHT = 72;
const SEPARATOR_HEIGHT = 1;

const getItemLayout = (
  _data: Item[] | null | undefined,
  index: number
) => ({
  length: ITEM_HEIGHT,
  offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
  index,
});
```

### Variable Height Items

For variable heights, you have several options:

```tsx
// Option 1: Store heights in item data
interface ItemWithHeight {
  id: string;
  title: string;
  height: number;
}

const getItemLayoutVariable = (
  data: ItemWithHeight[] | null | undefined,
  index: number
) => {
  if (!data) {
    return { length: 0, offset: 0, index };
  }

  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += data[i].height;
  }

  return {
    length: data[index]?.height ?? 0,
    offset,
    index,
  };
};

// Option 2: Use a height estimation library like recyclerlistview
// Option 3: Accept the performance trade-off and skip getItemLayout
```

## keyExtractor: More Than Just a Warning Fix

The `keyExtractor` prop isn't just about silencing React warnings—it's crucial for performance.

### Why Keys Matter

React uses keys to:
- Track which items have changed
- Minimize re-renders when data updates
- Maintain component state across re-renders

### Best Practices for keyExtractor

```tsx
// Good: Unique, stable identifier from data
keyExtractor={(item) => item.id}

// Good: Composite key for nested structures
keyExtractor={(item) => `${item.categoryId}-${item.productId}`}

// Bad: Using array index (causes issues with reordering)
keyExtractor={(item, index) => index.toString()}

// Bad: Generating new keys on each render
keyExtractor={(item) => Math.random().toString()}

// Bad: Non-unique keys
keyExtractor={(item) => item.category} // Multiple items may share category
```

### Complete keyExtractor Example

```tsx
import React from 'react';
import { FlatList, View, Text } from 'react-native';

interface Product {
  sku: string;
  name: string;
  category: string;
}

const ProductList = ({ products }: { products: Product[] }) => {
  return (
    <FlatList
      data={products}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
        </View>
      )}
      keyExtractor={(item) => item.sku} // SKU is unique and stable
    />
  );
};
```

## windowSize and initialNumToRender: Controlling the Virtual Window

These props control how many items FlatList renders beyond the visible area.

### windowSize Explained

`windowSize` determines the total render window as a multiplier of the visible area:

```tsx
// windowSize = 21 (default)
// Renders 10 screens above + 1 visible screen + 10 screens below = 21 screens total

<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={21} // Default value
/>
```

### Tuning windowSize

```tsx
// Memory-constrained devices: Lower windowSize
<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={5} // 2 above + 1 visible + 2 below
/>

// Smooth scrolling priority: Higher windowSize
<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={41} // More buffer for fast scrolling
/>
```

### initialNumToRender

Controls how many items render on the initial mount:

```tsx
import React from 'react';
import { FlatList, View, Text, Dimensions } from 'react-native';

const ITEM_HEIGHT = 72;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Calculate optimal initial render count
const INITIAL_NUM_TO_RENDER = Math.ceil(SCREEN_HEIGHT / ITEM_HEIGHT) + 2;

const OptimizedInitialRender = ({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={{ height: ITEM_HEIGHT }}>
          <Text>{item.title}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      initialNumToRender={INITIAL_NUM_TO_RENDER}
    />
  );
};
```

### Finding the Right Balance

```tsx
interface OptimizationConfig {
  windowSize: number;
  initialNumToRender: number;
  description: string;
}

const configurations: Record<string, OptimizationConfig> = {
  lowEndDevice: {
    windowSize: 5,
    initialNumToRender: 5,
    description: 'Minimize memory usage',
  },
  balanced: {
    windowSize: 11,
    initialNumToRender: 10,
    description: 'Good balance for most cases',
  },
  smoothScrolling: {
    windowSize: 21,
    initialNumToRender: 15,
    description: 'Prioritize scroll smoothness',
  },
};
```

## maxToRenderPerBatch: Controlling Render Chunks

This prop determines how many items render per batch during scroll updates.

### Understanding Batch Rendering

```tsx
// Lower value: More responsive but potentially more blank areas
<FlatList
  data={items}
  renderItem={renderItem}
  maxToRenderPerBatch={2}
/>

// Higher value: Fewer blank areas but can cause frame drops
<FlatList
  data={items}
  renderItem={renderItem}
  maxToRenderPerBatch={10}
/>
```

### Combining with updateCellsBatchingPeriod

```tsx
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

const BatchOptimizedList = ({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50} // Milliseconds between batch renders
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
    justifyContent: 'center',
  },
});
```

### Adaptive Batch Configuration

```tsx
import { Platform } from 'react-native';

const getBatchConfig = () => {
  if (Platform.OS === 'android') {
    // Android often needs more conservative settings
    return {
      maxToRenderPerBatch: 3,
      updateCellsBatchingPeriod: 100,
    };
  }

  // iOS can typically handle more aggressive rendering
  return {
    maxToRenderPerBatch: 5,
    updateCellsBatchingPeriod: 50,
  };
};
```

## removeClippedSubviews: Memory Optimization

This prop detaches views that are outside the viewport from the native view hierarchy.

### When to Use removeClippedSubviews

```tsx
import React from 'react';
import { FlatList, View, Text, Platform, StyleSheet } from 'react-native';

const MemoryOptimizedList = ({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
  },
});
```

### Caveats and Considerations

```tsx
// removeClippedSubviews can cause issues with:
// - Items that overflow their bounds
// - Absolutely positioned elements
// - Animations that extend beyond item boundaries

// Safe to use when:
// - Items have fixed, predictable bounds
// - No animations extend beyond item containers
// - You're experiencing memory pressure on Android
```

## Item Separator Optimization

Separators seem simple but can impact performance with large lists.

### Efficient Separator Implementation

```tsx
import React, { memo } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

// Memoized separator component
const ItemSeparator = memo(() => (
  <View style={styles.separator} />
));

ItemSeparator.displayName = 'ItemSeparator';

const ListWithSeparators = ({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={ItemSeparator}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
});
```

### Dynamic Separators with Highlight

```tsx
import React, { memo, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface SeparatorProps {
  highlighted: boolean;
}

const DynamicSeparator = memo(({ highlighted }: SeparatorProps) => (
  <View
    style={[
      styles.separator,
      highlighted && styles.separatorHighlighted,
    ]}
  />
));

DynamicSeparator.displayName = 'DynamicSeparator';

const ListWithDynamicSeparators = ({ items }: { items: Item[] }) => {
  const renderSeparator = useCallback(
    ({ highlighted }: { highlighted: boolean }) => (
      <DynamicSeparator highlighted={highlighted} />
    ),
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={renderSeparator}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  separatorHighlighted: {
    backgroundColor: '#007AFF',
  },
});
```

## Memoizing renderItem: Preventing Unnecessary Re-renders

Proper memoization is critical for list performance.

### The Problem with Inline renderItem

```tsx
// Anti-pattern: Creates new function on every render
const BadList = ({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <ItemComponent item={item} />}
      keyExtractor={(item) => item.id}
    />
  );
};
```

### Proper Memoization Pattern

```tsx
import React, { memo, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, Pressable } from 'react-native';

interface Item {
  id: string;
  title: string;
  subtitle: string;
}

interface ItemProps {
  item: Item;
  onPress: (id: string) => void;
}

// Memoized item component
const ListItem = memo(({ item, onPress }: ItemProps) => {
  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </Pressable>
  );
});

ListItem.displayName = 'ListItem';

// Main list component
const OptimizedList = ({ items }: { items: Item[] }) => {
  const handleItemPress = useCallback((id: string) => {
    console.log('Item pressed:', id);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ListItem item={item} onPress={handleItemPress} />
    ),
    [handleItemPress]
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
```

### Custom Comparison for Complex Items

```tsx
import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ComplexItem {
  id: string;
  title: string;
  imageUrl: string;
  metadata: {
    views: number;
    likes: number;
  };
}

interface ComplexItemProps {
  item: ComplexItem;
}

const ComplexListItem = memo(
  ({ item }: ComplexItemProps) => (
    <View style={styles.item}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.metadata.views} views | {item.metadata.likes} likes
        </Text>
      </View>
    </View>
  ),
  // Custom comparison: only re-render if these specific props change
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.imageUrl === nextProps.item.imageUrl &&
      prevProps.item.metadata.likes === nextProps.item.metadata.likes
      // Note: we intentionally skip views comparison for performance
    );
  }
);

ComplexListItem.displayName = 'ComplexListItem';

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
```

## Image Loading in Lists: A Critical Performance Factor

Images are often the biggest performance bottleneck in lists.

### Basic Image Optimization

```tsx
import React, { memo, useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface ImageItem {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
}

interface ImageListItemProps {
  item: ImageItem;
}

const ImageListItem = memo(({ item }: ImageListItemProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return (
    <View style={styles.item}>
      <View style={styles.imageContainer}>
        {loading && (
          <ActivityIndicator style={styles.loader} color="#007AFF" />
        )}
        {error ? (
          <View style={styles.errorPlaceholder}>
            <Text style={styles.errorText}>Failed to load</Text>
          </View>
        ) : (
          <Image
            source={{ uri: item.thumbnailUrl }} // Use thumbnail for lists
            style={styles.image}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            resizeMode="cover"
          />
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );
});

ImageListItem.displayName = 'ImageListItem';

const styles = StyleSheet.create({
  item: {
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#999',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});
```

### Using FastImage for Better Performance

```tsx
// Install: npm install react-native-fast-image
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';

interface ImageItem {
  id: string;
  title: string;
  imageUrl: string;
}

interface FastImageListItemProps {
  item: ImageItem;
}

const FastImageListItem = memo(({ item }: FastImageListItemProps) => (
  <View style={styles.item}>
    <FastImage
      style={styles.image}
      source={{
        uri: item.imageUrl,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
    <Text style={styles.title}>{item.title}</Text>
  </View>
));

FastImageListItem.displayName = 'FastImageListItem';

// Preload images for smoother scrolling
const preloadImages = (items: ImageItem[]) => {
  const uris = items.map((item) => ({
    uri: item.imageUrl,
    priority: FastImage.priority.high,
  }));
  FastImage.preload(uris);
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});
```

## Pagination and Infinite Scroll

Proper pagination prevents loading thousands of items at once.

### Basic Infinite Scroll Implementation

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface Item {
  id: string;
  title: string;
}

interface ApiResponse {
  items: Item[];
  hasMore: boolean;
  nextPage: number;
}

const fetchItems = async (page: number): Promise<ApiResponse> => {
  // Simulated API call
  const response = await fetch(`/api/items?page=${page}&limit=20`);
  return response.json();
};

const InfiniteScrollList = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadItems = useCallback(async (pageNum: number, refresh = false) => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetchItems(pageNum);

      if (refresh) {
        setItems(response.items);
      } else {
        setItems((prev) => [...prev, ...response.items]);
      }

      setHasMore(response.hasMore);
      setPage(response.nextPage);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    loadItems(1, true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems(1, true);
  }, [loadItems]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      loadItems(page);
    }
  }, [hasMore, loading, page, loadItems]);

  const renderFooter = useCallback(() => {
    if (!loading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }, [loading]);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <View style={styles.item}>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    ),
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default InfiniteScrollList;
```

### Optimized Pagination with Cursor-based Loading

```tsx
import React, { useState, useCallback, useRef } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Item {
  id: string;
  title: string;
}

interface CursorPaginatedListProps {
  fetchItems: (cursor?: string) => Promise<{
    items: Item[];
    nextCursor: string | null;
  }>;
}

const CursorPaginatedList = ({ fetchItems }: CursorPaginatedListProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreRef.current) return;

    setLoading(true);

    try {
      const response = await fetchItems(cursorRef.current ?? undefined);

      setItems((prev) => [...prev, ...response.items]);
      cursorRef.current = response.nextCursor;
      hasMoreRef.current = response.nextCursor !== null;
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchItems, loading]);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <View style={styles.item}>
        <Text>{item.title}</Text>
      </View>
    ),
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
    justifyContent: 'center',
  },
});

export default CursorPaginatedList;
```

## Debugging FlatList Performance

Identifying performance issues is the first step to fixing them.

### Using the React Native Performance Monitor

```tsx
import React, { useCallback, useRef } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Item {
  id: string;
  title: string;
}

const DebuggedList = ({ items }: { items: Item[] }) => {
  const renderCountRef = useRef(0);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: {
      viewableItems: Array<{ item: Item; index: number | null }>;
      changed: Array<{ item: Item; index: number | null }>;
    }) => {
      console.log('Viewable items:', viewableItems.length);
      console.log('Changed items:', changed.length);
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => {
      renderCountRef.current += 1;
      console.log(`Rendering item ${index}, total renders: ${renderCountRef.current}`);

      return (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      );
    },
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
  },
});

export default DebuggedList;
```

### Creating a Performance Wrapper

```tsx
import React, { memo, useEffect, useRef, PropsWithChildren } from 'react';
import { View } from 'react-native';

interface PerformanceWrapperProps {
  itemId: string;
  onRender?: (id: string, duration: number) => void;
}

const PerformanceWrapper = memo(({
  itemId,
  onRender,
  children,
}: PropsWithChildren<PerformanceWrapperProps>) => {
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTimeRef.current;
    onRender?.(itemId, duration);

    if (duration > 16) {
      console.warn(`Slow render for item ${itemId}: ${duration.toFixed(2)}ms`);
    }
  }, [itemId, onRender]);

  return <View>{children}</View>;
});

PerformanceWrapper.displayName = 'PerformanceWrapper';

export default PerformanceWrapper;
```

### Comprehensive Performance Logging

```tsx
import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Item {
  id: string;
  title: string;
}

interface PerformanceMetrics {
  scrollEvents: number;
  renderCalls: number;
  averageRenderTime: number;
}

const usePerformanceTracking = () => {
  const metrics = useMemo<PerformanceMetrics>(
    () => ({
      scrollEvents: 0,
      renderCalls: 0,
      averageRenderTime: 0,
    }),
    []
  );

  const trackRender = useCallback((duration: number) => {
    metrics.renderCalls += 1;
    metrics.averageRenderTime =
      (metrics.averageRenderTime * (metrics.renderCalls - 1) + duration) /
      metrics.renderCalls;
  }, [metrics]);

  const trackScroll = useCallback(() => {
    metrics.scrollEvents += 1;
  }, [metrics]);

  const logMetrics = useCallback(() => {
    console.log('Performance Metrics:', {
      ...metrics,
      averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
    });
  }, [metrics]);

  return { trackRender, trackScroll, logMetrics };
};

const PerformanceTrackedList = ({ items }: { items: Item[] }) => {
  const { trackRender, trackScroll, logMetrics } = usePerformanceTracking();

  const handleScroll = useCallback(() => {
    trackScroll();
  }, [trackScroll]);

  const handleScrollEnd = useCallback(() => {
    logMetrics();
  }, [logMetrics]);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      const start = performance.now();

      const element = (
        <View style={styles.item}>
          <Text>{item.title}</Text>
        </View>
      );

      trackRender(performance.now() - start);
      return element;
    },
    [trackRender]
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onScroll={handleScroll}
      onMomentumScrollEnd={handleScrollEnd}
      scrollEventThrottle={16}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    height: 72,
    padding: 16,
  },
});

export default PerformanceTrackedList;
```

## Complete Optimized FlatList Example

Here's a production-ready implementation combining all optimization techniques:

```tsx
import React, { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

// Types
interface ListItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface OptimizedFlatListProps {
  items: ListItem[];
  onItemPress: (item: ListItem) => void;
  onEndReached: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

// Constants
const ITEM_HEIGHT = 80;
const SEPARATOR_HEIGHT = 1;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const INITIAL_NUM = Math.ceil(SCREEN_HEIGHT / ITEM_HEIGHT) + 5;

// Memoized Item Component
interface ListItemComponentProps {
  item: ListItem;
  onPress: (item: ListItem) => void;
}

const ListItemComponent = memo(
  ({ item, onPress }: ListItemComponentProps) => {
    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    return (
      <Pressable onPress={handlePress} style={styles.itemContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
      </Pressable>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item.id === nextProps.item.id &&
    prevProps.onPress === nextProps.onPress
);

ListItemComponent.displayName = 'ListItemComponent';

// Memoized Separator
const ItemSeparator = memo(() => <View style={styles.separator} />);
ItemSeparator.displayName = 'ItemSeparator';

// Loading Footer
interface LoadingFooterProps {
  isLoading: boolean;
  hasMore: boolean;
}

const LoadingFooter = memo(({ isLoading, hasMore }: LoadingFooterProps) => {
  if (!isLoading || !hasMore) return null;

  return (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color="#007AFF" />
    </View>
  );
});

LoadingFooter.displayName = 'LoadingFooter';

// Main Component
const OptimizedFlatList = ({
  items,
  onItemPress,
  onEndReached,
  isLoading,
  hasMore,
}: OptimizedFlatListProps) => {
  // Memoized getItemLayout
  const getItemLayout = useCallback(
    (_data: ListItem[] | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
      index,
    }),
    []
  );

  // Memoized keyExtractor
  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  // Memoized renderItem
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <ListItemComponent item={item} onPress={onItemPress} />
    ),
    [onItemPress]
  );

  // Memoized footer
  const renderFooter = useCallback(
    () => <LoadingFooter isLoading={isLoading} hasMore={hasMore} />,
    [isLoading, hasMore]
  );

  // Memoized configuration
  const config = useMemo(
    () => ({
      windowSize: Platform.OS === 'android' ? 11 : 21,
      maxToRenderPerBatch: Platform.OS === 'android' ? 3 : 5,
      updateCellsBatchingPeriod: Platform.OS === 'android' ? 100 : 50,
      removeClippedSubviews: Platform.OS === 'android',
    }),
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ItemSeparatorComponent={ItemSeparator}
      ListFooterComponent={renderFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      initialNumToRender={INITIAL_NUM}
      windowSize={config.windowSize}
      maxToRenderPerBatch={config.maxToRenderPerBatch}
      updateCellsBatchingPeriod={config.updateCellsBatchingPeriod}
      removeClippedSubviews={config.removeClippedSubviews}
      showsVerticalScrollIndicator={true}
      bounces={true}
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  separator: {
    height: SEPARATOR_HEIGHT,
    backgroundColor: '#eee',
    marginLeft: 84, // Aligned with text content
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default OptimizedFlatList;
```

## Performance Checklist

Before shipping your FlatList implementation, verify:

- [ ] Using `keyExtractor` with unique, stable keys
- [ ] Implementing `getItemLayout` for fixed-height items
- [ ] Memoizing `renderItem` with `useCallback`
- [ ] Wrapping item components with `React.memo`
- [ ] Setting appropriate `windowSize` for your use case
- [ ] Configuring `initialNumToRender` based on screen size
- [ ] Tuning `maxToRenderPerBatch` for your device targets
- [ ] Using `removeClippedSubviews` on Android when appropriate
- [ ] Optimizing images with thumbnails and lazy loading
- [ ] Implementing proper pagination for large datasets
- [ ] Testing on low-end devices

## Conclusion

FlatList optimization is not about applying every technique available—it's about understanding your specific use case and applying the right optimizations. Start with the basics: proper keys, memoization, and `getItemLayout`. Then profile your app on real devices to identify bottlenecks and apply targeted optimizations.

Remember that performance optimization is iterative. What works for a simple list might not work for a complex one. Always measure before and after applying optimizations, and test on the lowest-spec devices your app supports.

By following the patterns and techniques outlined in this guide, you'll be well-equipped to build smooth, responsive lists that delight your users regardless of data size.
