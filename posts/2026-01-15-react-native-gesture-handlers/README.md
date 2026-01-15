# How to Build Custom Gesture Handlers in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Gesture Handler, Touch, Animations, Mobile Development, UI/UX

Description: Learn how to build custom gesture handlers in React Native using react-native-gesture-handler for interactive user experiences.

---

Touch interactions are at the heart of mobile applications. Users expect smooth, responsive gestures that feel natural and intuitive. In this comprehensive guide, we will explore how to build custom gesture handlers in React Native using the powerful `react-native-gesture-handler` library.

## Table of Contents

1. [Introduction to Gesture Handling](#introduction-to-gesture-handling)
2. [Gesture Handler vs PanResponder](#gesture-handler-vs-panresponder)
3. [Setting Up Gesture Handler](#setting-up-gesture-handler)
4. [Tap Gestures](#tap-gestures)
5. [Pan Gestures](#pan-gestures)
6. [Pinch and Rotation Gestures](#pinch-and-rotation-gestures)
7. [Long Press Handling](#long-press-handling)
8. [Fling Gestures](#fling-gestures)
9. [Composing Multiple Gestures](#composing-multiple-gestures)
10. [Gesture States](#gesture-states)
11. [Integration with Reanimated](#integration-with-reanimated)
12. [Custom Gesture Recognizers](#custom-gesture-recognizers)
13. [Performance Considerations](#performance-considerations)

## Introduction to Gesture Handling

Gesture handling in mobile applications involves detecting and responding to user touch interactions such as taps, swipes, pinches, and rotations. React Native provides several ways to handle gestures, but the `react-native-gesture-handler` library has become the de facto standard due to its performance and flexibility.

The library runs gesture recognition on the native thread, which means smoother animations and better responsiveness compared to JavaScript-based solutions. This is crucial for creating fluid user experiences in your mobile applications.

## Gesture Handler vs PanResponder

Before diving into `react-native-gesture-handler`, let us understand how it compares to React Native's built-in `PanResponder`.

### PanResponder Limitations

```typescript
import { PanResponder, View, Animated } from 'react-native';
import { useRef } from 'react';

const PanResponderExample: React.FC = () => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false } // Cannot use native driver
      ),
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[pan.getLayout()]}
    />
  );
};
```

**Problems with PanResponder:**
- Runs entirely on the JavaScript thread
- Cannot use native driver for gesture-driven animations
- Complex gesture composition is difficult
- No built-in gesture state management
- Performance issues with complex interactions

### Gesture Handler Advantages

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const GestureHandlerExample: React.FC = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle} />
    </GestureDetector>
  );
};
```

**Advantages of Gesture Handler:**
- Runs on the native UI thread
- Native driver support through Reanimated integration
- Built-in gesture states (BEGAN, ACTIVE, END, CANCELLED, FAILED)
- Easy gesture composition (simultaneous, exclusive, sequential)
- Better performance and smoother animations
- Declarative API with Gesture object

## Setting Up Gesture Handler

### Installation

```bash
# Using npm
npm install react-native-gesture-handler react-native-reanimated

# Using yarn
yarn add react-native-gesture-handler react-native-reanimated
```

### iOS Setup

For iOS, run pod install:

```bash
cd ios && pod install
```

### Android Setup

Update your `MainActivity.java` or `MainActivity.kt`:

```kotlin
// MainActivity.kt
package com.yourapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "YourApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

### App Entry Point Configuration

Wrap your app with `GestureHandlerRootView`:

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <YourAppContent />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
```

## Tap Gestures

Tap gestures are the most basic form of touch interaction. The library provides `Gesture.Tap()` for single taps and supports double taps and multiple consecutive taps.

### Single Tap

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, Text } from 'react-native';

interface TapButtonProps {
  onTap: () => void;
  label: string;
}

const TapButton: React.FC<TapButtonProps> = ({ onTap, label }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withTiming(0.95, { duration: 100 });
      opacity.value = withTiming(0.8, { duration: 100 });
    })
    .onEnd(() => {
      onTap();
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 100 });
      opacity.value = withTiming(1, { duration: 100 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text style={styles.buttonText}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Double Tap

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 32;

interface ZoomableImageProps {
  source: { uri: string };
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ source }) => {
  const scale = useSharedValue(1);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = scale.value === 1 ? withSpring(2) : withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={doubleTapGesture}>
      <Animated.Image
        source={source}
        style={[styles.image, animatedStyle]}
        resizeMode="cover"
      />
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
  },
});
```

### Distinguishing Single and Double Taps

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

interface TapHandlerProps {
  onSingleTap: () => void;
  onDoubleTap: () => void;
  children: React.ReactNode;
}

const TapHandler: React.FC<TapHandlerProps> = ({
  onSingleTap,
  onDoubleTap,
  children,
}) => {
  const backgroundColor = useSharedValue('#E0E0E0');

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      backgroundColor.value = withSequence(
        withTiming('#4CAF50', { duration: 100 }),
        withTiming('#E0E0E0', { duration: 300 })
      );
      runOnJS(onSingleTap)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      backgroundColor.value = withSequence(
        withTiming('#2196F3', { duration: 100 }),
        withTiming('#E0E0E0', { duration: 300 })
      );
      runOnJS(onDoubleTap)();
    });

  // Double tap takes precedence over single tap
  const composedGesture = Gesture.Exclusive(doubleTap, singleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
  },
});
```

## Pan Gestures

Pan gestures allow users to drag elements across the screen. This is essential for creating draggable components, sliders, and interactive UIs.

### Basic Draggable Component

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StyleSheet, Text } from 'react-native';

interface DraggableBoxProps {
  snapToOrigin?: boolean;
}

const DraggableBox: React.FC<DraggableBoxProps> = ({ snapToOrigin = true }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });
  const isPressed = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
      isPressed.value = true;
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;
    })
    .onEnd((event) => {
      isPressed.value = false;
      if (snapToOrigin) {
        translateX.value = withSpring(0, { damping: 20 });
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(isPressed.value ? 1.1 : 1) },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.box, animatedStyle]}>
        <Text style={styles.boxText}>Drag Me</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 120,
    height: 120,
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Swipeable List Item

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { StyleSheet, Text, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableItemProps {
  title: string;
  onDelete: () => void;
  onArchive: () => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  title,
  onDelete,
  onArchive,
}) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldDelete = translateX.value < -SWIPE_THRESHOLD;
      const shouldArchive = translateX.value > SWIPE_THRESHOLD;

      if (shouldDelete) {
        translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
          runOnJS(onDelete)();
        });
      } else if (shouldArchive) {
        translateX.value = withTiming(SCREEN_WIDTH, {}, () => {
          runOnJS(onArchive)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const archiveActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteAction, deleteActionStyle]}>
        <Text style={styles.actionText}>Delete</Text>
      </Animated.View>
      <Animated.View style={[styles.archiveAction, archiveActionStyle]}>
        <Text style={styles.actionText}>Archive</Text>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.item, itemStyle]}>
          <Text style={styles.itemText}>{title}</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  item: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemText: {
    fontSize: 16,
    color: '#333333',
  },
  deleteAction: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  archiveAction: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#34C759',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## Pinch and Rotation Gestures

Pinch and rotation gestures are essential for image viewers, maps, and any content that users should be able to zoom and rotate.

### Pinch to Zoom

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 5;

interface PinchableImageProps {
  source: { uri: string };
}

const PinchableImage: React.FC<PinchableImageProps> = ({ source }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        savedScale.value = MIN_SCALE;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.Image
        source={source}
        style={[styles.image, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
```

### Rotation Gesture

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { StyleSheet, View, Text } from 'react-native';

const RotatableElement: React.FC = () => {
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}rad` }],
  }));

  return (
    <GestureDetector gesture={rotationGesture}>
      <Animated.View style={[styles.rotatable, animatedStyle]}>
        <Text style={styles.rotateText}>Rotate Me</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  rotatable: {
    width: 150,
    height: 150,
    backgroundColor: '#9B59B6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### Combined Pinch and Rotation

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TransformableImageProps {
  source: { uri: string };
}

const TransformableImage: React.FC<TransformableImageProps> = ({ source }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={source}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
```

## Long Press Handling

Long press gestures are used for context menus, drag-and-drop initiation, and secondary actions.

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, Text, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface LongPressableCardProps {
  title: string;
  onLongPress: () => void;
}

const LongPressableCard: React.FC<LongPressableCardProps> = ({
  title,
  onLongPress,
}) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('#FFFFFF');

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const showContextMenu = () => {
    Alert.alert(
      'Context Menu',
      'Choose an action',
      [
        { text: 'Edit', onPress: () => console.log('Edit') },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
    onLongPress();
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onBegin(() => {
      scale.value = withTiming(0.97, { duration: 200 });
      backgroundColor.value = withTiming('#F0F0F0', { duration: 200 });
    })
    .onStart(() => {
      runOnJS(triggerHaptic)();
      scale.value = withSequence(
        withTiming(0.95, { duration: 50 }),
        withSpring(1)
      );
      runOnJS(showContextMenu)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
      backgroundColor.value = withTiming('#FFFFFF', { duration: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardHint}>Long press for options</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 14,
    color: '#888888',
  },
});
```

## Fling Gestures

Fling gestures detect quick swipe movements in specific directions.

```typescript
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useState } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FlingCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const items = ['Card 1', 'Card 2', 'Card 3', 'Card 4', 'Card 5'];

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      translateX.value = withSequence(
        withTiming(-50, { duration: 100 }),
        withSpring(0)
      );
      runOnJS(goToNext)();
    });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      translateX.value = withSequence(
        withTiming(50, { duration: 100 }),
        withSpring(0)
      );
      runOnJS(goToPrevious)();
    });

  const composedFling = Gesture.Simultaneous(flingLeft, flingRight);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedFling}>
        <Animated.View style={[styles.carousel, animatedStyle]}>
          <Text style={styles.cardText}>{items[currentIndex]}</Text>
        </Animated.View>
      </GestureDetector>
      <View style={styles.indicators}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel: {
    width: SCREEN_WIDTH - 64,
    height: 200,
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
  },
  activeIndicator: {
    backgroundColor: '#6C5CE7',
    width: 24,
  },
});
```

## Composing Multiple Gestures

React Native Gesture Handler provides three ways to compose gestures: `Simultaneous`, `Exclusive`, and `Race`.

### Gesture Composition Types

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, Text, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GestureCompositionExample: React.FC = () => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Rotation Gesture
  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // Pan Gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double Tap to Reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      rotation.value = withSpring(0);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedRotation.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  // Simultaneous: All gestures can be active at the same time
  const simultaneousGestures = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture
  );

  // Race: First gesture to activate wins
  const raceGestures = Gesture.Race(panGesture, simultaneousGestures);

  // Exclusive: Only one gesture can be active, prioritized by order
  const finalGesture = Gesture.Exclusive(doubleTapGesture, raceGestures);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Pinch to zoom, rotate, drag to move, double tap to reset
      </Text>
      <GestureDetector gesture={finalGesture}>
        <Animated.View style={[styles.box, animatedStyle]}>
          <Text style={styles.boxText}>Transform Me</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  instruction: {
    position: 'absolute',
    top: 100,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  box: {
    width: 200,
    height: 200,
    backgroundColor: '#E74C3C',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

## Gesture States

Understanding gesture states is crucial for building responsive interactions.

```typescript
import { GestureDetector, Gesture, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

type GestureStateType = 'UNDETERMINED' | 'BEGAN' | 'ACTIVE' | 'END' | 'CANCELLED' | 'FAILED';

const GestureStateDemo: React.FC = () => {
  const [gestureState, setGestureState] = useState<GestureStateType>('UNDETERMINED');
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('#3498DB');

  const updateState = (state: GestureStateType) => {
    setGestureState(state);
  };

  const getStateColor = (state: number): string => {
    switch (state) {
      case State.UNDETERMINED:
        return '#95A5A6';
      case State.BEGAN:
        return '#F39C12';
      case State.ACTIVE:
        return '#27AE60';
      case State.END:
        return '#3498DB';
      case State.CANCELLED:
        return '#E74C3C';
      case State.FAILED:
        return '#C0392B';
      default:
        return '#95A5A6';
    }
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      backgroundColor.value = withTiming(getStateColor(State.BEGAN));
      runOnJS(updateState)('BEGAN');
    })
    .onStart(() => {
      backgroundColor.value = withTiming(getStateColor(State.ACTIVE));
      runOnJS(updateState)('ACTIVE');
    })
    .onUpdate(() => {
      scale.value = 1.1;
    })
    .onEnd(() => {
      backgroundColor.value = withTiming(getStateColor(State.END));
      scale.value = withTiming(1);
      runOnJS(updateState)('END');
    })
    .onFinalize((_, success) => {
      if (!success) {
        backgroundColor.value = withTiming(getStateColor(State.CANCELLED));
        runOnJS(updateState)('CANCELLED');
      }
      scale.value = withTiming(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.stateContainer}>
        <Text style={styles.stateLabel}>Current State:</Text>
        <Text style={styles.stateValue}>{gestureState}</Text>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.gestureArea, animatedStyle]}>
          <Text style={styles.gestureText}>Touch and drag</Text>
        </Animated.View>
      </GestureDetector>
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Gesture States:</Text>
        <Text style={styles.legendItem}>UNDETERMINED - Initial state</Text>
        <Text style={styles.legendItem}>BEGAN - Touch detected</Text>
        <Text style={styles.legendItem}>ACTIVE - Gesture recognized</Text>
        <Text style={styles.legendItem}>END - Gesture completed</Text>
        <Text style={styles.legendItem}>CANCELLED - Gesture cancelled</Text>
        <Text style={styles.legendItem}>FAILED - Gesture failed</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  stateContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    alignItems: 'center',
  },
  stateLabel: {
    fontSize: 18,
    color: '#333333',
    marginRight: 8,
  },
  stateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  gestureArea: {
    width: 200,
    height: 200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  legend: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  legendItem: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
});
```

## Integration with Reanimated

The true power of gesture handler comes from its integration with Reanimated for smooth, UI-thread animations.

### Worklet-Based Gesture Handling

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  clamp,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BALL_SIZE = 60;

interface BallPhysicsProps {
  onBoundaryHit?: (boundary: 'top' | 'bottom' | 'left' | 'right') => void;
}

const BallPhysics: React.FC<BallPhysicsProps> = ({ onBoundaryHit }) => {
  const translateX = useSharedValue(SCREEN_WIDTH / 2 - BALL_SIZE / 2);
  const translateY = useSharedValue(SCREEN_HEIGHT / 2 - BALL_SIZE / 2);
  const context = useSharedValue({ x: 0, y: 0 });

  const boundaries = {
    left: 0,
    right: SCREEN_WIDTH - BALL_SIZE,
    top: 100,
    bottom: SCREEN_HEIGHT - BALL_SIZE - 100,
  };

  // Monitor boundary collisions
  useAnimatedReaction(
    () => ({
      x: translateX.value,
      y: translateY.value,
    }),
    (current) => {
      if (onBoundaryHit) {
        if (current.x <= boundaries.left) {
          runOnJS(onBoundaryHit)('left');
        } else if (current.x >= boundaries.right) {
          runOnJS(onBoundaryHit)('right');
        }
        if (current.y <= boundaries.top) {
          runOnJS(onBoundaryHit)('top');
        } else if (current.y >= boundaries.bottom) {
          runOnJS(onBoundaryHit)('bottom');
        }
      }
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      translateX.value = clamp(
        context.value.x + event.translationX,
        boundaries.left,
        boundaries.right
      );
      translateY.value = clamp(
        context.value.y + event.translationY,
        boundaries.top,
        boundaries.bottom
      );
    })
    .onEnd((event) => {
      // Apply physics-based decay animation
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [boundaries.left, boundaries.right],
        rubberBandEffect: true,
        rubberBandFactor: 0.9,
      });
      translateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [boundaries.top, boundaries.bottom],
        rubberBandEffect: true,
        rubberBandFactor: 0.9,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.ball, animatedStyle]} />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#E94560',
    position: 'absolute',
  },
});
```

## Custom Gesture Recognizers

You can create custom gesture recognizers by composing built-in gestures or using manual gesture handling.

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { useState, useCallback } from 'react';

type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null;

interface SwipePatternProps {
  pattern: SwipeDirection[];
  onPatternMatch: () => void;
  children: React.ReactNode;
}

const SwipePatternGesture: React.FC<SwipePatternProps> = ({
  pattern,
  onPatternMatch,
  children,
}) => {
  const [currentPattern, setCurrentPattern] = useState<SwipeDirection[]>([]);
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('#3498DB');

  const SWIPE_THRESHOLD = 50;
  const VELOCITY_THRESHOLD = 500;

  const addSwipe = useCallback((direction: SwipeDirection) => {
    setCurrentPattern((prev) => {
      const newPattern = [...prev, direction];

      // Check if pattern matches
      if (newPattern.length === pattern.length) {
        const matches = newPattern.every((dir, index) => dir === pattern[index]);
        if (matches) {
          onPatternMatch();
        }
        return [];
      }

      // Check if pattern is still possible
      const stillPossible = newPattern.every(
        (dir, index) => dir === pattern[index]
      );

      if (!stillPossible) {
        return [];
      }

      return newPattern;
    });
  }, [pattern, onPatternMatch]);

  const getSwipeDirection = (
    translationX: number,
    translationY: number,
    velocityX: number,
    velocityY: number
  ): SwipeDirection => {
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const absVelX = Math.abs(velocityX);
    const absVelY = Math.abs(velocityY);

    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
      return null;
    }

    if (absX > absY) {
      if (translationX > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) {
        return 'right';
      }
      if (translationX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD) {
        return 'left';
      }
    } else {
      if (translationY > SWIPE_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        return 'down';
      }
      if (translationY < -SWIPE_THRESHOLD || velocityY < -VELOCITY_THRESHOLD) {
        return 'up';
      }
    }

    return null;
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withTiming(0.98, { duration: 100 });
    })
    .onEnd((event) => {
      const direction = getSwipeDirection(
        event.translationX,
        event.translationY,
        event.velocityX,
        event.velocityY
      );

      if (direction) {
        backgroundColor.value = withSequence(
          withTiming('#27AE60', { duration: 100 }),
          withTiming('#3498DB', { duration: 300 })
        );
        runOnJS(addSwipe)(direction);
      }

      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.patternDisplay}>
        <Text style={styles.patternLabel}>Pattern: {pattern.join(' -> ')}</Text>
        <Text style={styles.currentLabel}>
          Current: {currentPattern.length > 0 ? currentPattern.join(' -> ') : 'None'}
        </Text>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.gestureArea, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// Usage Example
const PatternUnlockDemo: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = () => {
    setUnlocked(true);
    setTimeout(() => setUnlocked(false), 2000);
  };

  return (
    <SwipePatternGesture
      pattern={['up', 'right', 'down', 'left']}
      onPatternMatch={handleUnlock}
    >
      <Text style={styles.unlockText}>
        {unlocked ? 'Unlocked!' : 'Swipe: Up -> Right -> Down -> Left'}
      </Text>
    </SwipePatternGesture>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  patternDisplay: {
    marginBottom: 20,
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  currentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  gestureArea: {
    width: 250,
    height: 250,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

## Performance Considerations

Optimizing gesture performance is crucial for smooth user experiences.

### Best Practices

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { memo, useCallback } from 'react';

// 1. Memoize gesture handlers
interface DraggableItemProps {
  id: string;
  title: string;
}

const DraggableItem: React.FC<DraggableItemProps> = memo(({ id, title }) => {
  const translateX = useSharedValue(0);
  const isActive = useSharedValue(false);

  // 2. Use useDerivedValue for computed values
  const shadowOpacity = useDerivedValue(() => {
    return interpolate(
      isActive.value ? 1 : 0,
      [0, 1],
      [0.1, 0.3],
      Extrapolation.CLAMP
    );
  });

  // 3. Minimize worklet complexity
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isActive.value = true;
    })
    .onUpdate((event) => {
      // Keep worklet logic simple
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      isActive.value = false;
      translateX.value = withSpring(0);
    });

  // 4. Use useAnimatedStyle efficiently
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.item, animatedStyle]}>
        <Text style={styles.itemText}>{title}</Text>
      </Animated.View>
    </GestureDetector>
  );
});

// 5. Optimize list rendering with gesture handlers
const GestureListExample: React.FC = () => {
  const data = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i + 1}`,
  }));

  const renderItem = useCallback(
    ({ item }: { item: DraggableItemProps }) => (
      <DraggableItem id={item.id} title={item.title} />
    ),
    []
  );

  const keyExtractor = useCallback((item: DraggableItemProps) => item.id, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // 6. Optimize FlatList for gestures
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  itemText: {
    fontSize: 16,
    color: '#333333',
  },
});
```

### Performance Tips Summary

1. **Use Worklets Efficiently**: Keep gesture callback logic minimal and avoid heavy computations.

2. **Avoid JavaScript Thread Communication**: Use `runOnJS` sparingly, only when necessary for state updates.

3. **Memoize Components**: Use `React.memo` for components with gesture handlers to prevent unnecessary re-renders.

4. **Use `useDerivedValue`**: For computed values based on shared values, use `useDerivedValue` instead of recalculating in `useAnimatedStyle`.

5. **Optimize Animated Styles**: Only include properties that actually change in your `useAnimatedStyle` callbacks.

6. **Batch State Updates**: When multiple state updates are needed, batch them together to minimize re-renders.

7. **Use Native Driver**: Always prefer Reanimated over Animated for gesture-driven animations.

8. **Gesture Cancellation**: Implement proper gesture cancellation to prevent memory leaks and unexpected behavior.

## Conclusion

Building custom gesture handlers in React Native requires understanding both the gesture handler library and Reanimated. By leveraging these tools together, you can create highly interactive and performant mobile experiences.

Key takeaways:

- **Prefer Gesture Handler over PanResponder** for better performance and flexibility
- **Compose gestures** using Simultaneous, Exclusive, and Race for complex interactions
- **Integrate with Reanimated** for smooth, UI-thread animations
- **Understand gesture states** for proper feedback and error handling
- **Follow performance best practices** to maintain smooth 60fps interactions

The combination of react-native-gesture-handler and react-native-reanimated provides a powerful foundation for building gesture-driven interfaces that feel native and responsive. Whether you are building a simple tap button or a complex image editor with pinch, zoom, and rotation, these tools give you the flexibility and performance you need.

Start experimenting with the examples in this guide, and you will be creating custom gesture handlers that delight your users in no time.
