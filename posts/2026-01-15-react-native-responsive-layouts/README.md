# How to Create Responsive Layouts for Different Screen Sizes in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Responsive Design, Layouts, Screen Sizes, Mobile Development, Tablet

Description: Learn how to create responsive layouts in React Native that adapt to different screen sizes, orientations, and devices.

---

Creating responsive layouts in React Native is essential for delivering a consistent user experience across the vast landscape of mobile devices. From compact smartphones to large tablets, your application needs to adapt gracefully to various screen sizes and orientations. This comprehensive guide will walk you through the techniques, hooks, and best practices for building truly responsive React Native applications.

## Understanding Screen Dimensions

Before diving into responsive techniques, it's crucial to understand how React Native handles screen dimensions. Unlike web development where you work with viewport units and CSS media queries, React Native operates with density-independent pixels (dp) and provides specific APIs for dimension handling.

React Native abstracts away the complexity of different screen densities by using density-independent pixels. This means that a component with a width of 100 will appear roughly the same physical size across devices with different pixel densities.

```typescript
import { Dimensions, PixelRatio } from 'react-native';

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const screenDimensions = Dimensions.get('screen');

// Understanding pixel ratio
const pixelRatio = PixelRatio.get();
const fontScale = PixelRatio.getFontScale();

console.log(`Window: ${width}x${height}`);
console.log(`Screen: ${screenDimensions.width}x${screenDimensions.height}`);
console.log(`Pixel Ratio: ${pixelRatio}`);
console.log(`Font Scale: ${fontScale}`);
```

The difference between `window` and `screen` dimensions is important:
- **window**: The visible area of your app (excludes status bar on Android)
- **screen**: The entire screen dimensions including system UI elements

## The useWindowDimensions Hook

React Native provides the `useWindowDimensions` hook, which is the recommended way to get screen dimensions in functional components. Unlike the static `Dimensions.get()` method, this hook automatically updates when the screen dimensions change (such as during orientation changes).

```typescript
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

const ResponsiveComponent: React.FC = () => {
  const { width, height, fontScale, scale } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;

  return (
    <View style={[
      styles.container,
      { flexDirection: isLandscape ? 'row' : 'column' }
    ]}>
      <Text style={styles.info}>
        Dimensions: {Math.round(width)} x {Math.round(height)}
      </Text>
      <Text style={styles.info}>
        Orientation: {isLandscape ? 'Landscape' : 'Portrait'}
      </Text>
      <Text style={styles.info}>
        Device Type: {isTablet ? 'Tablet' : 'Phone'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  info: {
    fontSize: 16,
    marginVertical: 5,
  },
});

export default ResponsiveComponent;
```

### Creating a Custom Responsive Hook

For more advanced use cases, you can create a custom hook that provides additional responsive utilities:

```typescript
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

interface ResponsiveInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isSmallPhone: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const isPortrait = !isLandscape;

    // Define breakpoints based on width
    const isSmallPhone = width < 375;
    const isPhone = width >= 375 && width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isLargeTablet = width >= 1024;

    // Determine current breakpoint
    let breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    if (width < 375) breakpoint = 'xs';
    else if (width < 768) breakpoint = 'sm';
    else if (width < 1024) breakpoint = 'md';
    else if (width < 1280) breakpoint = 'lg';
    else breakpoint = 'xl';

    return {
      width,
      height,
      isLandscape,
      isPortrait,
      isSmallPhone,
      isPhone,
      isTablet,
      isLargeTablet,
      breakpoint,
    };
  }, [width, height]);
};
```

## Responsive Font Sizing

One of the most common challenges in responsive design is maintaining readable text across different screen sizes. Here are several approaches to responsive font sizing:

### Scale-Based Font Sizing

```typescript
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Base width for scaling (iPhone 8 width)
const BASE_WIDTH = 375;

// Scale font size based on screen width
export const scaleFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  // Round to nearest pixel and limit scaling
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Moderate scaling - less aggressive for better readability
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scale - 1) * size * factor);
};
```

### Dynamic Font Sizing Hook

```typescript
import { useWindowDimensions, PixelRatio } from 'react-native';
import { useMemo } from 'react';

interface FontSizes {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  heading: number;
  title: number;
}

export const useFontSizes = (): FontSizes => {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const baseWidth = 375;
    const scale = Math.min(width / baseWidth, 1.3); // Cap scaling at 1.3x

    const scaledSize = (size: number): number => {
      return Math.round(PixelRatio.roundToNearestPixel(size * scale));
    };

    return {
      xs: scaledSize(10),
      sm: scaledSize(12),
      md: scaledSize(14),
      lg: scaledSize(16),
      xl: scaledSize(18),
      xxl: scaledSize(24),
      heading: scaledSize(28),
      title: scaledSize(32),
    };
  }, [width]);
};

// Usage example
const TextComponent: React.FC = () => {
  const fonts = useFontSizes();

  return (
    <View>
      <Text style={{ fontSize: fonts.title }}>Page Title</Text>
      <Text style={{ fontSize: fonts.md }}>Body text content</Text>
      <Text style={{ fontSize: fonts.sm }}>Caption text</Text>
    </View>
  );
};
```

## Flexible Layouts with Flexbox

Flexbox is the foundation of responsive layouts in React Native. Understanding its properties thoroughly is essential for creating adaptive interfaces.

### Core Flexbox Properties

```typescript
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

const FlexboxExample: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;

  return (
    <View style={styles.container}>
      {/* Flex direction changes based on screen width */}
      <View style={[
        styles.row,
        { flexDirection: isWideScreen ? 'row' : 'column' }
      ]}>
        <View style={[styles.box, { flex: isWideScreen ? 2 : 1 }]} />
        <View style={[styles.box, { flex: 1 }]} />
        <View style={[styles.box, { flex: 1 }]} />
      </View>

      {/* Flex wrap for grid-like layouts */}
      <View style={styles.wrapContainer}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View
            key={item}
            style={[
              styles.gridItem,
              { width: isWideScreen ? '30%' : '45%' }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  row: {
    marginBottom: 20,
  },
  box: {
    height: 100,
    backgroundColor: '#3498db',
    margin: 5,
    borderRadius: 8,
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    height: 100,
    backgroundColor: '#e74c3c',
    marginBottom: 10,
    borderRadius: 8,
  },
});

export default FlexboxExample;
```

### Responsive Grid Component

```typescript
import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

interface ResponsiveGridProps {
  children: ReactNode[];
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  spacing?: number;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 10,
}) => {
  const { width } = useWindowDimensions();

  // Determine number of columns based on screen width
  const getColumns = (): number => {
    if (width < 375) return columns.xs || 1;
    if (width < 768) return columns.sm || 2;
    if (width < 1024) return columns.md || 3;
    return columns.lg || 4;
  };

  const numColumns = getColumns();
  const itemWidth = (width - spacing * (numColumns + 1)) / numColumns;

  return (
    <View style={[styles.grid, { padding: spacing / 2 }]}>
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: itemWidth,
              margin: spacing / 2,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    // Base styles for grid items
  },
});

export default ResponsiveGrid;
```

## Percentage vs Fixed Dimensions

Understanding when to use percentages versus fixed dimensions is crucial for responsive design.

```typescript
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

const DimensionsExample: React.FC = () => {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.container}>
      {/* Fixed dimensions - use for icons, buttons, specific UI elements */}
      <View style={styles.fixedBox}>
        <Text>Fixed 100x100</Text>
      </View>

      {/* Percentage dimensions - use for containers, cards, sections */}
      <View style={[styles.percentageBox, { width: width * 0.9 }]}>
        <Text>90% Width</Text>
      </View>

      {/* Mixed approach - percentage width with max constraint */}
      <View style={[
        styles.constrainedBox,
        { width: Math.min(width * 0.95, 500) }
      ]}>
        <Text>95% Width, Max 500</Text>
      </View>

      {/* Aspect ratio for responsive images/videos */}
      <View style={[
        styles.aspectRatioBox,
        { width: width * 0.8, height: (width * 0.8) * (9/16) }
      ]}>
        <Text>16:9 Aspect Ratio</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  fixedBox: {
    width: 100,
    height: 100,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  percentageBox: {
    height: 80,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 8,
  },
  constrainedBox: {
    height: 80,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 8,
  },
  aspectRatioBox: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default DimensionsExample;
```

## Breakpoint Strategies

Implementing a consistent breakpoint system helps maintain design consistency across your application.

```typescript
// breakpoints.ts
export const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

export const getResponsiveValue = <T>(
  width: number,
  values: ResponsiveValue<T>,
  defaultValue: T
): T => {
  const breakpoints: BreakpointKey[] = ['xl', 'lg', 'md', 'sm', 'xs'];

  for (const bp of breakpoints) {
    if (width >= BREAKPOINTS[bp] && values[bp] !== undefined) {
      return values[bp] as T;
    }
  }

  return defaultValue;
};

// Hook for responsive values
import { useWindowDimensions } from 'react-native';

export const useResponsiveValue = <T>(
  values: ResponsiveValue<T>,
  defaultValue: T
): T => {
  const { width } = useWindowDimensions();
  return getResponsiveValue(width, values, defaultValue);
};

// Usage example
const ResponsiveComponent: React.FC = () => {
  const padding = useResponsiveValue(
    { xs: 10, sm: 15, md: 20, lg: 30 },
    10
  );

  const columns = useResponsiveValue(
    { xs: 1, sm: 2, md: 3, lg: 4 },
    1
  );

  return (
    <View style={{ padding }}>
      <Text>Columns: {columns}</Text>
    </View>
  );
};
```

### Responsive Style Generator

```typescript
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
type ResponsiveStyles<T> = {
  xs?: Partial<NamedStyles<T>>;
  sm?: Partial<NamedStyles<T>>;
  md?: Partial<NamedStyles<T>>;
  lg?: Partial<NamedStyles<T>>;
  xl?: Partial<NamedStyles<T>>;
};

export const useResponsiveStyles = <T extends NamedStyles<T>>(
  baseStyles: T,
  responsiveStyles: ResponsiveStyles<T>
): T => {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const breakpoints = [
      { key: 'xs', min: 0 },
      { key: 'sm', min: 375 },
      { key: 'md', min: 768 },
      { key: 'lg', min: 1024 },
      { key: 'xl', min: 1280 },
    ] as const;

    let mergedStyles = { ...baseStyles };

    for (const bp of breakpoints) {
      if (width >= bp.min && responsiveStyles[bp.key]) {
        const bpStyles = responsiveStyles[bp.key] as Partial<NamedStyles<T>>;
        for (const key in bpStyles) {
          mergedStyles[key] = {
            ...mergedStyles[key],
            ...bpStyles[key],
          } as T[Extract<keyof T, string>];
        }
      }
    }

    return mergedStyles;
  }, [width, baseStyles, responsiveStyles]);
};
```

## Tablet-Specific Layouts

Tablets offer more screen real estate, which should be utilized effectively with split views and multi-column layouts.

```typescript
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';

interface MasterDetailLayoutProps {
  masterContent: React.ReactNode;
  detailContent: React.ReactNode;
  masterWidth?: number;
}

const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  masterContent,
  detailContent,
  masterWidth = 320,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  if (!isTablet) {
    // Phone layout - stack master and detail
    return (
      <View style={styles.phoneContainer}>
        {masterContent}
      </View>
    );
  }

  // Tablet layout - side by side
  return (
    <View style={styles.tabletContainer}>
      <View style={[styles.masterPanel, { width: masterWidth }]}>
        {masterContent}
      </View>
      <View style={styles.detailPanel}>
        {detailContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  phoneContainer: {
    flex: 1,
  },
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  masterPanel: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  detailPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

// Multi-column content layout for tablets
const TabletContentLayout: React.FC<{ children: React.ReactNode[] }> = ({
  children,
}) => {
  const { width } = useWindowDimensions();

  const getColumnCount = (): number => {
    if (width < 768) return 1;
    if (width < 1024) return 2;
    return 3;
  };

  const columnCount = getColumnCount();
  const columns: React.ReactNode[][] = Array.from(
    { length: columnCount },
    () => []
  );

  // Distribute children across columns
  React.Children.forEach(children, (child, index) => {
    columns[index % columnCount].push(child);
  });

  return (
    <ScrollView>
      <View style={tabletStyles.columnsContainer}>
        {columns.map((column, index) => (
          <View
            key={index}
            style={[
              tabletStyles.column,
              { width: `${100 / columnCount}%` as any },
            ]}
          >
            {column}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const tabletStyles = StyleSheet.create({
  columnsContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  column: {
    paddingHorizontal: 5,
  },
});

export { MasterDetailLayout, TabletContentLayout };
```

## Orientation Handling

Properly handling orientation changes ensures your app remains usable in both portrait and landscape modes.

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';

type Orientation = 'portrait' | 'landscape';

export const useOrientation = (): Orientation => {
  const { width, height } = useWindowDimensions();
  return width > height ? 'landscape' : 'portrait';
};

const OrientationAwareComponent: React.FC = () => {
  const orientation = useOrientation();
  const { width, height } = useWindowDimensions();

  const styles = orientation === 'landscape'
    ? landscapeStyles
    : portraitStyles;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>App Header</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sidebar}>
          <Text>Navigation</Text>
        </View>
        <View style={styles.main}>
          <Text>Main Content</Text>
          <Text>Orientation: {orientation}</Text>
          <Text>Dimensions: {Math.round(width)} x {Math.round(height)}</Text>
        </View>
      </View>
    </View>
  );
};

const portraitStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebar: {
    height: 50,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  main: {
    flex: 1,
    padding: 20,
  },
});

const landscapeStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  header: {
    width: 60,
    backgroundColor: '#3498db',
    justifyContent: 'flex-start',
    paddingTop: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    transform: [{ rotate: '-90deg' }],
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#ecf0f1',
    padding: 20,
  },
  main: {
    flex: 1,
    padding: 20,
  },
});

export default OrientationAwareComponent;
```

## Safe Area Considerations

Modern devices have notches, rounded corners, and home indicators that your app must account for.

```typescript
import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

// Basic SafeAreaView usage
const BasicSafeAreaExample: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text>Content within safe area</Text>
      </View>
    </SafeAreaView>
  );
};

// Custom safe area handling with useSafeAreaInsets
const CustomSafeAreaExample: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.customContainer,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
    ]}>
      {/* Header that extends behind status bar */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 10,
          marginTop: -insets.top,
        },
      ]}>
        <Text style={styles.headerText}>Full-bleed Header</Text>
      </View>

      <View style={styles.mainContent}>
        <Text>Safe Area Insets:</Text>
        <Text>Top: {insets.top}</Text>
        <Text>Bottom: {insets.bottom}</Text>
        <Text>Left: {insets.left}</Text>
        <Text>Right: {insets.right}</Text>
      </View>

      {/* Bottom bar with safe area consideration */}
      <View style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          marginBottom: -insets.bottom,
        },
      ]}>
        <Text style={styles.bottomBarText}>Bottom Navigation</Text>
      </View>
    </View>
  );
};

// Responsive safe area component
const ResponsiveSafeArea: React.FC<{
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}> = ({ children, edges = ['top', 'bottom'] }) => {
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.responsiveSafeArea, padding]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  customContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  bottomBar: {
    backgroundColor: '#2c3e50',
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  bottomBarText: {
    color: '#fff',
    textAlign: 'center',
  },
  responsiveSafeArea: {
    flex: 1,
  },
});

export { BasicSafeAreaExample, CustomSafeAreaExample, ResponsiveSafeArea };
```

## Platform-Specific Adjustments

iOS and Android have different design guidelines and behaviors that may require platform-specific styling.

```typescript
import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';

const PlatformSpecificComponent: React.FC = () => {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Platform-Aware Card</Text>
        <Text>Running on: {Platform.OS}</Text>
        <Text>Version: {Platform.Version}</Text>
      </View>

      <View style={[
        styles.button,
        Platform.select({
          ios: styles.buttonIOS,
          android: styles.buttonAndroid,
        }),
      ]}>
        <Text style={styles.buttonText}>Platform Button</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'ios' ? 12 : 4,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    marginBottom: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonIOS: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  buttonAndroid: {
    backgroundColor: '#6200EE',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Platform-specific responsive utilities
export const getPlatformSpacing = (base: number): number => {
  return Platform.select({
    ios: base,
    android: base * 0.9, // Android typically uses slightly tighter spacing
  }) || base;
};

export const getPlatformFontSize = (base: number): number => {
  return Platform.select({
    ios: base,
    android: base * 0.95, // Android text often renders slightly larger
  }) || base;
};

export default PlatformSpecificComponent;
```

## Testing on Different Devices

Thorough testing is essential for ensuring your responsive layouts work correctly across all target devices.

```typescript
// Device simulation utilities for development
interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
  isTablet: boolean;
}

export const DEVICE_CONFIGS: DeviceConfig[] = [
  // iPhones
  { name: 'iPhone SE', width: 375, height: 667, platform: 'ios', isTablet: false },
  { name: 'iPhone 13', width: 390, height: 844, platform: 'ios', isTablet: false },
  { name: 'iPhone 13 Pro Max', width: 428, height: 926, platform: 'ios', isTablet: false },

  // iPads
  { name: 'iPad Mini', width: 768, height: 1024, platform: 'ios', isTablet: true },
  { name: 'iPad Pro 11"', width: 834, height: 1194, platform: 'ios', isTablet: true },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, platform: 'ios', isTablet: true },

  // Android Phones
  { name: 'Pixel 5', width: 393, height: 851, platform: 'android', isTablet: false },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, platform: 'android', isTablet: false },

  // Android Tablets
  { name: 'Samsung Galaxy Tab S7', width: 800, height: 1280, platform: 'android', isTablet: true },
];

// Debug component for testing responsive layouts
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

const ResponsiveDebugOverlay: React.FC<{ visible?: boolean }> = ({
  visible = __DEV__
}) => {
  const { width, height } = useWindowDimensions();

  if (!visible) return null;

  const matchingDevice = DEVICE_CONFIGS.find(
    (d) => Math.abs(d.width - width) < 10 && Math.abs(d.height - height) < 20
  );

  return (
    <View style={debugStyles.overlay}>
      <Text style={debugStyles.text}>
        {Math.round(width)} x {Math.round(height)}
      </Text>
      {matchingDevice && (
        <Text style={debugStyles.deviceName}>{matchingDevice.name}</Text>
      )}
    </View>
  );
};

const debugStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deviceName: {
    color: '#4CAF50',
    fontSize: 10,
    marginTop: 2,
  },
});

export default ResponsiveDebugOverlay;
```

## Common Responsive Patterns

Here are some battle-tested patterns for common responsive scenarios:

### Responsive Card Grid

```typescript
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView, Image } from 'react-native';

interface CardData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface ResponsiveCardGridProps {
  data: CardData[];
}

const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({ data }) => {
  const { width } = useWindowDimensions();

  // Calculate card dimensions based on screen width
  const getCardConfig = () => {
    if (width < 375) return { columns: 1, imageHeight: 150 };
    if (width < 768) return { columns: 2, imageHeight: 120 };
    if (width < 1024) return { columns: 3, imageHeight: 140 };
    return { columns: 4, imageHeight: 160 };
  };

  const { columns, imageHeight } = getCardConfig();
  const spacing = 12;
  const cardWidth = (width - spacing * (columns + 1)) / columns;

  return (
    <ScrollView contentContainerStyle={cardStyles.container}>
      <View style={cardStyles.grid}>
        {data.map((item) => (
          <View
            key={item.id}
            style={[
              cardStyles.card,
              {
                width: cardWidth,
                margin: spacing / 2,
              },
            ]}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={[cardStyles.image, { height: imageHeight }]}
              resizeMode="cover"
            />
            <View style={cardStyles.cardContent}>
              <Text style={cardStyles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={cardStyles.description} numberOfLines={3}>
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    padding: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ResponsiveCardGrid;
```

### Adaptive Navigation

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface AdaptiveNavigationProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

const AdaptiveNavigation: React.FC<AdaptiveNavigationProps> = ({
  items,
  activeKey,
  onSelect,
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;

  if (isWideScreen) {
    // Sidebar navigation for tablets/desktop
    return (
      <View style={navStyles.sidebar}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              navStyles.sidebarItem,
              activeKey === item.key && navStyles.sidebarItemActive,
            ]}
            onPress={() => onSelect(item.key)}
          >
            <Text style={navStyles.sidebarIcon}>{item.icon}</Text>
            <Text style={[
              navStyles.sidebarLabel,
              activeKey === item.key && navStyles.sidebarLabelActive,
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Bottom tab navigation for phones
  return (
    <View style={navStyles.bottomTabs}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={navStyles.tabItem}
          onPress={() => onSelect(item.key)}
        >
          <Text style={[
            navStyles.tabIcon,
            activeKey === item.key && navStyles.tabIconActive,
          ]}>
            {item.icon}
          </Text>
          <Text style={[
            navStyles.tabLabel,
            activeKey === item.key && navStyles.tabLabelActive,
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const navStyles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#f8f9fa',
    paddingVertical: 20,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 2,
  },
  sidebarItemActive: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  sidebarIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sidebarLabel: {
    fontSize: 15,
    color: '#333',
  },
  sidebarLabelActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabIconActive: {
    color: '#2196F3',
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
  },
  tabLabelActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default AdaptiveNavigation;
```

### Responsive Modal

```typescript
import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from 'react-native';

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const modalWidth = isLargeScreen ? Math.min(600, width * 0.8) : width;
  const modalHeight = isLargeScreen ? Math.min(500, height * 0.8) : height;

  return (
    <Modal
      visible={visible}
      animationType={isLargeScreen ? 'fade' : 'slide'}
      transparent={isLargeScreen}
      onRequestClose={onClose}
    >
      <View style={[
        modalStyles.overlay,
        isLargeScreen && modalStyles.overlayLarge,
      ]}>
        <View style={[
          modalStyles.container,
          {
            width: modalWidth,
            maxHeight: modalHeight,
          },
          isLargeScreen && modalStyles.containerLarge,
        ]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Text style={modalStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.content}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  overlayLarge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerLarge: {
    flex: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#2196F3',
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
});

export default ResponsiveModal;
```

## Conclusion

Creating responsive layouts in React Native requires a combination of proper dimension handling, flexible layouts, and thoughtful consideration of different device characteristics. By leveraging the `useWindowDimensions` hook, implementing breakpoint strategies, and following platform-specific guidelines, you can build applications that provide an excellent user experience across all devices.

Key takeaways for building responsive React Native applications:

1. **Use `useWindowDimensions`** for reactive dimension updates rather than the static `Dimensions.get()` method.

2. **Implement a consistent breakpoint system** to maintain design consistency across your application.

3. **Consider font scaling** to ensure readability across different screen sizes and user accessibility settings.

4. **Leverage Flexbox** for flexible layouts that adapt naturally to available space.

5. **Design specifically for tablets** by utilizing split views and multi-column layouts when extra screen real estate is available.

6. **Handle orientation changes** gracefully with layouts that work in both portrait and landscape modes.

7. **Account for safe areas** on devices with notches, rounded corners, and home indicators.

8. **Test thoroughly** across multiple devices and simulators to ensure your responsive designs work as intended.

By following these principles and patterns, you can create React Native applications that look great and function perfectly on any device your users might have.
