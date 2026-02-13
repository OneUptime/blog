# How to Implement Dynamic Font Scaling in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Font Scaling, Accessibility, Typography, Mobile Development, User Preferences

Description: Learn how to implement dynamic font scaling in React Native to respect user accessibility preferences for text size.

---

## Introduction

Font scaling is one of the most critical accessibility features in mobile applications. Users with visual impairments rely on system-level font size settings to make text readable on their devices. As React Native developers, we have both the responsibility and the tools to ensure our apps respect these preferences while maintaining a polished user experience.

In this comprehensive guide, we will explore how to implement dynamic font scaling in React Native, covering everything from basic concepts to advanced techniques that balance accessibility with design constraints.

## Why Font Scaling Matters

### The Accessibility Imperative

According to the World Health Organization, approximately 2.2 billion people globally have some form of visual impairment. Many of these users adjust their device's font size settings to comfortably read text. When an app ignores these preferences, it effectively excludes a significant portion of potential users.

### Legal Considerations

Many jurisdictions have accessibility requirements for digital products. The Americans with Disabilities Act (ADA) in the United States, the European Accessibility Act in the EU, and similar legislation worldwide increasingly apply to mobile applications. Respecting system font scaling is a fundamental aspect of accessibility compliance.

### User Experience Benefits

Font scaling isn't just for users with disabilities. Users in bright sunlight, older users experiencing age-related vision changes, or anyone who prefers larger text benefits from proper font scaling implementation. Supporting these preferences demonstrates respect for your users' choices.

## Understanding System Font Scale

### How Users Set Font Size

Both iOS and Android provide system-level font size settings:

**iOS:** Settings > Display & Brightness > Text Size (or Settings > Accessibility > Display & Text Size > Larger Text)

**Android:** Settings > Display > Font size (location may vary by manufacturer)

These settings produce a scale factor that apps can use to adjust text sizes proportionally.

### Accessing Font Scale in React Native

React Native provides the `PixelRatio` API to access the current font scale:

```typescript
import { PixelRatio } from 'react-native';

// Get the current font scale
const fontScale = PixelRatio.getFontScale();

console.log('Current font scale:', fontScale);
// Default is 1.0
// iOS range: 0.823 to 3.0+ (with Larger Accessibility Sizes)
// Android range: 0.85 to 1.3 (varies by device)
```

### Listening for Font Scale Changes

Users may change their font size while your app is running. React Native's `Dimensions` API can help detect these changes:

```typescript
import { useEffect, useState } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

function useFontScale(): number {
  const [fontScale, setFontScale] = useState(PixelRatio.getFontScale());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setFontScale(PixelRatio.getFontScale());
    });

    return () => subscription.remove();
  }, []);

  return fontScale;
}

// Usage in a component
function MyComponent() {
  const fontScale = useFontScale();

  return (
    <Text>Current font scale: {fontScale}</Text>
  );
}
```

## The PixelRatio API Deep Dive

### Understanding PixelRatio Methods

The `PixelRatio` API provides several useful methods:

```typescript
import { PixelRatio } from 'react-native';

// Get device pixel density (for images and layouts)
const pixelDensity = PixelRatio.get();

// Get font scale (for text sizing)
const fontScale = PixelRatio.getFontScale();

// Convert layout size to pixel size
const pixelSize = PixelRatio.getPixelSizeForLayoutSize(100);

// Round to nearest pixel for crisp rendering
const roundedSize = PixelRatio.roundToNearestPixel(14.4);
```

### Creating Scaled Font Sizes

Here's a utility function for scaling font sizes based on the system setting:

```typescript
import { PixelRatio } from 'react-native';

interface ScaledFontOptions {
  minScale?: number;
  maxScale?: number;
}

function getScaledFontSize(
  baseFontSize: number,
  options: ScaledFontOptions = {}
): number {
  const { minScale = 0.8, maxScale = 1.5 } = options;
  const fontScale = PixelRatio.getFontScale();

  // Clamp the scale to prevent extreme values
  const clampedScale = Math.min(Math.max(fontScale, minScale), maxScale);

  return Math.round(baseFontSize * clampedScale);
}

// Usage
const scaledBodySize = getScaledFontSize(16);
const scaledHeaderSize = getScaledFontSize(24, { maxScale: 1.3 });
```

## Controlling Font Scaling with allowFontScaling

### The allowFontScaling Prop

React Native's `Text` component includes an `allowFontScaling` prop that controls whether the text respects system font settings:

```typescript
import { Text, StyleSheet } from 'react-native';

function TextExamples() {
  return (
    <>
      {/* This text WILL scale with system settings (default) */}
      <Text style={styles.body}>
        This text respects user preferences
      </Text>

      {/* This text will NOT scale */}
      <Text style={styles.body} allowFontScaling={false}>
        This text stays fixed at 16pt
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
  },
});
```

### When to Disable Font Scaling

While you should generally allow font scaling, there are legitimate cases where disabling it makes sense:

```typescript
import { Text, View, StyleSheet } from 'react-native';

function IconBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      {/* Notification badges often need fixed sizes to fit in tight spaces */}
      <Text style={styles.badgeText} allowFontScaling={false}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

function TimerDisplay({ time }: { time: string }) {
  return (
    <View style={styles.timerContainer}>
      {/* Fixed-width displays like timers may break with scaling */}
      <Text style={styles.timerText} allowFontScaling={false}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#000',
    padding: 16,
  },
  timerText: {
    fontFamily: 'monospace',
    fontSize: 48,
    color: '#0f0',
  },
});
```

### Setting Default Behavior

You can set a default for all Text components using the `Text.defaultProps` pattern (though this approach is being phased out):

```typescript
// Modern approach: Create a custom Text component
import { Text as RNText, TextProps } from 'react-native';

interface CustomTextProps extends TextProps {
  allowFontScaling?: boolean;
}

function Text({ allowFontScaling = true, ...props }: CustomTextProps) {
  return <RNText allowFontScaling={allowFontScaling} {...props} />;
}

export default Text;
```

## Using maxFontSizeMultiplier

### Preventing Excessive Scaling

The `maxFontSizeMultiplier` prop limits how much text can scale up, preventing layout breakage at extreme accessibility sizes:

```typescript
import { Text, StyleSheet } from 'react-native';

function ControlledScalingText() {
  return (
    <>
      {/* Scale up to 1.5x the base size maximum */}
      <Text style={styles.heading} maxFontSizeMultiplier={1.5}>
        This heading scales up to 1.5x
      </Text>

      {/* Scale up to 2x for better accessibility */}
      <Text style={styles.body} maxFontSizeMultiplier={2}>
        Body text can scale more for readability
      </Text>

      {/* Unlimited scaling (default behavior) */}
      <Text style={styles.body}>
        This text has no scaling limit
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
  },
});
```

### Strategic Use of maxFontSizeMultiplier

Different UI elements may need different scaling limits:

```typescript
import { Text, View, StyleSheet } from 'react-native';

interface TypographyScale {
  heading: number;
  subheading: number;
  body: number;
  caption: number;
  button: number;
}

const MAX_SCALE: TypographyScale = {
  heading: 1.3,      // Large text needs less scaling
  subheading: 1.4,
  body: 2.0,         // Body text benefits from more scaling
  caption: 1.8,
  button: 1.3,       // Buttons have space constraints
};

function Card({ title, subtitle, body }: {
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <View style={styles.card}>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={MAX_SCALE.heading}
      >
        {title}
      </Text>
      <Text
        style={styles.subtitle}
        maxFontSizeMultiplier={MAX_SCALE.subheading}
      >
        {subtitle}
      </Text>
      <Text
        style={styles.body}
        maxFontSizeMultiplier={MAX_SCALE.body}
      >
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
});
```

## Scaling Custom Fonts

### Loading and Scaling Custom Fonts

When using custom fonts, ensure they scale properly with system settings:

```typescript
import { Text, StyleSheet, Platform } from 'react-native';

// Define font families for both platforms
const fonts = {
  regular: Platform.select({
    ios: 'Roboto-Regular',
    android: 'Roboto-Regular',
  }),
  bold: Platform.select({
    ios: 'Roboto-Bold',
    android: 'Roboto-Bold',
  }),
  light: Platform.select({
    ios: 'Roboto-Light',
    android: 'Roboto-Light',
  }),
};

// Typography system with custom fonts
const typography = StyleSheet.create({
  h1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.light,
    fontSize: 12,
    lineHeight: 16,
  },
});

function CustomFontText() {
  return (
    <>
      <Text style={typography.h1}>Custom Font Heading</Text>
      <Text style={typography.body}>
        Custom fonts scale just like system fonts when allowFontScaling is true.
      </Text>
    </>
  );
}
```

### Dynamic Line Height Calculation

Line height should scale proportionally with font size:

```typescript
import { PixelRatio, StyleSheet } from 'react-native';

interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

function createScaledTypography(
  baseFontSize: number,
  lineHeightMultiplier: number = 1.5
): TypographyStyle {
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = baseFontSize * fontScale;

  return {
    fontSize: baseFontSize, // React Native handles scaling automatically
    lineHeight: Math.round(baseFontSize * lineHeightMultiplier * fontScale),
  };
}

// Create responsive typography
function useResponsiveTypography() {
  const fontScale = PixelRatio.getFontScale();

  return StyleSheet.create({
    heading: {
      fontSize: 24,
      lineHeight: Math.round(32 * fontScale),
      fontWeight: 'bold',
    },
    body: {
      fontSize: 16,
      lineHeight: Math.round(24 * fontScale),
    },
    small: {
      fontSize: 12,
      lineHeight: Math.round(18 * fontScale),
    },
  });
}
```

## Layout Considerations

### Flexible Containers

Design layouts that accommodate text size changes:

```typescript
import { View, Text, StyleSheet } from 'react-native';

// BAD: Fixed height container
function FixedHeightCard({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <View style={badStyles.card}>
      <Text style={badStyles.title}>{title}</Text>
      <Text style={badStyles.description}>{description}</Text>
    </View>
  );
}

const badStyles = StyleSheet.create({
  card: {
    height: 100, // Fixed height will clip text at large scales
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
  },
});

// GOOD: Flexible container
function FlexibleCard({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <View style={goodStyles.card}>
      <Text style={goodStyles.title}>{title}</Text>
      <Text style={goodStyles.description}>{description}</Text>
    </View>
  );
}

const goodStyles = StyleSheet.create({
  card: {
    minHeight: 100, // Minimum height, but can grow
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    flexShrink: 1, // Allow text to wrap
  },
});
```

### Responsive Spacing

Adjust padding and margins based on font scale:

```typescript
import { View, Text, StyleSheet, PixelRatio } from 'react-native';

function useScaledSpacing() {
  const fontScale = PixelRatio.getFontScale();

  // Scale spacing proportionally, but with limits
  const scaleFactor = Math.min(fontScale, 1.5);

  return {
    xs: 4 * scaleFactor,
    sm: 8 * scaleFactor,
    md: 16 * scaleFactor,
    lg: 24 * scaleFactor,
    xl: 32 * scaleFactor,
  };
}

function ResponsiveLayout() {
  const spacing = useScaledSpacing();

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      <Text style={styles.title}>Responsive Layout</Text>
      <View style={{ marginTop: spacing.sm }}>
        <Text style={styles.body}>
          Spacing scales with font size for visual harmony.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
  },
});
```

### Horizontal Layouts

Handle horizontal layouts that may need to stack at larger font sizes:

```typescript
import { View, Text, StyleSheet, useWindowDimensions, PixelRatio } from 'react-native';

function AdaptiveButtonRow({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  // Switch to vertical layout at large font scales or narrow screens
  const shouldStack = fontScale > 1.3 || width < 350;

  return (
    <View style={[
      styles.buttonRow,
      shouldStack && styles.buttonRowStacked
    ]}>
      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={onPrimary}
      >
        <Text style={styles.buttonText}>{primaryLabel}</Text>
      </Pressable>
      <Pressable
        style={[
          styles.button,
          styles.secondaryButton,
          shouldStack && styles.stackedButton
        ]}
        onPress={onSecondary}
      >
        <Text style={[styles.buttonText, styles.secondaryText]}>
          {secondaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  buttonRowStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  stackedButton: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryText: {
    color: '#007AFF',
  },
});
```

## Text Truncation Handling

### Managing Overflow

When space is limited, handle text truncation gracefully:

```typescript
import { Text, View, StyleSheet } from 'react-native';

function TruncatedText({ text, lines = 2 }: { text: string; lines?: number }) {
  return (
    <Text
      style={styles.text}
      numberOfLines={lines}
      ellipsizeMode="tail"
    >
      {text}
    </Text>
  );
}

// Advanced: Expandable text component
import { useState } from 'react';
import { Pressable } from 'react-native';

function ExpandableText({
  text,
  previewLines = 3
}: {
  text: string;
  previewLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);

  return (
    <View>
      <Text
        style={styles.text}
        numberOfLines={expanded ? undefined : previewLines}
        onTextLayout={(event) => {
          // Check if text is truncated
          if (event.nativeEvent.lines.length > previewLines) {
            setShowButton(true);
          }
        }}
      >
        {text}
      </Text>
      {showButton && (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandButton}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  expandButton: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
});
```

### Handling Long Words

Very long words can cause layout issues, especially with scaled text:

```typescript
import { Text, View, StyleSheet, Platform } from 'react-native';

function LongWordHandler({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Text
        style={styles.text}
        // Android-specific word breaking
        {...(Platform.OS === 'android' && {
          android_hyphenationFrequency: 'full',
        })}
      >
        {text}
      </Text>
    </View>
  );
}

// Alternative: Manual word breaking for very long words
function breakLongWords(text: string, maxLength: number = 20): string {
  return text.split(' ').map(word => {
    if (word.length > maxLength) {
      // Insert soft hyphens for breaking
      const chunks = [];
      for (let i = 0; i < word.length; i += maxLength) {
        chunks.push(word.slice(i, i + maxLength));
      }
      return chunks.join('\u00AD'); // Soft hyphen
    }
    return word;
  }).join(' ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 16,
  },
});
```

## Testing Different Scale Settings

### iOS Simulator Testing

To test font scaling in the iOS Simulator:

1. Open the Settings app in the simulator
2. Navigate to Display & Brightness > Text Size
3. Adjust the slider to test different sizes
4. For larger sizes, go to Accessibility > Display & Text Size > Larger Text

### Android Emulator Testing

To test on Android:

1. Open Settings in the emulator
2. Navigate to Display > Font size
3. Adjust the slider

### Programmatic Testing

Create a development tool for testing different scales:

```typescript
import { useState } from 'react';
import { View, Text, Slider, StyleSheet } from 'react-native';

// Development-only font scale simulator
function FontScaleSimulator({ children }: { children: React.ReactNode }) {
  const [simulatedScale, setSimulatedScale] = useState(1);

  if (!__DEV__) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.label}>
          Simulated Font Scale: {simulatedScale.toFixed(2)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.8}
          maximumValue={2.5}
          value={simulatedScale}
          onValueChange={setSimulatedScale}
        />
      </View>
      <View style={{ transform: [{ scale: simulatedScale }] }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
```

### Unit Testing Font Scaling Logic

```typescript
import { PixelRatio } from 'react-native';

// Mock PixelRatio for testing
jest.mock('react-native', () => ({
  PixelRatio: {
    getFontScale: jest.fn(),
  },
}));

describe('Font Scaling Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should scale font size based on system scale', () => {
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1.5);

    const scaledSize = getScaledFontSize(16);

    expect(scaledSize).toBe(24); // 16 * 1.5
  });

  it('should respect maximum scale limit', () => {
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(2.0);

    const scaledSize = getScaledFontSize(16, { maxScale: 1.5 });

    expect(scaledSize).toBe(24); // Capped at 1.5x
  });

  it('should respect minimum scale limit', () => {
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(0.5);

    const scaledSize = getScaledFontSize(16, { minScale: 0.8 });

    expect(scaledSize).toBe(13); // Minimum 0.8x (12.8 rounded)
  });
});
```

## Balancing Design and Accessibility

### The Designer-Developer Collaboration

Achieving both beautiful design and accessibility requires collaboration:

```typescript
// Define a type-safe design system that accounts for scaling
interface DesignTokens {
  typography: {
    scale: 'standard' | 'accessible';
    sizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    maxScaleMultipliers: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
  };
}

const designTokens: DesignTokens = {
  typography: {
    scale: 'accessible',
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    maxScaleMultipliers: {
      xs: 1.5,    // Small text can scale more
      sm: 1.5,
      md: 1.75,
      lg: 1.75,
      xl: 1.5,    // Large text needs less scaling
      xxl: 1.3,
    },
  },
};

// Typography component using design tokens
function Typography({
  size = 'md',
  children,
  style,
  ...props
}: {
  size?: keyof DesignTokens['typography']['sizes'];
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
} & TextProps) {
  const fontSize = designTokens.typography.sizes[size];
  const maxMultiplier = designTokens.typography.maxScaleMultipliers[size];

  return (
    <Text
      style={[{ fontSize }, style]}
      maxFontSizeMultiplier={maxMultiplier}
      {...props}
    >
      {children}
    </Text>
  );
}
```

### Progressive Enhancement Approach

Start with full accessibility, then add constraints where needed:

```typescript
import { View, Text, StyleSheet, PixelRatio } from 'react-native';

type AccessibilityLevel = 'full' | 'enhanced' | 'standard' | 'constrained';

function getAccessibilityConfig(level: AccessibilityLevel) {
  switch (level) {
    case 'full':
      return { allowFontScaling: true, maxFontSizeMultiplier: undefined };
    case 'enhanced':
      return { allowFontScaling: true, maxFontSizeMultiplier: 2.0 };
    case 'standard':
      return { allowFontScaling: true, maxFontSizeMultiplier: 1.5 };
    case 'constrained':
      return { allowFontScaling: true, maxFontSizeMultiplier: 1.2 };
  }
}

function AccessibleText({
  level = 'enhanced',
  children,
  style,
  ...props
}: {
  level?: AccessibilityLevel;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
} & Omit<TextProps, 'allowFontScaling' | 'maxFontSizeMultiplier'>) {
  const config = getAccessibilityConfig(level);

  return (
    <Text {...config} style={style} {...props}>
      {children}
    </Text>
  );
}
```

## Platform-Specific Behaviors

### iOS-Specific Considerations

iOS has some unique font scaling behaviors:

```typescript
import { Platform, Text, StyleSheet } from 'react-native';

function PlatformAwareText({ children, style, ...props }: TextProps) {
  const platformStyles = Platform.select({
    ios: {
      // iOS has Dynamic Type which can scale beyond 2x
      // Consider limiting for UI consistency
    },
    android: {
      // Android scales more conservatively by default
    },
  });

  return (
    <Text style={[style, platformStyles]} {...props}>
      {children}
    </Text>
  );
}

// iOS-specific: Respond to content size category changes
import { AccessibilityInfo } from 'react-native';

function useIsLargeText(): boolean {
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    // iOS only
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceMotionEnabled().then(setIsLarge);
    }
  }, []);

  return isLarge;
}
```

### Android-Specific Considerations

Android has different default behaviors:

```typescript
import { Platform, PixelRatio } from 'react-native';

function getAndroidFontScaleCategory(): string {
  if (Platform.OS !== 'android') return 'N/A';

  const scale = PixelRatio.getFontScale();

  if (scale <= 0.85) return 'Small';
  if (scale <= 1.0) return 'Default';
  if (scale <= 1.15) return 'Large';
  if (scale <= 1.3) return 'Largest';
  return 'Huge';
}

// Android allows more granular control via manifest
// android:configChanges="fontScale" in AndroidManifest.xml
// to handle font scale changes without activity restart
```

## Best Practices Summary

### Do's

1. **Always test with different font scales** - Test your app with minimum, default, and maximum font sizes on both platforms.

2. **Use flexible layouts** - Prefer `minHeight` over `height`, and `flexGrow` over fixed dimensions.

3. **Scale spacing with text** - Consider scaling padding and margins proportionally with font size.

4. **Use maxFontSizeMultiplier strategically** - Allow generous scaling for body text, constrain headings and UI elements.

5. **Test with real users** - Get feedback from users who actually use accessibility features.

```typescript
// Example of a well-configured text component
function WellConfiguredText({
  variant = 'body',
  children,
  style,
  ...props
}: {
  variant?: 'heading' | 'body' | 'caption' | 'button';
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
} & TextProps) {
  const config = {
    heading: { fontSize: 24, maxFontSizeMultiplier: 1.4 },
    body: { fontSize: 16, maxFontSizeMultiplier: 2.0 },
    caption: { fontSize: 12, maxFontSizeMultiplier: 1.8 },
    button: { fontSize: 16, maxFontSizeMultiplier: 1.3 },
  }[variant];

  return (
    <Text
      style={[{ fontSize: config.fontSize }, style]}
      maxFontSizeMultiplier={config.maxFontSizeMultiplier}
      {...props}
    >
      {children}
    </Text>
  );
}
```

### Don'ts

1. **Don't disable font scaling globally** - This creates an inaccessible app.

2. **Don't ignore layout breakage** - If your UI breaks at large font sizes, fix it.

3. **Don't assume one size fits all** - Different text elements need different scaling strategies.

4. **Don't forget to test TextInput** - Form inputs also support `allowFontScaling`.

5. **Don't set maxFontSizeMultiplier too low** - Values below 1.2 significantly impact accessibility.

## Complete Example: Accessible Card Component

Here's a complete example bringing together all the concepts:

```typescript
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';

interface CardProps {
  title: string;
  subtitle: string;
  body: string;
  primaryAction: string;
  secondaryAction: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}

function AccessibleCard({
  title,
  subtitle,
  body,
  primaryAction,
  secondaryAction,
  onPrimaryPress,
  onSecondaryPress,
}: CardProps) {
  const fontScale = PixelRatio.getFontScale();
  const { width } = useWindowDimensions();

  // Adapt layout based on font scale and screen width
  const shouldStackButtons = fontScale > 1.3 || width < 350;
  const scaledPadding = Math.round(16 * Math.min(fontScale, 1.3));

  return (
    <View style={[styles.card, { padding: scaledPadding }]}>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.4}
        accessibilityRole="header"
      >
        {title}
      </Text>

      <Text
        style={styles.subtitle}
        maxFontSizeMultiplier={1.5}
      >
        {subtitle}
      </Text>

      <Text
        style={styles.body}
        maxFontSizeMultiplier={2.0}
      >
        {body}
      </Text>

      <View style={[
        styles.buttonContainer,
        shouldStackButtons && styles.buttonContainerStacked
      ]}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={onPrimaryPress}
          accessibilityRole="button"
        >
          <Text
            style={styles.primaryButtonText}
            maxFontSizeMultiplier={1.3}
          >
            {primaryAction}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.secondaryButton,
            shouldStackButtons && styles.stackedSecondaryButton
          ]}
          onPress={onSecondaryPress}
          accessibilityRole="button"
        >
          <Text
            style={styles.secondaryButtonText}
            maxFontSizeMultiplier={1.3}
          >
            {secondaryAction}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  stackedSecondaryButton: {
    marginTop: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default AccessibleCard;
```

## Conclusion

Implementing dynamic font scaling in React Native is not just a technical requirement-it's a commitment to building inclusive applications. By following the practices outlined in this guide, you can create apps that:

- Respect user preferences for text size
- Maintain visual polish at all scale levels
- Adapt layouts gracefully to accommodate larger text
- Balance accessibility with design constraints
- Work consistently across iOS and Android

Remember that accessibility is not a feature to be added later-it should be part of your development process from the start. The investment you make in proper font scaling implementation will pay dividends in user satisfaction, broader reach, and compliance with accessibility standards.

Start by auditing your existing Text components, implement a design system with appropriate scaling limits, and always test your app at various font scale settings. Your users will thank you for it.

## Additional Resources

- [React Native Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [Apple Human Interface Guidelines - Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
