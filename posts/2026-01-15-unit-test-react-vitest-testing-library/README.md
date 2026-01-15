# How to Unit Test React Components with Vitest and React Testing Library

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Vitest, Testing Library, Unit Testing, TDD, Frontend

Description: Learn how to write effective unit tests for React components using Vitest and React Testing Library with practical examples and best practices.

---

## Introduction

Testing is a critical part of modern software development. For React applications, unit testing ensures that individual components work correctly in isolation before they become part of a larger system. In this comprehensive guide, we will explore how to use Vitest and React Testing Library together to create robust, maintainable tests for your React components.

Vitest is a blazing-fast unit testing framework built on top of Vite, offering native ES modules support, TypeScript integration out of the box, and a Jest-compatible API. React Testing Library, on the other hand, encourages testing components the way users interact with them, focusing on behavior rather than implementation details.

By the end of this article, you will understand:

- How to set up Vitest with React Testing Library
- Core testing patterns and best practices
- How to test various React patterns including hooks, async operations, and context
- Common pitfalls and how to avoid them

## Why Vitest Over Jest?

Before diving into the setup, let us understand why Vitest has become a popular choice for testing React applications:

### Speed

Vitest leverages Vite's transformation pipeline and runs tests in parallel by default. This results in significantly faster test execution compared to Jest, especially in large codebases.

### Native ES Modules Support

Unlike Jest, which requires complex configuration for ES modules, Vitest handles them natively. This eliminates the need for Babel transformations in most cases.

### Configuration Simplicity

If you are already using Vite for your React project, Vitest integrates seamlessly with your existing configuration. No need to maintain separate configuration files.

### Jest Compatibility

Vitest provides a Jest-compatible API, making migration from Jest straightforward. Most of your existing Jest tests will work with minimal or no modifications.

## Setting Up the Project

Let us start by setting up a new React project with Vitest and React Testing Library.

### Step 1: Create a New React Project with Vite

```bash
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
```

### Step 2: Install Testing Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Here is what each package does:

- **vitest**: The test runner and assertion library
- **@testing-library/react**: Provides utilities for testing React components
- **@testing-library/jest-dom**: Adds custom DOM element matchers
- **@testing-library/user-event**: Simulates user interactions more realistically
- **jsdom**: Provides a browser-like environment for tests

### Step 3: Configure Vitest

Create or update your `vite.config.ts` file:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
```

### Step 4: Create the Setup File

Create the test setup file at `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
```

### Step 5: Update TypeScript Configuration

Add Vitest types to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Step 6: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Writing Your First Test

Let us start with a simple component and write our first test.

### The Component

Create a simple `Button` component at `src/components/Button.tsx`:

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}: ButtonProps): JSX.Element {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
    >
      {label}
    </button>
  );
}
```

### The Test

Create the test file at `src/components/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with the correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button label="Click me" onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button label="Click me" onClick={handleClick} disabled />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has the correct disabled attribute', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Testing Patterns

Now let us explore various testing patterns you will encounter in real-world React applications.

### Testing User Input

Here is a form component with input validation:

```tsx
// src/components/LoginForm.tsx
import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (validate()) {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <span id="password-error" role="alert">
            {errors.password}
          </span>
        )}
      </div>

      <button type="submit">Login</button>
    </form>
  );
}
```

The test file:

```tsx
// src/components/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => {}} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
  });

  it('shows error for short password', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('calls onSubmit with valid data', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(handleSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('does not call onSubmit with invalid data', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
```

### Testing Async Operations

Testing components that fetch data asynchronously:

```tsx
// src/components/UserProfile.tsx
import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserProfileProps {
  userId: number;
  fetchUser: (id: number) => Promise<User>;
}

export function UserProfile({ userId, fetchUser }: UserProfileProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const userData = await fetchUser(userId);
        setUser(userData);
      } catch (err) {
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId, fetchUser]);

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return <div role="alert">{error}</div>;
  }

  if (!user) {
    return <div>No user found</div>;
  }

  return (
    <div data-testid="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

The test file:

```tsx
// src/components/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('shows loading state initially', () => {
    const fetchUser = vi.fn(() => new Promise(() => {}));
    render(<UserProfile userId={1} fetchUser={fetchUser} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('displays user data after successful fetch', async () => {
    const fetchUser = vi.fn().mockResolvedValue(mockUser);
    render(<UserProfile userId={1} fetchUser={fetchUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    const fetchUser = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<UserProfile userId={1} fetchUser={fetchUser} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load user')).toBeInTheDocument();
  });

  it('calls fetchUser with correct userId', async () => {
    const fetchUser = vi.fn().mockResolvedValue(mockUser);
    render(<UserProfile userId={42} fetchUser={fetchUser} />);

    await waitFor(() => {
      expect(fetchUser).toHaveBeenCalledWith(42);
    });
  });

  it('refetches when userId changes', async () => {
    const fetchUser = vi.fn().mockResolvedValue(mockUser);
    const { rerender } = render(<UserProfile userId={1} fetchUser={fetchUser} />);

    await waitFor(() => {
      expect(fetchUser).toHaveBeenCalledWith(1);
    });

    rerender(<UserProfile userId={2} fetchUser={fetchUser} />);

    await waitFor(() => {
      expect(fetchUser).toHaveBeenCalledWith(2);
    });
  });
});
```

### Testing Custom Hooks

Custom hooks can be tested using the `renderHook` utility:

```tsx
// src/hooks/useCounter.ts
import { useState, useCallback } from 'react';

interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (value: number) => void;
}

export function useCounter(initialValue = 0): UseCounterReturn {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset, setCount };
}
```

The test file:

```tsx
// src/hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value of 0', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('increments the counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements the counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(12);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });

  it('sets count to specific value', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.setCount(42);
    });

    expect(result.current.count).toBe(42);
  });
});
```

### Testing Components with Context

Testing components that consume React Context:

```tsx
// src/context/ThemeContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
}

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: ThemeProviderProps): JSX.Element {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggleTheme = (): void => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

```tsx
// src/components/ThemeToggle.tsx
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} data-testid="theme-toggle">
      Current theme: {theme}
    </button>
  );
}
```

The test file:

```tsx
// src/components/ThemeToggle.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  const renderWithProvider = (initialTheme: 'light' | 'dark' = 'light') => {
    return render(
      <ThemeProvider initialTheme={initialTheme}>
        <ThemeToggle />
      </ThemeProvider>
    );
  };

  it('displays the current theme', () => {
    renderWithProvider('light');

    expect(screen.getByText(/current theme: light/i)).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider('light');

    await user.click(screen.getByTestId('theme-toggle'));

    expect(screen.getByText(/current theme: dark/i)).toBeInTheDocument();
  });

  it('toggles back to light theme', async () => {
    const user = userEvent.setup();
    renderWithProvider('light');

    await user.click(screen.getByTestId('theme-toggle'));
    await user.click(screen.getByTestId('theme-toggle'));

    expect(screen.getByText(/current theme: light/i)).toBeInTheDocument();
  });

  it('starts with dark theme when specified', () => {
    renderWithProvider('dark');

    expect(screen.getByText(/current theme: dark/i)).toBeInTheDocument();
  });
});
```

### Testing Components with Router

Testing components that use React Router:

```tsx
// src/components/Navigation.tsx
import { Link, useLocation } from 'react-router-dom';

export function Navigation(): JSX.Element {
  const location = useLocation();

  const isActive = (path: string): boolean => location.pathname === path;

  return (
    <nav>
      <Link
        to="/"
        className={isActive('/') ? 'active' : ''}
        data-testid="home-link"
      >
        Home
      </Link>
      <Link
        to="/about"
        className={isActive('/about') ? 'active' : ''}
        data-testid="about-link"
      >
        About
      </Link>
      <Link
        to="/contact"
        className={isActive('/contact') ? 'active' : ''}
        data-testid="contact-link"
      >
        Contact
      </Link>
    </nav>
  );
}
```

The test file:

```tsx
// src/components/Navigation.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Navigation } from './Navigation';

describe('Navigation', () => {
  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Navigation />
      </MemoryRouter>
    );
  };

  it('renders all navigation links', () => {
    renderWithRouter();

    expect(screen.getByTestId('home-link')).toBeInTheDocument();
    expect(screen.getByTestId('about-link')).toBeInTheDocument();
    expect(screen.getByTestId('contact-link')).toBeInTheDocument();
  });

  it('highlights home link when on home page', () => {
    renderWithRouter('/');

    expect(screen.getByTestId('home-link')).toHaveClass('active');
    expect(screen.getByTestId('about-link')).not.toHaveClass('active');
  });

  it('highlights about link when on about page', () => {
    renderWithRouter('/about');

    expect(screen.getByTestId('about-link')).toHaveClass('active');
    expect(screen.getByTestId('home-link')).not.toHaveClass('active');
  });

  it('highlights contact link when on contact page', () => {
    renderWithRouter('/contact');

    expect(screen.getByTestId('contact-link')).toHaveClass('active');
  });
});
```

## Mocking in Vitest

Vitest provides powerful mocking capabilities that are essential for isolating components during testing.

### Mocking Functions

```tsx
import { vi } from 'vitest';

// Create a mock function
const mockFn = vi.fn();

// Mock with implementation
const mockWithImpl = vi.fn((x: number) => x * 2);

// Mock resolved value
const mockAsync = vi.fn().mockResolvedValue({ data: 'test' });

// Mock rejected value
const mockError = vi.fn().mockRejectedValue(new Error('Failed'));

// Mock return value
const mockReturn = vi.fn().mockReturnValue(42);
```

### Mocking Modules

```tsx
// Mock entire module
vi.mock('./api', () => ({
  fetchUsers: vi.fn().mockResolvedValue([]),
  createUser: vi.fn().mockResolvedValue({ id: 1 }),
}));

// Mock with factory function
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    formatDate: vi.fn().mockReturnValue('2024-01-01'),
  };
});
```

### Mocking Timers

```tsx
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Timer tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles setTimeout correctly', () => {
    const callback = vi.fn();

    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

## Advanced Testing Patterns

### Testing Error Boundaries

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

```tsx
// src/components/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = (): JSX.Element => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback when child throws error', () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });
});
```

### Testing Portals

```tsx
// src/components/Modal.tsx
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps): JSX.Element | null {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-content"
      >
        <button onClick={onClose} data-testid="close-button">
          Close
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

```tsx
// src/components/Modal.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-overlay'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when content is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-content'));

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByTestId('close-button'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
```

## Best Practices

### 1. Query Priority

React Testing Library provides several query methods. Use them in this priority order:

1. **getByRole** - Best for accessibility
2. **getByLabelText** - Great for form elements
3. **getByPlaceholderText** - For inputs with placeholders
4. **getByText** - For non-interactive elements
5. **getByDisplayValue** - For filled-in form elements
6. **getByTestId** - Last resort when other queries do not work

### 2. Avoid Implementation Details

Test behavior, not implementation:

```tsx
// Bad: Testing implementation details
it('sets state correctly', () => {
  const { result } = renderHook(() => useState(0));
  // Testing internal state
});

// Good: Testing behavior
it('displays updated count after increment', async () => {
  const user = userEvent.setup();
  render(<Counter />);

  await user.click(screen.getByRole('button', { name: /increment/i }));

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 3. Use userEvent Over fireEvent

`userEvent` simulates real user interactions more accurately:

```tsx
// Prefer this
const user = userEvent.setup();
await user.type(input, 'hello');

// Over this
fireEvent.change(input, { target: { value: 'hello' } });
```

### 4. Clean Up After Each Test

Vitest with React Testing Library automatically cleans up after each test when using the setup file we created. However, be aware of cleanup for:

- Mocked modules
- Fake timers
- Global state

### 5. Use Descriptive Test Names

```tsx
// Bad
it('works', () => {});

// Good
it('displays error message when form submission fails', () => {});
```

## Common Pitfalls

### 1. Not Waiting for Async Operations

```tsx
// Wrong
it('loads data', () => {
  render(<AsyncComponent />);
  expect(screen.getByText('Data loaded')).toBeInTheDocument(); // Fails
});

// Correct
it('loads data', async () => {
  render(<AsyncComponent />);
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
});
```

### 2. Testing Third-Party Libraries

Do not test functionality provided by third-party libraries. Trust that they work and focus on testing your integration with them.

### 3. Over-Mocking

Mock only what is necessary. Over-mocking leads to tests that pass but do not catch real bugs.

### 4. Snapshot Abuse

Use snapshots sparingly. They are useful for detecting unintended changes but can become maintenance burdens.

## Summary Table

| Pattern | Key Points | Example Query |
|---------|-----------|---------------|
| Basic rendering | Use `render()` and query methods | `screen.getByRole('button')` |
| User interactions | Use `userEvent.setup()` for realistic simulation | `await user.click(element)` |
| Form testing | Test validation and submission | `screen.getByLabelText('Email')` |
| Async operations | Use `waitFor` or `findBy` queries | `await screen.findByText('Loaded')` |
| Custom hooks | Use `renderHook` and `act` | `renderHook(() => useMyHook())` |
| Context | Wrap with providers | `render(<Provider><Component /></Provider>)` |
| Router | Use `MemoryRouter` | `render(<MemoryRouter><Component /></MemoryRouter>)` |
| Mocking | Use `vi.fn()` and `vi.mock()` | `vi.fn().mockResolvedValue(data)` |
| Error boundaries | Test with throwing components | Wrap component that throws |
| Portals | Test rendered content | `screen.getByTestId('modal-content')` |

## Conclusion

Unit testing React components with Vitest and React Testing Library provides a fast, reliable, and maintainable testing experience. By following the patterns and best practices outlined in this guide, you can build confidence in your React applications and catch bugs before they reach production.

Key takeaways:

1. **Set up once, test efficiently**: Proper configuration of Vitest and React Testing Library pays dividends in developer experience.

2. **Test behavior, not implementation**: Focus on what users see and do, not internal component state.

3. **Use the right queries**: Prioritize accessible queries to improve both tests and accessibility.

4. **Mock judiciously**: Only mock what is necessary to isolate the unit under test.

5. **Keep tests maintainable**: Write clear, descriptive tests that document component behavior.

With these foundations in place, you are well-equipped to create comprehensive test suites for your React applications. Happy testing!

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
