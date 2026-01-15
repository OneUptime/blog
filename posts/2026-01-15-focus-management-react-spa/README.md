# How to Implement Focus Management in React Single Page Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Accessibility, Focus Management, SPA, A11y, UX

Description: A comprehensive guide to implementing proper focus management in React SPAs, covering focus traps, route change handling, skip links, and ARIA live regions to create accessible web applications.

---

It's a Monday morning. A user navigating your React application with a screen reader clicks a link to view their dashboard. The URL changes, new content loads... and their focus is still stuck on the navigation menu. They have no idea the page changed. They tab forward and land on the footer. Confused, they refresh the entire page.

This isn't an edge case. It's the default behavior of most Single Page Applications.

Traditional multi-page websites handle focus automatically: each page load resets focus to the document top. SPAs broke that contract. React Router, client-side navigation, dynamic content injection... they all create focus management gaps that exclude keyboard and assistive technology users.

The good news? Fixing this isn't hard. It just requires intentionality.

This guide walks you through every focus management pattern you need: route changes, modal traps, skip links, error announcements, and more. By the end, you'll have a toolkit for building React applications that work for everyone.

---

## Why Focus Management Matters

Before diving into code, let's understand the stakes.

### The Numbers

- 15% of the global population experiences some form of disability
- 8% of men have color vision deficiency
- Approximately 2.2 billion people have vision impairment
- Millions rely on keyboard-only navigation due to motor disabilities

### The Legal Reality

- **ADA (Americans with Disabilities Act):** Websites are increasingly considered "places of public accommodation"
- **Section 508:** Federal agencies and contractors must meet accessibility standards
- **WCAG 2.1 AA:** The de facto global standard, referenced by laws worldwide
- **European Accessibility Act:** Takes effect June 2025, covering digital services

Accessibility lawsuits have increased dramatically. But beyond compliance, accessible focus management simply creates better UX for everyone: power users, keyboard navigators, users with temporary injuries, or anyone who prefers not to use a mouse.

---

## Understanding Focus in the Browser

Focus determines which element receives keyboard input. Only one element can be focused at a time. The browser maintains a "focus ring" (the outline you see) to indicate the current focus target.

### Naturally Focusable Elements

These elements receive focus by default:

```html
<a href="...">Links</a>
<button>Buttons</button>
<input type="text" />
<select>...</select>
<textarea>...</textarea>
<details>...</details>
<area href="...">
```

### Making Elements Focusable

Use `tabindex` to control focusability:

```html
<!-- Adds element to tab order -->
<div tabindex="0">Now focusable</div>

<!-- Focusable via JavaScript only (not in tab order) -->
<div tabindex="-1">Programmatically focusable</div>

<!-- Avoid positive values - they break natural tab order -->
<div tabindex="5">Don't do this</div>
```

### The Focus Order

Tab order follows the DOM order by default. A well-structured HTML document creates a logical focus flow. Fight the urge to use CSS to visually reorder elements without considering the DOM structure.

---

## Pattern 1: Route Change Focus Management

The most critical pattern for SPAs. When a user navigates to a new route, focus must move to indicate the context change.

### The Problem

```jsx
// React Router navigation - focus stays on clicked link
<Link to="/dashboard">Dashboard</Link>
```

When this link is clicked, React Router updates the URL and renders new content, but focus remains on the link. Screen reader users hear nothing about the page change.

### Solution: Focus the Main Content Area

Create a custom hook that manages focus on route changes:

```jsx
// hooks/useRouteChangeFocus.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useRouteChangeFocus() {
  const location = useLocation();
  const mainContentRef = useRef(null);
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    // Only trigger on actual route changes, not hash or search changes
    if (previousPathname.current !== location.pathname) {
      previousPathname.current = location.pathname;

      // Small delay ensures content has rendered
      const timeoutId = setTimeout(() => {
        if (mainContentRef.current) {
          // Remove from tab order temporarily
          mainContentRef.current.setAttribute('tabindex', '-1');
          mainContentRef.current.focus();

          // Clean up tabindex after focus
          const cleanupTimeout = setTimeout(() => {
            mainContentRef.current?.removeAttribute('tabindex');
          }, 100);

          return () => clearTimeout(cleanupTimeout);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname]);

  return mainContentRef;
}
```

### Using the Hook

```jsx
// components/Layout.jsx
import { useRouteChangeFocus } from '../hooks/useRouteChangeFocus';

function Layout({ children }) {
  const mainContentRef = useRouteChangeFocus();

  return (
    <div className="layout">
      <SkipLink />
      <Header />
      <nav aria-label="Main navigation">
        {/* Navigation content */}
      </nav>
      <main
        ref={mainContentRef}
        id="main-content"
        aria-label="Main content"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

### Alternative: Focus the Page Heading

Some developers prefer focusing the `<h1>` of the new page:

```jsx
// hooks/useHeadingFocus.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useHeadingFocus() {
  const location = useLocation();
  const headingRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render to avoid focusing on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (headingRef.current) {
        headingRef.current.setAttribute('tabindex', '-1');
        headingRef.current.focus();
        headingRef.current.addEventListener('blur', function handleBlur() {
          headingRef.current?.removeAttribute('tabindex');
          headingRef.current?.removeEventListener('blur', handleBlur);
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return headingRef;
}

// Usage in page component
function DashboardPage() {
  const headingRef = useHeadingFocus();

  return (
    <article>
      <h1 ref={headingRef}>Dashboard</h1>
      {/* Page content */}
    </article>
  );
}
```

### Announcing Route Changes

Complement focus management with ARIA live regions:

```jsx
// components/RouteAnnouncer.jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Get the page title or generate from pathname
    const pageTitle = document.title ||
      location.pathname.split('/').pop()?.replace(/-/g, ' ') ||
      'Page';

    setAnnouncement(`Navigated to ${pageTitle}`);

    // Clear announcement after screen readers process it
    const timeoutId = setTimeout(() => setAnnouncement(''), 1000);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

Add the necessary CSS:

```css
/* Visually hidden but accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Pattern 2: Focus Traps for Modals and Dialogs

When a modal opens, keyboard focus must be trapped inside until the modal closes. Users should not be able to tab to content behind the modal.

### The Requirements

1. Focus moves to the modal when it opens
2. Tab cycles through focusable elements inside the modal only
3. Escape key closes the modal
4. Focus returns to the trigger element when modal closes
5. Content behind the modal is inert (non-interactive)

### Building a Focus Trap Hook

```jsx
// hooks/useFocusTrap.js
import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'details > summary',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS)
    ).filter((el) => {
      // Filter out elements that are not visible
      const style = window.getComputedStyle(el);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             el.offsetParent !== null;
    });
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab on first element -> go to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> go to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, [getFocusableElements]);

  useEffect(() => {
    if (!isActive) return;

    // Store the element that had focus before opening
    previousActiveElement.current = document.activeElement;

    // Focus the first focusable element in the trap
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Small delay to ensure the modal is fully rendered
      const timeoutId = setTimeout(() => {
        focusableElements[0].focus();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isActive, getFocusableElements]);

  useEffect(() => {
    if (!isActive) {
      // Return focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);

  return containerRef;
}
```

### Complete Modal Component

```jsx
// components/Modal.jsx
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeButtonLabel = 'Close dialog'
}) {
  const focusTrapRef = useFocusTrap(isOpen);

  // Handle Escape key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeButtonLabel}
            className="modal-close-button"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

### Using the `inert` Attribute

Modern browsers support the `inert` attribute, which makes content non-interactive:

```jsx
// components/Layout.jsx with inert support
function Layout({ children, modalOpen }) {
  return (
    <>
      <div inert={modalOpen ? '' : undefined}>
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
      {/* Modal renders outside the inert container */}
    </>
  );
}
```

For older browser support, use a polyfill:

```bash
npm install wicg-inert
```

```jsx
// Import at app entry point
import 'wicg-inert';
```

---

## Pattern 3: Skip Links

Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content.

### Implementation

```jsx
// components/SkipLink.jsx
import { useCallback } from 'react';

export function SkipLink({ targetId = 'main-content', children }) {
  const handleClick = useCallback((event) => {
    event.preventDefault();

    const target = document.getElementById(targetId);
    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', function handleBlur() {
          target.removeAttribute('tabindex');
          target.removeEventListener('blur', handleBlur);
        }, { once: true });
      }

      target.focus();

      // Scroll into view
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link"
    >
      {children || 'Skip to main content'}
    </a>
  );
}
```

### Skip Link Styling

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 12px 24px;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 8px 8px;
  z-index: 10000;
  transition: top 0.2s ease-in-out;
}

.skip-link:focus {
  top: 0;
  outline: 3px solid #4a90d9;
  outline-offset: 2px;
}
```

### Multiple Skip Links

For complex layouts, provide multiple skip options:

```jsx
// components/SkipLinks.jsx
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="skip-links-container">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <SkipLink targetId="main-navigation">Skip to navigation</SkipLink>
      <SkipLink targetId="search">Skip to search</SkipLink>
    </nav>
  );
}
```

---

## Pattern 4: Managing Focus in Dynamic Content

When content loads asynchronously or updates dynamically, users need to be informed and focus needs to be managed appropriately.

### Loading States

```jsx
// components/DataLoader.jsx
import { useEffect, useRef, useState } from 'react';

export function DataLoader({ isLoading, error, children }) {
  const [announced, setAnnounced] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      setAnnounced(true);
    } else if (announced && !error) {
      // Focus the loaded content
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          const firstFocusable = containerRef.current.querySelector(
            'h1, h2, h3, [tabindex="-1"]'
          );
          if (firstFocusable) {
            firstFocusable.setAttribute('tabindex', '-1');
            firstFocusable.focus();
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, error, announced]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="loading-container"
      >
        <span className="loading-spinner" aria-hidden="true" />
        <span>Loading content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="error-container">
        <h2>Error loading content</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return <div ref={containerRef}>{children}</div>;
}
```

### Infinite Scroll Focus Management

```jsx
// components/InfiniteList.jsx
import { useEffect, useRef, useState, useCallback } from 'react';

export function InfiniteList({ items, loadMore, hasMore }) {
  const [loadedCount, setLoadedCount] = useState(items.length);
  const newItemsStartRef = useRef(null);
  const loadMoreButtonRef = useRef(null);

  useEffect(() => {
    // When new items are loaded, focus the first new item
    if (items.length > loadedCount && newItemsStartRef.current) {
      newItemsStartRef.current.focus();
    }
    setLoadedCount(items.length);
  }, [items.length, loadedCount]);

  const handleLoadMore = useCallback(async () => {
    await loadMore();
  }, [loadMore]);

  return (
    <div>
      <ul role="list" aria-label="Items">
        {items.map((item, index) => (
          <li
            key={item.id}
            ref={index === loadedCount ? newItemsStartRef : null}
            tabIndex={index === loadedCount ? -1 : undefined}
          >
            {item.content}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          ref={loadMoreButtonRef}
          onClick={handleLoadMore}
          aria-describedby="load-more-status"
        >
          Load more items
        </button>
      )}

      <div
        id="load-more-status"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {items.length} items loaded
      </div>
    </div>
  );
}
```

---

## Pattern 5: Form Focus Management

Forms require careful focus management for validation errors and successful submissions.

### Focus First Error

```jsx
// hooks/useFormFocus.js
import { useCallback, useRef } from 'react';

export function useFormFocus() {
  const formRef = useRef(null);
  const errorSummaryRef = useRef(null);

  const focusFirstError = useCallback(() => {
    if (!formRef.current) return;

    // Find first field with error
    const firstErrorField = formRef.current.querySelector(
      '[aria-invalid="true"]'
    );

    if (firstErrorField) {
      firstErrorField.focus();
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const focusErrorSummary = useCallback(() => {
    if (errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, []);

  return {
    formRef,
    errorSummaryRef,
    focusFirstError,
    focusErrorSummary,
  };
}
```

### Accessible Form Component

```jsx
// components/AccessibleForm.jsx
import { useState, useCallback } from 'react';
import { useFormFocus } from '../hooks/useFormFocus';

export function AccessibleForm({ onSubmit, children }) {
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const { formRef, errorSummaryRef, focusFirstError, focusErrorSummary } =
    useFormFocus();

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setSubmitStatus(null);

    const formData = new FormData(event.target);
    const validationResult = validateForm(formData);

    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      // Focus error summary for screen readers
      focusErrorSummary();
      // Then focus first error field
      setTimeout(focusFirstError, 100);
      return;
    }

    try {
      await onSubmit(formData);
      setSubmitStatus('success');
      setErrors({});
    } catch (error) {
      setSubmitStatus('error');
      setErrors({ form: error.message });
      focusErrorSummary();
    }
  }, [onSubmit, focusFirstError, focusErrorSummary]);

  const errorCount = Object.keys(errors).length;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {errorCount > 0 && (
        <div
          ref={errorSummaryRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="error-summary"
        >
          <h2>There {errorCount === 1 ? 'is' : 'are'} {errorCount} error{errorCount !== 1 ? 's' : ''} in this form</h2>
          <ul>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`} onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(field)?.focus();
                }}>
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitStatus === 'success' && (
        <div role="status" aria-live="polite" className="success-message">
          Form submitted successfully!
        </div>
      )}

      {children}
    </form>
  );
}

// Form field component with error handling
export function FormField({
  id,
  label,
  error,
  required,
  type = 'text',
  ...props
}) {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        aria-required={required}
        {...props}
      />
      {hasError && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

---

## Pattern 6: Dropdown and Menu Focus Management

Custom dropdowns require careful keyboard navigation implementation.

### Accessible Dropdown Menu

```jsx
// components/DropdownMenu.jsx
import { useState, useRef, useCallback, useEffect } from 'react';

export function DropdownMenu({ label, items, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(0);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }, []);

  const handleButtonKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        event.preventDefault();
        openMenu();
        break;
      case 'ArrowUp':
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(items.length - 1);
        break;
    }
  }, [openMenu, items.length]);

  const handleMenuKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) {
          onSelect(items[activeIndex]);
          closeMenu();
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu();
        break;
      default:
        // Type-ahead: jump to item starting with pressed key
        const char = event.key.toLowerCase();
        const matchIndex = items.findIndex((item, i) =>
          i > activeIndex && item.label.toLowerCase().startsWith(char)
        );
        if (matchIndex >= 0) {
          setActiveIndex(matchIndex);
        } else {
          // Wrap around
          const wrapIndex = items.findIndex((item) =>
            item.label.toLowerCase().startsWith(char)
          );
          if (wrapIndex >= 0) {
            setActiveIndex(wrapIndex);
          }
        }
    }
  }, [items, activeIndex, onSelect, closeMenu]);

  // Focus active item when it changes
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].focus();
    }
  }, [isOpen, activeIndex]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  return (
    <div className="dropdown">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="dropdown-menu"
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={handleButtonKeyDown}
      >
        {label}
        <span aria-hidden="true"> &#9662;</span>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          id="dropdown-menu"
          role="listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `dropdown-item-${activeIndex}` : undefined
          }
          onKeyDown={handleMenuKeyDown}
          className="dropdown-list"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              id={`dropdown-item-${index}`}
              ref={(el) => (itemRefs.current[index] = el)}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                onSelect(item);
                closeMenu();
              }}
              className={index === activeIndex ? 'active' : ''}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Pattern 7: Tab Panel Focus Management

Tab interfaces require specific keyboard navigation patterns.

### Accessible Tabs Component

```jsx
// components/Tabs.jsx
import { useState, useRef, useCallback } from 'react';

export function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabRefs = useRef([]);

  const handleKeyDown = useCallback((event, index) => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (index + 1) % tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    setActiveTab(newIndex);
    tabRefs.current[newIndex]?.focus();
  }, [tabs.length]);

  return (
    <div className="tabs-container">
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={index === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={index === activeTab ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={index === activeTab ? 'active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeTab}
          tabIndex={0}
          className="tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

## Pattern 8: Toast and Notification Focus

Notifications should announce themselves but typically should not steal focus.

### Accessible Toast Component

```jsx
// components/Toast.jsx
import { useEffect, useRef } from 'react';

export function Toast({
  message,
  type = 'info',
  duration = 5000,
  onDismiss,
  focusOnMount = false
}) {
  const toastRef = useRef(null);

  useEffect(() => {
    if (focusOnMount && toastRef.current) {
      toastRef.current.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    if (duration && onDismiss) {
      const timeoutId = setTimeout(onDismiss, duration);
      return () => clearTimeout(timeoutId);
    }
  }, [duration, onDismiss]);

  const roleMap = {
    error: 'alert',
    warning: 'alert',
    success: 'status',
    info: 'status',
  };

  return (
    <div
      ref={toastRef}
      role={roleMap[type]}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      tabIndex={focusOnMount ? -1 : undefined}
      className={`toast toast-${type}`}
    >
      <span className="toast-message">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="toast-dismiss"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}

// Toast container that manages multiple toasts
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      aria-label="Notifications"
      className="toast-container"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
```

---

## Testing Focus Management

Automated testing helps ensure focus management works correctly.

### Jest and React Testing Library Tests

```jsx
// __tests__/Modal.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../components/Modal';

describe('Modal Focus Management', () => {
  it('focuses the first focusable element when opened', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );

    // Wait for focus to be applied
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(document.activeElement).toHaveTextContent('First Button');
  });

  it('traps focus within the modal', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <button>First</button>
        <button>Last</button>
      </Modal>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Tab to last element
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Last');

    // Tab again should cycle to first
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName('Close dialog');
  });

  it('closes on Escape key', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to trigger element on close', async () => {
    function TestComponent() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open Modal</button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test">
            <button onClick={() => setIsOpen(false)}>Close</button>
          </Modal>
        </>
      );
    }

    const user = userEvent.setup();
    render(<TestComponent />);

    const openButton = screen.getByText('Open Modal');
    await user.click(openButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    expect(document.activeElement).toBe(openButton);
  });
});
```

### Testing Route Changes

```jsx
// __tests__/RouteChangeFocus.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

describe('Route Change Focus Management', () => {
  it('moves focus to main content on route change', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout>
          <Routes>
            <Route path="/" element={<div><Link to="/about">Go to About</Link></div>} />
            <Route path="/about" element={<h1>About Page</h1>} />
          </Routes>
        </Layout>
      </MemoryRouter>
    );

    const link = screen.getByText('Go to About');
    await user.click(link);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const mainContent = screen.getByRole('main');
    expect(document.activeElement).toBe(mainContent);
  });
});
```

---

## Common Mistakes to Avoid

### 1. Removing Focus Outlines

```css
/* NEVER do this */
*:focus {
  outline: none;
}

/* Do this instead - customize, don't remove */
*:focus {
  outline: 2px solid #4a90d9;
  outline-offset: 2px;
}

/* Or use :focus-visible for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid #4a90d9;
  outline-offset: 2px;
}
```

### 2. Using Non-Interactive Elements for Actions

```jsx
// BAD - div is not focusable or keyboard accessible
<div onClick={handleClick}>Click me</div>

// GOOD - button is properly accessible
<button onClick={handleClick}>Click me</button>

// If you must use a div, make it accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</div>
```

### 3. Breaking Tab Order with Positive tabindex

```jsx
// BAD - creates confusing tab order
<input tabIndex={3} />
<input tabIndex={1} />
<input tabIndex={2} />

// GOOD - let DOM order determine tab sequence
<input />
<input />
<input />
```

### 4. Forgetting to Restore Focus

```jsx
// BAD - focus is lost when modal closes
function BadModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div>...</div>;
}

// GOOD - focus returns to trigger element
function GoodModal({ isOpen, onClose }) {
  const previousElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousElement.current = document.activeElement;
    } else if (previousElement.current) {
      previousElement.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return <div>...</div>;
}
```

---

## Focus Management Summary Table

| Pattern | When to Use | Focus Target | Key Considerations |
|---------|-------------|--------------|-------------------|
| **Route Change** | SPA navigation | Main content area or page heading | Announce to screen readers, skip on initial load |
| **Focus Trap** | Modals, dialogs, drawers | First focusable element inside | Trap Tab/Shift+Tab, Escape to close, restore focus on close |
| **Skip Link** | All pages | Main content, navigation, search | Visible on focus, works with keyboard and screen readers |
| **Error Focus** | Form validation | Error summary or first invalid field | Use `aria-invalid`, link errors to fields |
| **Dynamic Content** | Async loading, infinite scroll | First new item or status message | Use `aria-live` for announcements |
| **Dropdown Menu** | Custom selects, action menus | First/last item on arrow keys | Arrow navigation, type-ahead, Escape to close |
| **Tab Panel** | Tabbed interfaces | Tab panel content | Arrow keys between tabs, Tab into panel content |
| **Toast/Alert** | Notifications | Usually no focus change | Use `role="alert"` for urgent, `role="status"` for info |

---

## Browser and Assistive Technology Testing

### Manual Testing Checklist

- [ ] Tab through entire page without mouse - is order logical?
- [ ] Can all interactive elements be activated with keyboard?
- [ ] Do focus indicators have sufficient contrast (3:1 minimum)?
- [ ] Does focus move to new content on route changes?
- [ ] Are modals properly trapped?
- [ ] Does focus return after modal closes?
- [ ] Are skip links functional and visible on focus?
- [ ] Do screen readers announce dynamic content changes?
- [ ] Can dropdown menus be navigated with arrow keys?
- [ ] Is form validation announced to screen readers?

### Tools for Testing

- **axe DevTools:** Browser extension for automated accessibility audits
- **WAVE:** Web accessibility evaluation tool
- **Lighthouse:** Built into Chrome DevTools
- **NVDA:** Free screen reader for Windows
- **VoiceOver:** Built into macOS and iOS
- **JAWS:** Commercial screen reader

---

## Putting It All Together

Here is a complete example bringing together multiple focus management patterns:

```jsx
// App.jsx
import { BrowserRouter } from 'react-router-dom';
import { SkipLinks } from './components/SkipLinks';
import { RouteAnnouncer } from './components/RouteAnnouncer';
import { Layout } from './components/Layout';
import { AppRoutes } from './routes';
import { ToastProvider } from './context/ToastContext';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SkipLinks />
        <RouteAnnouncer />
        <Layout>
          <AppRoutes />
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
}
```

```jsx
// components/Layout.jsx
import { useState } from 'react';
import { useRouteChangeFocus } from '../hooks/useRouteChangeFocus';
import { Header } from './Header';
import { Footer } from './Footer';
import { Modal } from './Modal';

export function Layout({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  const mainContentRef = useRouteChangeFocus();

  return (
    <>
      <div inert={modalOpen ? '' : undefined}>
        <Header id="main-navigation" />
        <main
          ref={mainContentRef}
          id="main-content"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
        <Footer />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example Modal"
      >
        <p>Modal content here</p>
      </Modal>
    </>
  );
}
```

---

## Conclusion

Focus management in React SPAs is not optional. It is a fundamental requirement for building inclusive web applications. The patterns covered in this guide address the most common scenarios:

1. **Route changes** - Move focus to indicate navigation
2. **Focus traps** - Contain focus within modals and overlays
3. **Skip links** - Allow bypassing repetitive content
4. **Dynamic content** - Announce changes and manage focus appropriately
5. **Forms** - Guide users to errors and confirmations
6. **Custom widgets** - Implement keyboard navigation patterns

The key principles to remember:

- Focus should always be visible and have sufficient contrast
- Focus should follow a logical order matching visual layout
- Focus should move to new content when context changes
- Focus should be trapped in modal contexts
- Focus should return to trigger elements when overlays close
- Screen reader users need announcements for non-visual changes

Start by implementing route change focus management and skip links. These two patterns alone will dramatically improve the experience for keyboard and screen reader users. Then progressively add focus traps for modals and proper handling for forms and dynamic content.

Accessibility is not a feature to be added later. It is a quality attribute that should be considered from the start. The patterns in this guide are not difficult to implement, but they require intentionality and testing.

Build for everyone. Your users will thank you.

---

**Related Reading:**

- [Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [SRE Best Practices](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
- [Why Engineers Should Spend 20% of Time Talking to Customers](https://oneuptime.com/blog/post/2025-08-22-why-engineers-should-spend-20-percent-of-time-talking-to-customers/view)
