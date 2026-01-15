# How to Test React Applications for Accessibility with axe-core

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Accessibility, axe-core, Testing, A11y, Automation

Description: Learn how to integrate axe-core into your React testing workflow for automated accessibility testing, including Jest setup, component testing, and CI/CD integration.

---

Building accessible web applications is not just a legal requirement in many jurisdictions but also a moral imperative. Over one billion people worldwide live with some form of disability, and ensuring your React application is accessible means providing equal access to all users. Manual accessibility testing is time-consuming and error-prone, which is where automated testing with axe-core becomes invaluable.

axe-core is the accessibility testing engine that powers many popular tools, including browser extensions and testing libraries. It can detect many common accessibility issues automatically, making it an essential part of any modern testing strategy.

## Why Automated Accessibility Testing Matters

Manual accessibility testing requires expertise and significant time investment. While it remains necessary for comprehensive coverage, automated testing catches common issues early in the development cycle, before they reach production.

Key benefits of automated accessibility testing:

- Catch regressions immediately in CI/CD pipelines
- Provide consistent, repeatable testing across components
- Educate developers about accessibility requirements
- Reduce the burden on manual QA testers
- Document accessibility compliance over time

## Understanding axe-core

axe-core is an open-source accessibility testing engine developed by Deque Systems. It tests rendered HTML against WCAG (Web Content Accessibility Guidelines) and other accessibility standards.

### What axe-core Can Detect

axe-core checks for issues including:

- Missing alternative text for images
- Insufficient color contrast
- Missing form labels
- Invalid ARIA attributes
- Keyboard accessibility problems
- Document structure issues
- Focus management problems

### What Requires Manual Testing

Some accessibility aspects cannot be automated:

- Logical reading order
- Meaningful alternative text quality
- Keyboard navigation flow
- Screen reader announcement quality
- Complex interaction patterns

## Setting Up axe-core with Jest

### Installation

Install the required packages for testing React components with axe-core:

```bash
npm install --save-dev jest-axe @testing-library/react @testing-library/jest-dom axe-core
```

For TypeScript projects, add the type definitions:

```bash
npm install --save-dev @types/jest-axe
```

### Jest Configuration

Configure Jest to include the jest-axe matchers globally. Create or update your `jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

Update your `jest.config.js` to include the setup file:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
```

### TypeScript Configuration

For TypeScript projects, create a `jest.setup.ts` file:

```typescript
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
```

## Writing Your First Accessibility Test

### Basic Component Test

Start with a simple button component to understand the testing pattern:

```tsx
// Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn btn-primary"
    >
      {children}
    </button>
  );
};
```

```tsx
// Button.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Button } from './Button';

describe('Button', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Click me</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations when disabled', async () => {
    const { container } = render(
      <Button onClick={() => {}} disabled>
        Disabled Button
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Testing Form Components

Forms are a common source of accessibility issues. Here is how to test a form component:

```tsx
// LoginForm.tsx
import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} aria-labelledby="form-title">
      <h2 id="form-title">Login</h2>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          autoComplete="email"
        />
        {errors.email && (
          <span id="email-error" role="alert" className="error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={!!errors.password}
          autoComplete="current-password"
        />
        {errors.password && (
          <span id="password-error" role="alert" className="error">
            {errors.password}
          </span>
        )}
      </div>

      <button type="submit">Sign In</button>
    </form>
  );
};
```

```tsx
// LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('should have no accessibility violations in initial state', async () => {
    const { container } = render(<LoginForm onSubmit={mockSubmit} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with validation errors', async () => {
    const { container } = render(<LoginForm onSubmit={mockSubmit} />);

    // Trigger validation errors
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with filled form', async () => {
    const { container } = render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Testing Modal Components

Modal dialogs require special accessibility considerations. Here is a properly accessible modal component:

```tsx
// Modal.tsx
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }

        // Trap focus within modal
        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            &times;
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
```

```tsx
// Modal.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Modal } from './Modal';

describe('Modal', () => {
  const mockClose = jest.fn();

  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockClose} title="Confirm Action">
        <p>Are you sure you want to proceed?</p>
        <button>Cancel</button>
        <button>Confirm</button>
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper dialog role and labeling', () => {
    render(
      <Modal isOpen={true} onClose={mockClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});
```

## Testing Navigation Components

Navigation components need careful attention to accessibility:

```tsx
// Navigation.tsx
import React, { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
  currentPath: string;
}

export const Navigation: React.FC<NavigationProps> = ({ items, currentPath }) => {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isExpanded = expandedMenus.has(item.label);
    const isCurrent = currentPath === item.href;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.label} role="none">
        {hasChildren ? (
          <>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-haspopup="true"
              onClick={() => toggleMenu(item.label)}
              className="nav-button"
            >
              {item.label}
              <span aria-hidden="true" className="caret">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
            {isExpanded && (
              <ul role="menu" aria-label={`${item.label} submenu`}>
                {item.children?.map((child) => renderNavItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          <a
            href={item.href}
            role="menuitem"
            aria-current={isCurrent ? 'page' : undefined}
            className={isCurrent ? 'active' : ''}
          >
            {item.label}
          </a>
        )}
      </li>
    );
  };

  return (
    <nav aria-label="Main navigation">
      <ul role="menubar">
        {items.map((item) => renderNavItem(item))}
      </ul>
    </nav>
  );
};
```

```tsx
// Navigation.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Navigation } from './Navigation';

const mockNavItems = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products', children: [
    { label: 'Software', href: '/products/software' },
    { label: 'Hardware', href: '/products/hardware' },
  ]},
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

describe('Navigation', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Navigation items={mockNavItems} currentPath="/" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with expanded submenu', async () => {
    const { container } = render(
      <Navigation items={mockNavItems} currentPath="/" />
    );

    // Expand the Products submenu
    fireEvent.click(screen.getByRole('button', { name: /products/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should mark current page with aria-current', () => {
    render(<Navigation items={mockNavItems} currentPath="/about" />);

    const aboutLink = screen.getByRole('menuitem', { name: 'About' });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');
  });
});
```

## Configuring axe-core Rules

axe-core allows customization of which rules to run and how to configure them:

```tsx
// Custom axe configuration
import { axe, JestAxeConfigureOptions } from 'jest-axe';

const axeOptions: JestAxeConfigureOptions = {
  rules: {
    // Disable specific rules
    'color-contrast': { enabled: false },
    // Configure rule options
    'region': { enabled: true },
  },
};

describe('Component with custom axe config', () => {
  it('should pass with custom rules', async () => {
    const { container } = render(<MyComponent />);

    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});
```

### Running Specific Rules

```tsx
import { configureAxe } from 'jest-axe';

// Only run specific rules
const axeWithSpecificRules = configureAxe({
  rules: {
    'label': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    // Disable all others by setting them in runOnly
  },
});

describe('Form accessibility', () => {
  it('should have proper labels', async () => {
    const { container } = render(<MyForm />);

    const results = await axeWithSpecificRules(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Excluding Elements from Testing

```tsx
import { axe } from 'jest-axe';

describe('Component with excluded elements', () => {
  it('should pass excluding third-party components', async () => {
    const { container } = render(
      <div>
        <MyComponent />
        <ThirdPartyWidget data-testid="widget" />
      </div>
    );

    const results = await axe(container, {
      exclude: ['.third-party-widget', '[data-testid="widget"]'],
    });
    expect(results).toHaveNoViolations();
  });
});
```

## Testing Color Contrast

Color contrast is critical for users with visual impairments:

```tsx
// ColorContrastTest.tsx
import React from 'react';

interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const styles: Record<string, React.CSSProperties> = {
    success: { backgroundColor: '#d4edda', color: '#155724' },
    warning: { backgroundColor: '#fff3cd', color: '#856404' },
    error: { backgroundColor: '#f8d7da', color: '#721c24' },
    info: { backgroundColor: '#d1ecf1', color: '#0c5460' },
  };

  return (
    <div
      role="alert"
      style={{
        padding: '12px 16px',
        borderRadius: '4px',
        ...styles[type],
      }}
    >
      {message}
    </div>
  );
};
```

```tsx
// Alert.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Alert } from './Alert';

describe('Alert color contrast', () => {
  const alertTypes: Array<'success' | 'warning' | 'error' | 'info'> = [
    'success',
    'warning',
    'error',
    'info',
  ];

  alertTypes.forEach((type) => {
    it(`should have sufficient color contrast for ${type} alerts`, async () => {
      const { container } = render(
        <Alert type={type} message={`This is a ${type} message`} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
```

## Testing Dynamic Content

Dynamic content updates need proper ARIA live region handling:

```tsx
// LiveRegion.tsx
import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface NotificationAreaProps {
  notifications: Notification[];
}

export const NotificationArea: React.FC<NotificationAreaProps> = ({
  notifications,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="notification-area"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          role="alert"
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
};
```

```tsx
// LiveRegion.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { NotificationArea } from './LiveRegion';

describe('NotificationArea', () => {
  it('should have no accessibility violations with notifications', async () => {
    const notifications = [
      { id: '1', message: 'File uploaded successfully', type: 'success' as const },
      { id: '2', message: 'Processing request', type: 'info' as const },
    ];

    const { container } = render(
      <NotificationArea notifications={notifications} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper live region attributes', () => {
    render(<NotificationArea notifications={[]} />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'false');
  });
});
```

## Creating Accessibility Test Utilities

Build reusable utilities for your test suite:

```tsx
// testUtils/accessibility.ts
import { axe, JestAxeConfigureOptions, AxeResults } from 'jest-axe';
import { RenderResult } from '@testing-library/react';

export interface AccessibilityTestOptions extends JestAxeConfigureOptions {
  componentName?: string;
}

export async function testAccessibility(
  container: HTMLElement,
  options: AccessibilityTestOptions = {}
): Promise<AxeResults> {
  const { componentName, ...axeOptions } = options;

  const results = await axe(container, axeOptions);

  if (results.violations.length > 0 && componentName) {
    console.error(
      `Accessibility violations in ${componentName}:`,
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => n.html),
      }))
    );
  }

  return results;
}

export function createAccessibilityTest(
  renderFn: () => RenderResult,
  options: AccessibilityTestOptions = {}
) {
  return async () => {
    const { container } = renderFn();
    const results = await testAccessibility(container, options);
    expect(results).toHaveNoViolations();
  };
}
```

```tsx
// Usage
import { createAccessibilityTest } from './testUtils/accessibility';
import { render } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it(
    'should have no accessibility violations',
    createAccessibilityTest(
      () => render(<MyComponent />),
      { componentName: 'MyComponent' }
    )
  );
});
```

## Testing with Different Viewports

Test accessibility across different screen sizes:

```tsx
// viewportTests.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ResponsiveNav } from './ResponsiveNav';

describe('ResponsiveNav accessibility', () => {
  const viewports = [
    { width: 320, height: 568, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ];

  viewports.forEach(({ width, height, name }) => {
    it(`should have no violations at ${name} viewport (${width}x${height})`, async () => {
      // Set viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      });

      window.dispatchEvent(new Event('resize'));

      const { container } = render(<ResponsiveNav />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
```

## Integration with CI/CD

### GitHub Actions Configuration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-results
          path: coverage/
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:a11y": "jest --testPathPattern='\\.a11y\\.test\\.(ts|tsx)$'",
    "test:a11y:watch": "jest --testPathPattern='\\.a11y\\.test\\.(ts|tsx)$' --watch",
    "test:a11y:coverage": "jest --testPathPattern='\\.a11y\\.test\\.(ts|tsx)$' --coverage"
  }
}
```

## Handling Test Failures

When accessibility tests fail, you need to understand and fix the issues:

```tsx
// Example of handling and reporting failures
import { axe } from 'jest-axe';
import { render } from '@testing-library/react';

describe('AccessibilityReporting', () => {
  it('provides detailed violation information', async () => {
    const { container } = render(
      <div>
        <img src="logo.png" /> {/* Missing alt attribute */}
        <button></button> {/* Empty button */}
      </div>
    );

    const results = await axe(container);

    // Log detailed information for debugging
    if (results.violations.length > 0) {
      results.violations.forEach((violation) => {
        console.log('---');
        console.log('Rule:', violation.id);
        console.log('Impact:', violation.impact);
        console.log('Description:', violation.description);
        console.log('Help:', violation.help);
        console.log('Help URL:', violation.helpUrl);
        console.log('Affected nodes:');
        violation.nodes.forEach((node) => {
          console.log('  HTML:', node.html);
          console.log('  Failure summary:', node.failureSummary);
        });
      });
    }

    expect(results).toHaveNoViolations();
  });
});
```

## Testing Complex Interactions

Test components with complex keyboard interactions:

```tsx
// Dropdown.tsx
import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  label,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          buttonRef.current?.focus();
        } else {
          setIsOpen(true);
          setFocusedIndex(0);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  return (
    <div className="dropdown">
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        {selectedOption?.label || 'Select an option'}
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={`${id}-label`}
          aria-activedescendant={
            focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined
          }
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              className={`
                ${option.value === value ? 'selected' : ''}
                ${index === focusedIndex ? 'focused' : ''}
              `}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

```tsx
// Dropdown.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Dropdown } from './Dropdown';

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('Dropdown accessibility', () => {
  it('should have no violations when closed', async () => {
    const { container } = render(
      <Dropdown
        id="fruit"
        label="Select a fruit"
        options={options}
        value=""
        onChange={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations when open', async () => {
    const { container } = render(
      <Dropdown
        id="fruit"
        label="Select a fruit"
        options={options}
        value=""
        onChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with selected value', async () => {
    const { container } = render(
      <Dropdown
        id="fruit"
        label="Select a fruit"
        options={options}
        value="banana"
        onChange={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const handleChange = jest.fn();
    render(
      <Dropdown
        id="fruit"
        label="Select a fruit"
        options={options}
        value=""
        onChange={handleChange}
      />
    );

    const button = screen.getByRole('button');
    button.focus();

    // Open with Enter
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Navigate with arrow keys
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    // Select with Enter
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith('banana');
  });
});
```

## Best Practices Summary

### Test Organization

Structure your accessibility tests consistently:

```tsx
// ComponentName.a11y.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ComponentName } from './ComponentName';

describe('ComponentName Accessibility', () => {
  describe('Initial render', () => {
    it('should have no violations', async () => {
      const { container } = render(<ComponentName />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Interactive states', () => {
    it('should have no violations when focused', async () => {
      // Test focus states
    });

    it('should have no violations when expanded', async () => {
      // Test expanded states
    });
  });

  describe('Keyboard interaction', () => {
    it('should be fully keyboard accessible', async () => {
      // Test keyboard navigation
    });
  });

  describe('Screen reader compatibility', () => {
    it('should have proper ARIA attributes', () => {
      // Test ARIA implementation
    });
  });
});
```

## Summary Table

| Testing Area | axe-core Rule | Test Approach |
|--------------|---------------|---------------|
| **Images** | `image-alt` | Verify all images have meaningful alt text |
| **Forms** | `label`, `form-field-multiple-labels` | Test labels are properly associated |
| **Buttons** | `button-name` | Ensure buttons have accessible names |
| **Links** | `link-name` | Verify links have descriptive text |
| **Color Contrast** | `color-contrast` | Test all color combinations meet WCAG AA |
| **Headings** | `heading-order` | Verify heading hierarchy is logical |
| **Landmarks** | `region`, `landmark-*` | Test page structure has proper landmarks |
| **Focus** | `focus-order-semantics` | Ensure logical focus order |
| **ARIA** | `aria-*` | Validate ARIA attribute usage |
| **Modals** | `aria-dialog-name` | Test modal accessibility patterns |
| **Tables** | `table-*` | Verify table structure and headers |
| **Lists** | `list`, `listitem` | Test list markup is correct |

## Common Violations and Fixes

| Violation | Cause | Solution |
|-----------|-------|----------|
| `image-alt` | Missing alt attribute | Add `alt="description"` or `alt=""` for decorative images |
| `button-name` | Empty button | Add text content or `aria-label` |
| `label` | Form input without label | Add `<label htmlFor="id">` or `aria-label` |
| `color-contrast` | Low contrast ratio | Increase contrast to meet WCAG AA (4.5:1 for text) |
| `link-name` | Link without text | Add descriptive link text or `aria-label` |
| `landmark-one-main` | Missing main landmark | Wrap main content in `<main>` |
| `page-has-heading-one` | Missing h1 | Add a single `<h1>` to each page |
| `region` | Content outside landmarks | Structure content within semantic landmarks |

## Conclusion

Automated accessibility testing with axe-core is an essential part of building inclusive React applications. While it cannot catch every accessibility issue, it provides a strong foundation for accessibility compliance and helps teams develop an accessibility-first mindset.

Key takeaways:

1. Integrate axe-core early in your testing workflow
2. Test components in all their interactive states
3. Combine automated testing with manual testing
4. Use CI/CD to prevent accessibility regressions
5. Educate your team on common accessibility patterns

By following the patterns and practices outlined in this guide, you can significantly improve the accessibility of your React applications and provide a better experience for all users. Remember that accessibility is an ongoing commitment, not a one-time fix. Regular testing and continuous improvement are essential for maintaining accessible applications.
