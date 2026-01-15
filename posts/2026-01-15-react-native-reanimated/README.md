# How to Implement Smooth Animations with React Native Reanimated

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Reanimated, Animations, Performance, Mobile Development, UI/UX

Description: Learn how to create smooth, performant animations in React Native using Reanimated 3 for native-driven animations.

---

Animations are a crucial part of modern mobile applications. They provide visual feedback, guide user attention, and create delightful user experiences. In React Native, while the built-in Animated API serves basic needs, React Native Reanimated has emerged as the gold standard for creating smooth, performant animations that run on the native thread.

In this comprehensive guide, we'll explore React Native Reanimated 3, covering everything from basic concepts to advanced animation patterns that will help you build buttery-smooth animations in your React Native applications.

## Reanimated vs the Built-in Animated API

Before diving into Reanimated, let's understand why it exists and how it differs from React Native's built-in Animated API.

### The Built-in Animated API

React Native ships with an Animated API that provides basic animation capabilities:

```javascript
import { Animated } from 'react-native';

const fadeAnim = useRef(new Animated.Value(0)).current;

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 1000,
  useNativeDriver: true,
}).start();
```

While functional, the Animated API has several limitations:

1. **Limited Native Driver Support**: Only certain properties like `opacity` and `transform` can use the native driver
2. **No Gesture-Driven Animations**: Complex gesture-based animations require bridge communication
3. **Declarative Constraints**: The API is declarative, making dynamic animations challenging
4. **Performance Bottlenecks**: Complex animations can cause frame drops due to JS thread limitations

### React Native Reanimated

Reanimated solves these problems by running animations entirely on the UI thread using worklets:

```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';

const opacity = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
}));

// Trigger animation
opacity.value = withTiming(1, { duration: 1000 });
```

Key advantages of Reanimated include:

- **Full Native Thread Execution**: All animations run on the UI thread
- **Worklet Architecture**: JavaScript code runs directly on the native side
- **Gesture Handler Integration**: Seamless integration with react-native-gesture-handler
- **Layout Animations**: Built-in support for entering, exiting, and layout transitions
- **Keyframe Animations**: CSS-like keyframe animation support

## Setting Up Reanimated 3

Let's get Reanimated installed and configured in your React Native project.

### Installation

```bash
# Using npm
npm install react-native-reanimated

# Using yarn
yarn add react-native-reanimated
```

### Babel Configuration

Add the Reanimated plugin to your `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    // Reanimated plugin must be listed last
    'react-native-reanimated/plugin',
  ],
};
```

### iOS Setup

For iOS, run pod install:

```bash
cd ios && pod install && cd ..
```

### Android Setup

No additional Android setup is required for Reanimated 3. However, if you're using Hermes (recommended), ensure it's enabled in your `android/gradle.properties`:

```properties
hermesEnabled=true
```

### Verifying Installation

Create a simple test component to verify the installation:

```javascript
import React from 'react';
import { View, Button } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

export default function TestAnimation() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(scale.value === 1 ? 1.5 : 1);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[
          { width: 100, height: 100, backgroundColor: 'blue' },
          animatedStyle,
        ]}
      />
      <Button title="Animate" onPress={handlePress} />
    </View>
  );
}
```

## Shared Values: The Foundation of Reanimated

Shared values are the fundamental building blocks of Reanimated. They are special values that can be read and written from both the JavaScript thread and the UI thread.

### Creating Shared Values

```javascript
import { useSharedValue } from 'react-native-reanimated';

function MyComponent() {
  // Initialize with a number
  const opacity = useSharedValue(0);

  // Initialize with an object
  const position = useSharedValue({ x: 0, y: 0 });

  // Initialize with a string
  const color = useSharedValue('#ffffff');

  return null;
}
```

### Reading and Writing Shared Values

```javascript
// Writing a value (triggers animation if wrapped in animation function)
opacity.value = 1;

// Writing with animation
opacity.value = withTiming(1, { duration: 500 });

// Reading in a worklet
const animatedStyle = useAnimatedStyle(() => {
  // This runs on the UI thread
  console.log(opacity.value); // Current value
  return {
    opacity: opacity.value,
  };
});
```

### Shared Values vs React State

It's important to understand when to use shared values vs React state:

```javascript
// Use shared values for:
// - Animation-driven values
// - Gesture-driven values
// - Values that change frequently during animations
const translateX = useSharedValue(0);

// Use React state for:
// - UI state that affects component rendering
// - Values that need to trigger re-renders
const [isVisible, setIsVisible] = useState(true);
```

## The useAnimatedStyle Hook

The `useAnimatedStyle` hook creates animated styles that update on the UI thread without crossing the bridge.

### Basic Usage

```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle
} from 'react-native-reanimated';

function AnimatedBox() {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.box, animatedStyle]} />
  );
}
```

### Combining Multiple Animated Properties

```javascript
const animatedStyle = useAnimatedStyle(() => {
  return {
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    backgroundColor: backgroundColor.value,
    borderRadius: borderRadius.value,
  };
});
```

### Conditional Styles

```javascript
const animatedStyle = useAnimatedStyle(() => {
  return {
    opacity: isActive.value ? 1 : 0.5,
    transform: [
      {
        scale: isActive.value ? 1.2 : 1,
      },
    ],
  };
});
```

## Animation Functions: withTiming and withSpring

Reanimated provides several animation functions to create smooth transitions.

### withTiming

`withTiming` creates linear or eased animations over a specified duration:

```javascript
import { withTiming, Easing } from 'react-native-reanimated';

// Basic timing animation
opacity.value = withTiming(1, { duration: 500 });

// With easing
opacity.value = withTiming(1, {
  duration: 500,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
});

// With callback
opacity.value = withTiming(1, { duration: 500 }, (finished) => {
  if (finished) {
    console.log('Animation completed!');
  }
});
```

### Common Easing Functions

```javascript
import { Easing } from 'react-native-reanimated';

// Linear
Easing.linear

// Ease in/out
Easing.ease
Easing.in(Easing.ease)
Easing.out(Easing.ease)
Easing.inOut(Easing.ease)

// Quadratic
Easing.quad
Easing.in(Easing.quad)
Easing.out(Easing.quad)

// Cubic
Easing.cubic

// Elastic
Easing.elastic(1)

// Bounce
Easing.bounce

// Bezier curves
Easing.bezier(0.25, 0.1, 0.25, 1)
```

### withSpring

`withSpring` creates physics-based spring animations:

```javascript
import { withSpring } from 'react-native-reanimated';

// Basic spring animation
scale.value = withSpring(1.5);

// Customized spring
scale.value = withSpring(1.5, {
  damping: 10,        // How quickly the spring stops
  stiffness: 100,     // How bouncy the spring is
  mass: 1,            // The mass of the object
  overshootClamping: false,  // Whether to clamp overshooting
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
});
```

### withDecay

`withDecay` creates momentum-based animations that gradually slow down:

```javascript
import { withDecay } from 'react-native-reanimated';

// Start with initial velocity
translateX.value = withDecay({
  velocity: velocityX,     // Initial velocity
  deceleration: 0.997,     // Rate of deceleration
  clamp: [0, 300],         // Optional bounds
});
```

### Chaining Animations with withSequence and withDelay

```javascript
import {
  withSequence,
  withDelay,
  withTiming,
  withRepeat
} from 'react-native-reanimated';

// Sequential animations
scale.value = withSequence(
  withTiming(1.2, { duration: 200 }),
  withTiming(0.9, { duration: 200 }),
  withTiming(1, { duration: 200 })
);

// Delayed animation
opacity.value = withDelay(500, withTiming(1, { duration: 300 }));

// Repeated animation
rotation.value = withRepeat(
  withTiming(360, { duration: 1000 }),
  -1,    // -1 for infinite, or specify count
  false  // reverse direction on each iteration
);
```

## Understanding Worklets

Worklets are small JavaScript functions that run on the UI thread. They're the secret sauce behind Reanimated's performance.

### What Makes a Worklet?

A worklet is any function marked with the `'worklet'` directive:

```javascript
function myWorklet() {
  'worklet';
  // This code runs on the UI thread
  return someValue * 2;
}
```

### Implicit Worklets

Functions passed to Reanimated hooks are automatically converted to worklets:

```javascript
// This callback is automatically a worklet
const animatedStyle = useAnimatedStyle(() => {
  // Runs on UI thread
  return {
    opacity: opacity.value,
  };
});
```

### Running Code on the UI Thread

Use `runOnUI` to execute a function on the UI thread:

```javascript
import { runOnUI } from 'react-native-reanimated';

const updateAnimation = () => {
  'worklet';
  opacity.value = withTiming(1);
};

// From JS thread, run on UI thread
runOnUI(updateAnimation)();
```

### Running Code on the JS Thread

Use `runOnJS` to call JS thread functions from worklets:

```javascript
import { runOnJS } from 'react-native-reanimated';

function handleAnimationEnd() {
  // This runs on JS thread
  console.log('Animation ended');
  setIsAnimating(false);
}

const animatedStyle = useAnimatedStyle(() => {
  if (progress.value === 1) {
    runOnJS(handleAnimationEnd)();
  }
  return {
    opacity: progress.value,
  };
});
```

### Worklet Limitations

Be aware of what you can and cannot do in worklets:

```javascript
// Allowed in worklets:
// - Math operations
// - Shared value access
// - Calling other worklets
// - Simple JavaScript logic

// NOT allowed in worklets:
// - React hooks
// - setState calls (use runOnJS)
// - console.log (use runOnJS for debugging)
// - Async/await
// - Most external library calls
```

## Gesture Handler Integration

React Native Gesture Handler and Reanimated work together seamlessly for gesture-driven animations.

### Setting Up Gesture Handler

```bash
npm install react-native-gesture-handler
```

Wrap your app with `GestureHandlerRootView`:

```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YourApp />
    </GestureHandlerRootView>
  );
}
```

### Pan Gesture Animation

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function DraggableBox() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;
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
      <Animated.View style={[styles.box, animatedStyle]} />
    </GestureDetector>
  );
}
```

### Pinch Gesture for Scaling

```javascript
function PinchableImage() {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Clamp scale to reasonable bounds
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.Image
        source={require('./image.png')}
        style={[styles.image, animatedStyle]}
      />
    </GestureDetector>
  );
}
```

### Composing Multiple Gestures

```javascript
function TransformableView() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = event.scale;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = event.rotation;
    });

  // Compose gestures to work simultaneously
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    rotationGesture
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
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </GestureDetector>
  );
}
```

## Layout Animations

Reanimated provides powerful layout animations for entering, exiting, and layout changes.

### Entering Animations

```javascript
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInLeft,
  BounceIn,
  ZoomIn
} from 'react-native-reanimated';

function AnimatedList({ items }) {
  return (
    <View>
      {items.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={FadeInUp.delay(index * 100).springify()}
        >
          <ListItem item={item} />
        </Animated.View>
      ))}
    </View>
  );
}

// Custom entering animation
<Animated.View
  entering={SlideInLeft
    .duration(500)
    .delay(200)
    .springify()
    .damping(15)
  }
>
  {content}
</Animated.View>
```

### Exiting Animations

```javascript
import Animated, {
  FadeOut,
  FadeOutDown,
  SlideOutRight,
  ZoomOut
} from 'react-native-reanimated';

function DismissibleCard({ onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Animated.View
      exiting={FadeOutDown.duration(300)}
      onAnimatedEnd={() => onDismiss()}
    >
      <Card>
        <Button
          title="Dismiss"
          onPress={() => setIsVisible(false)}
        />
      </Card>
    </Animated.View>
  );
}
```

### Layout Transitions

```javascript
import Animated, { Layout } from 'react-native-reanimated';

function ReorderableList({ items }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          layout={Layout.springify().damping(15)}
        >
          <ListItem item={item} />
        </Animated.View>
      ))}
    </View>
  );
}
```

### Custom Layout Animations

```javascript
import {
  withTiming,
  withSpring,
  LayoutAnimationConfig
} from 'react-native-reanimated';

const customLayoutTransition = (values) => {
  'worklet';
  return {
    animations: {
      originX: withSpring(values.targetOriginX),
      originY: withSpring(values.targetOriginY),
      width: withTiming(values.targetWidth),
      height: withTiming(values.targetHeight),
    },
    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      width: values.currentWidth,
      height: values.currentHeight,
    },
  };
};

<Animated.View layout={customLayoutTransition}>
  {content}
</Animated.View>
```

## Keyframe Animations

Keyframe animations allow you to define complex multi-step animations declaratively.

### Basic Keyframe Animation

```javascript
import Animated, { Keyframe } from 'react-native-reanimated';

const pulseKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  50: {
    transform: [{ scale: 1.2 }],
    opacity: 0.8,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
});

function PulsingButton() {
  return (
    <Animated.View entering={pulseKeyframe.duration(1000)}>
      <Button title="Press Me" />
    </Animated.View>
  );
}
```

### Complex Keyframe Sequences

```javascript
const bounceInKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }, { translateY: -100 }],
    opacity: 0,
  },
  30: {
    transform: [{ scale: 1.2 }, { translateY: 0 }],
    opacity: 0.8,
  },
  50: {
    transform: [{ scale: 0.9 }, { translateY: 10 }],
    opacity: 0.9,
  },
  70: {
    transform: [{ scale: 1.05 }, { translateY: -5 }],
    opacity: 1,
  },
  100: {
    transform: [{ scale: 1 }, { translateY: 0 }],
    opacity: 1,
  },
}).duration(800);

const shakeKeyframe = new Keyframe({
  0: { transform: [{ translateX: 0 }] },
  10: { transform: [{ translateX: -10 }] },
  20: { transform: [{ translateX: 10 }] },
  30: { transform: [{ translateX: -10 }] },
  40: { transform: [{ translateX: 10 }] },
  50: { transform: [{ translateX: -10 }] },
  60: { transform: [{ translateX: 10 }] },
  70: { transform: [{ translateX: -10 }] },
  80: { transform: [{ translateX: 5 }] },
  90: { transform: [{ translateX: -5 }] },
  100: { transform: [{ translateX: 0 }] },
}).duration(500);
```

## Interpolation Techniques

Interpolation maps input ranges to output ranges, enabling complex animated transformations.

### Basic Interpolation

```javascript
import { interpolate } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  const opacity = interpolate(
    progress.value,
    [0, 1],      // Input range
    [0, 1]       // Output range
  );

  const scale = interpolate(
    progress.value,
    [0, 0.5, 1],
    [1, 1.5, 1]
  );

  return {
    opacity,
    transform: [{ scale }],
  };
});
```

### Extrapolation Options

```javascript
import { interpolate, Extrapolate } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  const translateX = interpolate(
    scrollX.value,
    [0, 100, 200],
    [0, 50, 100],
    {
      extrapolateLeft: Extrapolate.CLAMP,
      extrapolateRight: Extrapolate.EXTEND,
    }
  );

  // Or using shorthand
  const opacity = interpolate(
    scrollX.value,
    [0, 100],
    [1, 0],
    Extrapolate.CLAMP
  );

  return {
    transform: [{ translateX }],
    opacity,
  };
});
```

### Color Interpolation

```javascript
import { interpolateColor } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  const backgroundColor = interpolateColor(
    progress.value,
    [0, 0.5, 1],
    ['#ff0000', '#00ff00', '#0000ff']
  );

  return {
    backgroundColor,
  };
});
```

### Scroll-Based Interpolation

```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

function ParallaxHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 200],
      [300, 100],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, 100, 200],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    );

    return {
      height,
      opacity,
    };
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text>Header</Text>
      </Animated.View>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* Content */}
      </Animated.ScrollView>
    </View>
  );
}
```

## Performance Best Practices

To get the best performance from Reanimated, follow these guidelines.

### Minimize JS Thread Communication

```javascript
// Bad: Frequent updates from JS thread
useEffect(() => {
  const interval = setInterval(() => {
    opacity.value = Math.random();
  }, 16);
  return () => clearInterval(interval);
}, []);

// Good: Use animation functions
opacity.value = withRepeat(
  withSequence(
    withTiming(1, { duration: 500 }),
    withTiming(0, { duration: 500 })
  ),
  -1
);
```

### Use useDerivedValue for Computed Values

```javascript
import { useDerivedValue } from 'react-native-reanimated';

function OptimizedComponent() {
  const progress = useSharedValue(0);

  // Computed value that updates when progress changes
  const opacity = useDerivedValue(() => {
    return progress.value * 0.5 + 0.5;
  });

  const scale = useDerivedValue(() => {
    return 1 + progress.value * 0.2;
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animatedStyle} />;
}
```

### Avoid Heavy Computations in Worklets

```javascript
// Bad: Heavy computation in worklet
const animatedStyle = useAnimatedStyle(() => {
  // Complex calculations every frame
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    result += Math.sin(i * progress.value);
  }
  return { opacity: result };
});

// Good: Precompute or simplify
const animatedStyle = useAnimatedStyle(() => {
  return {
    opacity: Math.sin(progress.value * Math.PI),
  };
});
```

### Batch Related Animations

```javascript
// Bad: Multiple separate updates
translateX.value = withTiming(100);
translateY.value = withTiming(200);
scale.value = withTiming(1.5);
opacity.value = withTiming(1);

// Good: Use a single derived transformation
const animationProgress = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => {
  const p = animationProgress.value;
  return {
    transform: [
      { translateX: p * 100 },
      { translateY: p * 200 },
      { scale: 1 + p * 0.5 },
    ],
    opacity: p,
  };
});

// Single trigger
animationProgress.value = withTiming(1);
```

### Use Layout Animation Sparingly

```javascript
// Layout animations can be expensive on large lists
// Use them selectively

// Good: Simple layout transition for small lists
<Animated.View layout={Layout.springify()}>

// Better for performance: Skip layout animation for items off-screen
const shouldAnimate = isVisible && index < 10;
<Animated.View layout={shouldAnimate ? Layout.springify() : undefined}>
```

## Common Animation Patterns

Let's look at some common animation patterns you can use in your apps.

### Fade In/Out Toggle

```javascript
function FadeToggle({ isVisible, children }) {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value === 0 ? 'none' : 'auto',
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
```

### Swipe to Delete

```javascript
function SwipeToDelete({ onDelete, children }) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(70);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(-100, event.translationX);
    })
    .onEnd((event) => {
      if (translateX.value < -50) {
        translateX.value = withTiming(-1000, { duration: 300 });
        itemHeight.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onDelete)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={containerStyle}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
```

### Animated Progress Bar

```javascript
function AnimatedProgressBar({ progress }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressContainer}>
      <Animated.View style={[styles.progressBar, animatedStyle]} />
    </View>
  );
}
```

### Bottom Sheet

```javascript
function BottomSheet({ isOpen, onClose, children }) {
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? 0 : 300, {
      damping: 20,
      stiffness: 150,
    });
    backdropOpacity.value = withTiming(isOpen ? 0.5 : 0);
  }, [isOpen]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        translateY.value = withSpring(300);
        backdropOpacity.value = withTiming(0);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  return (
    <>
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        onTouchEnd={onClose}
      />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
}
```

### Skeleton Loading Animation

```javascript
function SkeletonLoader({ width, height }) {
  const shimmerTranslate = useSharedValue(-width);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(width * 2, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  return (
    <View style={[styles.skeleton, { width, height }]}>
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}
```

### Card Flip Animation

```javascript
function FlipCard({ frontContent, backContent }) {
  const rotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flip = () => {
    rotation.value = withTiming(isFlipped ? 0 : 180, { duration: 500 });
    setIsFlipped(!isFlipped);
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value + 180}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  return (
    <Pressable onPress={flip}>
      <View>
        <Animated.View style={frontStyle}>
          {frontContent}
        </Animated.View>
        <Animated.View style={backStyle}>
          {backContent}
        </Animated.View>
      </View>
    </Pressable>
  );
}
```

## Conclusion

React Native Reanimated transforms animation development by moving animation logic to the UI thread, resulting in smooth 60fps animations regardless of JavaScript thread activity. By understanding shared values, worklets, and the various animation functions, you can create complex, performant animations that enhance your app's user experience.

Key takeaways:

1. **Use Shared Values** as the foundation for all animated properties
2. **Leverage useAnimatedStyle** for smooth, UI-thread style updates
3. **Choose the Right Animation Function**: `withTiming` for duration-based, `withSpring` for physics-based animations
4. **Integrate with Gesture Handler** for responsive gesture-driven animations
5. **Use Layout Animations** for automatic enter/exit/layout transitions
6. **Apply Interpolation** to create complex value mappings
7. **Follow Performance Best Practices** to maintain smooth animations

With these tools and patterns, you're equipped to build beautiful, performant animations in your React Native applications. Start experimenting with these concepts, and don't be afraid to combine them to create unique animated experiences for your users.

## Additional Resources

- [Official Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler Documentation](https://docs.swmansion.com/react-native-gesture-handler/)
- [William Candillon's YouTube Channel](https://www.youtube.com/c/wcandillon) - Excellent Reanimated tutorials
- [Reanimated GitHub Repository](https://github.com/software-mansion/react-native-reanimated)
