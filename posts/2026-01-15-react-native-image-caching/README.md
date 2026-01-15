# How to Cache Images and Assets for Offline Use in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Image Caching, Offline, Performance, Mobile Development, Assets

Description: Learn how to implement efficient image and asset caching in React Native for offline access and improved performance.

---

Mobile applications often rely heavily on images and assets to deliver rich user experiences. However, fetching these resources over the network every time can lead to slow load times, increased data usage, and a poor experience when users have limited or no connectivity. This comprehensive guide explores various strategies for caching images and assets in React Native, enabling your app to work seamlessly offline while delivering optimal performance.

## Why Cache Images and Assets?

Before diving into implementation details, let's understand why caching is crucial for mobile applications:

### Performance Benefits

```typescript
// Without caching - network request every time
const ProfileImage: React.FC<{ uri: string }> = ({ uri }) => {
  // This fetches from network on every render
  return <Image source={{ uri }} style={styles.image} />;
};

// Problem: Slow initial load, repeated downloads, wasted bandwidth
```

Caching provides several key advantages:

1. **Faster Load Times**: Cached images load instantly from local storage
2. **Reduced Bandwidth**: Images are downloaded once and reused
3. **Offline Access**: Users can view content without internet connection
4. **Better UX**: No loading spinners or blank spaces for cached content
5. **Lower Server Costs**: Reduced CDN and server bandwidth usage

### Real-World Impact

```typescript
interface CachingMetrics {
  withoutCaching: {
    averageLoadTime: '2-5 seconds';
    dataUsagePerSession: '50-100 MB';
    offlineCapability: false;
  };
  withCaching: {
    averageLoadTime: '50-200 ms';
    dataUsagePerSession: '5-10 MB';
    offlineCapability: true;
  };
}
```

## Built-in Image Component Caching

React Native's built-in `Image` component provides basic caching capabilities on both iOS and Android platforms.

### Understanding Default Behavior

```typescript
import React from 'react';
import { Image, ImageProps, Platform } from 'react-native';

// The default Image component has platform-specific caching
const BasicCachedImage: React.FC<{ uri: string }> = ({ uri }) => {
  return (
    <Image
      source={{
        uri,
        // iOS-specific cache control
        cache: Platform.OS === 'ios' ? 'default' : undefined,
      }}
      style={{ width: 200, height: 200 }}
    />
  );
};

// iOS cache policies
type IOSCachePolicy =
  | 'default'      // Use URL cache settings
  | 'reload'       // Ignore cache, always fetch
  | 'force-cache'  // Use cache if available, otherwise fetch
  | 'only-if-cached'; // Only use cache, fail if not available
```

### iOS Cache Configuration

```typescript
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface CachedImageProps {
  uri: string;
  cachePolicy?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
  width: number;
  height: number;
}

const IOSCachedImage: React.FC<CachedImageProps> = ({
  uri,
  cachePolicy = 'force-cache',
  width,
  height,
}) => {
  return (
    <Image
      source={{
        uri,
        cache: cachePolicy,
        // Optional: Add headers for authenticated requests
        headers: {
          Authorization: 'Bearer token',
        },
      }}
      style={{ width, height }}
      resizeMode="cover"
    />
  );
};

// Usage examples
const ImageGallery: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Force cache - best for static images */}
      <IOSCachedImage
        uri="https://example.com/profile.jpg"
        cachePolicy="force-cache"
        width={100}
        height={100}
      />

      {/* Default - respects server cache headers */}
      <IOSCachedImage
        uri="https://example.com/dynamic-content.jpg"
        cachePolicy="default"
        width={200}
        height={150}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

### Limitations of Built-in Caching

```typescript
// Built-in Image limitations:
const limitations = {
  // 1. No persistent disk caching on Android
  android: 'Only memory cache, cleared when app closes',

  // 2. Limited cache size control
  sizeControl: 'No API to set maximum cache size',

  // 3. No cache invalidation API
  invalidation: 'Cannot manually clear specific cached images',

  // 4. No progress callbacks
  progress: 'Cannot track download progress',

  // 5. No priority system
  priority: 'Cannot prioritize certain images over others',
};
```

## react-native-fast-image Setup and Usage

For production applications requiring robust caching, `react-native-fast-image` is the de facto standard library.

### Installation

```bash
# Using npm
npm install react-native-fast-image

# Using yarn
yarn add react-native-fast-image

# For iOS, install pods
cd ios && pod install && cd ..
```

### Basic Usage

```typescript
import React from 'react';
import FastImage, { Priority, ResizeMode } from 'react-native-fast-image';
import { StyleSheet, View } from 'react-native';

interface FastCachedImageProps {
  uri: string;
  width: number;
  height: number;
  priority?: Priority;
}

const FastCachedImage: React.FC<FastCachedImageProps> = ({
  uri,
  width,
  height,
  priority = FastImage.priority.normal,
}) => {
  return (
    <FastImage
      style={{ width, height }}
      source={{
        uri,
        priority,
        cache: FastImage.cacheControl.immutable,
        headers: {
          Authorization: 'Bearer token',
        },
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};

// Priority levels
const priorityExamples = {
  low: FastImage.priority.low,       // Background images
  normal: FastImage.priority.normal, // Default priority
  high: FastImage.priority.high,     // Visible content
};

// Cache control options
const cacheOptions = {
  immutable: FastImage.cacheControl.immutable,   // Only fetch once
  web: FastImage.cacheControl.web,               // Use HTTP cache headers
  cacheOnly: FastImage.cacheControl.cacheOnly,   // Only use cache
};

const styles = StyleSheet.create({
  image: {
    borderRadius: 8,
  },
});
```

### Advanced FastImage Configuration

```typescript
import React, { useCallback, useState } from 'react';
import FastImage, { OnLoadEvent, OnProgressEvent } from 'react-native-fast-image';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

interface AdvancedImageProps {
  uri: string;
  fallbackUri?: string;
  showProgress?: boolean;
}

const AdvancedCachedImage: React.FC<AdvancedImageProps> = ({
  uri,
  fallbackUri,
  showProgress = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleProgress = useCallback((event: OnProgressEvent) => {
    const { loaded, total } = event.nativeEvent;
    if (total > 0) {
      setProgress(Math.round((loaded / total) * 100));
    }
  }, []);

  const handleLoad = useCallback((event: OnLoadEvent) => {
    const { width, height } = event.nativeEvent;
    setDimensions({ width, height });
    setLoading(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const imageSource = error && fallbackUri ? fallbackUri : uri;

  return (
    <View style={styles.container}>
      <FastImage
        style={styles.image}
        source={{
          uri: imageSource,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        resizeMode={FastImage.resizeMode.cover}
        onLoadStart={handleLoadStart}
        onProgress={handleProgress}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          {showProgress && progress > 0 && (
            <Text style={styles.progressText}>{progress}%</Text>
          )}
        </View>
      )}

      {error && !fallbackUri && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
});

export default AdvancedCachedImage;
```

## Caching Strategies

Different scenarios require different caching approaches. Here are the most effective strategies:

### Strategy 1: Cache-First

```typescript
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheFirstConfig {
  maxAge: number; // milliseconds
  uri: string;
}

class CacheFirstStrategy {
  private static CACHE_KEY_PREFIX = '@image_cache_timestamp_';

  static async shouldRefetch(uri: string, maxAge: number): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(
        `${this.CACHE_KEY_PREFIX}${uri}`
      );

      if (!timestamp) return true;

      const age = Date.now() - parseInt(timestamp, 10);
      return age > maxAge;
    } catch {
      return true;
    }
  }

  static async markAsCached(uri: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_KEY_PREFIX}${uri}`,
        Date.now().toString()
      );
    } catch (error) {
      console.warn('Failed to mark image as cached:', error);
    }
  }
}

// Usage in component
const CacheFirstImage: React.FC<CacheFirstConfig> = ({ uri, maxAge }) => {
  const [cacheControl, setCacheControl] = useState(
    FastImage.cacheControl.immutable
  );

  useEffect(() => {
    const checkCache = async () => {
      const shouldRefetch = await CacheFirstStrategy.shouldRefetch(uri, maxAge);
      if (shouldRefetch) {
        setCacheControl(FastImage.cacheControl.web);
      }
    };
    checkCache();
  }, [uri, maxAge]);

  const handleLoad = useCallback(() => {
    CacheFirstStrategy.markAsCached(uri);
  }, [uri]);

  return (
    <FastImage
      source={{ uri, cache: cacheControl }}
      onLoad={handleLoad}
      style={{ width: 200, height: 200 }}
    />
  );
};
```

### Strategy 2: Network-First with Fallback

```typescript
import React, { useState, useEffect } from 'react';
import FastImage from 'react-native-fast-image';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkFirstImageProps {
  uri: string;
  offlinePlaceholder?: string;
}

const NetworkFirstImage: React.FC<NetworkFirstImageProps> = ({
  uri,
  offlinePlaceholder,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const getCacheControl = () => {
    if (!isOnline) {
      return FastImage.cacheControl.cacheOnly;
    }
    return FastImage.cacheControl.web; // Respect HTTP headers
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError && offlinePlaceholder) {
    return (
      <FastImage
        source={{ uri: offlinePlaceholder }}
        style={{ width: 200, height: 200 }}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }

  return (
    <FastImage
      source={{
        uri,
        cache: getCacheControl(),
        priority: FastImage.priority.normal,
      }}
      style={{ width: 200, height: 200 }}
      resizeMode={FastImage.resizeMode.cover}
      onError={handleError}
    />
  );
};
```

### Strategy 3: Stale-While-Revalidate

```typescript
import React, { useState, useEffect, useRef } from 'react';
import FastImage from 'react-native-fast-image';

interface SWRImageProps {
  uri: string;
  staleTime: number; // Show cached version for this duration
}

const StaleWhileRevalidateImage: React.FC<SWRImageProps> = ({
  uri,
  staleTime,
}) => {
  const [currentUri, setCurrentUri] = useState(uri);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    if (timeSinceLastFetch > staleTime) {
      // Show stale content immediately, revalidate in background
      setIsRevalidating(true);

      // Add cache-busting parameter for revalidation
      const revalidateUri = `${uri}?t=${now}`;

      // Prefetch new version
      FastImage.preload([{ uri: revalidateUri }]);

      // Update to new version after prefetch
      setTimeout(() => {
        setCurrentUri(revalidateUri);
        setIsRevalidating(false);
        lastFetchRef.current = now;
      }, 100);
    }
  }, [uri, staleTime]);

  return (
    <FastImage
      source={{
        uri: currentUri,
        cache: FastImage.cacheControl.immutable,
      }}
      style={{ width: 200, height: 200, opacity: isRevalidating ? 0.8 : 1 }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};
```

## Preloading Images

Preloading images before they're displayed improves perceived performance significantly.

### Basic Preloading

```typescript
import FastImage, { Source } from 'react-native-fast-image';

class ImagePreloader {
  static preloadSingle(uri: string, priority = FastImage.priority.normal): void {
    FastImage.preload([
      {
        uri,
        priority,
        cache: FastImage.cacheControl.immutable,
      },
    ]);
  }

  static preloadMultiple(uris: string[]): void {
    const sources: Source[] = uris.map((uri) => ({
      uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }));

    FastImage.preload(sources);
  }

  static preloadWithPriority(
    images: Array<{ uri: string; priority: 'low' | 'normal' | 'high' }>
  ): void {
    const priorityMap = {
      low: FastImage.priority.low,
      normal: FastImage.priority.normal,
      high: FastImage.priority.high,
    };

    const sources: Source[] = images.map(({ uri, priority }) => ({
      uri,
      priority: priorityMap[priority],
      cache: FastImage.cacheControl.immutable,
    }));

    FastImage.preload(sources);
  }
}

// Usage examples
// Preload hero images on app start
const preloadCriticalImages = () => {
  ImagePreloader.preloadWithPriority([
    { uri: 'https://example.com/hero.jpg', priority: 'high' },
    { uri: 'https://example.com/logo.png', priority: 'high' },
    { uri: 'https://example.com/background.jpg', priority: 'normal' },
  ]);
};
```

### Smart Preloading Based on User Behavior

```typescript
import React, { useEffect, useCallback } from 'react';
import { FlatList, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';

interface ImageItem {
  id: string;
  uri: string;
}

interface SmartPreloadListProps {
  images: ImageItem[];
  preloadAhead: number; // Number of items to preload ahead
}

const SmartPreloadList: React.FC<SmartPreloadListProps> = ({
  images,
  preloadAhead = 5,
}) => {
  const preloadedIndices = React.useRef<Set<number>>(new Set());

  const preloadUpcoming = useCallback(
    (currentIndex: number) => {
      const toPreload: string[] = [];

      for (let i = 1; i <= preloadAhead; i++) {
        const nextIndex = currentIndex + i;

        if (
          nextIndex < images.length &&
          !preloadedIndices.current.has(nextIndex)
        ) {
          toPreload.push(images[nextIndex].uri);
          preloadedIndices.current.add(nextIndex);
        }
      }

      if (toPreload.length > 0) {
        FastImage.preload(
          toPreload.map((uri) => ({
            uri,
            priority: FastImage.priority.low,
          }))
        );
      }
    },
    [images, preloadAhead]
  );

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0) {
        const lastVisible = viewableItems[viewableItems.length - 1];
        if (lastVisible.index !== null) {
          preloadUpcoming(lastVisible.index);
        }
      }
    },
    [preloadUpcoming]
  );

  const renderItem = useCallback(({ item }: { item: ImageItem }) => {
    return (
      <FastImage
        source={{
          uri: item.uri,
          cache: FastImage.cacheControl.immutable,
        }}
        style={{ width: Dimensions.get('window').width, height: 300 }}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }, []);

  return (
    <FlatList
      data={images}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
    />
  );
};
```

## Cache Size Management

Managing cache size prevents your app from consuming excessive storage.

### Monitoring Cache Size

```typescript
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

interface CacheInfo {
  totalSize: number;
  fileCount: number;
  formattedSize: string;
}

class CacheManager {
  private static getCacheDirectory(): string {
    return Platform.OS === 'ios'
      ? `${RNFS.CachesDirectoryPath}/com.hackemist.SDImageCache/default`
      : `${RNFS.CachesDirectoryPath}/image_manager_disk_cache`;
  }

  static async getCacheInfo(): Promise<CacheInfo> {
    try {
      const cacheDir = this.getCacheDirectory();
      const exists = await RNFS.exists(cacheDir);

      if (!exists) {
        return { totalSize: 0, fileCount: 0, formattedSize: '0 B' };
      }

      const files = await RNFS.readDir(cacheDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.isFile()) {
          totalSize += file.size;
        }
      }

      return {
        totalSize,
        fileCount: files.filter((f) => f.isFile()).length,
        formattedSize: this.formatBytes(totalSize),
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { totalSize: 0, fileCount: 0, formattedSize: '0 B' };
    }
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  static async clearCache(): Promise<void> {
    try {
      // Clear FastImage cache
      await FastImage.clearDiskCache();
      await FastImage.clearMemoryCache();

      console.log('Image cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  static async clearOldCache(maxAgeMs: number): Promise<number> {
    try {
      const cacheDir = this.getCacheDirectory();
      const exists = await RNFS.exists(cacheDir);

      if (!exists) return 0;

      const files = await RNFS.readDir(cacheDir);
      const now = Date.now();
      let clearedCount = 0;

      for (const file of files) {
        if (file.isFile()) {
          const fileAge = now - new Date(file.mtime).getTime();

          if (fileAge > maxAgeMs) {
            await RNFS.unlink(file.path);
            clearedCount++;
          }
        }
      }

      return clearedCount;
    } catch (error) {
      console.error('Error clearing old cache:', error);
      return 0;
    }
  }
}

// Usage
const manageCacheSize = async () => {
  const info = await CacheManager.getCacheInfo();
  console.log(`Cache size: ${info.formattedSize}, Files: ${info.fileCount}`);

  // Clear cache if over 100MB
  if (info.totalSize > 100 * 1024 * 1024) {
    // First try clearing old files (older than 7 days)
    const cleared = await CacheManager.clearOldCache(7 * 24 * 60 * 60 * 1000);
    console.log(`Cleared ${cleared} old cached files`);

    // If still too large, clear everything
    const newInfo = await CacheManager.getCacheInfo();
    if (newInfo.totalSize > 100 * 1024 * 1024) {
      await CacheManager.clearCache();
    }
  }
};
```

### LRU Cache Implementation

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry {
  uri: string;
  lastAccessed: number;
  size: number;
}

class LRUImageCache {
  private maxSize: number;
  private cacheKey = '@lru_image_cache';

  constructor(maxSizeBytes: number) {
    this.maxSize = maxSizeBytes;
  }

  async recordAccess(uri: string, size: number): Promise<void> {
    const entries = await this.getEntries();
    const existingIndex = entries.findIndex((e) => e.uri === uri);

    if (existingIndex >= 0) {
      entries[existingIndex].lastAccessed = Date.now();
    } else {
      entries.push({ uri, lastAccessed: Date.now(), size });
    }

    await this.saveEntries(entries);
    await this.evictIfNeeded();
  }

  async evictIfNeeded(): Promise<string[]> {
    const entries = await this.getEntries();
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const evicted: string[] = [];

    if (totalSize <= this.maxSize) {
      return evicted;
    }

    // Sort by last accessed (oldest first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let currentSize = totalSize;
    while (currentSize > this.maxSize && entries.length > 0) {
      const oldest = entries.shift();
      if (oldest) {
        evicted.push(oldest.uri);
        currentSize -= oldest.size;
      }
    }

    await this.saveEntries(entries);
    return evicted;
  }

  private async getEntries(): Promise<CacheEntry[]> {
    try {
      const data = await AsyncStorage.getItem(this.cacheKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveEntries(entries: CacheEntry[]): Promise<void> {
    await AsyncStorage.setItem(this.cacheKey, JSON.stringify(entries));
  }
}
```

## Cache Invalidation

Proper cache invalidation ensures users see fresh content when needed.

### URL-Based Invalidation

```typescript
interface ImageVersionManager {
  getVersionedUrl(baseUrl: string): string;
  invalidateUrl(baseUrl: string): void;
}

class ImageVersionService implements ImageVersionManager {
  private versions: Map<string, number> = new Map();
  private storageKey = '@image_versions';

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.versions = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load image versions:', error);
    }
  }

  getVersionedUrl(baseUrl: string): string {
    const version = this.versions.get(baseUrl) || 0;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}v=${version}`;
  }

  invalidateUrl(baseUrl: string): void {
    const currentVersion = this.versions.get(baseUrl) || 0;
    this.versions.set(baseUrl, currentVersion + 1);
    this.persistVersions();
  }

  invalidatePattern(pattern: RegExp): void {
    for (const [url] of this.versions) {
      if (pattern.test(url)) {
        this.invalidateUrl(url);
      }
    }
  }

  private async persistVersions(): Promise<void> {
    const obj = Object.fromEntries(this.versions);
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(obj));
  }
}

// Usage
const imageVersionService = new ImageVersionService();

// In component
const VersionedImage: React.FC<{ baseUri: string }> = ({ baseUri }) => {
  const versionedUri = imageVersionService.getVersionedUrl(baseUri);

  return (
    <FastImage
      source={{ uri: versionedUri }}
      style={{ width: 200, height: 200 }}
    />
  );
};

// When content updates
const handleProfileUpdate = async () => {
  imageVersionService.invalidateUrl('https://example.com/profile/123.jpg');
};
```

### Time-Based Invalidation

```typescript
import React, { useState, useEffect } from 'react';
import FastImage from 'react-native-fast-image';

interface TimedCacheImageProps {
  uri: string;
  maxAge: number; // Maximum age in milliseconds
  onRefresh?: () => void;
}

const TimedCacheImage: React.FC<TimedCacheImageProps> = ({
  uri,
  maxAge,
  onRefresh,
}) => {
  const [currentUri, setCurrentUri] = useState(uri);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const checkAndRefresh = () => {
      const age = Date.now() - lastRefresh;

      if (age >= maxAge) {
        // Add cache-busting parameter
        const refreshedUri = `${uri}${uri.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setCurrentUri(refreshedUri);
        setLastRefresh(Date.now());
        onRefresh?.();
      }
    };

    // Check periodically
    const interval = setInterval(checkAndRefresh, Math.min(maxAge / 2, 60000));

    return () => clearInterval(interval);
  }, [uri, maxAge, lastRefresh, onRefresh]);

  return (
    <FastImage
      source={{
        uri: currentUri,
        cache: FastImage.cacheControl.web,
      }}
      style={{ width: 200, height: 200 }}
    />
  );
};
```

## Offline Image Display

Creating a robust offline experience requires careful handling of network states.

### Offline-First Image Component

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';

interface OfflineImageProps {
  uri: string;
  localFallback?: number; // require('./local-image.png')
  showOfflineIndicator?: boolean;
}

const OfflineImage: React.FC<OfflineImageProps> = ({
  uri,
  localFallback,
  showOfflineIndicator = true,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoad = useCallback(() => {
    setIsCached(true);
    setLoadError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoadError(true);
  }, []);

  const getCacheControl = () => {
    if (!isOnline) {
      return FastImage.cacheControl.cacheOnly;
    }
    return FastImage.cacheControl.immutable;
  };

  // Show local fallback if offline with no cache or on error
  if (((!isOnline && !isCached) || loadError) && localFallback) {
    return (
      <View style={styles.container}>
        <FastImage
          source={localFallback}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
        {showOfflineIndicator && !isOnline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FastImage
        source={{
          uri,
          cache: getCacheControl(),
          priority: FastImage.priority.normal,
        }}
        style={styles.image}
        resizeMode={FastImage.resizeMode.cover}
        onLoad={handleLoad}
        onError={handleError}
      />
      {showOfflineIndicator && !isOnline && isCached && (
        <View style={styles.cachedBadge}>
          <Text style={styles.cachedText}>Cached</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  offlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offlineText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cachedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#51cf66',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cachedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default OfflineImage;
```

## Progressive Image Loading

Progressive loading improves perceived performance by showing low-quality previews first.

### Blur-to-Sharp Loading

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import FastImage from 'react-native-fast-image';

interface ProgressiveImageProps {
  thumbnailUri: string;
  fullUri: string;
  style?: object;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  thumbnailUri,
  fullUri,
  style,
}) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const fullOpacity = useState(new Animated.Value(0))[0];

  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
  }, []);

  const handleFullLoad = useCallback(() => {
    setFullLoaded(true);
    Animated.timing(fullOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fullOpacity]);

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail with blur effect */}
      <FastImage
        source={{
          uri: thumbnailUri,
          cache: FastImage.cacheControl.immutable,
        }}
        style={[styles.image, { opacity: fullLoaded ? 0 : 1 }]}
        resizeMode={FastImage.resizeMode.cover}
        onLoad={handleThumbnailLoad}
        blurRadius={thumbnailLoaded && !fullLoaded ? 0 : 10}
      />

      {/* Full resolution image */}
      <Animated.View style={[styles.fullImageContainer, { opacity: fullOpacity }]}>
        <FastImage
          source={{
            uri: fullUri,
            cache: FastImage.cacheControl.immutable,
            priority: FastImage.priority.high,
          }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          onLoad={handleFullLoad}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 200,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fullImageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default ProgressiveImage;
```

### Shimmer Placeholder

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';

interface ShimmerImageProps {
  uri: string;
  width: number;
  height: number;
}

const ShimmerPlaceholder: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.shimmerContainer, { width, height }]}>
      <Animated.View
        style={[
          styles.shimmerGradient,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: width * 2, height }}
        />
      </Animated.View>
    </View>
  );
};

const ShimmerImage: React.FC<ShimmerImageProps> = ({ uri, width, height }) => {
  const [loaded, setLoaded] = useState(false);
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {!loaded && <ShimmerPlaceholder width={width} height={height} />}
      <Animated.View
        style={[styles.imageContainer, { opacity: imageOpacity }]}
      >
        <FastImage
          source={{
            uri,
            cache: FastImage.cacheControl.immutable,
          }}
          style={{ width, height }}
          resizeMode={FastImage.resizeMode.cover}
          onLoad={handleLoad}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerGradient: {
    position: 'absolute',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default ShimmerImage;
```

## Asset Bundling

Bundle critical assets with your app for guaranteed offline availability.

### Static Asset Management

```typescript
// assets/index.ts
export const BundledAssets = {
  // Profile placeholders
  avatarPlaceholder: require('./images/avatar-placeholder.png'),
  coverPlaceholder: require('./images/cover-placeholder.png'),

  // UI elements
  logo: require('./images/logo.png'),
  emptyState: require('./images/empty-state.png'),
  errorState: require('./images/error-state.png'),
  offlineState: require('./images/offline-state.png'),

  // Icons
  icons: {
    home: require('./icons/home.png'),
    profile: require('./icons/profile.png'),
    settings: require('./icons/settings.png'),
  },
};

// Type-safe asset access
type AssetKey = keyof typeof BundledAssets;

export const getAsset = (key: AssetKey) => BundledAssets[key];
```

### Hybrid Image Component

```typescript
import React from 'react';
import FastImage, { Source } from 'react-native-fast-image';
import { BundledAssets } from '../assets';

interface HybridImageProps {
  remoteUri?: string;
  localAsset?: keyof typeof BundledAssets;
  fallbackAsset: keyof typeof BundledAssets;
  style?: object;
}

const HybridImage: React.FC<HybridImageProps> = ({
  remoteUri,
  localAsset,
  fallbackAsset,
  style,
}) => {
  const [useRemote, setUseRemote] = React.useState(!!remoteUri);

  const handleError = () => {
    setUseRemote(false);
  };

  // Priority: remote > local > fallback
  if (useRemote && remoteUri) {
    return (
      <FastImage
        source={{
          uri: remoteUri,
          cache: FastImage.cacheControl.immutable,
        }}
        style={style}
        resizeMode={FastImage.resizeMode.cover}
        onError={handleError}
      />
    );
  }

  const localSource = localAsset
    ? BundledAssets[localAsset]
    : BundledAssets[fallbackAsset];

  return (
    <FastImage
      source={localSource as Source}
      style={style}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};

// Usage
const ProfileAvatar: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => (
  <HybridImage
    remoteUri={imageUrl}
    fallbackAsset="avatarPlaceholder"
    style={{ width: 50, height: 50, borderRadius: 25 }}
  />
);
```

## Performance Monitoring

Track and optimize image loading performance in production.

### Image Performance Tracker

```typescript
import { PerformanceObserver, performance } from 'react-native-performance';

interface ImageLoadMetrics {
  uri: string;
  loadTime: number;
  size?: number;
  cached: boolean;
  timestamp: number;
}

class ImagePerformanceTracker {
  private metrics: ImageLoadMetrics[] = [];
  private maxMetrics = 1000;

  startTracking(uri: string): () => void {
    const startTime = performance.now();
    let cached = true;

    // Detect if this is a cache miss
    const detectCacheMiss = () => {
      cached = false;
    };

    return () => {
      const loadTime = performance.now() - startTime;
      this.recordMetric({
        uri,
        loadTime,
        cached,
        timestamp: Date.now(),
      });
    };
  }

  recordMetric(metric: ImageLoadMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverageLoadTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.loadTime, 0);
    return total / this.metrics.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    const cached = this.metrics.filter((m) => m.cached).length;
    return (cached / this.metrics.length) * 100;
  }

  getSlowestLoads(count: number = 10): ImageLoadMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, count);
  }

  getReport(): {
    averageLoadTime: number;
    cacheHitRate: number;
    totalLoads: number;
    slowestLoads: ImageLoadMetrics[];
  } {
    return {
      averageLoadTime: this.getAverageLoadTime(),
      cacheHitRate: this.getCacheHitRate(),
      totalLoads: this.metrics.length,
      slowestLoads: this.getSlowestLoads(5),
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const imagePerformanceTracker = new ImagePerformanceTracker();

// Usage in component
const TrackedImage: React.FC<{ uri: string }> = ({ uri }) => {
  const endTracking = React.useRef<(() => void) | null>(null);

  const handleLoadStart = () => {
    endTracking.current = imagePerformanceTracker.startTracking(uri);
  };

  const handleLoadEnd = () => {
    endTracking.current?.();
  };

  return (
    <FastImage
      source={{ uri }}
      style={{ width: 200, height: 200 }}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
    />
  );
};
```

### Debug Dashboard Component

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { imagePerformanceTracker } from './ImagePerformanceTracker';
import { CacheManager } from './CacheManager';

const ImageDebugDashboard: React.FC = () => {
  const [report, setReport] = useState(imagePerformanceTracker.getReport());
  const [cacheInfo, setCacheInfo] = useState({ formattedSize: '...', fileCount: 0 });

  useEffect(() => {
    const loadCacheInfo = async () => {
      const info = await CacheManager.getCacheInfo();
      setCacheInfo(info);
    };

    loadCacheInfo();
    const interval = setInterval(() => {
      setReport(imagePerformanceTracker.getReport());
      loadCacheInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    await CacheManager.clearCache();
    imagePerformanceTracker.clearMetrics();
    setReport(imagePerformanceTracker.getReport());
    setCacheInfo({ formattedSize: '0 B', fileCount: 0 });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Image Performance Dashboard</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Statistics</Text>
        <Text style={styles.stat}>Size: {cacheInfo.formattedSize}</Text>
        <Text style={styles.stat}>Files: {cacheInfo.fileCount}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Load Performance</Text>
        <Text style={styles.stat}>
          Average Load: {report.averageLoadTime.toFixed(2)}ms
        </Text>
        <Text style={styles.stat}>
          Cache Hit Rate: {report.cacheHitRate.toFixed(1)}%
        </Text>
        <Text style={styles.stat}>Total Loads: {report.totalLoads}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Slowest Loads</Text>
        {report.slowestLoads.map((load, index) => (
          <View key={index} style={styles.slowLoad}>
            <Text style={styles.slowLoadTime}>
              {load.loadTime.toFixed(0)}ms
            </Text>
            <Text style={styles.slowLoadUri} numberOfLines={1}>
              {load.uri}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
        <Text style={styles.clearButtonText}>Clear Cache</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  stat: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  slowLoad: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  slowLoadTime: {
    width: 60,
    fontWeight: '600',
    color: '#e74c3c',
  },
  slowLoadUri: {
    flex: 1,
    color: '#666',
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ImageDebugDashboard;
```

## Conclusion

Implementing proper image and asset caching in React Native applications is essential for delivering a polished user experience. By following the strategies outlined in this guide, you can:

1. **Dramatically improve performance** with instant image loading from cache
2. **Enable offline access** so users can view content without connectivity
3. **Reduce bandwidth usage** by downloading images only when necessary
4. **Manage cache size** to prevent excessive storage consumption
5. **Monitor and optimize** loading performance in production

Remember to choose the right caching strategy based on your specific use case:

- Use **cache-first** for static content like logos and icons
- Use **network-first** for frequently updated content
- Use **stale-while-revalidate** for the best balance of freshness and speed

The `react-native-fast-image` library provides a robust foundation for most caching needs, while custom solutions can address specific requirements like LRU eviction or time-based invalidation.

With these techniques in place, your React Native application will deliver a fast, reliable experience regardless of network conditions.
