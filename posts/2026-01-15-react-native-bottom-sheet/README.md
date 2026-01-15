# How to Build a Custom Bottom Sheet Component in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Bottom Sheet, UI Components, Gestures, Mobile Development, UX

Description: Learn how to build a custom bottom sheet component in React Native with smooth gestures and snap points.

---

Bottom sheets have become one of the most popular UI patterns in mobile applications. From Apple Maps to Google Maps, from Uber to Instagram, these sliding panels provide an elegant way to present secondary content without navigating away from the current screen. In this comprehensive guide, we'll explore how to build a production-ready bottom sheet component in React Native, covering everything from basic implementation to advanced features like gesture handling, snap points, and accessibility.

## Understanding Bottom Sheet UX Patterns

Before diving into code, let's understand when and why to use bottom sheets. A bottom sheet is a surface anchored to the bottom of the screen that slides up to reveal additional content. They're particularly useful for:

- **Contextual actions**: Showing options related to the current screen
- **Filtering and sorting**: Presenting filter options without leaving a list view
- **Quick previews**: Displaying item details before full navigation
- **Forms and inputs**: Collecting user input without a full-screen modal
- **Navigation menus**: Secondary navigation in complex applications

Bottom sheets come in two primary varieties:

1. **Modal bottom sheets**: Overlay the entire screen with a backdrop and block interaction with underlying content
2. **Persistent (inline) bottom sheets**: Remain visible alongside other content and allow simultaneous interaction

The choice between these depends on your use case. Modal sheets work best for focused tasks requiring user attention, while persistent sheets excel at progressive disclosure of information.

## Setting Up @gorhom/bottom-sheet

The `@gorhom/bottom-sheet` library is the most popular and feature-rich solution for bottom sheets in React Native. Let's start by setting it up in your project.

### Installation

```bash
# Using npm
npm install @gorhom/bottom-sheet

# Using yarn
yarn add @gorhom/bottom-sheet
```

This library depends on `react-native-reanimated` and `react-native-gesture-handler`. Install them if you haven't already:

```bash
npm install react-native-reanimated react-native-gesture-handler
```

For iOS, run pod install:

```bash
cd ios && pod install && cd ..
```

### Configuration

Update your `babel.config.js` to include the Reanimated plugin:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

Wrap your app with `GestureHandlerRootView`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Your app content */}
    </GestureHandlerRootView>
  );
}
```

### Basic Usage

Here's a simple bottom sheet implementation using the library:

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

const BasicBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Define snap points - these are the positions where the sheet will snap to
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('Sheet snapped to index:', index);
  }, []);

  const handleOpenPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Open Sheet" onPress={handleOpenPress} />
      <Button title="Close Sheet" onPress={handleClosePress} />

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Awesome Bottom Sheet</Text>
          <Text>Swipe down to dismiss or up to expand</Text>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});

export default BasicBottomSheet;
```

## Building a Custom Bottom Sheet from Scratch

While `@gorhom/bottom-sheet` is excellent, understanding how to build one from scratch deepens your knowledge of React Native animations and gestures. Let's create a custom implementation.

### Setting Up the Foundation

```tsx
import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

export interface BottomSheetRef {
  scrollTo: (destination: number) => void;
  isActive: () => boolean;
}

interface BottomSheetProps {
  children: React.ReactNode;
  onClose?: () => void;
  snapPoints?: number[];
}

const CustomBottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, onClose, snapPoints = [-200, -SCREEN_HEIGHT / 2, MAX_TRANSLATE_Y] }, ref) => {
    const translateY = useSharedValue(0);
    const active = useSharedValue(false);
    const context = useSharedValue({ y: 0 });

    const scrollTo = useCallback((destination: number) => {
      'worklet';
      active.value = destination !== 0;
      translateY.value = withSpring(destination, {
        damping: 50,
        stiffness: 300,
      });
    }, []);

    const isActive = useCallback(() => {
      return active.value;
    }, []);

    useImperativeHandle(ref, () => ({
      scrollTo,
      isActive,
    }), [scrollTo, isActive]);

    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = { y: translateY.value };
      })
      .onUpdate((event) => {
        translateY.value = event.translationY + context.value.y;
        translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
      })
      .onEnd((event) => {
        // Find the closest snap point
        const velocityThreshold = 500;
        let targetSnapPoint = snapPoints[0];

        if (event.velocityY < -velocityThreshold) {
          // Fast upward swipe - go to highest snap point
          targetSnapPoint = snapPoints[snapPoints.length - 1];
        } else if (event.velocityY > velocityThreshold) {
          // Fast downward swipe - close or go to lowest snap point
          if (translateY.value > snapPoints[0] / 2) {
            targetSnapPoint = 0;
            if (onClose) {
              runOnJS(onClose)();
            }
          } else {
            targetSnapPoint = snapPoints[0];
          }
        } else {
          // Find closest snap point based on position
          let minDistance = Infinity;
          for (const point of snapPoints) {
            const distance = Math.abs(translateY.value - point);
            if (distance < minDistance) {
              minDistance = distance;
              targetSnapPoint = point;
            }
          }
        }

        scrollTo(targetSnapPoint);
      });

    const rBottomSheetStyle = useAnimatedStyle(() => {
      const borderRadius = interpolate(
        translateY.value,
        [MAX_TRANSLATE_Y + 50, MAX_TRANSLATE_Y],
        [25, 5],
        Extrapolation.CLAMP
      );

      return {
        borderRadius,
        transform: [{ translateY: translateY.value }],
      };
    });

    const rBackdropStyle = useAnimatedStyle(() => {
      const opacity = interpolate(
        translateY.value,
        [0, MAX_TRANSLATE_Y],
        [0, 0.5],
        Extrapolation.CLAMP
      );

      return {
        opacity,
      };
    });

    const handleBackdropPress = useCallback(() => {
      scrollTo(0);
      onClose?.();
    }, [onClose, scrollTo]);

    return (
      <>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View style={[styles.backdrop, rBackdropStyle]} />
        </TouchableWithoutFeedback>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: 'white',
    position: 'absolute',
    top: SCREEN_HEIGHT,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
});

export default CustomBottomSheet;
```

## Snap Points Configuration

Snap points define the positions where the bottom sheet will settle after a gesture ends. Understanding how to configure them properly is crucial for a good user experience.

### Types of Snap Points

```tsx
import React, { useMemo } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';

const SnapPointsExample: React.FC = () => {
  // Percentage-based snap points
  const percentageSnapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Pixel-based snap points
  const pixelSnapPoints = useMemo(() => [200, 400, 600], []);

  // Mixed snap points
  const mixedSnapPoints = useMemo(() => [100, '50%', '90%'], []);

  // Dynamic snap points based on content
  const contentHeight = 350;
  const dynamicSnapPoints = useMemo(
    () => [contentHeight, '75%'],
    [contentHeight]
  );

  return (
    <BottomSheet snapPoints={percentageSnapPoints}>
      {/* Content */}
    </BottomSheet>
  );
};
```

### Dynamic Snap Points

For content with variable heights, you can calculate snap points dynamically:

```tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const DynamicContentBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['CONTENT_HEIGHT'], []);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    // You can update snap points based on content height
    console.log('Content height:', height);
  }, []);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enableDynamicSizing={true}
    >
      <BottomSheetView onLayout={handleContentLayout}>
        <View style={styles.content}>
          <Text>Dynamic content goes here</Text>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
});
```

## Gesture Handling

Proper gesture handling is what makes a bottom sheet feel native and responsive. Let's explore advanced gesture configurations.

### Custom Gesture Configuration

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDecay,
} from 'react-native-reanimated';

const GestureBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Configure overdrag behavior
  const handleOverDrag = useCallback((overdragAmount: number) => {
    // Apply resistance when dragging beyond bounds
    return Math.pow(overdragAmount, 0.7);
  }, []);

  // Custom animation configuration
  const animationConfigs = useMemo(
    () => ({
      damping: 80,
      overshootClamping: true,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.1,
      stiffness: 500,
    }),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableOverDrag={true}
      enablePanDownToClose={true}
      animationConfigs={animationConfigs}
      overDragResistanceFactor={2.5}
    >
      <View style={styles.content}>
        {/* Content */}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
});
```

### Gesture Priority and Conflicts

When your bottom sheet contains scrollable content, you need to handle gesture conflicts:

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const ScrollableBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Handle gesture conflicts between sheet and scroll
  const handleGestureEnabled = useCallback(
    (contentOffset: number, sheetPosition: number) => {
      // Disable sheet gesture when content is scrolled
      return contentOffset <= 0;
    },
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
    >
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scrollable content */}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
```

## Backdrop Implementation

A backdrop adds visual hierarchy and provides a tap-to-dismiss functionality. Here's how to implement custom backdrops:

```tsx
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface CustomBackdropProps {
  animatedIndex: Animated.SharedValue<number>;
  style?: any;
  onPress?: () => void;
}

const CustomBackdrop: React.FC<CustomBackdropProps> = ({
  animatedIndex,
  style,
  onPress,
}) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0, 1],
      [0, 0.5, 0.7],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Pressable onPress={onPress} style={[styles.backdrop, style]}>
      <Animated.View
        style={[
          styles.backdropBackground,
          containerAnimatedStyle,
        ]}
      />
    </Pressable>
  );
};

const BackdropBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Or use custom backdrop
  const renderCustomBackdrop = useCallback(
    (props: any) => (
      <CustomBackdrop
        {...props}
        onPress={() => {
          // Handle backdrop press
        }}
      />
    ),
    []
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
    >
      {/* Content */}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropBackground: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BackdropBottomSheet;
```

## Keyboard Handling

Bottom sheets often contain forms and inputs. Proper keyboard handling ensures a smooth user experience:

```tsx
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';

const KeyboardAwareBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Track keyboard state
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      // Expand sheet when keyboard appears
      bottomSheetRef.current?.expand();
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      // Optionally collapse when keyboard hides
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.form}>
          {/* Use BottomSheetTextInput for proper focus handling */}
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
          />
          <BottomSheetTextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your message"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});

export default KeyboardAwareBottomSheet;
```

## Nested Scrolling

Handling nested scrollable content requires special attention to prevent gesture conflicts:

```tsx
import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetSectionList,
} from '@gorhom/bottom-sheet';

interface ListItem {
  id: string;
  title: string;
}

const NestedScrollBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['30%', '60%', '90%'], []);

  // Generate sample data
  const data: ListItem[] = useMemo(
    () =>
      Array.from({ length: 50 }, (_, index) => ({
        id: `item-${index}`,
        title: `Item ${index + 1}`,
      })),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <View style={styles.listItem}>
        <Text style={styles.itemText}>{item.title}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enableContentPanningGesture={true}
    >
      {/* Use BottomSheetFlatList instead of regular FlatList */}
      <BottomSheetFlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        // Enable scroll indicator
        showsVerticalScrollIndicator={true}
        // Improve performance for long lists
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </BottomSheet>
  );
};

// For section-based data
const SectionListBottomSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['30%', '60%', '90%'], []);

  const sections = useMemo(
    () => [
      {
        title: 'Recent',
        data: ['Item 1', 'Item 2', 'Item 3'],
      },
      {
        title: 'Popular',
        data: ['Item 4', 'Item 5', 'Item 6'],
      },
      {
        title: 'All',
        data: ['Item 7', 'Item 8', 'Item 9'],
      },
    ],
    []
  );

  return (
    <BottomSheet snapPoints={snapPoints}>
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(item, index) => item + index}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item}</Text>
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NestedScrollBottomSheet;
```

## Dynamic Content Sizing

When your bottom sheet content has variable heights, dynamic sizing ensures the sheet adapts properly:

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  useBottomSheetDynamicSnapPoints,
} from '@gorhom/bottom-sheet';

const DynamicSizingBottomSheet: React.FC = () => {
  const [items, setItems] = useState<string[]>(['Item 1', 'Item 2']);

  // Enable dynamic sizing
  const initialSnapPoints = useMemo(() => ['CONTENT_HEIGHT'], []);

  const {
    animatedHandleHeight,
    animatedSnapPoints,
    animatedContentHeight,
    handleContentLayout,
  } = useBottomSheetDynamicSnapPoints(initialSnapPoints);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, `Item ${prev.length + 1}`]);
  }, []);

  const removeItem = useCallback(() => {
    setItems((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <BottomSheet
      snapPoints={animatedSnapPoints}
      handleHeight={animatedHandleHeight}
      contentHeight={animatedContentHeight}
      enablePanDownToClose={true}
    >
      <BottomSheetView
        style={styles.contentContainer}
        onLayout={handleContentLayout}
      >
        <Text style={styles.title}>Dynamic Content</Text>

        <View style={styles.buttonRow}>
          <Button title="Add Item" onPress={addItem} />
          <Button title="Remove Item" onPress={removeItem} />
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </BottomSheetView>
    </BottomSheet>
  );
};

// Alternative: Using maxDynamicContentSize
const ConstrainedDynamicSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['CONTENT_HEIGHT'], []);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enableDynamicSizing={true}
      maxDynamicContentSize={500} // Maximum height in pixels
    >
      <BottomSheetView>
        {/* Content */}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  item: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 16,
  },
});

export default DynamicSizingBottomSheet;
```

## Modal vs Inline Bottom Sheets

Understanding when to use modal versus inline bottom sheets is essential for good UX:

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Modal Bottom Sheet - blocks background interaction
const ModalExample: React.FC = () => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const handlePresentModal = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleDismissModal = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <Button title="Open Modal Sheet" onPress={handlePresentModal} />

        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backdropComponent={(props) => (
            <View {...props} style={[props.style, styles.modalBackdrop]} />
          )}
        >
          <View style={styles.modalContent}>
            <Text style={styles.title}>Modal Bottom Sheet</Text>
            <Text>This blocks interaction with the background.</Text>
            <Button title="Dismiss" onPress={handleDismissModal} />
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
};

// Inline/Persistent Bottom Sheet - allows background interaction
const InlineExample: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '40%', '90%'], []);

  return (
    <View style={styles.container}>
      {/* Main content remains interactive */}
      <View style={styles.mainContent}>
        <Text style={styles.title}>Main Content</Text>
        <Button title="Interact with me" onPress={() => {}} />
      </View>

      {/* Inline bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        // No backdrop - main content stays interactive
      >
        <View style={styles.sheetContent}>
          <Text style={styles.title}>Inline Bottom Sheet</Text>
          <Text>Background remains interactive.</Text>
        </View>
      </BottomSheet>
    </View>
  );
};

// Hybrid approach - modal behavior with partial background interaction
const HybridExample: React.FC = () => {
  const snapPoints = useMemo(() => ['30%', '70%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        opacity={0.3}
        pressBehavior="collapse"
      />
    ),
    []
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
    >
      <View style={styles.sheetContent}>
        <Text style={styles.title}>Hybrid Bottom Sheet</Text>
        <Text>Shows backdrop only when expanded past first snap point.</Text>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  sheetContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export { ModalExample, InlineExample, HybridExample };
```

## Accessibility Features

Making your bottom sheet accessible ensures all users can interact with it effectively:

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

const AccessibleBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const contentRef = useRef<View>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Focus management for screen readers
  const handleSheetChange = useCallback((index: number) => {
    if (index >= 0 && contentRef.current) {
      // Move screen reader focus to sheet content when opened
      const reactTag = findNodeHandle(contentRef.current);
      if (reactTag) {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }
  }, []);

  // Announce state changes
  const announceStateChange = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.expand();
    announceStateChange('Bottom sheet opened');
  }, [announceStateChange]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    announceStateChange('Bottom sheet closed');
  }, [announceStateChange]);

  return (
    <View style={styles.container}>
      <Button
        title="Open Sheet"
        onPress={handleOpen}
        accessibilityLabel="Open bottom sheet"
        accessibilityHint="Opens a panel from the bottom of the screen"
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        handleIndicatorStyle={styles.handle}
        // Accessibility props
        accessibilityLabel="Bottom sheet"
        accessibilityRole="adjustable"
        accessibilityHint="Swipe up or down to resize"
      >
        <View
          ref={contentRef}
          style={styles.content}
          accessible={true}
          accessibilityRole="dialog"
          accessibilityLabel="Bottom sheet content"
        >
          <Text style={styles.title} accessibilityRole="header">
            Accessible Bottom Sheet
          </Text>

          <Text style={styles.description}>
            This bottom sheet is fully accessible with screen readers.
            Swipe up to expand or down to collapse.
          </Text>

          <Button
            title="Close"
            onPress={handleClose}
            accessibilityLabel="Close bottom sheet"
            accessibilityHint="Closes this panel"
          />
        </View>
      </BottomSheet>
    </View>
  );
};

// Custom accessible handle component
const AccessibleHandle: React.FC = () => {
  return (
    <View
      style={styles.handleContainer}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Bottom sheet handle"
      accessibilityHint="Drag to resize the bottom sheet"
    >
      <View style={styles.handle} />
    </View>
  );
};

// With keyboard navigation support
const KeyboardNavigableSheet: React.FC = () => {
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      keyboardBehavior="extend"
      // Enable focus trap within sheet
      focusHook={useFocusEffect}
    >
      <View style={styles.content}>
        {/* Tab-navigable content */}
        <Button title="First Action" onPress={() => {}} />
        <Button title="Second Action" onPress={() => {}} />
        <Button title="Close" onPress={() => {}} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
});

export default AccessibleBottomSheet;
```

## Testing Bottom Sheets

Comprehensive testing ensures your bottom sheet works correctly across different scenarios:

```tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    {children}
  </GestureHandlerRootView>
);

// Mock the bottom sheet for unit tests
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(({ children, testID }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        collapse: jest.fn(),
        close: jest.fn(),
        snapToIndex: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    }),
  };
});

// Component under test
const MyBottomSheet: React.FC<{
  onOpen?: () => void;
  onClose?: () => void;
}> = ({ onOpen, onClose }) => {
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  return (
    <TestWrapper>
      <Button
        testID="open-button"
        title="Open"
        onPress={() => {
          bottomSheetRef.current?.expand();
          onOpen?.();
        }}
      />
      <BottomSheet
        ref={bottomSheetRef}
        testID="bottom-sheet"
        snapPoints={['25%', '50%']}
      >
        <View testID="sheet-content">
          <Text>Sheet Content</Text>
          <Button
            testID="close-button"
            title="Close"
            onPress={() => {
              bottomSheetRef.current?.close();
              onClose?.();
            }}
          />
        </View>
      </BottomSheet>
    </TestWrapper>
  );
};

// Test suite
describe('MyBottomSheet', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MyBottomSheet />);
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('calls onOpen when opened', async () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(<MyBottomSheet onOpen={onOpen} />);

    fireEvent.press(getByTestId('open-button'));

    await waitFor(() => {
      expect(onOpen).toHaveBeenCalled();
    });
  });

  it('calls onClose when closed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<MyBottomSheet onClose={onClose} />);

    fireEvent.press(getByTestId('close-button'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays content correctly', () => {
    const { getByText } = render(<MyBottomSheet />);
    expect(getByText('Sheet Content')).toBeTruthy();
  });
});

// Integration tests with Detox
describe('BottomSheet E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should open bottom sheet on button press', async () => {
    await element(by.id('open-button')).tap();
    await expect(element(by.id('sheet-content'))).toBeVisible();
  });

  it('should close on swipe down', async () => {
    await element(by.id('open-button')).tap();
    await element(by.id('bottom-sheet')).swipe('down', 'fast');
    await expect(element(by.id('sheet-content'))).not.toBeVisible();
  });

  it('should snap to correct positions', async () => {
    await element(by.id('open-button')).tap();
    await element(by.id('bottom-sheet')).swipe('up', 'slow', 0.5);
    // Verify snap position through visual comparison or layout checks
  });
});

// Snapshot testing
describe('BottomSheet Snapshots', () => {
  it('matches snapshot when closed', () => {
    const tree = render(<MyBottomSheet />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when open', async () => {
    const { getByTestId, toJSON } = render(<MyBottomSheet />);
    fireEvent.press(getByTestId('open-button'));

    await waitFor(() => {
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
```

## Performance Optimization Tips

To ensure smooth performance with bottom sheets:

```tsx
import React, { useMemo, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

// Memoize list items
const ListItem = memo<{ title: string }>(({ title }) => (
  <View style={styles.item}>
    <Text>{title}</Text>
  </View>
));

const OptimizedBottomSheet: React.FC = () => {
  // Memoize snap points
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  // Memoize render function
  const renderItem = useCallback(
    ({ item }: { item: any }) => <ListItem title={item.title} />,
    []
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Avoid inline functions in animation configs
  const animationConfigs = useMemo(
    () => ({
      damping: 80,
      stiffness: 500,
    }),
    []
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      animationConfigs={animationConfigs}
      // Disable expensive effects when not needed
      enableOverDrag={false}
      // Use native driver for better performance
      animateOnMount={false}
    >
      <BottomSheetFlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </BottomSheet>
  );
};

const ITEM_HEIGHT = 60;

const styles = StyleSheet.create({
  item: {
    height: ITEM_HEIGHT,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default OptimizedBottomSheet;
```

## Conclusion

Building a custom bottom sheet component in React Native requires understanding gesture handling, animations, and proper component architecture. Whether you use the excellent `@gorhom/bottom-sheet` library or build your own from scratch, the key principles remain the same:

1. **Smooth gestures**: Use Reanimated and Gesture Handler for 60fps animations
2. **Flexible snap points**: Support both percentage and pixel-based positioning
3. **Proper keyboard handling**: Ensure forms remain usable when the keyboard appears
4. **Accessibility**: Make your component usable by everyone
5. **Performance**: Memoize callbacks and use native drivers where possible

Bottom sheets are a powerful UX pattern that, when implemented correctly, provide an intuitive way for users to interact with your app. By following the patterns and practices outlined in this guide, you can create production-ready bottom sheet components that feel native and responsive.

Remember to test your implementation thoroughly across different devices and screen sizes, and always consider the accessibility needs of all your users. Happy coding!
