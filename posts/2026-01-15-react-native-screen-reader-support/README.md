# How to Support Screen Readers (VoiceOver/TalkBack) in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, VoiceOver, TalkBack, Screen Reader, Accessibility, Mobile Development

Description: Learn how to optimize React Native apps for screen readers like VoiceOver (iOS) and TalkBack (Android) for visually impaired users.

---

## Introduction

Screen readers are essential assistive technologies that enable visually impaired users to interact with mobile applications. In the React Native ecosystem, supporting VoiceOver (iOS) and TalkBack (Android) is not just a best practice-it's a fundamental requirement for creating inclusive applications that serve all users.

This comprehensive guide will walk you through everything you need to know about implementing robust screen reader support in your React Native applications. From basic concepts to advanced techniques, you'll learn how to create truly accessible mobile experiences.

## Understanding Screen Readers

### What Are Screen Readers?

Screen readers are software applications that convert on-screen content into speech or braille output. They enable users with visual impairments to navigate, interact with, and understand digital interfaces without relying on visual cues.

### How Screen Readers Work

Screen readers traverse the accessibility tree of an application, reading out element descriptions, roles, and states. They rely heavily on proper semantic markup and accessibility properties to convey meaningful information to users.

```typescript
// The accessibility tree is built from your component hierarchy
// Screen readers traverse this tree to announce content

<View accessible={true} accessibilityLabel="Welcome section">
  <Text>Welcome to our app</Text>
</View>
```

### Why Screen Reader Support Matters

- **Legal Compliance**: Many jurisdictions require digital accessibility (ADA, WCAG)
- **Market Reach**: Over 2.2 billion people globally have visual impairments
- **Better UX for All**: Accessibility improvements often enhance usability for everyone
- **SEO and Discoverability**: Accessible apps tend to perform better in app store rankings

## VoiceOver Basics on iOS

### What Is VoiceOver?

VoiceOver is Apple's built-in screen reader available on all iOS devices. It provides spoken descriptions of on-screen elements and allows users to navigate using gestures.

### Key VoiceOver Gestures

| Gesture | Action |
|---------|--------|
| Single tap | Select and announce item |
| Double tap | Activate selected item |
| Swipe right | Move to next element |
| Swipe left | Move to previous element |
| Three-finger swipe | Scroll |
| Two-finger tap | Pause/resume speech |
| Escape gesture (Z shape) | Go back |

### Enabling VoiceOver for Testing

```bash
# On iOS Simulator
# Hardware > Siri > Enable "Hey Siri"
# Or use Accessibility Shortcut: Triple-click Home/Side button

# On Physical Device
# Settings > Accessibility > VoiceOver > Toggle On
```

### VoiceOver Rotor

The rotor is a virtual dial that allows users to change navigation settings. Users can navigate by headings, links, form controls, and more.

```typescript
// Support rotor navigation with proper accessibility roles
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Submit form"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

## TalkBack Basics on Android

### What Is TalkBack?

TalkBack is Google's screen reader for Android devices. It provides similar functionality to VoiceOver but with Android-specific gestures and behaviors.

### Key TalkBack Gestures

| Gesture | Action |
|---------|--------|
| Single tap | Announce item |
| Double tap | Activate item |
| Swipe right | Next element |
| Swipe left | Previous element |
| Two-finger scroll | Scroll content |
| Swipe down then right | Global context menu |
| Swipe up then right | Local context menu |

### Enabling TalkBack for Testing

```bash
# On Android Emulator
# Settings > Accessibility > TalkBack > Toggle On

# On Physical Device
# Settings > Accessibility > TalkBack > Use TalkBack
# Or use volume key shortcut (hold both volume keys for 3 seconds)
```

### TalkBack Reading Controls

TalkBack offers granular reading controls that allow users to navigate by characters, words, lines, paragraphs, and more.

```typescript
// Ensure content is properly structured for reading controls
<View accessible={true}>
  <Text accessibilityRole="header">Section Title</Text>
  <Text>Paragraph content that can be read word by word.</Text>
</View>
```

## Enabling Screen Reader Testing in Development

### Detecting Screen Reader Status

React Native provides APIs to detect when a screen reader is active:

```typescript
import { AccessibilityInfo, Platform } from 'react-native';

// Check if screen reader is enabled
const checkScreenReader = async (): Promise<boolean> => {
  const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  return isEnabled;
};

// Listen for screen reader changes
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    (isEnabled: boolean) => {
      console.log('Screen reader is now:', isEnabled ? 'ON' : 'OFF');
      // Adjust UI or behavior based on screen reader status
    }
  );

  return () => {
    subscription.remove();
  };
}, []);
```

### Setting Up Development Environment

```typescript
// Create a development utility for accessibility testing
import { AccessibilityInfo } from 'react-native';

interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
}

const useAccessibilityInfo = (): AccessibilityState => {
  const [state, setState] = useState<AccessibilityState>({
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    boldTextEnabled: false,
  });

  useEffect(() => {
    const fetchAccessibilityInfo = async () => {
      const [screenReader, reduceMotion, boldText] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isBoldTextEnabled(),
      ]);

      setState({
        screenReaderEnabled: screenReader,
        reduceMotionEnabled: reduceMotion,
        boldTextEnabled: boldText,
      });
    };

    fetchAccessibilityInfo();
  }, []);

  return state;
};
```

### Using Accessibility Inspector

For iOS development, use Xcode's Accessibility Inspector:

```bash
# Open Accessibility Inspector
# Xcode > Open Developer Tool > Accessibility Inspector

# Features:
# - Inspect accessibility properties of elements
# - Simulate VoiceOver announcements
# - Audit for accessibility issues
```

For Android, use the Accessibility Scanner app:

```bash
# Install from Google Play Store
# Run scans to identify accessibility issues
# Review suggestions for improvements
```

## accessibilityLabel Best Practices

### Writing Effective Labels

The `accessibilityLabel` prop provides a text description that screen readers announce. Writing clear, concise labels is crucial for a good user experience.

```typescript
// Good: Descriptive and action-oriented
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Add item to shopping cart"
  accessibilityRole="button"
>
  <Icon name="cart-plus" />
</TouchableOpacity>

// Bad: Redundant or unclear
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Button" // Too vague
  accessibilityRole="button"
>
  <Icon name="cart-plus" />
</TouchableOpacity>
```

### Label Guidelines

1. **Be Concise**: Keep labels short but descriptive
2. **Avoid Redundancy**: Don't include the element type (button, image)
3. **Use Action Words**: Start with verbs for interactive elements
4. **Provide Context**: Include relevant context when necessary
5. **Be Consistent**: Use consistent terminology throughout the app

```typescript
// Comprehensive labeling example
interface ProductCardProps {
  name: string;
  price: number;
  inStock: boolean;
  onAddToCart: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  name,
  price,
  inStock,
  onAddToCart,
}) => {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${name}, ${price} dollars, ${
        inStock ? 'in stock' : 'out of stock'
      }`}
    >
      <Text>{name}</Text>
      <Text>${price}</Text>
      <TouchableOpacity
        accessible={true}
        accessibilityLabel={`Add ${name} to cart`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !inStock }}
        disabled={!inStock}
        onPress={onAddToCart}
      >
        <Text>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Dynamic Labels

```typescript
// Update labels based on state
const ToggleButton: React.FC<{ isOn: boolean; onToggle: () => void }> = ({
  isOn,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={isOn ? 'Disable notifications' : 'Enable notifications'}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      onPress={onToggle}
    >
      <Text>{isOn ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
};
```

## Reading Order Optimization

### Understanding Reading Order

Screen readers traverse elements in the order they appear in the accessibility tree. This order should follow a logical reading sequence.

```typescript
// Problem: Visual layout doesn't match reading order
<View style={{ flexDirection: 'row-reverse' }}>
  <Text>First visually but last in DOM</Text>
  <Text>Second visually but first in DOM</Text>
</View>

// Solution: Adjust component order or use accessibility order
<View style={{ flexDirection: 'row-reverse' }}>
  <Text accessibilityOrder={2}>First visually</Text>
  <Text accessibilityOrder={1}>Second visually</Text>
</View>
```

### Grouping Related Content

```typescript
// Group related elements for logical reading
<View
  accessible={true}
  accessibilityLabel="User profile: John Doe, Software Engineer, San Francisco"
>
  <Image source={avatarSource} />
  <Text>John Doe</Text>
  <Text>Software Engineer</Text>
  <Text>San Francisco</Text>
</View>
```

### Managing Focus Order

```typescript
import { AccessibilityInfo, findNodeHandle } from 'react-native';

const FormScreen: React.FC = () => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const submitRef = useRef<TouchableOpacity>(null);

  const focusOnElement = (ref: React.RefObject<any>) => {
    const node = findNodeHandle(ref.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  };

  return (
    <View>
      <TextInput
        ref={emailRef}
        accessible={true}
        accessibilityLabel="Email address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextInput
        ref={passwordRef}
        accessible={true}
        accessibilityLabel="Password"
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={() => focusOnElement(submitRef)}
      />
      <TouchableOpacity
        ref={submitRef}
        accessible={true}
        accessibilityLabel="Submit form"
        accessibilityRole="button"
      >
        <Text>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Hiding Decorative Elements

```typescript
// Hide elements that don't add meaningful information
<View>
  <Image
    source={decorativeBackground}
    accessible={false}
    accessibilityElementsHidden={true}
    importantForAccessibility="no-hide-descendants"
  />
  <Text accessible={true}>Important content</Text>
</View>
```

## Handling Images and Icons

### Informative Images

Images that convey information need descriptive labels:

```typescript
// Informative image with description
<Image
  source={chartImage}
  accessible={true}
  accessibilityLabel="Sales chart showing 25% growth in Q4 2025"
  accessibilityRole="image"
/>
```

### Decorative Images

Hide purely decorative images from screen readers:

```typescript
// Decorative image - hide from screen readers
<Image
  source={decorativePattern}
  accessible={false}
  accessibilityElementsHidden={true}
  importantForAccessibility="no"
/>
```

### Icon Buttons

```typescript
// Icon button with proper labeling
interface IconButtonProps {
  iconName: string;
  label: string;
  onPress: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ iconName, label, onPress }) => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={`Double tap to ${label.toLowerCase()}`}
      onPress={onPress}
    >
      <Icon name={iconName} size={24} />
    </TouchableOpacity>
  );
};

// Usage
<IconButton iconName="trash" label="Delete item" onPress={handleDelete} />
<IconButton iconName="edit" label="Edit profile" onPress={handleEdit} />
<IconButton iconName="share" label="Share content" onPress={handleShare} />
```

### Status Icons

```typescript
// Status indicator with meaningful description
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const statusLabels = {
    online: 'Online - available to chat',
    offline: 'Offline - not available',
    busy: 'Busy - do not disturb',
  };

  const statusColors = {
    online: 'green',
    offline: 'gray',
    busy: 'red',
  };

  return (
    <View
      accessible={true}
      accessibilityLabel={statusLabels[status]}
      accessibilityRole="text"
      style={[styles.indicator, { backgroundColor: statusColors[status] }]}
    />
  );
};
```

## Form Accessibility

### Text Input Fields

```typescript
// Accessible form input
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  required?: boolean;
  secureTextEntry?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  error,
  required,
  secureTextEntry,
}) => {
  const accessibilityLabel = `${label}${required ? ', required' : ''}${
    error ? `, error: ${error}` : ''
  }`;

  return (
    <View>
      <Text
        accessible={true}
        accessibilityRole="text"
        nativeID={`${label}-label`}
      >
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={`${label}-label`}
        accessibilityState={{
          invalid: !!error,
        }}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error && styles.inputError]}
      />
      {error && (
        <Text
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >
          {error}
        </Text>
      )}
    </View>
  );
};
```

### Checkboxes and Switches

```typescript
// Accessible checkbox component
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange }) => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkboxContainer}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Icon name="check" size={16} color="white" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// Accessible switch component
interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
}

const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  value,
  onValueChange,
  description,
}) => {
  return (
    <View
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
    >
      <View style={styles.switchRow}>
        <Text>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={label}
        />
      </View>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
};
```

### Dropdown/Picker Accessibility

```typescript
// Accessible picker component
interface AccessiblePickerProps {
  label: string;
  selectedValue: string;
  options: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
}

const AccessiblePicker: React.FC<AccessiblePickerProps> = ({
  label,
  selectedValue,
  options,
  onValueChange,
}) => {
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <View>
      <Text
        accessible={true}
        accessibilityRole="text"
        nativeID={`${label}-picker-label`}
      >
        {label}
      </Text>
      <View
        accessible={true}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}, ${selectedOption?.label || 'No selection'}`}
        accessibilityHint="Double tap to change selection"
        accessibilityLabelledBy={`${label}-picker-label`}
      >
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
        >
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};
```

## Navigation Announcements

### Screen Change Announcements

```typescript
import { AccessibilityInfo } from 'react-native';

// Announce screen changes
const announceScreenChange = (screenName: string) => {
  AccessibilityInfo.announceForAccessibility(`${screenName} screen`);
};

// Usage with React Navigation
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen: React.FC = () => {
  useFocusEffect(
    useCallback(() => {
      AccessibilityInfo.announceForAccessibility('Home screen loaded');
    }, [])
  );

  return (
    <View>
      <Text accessibilityRole="header">Home</Text>
      {/* Screen content */}
    </View>
  );
};
```

### Dynamic Content Announcements

```typescript
// Announce dynamic content updates
interface NotificationBannerProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  type,
}) => {
  useEffect(() => {
    // Announce the notification to screen readers
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.banner, styles[type]]}
    >
      <Text>{message}</Text>
    </View>
  );
};
```

### Loading State Announcements

```typescript
// Announce loading states
interface LoadingIndicatorProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  loadingMessage = 'Loading content',
  loadedMessage = 'Content loaded',
}) => {
  const previousLoading = useRef(isLoading);

  useEffect(() => {
    if (isLoading && !previousLoading.current) {
      AccessibilityInfo.announceForAccessibility(loadingMessage);
    } else if (!isLoading && previousLoading.current) {
      AccessibilityInfo.announceForAccessibility(loadedMessage);
    }
    previousLoading.current = isLoading;
  }, [isLoading, loadingMessage, loadedMessage]);

  if (!isLoading) return null;

  return (
    <View
      accessible={true}
      accessibilityLabel={loadingMessage}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size="large" />
      <Text>{loadingMessage}</Text>
    </View>
  );
};
```

### Modal Announcements

```typescript
// Accessible modal component
interface AccessibleModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  visible,
  title,
  onClose,
  children,
}) => {
  const closeButtonRef = useRef<TouchableOpacity>(null);

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`${title} dialog opened`);
      // Focus on close button when modal opens
      setTimeout(() => {
        const node = findNodeHandle(closeButtonRef.current);
        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }, 100);
    }
  }, [visible, title]);

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View
        accessible={true}
        accessibilityRole="dialog"
        accessibilityLabel={title}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header">{title}</Text>
          <TouchableOpacity
            ref={closeButtonRef}
            accessible={true}
            accessibilityLabel="Close dialog"
            accessibilityRole="button"
            onPress={onClose}
          >
            <Icon name="close" size={24} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
};
```

## Custom Actions

### Implementing Custom Accessibility Actions

```typescript
// Custom actions for list items
interface ListItemProps {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  onEdit,
  onDelete,
  onShare,
}) => {
  const accessibilityActions = [
    { name: 'edit', label: 'Edit item' },
    { name: 'delete', label: 'Delete item' },
    { name: 'share', label: 'Share item' },
  ];

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'edit':
        onEdit();
        break;
      case 'delete':
        onDelete();
        break;
      case 'share':
        onShare();
        break;
    }
  };

  return (
    <View
      accessible={true}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      accessibilityHint="Swipe up or down for more options"
    >
      <Text>{title}</Text>
    </View>
  );
};
```

### Magic Tap (iOS)

```typescript
// Implement magic tap for primary action
// Magic tap is a two-finger double-tap gesture on iOS

interface MediaPlayerProps {
  isPlaying: boolean;
  onPlayPause: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ isPlaying, onPlayPause }) => {
  return (
    <View
      accessible={true}
      accessibilityLabel={`Media player, ${isPlaying ? 'playing' : 'paused'}`}
      accessibilityActions={[
        { name: 'magicTap', label: isPlaying ? 'Pause' : 'Play' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'magicTap') {
          onPlayPause();
        }
      }}
    >
      <Text>{isPlaying ? 'Now Playing' : 'Paused'}</Text>
      <TouchableOpacity
        accessible={true}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        accessibilityRole="button"
        onPress={onPlayPause}
      >
        <Icon name={isPlaying ? 'pause' : 'play'} size={48} />
      </TouchableOpacity>
    </View>
  );
};
```

### Escape Action

```typescript
// Handle escape gesture for dismissal
interface DismissableViewProps {
  onDismiss: () => void;
  children: React.ReactNode;
}

const DismissableView: React.FC<DismissableViewProps> = ({
  onDismiss,
  children,
}) => {
  return (
    <View
      accessible={true}
      accessibilityActions={[{ name: 'escape', label: 'Dismiss' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'escape') {
          onDismiss();
        }
      }}
    >
      {children}
    </View>
  );
};
```

## Platform-Specific Behaviors

### iOS-Specific Accessibility

```typescript
import { Platform } from 'react-native';

// iOS-specific accessibility props
const IOSAccessibleComponent: React.FC = () => {
  return (
    <View
      accessible={true}
      accessibilityLabel="iOS optimized component"
      {...Platform.select({
        ios: {
          accessibilityIgnoresInvertColors: true, // Preserve colors when Invert Colors is on
          accessibilityLanguage: 'en-US', // Specify language for VoiceOver
        },
        default: {},
      })}
    >
      <Text>Content</Text>
    </View>
  );
};
```

### Android-Specific Accessibility

```typescript
// Android-specific accessibility props
const AndroidAccessibleComponent: React.FC = () => {
  return (
    <View
      accessible={true}
      accessibilityLabel="Android optimized component"
      {...Platform.select({
        android: {
          importantForAccessibility: 'yes', // Force inclusion in accessibility tree
          accessibilityLiveRegion: 'polite', // Announce changes
        },
        default: {},
      })}
    >
      <Text>Content</Text>
    </View>
  );
};
```

### Cross-Platform Utility

```typescript
// Cross-platform accessibility utility
interface AccessibilityProps {
  label: string;
  hint?: string;
  role?: string;
  state?: object;
}

const createAccessibilityProps = ({
  label,
  hint,
  role,
  state,
}: AccessibilityProps) => {
  const baseProps = {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessibilityState: state,
  };

  return Platform.select({
    ios: {
      ...baseProps,
      accessibilityLanguage: 'en-US',
    },
    android: {
      ...baseProps,
      importantForAccessibility: 'yes' as const,
    },
    default: baseProps,
  });
};

// Usage
const AccessibleButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  return (
    <TouchableOpacity
      {...createAccessibilityProps({
        label: 'Submit form',
        hint: 'Double tap to submit',
        role: 'button',
      })}
      onPress={onPress}
    >
      <Text>Submit</Text>
    </TouchableOpacity>
  );
};
```

### Handling Platform Differences

```typescript
// Platform-specific behavior handling
const useScreenReaderAnnouncement = () => {
  const announce = useCallback((message: string, options?: { queue?: boolean }) => {
    if (Platform.OS === 'ios') {
      // iOS: Announcements are queued by default
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      // Android: Use live regions for persistent announcements
      // Immediate announcements work the same way
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  return announce;
};
```

## User Testing with Screen Readers

### Setting Up Testing Sessions

Before conducting user testing, prepare your testing environment:

```typescript
// Accessibility testing checklist component
const AccessibilityChecklist: React.FC = () => {
  const checks = [
    'All interactive elements have labels',
    'Images have alt text or are hidden',
    'Form fields have error announcements',
    'Navigation is logical and predictable',
    'Dynamic content is announced',
    'Modals trap focus appropriately',
    'Custom gestures have alternatives',
  ];

  return (
    <View accessible={true} accessibilityRole="list">
      {checks.map((check, index) => (
        <View
          key={index}
          accessible={true}
          accessibilityRole="listitem"
          accessibilityLabel={check}
        >
          <Text>{check}</Text>
        </View>
      ))}
    </View>
  );
};
```

### Automated Testing

```typescript
// Jest test for accessibility
import { render } from '@testing-library/react-native';

describe('Accessibility Tests', () => {
  it('should have accessible button', () => {
    const { getByRole, getByLabelText } = render(
      <TouchableOpacity
        accessible={true}
        accessibilityLabel="Submit form"
        accessibilityRole="button"
      >
        <Text>Submit</Text>
      </TouchableOpacity>
    );

    expect(getByRole('button')).toBeTruthy();
    expect(getByLabelText('Submit form')).toBeTruthy();
  });

  it('should have proper form field labeling', () => {
    const { getByLabelText } = render(
      <TextInput
        accessible={true}
        accessibilityLabel="Email address"
        placeholder="Enter email"
      />
    );

    expect(getByLabelText('Email address')).toBeTruthy();
  });
});
```

### Manual Testing Protocol

```markdown
## Screen Reader Testing Protocol

### Pre-Testing Setup
1. Enable VoiceOver (iOS) or TalkBack (Android)
2. Familiarize yourself with basic gestures
3. Clear any cached accessibility data

### Testing Scenarios

#### Navigation Flow
- [ ] Can navigate to all screens
- [ ] Screen titles are announced
- [ ] Back navigation works with escape gesture

#### Form Interactions
- [ ] All form fields are labeled
- [ ] Required fields are indicated
- [ ] Error messages are announced
- [ ] Submission feedback is provided

#### Interactive Elements
- [ ] All buttons are accessible
- [ ] Custom components respond to activation
- [ ] Loading states are communicated

#### Content Reading
- [ ] Logical reading order
- [ ] No redundant announcements
- [ ] Dynamic content updates are announced
```

### Common Issues and Fixes

```typescript
// Issue 1: Missing accessibility label
// Bad
<TouchableOpacity onPress={handlePress}>
  <Icon name="settings" />
</TouchableOpacity>

// Good
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Open settings"
  accessibilityRole="button"
  onPress={handlePress}
>
  <Icon name="settings" />
</TouchableOpacity>

// Issue 2: Incorrect reading order
// Bad - Nested touchables confuse screen readers
<TouchableOpacity>
  <View>
    <TouchableOpacity>
      <Text>Nested button</Text>
    </TouchableOpacity>
  </View>
</TouchableOpacity>

// Good - Flat structure with clear hierarchy
<View>
  <TouchableOpacity
    accessible={true}
    accessibilityLabel="Primary action"
  >
    <Text>Primary</Text>
  </TouchableOpacity>
  <TouchableOpacity
    accessible={true}
    accessibilityLabel="Secondary action"
  >
    <Text>Secondary</Text>
  </TouchableOpacity>
</View>

// Issue 3: Missing state information
// Bad
<TouchableOpacity onPress={toggleFavorite}>
  <Icon name={isFavorite ? 'heart-filled' : 'heart-outline'} />
</TouchableOpacity>

// Good
<TouchableOpacity
  accessible={true}
  accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  accessibilityRole="button"
  accessibilityState={{ selected: isFavorite }}
  onPress={toggleFavorite}
>
  <Icon name={isFavorite ? 'heart-filled' : 'heart-outline'} />
</TouchableOpacity>
```

### Gathering User Feedback

```typescript
// Accessibility feedback component
interface FeedbackFormProps {
  onSubmit: (feedback: AccessibilityFeedback) => void;
}

interface AccessibilityFeedback {
  rating: number;
  issues: string[];
  comments: string;
}

const AccessibilityFeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState<AccessibilityFeedback>({
    rating: 0,
    issues: [],
    comments: '',
  });

  return (
    <View accessible={true} accessibilityRole="form">
      <Text accessibilityRole="header">Accessibility Feedback</Text>

      <View accessible={true} accessibilityLabel="Rate your experience">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            accessible={true}
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: feedback.rating >= star }}
            onPress={() => setFeedback({ ...feedback, rating: star })}
          >
            <Icon name={feedback.rating >= star ? 'star-filled' : 'star-outline'} />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        accessible={true}
        accessibilityLabel="Additional comments"
        accessibilityHint="Describe any accessibility issues you encountered"
        multiline
        value={feedback.comments}
        onChangeText={(text) => setFeedback({ ...feedback, comments: text })}
      />

      <TouchableOpacity
        accessible={true}
        accessibilityLabel="Submit feedback"
        accessibilityRole="button"
        onPress={() => onSubmit(feedback)}
      >
        <Text>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Conclusion

Supporting screen readers in React Native applications is essential for creating inclusive mobile experiences. By following the best practices outlined in this guide, you can ensure that your apps are accessible to users who rely on VoiceOver and TalkBack.

### Key Takeaways

1. **Always provide accessibility labels** for interactive elements and meaningful images
2. **Use proper accessibility roles** to convey element types to screen readers
3. **Maintain logical reading order** that matches the visual layout
4. **Announce dynamic content changes** using AccessibilityInfo API
5. **Test regularly** with actual screen readers on both platforms
6. **Implement custom actions** for complex interactions
7. **Handle platform differences** appropriately
8. **Gather feedback** from users who rely on assistive technologies

### Additional Resources

- [React Native Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [Apple VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

By investing in accessibility, you create better experiences for all users while expanding your app's reach to millions of people who depend on assistive technologies. Start implementing these practices today, and make your React Native apps truly accessible to everyone.
