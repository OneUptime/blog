# How to Implement Skeleton Loading Screens in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Skeleton Loading, UX, Performance, Mobile Development, Loading States

Description: Learn how to implement skeleton loading screens in React Native for better perceived performance and user experience.

---

Loading states are one of the most overlooked aspects of mobile app development, yet they have a profound impact on how users perceive your application. A blank screen with a spinner tells users nothing about what is coming. A skeleton screen, on the other hand, sets expectations, reduces perceived wait time, and creates a smoother transition to content.

In this comprehensive guide, we will explore how to implement skeleton loading screens in React Native, from basic concepts to advanced techniques that will make your app feel faster and more polished.

## Why Use Skeleton Loading

Skeleton screens are placeholder UI components that mimic the structure of the actual content while data is being fetched. They consist of simple shapes (rectangles, circles) that represent where text, images, and other elements will appear.

### The Psychology Behind Skeleton Screens

Research consistently shows that skeleton screens reduce perceived loading time compared to traditional spinners:

1. **Progressive disclosure**: Users see a preview of the interface structure, which mentally prepares them for the incoming content.

2. **Reduced anxiety**: A blank screen creates uncertainty. Skeletons reassure users that content is on its way.

3. **Faster perceived performance**: Studies by Facebook and others have shown that users perceive skeleton-loaded content as loading up to 50% faster than spinner-loaded content, even when actual load times are identical.

4. **Engagement retention**: Users are less likely to abandon a page that shows progress through skeletons.

```typescript
// The difference in user perception
// Bad: Blank screen -> Spinner -> Content
// Good: Skeleton -> Content (smooth transition)
```

## Skeleton vs Spinner Comparison

Understanding when to use each approach is crucial for optimal UX.

### When to Use Spinners

```typescript
// Spinners work well for:
// - Very short operations (under 300ms)
// - Actions where content structure is unknown
// - Modal operations (submit, delete, etc.)
// - Indeterminate progress scenarios

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const SpinnerExample: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### When to Use Skeletons

```typescript
// Skeletons excel at:
// - Content-heavy screens (feeds, lists, profiles)
// - Known content structure
// - Initial page loads
// - Network-dependent data fetching

// Skeleton screens provide:
// - Visual continuity
// - Perceived performance boost
// - Better user engagement during loading
```

### Comparison Table

| Aspect | Spinner | Skeleton |
|--------|---------|----------|
| Perceived Speed | Slower | Faster |
| User Engagement | Lower | Higher |
| Implementation Complexity | Simple | Moderate |
| Best For | Short waits | Content loading |
| Layout Shift | Significant | Minimal |

## Building Custom Skeletons

Let us start by building skeleton components from scratch. This gives you complete control over appearance and behavior.

### Basic Skeleton Component

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
});

export default Skeleton;
```

### Circle Skeleton for Avatars

```typescript
import React from 'react';
import { ViewStyle } from 'react-native';
import Skeleton from './Skeleton';

interface CircleSkeletonProps {
  size?: number;
  style?: ViewStyle;
}

const CircleSkeleton: React.FC<CircleSkeletonProps> = ({
  size = 50,
  style,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
};

export default CircleSkeleton;
```

### Text Line Skeleton

```typescript
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Skeleton from './Skeleton';

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: string;
  lineHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}

const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = 16,
  spacing = 8,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
};

export default TextSkeleton;
```

## Using Skeleton Libraries

While custom implementations offer flexibility, libraries provide battle-tested solutions with advanced features.

### react-native-skeleton-placeholder

This is one of the most popular skeleton libraries for React Native.

```bash
npm install react-native-skeleton-placeholder
# or
yarn add react-native-skeleton-placeholder
```

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const ProfileSkeleton: React.FC = () => {
  return (
    <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
        <SkeletonPlaceholder.Item
          width={60}
          height={60}
          borderRadius={30}
        />
        <SkeletonPlaceholder.Item marginLeft={20}>
          <SkeletonPlaceholder.Item width={120} height={20} />
          <SkeletonPlaceholder.Item
            marginTop={6}
            width={80}
            height={20}
          />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );
};

export default ProfileSkeleton;
```

### react-native-skeleton-content

Another excellent option with shimmer effects built-in.

```bash
npm install react-native-skeleton-content
```

```typescript
import React from 'react';
import SkeletonContent from 'react-native-skeleton-content';

const CardSkeleton: React.FC = () => {
  return (
    <SkeletonContent
      containerStyle={{ flex: 1, width: '100%' }}
      isLoading={true}
      layout={[
        { key: 'image', width: '100%', height: 200, marginBottom: 10 },
        { key: 'title', width: '70%', height: 20, marginBottom: 6 },
        { key: 'subtitle', width: '90%', height: 16, marginBottom: 6 },
        { key: 'description', width: '40%', height: 16 },
      ]}
    />
  );
};

export default CardSkeleton;
```

### Choosing Between Libraries

| Feature | skeleton-placeholder | skeleton-content |
|---------|---------------------|------------------|
| Shimmer Animation | Yes | Yes |
| Custom Layouts | Component-based | Array-based |
| Performance | Excellent | Good |
| Customization | High | Moderate |
| Bundle Size | Small | Small |

## Shimmer Animation Effect

The shimmer effect creates a wave of light that sweeps across skeleton elements, giving users visual feedback that loading is in progress.

### Custom Shimmer Implementation

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const translateX = useRef(new Animated.Value(-screenWidth)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [translateX]);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.5)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E1E9EE',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    flex: 1,
    width: screenWidth,
  },
});

export default ShimmerSkeleton;
```

### Shimmer Without External Dependencies

If you want to avoid LinearGradient dependency, use opacity-based shimmer.

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface PulseSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  baseColor?: string;
  highlightColor?: string;
}

const PulseSkeleton: React.FC<PulseSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  baseColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, highlightColor],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

export default PulseSkeleton;
```

## Matching Content Layout

The key to effective skeleton screens is accurately representing the final content structure.

### Profile Card Example

```typescript
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import CircleSkeleton from './CircleSkeleton';
import TextSkeleton from './TextSkeleton';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

interface ProfileCardProps {
  user: User | null;
  isLoading: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <CircleSkeleton size={80} />
          <View style={styles.headerInfo}>
            <Skeleton width={150} height={24} style={styles.mb8} />
            <Skeleton width={200} height={16} />
          </View>
        </View>
        <View style={styles.body}>
          <TextSkeleton lines={4} lineHeight={14} spacing={6} />
        </View>
        <View style={styles.footer}>
          <Skeleton width={100} height={36} borderRadius={18} />
          <Skeleton
            width={100}
            height={36}
            borderRadius={18}
            style={styles.ml12}
          />
        </View>
      </View>
    );
  }

  if (!user) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.bio}>{user.bio}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Follow</Text>
        </View>
        <View style={[styles.button, styles.ml12]}>
          <Text style={styles.buttonText}>Message</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  email: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  body: {
    marginTop: 16,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mb8: {
    marginBottom: 8,
  },
  ml12: {
    marginLeft: 12,
  },
});

export default ProfileCard;
```

## Responsive Skeleton Sizing

Skeletons should adapt to different screen sizes and orientations.

### Dynamic Width Calculation

```typescript
import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import Skeleton from './Skeleton';

const ResponsiveSkeleton: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate responsive sizes
  const cardWidth = Math.min(screenWidth - 32, 400);
  const avatarSize = screenWidth < 375 ? 50 : 70;
  const titleWidth = cardWidth * 0.6;
  const subtitleWidth = cardWidth * 0.4;

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      <Skeleton
        width={avatarSize}
        height={avatarSize}
        borderRadius={avatarSize / 2}
      />
      <View style={styles.content}>
        <Skeleton width={titleWidth} height={20} />
        <Skeleton
          width={subtitleWidth}
          height={16}
          style={styles.subtitle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  subtitle: {
    marginTop: 8,
  },
});

export default ResponsiveSkeleton;
```

### Percentage-Based Sizing

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const PercentageSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Full width skeleton */}
      <Skeleton width="100%" height={200} style={styles.mb16} />

      {/* Three-quarters width */}
      <Skeleton width="75%" height={24} style={styles.mb8} />

      {/* Half width */}
      <Skeleton width="50%" height={16} style={styles.mb8} />

      {/* Variable widths for paragraph effect */}
      <Skeleton width="95%" height={14} style={styles.mb4} />
      <Skeleton width="100%" height={14} style={styles.mb4} />
      <Skeleton width="88%" height={14} style={styles.mb4} />
      <Skeleton width="65%" height={14} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },
});

export default PercentageSkeleton;
```

## Skeleton for Lists

Lists are common candidates for skeleton loading. Here is how to implement them effectively.

### FlatList with Skeleton Items

```typescript
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, Image, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  thumbnail: string;
  author: string;
}

const SKELETON_COUNT = 5;

const PostListSkeleton: React.FC = () => {
  return (
    <View style={styles.skeletonItem}>
      <Skeleton width={80} height={80} borderRadius={8} />
      <View style={styles.skeletonContent}>
        <Skeleton width="80%" height={18} style={styles.mb6} />
        <Skeleton width="100%" height={14} style={styles.mb4} />
        <Skeleton width="60%" height={14} style={styles.mb8} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
};

const PostItem: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <View style={styles.item}>
      <Image source={{ uri: post.thumbnail }} style={styles.thumbnail} />
      <View style={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {post.excerpt}
        </Text>
        <Text style={styles.author}>By {post.author}</Text>
      </View>
    </View>
  );
};

const PostList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const data = await fetch('/api/posts').then(res => res.json());
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <FlatList
        data={Array(SKELETON_COUNT).fill(null)}
        renderItem={() => <PostListSkeleton />}
        keyExtractor={(_, index) => `skeleton-${index}`}
        contentContainerStyle={styles.list}
      />
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostItem post={item} />}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  skeletonItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  excerpt: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  author: {
    fontSize: 12,
    color: '#999999',
  },
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
});

export default PostList;
```

### Infinite Scroll with Skeleton Footer

```typescript
import React, { useState, useCallback } from 'react';
import { FlatList, View, ActivityIndicator, StyleSheet } from 'react-native';

interface InfiniteListProps<T> {
  fetchData: (page: number) => Promise<T[]>;
  renderItem: (item: T) => React.ReactElement;
  renderSkeleton: () => React.ReactElement;
  keyExtractor: (item: T) => string;
  initialSkeletonCount?: number;
}

function InfiniteList<T>({
  fetchData,
  renderItem,
  renderSkeleton,
  keyExtractor,
  initialSkeletonCount = 5,
}: InfiniteListProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      const items = await fetchData(1);
      setData(items);
      setHasMore(items.length > 0);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const items = await fetchData(nextPage);
      if (items.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...items]);
        setPage(nextPage);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchData, page, isLoadingMore, hasMore]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (isInitialLoading) {
    return (
      <FlatList
        data={Array(initialSkeletonCount).fill(null)}
        renderItem={renderSkeleton}
        keyExtractor={(_, index) => `skeleton-${index}`}
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => renderItem(item)}
      keyExtractor={keyExtractor}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    alignItems: 'center',
  },
});

export default InfiniteList;
```

## Skeleton for Images

Image loading deserves special attention since images are often the slowest elements to load.

### Progressive Image Loading

```typescript
import React, { useState } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import Skeleton from './Skeleton';

interface ProgressiveImageProps {
  source: ImageSourcePropType;
  width: number;
  height: number;
  borderRadius?: number;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  width,
  height,
  borderRadius = 0,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const imageOpacity = new Animated.Value(0);

  const handleImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoading(false);
    });
  };

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      {isLoading && (
        <Skeleton
          width={width}
          height={height}
          borderRadius={borderRadius}
          style={styles.skeleton}
        />
      )}
      <Animated.Image
        source={source}
        style={[
          styles.image,
          {
            width,
            height,
            borderRadius,
            opacity: imageOpacity,
          },
        ]}
        onLoad={handleImageLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  skeleton: {
    position: 'absolute',
  },
  image: {
    position: 'absolute',
  },
});

export default ProgressiveImage;
```

### Image Gallery Skeleton

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import ProgressiveImage from './ProgressiveImage';

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 4;
const IMAGE_SIZE = (screenWidth - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

interface GalleryImage {
  id: string;
  url: string;
}

const GallerySkeleton: React.FC = () => {
  const items = Array(12).fill(null);

  return (
    <View style={styles.grid}>
      {items.map((_, index) => (
        <View key={index} style={styles.imageWrapper}>
          <Skeleton
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            borderRadius={4}
          />
        </View>
      ))}
    </View>
  );
};

const ImageGallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Fetch images from API
      const data = await fetch('/api/gallery').then(res => res.json());
      setImages(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <GallerySkeleton />;
  }

  return (
    <FlatList
      data={images}
      numColumns={COLUMN_COUNT}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.imageWrapper}>
          <ProgressiveImage
            source={{ uri: item.url }}
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            borderRadius={4}
          />
        </View>
      )}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING,
  },
  imageWrapper: {
    margin: SPACING / 2,
  },
});

export default ImageGallery;
```

## Transitioning to Content

Smooth transitions from skeleton to content prevent jarring UI changes.

### Fade Transition Component

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

interface FadeTransitionProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
}

const FadeTransition: React.FC<FadeTransitionProps> = ({
  isLoading,
  skeleton,
  children,
  duration = 300,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(isLoading ? 1 : 0)).current;
  const contentFadeAnim = useRef(new Animated.Value(isLoading ? 0 : 1)).current;

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, contentFadeAnim, duration]);

  return (
    <View style={style}>
      {isLoading ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          {skeleton}
        </Animated.View>
      ) : (
        <Animated.View style={{ opacity: contentFadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
};

export default FadeTransition;
```

### Usage with Data Fetching

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FadeTransition from './FadeTransition';
import Skeleton from './Skeleton';

interface Article {
  id: string;
  title: string;
  content: string;
}

const ArticleSkeleton: React.FC = () => (
  <View>
    <Skeleton width="80%" height={28} style={styles.mb12} />
    <Skeleton width="100%" height={16} style={styles.mb8} />
    <Skeleton width="100%" height={16} style={styles.mb8} />
    <Skeleton width="100%" height={16} style={styles.mb8} />
    <Skeleton width="65%" height={16} />
  </View>
);

const ArticleView: React.FC<{ articleId: string }> = ({ articleId }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`);
      const data = await response.json();
      setArticle(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FadeTransition
        isLoading={isLoading}
        skeleton={<ArticleSkeleton />}
        duration={400}
      >
        {article && (
          <>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.content}>{article.content}</Text>
          </>
        )}
      </FadeTransition>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
});

export default ArticleView;
```

## Accessibility Considerations

Skeleton screens must be accessible to all users, including those using screen readers.

### Accessible Skeleton Component

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  AccessibilityInfo,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface AccessibleSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const AccessibleSkeleton: React.FC<AccessibleSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  accessibilityLabel = 'Loading content',
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // No animation for users who prefer reduced motion
      opacity.setValue(0.6);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
});

export default AccessibleSkeleton;
```

### Screen Reader Announcements

```typescript
import React, { useEffect } from 'react';
import { View, AccessibilityInfo, StyleSheet } from 'react-native';

interface LoadingContainerProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
  children: React.ReactNode;
}

const LoadingContainer: React.FC<LoadingContainerProps> = ({
  isLoading,
  loadingMessage = 'Loading content, please wait',
  loadedMessage = 'Content loaded',
  children,
}) => {
  useEffect(() => {
    if (isLoading) {
      AccessibilityInfo.announceForAccessibility(loadingMessage);
    } else {
      AccessibilityInfo.announceForAccessibility(loadedMessage);
    }
  }, [isLoading, loadingMessage, loadedMessage]);

  return (
    <View
      accessible={isLoading}
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LoadingContainer;
```

### Focus Management

```typescript
import React, { useRef, useEffect } from 'react';
import { View, Text, findNodeHandle, AccessibilityInfo } from 'react-native';

interface ContentWithFocusProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

const ContentWithFocus: React.FC<ContentWithFocusProps> = ({
  isLoading,
  skeleton,
  children,
}) => {
  const contentRef = useRef<View>(null);

  useEffect(() => {
    if (!isLoading && contentRef.current) {
      // Move focus to content when loading completes
      const node = findNodeHandle(contentRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return <>{skeleton}</>;
  }

  return (
    <View ref={contentRef} accessible={true}>
      {children}
    </View>
  );
};

export default ContentWithFocus;
```

## Performance Optimization

Skeleton screens should be lightweight to avoid adding to perceived load time.

### Memoized Skeleton Components

```typescript
import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

interface SkeletonConfig {
  width: number | string;
  height: number;
  borderRadius?: number;
  marginBottom?: number;
}

interface MemoizedSkeletonGroupProps {
  config: SkeletonConfig[];
}

const SkeletonItem = memo<SkeletonConfig>(({
  width,
  height,
  borderRadius = 4,
  marginBottom = 0
}) => (
  <Skeleton
    width={width}
    height={height}
    borderRadius={borderRadius}
    style={{ marginBottom }}
  />
));

const MemoizedSkeletonGroup: React.FC<MemoizedSkeletonGroupProps> = memo(
  ({ config }) => {
    const skeletons = useMemo(
      () =>
        config.map((item, index) => (
          <SkeletonItem key={index} {...item} />
        )),
      [config]
    );

    return <View>{skeletons}</View>;
  }
);

// Usage
const PostSkeleton: React.FC = () => {
  const config: SkeletonConfig[] = useMemo(
    () => [
      { width: '100%', height: 200, marginBottom: 12 },
      { width: '70%', height: 24, marginBottom: 8 },
      { width: '90%', height: 16, marginBottom: 6 },
      { width: '80%', height: 16 },
    ],
    []
  );

  return <MemoizedSkeletonGroup config={config} />;
};

export default MemoizedSkeletonGroup;
```

### Lazy Skeleton Rendering

```typescript
import React, { useState, useEffect } from 'react';
import { View, InteractionManager, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

interface LazySkeletonProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
}

const LazySkeleton: React.FC<LazySkeletonProps> = ({
  children,
  placeholder,
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for interactions to complete before rendering skeleton animations
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });

    return () => handle.cancel();
  }, []);

  if (!isReady) {
    return (
      placeholder || (
        <View style={styles.placeholder}>
          <Skeleton width="100%" height={20} />
        </View>
      )
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  placeholder: {
    padding: 16,
  },
});

export default LazySkeleton;
```

### Batched Skeleton Animation

```typescript
import React, { useEffect, useRef, createContext, useContext } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

// Shared animation context to synchronize all skeletons
const SkeletonAnimationContext = createContext<Animated.Value | null>(null);

export const SkeletonAnimationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <SkeletonAnimationContext.Provider value={opacity}>
      {children}
    </SkeletonAnimationContext.Provider>
  );
};

interface SyncedSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SyncedSkeleton: React.FC<SyncedSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const sharedOpacity = useContext(SkeletonAnimationContext);

  if (!sharedOpacity) {
    console.warn('SyncedSkeleton must be used within SkeletonAnimationProvider');
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: sharedOpacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
});

export { SyncedSkeleton };
```

### Performance Best Practices Summary

```typescript
// 1. Use useNativeDriver for animations
Animated.timing(value, {
  toValue: 1,
  duration: 500,
  useNativeDriver: true, // Always use native driver when possible
});

// 2. Memoize skeleton configurations
const skeletonConfig = useMemo(() => [...], []);

// 3. Limit skeleton count
const SKELETON_COUNT = 5; // Don't render 50 skeleton items

// 4. Use shared animation values
// Multiple skeletons share one Animated.Value

// 5. Avoid layout thrashing
// Match skeleton dimensions exactly to content

// 6. Use InteractionManager for complex skeletons
InteractionManager.runAfterInteractions(() => {
  // Render animated skeletons
});

// 7. Profile with React DevTools
// Ensure skeleton renders don't cause unnecessary re-renders
```

## Complete Example: News Feed with Skeletons

Let us put everything together in a complete, production-ready example.

```typescript
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import {
  SkeletonAnimationProvider,
  SyncedSkeleton,
} from './SyncedSkeleton';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  author: string;
  publishedAt: string;
}

// Memoized skeleton component
const NewsItemSkeleton = memo(() => (
  <View style={styles.card}>
    <SyncedSkeleton
      width="100%"
      height={180}
      borderRadius={8}
      style={styles.imageSkeleton}
    />
    <View style={styles.cardContent}>
      <SyncedSkeleton width="85%" height={22} style={styles.mb8} />
      <SyncedSkeleton width="100%" height={14} style={styles.mb4} />
      <SyncedSkeleton width="100%" height={14} style={styles.mb4} />
      <SyncedSkeleton width="70%" height={14} style={styles.mb12} />
      <View style={styles.meta}>
        <SyncedSkeleton width={80} height={12} />
        <SyncedSkeleton width={60} height={12} />
      </View>
    </View>
  </View>
));

// Memoized news item component
const NewsItem = memo<{ article: NewsArticle }>(({ article }) => (
  <View style={styles.card}>
    <Image
      source={{ uri: article.imageUrl }}
      style={styles.image}
      accessibilityLabel={`Image for ${article.title}`}
    />
    <View style={styles.cardContent}>
      <Text style={styles.title} numberOfLines={2}>
        {article.title}
      </Text>
      <Text style={styles.summary} numberOfLines={3}>
        {article.summary}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.author}>{article.author}</Text>
        <Text style={styles.date}>{article.publishedAt}</Text>
      </View>
    </View>
  </View>
));

const SKELETON_COUNT = 4;

const NewsFeed: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNews = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await fetch('/api/news');
      const data = await response.json();
      setArticles(data);

      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility(
        `Loaded ${data.length} news articles`
      );
    } catch (error) {
      console.error('Failed to fetch news:', error);
      AccessibilityInfo.announceForAccessibility(
        'Failed to load news articles'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  const renderItem = useCallback(
    ({ item }: { item: NewsArticle }) => <NewsItem article={item} />,
    []
  );

  const renderSkeleton = useCallback(
    () => <NewsItemSkeleton />,
    []
  );

  const keyExtractor = useCallback(
    (item: NewsArticle) => item.id,
    []
  );

  if (isLoading) {
    return (
      <SkeletonAnimationProvider>
        <FlatList
          data={Array(SKELETON_COUNT).fill(null)}
          renderItem={renderSkeleton}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.container}
          accessible={true}
          accessibilityLabel="Loading news articles"
          accessibilityRole="progressbar"
        />
      </SkeletonAnimationProvider>
    );
  }

  return (
    <FlatList
      data={articles}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
      accessible={true}
      accessibilityLabel={`News feed with ${articles.length} articles`}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  imageSkeleton: {
    marginBottom: 0,
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 24,
  },
  summary: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#999999',
  },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
});

export default NewsFeed;
```

## Conclusion

Skeleton loading screens are a powerful technique for improving perceived performance and user experience in React Native applications. By following the patterns and best practices outlined in this guide, you can create loading states that:

1. **Match your content layout** - Accurately represent the structure of incoming content
2. **Animate smoothly** - Use shimmer or pulse effects to indicate activity
3. **Transition gracefully** - Fade from skeleton to content without jarring changes
4. **Remain accessible** - Support screen readers and respect motion preferences
5. **Perform efficiently** - Use memoization and shared animations to minimize overhead

The key to effective skeleton screens is attention to detail. Every skeleton should be a promise to the user about what is coming. When that promise is fulfilled with content that matches the skeleton's structure, users perceive your app as faster and more polished.

Start simple with basic pulse animations, then gradually add shimmer effects and responsive sizing as needed. Remember that the goal is not to show off technical sophistication but to make your users feel that your app is fast, reliable, and well-crafted.

---

**Related Reading:**

- [React Native Performance Optimization](https://reactnative.dev/docs/performance)
- [Designing Loading States](https://uxdesign.cc/designing-loading-states)
- [Progressive Web Apps and PWA-First Strategy](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
