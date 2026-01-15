# How to Debug Memory Leaks in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Performance, Memory Leaks, Debugging, Chrome DevTools, Optimization

Description: A comprehensive guide to identifying, diagnosing, and fixing memory leaks in React applications using Chrome DevTools, heap snapshots, and proven debugging patterns.

---

> Memory leaks are silent performance killers. Your React app might work perfectly for 5 minutes but become sluggish after an hour of use. Understanding how to find and fix these leaks is essential for building production-ready applications.

Memory leaks in React applications happen when your code holds references to objects that are no longer needed, preventing the JavaScript garbage collector from reclaiming that memory. Over time, this leads to increased memory consumption, degraded performance, and eventually browser crashes.

This guide covers everything you need to know about debugging memory leaks in React: from understanding why they occur, to using Chrome DevTools effectively, to implementing bulletproof patterns that prevent leaks in the first place.

---

## 1. What Causes Memory Leaks in React?

Before diving into debugging techniques, let's understand the root causes. Memory leaks in React typically fall into several categories:

### Unmounted Component Updates

The most common source of React memory leaks is attempting to update state on an unmounted component. This happens when:

- An async operation (API call, setTimeout, setInterval) completes after the component unmounts
- Event listeners continue firing after component unmount
- Subscriptions to external data sources aren't cleaned up

```typescript
// BAD: Memory leak - state update on unmounted component
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data)); // May run after unmount!
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

### Closure References

Closures can inadvertently capture references to large objects, keeping them in memory longer than necessary:

```typescript
// BAD: Closure keeps reference to large data
function DataVisualization() {
  const [chartData, setChartData] = useState<LargeDataset[]>([]);

  useEffect(() => {
    const handleResize = () => {
      // This closure captures chartData in scope
      console.log('Resizing with data length:', chartData.length);
    };

    window.addEventListener('resize', handleResize);
    // Missing cleanup - handleResize holds reference to chartData
  }, [chartData]);

  return <Chart data={chartData} />;
}
```

### Event Listener Accumulation

Adding event listeners without removing them leads to memory accumulation:

```typescript
// BAD: Event listeners accumulate on each render
function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    // Missing: return () => window.removeEventListener('scroll', handleScroll);
  }); // Missing dependency array - runs on every render!

  return <div>Scroll position: {scrollY}</div>;
}
```

### Timer Leaks

SetInterval and setTimeout without proper cleanup are frequent culprits:

```typescript
// BAD: Timer continues after component unmounts
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date()); // Runs forever, even after unmount
    }, 1000);
    // Missing cleanup!
  }, []);

  return <div>{time.toLocaleTimeString()}</div>;
}
```

### Detached DOM Nodes

React components that manipulate the DOM directly can leave detached nodes:

```typescript
// BAD: Creates detached DOM nodes
function TooltipManager() {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
    tooltipRef.current = tooltip;
    // Missing cleanup - tooltip remains in DOM after unmount
  }, []);

  return <div>Hover me</div>;
}
```

---

## 2. Setting Up Chrome DevTools for Memory Profiling

Chrome DevTools provides powerful tools for identifying memory leaks. Here's how to set up an effective debugging environment.

### Opening the Memory Panel

1. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
2. Navigate to the **Memory** tab
3. Select your profiling type:
   - **Heap snapshot**: Captures current memory state
   - **Allocation instrumentation on timeline**: Tracks allocations over time
   - **Allocation sampling**: Lower overhead sampling

### Understanding the Memory Panel Interface

The Memory panel shows several key metrics:

- **JS Heap Size**: Total JavaScript heap memory
- **Documents**: Number of DOM documents
- **Nodes**: Total DOM nodes
- **Listeners**: Number of event listeners
- **GPU Memory**: Graphics memory usage

### Enabling Useful DevTools Settings

For better memory debugging, enable these settings:

1. **Settings > Experiments**: Enable "Timeline: Show all events"
2. **Performance tab > Memory checkbox**: Shows memory timeline
3. **Console > Preserve log**: Keeps console across page navigations

---

## 3. Taking and Analyzing Heap Snapshots

Heap snapshots are your primary tool for finding memory leaks. They capture a complete picture of your application's memory at a specific moment.

### Capturing Effective Snapshots

To find memory leaks, follow this pattern:

1. **Baseline Snapshot**: Take a snapshot when your app first loads
2. **Perform Actions**: Execute the suspected leaky operation multiple times
3. **Force Garbage Collection**: Click the trash can icon in DevTools
4. **Comparison Snapshot**: Take another snapshot

```
Timeline:
[App Load] -> [Snapshot 1] -> [Navigate/Interact] -> [Return] -> [GC] -> [Snapshot 2]
```

### Reading the Snapshot Summary View

The Summary view shows objects grouped by constructor name:

| Column | Meaning |
|--------|---------|
| Constructor | Object type/class name |
| Distance | Shortest path from GC root |
| Shallow Size | Memory held directly by object |
| Retained Size | Memory that would be freed if object is collected |

### The Comparison View

Compare two snapshots to find growing objects:

1. Take Snapshot 1
2. Perform potentially leaky operations
3. Take Snapshot 2
4. Select Snapshot 2 and choose "Comparison" view
5. Look for objects with positive "# Delta" or "Size Delta"

### Identifying Leak Patterns in Snapshots

Common leak patterns to look for:

```
Detached DOM tree
  - Look for "Detached" in object names
  - Indicates DOM nodes not in document but still referenced

Growing arrays
  - Sort by "Size Delta" descending
  - Arrays that grow without bounds

Closure references
  - Search for "(closure)" in retainers
  - Check what variables the closure captures

Event listeners
  - Look for accumulating listener counts
  - Check "Listeners" panel for duplicates
```

---

## 4. Using the Allocation Timeline

The Allocation Timeline shows memory allocations over time, helping you correlate leaks with specific user actions.

### Recording Allocations

1. Select "Allocation instrumentation on timeline"
2. Click "Start" to begin recording
3. Perform the actions you suspect cause leaks
4. Click "Stop" to end recording

### Interpreting the Timeline

The timeline shows blue bars representing allocations:

- **Tall blue bars**: Large allocations
- **Persistent blue bars**: Objects not garbage collected
- **Disappearing bars**: Objects that were collected (not leaks)

### Filtering by Time Range

Click and drag on the timeline to filter objects allocated in that period. This helps isolate allocations from specific user actions.

```typescript
// Example: Correlating allocations with actions
// 1. Start recording
// 2. Click "Load More" button
// 3. Stop recording
// 4. Look for allocations at the time of click
// 5. Check if they persist after scrolling away
```

---

## 5. The Retainers Panel: Finding What Holds References

The Retainers panel shows why an object isn't being garbage collected. This is crucial for understanding memory leak causes.

### Reading the Retainer Tree

When you select an object in the snapshot, the Retainers panel shows:

```
Object @12345
  <- propertyName in ParentObject @67890
    <- anotherProperty in GrandparentObject @11111
      <- (GC roots)
```

This tree shows the reference chain keeping the object alive.

### Common Retainer Patterns

**Event Listener Retention:**
```
HTMLDivElement @12345
  <- listener in EventListenerList
    <- (GC roots)
```
This indicates an event listener is keeping a DOM element alive.

**Closure Retention:**
```
Object @12345
  <- context in (closure) @67890
    <- handleClick in FunctionContext
      <- (GC roots)
```
A closure is capturing and retaining the object.

**React Fiber Retention:**
```
FiberNode @12345
  <- child in FiberNode @67890
    <- (GC roots)
```
React's internal fiber tree is holding a reference.

---

## 6. Common React Memory Leak Patterns and Fixes

Let's examine the most common memory leak patterns in React and their solutions.

### Pattern 1: Async Operations Without Cleanup

**The Leak:**
```typescript
function UserData({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUserData(userId).then(result => {
      setData(result);    // Leak: May run after unmount
      setLoading(false);  // Leak: May run after unmount
    });
  }, [userId]);

  return loading ? <Spinner /> : <UserCard data={data} />;
}
```

**The Fix - Using Cleanup Flag:**
```typescript
function UserData({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;  // Track mount state
    setLoading(true);

    fetchUserData(userId).then(result => {
      if (isMounted) {     // Only update if still mounted
        setData(result);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;   // Mark as unmounted on cleanup
    };
  }, [userId]);

  return loading ? <Spinner /> : <UserCard data={data} />;
}
```

**The Fix - Using AbortController:**
```typescript
function UserData({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);

    fetch(`/api/users/${userId}`, { signal: abortController.signal })
      .then(res => res.json())
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });

    return () => {
      abortController.abort();  // Cancel request on unmount
    };
  }, [userId]);

  return loading ? <Spinner /> : <UserCard data={data} />;
}
```

### Pattern 2: Event Listener Leaks

**The Leak:**
```typescript
function WindowResizeTracker() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    // Missing cleanup!
  }, []);

  return <div>{dimensions.width} x {dimensions.height}</div>;
}
```

**The Fix:**
```typescript
function WindowResizeTracker() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);  // Cleanup!
    };
  }, []);

  return <div>{dimensions.width} x {dimensions.height}</div>;
}
```

### Pattern 3: setInterval Without Cleanup

**The Leak:**
```typescript
function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRemaining(prev => prev - 1);  // Runs forever!
    }, 1000);
    // Missing cleanup!
  }, []);

  return <div>{remaining} seconds remaining</div>;
}
```

**The Fix:**
```typescript
function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);  // Stop when done
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);  // Cleanup on unmount
    };
  }, []);

  return <div>{remaining} seconds remaining</div>;
}
```

### Pattern 4: Subscription Leaks

**The Leak:**
```typescript
function StockPrice({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const subscription = stockService.subscribe(symbol, (newPrice) => {
      setPrice(newPrice);  // Continues after unmount!
    });
    // Missing cleanup!
  }, [symbol]);

  return <div>{symbol}: ${price}</div>;
}
```

**The Fix:**
```typescript
function StockPrice({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const subscription = stockService.subscribe(symbol, (newPrice) => {
      setPrice(newPrice);
    });

    return () => {
      subscription.unsubscribe();  // Cleanup subscription
    };
  }, [symbol]);

  return <div>{symbol}: ${price}</div>;
}
```

### Pattern 5: Ref Callbacks Without Cleanup

**The Leak:**
```typescript
function IntersectionObserverComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }
    // Missing cleanup!
  }, []);

  return <div ref={elementRef}>{isVisible ? 'Visible' : 'Hidden'}</div>;
}
```

**The Fix:**
```typescript
function IntersectionObserverComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);  // Cleanup observation
      observer.disconnect();        // Disconnect observer
    };
  }, []);

  return <div ref={elementRef}>{isVisible ? 'Visible' : 'Hidden'}</div>;
}
```

### Pattern 6: WebSocket Connection Leaks

**The Leak:**
```typescript
function LiveChat({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`wss://chat.example.com/${roomId}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);  // Runs after unmount!
    };
    // Missing cleanup!
  }, [roomId]);

  return <MessageList messages={messages} />;
}
```

**The Fix:**
```typescript
function LiveChat({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let isMounted = true;
    const ws = new WebSocket(`wss://chat.example.com/${roomId}`);

    ws.onmessage = (event) => {
      if (isMounted) {
        const message = JSON.parse(event.data);
        setMessages(prev => [...prev, message]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      isMounted = false;
      ws.close();  // Close connection on unmount
    };
  }, [roomId]);

  return <MessageList messages={messages} />;
}
```

---

## 7. Custom Hooks for Leak Prevention

Create reusable hooks that handle cleanup automatically.

### useIsMounted Hook

```typescript
function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

// Usage
function SafeAsyncComponent() {
  const [data, setData] = useState(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchData().then(result => {
      if (isMounted()) {
        setData(result);
      }
    });
  }, [isMounted]);

  return <div>{data}</div>;
}
```

### useSafeState Hook

```typescript
function useSafeState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const isMountedRef = useRef(true);
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, setSafeState];
}

// Usage - drop-in replacement for useState
function SafeComponent() {
  const [data, setData] = useSafeState<string | null>(null);

  useEffect(() => {
    fetchData().then(result => setData(result));  // Safe!
  }, []);

  return <div>{data}</div>;
}
```

### useEventListener Hook

```typescript
function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = window
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K]);
    };

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

// Usage
function ScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  useEventListener('scroll', () => {
    setScrollY(window.scrollY);
  });

  return <div>Scroll: {scrollY}</div>;
}
```

### useInterval Hook

```typescript
function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}

// Usage
function Timer() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useInterval(
    () => setCount(c => c + 1),
    isRunning ? 1000 : null  // Pass null to pause
  );

  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
```

### useAbortController Hook

```typescript
function useAbortController(): AbortController {
  const abortControllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    return () => {
      controller.abort();
    };
  }, []);

  return abortControllerRef.current;
}

// Usage
function FetchComponent({ url }: { url: string }) {
  const [data, setData] = useState(null);
  const abortController = useAbortController();

  useEffect(() => {
    fetch(url, { signal: abortController.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });
  }, [url, abortController.signal]);

  return <div>{JSON.stringify(data)}</div>;
}
```

---

## 8. Debugging Memory Leaks in Context and Redux

State management libraries can introduce their own memory leak patterns.

### Context Provider Leaks

**The Leak:**
```typescript
const DataContext = createContext<Data[]>([]);

function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data[]>([]);

  // This keeps adding data without limit
  useEffect(() => {
    const subscription = dataStream.subscribe(newData => {
      setData(prev => [...prev, newData]);  // Unbounded growth!
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
}
```

**The Fix:**
```typescript
function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data[]>([]);
  const MAX_ITEMS = 1000;  // Set a limit

  useEffect(() => {
    const subscription = dataStream.subscribe(newData => {
      setData(prev => {
        const updated = [...prev, newData];
        // Keep only the most recent items
        return updated.slice(-MAX_ITEMS);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
}
```

### Redux Selector Memory Leaks

**The Leak:**
```typescript
// Creating new objects on every render
const selectUserWithPosts = (state: RootState, userId: string) => ({
  user: state.users[userId],
  posts: state.posts.filter(p => p.userId === userId),  // New array every time!
});
```

**The Fix:**
```typescript
import { createSelector } from '@reduxjs/toolkit';

// Memoized selector - only recalculates when inputs change
const makeSelectUserWithPosts = () => createSelector(
  [(state: RootState) => state.users,
   (state: RootState) => state.posts,
   (_: RootState, userId: string) => userId],
  (users, posts, userId) => ({
    user: users[userId],
    posts: posts.filter(p => p.userId === userId),
  })
);

// Usage in component
function UserProfile({ userId }: { userId: string }) {
  const selectUserWithPosts = useMemo(makeSelectUserWithPosts, []);
  const { user, posts } = useSelector(state => selectUserWithPosts(state, userId));

  return <div>{user.name}: {posts.length} posts</div>;
}
```

---

## 9. Performance Tab Memory Analysis

The Performance tab provides additional memory insights through its timeline view.

### Recording Memory in Performance Tab

1. Open Performance tab
2. Check the "Memory" checkbox
3. Click Record
4. Perform the actions you want to analyze
5. Click Stop

### Reading the Memory Timeline

The timeline shows several memory metrics:

- **JS Heap (Blue)**: JavaScript heap memory over time
- **Documents (Green)**: Number of documents
- **Nodes (Red)**: DOM node count
- **Listeners (Yellow)**: Event listener count

### Identifying Leaks in the Timeline

Look for these patterns:

```
Normal Pattern (No Leak):
Memory rises during activity, drops during GC
[___/\__/\__/\___]

Memory Leak Pattern:
Memory rises and never fully drops
[___/---/---/---]

Sawtooth Pattern (Healthy):
Regular rise and fall with GC cycles
[/\/\/\/\/\/\/\/\]
```

### Correlating Memory with User Actions

1. Record a performance trace with memory enabled
2. Look at the Main thread for user interactions
3. Correlate memory increases with specific function calls
4. Check if memory drops after navigating away

---

## 10. Automated Memory Leak Detection

Set up automated testing to catch memory leaks before production.

### Jest Memory Leak Detection

```typescript
// memoryLeakTest.ts
import { render, unmountComponentAtNode } from 'react-dom';

describe('Memory Leak Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    unmountComponentAtNode(container);
    container.remove();
  });

  it('should not leak memory when mounting/unmounting', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize;

    // Mount and unmount multiple times
    for (let i = 0; i < 100; i++) {
      render(<YourComponent />, container);
      unmountComponentAtNode(container);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;

    // Allow for some variance, but flag large increases
    expect(memoryIncrease).toBeLessThan(1000000); // 1MB threshold
  });
});
```

### Playwright Memory Testing

```typescript
// e2e/memoryLeak.spec.ts
import { test, expect } from '@playwright/test';

test('memory should not grow excessively during navigation', async ({ page }) => {
  await page.goto('/');

  // Get initial memory
  const initialMetrics = await page.evaluate(() =>
    (performance as any).memory?.usedJSHeapSize
  );

  // Perform navigation multiple times
  for (let i = 0; i < 10; i++) {
    await page.click('[data-testid="navigate-link"]');
    await page.waitForLoadState('networkidle');
    await page.goBack();
    await page.waitForLoadState('networkidle');
  }

  // Get final memory
  const finalMetrics = await page.evaluate(() =>
    (performance as any).memory?.usedJSHeapSize
  );

  const memoryGrowth = finalMetrics - initialMetrics;
  const maxAllowedGrowth = 5 * 1024 * 1024; // 5MB

  expect(memoryGrowth).toBeLessThan(maxAllowedGrowth);
});
```

### Continuous Integration Memory Monitoring

```yaml
# .github/workflows/memory-test.yml
name: Memory Leak Tests

on:
  pull_request:
    branches: [main]

jobs:
  memory-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run memory tests
        run: node --expose-gc node_modules/.bin/jest --testMatch='**/*.memory.test.ts'

      - name: Run Playwright memory tests
        run: npx playwright test e2e/memory*.spec.ts
```

---

## 11. React DevTools Profiler for Memory Analysis

React DevTools provides component-level insights that complement Chrome's memory tools.

### Using the Profiler

1. Install React DevTools browser extension
2. Open DevTools and navigate to the "Profiler" tab
3. Click "Record" and interact with your app
4. Click "Stop" to analyze the recording

### Identifying Re-render Issues

Excessive re-renders can indicate memory pressure:

```typescript
// Component that re-renders too often
function ExpensiveList({ items, filter }: Props) {
  // New array created on every render
  const filteredItems = items.filter(item => item.name.includes(filter));

  return (
    <ul>
      {filteredItems.map(item => (
        <ExpensiveItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

// Optimized version
function OptimizedList({ items, filter }: Props) {
  // Memoized filtering
  const filteredItems = useMemo(
    () => items.filter(item => item.name.includes(filter)),
    [items, filter]
  );

  return (
    <ul>
      {filteredItems.map(item => (
        <ExpensiveItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

const ExpensiveItem = React.memo(({ item }: { item: Item }) => {
  return <li>{item.name}</li>;
});
```

### Highlight Updates Feature

Enable "Highlight updates when components render" in React DevTools settings to visualize unnecessary re-renders in real-time.

---

## 12. Memory Leak Summary Table

| Leak Type | Symptom | Detection Method | Fix Pattern |
|-----------|---------|------------------|-------------|
| Async state updates | "Can't perform state update on unmounted component" warning | Console warnings, heap snapshot comparison | Cleanup flag, AbortController |
| Event listeners | Growing listener count in Performance tab | Memory timeline, Listeners panel | Return cleanup function in useEffect |
| setInterval/setTimeout | Continuous console logs after unmount | Component unmount + console observation | clearInterval/clearTimeout in cleanup |
| WebSocket connections | Network tab shows open connections | Network tab, heap snapshots | Close connection in cleanup |
| Subscription leaks | Growing memory over time | Heap snapshot comparison | Unsubscribe in cleanup |
| Closure references | Large retained size in snapshots | Retainers panel analysis | Minimize closure scope, nullify refs |
| Detached DOM nodes | "Detached" objects in heap | Heap snapshot search | Remove nodes in cleanup |
| Context accumulation | Memory grows with data updates | Heap snapshot size tracking | Limit stored data, use pagination |
| Memoization failures | High re-render count in Profiler | React DevTools Profiler | useMemo, useCallback, React.memo |
| Ref leaks | Objects retained after unmount | Retainers panel | Set ref.current = null in cleanup |

---

## 13. Best Practices Checklist

Use this checklist when reviewing React code for potential memory leaks:

### useEffect Cleanup Checklist

- [ ] Every `addEventListener` has a corresponding `removeEventListener` in cleanup
- [ ] Every `setInterval` has `clearInterval` in cleanup
- [ ] Every `setTimeout` has `clearTimeout` in cleanup (if component might unmount before timeout)
- [ ] Every subscription has an unsubscribe in cleanup
- [ ] Every WebSocket connection is closed in cleanup
- [ ] Every IntersectionObserver/ResizeObserver/MutationObserver is disconnected in cleanup
- [ ] Async operations check mounted state before updating state

### State Management Checklist

- [ ] Large data arrays have size limits or pagination
- [ ] Selectors are properly memoized
- [ ] Context values are memoized when containing objects/arrays
- [ ] No unnecessary object creation in render

### Component Structure Checklist

- [ ] Event handlers are memoized with useCallback when passed as props
- [ ] Expensive computations are memoized with useMemo
- [ ] List items use React.memo when appropriate
- [ ] Dependencies arrays are complete and correct

### Testing Checklist

- [ ] Memory tests run in CI pipeline
- [ ] Components are tested for proper cleanup
- [ ] Navigation patterns are tested for memory growth
- [ ] Long-running scenarios are tested

---

## Summary

Memory leaks in React applications are preventable with the right knowledge and tools. The key points to remember:

1. **Always clean up side effects**: Every useEffect that sets up subscriptions, timers, or listeners must return a cleanup function.

2. **Use Chrome DevTools effectively**: Heap snapshots and the allocation timeline are your primary diagnostic tools. Learn to read the Retainers panel to understand why objects aren't being garbage collected.

3. **Create reusable safe hooks**: Build hooks like `useSafeState`, `useEventListener`, and `useInterval` that handle cleanup automatically.

4. **Test for memory leaks**: Automate memory leak detection in your CI pipeline to catch issues before they reach production.

5. **Monitor in production**: Use observability tools to track memory usage patterns and catch leaks early.

Memory management isn't just about fixing bugs - it's about building applications that remain performant over extended use. Users expect your application to work smoothly whether they've had it open for 5 minutes or 5 hours.

**Key Debugging Workflow:**
1. Reproduce the suspected leak
2. Take a baseline heap snapshot
3. Perform the leaky action multiple times
4. Force garbage collection
5. Take a comparison snapshot
6. Analyze the delta for retained objects
7. Use the Retainers panel to find the root cause
8. Implement the appropriate fix pattern
9. Verify the fix with another snapshot comparison

---

**Related Reading:**
- [Basics of Profiling: Turning CPU and Memory Hotspots into Action](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
- [Node.js Memory Optimization: Preventing Leaks in Production](https://oneuptime.com/blog/post/2026-01-06-nodejs-memory-optimization-prevent-leaks/view)
- [The Three Pillars of Observability: Logs, Metrics, and Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)

---

*Memory leaks can silently degrade user experience and increase infrastructure costs. Use OneUptime to monitor your application's memory usage in production and get alerted before small leaks become big problems.*
