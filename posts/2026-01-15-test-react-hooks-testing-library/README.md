# How to Test React Hooks with @testing-library/react-hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Hooks, Testing, Testing Library, Unit Testing, Frontend

Description: Learn to test custom React hooks in isolation using @testing-library/react-hooks with renderHook, act, and comprehensive testing patterns for state management, async operations, and context providers.

---

Custom React hooks encapsulate reusable logic, but testing them directly requires a different approach than testing components. The @testing-library/react-hooks package (now integrated into @testing-library/react v13+) provides utilities to test hooks in isolation without creating wrapper components. This guide covers everything from basic hook testing to advanced patterns for async operations, context providers, and complex state management.

## Why Test Hooks Separately?

| Benefit | Description |
|---------|-------------|
| **Isolation** | Test hook logic without component rendering complexity |
| **Reusability validation** | Ensure hooks work across different components |
| **Edge case coverage** | Easier to test boundary conditions |
| **Faster tests** | No DOM rendering overhead |
| **Cleaner architecture** | Forces better separation of concerns |

## Installation and Setup

For React 18+ projects, the hook testing utilities are included in @testing-library/react:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

For older React versions (16.8 - 17), use the standalone package:

```bash
npm install --save-dev @testing-library/react-hooks react-test-renderer
```

### Jest Configuration

Ensure your Jest config supports React:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

```javascript
// tests/setup.js
import '@testing-library/jest-dom';
```

## Basic Hook Testing with renderHook

The `renderHook` function executes a hook within a test component, returning an object with the hook's return value and utilities to interact with it.

### Testing a Simple Counter Hook

Let's start with a basic counter hook:

```javascript
// src/hooks/useCounter.js
import { useState, useCallback } from 'react';

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return { count, increment, decrement, reset };
}
```

Now test it using renderHook:

```javascript
// tests/hooks/useCounter.test.js
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('should initialize with default value of 0', () => {
    // renderHook takes a callback that calls the hook
    const { result } = renderHook(() => useCounter());

    // result.current contains the hook's return value
    expect(result.current.count).toBe(0);
  });

  it('should initialize with provided initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    // Use act() to wrap any code that triggers state updates
    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('should reset to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(13);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

## Understanding act()

The `act()` function is crucial for hook testing. It ensures all state updates and effects are flushed before making assertions. Without it, you might see warnings and inconsistent test results.

### When to Use act()

| Scenario | Use act()? |
|----------|------------|
| **Calling functions that update state** | Yes |
| **Triggering effects** | Yes |
| **Reading current values** | No |
| **Async operations** | Yes (with await) |
| **Initial render assertions** | No |

### Common act() Patterns

```javascript
import { renderHook, act } from '@testing-library/react';

// Synchronous state updates
act(() => {
  result.current.updateState();
});

// Multiple synchronous updates in one act
act(() => {
  result.current.increment();
  result.current.increment();
  result.current.increment();
});

// Async operations require async act
await act(async () => {
  await result.current.fetchData();
});

// Timer-based updates
act(() => {
  jest.advanceTimersByTime(1000);
});
```

## Testing Hooks with useEffect

Hooks that use useEffect require careful handling of side effects:

```javascript
// src/hooks/useDocumentTitle.js
import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    // Cleanup function restores previous title
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
```

```javascript
// tests/hooks/useDocumentTitle.test.js
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('should update document title', () => {
    renderHook(() => useDocumentTitle('New Title'));

    expect(document.title).toBe('New Title');
  });

  it('should update when title changes', () => {
    const { rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: 'First Title' } }
    );

    expect(document.title).toBe('First Title');

    // Rerender with new props
    rerender({ title: 'Second Title' });

    expect(document.title).toBe('Second Title');
  });

  it('should restore previous title on unmount', () => {
    document.title = 'Original';

    const { unmount } = renderHook(() => useDocumentTitle('Hook Title'));

    expect(document.title).toBe('Hook Title');

    // Unmount triggers cleanup
    unmount();

    expect(document.title).toBe('Original');
  });
});
```

## Testing Async Hooks

Async operations like data fetching require special handling:

```javascript
// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

```javascript
// tests/hooks/useFetch.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '@/hooks/useFetch';

// Mock the global fetch function
global.fetch = jest.fn();

describe('useFetch', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should start with loading state', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useFetch('/api/data'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and return data', async () => {
    const mockData = { users: [{ id: 1, name: 'John' }] };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useFetch('/api/users'));

    // Wait for async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useFetch('/api/notfound'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('HTTP error! status: 404');
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useFetch('/api/data'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('should refetch data when refetch is called', async () => {
    const mockData1 = { count: 1 };
    const mockData2 = { count: 2 };

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockData1 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockData2 });

    const { result } = renderHook(() => useFetch('/api/counter'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(mockData2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
```

## Testing Hooks with Context

Hooks that consume React context need a wrapper provider:

```javascript
// src/context/ThemeContext.js
import { createContext, useContext, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
```

```javascript
// tests/hooks/useTheme.test.js
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

describe('useTheme', () => {
  // Create a wrapper component for the provider
  const wrapper = ({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it('should provide default theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});
```

### Testing with Multiple Context Providers

```javascript
// tests/utils/test-utils.js
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a wrapper with all necessary providers
export function createWrapper(options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={options.user}>
          <ThemeProvider initialTheme={options.theme}>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };
}
```

```javascript
// tests/hooks/useUserPreferences.test.js
import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { createWrapper } from '../utils/test-utils';

describe('useUserPreferences', () => {
  it('should combine auth and theme context', () => {
    const wrapper = createWrapper({
      user: { id: 1, name: 'John' },
      theme: 'dark',
    });

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.user.name).toBe('John');
    expect(result.current.theme).toBe('dark');
  });
});
```

## Testing Custom Hooks with Dependencies

When hooks depend on other hooks or external modules:

```javascript
// src/hooks/useLocalStorage.js
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const setValue = useCallback((value) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      return valueToStore;
    });
  }, []);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
```

```javascript
// tests/hooks/useLocalStorage.test.js
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'defaultValue')
    );

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should return stored value from localStorage', () => {
    window.localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'defaultValue')
    );

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'initial')
    );

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(window.localStorage.getItem('testKey'))).toBe('updated');
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() =>
      useLocalStorage('counter', 0)
    );

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 10);
    });

    expect(result.current[0]).toBe(11);
  });

  it('should handle complex objects', () => {
    const initialObject = { name: 'John', settings: { theme: 'dark' } };

    const { result } = renderHook(() =>
      useLocalStorage('user', initialObject)
    );

    expect(result.current[0]).toEqual(initialObject);

    act(() => {
      result.current[1]({ ...result.current[0], name: 'Jane' });
    });

    expect(result.current[0].name).toBe('Jane');
    expect(result.current[0].settings.theme).toBe('dark');
  });

  it('should remove value from localStorage', () => {
    window.localStorage.setItem('testKey', JSON.stringify('value'));

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'default')
    );

    expect(result.current[0]).toBe('value');

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('default');
    expect(window.localStorage.getItem('testKey')).toBe(null);
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock localStorage to throw error
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'fallback')
    );

    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalled();

    Storage.prototype.getItem = originalGetItem;
    consoleSpy.mockRestore();
  });
});
```

## Testing Hooks with Timers

For hooks that use setTimeout, setInterval, or debounce:

```javascript
// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

```javascript
// tests/hooks/useDebounce.test.js
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );

    expect(result.current).toBe('first');

    // Change the value
    rerender({ value: 'second' });

    // Value should not change immediately
    expect(result.current).toBe('first');

    // Advance timers by less than delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('first');

    // Advance timers past delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('second');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    // Rapid changes
    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(200));

    rerender({ value: 'c' });
    act(() => jest.advanceTimersByTime(200));

    rerender({ value: 'd' });
    act(() => jest.advanceTimersByTime(200));

    // Still showing initial value
    expect(result.current).toBe('a');

    // After full delay from last change
    act(() => jest.advanceTimersByTime(300));

    expect(result.current).toBe('d');
  });
});
```

## Testing useReducer Hooks

For hooks that use useReducer for complex state management:

```javascript
// src/hooks/useTodoList.js
import { useReducer, useCallback } from 'react';

const initialState = {
  todos: [],
  filter: 'all',
};

function todoReducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: Date.now(),
            text: action.payload,
            completed: false,
          },
        ],
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload),
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload,
      };

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        todos: state.todos.filter((todo) => !todo.completed),
      };

    default:
      return state;
  }
}

export function useTodoList() {
  const [state, dispatch] = useReducer(todoReducer, initialState);

  const addTodo = useCallback((text) => {
    dispatch({ type: 'ADD_TODO', payload: text });
  }, []);

  const toggleTodo = useCallback((id) => {
    dispatch({ type: 'TOGGLE_TODO', payload: id });
  }, []);

  const deleteTodo = useCallback((id) => {
    dispatch({ type: 'DELETE_TODO', payload: id });
  }, []);

  const setFilter = useCallback((filter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  const filteredTodos = state.todos.filter((todo) => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  return {
    todos: state.todos,
    filteredTodos,
    filter: state.filter,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
    clearCompleted,
  };
}
```

```javascript
// tests/hooks/useTodoList.test.js
import { renderHook, act } from '@testing-library/react';
import { useTodoList } from '@/hooks/useTodoList';

describe('useTodoList', () => {
  beforeEach(() => {
    // Mock Date.now for consistent IDs
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start with empty todo list', () => {
    const { result } = renderHook(() => useTodoList());

    expect(result.current.todos).toEqual([]);
    expect(result.current.filter).toBe('all');
  });

  it('should add a todo', () => {
    const { result } = renderHook(() => useTodoList());

    act(() => {
      result.current.addTodo('Learn React');
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0]).toEqual({
      id: 1000,
      text: 'Learn React',
      completed: false,
    });
  });

  it('should toggle todo completion', () => {
    Date.now.mockReturnValue(1000);

    const { result } = renderHook(() => useTodoList());

    act(() => {
      result.current.addTodo('Test todo');
    });

    expect(result.current.todos[0].completed).toBe(false);

    act(() => {
      result.current.toggleTodo(1000);
    });

    expect(result.current.todos[0].completed).toBe(true);

    act(() => {
      result.current.toggleTodo(1000);
    });

    expect(result.current.todos[0].completed).toBe(false);
  });

  it('should delete a todo', () => {
    Date.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);

    const { result } = renderHook(() => useTodoList());

    act(() => {
      result.current.addTodo('First');
      result.current.addTodo('Second');
    });

    expect(result.current.todos).toHaveLength(2);

    act(() => {
      result.current.deleteTodo(1000);
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].text).toBe('Second');
  });

  it('should filter todos', () => {
    Date.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(3000);

    const { result } = renderHook(() => useTodoList());

    act(() => {
      result.current.addTodo('Todo 1');
      result.current.addTodo('Todo 2');
      result.current.addTodo('Todo 3');
      result.current.toggleTodo(2000); // Mark second as completed
    });

    // All filter
    expect(result.current.filteredTodos).toHaveLength(3);

    // Active filter
    act(() => {
      result.current.setFilter('active');
    });

    expect(result.current.filteredTodos).toHaveLength(2);
    expect(result.current.filteredTodos.every((t) => !t.completed)).toBe(true);

    // Completed filter
    act(() => {
      result.current.setFilter('completed');
    });

    expect(result.current.filteredTodos).toHaveLength(1);
    expect(result.current.filteredTodos[0].id).toBe(2000);
  });

  it('should clear completed todos', () => {
    Date.now
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(3000);

    const { result } = renderHook(() => useTodoList());

    act(() => {
      result.current.addTodo('Active');
      result.current.addTodo('Completed 1');
      result.current.addTodo('Completed 2');
      result.current.toggleTodo(2000);
      result.current.toggleTodo(3000);
    });

    expect(result.current.todos).toHaveLength(3);

    act(() => {
      result.current.clearCompleted();
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].text).toBe('Active');
  });
});
```

## Testing Hooks that Return Refs

```javascript
// src/hooks/usePrevious.js
import { useRef, useEffect } from 'react';

export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

```javascript
// tests/hooks/usePrevious.test.js
import { renderHook } from '@testing-library/react';
import { usePrevious } from '@/hooks/usePrevious';

describe('usePrevious', () => {
  it('should return undefined on initial render', () => {
    const { result } = renderHook(() => usePrevious('initial'));

    expect(result.current).toBeUndefined();
  });

  it('should return previous value after update', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 'first' } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 'second' });
    expect(result.current).toBe('first');

    rerender({ value: 'third' });
    expect(result.current).toBe('second');
  });

  it('should track number changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 1 });
    expect(result.current).toBe(0);

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 100 });
    expect(result.current).toBe(2);
  });
});
```

## Testing Hooks with Callbacks

For hooks that accept callback functions:

```javascript
// src/hooks/useEventListener.js
import { useEffect, useRef } from 'react';

export function useEventListener(eventName, handler, element = window) {
  // Store handler in ref to avoid re-subscribing on every render
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;

    if (!isSupported) return;

    const eventListener = (event) => savedHandler.current(event);

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}
```

```javascript
// tests/hooks/useEventListener.test.js
import { renderHook } from '@testing-library/react';
import { useEventListener } from '@/hooks/useEventListener';

describe('useEventListener', () => {
  it('should add event listener to window', () => {
    const handler = jest.fn();
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useEventListener('click', handler)
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );

    // Simulate click event
    window.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should add event listener to custom element', () => {
    const handler = jest.fn();
    const element = document.createElement('div');
    const addEventListenerSpy = jest.spyOn(element, 'addEventListener');

    renderHook(() => useEventListener('click', handler, element));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );

    element.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
  });

  it('should update handler without re-subscribing', () => {
    const element = document.createElement('div');
    const addEventListenerSpy = jest.spyOn(element, 'addEventListener');

    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const { rerender } = renderHook(
      ({ handler }) => useEventListener('click', handler, element),
      { initialProps: { handler: handler1 } }
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // Update handler
    rerender({ handler: handler2 });

    // Should not add new listener
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // New handler should be called
    element.dispatchEvent(new Event('click'));
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
  });
});
```

## Advanced Testing Patterns

### Testing Hook Error Boundaries

```javascript
// tests/hooks/errorBoundary.test.js
import { renderHook } from '@testing-library/react';

describe('Hook Error Handling', () => {
  it('should catch errors in hooks', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const useBrokenHook = () => {
      throw new Error('Hook crashed');
    };

    expect(() => {
      renderHook(() => useBrokenHook());
    }).toThrow('Hook crashed');

    consoleSpy.mockRestore();
  });
});
```

### Testing Hook Dependencies

```javascript
// tests/hooks/dependencies.test.js
import { renderHook } from '@testing-library/react';
import { useCallback, useMemo } from 'react';

describe('Hook Memoization', () => {
  it('should maintain callback reference', () => {
    const { result, rerender } = renderHook(
      ({ value }) => {
        const callback = useCallback(() => value, [value]);
        return callback;
      },
      { initialProps: { value: 1 } }
    );

    const firstCallback = result.current;

    // Rerender with same value
    rerender({ value: 1 });
    expect(result.current).toBe(firstCallback);

    // Rerender with different value
    rerender({ value: 2 });
    expect(result.current).not.toBe(firstCallback);
  });

  it('should memoize computed values', () => {
    const expensiveCalc = jest.fn((x) => x * 2);

    const { result, rerender } = renderHook(
      ({ value }) => {
        return useMemo(() => expensiveCalc(value), [value]);
      },
      { initialProps: { value: 5 } }
    );

    expect(result.current).toBe(10);
    expect(expensiveCalc).toHaveBeenCalledTimes(1);

    // Same value - should not recalculate
    rerender({ value: 5 });
    expect(expensiveCalc).toHaveBeenCalledTimes(1);

    // Different value - should recalculate
    rerender({ value: 10 });
    expect(result.current).toBe(20);
    expect(expensiveCalc).toHaveBeenCalledTimes(2);
  });
});
```

### Testing Hooks with React Query

```javascript
// tests/hooks/useUsers.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from '@/hooks/useUsers';

// Create a wrapper with QueryClientProvider
function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useUsers', () => {
  it('should fetch users', async () => {
    const wrapper = createQueryWrapper();

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'John' }],
    });

    const { result } = renderHook(() => useUsers(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: 1, name: 'John' }]);
  });
});
```

## Common Testing Mistakes and Solutions

| Mistake | Problem | Solution |
|---------|---------|----------|
| **Missing act()** | State update warnings | Wrap state changes in act() |
| **Not waiting for async** | Tests pass before completion | Use waitFor() or async act() |
| **Hardcoded IDs** | Tests depend on Date.now() | Mock Date.now() in tests |
| **Shared state** | Test pollution | Reset state in beforeEach |
| **Missing cleanup** | Memory leaks in tests | Call unmount() when needed |
| **Testing implementation** | Brittle tests | Test behavior, not internals |

## Summary: renderHook API Reference

| Property/Method | Description |
|-----------------|-------------|
| `result.current` | Current return value of the hook |
| `rerender(props)` | Re-render hook with new props |
| `unmount()` | Unmount the hook (triggers cleanup) |
| `waitFor(callback)` | Wait for async conditions |

## Summary: Testing Patterns by Hook Type

| Hook Type | Key Testing Approach |
|-----------|---------------------|
| **State hooks** | Test initial value, updates via act() |
| **Effect hooks** | Test side effects, cleanup on unmount |
| **Async hooks** | Use waitFor(), mock fetch/timers |
| **Context hooks** | Wrap with provider, test error without |
| **Reducer hooks** | Test each action type, state transitions |
| **Ref hooks** | Test value persistence across renders |
| **Timer hooks** | Use jest.useFakeTimers() |

## Best Practices Checklist

| Practice | Why It Matters |
|----------|----------------|
| **Test behavior, not implementation** | More maintainable tests |
| **Use act() for all state updates** | Prevents React warnings |
| **Mock external dependencies** | Isolated, fast tests |
| **Test error states** | Real apps have errors |
| **Test cleanup functions** | Prevent memory leaks |
| **Use meaningful test names** | Better documentation |
| **Reset state between tests** | Prevent flaky tests |
| **Test edge cases** | Catch boundary bugs |

Testing React hooks effectively requires understanding how hooks work within React's rendering cycle. The @testing-library/react-hooks utilities provide the perfect abstraction for testing hooks in isolation while ensuring they behave correctly when integrated into components. By following these patterns, you can build a comprehensive test suite that catches bugs early and documents your hook's expected behavior.
