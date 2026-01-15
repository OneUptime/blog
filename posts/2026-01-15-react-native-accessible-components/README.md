# How to Implement Accessible Components in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Accessibility, A11y, Screen Reader, Mobile Development, Inclusive Design

Description: Learn how to build accessible React Native components that work well with screen readers and assistive technologies.

---

## Introduction

Accessibility is not just a feature—it's a fundamental aspect of building inclusive applications. With over 1 billion people worldwide living with some form of disability, creating accessible mobile applications ensures that everyone can use your product effectively. React Native provides robust accessibility support that maps to native accessibility APIs on both iOS and Android platforms.

In this comprehensive guide, we'll explore how to implement accessible components in React Native, covering everything from basic accessibility props to advanced patterns for creating truly inclusive mobile experiences.

## Why Accessibility Matters

### The Business Case

Building accessible applications isn't just the right thing to do—it makes business sense:

1. **Expanded User Base**: Accessible apps reach more users, including the estimated 15% of the global population with disabilities.
2. **Legal Compliance**: Many countries have accessibility laws and regulations that require digital products to be accessible.
3. **Improved User Experience**: Accessibility improvements often benefit all users, not just those with disabilities.
4. **SEO Benefits**: While primarily a web concern, accessible design principles carry over to app store optimization.

### Types of Disabilities to Consider

When building accessible React Native applications, consider users with:

- **Visual impairments**: Blindness, low vision, color blindness
- **Motor impairments**: Limited fine motor control, tremors, paralysis
- **Hearing impairments**: Deafness, hard of hearing
- **Cognitive impairments**: Learning disabilities, memory issues, attention disorders

## React Native Accessibility Props Overview

React Native provides several accessibility props that map to native accessibility APIs. Let's explore each one in detail.

### The `accessible` Prop

The `accessible` prop is a boolean that indicates whether the element should be treated as an accessible element. When set to `true`, the view is grouped together and treated as a single focusable unit.

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CardProps {
  title: string;
  description: string;
}

const AccessibleCard: React.FC<CardProps> = ({ title, description }) => {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${title}. ${description}`}
      style={styles.card}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

export default AccessibleCard;
```

### When to Group Elements

Use `accessible={true}` when:

- Multiple text elements should be read as a single unit
- A custom component represents a single interactive element
- Visual elements together form one logical item

## Understanding accessibilityLabel

The `accessibilityLabel` prop provides a text description that screen readers announce when the element receives focus. This is one of the most important accessibility props.

### Best Practices for accessibilityLabel

```typescript
import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';

interface IconButtonProps {
  iconSource: number;
  onPress: () => void;
  action: string;
}

// Good: Descriptive label that explains the action
const GoodIconButton: React.FC<IconButtonProps> = ({
  iconSource,
  onPress,
  action
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={action}
      accessibilityRole="button"
      style={styles.iconButton}
    >
      <Image source={iconSource} style={styles.icon} />
    </TouchableOpacity>
  );
};

// Bad: Label that just describes the visual
const BadIconButton: React.FC<IconButtonProps> = ({
  iconSource,
  onPress
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="gear icon" // Don't do this!
      style={styles.iconButton}
    >
      <Image source={iconSource} style={styles.icon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 12,
    borderRadius: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
});

export { GoodIconButton, BadIconButton };
```

### Dynamic Labels

Labels should update based on component state:

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ToggleButtonProps {
  initialState?: boolean;
  onToggle?: (isActive: boolean) => void;
}

const FavoriteButton: React.FC<ToggleButtonProps> = ({
  initialState = false,
  onToggle
}) => {
  const [isFavorite, setIsFavorite] = useState(initialState);

  const handlePress = () => {
    const newState = !isFavorite;
    setIsFavorite(newState);
    onToggle?.(newState);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityLabel={
        isFavorite ? 'Remove from favorites' : 'Add to favorites'
      }
      accessibilityRole="button"
      style={[
        styles.button,
        isFavorite && styles.activeButton
      ]}
    >
      <Text style={styles.buttonText}>
        {isFavorite ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  activeButton: {
    backgroundColor: '#ffd700',
  },
  buttonText: {
    fontSize: 24,
  },
});

export default FavoriteButton;
```

## Mastering accessibilityRole

The `accessibilityRole` prop communicates the purpose of a component to assistive technologies. React Native supports numerous roles that map to native accessibility roles.

### Common Accessibility Roles

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  Image,
  StyleSheet,
  AccessibilityRole
} from 'react-native';

// Button role - for interactive buttons
interface ButtonExampleProps {
  onPress: () => void;
  label: string;
}

const ButtonExample: React.FC<ButtonExampleProps> = ({ onPress, label }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={styles.button}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

// Link role - for navigation elements
interface LinkExampleProps {
  onPress: () => void;
  text: string;
}

const LinkExample: React.FC<LinkExampleProps> = ({ onPress, text }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="link"
    accessibilityLabel={text}
  >
    <Text style={styles.link}>{text}</Text>
  </TouchableOpacity>
);

// Header role - for section headers
interface HeaderExampleProps {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const HeaderExample: React.FC<HeaderExampleProps> = ({ text, level = 1 }) => {
  const fontSize = 32 - (level - 1) * 4;

  return (
    <Text
      accessibilityRole="header"
      style={[styles.header, { fontSize }]}
    >
      {text}
    </Text>
  );
};

// Image role - for meaningful images
interface ImageExampleProps {
  source: number;
  description: string;
}

const ImageExample: React.FC<ImageExampleProps> = ({ source, description }) => (
  <Image
    source={source}
    accessibilityRole="image"
    accessibilityLabel={description}
    style={styles.image}
  />
);

// Checkbox role - for toggle controls
interface CheckboxExampleProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

const CheckboxExample: React.FC<CheckboxExampleProps> = ({
  checked,
  onToggle,
  label
}) => (
  <TouchableOpacity
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={label}
    style={styles.checkbox}
  >
    <View style={[
      styles.checkboxBox,
      checked && styles.checkboxChecked
    ]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  header: {
    fontWeight: 'bold',
    marginVertical: 8,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
});

export {
  ButtonExample,
  LinkExample,
  HeaderExample,
  ImageExample,
  CheckboxExample
};
```

### Complete List of Accessibility Roles

Here's a comprehensive reference of all available roles:

| Role | Usage |
|------|-------|
| `none` | Element has no role |
| `button` | Interactive button |
| `link` | Navigation link |
| `search` | Search field |
| `image` | Image content |
| `keyboardkey` | Keyboard key |
| `text` | Static text |
| `adjustable` | Adjustable element (slider) |
| `imagebutton` | Image that acts as button |
| `header` | Section header |
| `summary` | Summary information |
| `alert` | Alert message |
| `checkbox` | Checkbox control |
| `combobox` | Combo box |
| `menu` | Menu container |
| `menubar` | Menu bar |
| `menuitem` | Menu item |
| `progressbar` | Progress indicator |
| `radio` | Radio button |
| `radiogroup` | Radio button group |
| `scrollbar` | Scroll bar |
| `spinbutton` | Spin button |
| `switch` | Toggle switch |
| `tab` | Tab |
| `tablist` | Tab list |
| `timer` | Timer |
| `toolbar` | Toolbar |

## Working with accessibilityState

The `accessibilityState` prop describes the current state of a component. It's an object that can contain several boolean properties.

### State Properties

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from 'react-native';

interface AccessibleButtonProps {
  label: string;
  onPress: () => Promise<void>;
  disabled?: boolean;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  onPress,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: disabled || isLoading,
        busy: isLoading,
      }}
      style={[
        styles.button,
        (disabled || isLoading) && styles.buttonDisabled
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

// Expanded/Collapsed state example
interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.accordion}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={
          isExpanded
            ? 'Double tap to collapse'
            : 'Double tap to expand'
        }
        style={styles.accordionHeader}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <Text style={styles.accordionIcon}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// Selected state example
interface SelectableItemProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

const SelectableItem: React.FC<SelectableItemProps> = ({
  label,
  isSelected,
  onSelect
}) => (
  <TouchableOpacity
    onPress={onSelect}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: isSelected }}
    style={[
      styles.selectableItem,
      isSelected && styles.selectableItemSelected
    ]}
  >
    <Text style={[
      styles.selectableText,
      isSelected && styles.selectableTextSelected
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  accordion: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  accordionIcon: {
    fontSize: 12,
  },
  accordionContent: {
    padding: 16,
  },
  selectableItem: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginVertical: 4,
  },
  selectableItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  selectableText: {
    fontSize: 16,
  },
  selectableTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export { AccessibleButton, Accordion, SelectableItem };
```

## Using accessibilityHint Effectively

The `accessibilityHint` prop provides additional context about what will happen when the user interacts with an element. It should describe the result of the action, not the action itself.

### Best Practices for Hints

```typescript
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface HintExampleProps {
  onPress: () => void;
}

// Good hint examples
const GoodHintExamples: React.FC<HintExampleProps> = ({ onPress }) => (
  <View style={styles.container}>
    {/* Good: Describes the result */}
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Delete item"
      accessibilityHint="Removes this item from your cart"
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.buttonText}>Delete</Text>
    </TouchableOpacity>

    {/* Good: Provides navigation context */}
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="View profile"
      accessibilityHint="Opens your profile settings page"
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.buttonText}>Profile</Text>
    </TouchableOpacity>

    {/* Good: Explains what happens next */}
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Submit form"
      accessibilityHint="Sends your information and creates your account"
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.buttonText}>Submit</Text>
    </TouchableOpacity>
  </View>
);

// Bad hint examples (what NOT to do)
const BadHintExamples: React.FC<HintExampleProps> = ({ onPress }) => (
  <View style={styles.container}>
    {/* Bad: Describes the action, not the result */}
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Delete"
      accessibilityHint="Tap to delete" // Don't do this!
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.buttonText}>Delete</Text>
    </TouchableOpacity>

    {/* Bad: Redundant with the label */}
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Submit button"
      accessibilityHint="This is a submit button" // Don't do this!
      accessibilityRole="button"
      style={styles.button}
    >
      <Text style={styles.buttonText}>Submit</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { GoodHintExamples, BadHintExamples };
```

## Building Custom Accessible Components

Let's create comprehensive accessible custom components that follow best practices.

### Accessible Custom Dropdown

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';

interface DropdownOption {
  id: string;
  label: string;
  value: string;
}

interface AccessibleDropdownProps {
  label: string;
  options: DropdownOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
}

const AccessibleDropdown: React.FC<AccessibleDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<TouchableOpacity>(null);

  const selectedOption = options.find(opt => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (option: DropdownOption) => {
    onSelect(option.value);
    setIsOpen(false);

    // Announce the selection to screen readers
    AccessibilityInfo.announceForAccessibility(
      `Selected ${option.label}`
    );

    // Return focus to the dropdown button
    const node = findNodeHandle(buttonRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  };

  const renderOption = ({ item, index }: {
    item: DropdownOption;
    index: number
  }) => {
    const isSelected = item.value === selectedValue;

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        accessibilityRole="menuitem"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isSelected }}
        accessibilityHint={`Option ${index + 1} of ${options.length}`}
        style={[
          styles.option,
          isSelected && styles.optionSelected,
        ]}
      >
        <Text style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
        ]}>
          {item.label}
        </Text>
        {isSelected && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.dropdownContainer}>
      <Text
        style={styles.label}
        accessibilityRole="text"
      >
        {label}
      </Text>

      <TouchableOpacity
        ref={buttonRef}
        onPress={() => setIsOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}, ${displayText}`}
        accessibilityState={{ expanded: isOpen }}
        accessibilityHint="Double tap to open dropdown menu"
        style={styles.dropdownButton}
      >
        <Text style={[
          styles.dropdownText,
          !selectedOption && styles.placeholderText,
        ]}>
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
          accessibilityLabel="Close dropdown"
          accessibilityRole="button"
        >
          <View
            style={styles.modalContent}
            accessibilityRole="menu"
            accessibilityLabel={`${label} options`}
          >
            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={item => item.id}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '80%',
    maxHeight: '60%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 48,
  },
  optionSelected: {
    backgroundColor: '#e6f2ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AccessibleDropdown;
```

### Accessible Form Input

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  AccessibilityInfo,
  TextInputProps,
} from 'react-native';

interface AccessibleInputProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  error,
  hint,
  required = false,
  value,
  onChangeText,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const accessibilityLabel = [
    label,
    required && 'required',
    error && `Error: ${error}`,
  ]
    .filter(Boolean)
    .join(', ');

  const handleFocus = () => {
    setIsFocused(true);
    if (error) {
      AccessibilityInfo.announceForAccessibility(`Error: ${error}`);
    }
  };

  return (
    <View style={styles.inputContainer}>
      <Text
        style={styles.label}
        accessibilityRole="text"
      >
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {hint && (
        <Text
          style={styles.hint}
          accessibilityRole="text"
        >
          {hint}
        </Text>
      )}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hint}
        accessibilityState={{
          disabled: textInputProps.editable === false,
        }}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        {...textInputProps}
      />

      {error && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  required: {
    color: '#dc3545',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
});

export default AccessibleInput;
```

## Focus Management

Proper focus management ensures that users can navigate your app efficiently with assistive technologies.

### Managing Focus Programmatically

```typescript
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
} from 'react-native';

interface FocusManagementExampleProps {
  showContent: boolean;
  onClose: () => void;
}

const FocusManagementExample: React.FC<FocusManagementExampleProps> = ({
  showContent,
  onClose,
}) => {
  const headingRef = useRef<Text>(null);
  const closeButtonRef = useRef<TouchableOpacity>(null);

  useEffect(() => {
    if (showContent) {
      // Move focus to the heading when content appears
      const timer = setTimeout(() => {
        const node = findNodeHandle(headingRef.current);
        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showContent]);

  if (!showContent) return null;

  return (
    <View
      style={styles.container}
      accessibilityViewIsModal={true}
    >
      <Text
        ref={headingRef}
        style={styles.heading}
        accessibilityRole="header"
        accessible={true}
      >
        New Content Loaded
      </Text>

      <Text style={styles.content}>
        This content just appeared on screen. Focus was automatically
        moved to the heading for screen reader users.
      </Text>

      <TouchableOpacity
        ref={closeButtonRef}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        accessibilityHint="Returns to previous content"
        style={styles.closeButton}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FocusManagementExample;
```

### Focus Order and Grouping

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface NavigationItem {
  id: string;
  label: string;
  onPress: () => void;
}

interface FocusOrderExampleProps {
  items: NavigationItem[];
}

const FocusOrderExample: React.FC<FocusOrderExampleProps> = ({ items }) => {
  return (
    <View style={styles.container}>
      {/* Group header and description together */}
      <View
        accessible={true}
        accessibilityLabel="Navigation menu. Contains links to different sections."
        style={styles.header}
      >
        <Text style={styles.title}>Navigation</Text>
        <Text style={styles.description}>
          Select a section to navigate
        </Text>
      </View>

      {/* Each navigation item is focusable */}
      <View
        style={styles.navList}
        accessibilityRole="menu"
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            accessibilityRole="menuitem"
            accessibilityLabel={item.label}
            accessibilityHint={`Item ${index + 1} of ${items.length}`}
            style={styles.navItem}
          >
            <Text style={styles.navItemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  navList: {
    gap: 8,
  },
  navItem: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  navItemText: {
    fontSize: 16,
  },
});

export default FocusOrderExample;
```

## Live Regions for Dynamic Updates

Live regions announce dynamic content changes to screen reader users without requiring focus changes.

### Implementing Live Regions

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';

interface LiveRegionExampleProps {
  initialCount?: number;
}

const LiveRegionExample: React.FC<LiveRegionExampleProps> = ({
  initialCount = 0,
}) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<string>('');

  const increment = () => {
    const newCount = count + 1;
    setCount(newCount);
    setStatus(`Count increased to ${newCount}`);
  };

  const decrement = () => {
    const newCount = Math.max(0, count - 1);
    setCount(newCount);
    setStatus(`Count decreased to ${newCount}`);
  };

  // Clear status after announcement
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Counter Example
      </Text>

      {/* Live region for status updates */}
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={styles.statusContainer}
      >
        {status ? (
          <Text style={styles.statusText}>{status}</Text>
        ) : null}
      </View>

      {/* Current count display */}
      <View
        accessible={true}
        accessibilityLabel={`Current count: ${count}`}
        style={styles.countContainer}
      >
        <Text style={styles.countText}>{count}</Text>
      </View>

      {/* Control buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={decrement}
          accessibilityRole="button"
          accessibilityLabel="Decrease count"
          accessibilityHint="Decreases the counter by 1"
          disabled={count === 0}
          style={[
            styles.button,
            count === 0 && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={increment}
          accessibilityRole="button"
          accessibilityLabel="Increase count"
          accessibilityHint="Increases the counter by 1"
          style={styles.button}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Toast notification with live region
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

const AccessibleToast: React.FC<ToastProps> = ({
  message,
  type,
  visible
}) => {
  useEffect(() => {
    if (visible && message) {
      // Announce the toast message
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [visible, message]);

  if (!visible) return null;

  const backgroundColor = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
  }[type];

  return (
    <View
      style={[styles.toast, { backgroundColor }]}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      accessible={true}
      accessibilityLabel={message}
    >
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusContainer: {
    height: 24,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  countContainer: {
    marginVertical: 24,
  },
  countText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    width: 64,
    height: 64,
    backgroundColor: '#007AFF',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { LiveRegionExample, AccessibleToast };
```

## Touch Target Sizing

Ensuring adequate touch target sizes is crucial for users with motor impairments.

### Minimum Touch Target Guidelines

According to WCAG 2.1 guidelines, touch targets should be at least 44x44 points. Here's how to implement this:

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';

const MINIMUM_TOUCH_TARGET = 44;

interface AccessibleIconButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  size?: number;
}

const AccessibleIconButton: React.FC<AccessibleIconButtonProps> = ({
  icon,
  label,
  onPress,
  size = 24,
}) => {
  // Ensure minimum touch target size
  const touchTargetSize = Math.max(size, MINIMUM_TOUCH_TARGET);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{
        top: (MINIMUM_TOUCH_TARGET - size) / 2,
        bottom: (MINIMUM_TOUCH_TARGET - size) / 2,
        left: (MINIMUM_TOUCH_TARGET - size) / 2,
        right: (MINIMUM_TOUCH_TARGET - size) / 2,
      }}
      style={[
        styles.iconButton,
        {
          width: touchTargetSize,
          height: touchTargetSize,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: size }]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

// Button with guaranteed minimum size
interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
      ]}
    >
      <Text style={[
        styles.buttonText,
        variant === 'secondary' && styles.buttonTextSecondary,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// List item with adequate touch target
interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const AccessibleListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={styles.listItem}
    >
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.listItemSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Text style={styles.listItemArrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  icon: {
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TOUCH_TARGET,
    minWidth: MINIMUM_TOUCH_TARGET,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: MINIMUM_TOUCH_TARGET,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listItemArrow: {
    fontSize: 18,
    color: '#999',
    marginLeft: 8,
  },
});

export { AccessibleIconButton, AccessibleButton, AccessibleListItem };
```

## Testing for Accessibility

### Manual Testing with Screen Readers

Testing with actual screen readers is essential. Here's a checklist component to guide your testing:

```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

interface ChecklistItem {
  id: string;
  category: string;
  items: string[];
}

const accessibilityChecklist: ChecklistItem[] = [
  {
    id: '1',
    category: 'Screen Reader Testing',
    items: [
      'Enable VoiceOver (iOS) or TalkBack (Android)',
      'Navigate through all interactive elements',
      'Verify all buttons have meaningful labels',
      'Check that images have descriptive alt text',
      'Ensure form fields are properly labeled',
      'Test navigation flow makes logical sense',
    ],
  },
  {
    id: '2',
    category: 'Visual Testing',
    items: [
      'Test with increased text size',
      'Check color contrast ratios (4.5:1 minimum)',
      'Verify focus indicators are visible',
      'Test with color blindness simulators',
      'Ensure UI works in both light and dark modes',
    ],
  },
  {
    id: '3',
    category: 'Motor Accessibility',
    items: [
      'Verify touch targets are at least 44x44 points',
      'Test with Switch Control (iOS)',
      'Check for adequate spacing between elements',
      'Ensure gestures have alternatives',
    ],
  },
  {
    id: '4',
    category: 'Cognitive Accessibility',
    items: [
      'Use clear and simple language',
      'Provide consistent navigation',
      'Show clear error messages',
      'Allow sufficient time for interactions',
    ],
  },
];

const AccessibilityChecklist: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Accessibility Testing Checklist
      </Text>

      {accessibilityChecklist.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            {section.category}
          </Text>

          {section.items.map((item, index) => (
            <View
              key={index}
              style={styles.checklistItem}
              accessible={true}
              accessibilityLabel={item}
            >
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#007AFF',
  },
  checklistItem: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});

export default AccessibilityChecklist;
```

### Automated Accessibility Testing

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Utility function to validate accessibility props
interface AccessibilityValidation {
  hasLabel: boolean;
  hasRole: boolean;
  hasAdequateSize: boolean;
  issues: string[];
}

const validateAccessibility = (
  props: Record<string, unknown>,
  minTouchSize: number = 44
): AccessibilityValidation => {
  const issues: string[] = [];

  const hasLabel = Boolean(props.accessibilityLabel);
  if (!hasLabel) {
    issues.push('Missing accessibilityLabel');
  }

  const hasRole = Boolean(props.accessibilityRole);
  if (!hasRole) {
    issues.push('Missing accessibilityRole');
  }

  const width = (props.style as Record<string, number>)?.width || 0;
  const height = (props.style as Record<string, number>)?.height || 0;
  const minHeight = (props.style as Record<string, number>)?.minHeight || 0;

  const hasAdequateSize =
    (width >= minTouchSize || width === 0) &&
    (height >= minTouchSize || height === 0 || minHeight >= minTouchSize);

  if (!hasAdequateSize && (width > 0 || height > 0)) {
    issues.push(`Touch target too small. Minimum size: ${minTouchSize}x${minTouchSize}`);
  }

  return {
    hasLabel,
    hasRole,
    hasAdequateSize,
    issues,
  };
};

// Higher-order component for accessibility validation in development
const withAccessibilityValidation = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.FC<P> => {
  return (props: P) => {
    if (__DEV__) {
      const validation = validateAccessibility(props as Record<string, unknown>);

      if (validation.issues.length > 0) {
        console.warn(
          `Accessibility issues in ${componentName}:`,
          validation.issues.join(', ')
        );
      }
    }

    return <WrappedComponent {...props} />;
  };
};

// Example usage
interface MyButtonProps {
  label: string;
  onPress: () => void;
}

const MyButton: React.FC<MyButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={styles.button}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

const AccessibleMyButton = withAccessibilityValidation(MyButton, 'MyButton');

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { validateAccessibility, withAccessibilityValidation, AccessibleMyButton };
```

## Conclusion

Building accessible React Native applications is not just about compliance—it's about creating inclusive experiences that everyone can enjoy. By implementing the patterns and practices covered in this guide, you can ensure that your mobile applications work well for all users, regardless of their abilities.

### Key Takeaways

1. **Start with semantics**: Use appropriate `accessibilityRole` values to communicate the purpose of elements.

2. **Provide meaningful labels**: Every interactive element should have a clear `accessibilityLabel` that describes its purpose.

3. **Communicate state changes**: Use `accessibilityState` to inform users about dynamic content.

4. **Add helpful hints**: Use `accessibilityHint` to explain outcomes, not actions.

5. **Manage focus thoughtfully**: Guide users through your app with logical focus order and appropriate focus management.

6. **Announce updates**: Use live regions to communicate dynamic changes.

7. **Size touch targets appropriately**: Ensure all interactive elements meet minimum size requirements.

8. **Test extensively**: Use screen readers and automated tools to validate accessibility.

Remember, accessibility is an ongoing process. Regularly test your applications with real users and assistive technologies to identify and address any barriers. By making accessibility a priority from the start, you create better experiences for everyone.

## Additional Resources

- [React Native Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [Apple VoiceOver Testing Guide](https://developer.apple.com/accessibility/ios/)
- [Android TalkBack Documentation](https://developer.android.com/guide/topics/ui/accessibility)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)

By following these guidelines and continuously iterating on accessibility improvements, you can create React Native applications that truly serve all users equally.
