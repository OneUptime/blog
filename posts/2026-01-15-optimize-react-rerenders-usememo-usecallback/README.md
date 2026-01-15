# How to Optimize React Re-Renders with useMemo and useCallback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Performance, Hooks, useMemo, useCallback, Optimization

Description: A comprehensive guide to understanding and optimizing React component re-renders using useMemo and useCallback hooks, with practical examples and best practices for building performant applications.

---

> Performance optimization in React is not about premature optimization - it's about understanding when and why components re-render, and having the right tools to control that behavior when it matters.

React's declarative model makes building UIs straightforward, but it can lead to performance issues if you don't understand how re-rendering works. Two essential hooks - `useMemo` and `useCallback` - give you fine-grained control over when expensive computations run and when child components re-render.

This guide walks through the fundamentals of React re-rendering, how these hooks work under the hood, when to use them (and when not to), and practical patterns you can apply immediately to your codebase.

---

## Table of Contents

1. Understanding React Re-Renders
2. The Problem: Unnecessary Re-Renders
3. What is useMemo?
4. What is useCallback?
5. How useMemo and useCallback Work Internally
6. When to Use useMemo
7. When to Use useCallback
8. Practical Examples
9. Common Mistakes and Anti-Patterns
10. Performance Profiling
11. Alternative Optimization Strategies
12. Summary Table
13. Best Practices Checklist

---

## 1. Understanding React Re-Renders

Before optimizing, you need to understand what triggers a re-render in React.

A component re-renders when:

| Trigger | Description |
|---------|-------------|
| State change | When `useState` or `useReducer` state updates |
| Props change | When parent passes new prop values |
| Context change | When a consumed context value changes |
| Parent re-render | When a parent component re-renders (by default, all children re-render) |
| Force update | When `forceUpdate()` is called (class components) |

Important distinction:

- **Re-render**: React calls your component function again, creating new JSX
- **DOM update**: React actually changes the DOM (only happens if virtual DOM diff finds changes)

Re-renders are not inherently bad. React is optimized for frequent re-renders. The problem is when:

1. Re-renders trigger expensive computations
2. Re-renders cause child components to re-render unnecessarily
3. Re-renders happen too frequently (e.g., on every keystroke with large component trees)

---

## 2. The Problem: Unnecessary Re-Renders

Consider this example:

```tsx
import React, { useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface ProductListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

function ProductList({ products, onProductClick }: ProductListProps) {
  console.log('ProductList rendered');
  return (
    <ul>
      {products.map(product => (
        <li key={product.id} onClick={() => onProductClick(product)}>
          {product.name} - ${product.price}
        </li>
      ))}
    </ul>
  );
}

function ExpensiveCalculation({ products }: { products: Product[] }) {
  console.log('ExpensiveCalculation rendered');

  // Simulate expensive computation
  const total = products.reduce((sum, p) => {
    // Imagine complex calculations here
    let result = 0;
    for (let i = 0; i < 10000; i++) {
      result += p.price * Math.random();
    }
    return sum + result;
  }, 0);

  return <div>Weighted Total: ${total.toFixed(2)}</div>;
}

function App() {
  const [products] = useState<Product[]>([
    { id: 1, name: 'Laptop', price: 999, category: 'Electronics' },
    { id: 2, name: 'Phone', price: 699, category: 'Electronics' },
    { id: 3, name: 'Headphones', price: 199, category: 'Electronics' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />

      <ExpensiveCalculation products={products} />
      <ProductList products={products} onProductClick={handleProductClick} />

      {selectedProduct && <p>Selected: {selectedProduct.name}</p>}
    </div>
  );
}
```

**Problems with this code:**

1. Every keystroke in the search input causes `App` to re-render
2. `ExpensiveCalculation` runs its expensive computation on every re-render, even though `products` hasn't changed
3. `ProductList` receives a new `handleProductClick` function reference on every render
4. If `ProductList` were wrapped in `React.memo`, it would still re-render because `handleProductClick` is a new function each time

---

## 3. What is useMemo?

`useMemo` is a React hook that memoizes the result of a computation. It only recalculates the value when one of its dependencies changes.

### Syntax

```tsx
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```

### How It Works

1. On first render, React calls your computation function and stores the result
2. On subsequent renders, React checks if any dependency has changed (using `Object.is` comparison)
3. If dependencies are the same, React returns the cached result without calling the function
4. If dependencies changed, React calls the function again and caches the new result

### Basic Example

```tsx
import React, { useState, useMemo } from 'react';

interface Item {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

function ShoppingCart({ items }: { items: Item[] }) {
  const [couponCode, setCouponCode] = useState('');

  // Without useMemo: recalculates on every render
  // const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // With useMemo: only recalculates when items change
  const total = useMemo(() => {
    console.log('Calculating total...');
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  return (
    <div>
      <p>Total: ${total.toFixed(2)}</p>
      <input
        type="text"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        placeholder="Coupon code"
      />
    </div>
  );
}
```

Now typing in the coupon input doesn't recalculate the total.

---

## 4. What is useCallback?

`useCallback` is a React hook that memoizes a function definition. It returns the same function reference unless one of its dependencies changes.

### Syntax

```tsx
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);
```

### How It Works

1. On first render, React stores the function you provide
2. On subsequent renders, React checks if any dependency has changed
3. If dependencies are the same, React returns the same function reference
4. If dependencies changed, React stores and returns the new function

### The Key Insight

`useCallback` is essentially `useMemo` for functions:

```tsx
// These are equivalent:
const memoizedFn = useCallback(() => doSomething(a, b), [a, b]);
const memoizedFn = useMemo(() => () => doSomething(a, b), [a, b]);
```

### Basic Example

```tsx
import React, { useState, useCallback, memo } from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

// Memoized child component
const ExpensiveButton = memo(function ExpensiveButton({ onClick, children }: ButtonProps) {
  console.log(`Button "${children}" rendered`);
  return <button onClick={onClick}>{children}</button>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  // Without useCallback: new function on every render
  // const handleClick = () => setCount(c => c + 1);

  // With useCallback: same function reference unless dependencies change
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []); // Empty deps because setCount is stable

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <p>Count: {count}</p>
      <ExpensiveButton onClick={handleClick}>Increment</ExpensiveButton>
    </div>
  );
}
```

Now typing in the input doesn't cause `ExpensiveButton` to re-render.

---

## 5. How useMemo and useCallback Work Internally

Understanding the internals helps you use these hooks correctly.

### Reference Equality in JavaScript

```tsx
// Primitive values
'hello' === 'hello'  // true
42 === 42            // true

// Objects and functions (compared by reference)
{} === {}            // false (different objects)
[] === []            // false (different arrays)
(() => {}) === (() => {})  // false (different functions)

// Same reference
const obj = { a: 1 };
obj === obj          // true

const fn = () => {};
fn === fn            // true
```

### Why This Matters

React uses `Object.is` (similar to `===`) to compare:

- Props in `React.memo`
- Dependencies in `useMemo`, `useCallback`, `useEffect`
- Context values

Every time a component renders, inline functions and objects are recreated with new references.

### Dependency Comparison

```tsx
function useCustomMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | null>(null);

  // Check if deps changed
  const depsChanged = ref.current === null ||
    deps.some((dep, i) => !Object.is(dep, ref.current!.deps[i]));

  if (depsChanged) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}
```

---

## 6. When to Use useMemo

### Use useMemo When:

**1. Expensive Computations**

```tsx
function DataGrid({ rows, columns, filters }: DataGridProps) {
  // Expensive: filtering and sorting thousands of rows
  const processedData = useMemo(() => {
    console.log('Processing data...');
    return rows
      .filter(row => matchesFilters(row, filters))
      .sort((a, b) => compareRows(a, b, columns))
      .map(row => formatRow(row, columns));
  }, [rows, filters, columns]);

  return <Table data={processedData} />;
}
```

**2. Referential Equality for Dependencies**

```tsx
function SearchResults({ query }: { query: string }) {
  // Memoize to prevent useEffect from running on every render
  const searchParams = useMemo(() => ({
    q: query,
    limit: 10,
    offset: 0,
  }), [query]);

  useEffect(() => {
    fetchResults(searchParams);
  }, [searchParams]); // Now only runs when query changes

  return <div>...</div>;
}
```

**3. Referential Equality for Child Props**

```tsx
function ParentComponent({ userId }: { userId: string }) {
  const [filter, setFilter] = useState('all');

  // Memoize to prevent MemoizedChild from re-rendering
  const config = useMemo(() => ({
    userId,
    settings: { theme: 'dark', locale: 'en' },
  }), [userId]);

  return (
    <div>
      <FilterSelector value={filter} onChange={setFilter} />
      <MemoizedChild config={config} />
    </div>
  );
}
```

### Do NOT Use useMemo When:

**1. Simple Computations**

```tsx
// BAD: useMemo overhead exceeds computation cost
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);

// GOOD: just compute it
const fullName = `${firstName} ${lastName}`;
```

**2. No Consumer Needs Stable Reference**

```tsx
// BAD: no memo'd child or effect depends on this
const data = useMemo(() => items.map(i => i.name), [items]);
return <ul>{data.map(name => <li key={name}>{name}</li>)}</ul>;

// GOOD: just compute inline
return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
```

**3. Dependencies Change on Every Render**

```tsx
// BAD: obj is new every render, so useMemo always recalculates
function Component({ obj }) {  // obj = { a: 1 } passed inline from parent
  const result = useMemo(() => compute(obj), [obj]); // Always recomputes!
}
```

---

## 7. When to Use useCallback

### Use useCallback When:

**1. Passing Callbacks to Memoized Children**

```tsx
const MemoizedList = memo(function List({ items, onItemClick }: ListProps) {
  console.log('List rendered');
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function Parent() {
  const [items, setItems] = useState<Item[]>([...]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Without useCallback, MemoizedList re-renders on every Parent render
  const handleItemClick = useCallback((item: Item) => {
    setSelectedId(item.id);
  }, []);

  return <MemoizedList items={items} onItemClick={handleItemClick} />;
}
```

**2. Dependencies in useEffect**

```tsx
function SearchComponent({ onResults }: { onResults: (data: any[]) => void }) {
  const [query, setQuery] = useState('');

  // Memoize to prevent effect from running when parent re-renders
  const stableOnResults = useCallback(onResults, [onResults]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(res => res.json())
      .then(stableOnResults);

    return () => controller.abort();
  }, [query, stableOnResults]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**3. Custom Hooks That Return Functions**

```tsx
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Return stable function reference
  return useCallback(
    ((...args) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// Usage
function SearchInput() {
  const [query, setQuery] = useState('');

  const search = useCallback((q: string) => {
    console.log('Searching for:', q);
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

### Do NOT Use useCallback When:

**1. Child Is Not Memoized**

```tsx
// BAD: Button is not memo'd, so it re-renders regardless
function Parent() {
  const handleClick = useCallback(() => console.log('clicked'), []);
  return <Button onClick={handleClick} />; // Button still re-renders!
}

// GOOD: Either memo Button or don't use useCallback
function Parent() {
  const handleClick = () => console.log('clicked');
  return <Button onClick={handleClick} />;
}
```

**2. Simple Event Handlers**

```tsx
// BAD: Premature optimization
function Form() {
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    console.log('submitted');
  }, []);

  return <form onSubmit={handleSubmit}>...</form>;
}

// GOOD: Just use inline handler
function Form() {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      console.log('submitted');
    }}>
      ...
    </form>
  );
}
```

---

## 8. Practical Examples

### Example 1: Optimized Data Table

```tsx
import React, { useState, useMemo, useCallback, memo } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface ColumnDef {
  key: keyof User;
  label: string;
  sortable?: boolean;
}

interface TableRowProps {
  user: User;
  columns: ColumnDef[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
}

// Memoized row component
const TableRow = memo(function TableRow({ user, columns, onEdit, onDelete }: TableRowProps) {
  console.log(`Rendering row for ${user.name}`);

  return (
    <tr>
      {columns.map(col => (
        <td key={col.key}>{String(user[col.key])}</td>
      ))}
      <td>
        <button onClick={() => onEdit(user)}>Edit</button>
        <button onClick={() => onDelete(user.id)}>Delete</button>
      </td>
    </tr>
  );
});

interface SortConfig {
  key: keyof User;
  direction: 'asc' | 'desc';
}

function UserTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Memoized columns definition
  const columns: ColumnDef[] = useMemo(() => [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ], []);

  // Expensive: filter and sort users
  const processedUsers = useMemo(() => {
    console.log('Processing users...');

    let result = users;

    // Filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [users, search, sortConfig]);

  // Stable callbacks for child components
  const handleEdit = useCallback((user: User) => {
    setEditingUser(user);
  }, []);

  const handleDelete = useCallback((userId: number) => {
    console.log('Delete user:', userId);
    // API call would go here
  }, []);

  const handleSort = useCallback((key: keyof User) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />

      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                style={{ cursor: col.sortable ? 'pointer' : 'default' }}
              >
                {col.label}
                {sortConfig.key === col.key && (
                  <span>{sortConfig.direction === 'asc' ? ' ^' : ' v'}</span>
                )}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {processedUsers.map(user => (
            <TableRow
              key={user.id}
              user={user}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>

      {editingUser && (
        <EditModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}
```

### Example 2: Form with Dependent Fields

```tsx
import React, { useState, useMemo, useCallback } from 'react';

interface PricingConfig {
  basePrice: number;
  taxRate: number;
  discountPercent: number;
  quantity: number;
}

function PricingCalculator() {
  const [config, setConfig] = useState<PricingConfig>({
    basePrice: 100,
    taxRate: 0.08,
    discountPercent: 10,
    quantity: 1,
  });

  const [notes, setNotes] = useState('');

  // Expensive calculation - only recompute when pricing inputs change
  const pricing = useMemo(() => {
    console.log('Calculating pricing...');

    const subtotal = config.basePrice * config.quantity;
    const discount = subtotal * (config.discountPercent / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * config.taxRate;
    const total = afterDiscount + tax;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      afterDiscount: afterDiscount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    };
  }, [config.basePrice, config.quantity, config.discountPercent, config.taxRate]);

  // Stable update handler
  const updateConfig = useCallback(<K extends keyof PricingConfig>(
    key: K,
    value: PricingConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div>
      <h2>Pricing Calculator</h2>

      <div>
        <label>
          Base Price: $
          <input
            type="number"
            value={config.basePrice}
            onChange={(e) => updateConfig('basePrice', Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          Quantity:
          <input
            type="number"
            value={config.quantity}
            onChange={(e) => updateConfig('quantity', Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          Discount %:
          <input
            type="number"
            value={config.discountPercent}
            onChange={(e) => updateConfig('discountPercent', Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          Tax Rate:
          <input
            type="number"
            step="0.01"
            value={config.taxRate}
            onChange={(e) => updateConfig('taxRate', Number(e.target.value))}
          />
        </label>
      </div>

      <div>
        <label>
          Notes (doesn't trigger recalculation):
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <div className="pricing-summary">
        <p>Subtotal: ${pricing.subtotal}</p>
        <p>Discount: -${pricing.discount}</p>
        <p>After Discount: ${pricing.afterDiscount}</p>
        <p>Tax: +${pricing.tax}</p>
        <p><strong>Total: ${pricing.total}</strong></p>
      </div>
    </div>
  );
}
```

### Example 3: Virtualized List with Callbacks

```tsx
import React, { useState, useCallback, useMemo, memo } from 'react';

interface ListItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

interface ItemProps {
  item: ListItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

const ListItemComponent = memo(function ListItemComponent({
  item,
  onToggle,
  onDelete,
  onEdit,
}: ItemProps) {
  console.log(`Rendering item: ${item.id}`);

  return (
    <div className={`list-item ${item.isCompleted ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={() => onToggle(item.id)}
      />
      <span>{item.title}</span>
      <button onClick={() => onEdit(item.id, `${item.title} (edited)`)}>
        Edit
      </button>
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
});

function TodoList() {
  const [items, setItems] = useState<ListItem[]>(() =>
    Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      isCompleted: false,
    }))
  );

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    console.log('Filtering items...');

    return items.filter(item => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && !item.isCompleted) ||
        (filter === 'completed' && item.isCompleted);

      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [items, filter, searchQuery]);

  // Statistics - derived from items
  const stats = useMemo(() => ({
    total: items.length,
    completed: items.filter(i => i.isCompleted).length,
    active: items.filter(i => !i.isCompleted).length,
  }), [items]);

  // Stable callbacks
  const handleToggle = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleEdit = useCallback((id: string, title: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, title } : item))
    );
  }, []);

  return (
    <div className="todo-list">
      <div className="controls">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">All ({stats.total})</option>
          <option value="active">Active ({stats.active})</option>
          <option value="completed">Completed ({stats.completed})</option>
        </select>
      </div>

      <div className="items">
        {filteredItems.slice(0, 50).map(item => (
          <ListItemComponent
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {filteredItems.length > 50 && (
        <p>Showing 50 of {filteredItems.length} items</p>
      )}
    </div>
  );
}
```

---

## 9. Common Mistakes and Anti-Patterns

### Mistake 1: Missing Dependencies

```tsx
// BAD: Missing userId in dependency array
const fetchUserData = useCallback(async () => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}, []); // userId is missing!

// GOOD: Include all dependencies
const fetchUserData = useCallback(async () => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}, [userId]);
```

### Mistake 2: Object/Array Dependencies Without Memoization

```tsx
// BAD: options is a new object every render
function Component({ data }) {
  const options = { format: 'json', pretty: true };

  const result = useMemo(() => {
    return processData(data, options);
  }, [data, options]); // options is always "new"!
}

// GOOD: Memoize the options too
function Component({ data }) {
  const options = useMemo(() => ({ format: 'json', pretty: true }), []);

  const result = useMemo(() => {
    return processData(data, options);
  }, [data, options]);
}

// BETTER: If options are static, define outside component
const OPTIONS = { format: 'json', pretty: true };

function Component({ data }) {
  const result = useMemo(() => {
    return processData(data, OPTIONS);
  }, [data]);
}
```

### Mistake 3: Using useCallback Without React.memo

```tsx
// POINTLESS: Child re-renders anyway
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <Child onClick={handleClick} />; // Child is not memoized!
}

function Child({ onClick }) {
  console.log('Child rendered'); // Logs on every Parent render
  return <button onClick={onClick}>Click</button>;
}

// CORRECT: Memoize the child
const Child = memo(function Child({ onClick }) {
  console.log('Child rendered'); // Only logs when onClick changes
  return <button onClick={onClick}>Click</button>;
});
```

### Mistake 4: Over-Memoization

```tsx
// BAD: Unnecessary memoization everywhere
function OverOptimized({ name, age }) {
  const greeting = useMemo(() => `Hello, ${name}!`, [name]);
  const info = useMemo(() => `Age: ${age}`, [age]);
  const handleClick = useCallback(() => alert(greeting), [greeting]);

  return (
    <div>
      <p>{greeting}</p>
      <p>{info}</p>
      <button onClick={handleClick}>Greet</button>
    </div>
  );
}

// GOOD: Simple and readable
function Simple({ name, age }) {
  const greeting = `Hello, ${name}!`;

  return (
    <div>
      <p>{greeting}</p>
      <p>Age: {age}</p>
      <button onClick={() => alert(greeting)}>Greet</button>
    </div>
  );
}
```

### Mistake 5: Incorrect Dependency Comparison

```tsx
// BAD: Function prop changes on every render
function Parent() {
  return <Child getData={() => fetch('/api/data')} />;
}

function Child({ getData }) {
  // This effect runs on EVERY render
  useEffect(() => {
    getData().then(setData);
  }, [getData]);
}

// GOOD: Memoize in parent
function Parent() {
  const getData = useCallback(() => fetch('/api/data'), []);
  return <Child getData={getData} />;
}
```

---

## 10. Performance Profiling

### Using React DevTools Profiler

1. Install React DevTools browser extension
2. Open DevTools and go to "Profiler" tab
3. Click "Record" and interact with your app
4. Analyze the flame graph to see which components re-rendered and why

### Identifying Re-Render Causes

```tsx
// Debug hook to log re-renders
function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>({});

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (!Object.is(previousProps.current[key], props[key])) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}

// Usage
function MyComponent(props) {
  useWhyDidYouUpdate('MyComponent', props);
  // ...
}
```

### Performance Measurement

```tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log({
    id,
    phase,
    actualDuration: `${actualDuration.toFixed(2)}ms`,
    baseDuration: `${baseDuration.toFixed(2)}ms`,
  });
};

function App() {
  return (
    <Profiler id="ExpensiveComponent" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </Profiler>
  );
}
```

---

## 11. Alternative Optimization Strategies

### React.memo for Components

```tsx
// Memoize component based on props
const MemoizedComponent = memo(function MyComponent({ data, onAction }) {
  return <div>{/* ... */}</div>;
});

// With custom comparison
const MemoizedWithCustomCompare = memo(
  function MyComponent({ items }) {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.items.length === nextProps.items.length;
  }
);
```

### State Colocation

```tsx
// BAD: State too high, causes unnecessary re-renders
function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  return (
    <div>
      <SearchInput value={searchTerm} onChange={setSearchTerm} />
      <ExpensiveDataGrid data={data} />
    </div>
  );
}

// GOOD: Move state closer to where it's used
function App() {
  const [data, setData] = useState([]);

  return (
    <div>
      <SearchSection />
      <ExpensiveDataGrid data={data} />
    </div>
  );
}

function SearchSection() {
  const [searchTerm, setSearchTerm] = useState('');
  return <SearchInput value={searchTerm} onChange={setSearchTerm} />;
}
```

### Splitting Components

```tsx
// BAD: One big component
function Dashboard({ user, notifications, analytics }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <Header user={user} />
      <TabSelector active={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && <Overview analytics={analytics} />}
      {activeTab === 'notifications' && <NotificationList items={notifications} />}
    </div>
  );
}

// GOOD: Split into focused components
function Dashboard({ user, notifications, analytics }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <Header user={user} />
      <TabContent
        activeTab={activeTab}
        onTabChange={setActiveTab}
        analytics={analytics}
        notifications={notifications}
      />
    </div>
  );
}

const TabContent = memo(function TabContent({ activeTab, onTabChange, analytics, notifications }) {
  // Only this component re-renders on tab change
  return (
    <>
      <TabSelector active={activeTab} onChange={onTabChange} />
      {activeTab === 'overview' && <Overview analytics={analytics} />}
      {activeTab === 'notifications' && <NotificationList items={notifications} />}
    </>
  );
});
```

### Using useReducer for Complex State

```tsx
interface State {
  items: Item[];
  filter: string;
  sortBy: string;
  page: number;
}

type Action =
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'ADD_ITEM'; payload: Item };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filter: action.payload, page: 0 };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    default:
      return state;
  }
}

function DataManager() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // dispatch is stable, no need for useCallback
  const setFilter = (filter: string) => dispatch({ type: 'SET_FILTER', payload: filter });

  // ...
}
```

---

## 12. Summary Table

| Aspect | useMemo | useCallback |
|--------|---------|-------------|
| **Purpose** | Cache computed values | Cache function references |
| **Returns** | The memoized value | The memoized function |
| **Use when** | Expensive calculations, referential equality for objects/arrays | Passing callbacks to memoized children, stable function references |
| **Dependencies** | Values used in computation | Values used inside the function |
| **Equivalent to** | `useMemo(() => value, deps)` | `useMemo(() => fn, deps)` |
| **Common with** | Filtering, sorting, transforming data | `React.memo`, `useEffect` dependencies |
| **Don't use when** | Simple calculations, no consumer needs stable reference | Child not memoized, simple event handlers |

### Quick Decision Guide

| Scenario | Solution |
|----------|----------|
| Expensive calculation on render | `useMemo` |
| Object/array passed to memoized child | `useMemo` |
| Object/array in `useEffect` dependencies | `useMemo` |
| Callback passed to memoized child | `useCallback` |
| Callback in `useEffect` dependencies | `useCallback` |
| Simple string concatenation | None |
| Inline event handler | None |
| Function not passed to children | None |

---

## 13. Best Practices Checklist

1. **Profile First**: Don't optimize until you've measured a problem
2. **Use React DevTools**: The Profiler shows exactly what's re-rendering
3. **Memoize Children First**: `useCallback` is useless without `React.memo`
4. **Complete Dependencies**: Always include all values used in the callback/computation
5. **Avoid Object Literals**: Move static objects outside components or memoize them
6. **Colocate State**: Keep state close to where it's used
7. **Split Components**: Smaller components mean more granular re-render control
8. **Don't Over-Optimize**: Simple code is often fast enough
9. **Consider Alternatives**: Sometimes restructuring is better than memoizing
10. **Document Intent**: Comment why you're memoizing for future maintainers

---

## Conclusion

`useMemo` and `useCallback` are powerful tools for optimizing React performance, but they're not silver bullets. The key insights are:

1. **Understand the problem first**: Use React DevTools to identify actual performance issues before optimizing
2. **useMemo caches values**: Use it for expensive computations and referential equality
3. **useCallback caches functions**: Use it with `React.memo` to prevent unnecessary child re-renders
4. **Dependencies matter**: Missing or incorrect dependencies cause bugs
5. **Don't over-optimize**: The hooks have overhead too - only use them when there's measurable benefit

Start with well-structured components, colocated state, and appropriate component splitting. Add memoization when profiling shows it's needed. Your users will thank you for the smooth, responsive experience.

---

## Related Reading

- [React Official Documentation: useMemo](https://react.dev/reference/react/useMemo)
- [React Official Documentation: useCallback](https://react.dev/reference/react/useCallback)
- [React Profiler Documentation](https://react.dev/reference/react/Profiler)
