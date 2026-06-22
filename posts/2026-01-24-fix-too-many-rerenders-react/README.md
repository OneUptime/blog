# How to Fix 'Too Many Re-Renders' Errors in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, JavaScript, Debugging, Frontend, Performance

Description: Learn how to diagnose and fix the 'Too many re-renders' error in React by understanding render cycles and avoiding infinite loops.

---

The dreaded "Too many re-renders. React limits the number of renders to prevent an infinite loop" error stops your React application cold. This error typically occurs when your component triggers state updates unconditionally during render, creating an infinite loop. Understanding why this happens and how to fix it requires grasping React's render cycle.

## Understanding the React Render Cycle

React re-renders a component whenever its state or props change. The "too many re-renders" error happens when a state update triggers another state update, which triggers another, and so on.

```mermaid
graph TD
    A[Component Renders] --> B[State Update Called]
    B --> C[Component Re-renders]
    C --> D{Unconditional State Update in Render?}
    D -->|Yes| B
    D -->|No| E[Render Complete]

    style D fill:#f96,stroke:#333
```

## Common Causes and Fixes

### 1. Calling Functions Instead of Passing References

The most common mistake is calling a function in an event handler instead of passing a reference:

```javascript
// BAD: This calls handleClick on every render, causing infinite loop
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    // handleClick() is called immediately, not on click
    <button onClick={handleClick()}>
      Count: {count}
    </button>
  );
}

// GOOD: Pass the function reference, don't call it
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    // handleClick is passed as reference, called only on click
    <button onClick={handleClick}>
      Count: {count}
    </button>
  );
}
```

### 2. State Updates in Render Body

Setting state directly in the component body causes infinite re-renders:

```javascript
// BAD: State update in render body causes infinite loop
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  // This runs on every render, causing infinite loop
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => setUser(data));

  return <div>{user?.name}</div>;
}

// GOOD: Use useEffect for side effects
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  // useEffect runs after render, with dependency array
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // Only re-run when userId changes

  return <div>{user?.name}</div>;
}
```

### 3. Conditional State Updates Without Proper Guards

Updating state based on props without proper conditions:

```javascript
// BAD: Updates state during render whenever externalValue is defined
function SyncedInput({ externalValue }) {
  const [value, setValue] = useState(externalValue);

  // This runs during render and can cause loops
  if (externalValue !== undefined) {
    setValue(externalValue);
  }

  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// GOOD: Use useEffect with proper dependency
function SyncedInput({ externalValue }) {
  const [value, setValue] = useState(externalValue);

  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
    }
  }, [externalValue]); // Only runs when externalValue changes

  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// BETTER: Use key to reset component entirely
function Parent() {
  const [externalValue, setExternalValue] = useState('');

  return (
    <SyncedInput
      key={externalValue} // Forces remount when value changes
      externalValue={externalValue}
    />
  );
}
```

### 4. Functions in Effect Dependencies That Update State

Inline event handlers like `onClick={() => setSelected(todo.id)}` are valid. The problem is using a newly-created function as an Effect dependency when that Effect updates state:

```javascript
// BAD: filterTodos is new on every render, so the Effect runs after every render
function TodoList({ todos }) {
  const [visibleTodos, setVisibleTodos] = useState([]);

  const filterTodos = () => todos.filter(todo => !todo.completed);

  useEffect(() => {
    setVisibleTodos(filterTodos());
  }, [filterTodos]);

  return <TodoItems todos={visibleTodos} />;
}

// GOOD: Move the calculation into the Effect and depend on the data it reads
function TodoList({ todos }) {
  const [visibleTodos, setVisibleTodos] = useState([]);

  useEffect(() => {
    setVisibleTodos(todos.filter(todo => !todo.completed));
  }, [todos]);

  return <TodoItems todos={visibleTodos} />;
}

// BETTER: If this is just derived data, avoid state and Effect entirely
function TodoList({ todos }) {
  const visibleTodos = useMemo(
    () => todos.filter(todo => !todo.completed),
    [todos]
  );

  return <TodoItems todos={visibleTodos} />;
}
```

### 5. Incorrect useEffect Dependencies

Missing or incorrect dependencies can cause unexpected re-renders:

```javascript
// BAD: Missing dependency causes stale closure
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    // query is used but not in dependency array
    searchApi(query).then(setResults);
  }, []); // Empty array means this only runs once

  return <ResultsList results={results} />;
}

// BAD: Object in dependency array causes infinite loop
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const options = { limit: 10, offset: 0 }; // New object every render

  useEffect(() => {
    searchApi(query, options).then(setResults);
  }, [query, options]); // options changes every render!

  return <ResultsList results={results} />;
}

// GOOD: Memoize objects or use primitive values
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  const options = useMemo(() => ({
    limit: 10,
    offset: 0
  }), []); // Stable reference

  useEffect(() => {
    searchApi(query, options).then(setResults);
  }, [query, options]); // Now options is stable

  return <ResultsList results={results} />;
}
```

## Debugging Techniques

### Using React DevTools

React DevTools can highlight components that re-render:

1. Open React DevTools in your browser
2. Go to Settings (gear icon)
3. Enable "Highlight updates when components render"
4. Interact with your app to see which components re-render

### Adding Render Logging

```javascript
// Debug component to track renders
function useRenderCount(componentName) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

function MyComponent() {
  useRenderCount('MyComponent');
  // ... rest of component
}
```

### Using the Profiler

```javascript
import { Profiler } from 'react';

function onRenderCallback(
  id, // The "id" prop of the Profiler tree
  phase, // "mount", "update", or "nested-update"
  actualDuration, // Time spent rendering
  baseDuration, // Estimated time without memoization
  startTime,
  commitTime
) {
  console.log({
    id,
    phase,
    actualDuration,
    baseDuration,
  });
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MyComponent />
    </Profiler>
  );
}
```

## Flow of Proper State Updates

Here is how state updates should flow in a React application:

```mermaid
sequenceDiagram
    participant U as User Action
    participant E as Event Handler
    participant S as setState
    participant R as React Scheduler
    participant C as Component

    U->>E: Click/Input/etc
    E->>S: Update state
    S->>R: Schedule re-render
    R->>C: Re-render component
    C->>C: Return JSX
    Note over C: No unconditional state updates during render
```

## Summary of Common Fixes

| Problem | Solution |
|---------|----------|
| Calling function in onClick | Pass function reference: `onClick={handleClick}` |
| State update in render body | Move to useEffect with dependencies |
| Conditional state updates | Use useEffect or component key |
| New objects in dependencies | Use useMemo to memoize objects |
| New functions in dependencies | Move logic into the Effect or use useCallback when identity must be stable |
| Infinite loops in useEffect | Check and fix dependency array |

## Prevention Checklist

1. Never call setState unconditionally in the component body
2. Always pass function references to event handlers, not function calls
3. Use useEffect for any side effects that update state
4. Memoize objects and arrays passed to useEffect dependencies
5. Use useCallback for functions passed as props or dependencies when stable identity matters
6. Enable React StrictMode in development to catch issues early
7. Use ESLint with eslint-plugin-react-hooks for automatic detection

The "too many re-renders" error is React's way of protecting you from infinite loops. By understanding the render cycle and following these patterns, you can write React components that update state predictably and efficiently.
