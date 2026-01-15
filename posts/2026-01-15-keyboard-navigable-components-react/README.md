# How to Build Keyboard-Navigable Components in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Accessibility, Keyboard Navigation, A11y, UX, Frontend

Description: Learn how to build fully keyboard-navigable React components with proper focus management, key handlers, and ARIA attributes to create accessible interfaces for all users.

---

Keyboard navigation is fundamental to web accessibility. Users who rely on keyboards, screen readers, or other assistive technologies depend on proper focus management and key handlers to interact with your application. Building keyboard-navigable components is not just about compliance - it improves the experience for power users who prefer keyboard shortcuts and anyone using your app without a mouse.

This guide covers everything you need to know about building keyboard-navigable React components, from basic focus management to complex interactive widgets.

## Why Keyboard Navigation Matters

### Users Who Depend on Keyboard Navigation

| User Group | Why Keyboard Navigation is Essential |
|------------|--------------------------------------|
| Blind users | Screen readers navigate via keyboard focus |
| Motor impairments | Mice require fine motor control, keyboards do not |
| Power users | Keyboard shortcuts are faster than mouse clicks |
| Temporary situations | Broken trackpad, using a laptop on a train |
| Screen magnifier users | Mouse tracking is difficult with high magnification |

### Legal and Business Implications

Accessibility is increasingly mandated by law. The Americans with Disabilities Act (ADA), Section 508, and WCAG guidelines require accessible interfaces. Beyond compliance, accessible applications reach a wider audience and often provide a better experience for everyone.

## Core Concepts of Keyboard Navigation

### The Tab Order

The tab order determines which elements receive focus when users press Tab. By default, browsers follow the DOM order for focusable elements.

**Natively focusable elements:**
- `<a href="...">`
- `<button>`
- `<input>`, `<select>`, `<textarea>`
- `<details>`, `<summary>`
- Elements with `tabindex="0"` or positive `tabindex`

**Non-focusable by default:**
- `<div>`, `<span>`, `<p>`
- `<li>`, `<table>`, `<section>`
- Any element without `tabindex`

### The tabindex Attribute

```jsx
// Not focusable - cannot reach via Tab
<div>I cannot receive focus</div>

// Focusable in natural DOM order
<div tabIndex={0}>I can receive focus</div>

// Focusable only programmatically (not via Tab)
<div tabIndex={-1}>I can only receive focus via JavaScript</div>

// Focusable with priority (avoid positive tabindex values)
<div tabIndex={1}>I receive focus before tabIndex={0} elements</div>
```

**Best Practice:** Avoid positive `tabindex` values. They disrupt the natural reading order and create maintenance headaches. Use `tabIndex={0}` for custom focusable elements and `tabIndex={-1}` for programmatic focus targets.

### Focus vs Selection

Focus and selection are different concepts that are often confused:

- **Focus**: The element currently receiving keyboard input
- **Selection**: The currently chosen item(s) in a list or widget

A listbox might have focus on the container while a specific option is selected. Understanding this distinction is crucial for building complex widgets.

## Building a Basic Focusable Component

### Custom Button Component

Native `<button>` elements handle keyboard interaction automatically. When building custom buttons with `<div>` or `<span>`, you must implement keyboard handling yourself.

```jsx
import React, { useCallback } from 'react';

function CustomButton({ onClick, disabled, children }) {
  // Handle keyboard activation - Enter and Space trigger buttons
  const handleKeyDown = useCallback((event) => {
    // Ignore if disabled
    if (disabled) return;

    // Enter and Space should activate the button
    if (event.key === 'Enter' || event.key === ' ') {
      // Prevent default behavior (Space scrolls the page)
      event.preventDefault();
      onClick?.(event);
    }
  }, [onClick, disabled]);

  // Handle click events
  const handleClick = useCallback((event) => {
    if (disabled) return;
    onClick?.(event);
  }, [onClick, disabled]);

  return (
    <div
      role="button"                           // Tell assistive tech this is a button
      tabIndex={disabled ? -1 : 0}            // Focusable unless disabled
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}                // Communicate disabled state
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: '8px 16px',
        borderRadius: '4px',
        backgroundColor: '#0066cc',
        color: 'white',
        display: 'inline-block',
      }}
    >
      {children}
    </div>
  );
}

// Usage
function App() {
  return (
    <CustomButton onClick={() => alert('Clicked!')}>
      Click me or press Enter/Space
    </CustomButton>
  );
}
```

**Why this works:**
1. `role="button"` tells screen readers this is a button
2. `tabIndex={0}` makes it focusable via Tab
3. `onKeyDown` handles Enter and Space keys
4. `aria-disabled` communicates the disabled state to assistive technology

## Focus Management Patterns

### Managing Focus with useRef

React's `useRef` hook provides a reference to DOM elements, allowing programmatic focus control.

```jsx
import React, { useRef, useEffect } from 'react';

function FocusableInput({ autoFocus, label }) {
  const inputRef = useRef(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Expose focus method to parent via callback
  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <label>
        {label}
        <input
          ref={inputRef}
          type="text"
          style={{ marginLeft: '8px' }}
        />
      </label>
    </div>
  );
}
```

### The useFocusManager Hook

For complex focus management, create a reusable hook that tracks focusable elements and provides navigation methods.

```jsx
import { useRef, useCallback, useMemo } from 'react';

function useFocusManager(options = {}) {
  const {
    wrap = true,              // Wrap focus from last to first element
    orientation = 'vertical', // 'vertical', 'horizontal', or 'both'
  } = options;

  const containerRef = useRef(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selector));
  }, []);

  // Get currently focused element index
  const getCurrentIndex = useCallback(() => {
    const elements = getFocusableElements();
    const activeElement = document.activeElement;
    return elements.indexOf(activeElement);
  }, [getFocusableElements]);

  // Focus next element
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const currentIndex = getCurrentIndex();
    let nextIndex = currentIndex + 1;

    if (nextIndex >= elements.length) {
      nextIndex = wrap ? 0 : elements.length - 1;
    }

    elements[nextIndex]?.focus();
  }, [getFocusableElements, getCurrentIndex, wrap]);

  // Focus previous element
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const currentIndex = getCurrentIndex();
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = wrap ? elements.length - 1 : 0;
    }

    elements[prevIndex]?.focus();
  }, [getFocusableElements, getCurrentIndex, wrap]);

  // Focus first element
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    elements[0]?.focus();
  }, [getFocusableElements]);

  // Focus last element
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    elements[elements.length - 1]?.focus();
  }, [getFocusableElements]);

  // Handle keyboard navigation based on orientation
  const handleKeyDown = useCallback((event) => {
    const key = event.key;

    // Vertical navigation (Up/Down arrows)
    if (orientation === 'vertical' || orientation === 'both') {
      if (key === 'ArrowDown') {
        event.preventDefault();
        focusNext();
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        focusPrevious();
      }
    }

    // Horizontal navigation (Left/Right arrows)
    if (orientation === 'horizontal' || orientation === 'both') {
      if (key === 'ArrowRight') {
        event.preventDefault();
        focusNext();
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        focusPrevious();
      }
    }

    // Home and End keys
    if (key === 'Home') {
      event.preventDefault();
      focusFirst();
    } else if (key === 'End') {
      event.preventDefault();
      focusLast();
    }
  }, [orientation, focusNext, focusPrevious, focusFirst, focusLast]);

  return {
    containerRef,
    handleKeyDown,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}
```

## Building Complex Interactive Widgets

### Accessible Dropdown Menu

Dropdown menus require careful focus management. The trigger button opens the menu, arrow keys navigate options, and focus returns to the trigger when the menu closes.

```jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';

function DropdownMenu({ label, options, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  // Open menu and focus first option
  const openMenu = useCallback(() => {
    setIsOpen(true);
    setFocusedIndex(0);
  }, []);

  // Close menu and return focus to trigger
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  // Handle option selection
  const selectOption = useCallback((option, index) => {
    onSelect?.(option, index);
    closeMenu();
  }, [onSelect, closeMenu]);

  // Focus the option at the current index
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Handle trigger keyboard events
  const handleTriggerKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        openMenu();
        break;
      case 'ArrowUp':
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
        break;
      default:
        break;
    }
  }, [openMenu, options.length]);

  // Handle menu keyboard events
  const handleMenuKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          selectOption(options[focusedIndex], focusedIndex);
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        // Close menu but allow natural tab behavior
        closeMenu();
        break;
      default:
        break;
    }
  }, [options, focusedIndex, selectOption, closeMenu]);

  // Generate unique IDs for ARIA attributes
  const menuId = `dropdown-menu-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      >
        {label}
        <span aria-hidden="true" style={{ marginLeft: '8px' }}>
          {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            margin: 0,
            padding: '4px 0',
            listStyle: 'none',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '150px',
            zIndex: 1000,
          }}
        >
          {options.map((option, index) => (
            <li
              key={option.value || index}
              ref={(el) => (optionRefs.current[index] = el)}
              role="option"
              tabIndex={-1}
              aria-selected={focusedIndex === index}
              onClick={() => selectOption(option, index)}
              onMouseEnter={() => setFocusedIndex(index)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor:
                  focusedIndex === index ? '#e6f0ff' : 'transparent',
              }}
            >
              {option.label || option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Usage
function App() {
  const options = [
    { value: 'edit', label: 'Edit' },
    { value: 'duplicate', label: 'Duplicate' },
    { value: 'delete', label: 'Delete' },
  ];

  return (
    <DropdownMenu
      label="Actions"
      options={options}
      onSelect={(option) => console.log('Selected:', option)}
    />
  );
}
```

### Accessible Tab Panel

Tab panels are common UI patterns that require specific keyboard interactions: arrow keys switch tabs, Tab moves focus to the panel content.

```jsx
import React, { useState, useRef, useCallback } from 'react';

function TabPanel({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabRefs = useRef([]);
  const panelRef = useRef(null);

  // Focus the active tab
  const focusTab = useCallback((index) => {
    tabRefs.current[index]?.focus();
  }, []);

  // Handle tab keyboard navigation
  const handleTabKeyDown = useCallback((event, index) => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = index > 0 ? index - 1 : tabs.length - 1;
        setActiveTab(newIndex);
        focusTab(newIndex);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = index < tabs.length - 1 ? index + 1 : 0;
        setActiveTab(newIndex);
        focusTab(newIndex);
        break;
      case 'Home':
        event.preventDefault();
        setActiveTab(0);
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveTab(tabs.length - 1);
        focusTab(tabs.length - 1);
        break;
      default:
        break;
    }
  }, [tabs.length, focusTab]);

  // Generate unique IDs
  const baseId = 'tab-panel';

  return (
    <div>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="Content tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid #ccc',
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id || index}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={activeTab === index}
            aria-controls={`${baseId}-panel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === index
                ? '2px solid #0066cc'
                : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === index ? 'bold' : 'normal',
              color: activeTab === index ? '#0066cc' : '#666',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab, index) => (
        <div
          key={tab.id || index}
          ref={activeTab === index ? panelRef : null}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          tabIndex={0}
          hidden={activeTab !== index}
          style={{
            padding: '16px',
            outline: 'none',
          }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// Usage
function App() {
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: <p>This is the overview content. Press Tab to reach this panel.</p>,
    },
    {
      id: 'details',
      label: 'Details',
      content: <p>This is the details content with more information.</p>,
    },
    {
      id: 'settings',
      label: 'Settings',
      content: <p>Configure your preferences here.</p>,
    },
  ];

  return <TabPanel tabs={tabs} />;
}
```

### Accessible Listbox with Type-Ahead

Listboxes support type-ahead search - typing characters focuses the first matching option. This is essential for long lists.

```jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';

function Listbox({ label, options, value, onChange }) {
  const [focusedIndex, setFocusedIndex] = useState(
    options.findIndex((opt) => opt.value === value) || 0
  );
  const [typeAheadBuffer, setTypeAheadBuffer] = useState('');

  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const typeAheadTimeoutRef = useRef(null);

  // Clear type-ahead buffer after 500ms of inactivity
  useEffect(() => {
    if (typeAheadBuffer) {
      typeAheadTimeoutRef.current = setTimeout(() => {
        setTypeAheadBuffer('');
      }, 500);
    }
    return () => clearTimeout(typeAheadTimeoutRef.current);
  }, [typeAheadBuffer]);

  // Focus option element when index changes
  useEffect(() => {
    optionRefs.current[focusedIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [focusedIndex]);

  // Handle type-ahead search
  const handleTypeAhead = useCallback((char) => {
    const newBuffer = typeAheadBuffer + char.toLowerCase();
    setTypeAheadBuffer(newBuffer);

    // Find first option starting with the typed characters
    const matchIndex = options.findIndex((opt) =>
      (opt.label || opt.value).toLowerCase().startsWith(newBuffer)
    );

    if (matchIndex !== -1) {
      setFocusedIndex(matchIndex);
    }
  }, [typeAheadBuffer, options]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) =>
          Math.min(prev + 1, options.length - 1)
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onChange?.(options[focusedIndex]);
        break;
      default:
        // Type-ahead: single printable character
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          handleTypeAhead(event.key);
        }
        break;
    }
  }, [options, focusedIndex, onChange, handleTypeAhead]);

  const listboxId = `listbox-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div>
      <label
        id={`${listboxId}-label`}
        style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
      >
        {label}
      </label>
      <ul
        ref={listRef}
        role="listbox"
        aria-labelledby={`${listboxId}-label`}
        aria-activedescendant={`${listboxId}-option-${focusedIndex}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '4px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          outline: 'none',
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isFocused = index === focusedIndex;

          return (
            <li
              key={option.value}
              ref={(el) => (optionRefs.current[index] = el)}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                setFocusedIndex(index);
                onChange?.(option);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: isFocused ? '#e6f0ff' : 'transparent',
                borderLeft: isSelected ? '3px solid #0066cc' : '3px solid transparent',
              }}
            >
              {option.label || option.value}
              {isSelected && (
                <span aria-hidden="true" style={{ float: 'right' }}>
                  \u2713
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {typeAheadBuffer && (
        <div
          aria-live="polite"
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          Searching: {typeAheadBuffer}
        </div>
      )}
    </div>
  );
}

// Usage
function App() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const countries = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'jp', label: 'Japan' },
    { value: 'br', label: 'Brazil' },
  ];

  return (
    <Listbox
      label="Select Country"
      options={countries}
      value={selectedCountry?.value}
      onChange={setSelectedCountry}
    />
  );
}
```

## Focus Trapping for Modals

Modals must trap focus within their boundaries. Tab should cycle through focusable elements inside the modal, not escape to the page behind.

```jsx
import React, { useRef, useEffect, useCallback } from 'react';

function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Store previously focused element and focus first element in trap
  useEffect(() => {
    if (!isActive) return;

    // Remember what was focused before
    previousFocusRef.current = document.activeElement;

    // Focus first focusable element in container
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Restore focus when trap is deactivated
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isActive]);

  // Get all focusable elements
  const getFocusableElements = (container) => {
    if (!container) return [];
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
  };

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((event) => {
    if (!isActive || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element -> focus last element
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> focus first element
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, [isActive]);

  return { containerRef, handleKeyDown };
}

function Modal({ isOpen, onClose, title, children }) {
  const { containerRef, handleKeyDown } = useFocusTrap(isOpen);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 id="modal-title" style={{ marginTop: 0 }}>
          {title}
        </h2>
        {children}
        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Usage
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Open Modal</button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmation"
      >
        <p>Are you sure you want to proceed?</p>
        <input type="text" placeholder="Enter your name" />
      </Modal>
    </div>
  );
}
```

## Roving Tabindex Pattern

For composite widgets like toolbars or tree views, use the roving tabindex pattern. Only one element in the group has `tabIndex={0}`, while others have `tabIndex={-1}`. Arrow keys move focus and update which element is tabbable.

```jsx
import React, { useState, useRef, useCallback } from 'react';

function Toolbar({ items, onItemClick }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef([]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    let newIndex = focusedIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (focusedIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (focusedIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    setFocusedIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  }, [focusedIndex, items.length]);

  return (
    <div
      role="toolbar"
      aria-label="Actions"
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
      }}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          tabIndex={index === focusedIndex ? 0 : -1}
          onClick={() => onItemClick?.(item)}
          onFocus={() => setFocusedIndex(index)}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: index === focusedIndex ? '#0066cc' : '#ddd',
            color: index === focusedIndex ? 'white' : '#333',
            cursor: 'pointer',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Usage
function App() {
  const toolbarItems = [
    { id: 'bold', label: 'Bold' },
    { id: 'italic', label: 'Italic' },
    { id: 'underline', label: 'Underline' },
    { id: 'strikethrough', label: 'Strike' },
  ];

  return (
    <Toolbar
      items={toolbarItems}
      onItemClick={(item) => console.log('Clicked:', item.id)}
    />
  );
}
```

## Skip Links for Large Applications

Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content. They are typically hidden until focused.

```jsx
import React from 'react';

function SkipLinks() {
  return (
    <nav aria-label="Skip links">
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.target.style.position = 'fixed';
          e.target.style.left = '16px';
          e.target.style.top = '16px';
          e.target.style.width = 'auto';
          e.target.style.height = 'auto';
          e.target.style.overflow = 'visible';
          e.target.style.zIndex = '9999';
          e.target.style.padding = '12px 24px';
          e.target.style.backgroundColor = '#0066cc';
          e.target.style.color = 'white';
          e.target.style.borderRadius = '4px';
          e.target.style.textDecoration = 'none';
        }}
        onBlur={(e) => {
          e.target.style.position = 'absolute';
          e.target.style.left = '-9999px';
          e.target.style.width = '1px';
          e.target.style.height = '1px';
          e.target.style.overflow = 'hidden';
        }}
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.target.style.position = 'fixed';
          e.target.style.left = '16px';
          e.target.style.top = '60px';
          e.target.style.width = 'auto';
          e.target.style.height = 'auto';
          e.target.style.overflow = 'visible';
          e.target.style.zIndex = '9999';
          e.target.style.padding = '12px 24px';
          e.target.style.backgroundColor = '#0066cc';
          e.target.style.color = 'white';
          e.target.style.borderRadius = '4px';
          e.target.style.textDecoration = 'none';
        }}
        onBlur={(e) => {
          e.target.style.position = 'absolute';
          e.target.style.left = '-9999px';
          e.target.style.width = '1px';
          e.target.style.height = '1px';
          e.target.style.overflow = 'hidden';
        }}
      >
        Skip to navigation
      </a>
    </nav>
  );
}

// Usage in your main layout
function Layout({ children }) {
  return (
    <>
      <SkipLinks />
      <header>
        <nav id="navigation">
          {/* Navigation content */}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
```

## Testing Keyboard Navigation

### Manual Testing Checklist

| Test | How to Verify |
|------|---------------|
| All interactive elements reachable | Tab through entire page without using mouse |
| Focus visible | Clear visual indicator shows current focus |
| Focus order logical | Tab order matches visual reading order |
| No keyboard traps | Can Tab out of all components (except modals) |
| Escape closes overlays | Pressing Escape closes modals, dropdowns, tooltips |
| Enter/Space activates | Buttons and links respond to both keys |
| Arrow keys navigate | Composite widgets support arrow key navigation |
| Type-ahead works | Listboxes respond to typed characters |

### Automated Testing with React Testing Library

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Dropdown keyboard navigation', () => {
  it('opens menu with Enter key', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Actions" options={[{ label: 'Edit' }]} />);

    const trigger = screen.getByRole('button', { name: /actions/i });

    // Focus the trigger
    await user.tab();
    expect(trigger).toHaveFocus();

    // Open with Enter
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('navigates options with arrow keys', async () => {
    const user = userEvent.setup();
    const options = [
      { label: 'Edit' },
      { label: 'Delete' },
    ];
    render(<DropdownMenu label="Actions" options={options} />);

    // Open menu
    await user.tab();
    await user.keyboard('{Enter}');

    // Navigate down
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /delete/i })).toHaveFocus();
  });

  it('closes menu with Escape', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Actions" options={[{ label: 'Edit' }]} />);

    // Open menu
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Close with Escape
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('returns focus to trigger after closing', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Actions" options={[{ label: 'Edit' }]} />);

    const trigger = screen.getByRole('button', { name: /actions/i });

    // Open and close menu
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');

    // Verify focus returned to trigger
    expect(trigger).toHaveFocus();
  });
});
```

## Common Keyboard Patterns Reference

### Standard Keys and Their Expected Behaviors

| Key | Expected Behavior |
|-----|-------------------|
| Tab | Move focus to next focusable element |
| Shift+Tab | Move focus to previous focusable element |
| Enter | Activate button, link, or menu item |
| Space | Activate button, toggle checkbox, open dropdown |
| Escape | Close modal, dropdown, tooltip, or cancel action |
| Arrow Up/Down | Navigate vertical lists, increment/decrement inputs |
| Arrow Left/Right | Navigate horizontal lists, move cursor in text |
| Home | Move to first item in list or beginning of text |
| End | Move to last item in list or end of text |
| Page Up/Down | Scroll large lists or pages |

### ARIA Roles and Required Keyboard Support

| Role | Required Keys | Optional Keys |
|------|---------------|---------------|
| button | Enter, Space | - |
| link | Enter | - |
| checkbox | Space | - |
| radio | Arrow keys, Space | - |
| listbox | Arrow keys, Home, End | Type-ahead |
| menu | Arrow keys, Enter, Escape | Type-ahead |
| tab | Arrow keys | Home, End |
| slider | Arrow keys | Home, End, Page Up/Down |
| tree | Arrow keys, Enter | Type-ahead, asterisk |
| dialog | Tab (trapped), Escape | - |

## Summary

Building keyboard-navigable React components requires understanding focus management, implementing correct key handlers, and using appropriate ARIA attributes. Here is a quick reference of the key concepts:

| Aspect | Best Practice |
|--------|---------------|
| **Focus Management** | Use `useRef` for programmatic focus, `tabIndex={0}` for custom focusable elements |
| **Tab Order** | Follow DOM order, avoid positive `tabindex` values |
| **Composite Widgets** | Use roving tabindex pattern with arrow key navigation |
| **Modals** | Trap focus within modal, restore focus on close |
| **Dropdown Menus** | Arrow keys navigate, Enter selects, Escape closes |
| **Type-ahead** | Buffer typed characters, clear after timeout |
| **Skip Links** | Hidden until focused, jump to main content |
| **Testing** | Manual keyboard testing plus automated tests with user events |
| **ARIA** | Use semantic roles, `aria-expanded`, `aria-selected`, `aria-activedescendant` |

By following these patterns, you create applications that are usable by everyone - whether they navigate with a mouse, keyboard, screen reader, or any other assistive technology. Accessibility is not an afterthought; it is a fundamental aspect of building quality software.

---

**Related Reading:**

- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Native apps had a good run, but PWA has caught up and is the future](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
- [SSO is a Security Basic, Not an Enterprise Perk](https://oneuptime.com/blog/post/2025-08-19-sso-is-a-security-basic-not-an-enterprise-perk/view)
