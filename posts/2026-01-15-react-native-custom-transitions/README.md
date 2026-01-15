# How to Add Custom Transitions and Animations to React Navigation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Navigation, Animations, Transitions, Mobile Development, UX

Description: Learn how to create custom screen transitions and animations in React Navigation for a polished user experience.

---

Screen transitions are one of the most impactful ways to enhance your React Native application's user experience. A well-crafted transition can make your app feel polished, professional, and intuitive. In this comprehensive guide, we will explore how to create custom transitions and animations in React Navigation, from basic configurations to advanced techniques using Reanimated.

## Understanding Screen Transitions

Screen transitions in React Navigation define how screens animate when navigating between them. These animations include:

- **Enter transitions:** How a new screen appears when pushed onto the stack
- **Exit transitions:** How a screen disappears when popped from the stack
- **Container transitions:** How the overall container behaves during navigation
- **Gesture-driven transitions:** How screens respond to swipe gestures

React Navigation uses a card-based architecture where each screen is represented as a card that can be animated. The transition system is highly customizable, allowing you to control every aspect of the animation.

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

const Stack = createStackNavigator();

function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // Transition configuration goes here
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Built-in Transition Presets

React Navigation provides several built-in transition presets that cover common use cases. These presets are optimized for performance and follow platform conventions.

### Available Presets

```typescript
import {
  TransitionPresets,
  CardStyleInterpolators,
  HeaderStyleInterpolators,
} from '@react-navigation/stack';

// Available presets
const presets = {
  SlideFromRightIOS: TransitionPresets.SlideFromRightIOS,
  ModalSlideFromBottomIOS: TransitionPresets.ModalSlideFromBottomIOS,
  ModalPresentationIOS: TransitionPresets.ModalPresentationIOS,
  FadeFromBottomAndroid: TransitionPresets.FadeFromBottomAndroid,
  RevealFromBottomAndroid: TransitionPresets.RevealFromBottomAndroid,
  ScaleFromCenterAndroid: TransitionPresets.ScaleFromCenterAndroid,
  DefaultTransition: TransitionPresets.DefaultTransition,
  ModalTransition: TransitionPresets.ModalTransition,
};
```

### Applying Presets

You can apply presets at the navigator level or per-screen:

```typescript
import { TransitionPresets } from '@react-navigation/stack';

// Navigator level - applies to all screens
<Stack.Navigator
  screenOptions={{
    ...TransitionPresets.SlideFromRightIOS,
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen
    name="Modal"
    component={ModalScreen}
    options={{
      ...TransitionPresets.ModalPresentationIOS,
    }}
  />
</Stack.Navigator>
```

### Platform-Specific Defaults

```typescript
import { Platform } from 'react-native';
import { TransitionPresets } from '@react-navigation/stack';

const defaultScreenOptions = {
  ...(Platform.OS === 'ios'
    ? TransitionPresets.SlideFromRightIOS
    : TransitionPresets.FadeFromBottomAndroid),
};

<Stack.Navigator screenOptions={defaultScreenOptions}>
  {/* screens */}
</Stack.Navigator>
```

## Creating Custom Transition Specs

Transition specs define the timing and physics of animations. You can create custom specs for both opening and closing animations.

### TransitionSpec Structure

```typescript
import { TransitionSpec } from '@react-navigation/stack';
import { Easing } from 'react-native';

interface TransitionSpec {
  animation: 'spring' | 'timing';
  config: SpringConfig | TimingConfig;
}

// Spring configuration
interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  overshootClamping: boolean;
  restDisplacementThreshold: number;
  restSpeedThreshold: number;
}

// Timing configuration
interface TimingConfig {
  duration: number;
  easing: (value: number) => number;
}
```

### Custom Spring Transition

```typescript
const customSpringTransition: TransitionSpec = {
  animation: 'spring',
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

<Stack.Navigator
  screenOptions={{
    transitionSpec: {
      open: customSpringTransition,
      close: customSpringTransition,
    },
  }}
>
  {/* screens */}
</Stack.Navigator>
```

### Custom Timing Transition

```typescript
import { Easing } from 'react-native';

const customTimingTransition: TransitionSpec = {
  animation: 'timing',
  config: {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
};

// Different specs for open and close
const screenOptions = {
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 400,
        easing: Easing.out(Easing.poly(4)),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.in(Easing.poly(4)),
      },
    },
  },
};
```

## Card Style Interpolators

Card style interpolators are functions that define how the card (screen) transforms during transitions. They receive the current animation progress and return style properties.

### Interpolator Function Signature

```typescript
import { StackCardInterpolationProps } from '@react-navigation/stack';

type CardStyleInterpolator = (
  props: StackCardInterpolationProps
) => {
  cardStyle: ViewStyle;
  overlayStyle?: ViewStyle;
  shadowStyle?: ViewStyle;
};

interface StackCardInterpolationProps {
  current: {
    progress: Animated.AnimatedInterpolation<number>;
  };
  next?: {
    progress: Animated.AnimatedInterpolation<number>;
  };
  index: number;
  closing: Animated.AnimatedInterpolation<number>;
  layouts: {
    screen: { width: number; height: number };
  };
}
```

### Custom Slide From Right

```typescript
import { StackCardInterpolationProps } from '@react-navigation/stack';
import { Animated } from 'react-native';

const forSlideFromRight = ({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  // Scale down the previous screen
  const scale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.95],
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }, { scale }],
      opacity,
    },
  };
};
```

### Custom Fade Transition

```typescript
const forFade = ({
  current,
  next,
}: StackCardInterpolationProps) => {
  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Fade out when next screen comes in
  const nextOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 1;

  return {
    cardStyle: {
      opacity: Animated.multiply(opacity, nextOpacity),
    },
  };
};
```

### Custom Scale Transition

```typescript
const forScaleFromCenter = ({
  current,
  next,
  closing,
}: StackCardInterpolationProps) => {
  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

  return {
    cardStyle: {
      transform: [{ scale }],
      opacity,
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  };
};
```

### Custom 3D Flip Transition

```typescript
const forFlip = ({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const rotateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '0deg'],
  });

  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width / 2, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return {
    cardStyle: {
      transform: [
        { perspective: 1000 },
        { translateX },
        { rotateY },
      ],
      opacity,
    },
  };
};
```

## Header Style Interpolators

Header style interpolators control how the navigation header animates during transitions.

### Header Interpolator Structure

```typescript
import { StackHeaderInterpolationProps } from '@react-navigation/stack';

type HeaderStyleInterpolator = (
  props: StackHeaderInterpolationProps
) => {
  leftLabelStyle?: ViewStyle;
  leftButtonStyle?: ViewStyle;
  rightButtonStyle?: ViewStyle;
  titleStyle?: ViewStyle;
  backgroundStyle?: ViewStyle;
};

interface StackHeaderInterpolationProps {
  current: {
    progress: Animated.AnimatedInterpolation<number>;
  };
  next?: {
    progress: Animated.AnimatedInterpolation<number>;
  };
  layouts: {
    header: { height: number };
    screen: { width: number; height: number };
    title?: { width: number; height: number };
    leftLabel?: { width: number; height: number };
  };
}
```

### Custom Header Fade

```typescript
const forHeaderFade = ({
  current,
  next,
}: StackHeaderInterpolationProps) => {
  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const nextOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 1;

  return {
    titleStyle: {
      opacity: Animated.multiply(opacity, nextOpacity),
    },
    leftButtonStyle: {
      opacity: Animated.multiply(opacity, nextOpacity),
    },
    rightButtonStyle: {
      opacity: Animated.multiply(opacity, nextOpacity),
    },
    backgroundStyle: {
      opacity: Animated.multiply(opacity, nextOpacity),
    },
  };
};
```

### Custom Header Slide

```typescript
const forHeaderSlide = ({
  current,
  next,
  layouts: { screen },
}: StackHeaderInterpolationProps) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
  });

  const nextTranslateX = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -screen.width],
      })
    : 0;

  return {
    titleStyle: {
      transform: [
        { translateX },
        { translateX: nextTranslateX },
      ],
    },
  };
};
```

## Gesture Configuration

React Navigation supports gesture-based navigation. You can configure how gestures interact with your transitions.

### Gesture Handler Options

```typescript
<Stack.Navigator
  screenOptions={{
    gestureEnabled: true,
    gestureDirection: 'horizontal', // or 'vertical', 'horizontal-inverted', 'vertical-inverted'
    gestureResponseDistance: 50, // pixels from edge to trigger gesture
  }}
>
  {/* screens */}
</Stack.Navigator>
```

### Custom Gesture Response

```typescript
const screenOptions = {
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  gestureResponseDistance: 100,

  // Customize when gesture is enabled
  gestureVelocityImpact: 0.3,

  // Custom card overlay
  cardOverlayEnabled: true,
  cardOverlay: ({ style }) => (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      ]}
    />
  ),
};
```

### Disabling Gestures for Specific Screens

```typescript
<Stack.Screen
  name="Checkout"
  component={CheckoutScreen}
  options={{
    gestureEnabled: false, // Prevent accidental back navigation
  }}
/>
```

## Animation Timing Functions

Understanding easing functions is crucial for creating natural-feeling animations.

### Common Easing Functions

```typescript
import { Easing } from 'react-native';

// Linear - constant speed
const linear = Easing.linear;

// Ease in - start slow, end fast
const easeIn = Easing.in(Easing.ease);
const easeInQuad = Easing.in(Easing.quad);
const easeInCubic = Easing.in(Easing.cubic);

// Ease out - start fast, end slow
const easeOut = Easing.out(Easing.ease);
const easeOutQuad = Easing.out(Easing.quad);
const easeOutCubic = Easing.out(Easing.cubic);

// Ease in-out - slow start and end
const easeInOut = Easing.inOut(Easing.ease);
const easeInOutQuad = Easing.inOut(Easing.quad);
const easeInOutCubic = Easing.inOut(Easing.cubic);

// Bezier curves for precise control
const customBezier = Easing.bezier(0.25, 0.1, 0.25, 1);

// Back - overshoot then settle
const easeOutBack = Easing.out(Easing.back(1.7));

// Elastic - bouncy spring effect
const elastic = Easing.elastic(1);

// Bounce
const bounce = Easing.bounce;
```

### Applying Easing to Transitions

```typescript
const bouncyTransition: TransitionSpec = {
  animation: 'timing',
  config: {
    duration: 500,
    easing: Easing.out(Easing.back(1.5)),
  },
};

const smoothTransition: TransitionSpec = {
  animation: 'timing',
  config: {
    duration: 350,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design standard
  },
};
```

## Shared Element Transitions

Shared element transitions create visual continuity between screens by animating common elements.

### Using react-native-shared-element

```bash
npm install react-navigation-shared-element react-native-shared-element
```

### Basic Setup

```typescript
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import { SharedElement } from 'react-native-shared-element';

const Stack = createSharedElementStackNavigator();

function ListScreen({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Detail', { item })}
    >
      <SharedElement id={`item.${item.id}.photo`}>
        <Image source={{ uri: item.photo }} style={styles.image} />
      </SharedElement>
      <SharedElement id={`item.${item.id}.title`}>
        <Text style={styles.title}>{item.title}</Text>
      </SharedElement>
    </TouchableOpacity>
  );
}

function DetailScreen({ route }) {
  const { item } = route.params;

  return (
    <View style={styles.container}>
      <SharedElement id={`item.${item.id}.photo`}>
        <Image source={{ uri: item.photo }} style={styles.largeImage} />
      </SharedElement>
      <SharedElement id={`item.${item.id}.title`}>
        <Text style={styles.largeTitle}>{item.title}</Text>
      </SharedElement>
    </View>
  );
}
```

### Configuring Shared Element Transitions

```typescript
<Stack.Screen
  name="Detail"
  component={DetailScreen}
  sharedElements={(route, otherRoute, showing) => {
    const { item } = route.params;
    return [
      {
        id: `item.${item.id}.photo`,
        animation: 'move',
        resize: 'clip',
        align: 'center-top',
      },
      {
        id: `item.${item.id}.title`,
        animation: 'fade',
        resize: 'clip',
      },
    ];
  }}
/>
```

### Custom Shared Element Animation

```typescript
const sharedElementConfig = {
  animation: 'move', // 'move', 'fade', 'fade-in', 'fade-out'
  resize: 'auto', // 'auto', 'stretch', 'clip', 'none'
  align: 'auto', // 'auto', 'left-top', 'center-center', etc.
  duration: 300,
  easing: Easing.out(Easing.cubic),
};
```

## Modal Presentation Styles

Modal presentations require special handling to create the right visual effect.

### iOS-Style Modal Presentation

```typescript
import { TransitionPresets } from '@react-navigation/stack';

<Stack.Navigator>
  <Stack.Group>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Group>

  <Stack.Group
    screenOptions={{
      presentation: 'modal',
      ...TransitionPresets.ModalPresentationIOS,
      cardOverlayEnabled: true,
    }}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Filter" component={FilterScreen} />
  </Stack.Group>
</Stack.Navigator>
```

### Custom Modal Interpolator

```typescript
const forModalPresentationIOS = ({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.height, 0],
  });

  const borderRadius = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const scale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.92],
      })
    : 1;

  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return {
    cardStyle: {
      transform: [{ translateY }, { scale }],
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      overflow: 'hidden',
    },
    overlayStyle: {
      opacity: overlayOpacity,
    },
  };
};
```

### Full Screen Modal

```typescript
const forFullScreenModal = ({
  current,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.height, 0],
  });

  return {
    cardStyle: {
      transform: [{ translateY }],
    },
  };
};

<Stack.Screen
  name="FullScreenModal"
  component={FullScreenModalScreen}
  options={{
    presentation: 'modal',
    cardStyleInterpolator: forFullScreenModal,
    headerShown: false,
  }}
/>
```

## Custom Animation with Reanimated

For more complex animations, React Native Reanimated provides better performance and more flexibility.

### Setting Up Reanimated

```bash
npm install react-native-reanimated
```

### Custom Animated Screen Component

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useCardAnimation } from '@react-navigation/stack';

function AnimatedScreen({ children }) {
  const { current } = useCardAnimation();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(
            current.progress.value,
            [0, 1],
            [0.9, 1],
            Extrapolate.CLAMP
          ),
        },
        {
          rotateZ: `${interpolate(
            current.progress.value,
            [0, 1],
            [-5, 0],
            Extrapolate.CLAMP
          )}deg`,
        },
      ],
      opacity: interpolate(
        current.progress.value,
        [0, 0.5, 1],
        [0, 0.5, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
```

### Reanimated Card Style Interpolator

```typescript
import { StackCardStyleInterpolator } from '@react-navigation/stack';

const forReanimatedSlide: StackCardStyleInterpolator = ({
  current,
  next,
  layouts,
}) => {
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
        {
          scale: next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.9],
              })
            : 1,
        },
      ],
    },
  };
};
```

### Complex Animation with Gesture Integration

```typescript
import { useAnimatedGestureHandler } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function SwipeableScreen({ navigation }) {
  const translateX = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = Math.max(0, ctx.startX + event.translationX);
    },
    onEnd: (event) => {
      if (translateX.value > screenWidth * 0.4 || event.velocityX > 500) {
        translateX.value = withTiming(screenWidth, {}, () => {
          runOnJS(navigation.goBack)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.screen, animatedStyle]}>
        {/* Screen content */}
      </Animated.View>
    </PanGestureHandler>
  );
}
```

## Performance Considerations

Smooth animations require careful attention to performance.

### Enable Native Driver

```typescript
// Always use native driver when possible
const transitionSpec: TransitionSpec = {
  animation: 'timing',
  config: {
    duration: 300,
    easing: Easing.out(Easing.poly(4)),
    useNativeDriver: true, // Important for performance
  },
};
```

### Avoid Layout Thrashing

```typescript
// Bad - causes layout recalculation during animation
const badInterpolator = ({ current }) => ({
  cardStyle: {
    width: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['50%', '100%'], // Percentage causes layout
    }),
  },
});

// Good - uses transform which doesn't trigger layout
const goodInterpolator = ({ current, layouts }) => ({
  cardStyle: {
    transform: [
      {
        scale: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
  },
});
```

### Optimize Screen Rendering

```typescript
import React, { memo } from 'react';

// Memoize screens to prevent unnecessary re-renders
const MemoizedScreen = memo(function Screen({ route, navigation }) {
  // Screen content
});

// Use InteractionManager for heavy operations
import { InteractionManager } from 'react-native';

function HeavyScreen() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // Heavy data loading after animation completes
      loadHeavyData().then(setData);
    });

    return () => task.cancel();
  }, []);

  return data ? <DataView data={data} /> : <LoadingView />;
}
```

### Reduce Overdraw

```typescript
// Avoid overlapping transparent backgrounds
const optimizedScreenOptions = {
  cardStyle: {
    backgroundColor: '#FFFFFF', // Solid background
  },
  cardOverlayEnabled: false, // Disable if not needed
};
```

## Platform-Specific Transitions

Different platforms have different expectations for transitions.

### Platform-Aware Configuration

```typescript
import { Platform } from 'react-native';
import { TransitionPresets } from '@react-navigation/stack';

const platformTransition = Platform.select({
  ios: TransitionPresets.SlideFromRightIOS,
  android: TransitionPresets.FadeFromBottomAndroid,
  default: TransitionPresets.DefaultTransition,
});

<Stack.Navigator screenOptions={platformTransition}>
  {/* screens */}
</Stack.Navigator>
```

### Custom Platform Transitions

```typescript
const iosTransition = {
  cardStyleInterpolator: ({ current, next, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
  }),
  gestureDirection: 'horizontal',
  gestureEnabled: true,
};

const androidTransition = {
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.3, 1],
      }),
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    },
  }),
  gestureEnabled: false,
};

const screenOptions = Platform.OS === 'ios' ? iosTransition : androidTransition;
```

### Matching Platform Conventions

```typescript
// iOS: Horizontal slide with back swipe gesture
const iosStackOptions = {
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureResponseDistance: 50,
};

// Android: Bottom fade without gesture
const androidStackOptions = {
  ...TransitionPresets.FadeFromBottomAndroid,
  gestureEnabled: false,
};

// Modal on iOS: Card presentation style
const iosModalOptions = {
  ...TransitionPresets.ModalPresentationIOS,
  cardOverlayEnabled: true,
};

// Modal on Android: Bottom slide
const androidModalOptions = {
  ...TransitionPresets.ModalSlideFromBottomIOS,
  cardOverlayEnabled: true,
};
```

## Putting It All Together

Here is a complete example combining various transition techniques:

```typescript
import React from 'react';
import { Platform, Easing } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  TransitionPresets,
  StackCardInterpolationProps,
} from '@react-navigation/stack';

const Stack = createStackNavigator();

// Custom card interpolator
const forCustomSlide = ({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
  });

  const scale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.95],
      })
    : 1;

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return {
    cardStyle: {
      transform: [{ translateX }, { scale }],
      opacity,
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3],
      }),
    },
  };
};

// Custom transition spec
const customTransitionSpec = {
  open: {
    animation: 'timing' as const,
    config: {
      duration: 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  },
  close: {
    animation: 'timing' as const,
    config: {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  },
};

// Screen options
const defaultScreenOptions = {
  headerShown: true,
  cardStyleInterpolator: forCustomSlide,
  transitionSpec: customTransitionSpec,
  gestureEnabled: Platform.OS === 'ios',
  gestureDirection: 'horizontal' as const,
  gestureResponseDistance: 50,
  cardOverlayEnabled: true,
};

const modalScreenOptions = {
  presentation: 'modal' as const,
  ...TransitionPresets.ModalPresentationIOS,
  cardOverlayEnabled: true,
};

export default function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={defaultScreenOptions}>
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>

        <Stack.Group screenOptions={modalScreenOptions}>
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Conclusion

Custom transitions and animations in React Navigation can significantly enhance your app's user experience. By understanding the various components - transition specs, card interpolators, header interpolators, and gesture configuration - you can create unique and polished navigation experiences.

Remember these key points:

1. **Start with presets** - React Navigation's built-in presets cover most common use cases
2. **Use native driver** - Always enable native driver for smooth 60fps animations
3. **Match platform conventions** - iOS and Android users expect different transition styles
4. **Test on real devices** - Animations may perform differently on actual hardware
5. **Keep it subtle** - The best transitions enhance the experience without drawing attention to themselves
6. **Consider accessibility** - Provide options to reduce motion for users who prefer it

With the techniques covered in this guide, you have all the tools needed to create beautiful, performant screen transitions that will make your React Native app stand out.

## Additional Resources

- [React Navigation Documentation](https://reactnavigation.org/docs/stack-navigator)
- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Shared Element Documentation](https://github.com/IjzerenHein/react-native-shared-element)
- [Material Design Motion Guidelines](https://material.io/design/motion)
- [Apple Human Interface Guidelines - Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
