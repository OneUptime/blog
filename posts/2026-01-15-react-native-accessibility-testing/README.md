# How to Test React Native Apps for Accessibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Accessibility Testing, A11y, QA, Screen Reader, Mobile Development

Description: Learn how to test React Native applications for accessibility compliance using manual and automated testing methods.

---

## Introduction

Accessibility testing is a critical component of mobile app development that ensures your React Native application can be used by everyone, including people with disabilities. With over one billion people worldwide living with some form of disability, creating accessible applications is not just a legal requirement in many jurisdictions but also a moral imperative and a smart business decision.

React Native provides excellent built-in support for accessibility features, but building accessible apps requires intentional testing throughout the development lifecycle. This comprehensive guide covers manual testing techniques, automated testing tools, and best practices for ensuring your React Native applications meet accessibility standards.

## Why Accessibility Testing Matters

### Legal Requirements

Many countries have laws mandating digital accessibility:

- **Americans with Disabilities Act (ADA)** in the United States
- **European Accessibility Act (EAA)** in the European Union
- **Accessibility for Ontarians with Disabilities Act (AODA)** in Canada
- **Disability Discrimination Act** in Australia

Non-compliance can result in lawsuits, fines, and reputational damage. Companies have faced significant legal action for inaccessible mobile applications.

### Business Benefits

Accessible apps reach a wider audience and often provide better user experiences for everyone:

```typescript
// Example: Proper accessibility labels benefit all users
const SearchButton: React.FC = () => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel="Search for products"
      accessibilityHint="Opens the search screen"
      accessibilityRole="button"
      onPress={handleSearch}
    >
      <SearchIcon />
    </TouchableOpacity>
  );
};
```

### Ethical Considerations

Everyone deserves equal access to technology. Accessibility testing ensures your app does not exclude users based on their abilities.

## Understanding React Native Accessibility Props

Before diving into testing, let's review the key accessibility props in React Native:

```typescript
interface AccessibilityProps {
  // Core accessibility props
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;

  // Actions
  accessibilityActions?: ReadonlyArray<AccessibilityAction>;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;

  // Platform specific
  accessibilityElementsHidden?: boolean; // iOS
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants'; // Android
}

// AccessibilityRole options
type AccessibilityRole =
  | 'none'
  | 'button'
  | 'link'
  | 'search'
  | 'image'
  | 'imagebutton'
  | 'keyboardkey'
  | 'text'
  | 'adjustable'
  | 'header'
  | 'summary'
  | 'alert'
  | 'checkbox'
  | 'combobox'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'scrollbar'
  | 'spinbutton'
  | 'switch'
  | 'tab'
  | 'tablist'
  | 'timer'
  | 'toolbar';
```

## Manual Testing with VoiceOver (iOS)

VoiceOver is Apple's built-in screen reader for iOS devices. Manual testing with VoiceOver is essential for understanding how real users with visual impairments experience your app.

### Enabling VoiceOver

1. Go to **Settings > Accessibility > VoiceOver**
2. Toggle VoiceOver on
3. Alternatively, triple-click the side button (if configured)

### Essential VoiceOver Gestures

```
| Gesture                  | Action                              |
|--------------------------|-------------------------------------|
| Single tap               | Select and speak item               |
| Double tap               | Activate selected item              |
| Swipe right              | Move to next element                |
| Swipe left               | Move to previous element            |
| Three-finger swipe up    | Scroll down                         |
| Three-finger swipe down  | Scroll up                           |
| Two-finger tap           | Pause/resume speaking               |
| Two-finger scrub (Z)     | Go back/dismiss                     |
| Rotor (two-finger rotate)| Access additional navigation options|
```

### VoiceOver Testing Checklist

Create a systematic approach to VoiceOver testing:

```typescript
// voiceover-test-checklist.ts

interface VoiceOverTestItem {
  category: string;
  checkItems: string[];
}

const voiceOverChecklist: VoiceOverTestItem[] = [
  {
    category: 'Navigation',
    checkItems: [
      'Can navigate through all interactive elements by swiping',
      'Focus order follows logical reading order',
      'No elements are skipped or inaccessible',
      'Can navigate back using two-finger scrub gesture',
      'Tab bar items are properly announced',
    ],
  },
  {
    category: 'Labels and Announcements',
    checkItems: [
      'All buttons have descriptive labels',
      'Images have meaningful alt text or are marked decorative',
      'Form fields have associated labels',
      'Error messages are announced',
      'Success messages are announced',
    ],
  },
  {
    category: 'Interactive Elements',
    checkItems: [
      'Buttons respond to double-tap activation',
      'Links clearly indicate they are links',
      'Switches announce their state (on/off)',
      'Sliders can be adjusted with gestures',
      'Custom gestures have alternatives',
    ],
  },
  {
    category: 'Dynamic Content',
    checkItems: [
      'Loading states are announced',
      'List updates are announced',
      'Modal dialogs trap focus appropriately',
      'Alerts are immediately announced',
      'Form validation errors are announced',
    ],
  },
];
```

### Testing Dynamic Announcements

React Native provides the `AccessibilityInfo` API for making dynamic announcements:

```typescript
import { AccessibilityInfo } from 'react-native';

// Announce important updates to screen reader users
const announceFormSubmission = async (success: boolean) => {
  const message = success
    ? 'Form submitted successfully'
    : 'Form submission failed. Please check for errors.';

  await AccessibilityInfo.announceForAccessibility(message);
};

// Check if screen reader is enabled
const checkScreenReader = async () => {
  const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  console.log('Screen reader enabled:', isEnabled);
  return isEnabled;
};

// Listen for screen reader changes
const subscribeToScreenReaderChanges = () => {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    (isEnabled) => {
      console.log('Screen reader status changed:', isEnabled);
    }
  );

  return () => subscription.remove();
};
```

## Manual Testing with TalkBack (Android)

TalkBack is Android's built-in screen reader. While similar to VoiceOver, it has distinct gestures and behaviors that require separate testing.

### Enabling TalkBack

1. Go to **Settings > Accessibility > TalkBack**
2. Toggle TalkBack on
3. Alternatively, press and hold both volume keys for 3 seconds

### Essential TalkBack Gestures

```
| Gesture                    | Action                           |
|----------------------------|----------------------------------|
| Single tap                 | Speak item                       |
| Double tap                 | Activate item                    |
| Swipe right                | Move to next item                |
| Swipe left                 | Move to previous item            |
| Swipe up then right        | Next navigation setting          |
| Swipe down then right      | Previous navigation setting      |
| Two-finger swipe up        | Scroll down                      |
| Two-finger swipe down      | Scroll up                        |
| Swipe down then left       | Back                             |
| Swipe up then left         | Home                             |
```

### Android-Specific Accessibility Testing

```typescript
// android-accessibility-component.tsx

import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';

interface AccessibleButtonProps {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  hint,
  onPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      // Android-specific prop for controlling accessibility importance
      importantForAccessibility={disabled ? 'no' : 'yes'}
      onPress={onPress}
      disabled={disabled}
      style={{
        padding: 16,
        backgroundColor: disabled ? '#ccc' : '#007AFF',
        borderRadius: 8,
      }}
    >
      <Text style={{ color: disabled ? '#666' : '#fff' }}>{label}</Text>
    </TouchableOpacity>
  );
};

// Testing Android-specific accessibility
const AndroidAccessibilityTest: React.FC = () => {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      // This hides all descendants from accessibility tree
    >
      <Text>This content is decorative and hidden from TalkBack</Text>
    </View>
  );
};
```

### TalkBack Testing Checklist

```typescript
const talkBackChecklist: VoiceOverTestItem[] = [
  {
    category: 'Navigation',
    checkItems: [
      'Linear navigation works with swipe gestures',
      'Explore by touch allows direct element selection',
      'Reading controls provide different granularity options',
      'Back gesture (down then left) works correctly',
      'Elements have proper traversal order',
    ],
  },
  {
    category: 'Content Description',
    checkItems: [
      'All ImageView elements have contentDescription',
      'Buttons announce their purpose clearly',
      'EditText fields announce their labels',
      'CheckBox and Switch states are announced',
      'Custom views have appropriate descriptions',
    ],
  },
  {
    category: 'Focus Management',
    checkItems: [
      'Focus indicator is visible on all elements',
      'Focus does not get lost during screen transitions',
      'Dialogs receive focus when opened',
      'Focus returns appropriately when dialogs close',
      'RecyclerView items are individually focusable',
    ],
  },
];
```

## Accessibility Inspector Tools

### iOS Accessibility Inspector

The Accessibility Inspector is a powerful tool included with Xcode for auditing accessibility.

#### Using Accessibility Inspector

1. Open Xcode
2. Go to **Xcode > Open Developer Tool > Accessibility Inspector**
3. Select your simulator or device
4. Use the inspection pointer to examine elements

#### Key Features

```
| Feature              | Description                                    |
|----------------------|------------------------------------------------|
| Inspection           | View accessibility properties of any element   |
| Audit                | Run automated accessibility audits             |
| Settings             | Simulate accessibility settings                |
| Quick Inspection     | Point and inspect any element                  |
| Hierarchy Navigation | Browse the accessibility tree                  |
```

### Android Accessibility Scanner

Google provides the Accessibility Scanner app for auditing Android accessibility:

```typescript
// Common issues detected by Accessibility Scanner:

interface AccessibilityIssue {
  type: string;
  severity: 'error' | 'warning' | 'suggestion';
  description: string;
  fix: string;
}

const commonIssues: AccessibilityIssue[] = [
  {
    type: 'Touch Target Size',
    severity: 'error',
    description: 'Touch target is smaller than 48x48dp',
    fix: 'Increase touchable area to at least 48x48dp',
  },
  {
    type: 'Color Contrast',
    severity: 'error',
    description: 'Text contrast ratio is below 4.5:1',
    fix: 'Adjust colors to meet WCAG AA standards',
  },
  {
    type: 'Missing Label',
    severity: 'error',
    description: 'Interactive element lacks accessible name',
    fix: 'Add accessibilityLabel or contentDescription',
  },
  {
    type: 'Duplicate Description',
    severity: 'warning',
    description: 'Multiple elements have identical labels',
    fix: 'Provide unique, descriptive labels for each element',
  },
];
```

## React Native Testing Library Accessibility Testing

React Native Testing Library (RNTL) provides excellent support for accessibility testing through queries that mirror how assistive technologies interact with your app.

### Setting Up Testing Environment

```typescript
// jest.setup.ts

import '@testing-library/jest-native/extend-expect';

// Configure React Native Testing Library
import { configure } from '@testing-library/react-native';

configure({
  // Throw on async timer warnings
  asyncUtilTimeout: 5000,
});
```

### Accessibility Queries

```typescript
// accessibility-queries.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, TouchableOpacity, View, Switch } from 'react-native';

// Component to test
const LoginForm: React.FC = () => {
  const [rememberMe, setRememberMe] = React.useState(false);

  return (
    <View>
      <Text accessibilityRole="header" style={{ fontSize: 24 }}>
        Login
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign in to your account"
        accessibilityHint="Submits your login credentials"
      >
        <Text>Sign In</Text>
      </TouchableOpacity>

      <View accessible={true} accessibilityRole="switch">
        <Text>Remember me</Text>
        <Switch
          accessibilityLabel="Remember me"
          value={rememberMe}
          onValueChange={setRememberMe}
          accessibilityState={{ checked: rememberMe }}
        />
      </View>
    </View>
  );
};

// Tests using accessibility queries
describe('LoginForm Accessibility', () => {
  it('should have an accessible header', () => {
    render(<LoginForm />);

    // Query by role
    const header = screen.getByRole('header');
    expect(header).toHaveTextContent('Login');
  });

  it('should have an accessible sign in button', () => {
    render(<LoginForm />);

    // Query by accessibility label
    const signInButton = screen.getByLabelText('Sign in to your account');
    expect(signInButton).toBeTruthy();

    // Verify the hint
    expect(signInButton).toHaveProp(
      'accessibilityHint',
      'Submits your login credentials'
    );
  });

  it('should have a properly labeled switch', () => {
    render(<LoginForm />);

    const rememberSwitch = screen.getByRole('switch');
    expect(rememberSwitch).toBeTruthy();
  });

  it('should query by accessibility state', () => {
    render(<LoginForm />);

    // Query elements by their accessibility state
    const uncheckedSwitch = screen.getByA11yState({ checked: false });
    expect(uncheckedSwitch).toBeTruthy();
  });
});
```

### Testing Accessibility States

```typescript
// accessibility-states.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity, Text, View } from 'react-native';

interface ExpandableCardProps {
  title: string;
  content: string;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({ title, content }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={expanded ? 'Collapse section' : 'Expand section'}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text>{title}</Text>
      </TouchableOpacity>

      {expanded && (
        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${title} content`}
        >
          <Text>{content}</Text>
        </View>
      )}
    </View>
  );
};

describe('ExpandableCard Accessibility', () => {
  it('should announce expanded state correctly', () => {
    render(
      <ExpandableCard
        title="Settings"
        content="Configure your preferences here"
      />
    );

    const button = screen.getByRole('button');

    // Initially collapsed
    expect(button).toHaveAccessibilityState({ expanded: false });
    expect(button).toHaveProp('accessibilityHint', 'Expand section');

    // Expand the card
    fireEvent.press(button);

    // Now expanded
    expect(button).toHaveAccessibilityState({ expanded: true });
    expect(button).toHaveProp('accessibilityHint', 'Collapse section');
  });

  it('should have live region for dynamic content', () => {
    render(
      <ExpandableCard
        title="Settings"
        content="Configure your preferences here"
      />
    );

    // Expand to show content
    fireEvent.press(screen.getByRole('button'));

    // Verify live region exists for screen reader announcements
    const contentRegion = screen.getByLabelText('Settings content');
    expect(contentRegion).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
```

## Jest Accessibility Matchers

Create custom Jest matchers for comprehensive accessibility testing:

```typescript
// jest-a11y-matchers.ts

import { ReactTestInstance } from 'react-test-renderer';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveAccessibleName(name: string): R;
      toHaveMinimumTouchTarget(): R;
      toMeetContrastRequirements(): R;
    }
  }
}

const MIN_TOUCH_TARGET = 44; // WCAG minimum

expect.extend({
  toBeAccessible(received: ReactTestInstance) {
    const hasAccessible = received.props.accessible !== false;
    const hasLabel = received.props.accessibilityLabel !== undefined;
    const hasRole = received.props.accessibilityRole !== undefined;

    const pass = hasAccessible && (hasLabel || hasRole);

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be accessible`
          : `Expected element to be accessible with label or role. ` +
            `Got accessible=${hasAccessible}, label=${hasLabel}, role=${hasRole}`,
    };
  },

  toHaveAccessibleName(received: ReactTestInstance, name: string) {
    const actualLabel = received.props.accessibilityLabel;
    const pass = actualLabel === name;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have accessible name "${name}"`
          : `Expected element to have accessible name "${name}", but got "${actualLabel}"`,
    };
  },

  toHaveMinimumTouchTarget(received: ReactTestInstance) {
    const style = received.props.style || {};
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

    const width = flatStyle.width || flatStyle.minWidth || 0;
    const height = flatStyle.height || flatStyle.minHeight || 0;
    const padding = flatStyle.padding || 0;

    const effectiveWidth = width + padding * 2;
    const effectiveHeight = height + padding * 2;

    const pass =
      effectiveWidth >= MIN_TOUCH_TARGET && effectiveHeight >= MIN_TOUCH_TARGET;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to meet minimum touch target size`
          : `Expected element to have minimum ${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET} touch target, ` +
            `but got ${effectiveWidth}x${effectiveHeight}`,
    };
  },
});

// Usage example
describe('Custom A11y Matchers', () => {
  it('validates accessible button', () => {
    const { getByTestId } = render(
      <TouchableOpacity
        testID="submit-button"
        accessible={true}
        accessibilityLabel="Submit form"
        accessibilityRole="button"
        style={{ width: 100, height: 48 }}
      >
        <Text>Submit</Text>
      </TouchableOpacity>
    );

    const button = getByTestId('submit-button');
    expect(button).toBeAccessible();
    expect(button).toHaveAccessibleName('Submit form');
    expect(button).toHaveMinimumTouchTarget();
  });
});
```

## Automated Accessibility Audits

### Setting Up Automated Audits

```typescript
// accessibility-audit.ts

import { ReactTestInstance } from 'react-test-renderer';

interface AuditResult {
  passed: boolean;
  violations: AuditViolation[];
  warnings: AuditWarning[];
}

interface AuditViolation {
  rule: string;
  element: string;
  message: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

interface AuditWarning {
  rule: string;
  element: string;
  message: string;
}

class AccessibilityAuditor {
  private violations: AuditViolation[] = [];
  private warnings: AuditWarning[] = [];

  audit(root: ReactTestInstance): AuditResult {
    this.violations = [];
    this.warnings = [];

    this.auditTree(root);

    return {
      passed: this.violations.length === 0,
      violations: this.violations,
      warnings: this.warnings,
    };
  }

  private auditTree(node: ReactTestInstance): void {
    // Check current node
    this.checkAccessibilityLabel(node);
    this.checkTouchTargetSize(node);
    this.checkImageAccessibility(node);
    this.checkFormLabels(node);
    this.checkHeadingHierarchy(node);

    // Recursively check children
    if (node.children) {
      node.children.forEach((child) => {
        if (typeof child !== 'string') {
          this.auditTree(child);
        }
      });
    }
  }

  private checkAccessibilityLabel(node: ReactTestInstance): void {
    const interactiveTypes = ['TouchableOpacity', 'TouchableHighlight', 'Pressable', 'Button'];

    if (interactiveTypes.includes(node.type as string)) {
      if (!node.props.accessibilityLabel && !node.props['aria-label']) {
        this.violations.push({
          rule: 'button-has-accessible-name',
          element: node.type as string,
          message: 'Interactive elements must have an accessible name',
          impact: 'critical',
        });
      }
    }
  }

  private checkTouchTargetSize(node: ReactTestInstance): void {
    const MIN_SIZE = 44;
    const style = node.props.style;

    if (style) {
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

      if (flatStyle.width && flatStyle.width < MIN_SIZE) {
        this.violations.push({
          rule: 'touch-target-size',
          element: node.type as string,
          message: `Touch target width (${flatStyle.width}) is below minimum (${MIN_SIZE})`,
          impact: 'serious',
        });
      }

      if (flatStyle.height && flatStyle.height < MIN_SIZE) {
        this.violations.push({
          rule: 'touch-target-size',
          element: node.type as string,
          message: `Touch target height (${flatStyle.height}) is below minimum (${MIN_SIZE})`,
          impact: 'serious',
        });
      }
    }
  }

  private checkImageAccessibility(node: ReactTestInstance): void {
    if (node.type === 'Image') {
      if (!node.props.accessibilityLabel && !node.props.accessible === false) {
        this.warnings.push({
          rule: 'image-has-alt',
          element: 'Image',
          message: 'Images should have accessibilityLabel or be marked as decorative',
        });
      }
    }
  }

  private checkFormLabels(node: ReactTestInstance): void {
    if (node.type === 'TextInput') {
      if (!node.props.accessibilityLabel && !node.props.placeholder) {
        this.violations.push({
          rule: 'input-has-label',
          element: 'TextInput',
          message: 'Form inputs must have an accessible label',
          impact: 'critical',
        });
      }
    }
  }

  private checkHeadingHierarchy(node: ReactTestInstance): void {
    if (node.props.accessibilityRole === 'header') {
      // Additional heading hierarchy checks could be added here
      if (!node.props.accessibilityLabel && !node.children?.length) {
        this.warnings.push({
          rule: 'heading-has-content',
          element: node.type as string,
          message: 'Headers should have meaningful content',
        });
      }
    }
  }
}

export const accessibilityAuditor = new AccessibilityAuditor();
```

### Integrating Audits into Tests

```typescript
// accessibility-audit.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import { accessibilityAuditor } from './accessibility-audit';

describe('Accessibility Audit Integration', () => {
  it('should pass audit for accessible component', () => {
    const { toJSON } = render(<AccessibleComponent />);
    const result = accessibilityAuditor.audit(toJSON() as any);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail audit for inaccessible component', () => {
    const { toJSON } = render(<InaccessibleComponent />);
    const result = accessibilityAuditor.audit(toJSON() as any);

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);

    // Log violations for debugging
    result.violations.forEach((v) => {
      console.log(`[${v.impact}] ${v.rule}: ${v.message}`);
    });
  });
});
```

## Common Accessibility Issues and Fixes

### Issue 1: Missing Accessibility Labels

```typescript
// Problem
const BadButton = () => (
  <TouchableOpacity onPress={handlePress}>
    <Icon name="settings" />
  </TouchableOpacity>
);

// Solution
const GoodButton = () => (
  <TouchableOpacity
    onPress={handlePress}
    accessible={true}
    accessibilityLabel="Open settings"
    accessibilityRole="button"
  >
    <Icon name="settings" />
  </TouchableOpacity>
);
```

### Issue 2: Improper Focus Order

```typescript
// Problem: Focus jumps around unexpectedly
const BadLayout = () => (
  <View>
    <View style={{ position: 'absolute', top: 100 }}>
      <Button title="Third" /> {/* Visually third but focused first */}
    </View>
    <Button title="First" />
    <Button title="Second" />
  </View>
);

// Solution: Use proper ordering or accessibilityViewIsModal
const GoodLayout = () => (
  <View>
    <Button title="First" />
    <Button title="Second" />
    <Button title="Third" />
  </View>
);

// Or explicitly control focus order
const AccessibleLayout = () => {
  const firstRef = React.useRef(null);
  const secondRef = React.useRef(null);
  const thirdRef = React.useRef(null);

  return (
    <View>
      <View
        ref={thirdRef}
        accessible={true}
        accessibilityLabel="Third button container"
        style={{ position: 'absolute', top: 100 }}
      >
        <Button
          title="Third"
          accessibilityElementsHidden={false}
        />
      </View>
      <Button ref={firstRef} title="First" />
      <Button ref={secondRef} title="Second" />
    </View>
  );
};
```

### Issue 3: Missing State Information

```typescript
// Problem: State changes not announced
const BadCheckbox = ({ checked, onChange }) => (
  <TouchableOpacity onPress={onChange}>
    <Icon name={checked ? 'checkbox-checked' : 'checkbox-empty'} />
    <Text>Accept terms</Text>
  </TouchableOpacity>
);

// Solution: Include accessibility state
const GoodCheckbox = ({ checked, onChange }) => (
  <TouchableOpacity
    onPress={onChange}
    accessible={true}
    accessibilityRole="checkbox"
    accessibilityLabel="Accept terms and conditions"
    accessibilityState={{ checked }}
  >
    <Icon name={checked ? 'checkbox-checked' : 'checkbox-empty'} />
    <Text>Accept terms</Text>
  </TouchableOpacity>
);
```

### Issue 4: Inadequate Touch Targets

```typescript
// Problem: Touch targets too small
const BadIconButton = () => (
  <TouchableOpacity
    style={{ width: 24, height: 24 }}
    onPress={handlePress}
  >
    <Icon size={24} name="close" />
  </TouchableOpacity>
);

// Solution: Expand touch target while keeping visual size
const GoodIconButton = () => (
  <TouchableOpacity
    style={{
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    accessible={true}
    accessibilityLabel="Close"
    accessibilityRole="button"
    onPress={handlePress}
  >
    <Icon size={24} name="close" />
  </TouchableOpacity>
);
```

### Issue 5: Poor Color Contrast

```typescript
// Problem: Insufficient contrast
const BadText = () => (
  <Text style={{ color: '#999', backgroundColor: '#fff' }}>
    Low contrast text
  </Text>
);

// Solution: Meet WCAG AA contrast ratio (4.5:1 for normal text)
const GoodText = () => (
  <Text style={{ color: '#595959', backgroundColor: '#fff' }}>
    Accessible contrast text
  </Text>
);

// Utility function to check contrast
const checkContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};
```

## Creating Accessibility Test Checklists

### Comprehensive Test Checklist

```typescript
// accessibility-checklist.ts

interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  testMethod: 'manual' | 'automated' | 'both';
  passed?: boolean;
  notes?: string;
}

const accessibilityChecklist: ChecklistItem[] = [
  // Perceivable
  {
    id: 'P1',
    category: 'Text Alternatives',
    requirement: 'All images have appropriate alt text',
    wcagLevel: 'A',
    testMethod: 'both',
  },
  {
    id: 'P2',
    category: 'Text Alternatives',
    requirement: 'Decorative images are hidden from screen readers',
    wcagLevel: 'A',
    testMethod: 'automated',
  },
  {
    id: 'P3',
    category: 'Color Contrast',
    requirement: 'Text has 4.5:1 contrast ratio (normal text)',
    wcagLevel: 'AA',
    testMethod: 'automated',
  },
  {
    id: 'P4',
    category: 'Color Contrast',
    requirement: 'Text has 3:1 contrast ratio (large text)',
    wcagLevel: 'AA',
    testMethod: 'automated',
  },
  {
    id: 'P5',
    category: 'Resize',
    requirement: 'App supports text scaling up to 200%',
    wcagLevel: 'AA',
    testMethod: 'manual',
  },

  // Operable
  {
    id: 'O1',
    category: 'Touch Targets',
    requirement: 'All interactive elements have 44x44pt minimum size',
    wcagLevel: 'AA',
    testMethod: 'automated',
  },
  {
    id: 'O2',
    category: 'Focus',
    requirement: 'Focus order follows logical sequence',
    wcagLevel: 'A',
    testMethod: 'manual',
  },
  {
    id: 'O3',
    category: 'Focus',
    requirement: 'Focus is visible on all interactive elements',
    wcagLevel: 'AA',
    testMethod: 'manual',
  },
  {
    id: 'O4',
    category: 'Gestures',
    requirement: 'Complex gestures have simple alternatives',
    wcagLevel: 'A',
    testMethod: 'manual',
  },
  {
    id: 'O5',
    category: 'Timing',
    requirement: 'No time limits or ability to extend',
    wcagLevel: 'A',
    testMethod: 'manual',
  },

  // Understandable
  {
    id: 'U1',
    category: 'Labels',
    requirement: 'All form fields have visible labels',
    wcagLevel: 'A',
    testMethod: 'both',
  },
  {
    id: 'U2',
    category: 'Errors',
    requirement: 'Error messages are descriptive and announced',
    wcagLevel: 'A',
    testMethod: 'manual',
  },
  {
    id: 'U3',
    category: 'Navigation',
    requirement: 'Consistent navigation patterns throughout app',
    wcagLevel: 'AA',
    testMethod: 'manual',
  },

  // Robust
  {
    id: 'R1',
    category: 'Compatibility',
    requirement: 'Works with VoiceOver (iOS)',
    wcagLevel: 'A',
    testMethod: 'manual',
  },
  {
    id: 'R2',
    category: 'Compatibility',
    requirement: 'Works with TalkBack (Android)',
    wcagLevel: 'A',
    testMethod: 'manual',
  },
  {
    id: 'R3',
    category: 'Semantic',
    requirement: 'Correct accessibility roles assigned',
    wcagLevel: 'A',
    testMethod: 'automated',
  },
];

// Checklist runner
const runAccessibilityChecklist = async (
  component: React.ComponentType
): Promise<{ score: number; results: ChecklistItem[] }> => {
  const results = [...accessibilityChecklist];
  let passedCount = 0;

  // Run automated checks
  for (const item of results) {
    if (item.testMethod === 'automated' || item.testMethod === 'both') {
      // Implement automated check logic here
      // This would integrate with your audit tools
    }
  }

  const automatedItems = results.filter(
    (i) => i.testMethod === 'automated' && i.passed !== undefined
  );
  passedCount = automatedItems.filter((i) => i.passed).length;

  return {
    score: (passedCount / automatedItems.length) * 100,
    results,
  };
};
```

## Continuous Accessibility Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/accessibility.yml

name: Accessibility Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  accessibility-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload accessibility report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: accessibility-report
          path: coverage/accessibility-report.html

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('coverage/a11y-results.json'));

            const body = `## Accessibility Test Results

            **Score:** ${report.score}%
            **Violations:** ${report.violations}
            **Warnings:** ${report.warnings}

            ${report.violations > 0 ? '### Critical Issues\n' + report.criticalIssues.join('\n') : ''}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### Pre-commit Hook for Accessibility

```typescript
// scripts/pre-commit-a11y.ts

import { execSync } from 'child_process';

const runAccessibilityChecks = () => {
  console.log('Running accessibility pre-commit checks...\n');

  try {
    // Run accessibility-specific tests
    execSync('npm run test:a11y -- --onlyChanged', { stdio: 'inherit' });

    // Run eslint with accessibility rules
    execSync('npx eslint --ext .tsx,.ts src/ --rule "jsx-a11y/*: error"', {
      stdio: 'inherit',
    });

    console.log('\nAccessibility checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\nAccessibility checks failed. Please fix the issues above.');
    process.exit(1);
  }
};

runAccessibilityChecks();
```

### ESLint Configuration for Accessibility

```javascript
// .eslintrc.js

module.exports = {
  plugins: ['react-native-a11y'],
  extends: ['plugin:react-native-a11y/all'],
  rules: {
    // Enforce accessibility labels
    'react-native-a11y/has-accessibility-hint': 'warn',
    'react-native-a11y/has-accessibility-props': 'error',
    'react-native-a11y/has-valid-accessibility-actions': 'error',
    'react-native-a11y/has-valid-accessibility-role': 'error',
    'react-native-a11y/has-valid-accessibility-state': 'error',
    'react-native-a11y/has-valid-accessibility-states': 'error',
    'react-native-a11y/has-valid-accessibility-component-type': 'error',
    'react-native-a11y/has-valid-accessibility-traits': 'error',
    'react-native-a11y/has-valid-accessibility-value': 'error',
    'react-native-a11y/no-nested-touchables': 'error',
    'react-native-a11y/has-valid-accessibility-ignores-invert-colors': 'warn',
    'react-native-a11y/has-valid-accessibility-live-region': 'error',
    'react-native-a11y/has-valid-important-for-accessibility': 'error',
  },
};
```

## Accessibility Certification and Compliance

### WCAG 2.1 Compliance Levels

```typescript
// wcag-compliance.ts

interface WCAGCriteria {
  id: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  applicability: 'mobile' | 'web' | 'both';
}

const mobileRelevantCriteria: WCAGCriteria[] = [
  // Level A
  { id: '1.1.1', name: 'Non-text Content', level: 'A', principle: 'Perceivable', applicability: 'both' },
  { id: '1.3.1', name: 'Info and Relationships', level: 'A', principle: 'Perceivable', applicability: 'both' },
  { id: '1.4.1', name: 'Use of Color', level: 'A', principle: 'Perceivable', applicability: 'both' },
  { id: '2.1.1', name: 'Keyboard', level: 'A', principle: 'Operable', applicability: 'both' },
  { id: '2.4.2', name: 'Page Titled', level: 'A', principle: 'Operable', applicability: 'both' },
  { id: '2.4.3', name: 'Focus Order', level: 'A', principle: 'Operable', applicability: 'both' },
  { id: '2.4.4', name: 'Link Purpose', level: 'A', principle: 'Operable', applicability: 'both' },
  { id: '3.1.1', name: 'Language of Page', level: 'A', principle: 'Understandable', applicability: 'both' },
  { id: '3.2.1', name: 'On Focus', level: 'A', principle: 'Understandable', applicability: 'both' },
  { id: '4.1.1', name: 'Parsing', level: 'A', principle: 'Robust', applicability: 'both' },
  { id: '4.1.2', name: 'Name, Role, Value', level: 'A', principle: 'Robust', applicability: 'both' },

  // Level AA
  { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', principle: 'Perceivable', applicability: 'both' },
  { id: '1.4.4', name: 'Resize Text', level: 'AA', principle: 'Perceivable', applicability: 'both' },
  { id: '1.4.10', name: 'Reflow', level: 'AA', principle: 'Perceivable', applicability: 'mobile' },
  { id: '1.4.11', name: 'Non-text Contrast', level: 'AA', principle: 'Perceivable', applicability: 'both' },
  { id: '2.4.6', name: 'Headings and Labels', level: 'AA', principle: 'Operable', applicability: 'both' },
  { id: '2.4.7', name: 'Focus Visible', level: 'AA', principle: 'Operable', applicability: 'both' },
  { id: '2.5.5', name: 'Target Size', level: 'AAA', principle: 'Operable', applicability: 'mobile' },
];

// Compliance report generator
const generateComplianceReport = (
  testResults: Map<string, boolean>
): { level: 'A' | 'AA' | 'AAA' | 'none'; report: string } => {
  const levelACriteria = mobileRelevantCriteria.filter((c) => c.level === 'A');
  const levelAACriteria = mobileRelevantCriteria.filter((c) => c.level === 'AA');

  const levelAPassed = levelACriteria.every((c) => testResults.get(c.id));
  const levelAAPassed = levelAACriteria.every((c) => testResults.get(c.id));

  let level: 'A' | 'AA' | 'AAA' | 'none' = 'none';
  if (levelAPassed && levelAAPassed) {
    level = 'AA';
  } else if (levelAPassed) {
    level = 'A';
  }

  const report = `
    WCAG 2.1 Mobile Compliance Report
    ==================================

    Compliance Level: ${level}

    Level A Criteria: ${levelACriteria.filter((c) => testResults.get(c.id)).length}/${levelACriteria.length} passed
    Level AA Criteria: ${levelAACriteria.filter((c) => testResults.get(c.id)).length}/${levelAACriteria.length} passed

    Failed Criteria:
    ${mobileRelevantCriteria
      .filter((c) => !testResults.get(c.id))
      .map((c) => `  - ${c.id}: ${c.name}`)
      .join('\n')}
  `;

  return { level, report };
};
```

### Documentation for Compliance

```typescript
// accessibility-statement.ts

interface AccessibilityStatement {
  appName: string;
  version: string;
  complianceLevel: string;
  testDate: string;
  technologies: string[];
  limitations: string[];
  contact: {
    email: string;
    phone?: string;
  };
}

const generateAccessibilityStatement = (data: AccessibilityStatement): string => {
  return `
# Accessibility Statement for ${data.appName}

**Last Updated:** ${data.testDate}
**Version:** ${data.version}

## Commitment to Accessibility

We are committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

${data.appName} is **${data.complianceLevel}** compliant with WCAG 2.1.

## Technical Specifications

This application relies on the following technologies to work with the particular combination of assistive technology:

${data.technologies.map((t) => `- ${t}`).join('\n')}

## Known Limitations

${data.limitations.length > 0
  ? data.limitations.map((l) => `- ${l}`).join('\n')
  : 'No known limitations at this time.'}

## Feedback

We welcome your feedback on the accessibility of ${data.appName}. Please let us know if you encounter accessibility barriers:

- **Email:** ${data.contact.email}
${data.contact.phone ? `- **Phone:** ${data.contact.phone}` : ''}

We try to respond to feedback within 2 business days.
  `;
};
```

## Conclusion

Testing React Native apps for accessibility is a multi-faceted process that requires both manual and automated approaches. By implementing the strategies outlined in this guide, you can ensure your application is usable by everyone.

### Key Takeaways

1. **Start Early**: Incorporate accessibility from the design phase, not as an afterthought
2. **Test with Real Users**: Manual testing with screen readers provides invaluable insights
3. **Automate What You Can**: Use testing libraries and CI/CD integration to catch regressions
4. **Follow Standards**: WCAG 2.1 provides a solid framework for compliance
5. **Document Everything**: Maintain checklists and compliance reports
6. **Iterate Continuously**: Accessibility is an ongoing commitment, not a one-time task

### Resources

- [React Native Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple Accessibility Programming Guide](https://developer.apple.com/accessibility/)
- [Android Accessibility Developer Guide](https://developer.android.com/guide/topics/ui/accessibility)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

By following these guidelines and continuously testing for accessibility, you will create React Native applications that are truly inclusive and provide excellent experiences for all users.
