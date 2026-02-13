# How to Implement Virtualization for Large Lists in React with react-window

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Performance, Virtualization, react-window, Large Lists, Optimization

Description: Learn how to efficiently render large lists in React applications using react-window, a lightweight library that implements windowing techniques to dramatically improve performance.

---

## Introduction

When building modern web applications, developers frequently encounter scenarios where they need to display large datasets in list or table formats. Whether it's a product catalog with thousands of items, a log viewer with millions of entries, or a social media feed that keeps growing, rendering all these items at once can severely impact your application's performance.

The problem is straightforward: the DOM (Document Object Model) wasn't designed to handle tens of thousands of elements efficiently. When you try to render a large list naively, you'll experience:

- **Slow initial render times**: The browser must create DOM nodes for every item
- **High memory consumption**: Each DOM element consumes memory
- **Sluggish scrolling**: The browser struggles to repaint thousands of elements
- **Poor user experience**: Users face laggy interfaces and unresponsive applications

This is where **virtualization** (also known as **windowing**) comes to the rescue. In this comprehensive guide, we'll explore how to implement virtualization in React using `react-window`, a lightweight and efficient library created by Brian Vaughn, the same developer who built the React DevTools.

## What is Virtualization?

Virtualization is a technique that renders only the items currently visible in the viewport, plus a small buffer zone above and below. Instead of creating thousands of DOM elements, we only create enough to fill the visible area-typically between 10 to 50 elements, regardless of the total list size.

### How Virtualization Works

Imagine you have a list of 10,000 items, but your viewport can only display 20 items at a time. Without virtualization:

- All 10,000 DOM elements are created
- The browser maintains all 10,000 elements in memory
- Scrolling requires updating the position of all elements

With virtualization:

- Only ~25-30 DOM elements are created (visible items + buffer)
- Memory usage remains constant regardless of list size
- Only visible elements are updated during scroll

The virtualization library calculates which items should be visible based on:

1. The current scroll position
2. The height of each item
3. The height of the container

As the user scrolls, items that move out of view are recycled to display new content entering the viewport.

## Why Choose react-window?

There are several virtualization libraries available for React, including `react-virtualized`, `react-virtual`, and `react-window`. Here's why `react-window` stands out:

### Advantages of react-window

1. **Lightweight**: At ~6KB gzipped, it's significantly smaller than react-virtualized (~35KB)
2. **Simple API**: Easy to learn and implement
3. **Excellent performance**: Highly optimized for modern React
4. **TypeScript support**: Full type definitions included
5. **Active maintenance**: Regular updates and bug fixes
6. **Flexible**: Supports both fixed and variable size items

### When to Use react-window

- Lists with hundreds or thousands of items
- Tables with many rows
- Grids displaying large image galleries
- Chat applications with extensive message history
- Log viewers and monitoring dashboards
- Any scrollable content with many items

## Getting Started with react-window

### Installation

First, install `react-window` using npm or yarn:

```bash
# Using npm
npm install react-window

# Using yarn
yarn add react-window

# Using pnpm
pnpm add react-window
```

If you're using TypeScript, you'll also want the type definitions:

```bash
npm install --save-dev @types/react-window
```

### Basic Concepts

`react-window` provides several components for different use cases:

| Component | Description |
|-----------|-------------|
| `FixedSizeList` | List where all items have the same height |
| `VariableSizeList` | List where items can have different heights |
| `FixedSizeGrid` | Grid where all cells have the same dimensions |
| `VariableSizeGrid` | Grid where cells can have different dimensions |

Let's explore each of these in detail.

## FixedSizeList: The Simplest Implementation

`FixedSizeList` is the most performant option when all your list items have the same height. It's simpler and faster because the library doesn't need to calculate individual item positions.

### Basic Example

```tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';

// Sample data - imagine this is a large dataset
const items = Array.from({ length: 10000 }, (_, index) => ({
  id: index,
  name: `Item ${index + 1}`,
  description: `This is the description for item ${index + 1}`
}));

// Row component that renders each item
const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
  const item = items[index];

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #eee',
        backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
      }}
    >
      <div>
        <strong>{item.name}</strong>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          {item.description}
        </p>
      </div>
    </div>
  );
};

// Main component
const VirtualizedList: React.FC = () => {
  return (
    <List
      height={600}       // Height of the visible area
      itemCount={items.length}  // Total number of items
      itemSize={60}      // Height of each item in pixels
      width="100%"       // Width of the list
    >
      {Row}
    </List>
  );
};

export default VirtualizedList;
```

### Understanding the Props

Let's break down the essential props for `FixedSizeList`:

```tsx
interface FixedSizeListProps {
  // Required props
  height: number | string;    // Height of the scrollable container
  width: number | string;     // Width of the container
  itemCount: number;          // Total number of items in the list
  itemSize: number;           // Height of each row (in pixels)
  children: React.ComponentType<ListChildComponentProps>;

  // Optional props
  className?: string;
  style?: React.CSSProperties;
  overscanCount?: number;     // Number of items to render outside visible area
  initialScrollOffset?: number;
  onScroll?: (props: ListOnScrollProps) => void;
  onItemsRendered?: (props: ListOnItemsRenderedProps) => void;
  itemData?: any;             // Data passed to each item
  itemKey?: (index: number, data: any) => string | number;
  direction?: 'ltr' | 'rtl';
  layout?: 'vertical' | 'horizontal';
}
```

### Passing Data with itemData

Instead of relying on closure variables, you can pass data explicitly using the `itemData` prop:

```tsx
import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

interface RowData {
  users: User[];
  onUserClick: (user: User) => void;
}

const Row = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { users, onUserClick } = data;
  const user = users[index];

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #e0e0e0'
      }}
      onClick={() => onUserClick(user)}
    >
      <img
        src={user.avatar}
        alt={user.name}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          marginRight: 12
        }}
      />
      <div>
        <div style={{ fontWeight: 600 }}>{user.name}</div>
        <div style={{ color: '#666', fontSize: 14 }}>{user.email}</div>
      </div>
    </div>
  );
};

const UserList: React.FC<{ users: User[] }> = ({ users }) => {
  const handleUserClick = (user: User) => {
    console.log('User clicked:', user);
  };

  const itemData: RowData = {
    users,
    onUserClick: handleUserClick
  };

  return (
    <List
      height={500}
      itemCount={users.length}
      itemSize={65}
      width="100%"
      itemData={itemData}
    >
      {Row}
    </List>
  );
};

export default UserList;
```

### Optimizing with Memoization

To prevent unnecessary re-renders of list items, wrap your Row component with `React.memo`:

```tsx
import React, { memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { areEqual } from 'react-window';

interface ItemData {
  items: string[];
}

const Row = memo(({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const item = data.items[index];

  return (
    <div style={style}>
      {item}
    </div>
  );
}, areEqual);

// Setting displayName for debugging
Row.displayName = 'Row';

const OptimizedList: React.FC<{ items: string[] }> = ({ items }) => {
  // Memoize itemData to prevent unnecessary re-renders
  const itemData = React.useMemo(() => ({ items }), [items]);

  return (
    <List
      height={400}
      itemCount={items.length}
      itemSize={35}
      width={300}
      itemData={itemData}
    >
      {Row}
    </List>
  );
};

export default OptimizedList;
```

## VariableSizeList: Handling Dynamic Heights

When your list items have different heights, use `VariableSizeList`. This is common in chat applications, social media feeds, or any content with variable-length text.

### Basic Example

```tsx
import React, { useRef } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';

interface Message {
  id: number;
  content: string;
  sender: string;
  timestamp: Date;
}

// Generate sample messages with varying lengths
const messages: Message[] = Array.from({ length: 5000 }, (_, index) => ({
  id: index,
  content: index % 5 === 0
    ? 'This is a longer message that spans multiple lines and contains more content than typical messages. It might include detailed information or a longer story.'
    : index % 3 === 0
    ? 'Medium length message with some additional context.'
    : 'Short message',
  sender: `User ${index % 10}`,
  timestamp: new Date(Date.now() - index * 60000)
}));

// Function to estimate item height based on content
const getItemSize = (index: number): number => {
  const message = messages[index];
  const baseHeight = 60; // Minimum height for padding and metadata
  const charsPerLine = 50;
  const lineHeight = 20;
  const lines = Math.ceil(message.content.length / charsPerLine);
  return baseHeight + (lines * lineHeight);
};

const MessageRow = ({ index, style }: ListChildComponentProps) => {
  const message = messages[index];

  return (
    <div
      style={{
        ...style,
        padding: '12px 16px',
        borderBottom: '1px solid #eee'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong>{message.sender}</strong>
        <span style={{ color: '#999', fontSize: 12 }}>
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <p style={{ margin: 0, lineHeight: '20px' }}>{message.content}</p>
    </div>
  );
};

const ChatMessages: React.FC = () => {
  const listRef = useRef<List>(null);

  return (
    <List
      ref={listRef}
      height={600}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
      estimatedItemSize={80}
    >
      {MessageRow}
    </List>
  );
};

export default ChatMessages;
```

### Dynamic Height Measurement

Sometimes you can't predict item heights in advance. In these cases, you need to measure items after they render:

```tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
}

interface PostListProps {
  posts: Post[];
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  const listRef = useRef<List>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});

  const getItemSize = useCallback((index: number): number => {
    return rowHeights.current[index] || 150; // Default height
  }, []);

  const setRowHeight = useCallback((index: number, height: number) => {
    if (rowHeights.current[index] !== height) {
      rowHeights.current[index] = height;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const post = posts[index];

    useEffect(() => {
      if (rowRef.current) {
        const height = rowRef.current.getBoundingClientRect().height;
        setRowHeight(index, height);
      }
    }, [index]);

    return (
      <div style={style}>
        <div
          ref={rowRef}
          style={{
            padding: '16px',
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>{post.title}</h3>
          <p style={{ margin: '0 0 12px 0', color: '#555' }}>{post.content}</p>
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
              style={{ maxWidth: '100%', borderRadius: 8 }}
              onLoad={() => {
                if (rowRef.current) {
                  const height = rowRef.current.getBoundingClientRect().height;
                  setRowHeight(index, height);
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }, [posts, setRowHeight]);

  return (
    <List
      ref={listRef}
      height={700}
      itemCount={posts.length}
      itemSize={getItemSize}
      width="100%"
      estimatedItemSize={150}
    >
      {Row}
    </List>
  );
};

export default PostList;
```

### Important Methods for VariableSizeList

```tsx
// Reset cached sizes after a specific index
listRef.current?.resetAfterIndex(index: number, shouldForceUpdate?: boolean);

// Scroll to a specific item
listRef.current?.scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start');

// Get the scroll offset
const offset = listRef.current?.state.scrollOffset;
```

## Building a Complete Example: Virtualized Data Table

Let's build a more complex example-a data table with sorting, filtering, and selection:

```tsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

// Types
interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  startDate: string;
}

interface SortConfig {
  key: keyof Employee;
  direction: 'asc' | 'desc';
}

// Generate sample data
const generateEmployees = (count: number): Employee[] => {
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

  return Array.from({ length: count }, (_, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return {
      id: index + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@company.com`,
      department: departments[Math.floor(Math.random() * departments.length)],
      salary: Math.floor(Math.random() * 100000) + 50000,
      startDate: new Date(
        Date.now() - Math.floor(Math.random() * 365 * 5) * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0]
    };
  });
};

const employees = generateEmployees(50000);

// Styles
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    marginBottom: '20px'
  },
  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr 1.5fr 120px 100px 100px',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    fontWeight: 600,
    fontSize: '14px'
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr 1.5fr 120px 100px 100px',
    gap: '8px',
    padding: '12px 16px',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    fontSize: '14px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  stats: {
    padding: '12px 16px',
    backgroundColor: '#e8f4fd',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px'
  }
};

// Row Component
interface RowData {
  employees: Employee[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

const EmployeeRow = React.memo(({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { employees, selectedIds, onToggleSelect } = data;
  const employee = employees[index];
  const isSelected = selectedIds.has(employee.id);

  return (
    <div
      style={{
        ...style,
        ...styles.row,
        backgroundColor: isSelected ? '#e3f2fd' : index % 2 === 0 ? '#fff' : '#fafafa'
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(employee.id)}
        style={styles.checkbox}
      />
      <div style={{ fontWeight: 500 }}>{employee.name}</div>
      <div style={{ color: '#666' }}>{employee.email}</div>
      <div>{employee.department}</div>
      <div>${employee.salary.toLocaleString()}</div>
      <div>{employee.startDate}</div>
    </div>
  );
});

EmployeeRow.displayName = 'EmployeeRow';

// Main Component
const VirtualizedDataTable: React.FC = () => {
  const listRef = useRef<List>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Get unique departments for filter
  const departments = useMemo(() => {
    return [...new Set(employees.map(e => e.department))].sort();
  }, []);

  // Filter and sort data
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        e =>
          e.name.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term)
      );
    }

    // Apply department filter
    if (departmentFilter) {
      result = result.filter(e => e.department === departmentFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return result;
  }, [searchTerm, departmentFilter, sortConfig]);

  // Handle sort
  const handleSort = useCallback((key: keyof Employee) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Handle selection
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
    }
  }, [filteredEmployees, selectedIds.size]);

  // Item data for rows
  const itemData: RowData = useMemo(
    () => ({
      employees: filteredEmployees,
      selectedIds,
      onToggleSelect: handleToggleSelect
    }),
    [filteredEmployees, selectedIds, handleToggleSelect]
  );

  // Sort indicator
  const SortIndicator = ({ columnKey }: { columnKey: keyof Employee }) => {
    if (sortConfig.key !== columnKey) return null;
    return <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Employee Directory</h1>
        <p style={{ color: '#666' }}>
          Displaying {filteredEmployees.length.toLocaleString()} of {employees.length.toLocaleString()} employees
        </p>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ ...styles.input, width: '250px' }}
        />
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <button
          onClick={handleSelectAll}
          style={{
            ...styles.input,
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none'
          }}
        >
          {selectedIds.size === filteredEmployees.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div style={styles.stats}>
          <strong>{selectedIds.size}</strong> employee(s) selected |
          Total salary: <strong>${Array.from(selectedIds)
            .map(id => employees.find(e => e.id === id)?.salary || 0)
            .reduce((a, b) => a + b, 0)
            .toLocaleString()}</strong>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={styles.tableHeader}>
          <input
            type="checkbox"
            checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
            onChange={handleSelectAll}
            style={styles.checkbox}
          />
          <div style={styles.sortableHeader} onClick={() => handleSort('name')}>
            Name <SortIndicator columnKey="name" />
          </div>
          <div style={styles.sortableHeader} onClick={() => handleSort('email')}>
            Email <SortIndicator columnKey="email" />
          </div>
          <div style={styles.sortableHeader} onClick={() => handleSort('department')}>
            Department <SortIndicator columnKey="department" />
          </div>
          <div style={styles.sortableHeader} onClick={() => handleSort('salary')}>
            Salary <SortIndicator columnKey="salary" />
          </div>
          <div style={styles.sortableHeader} onClick={() => handleSort('startDate')}>
            Start Date <SortIndicator columnKey="startDate" />
          </div>
        </div>

        <List
          ref={listRef}
          height={600}
          itemCount={filteredEmployees.length}
          itemSize={50}
          width="100%"
          itemData={itemData}
          overscanCount={5}
        >
          {EmployeeRow}
        </List>
      </div>
    </div>
  );
};

export default VirtualizedDataTable;
```

## Horizontal Lists and Grids

### Horizontal FixedSizeList

```tsx
import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface ImageItem {
  id: number;
  url: string;
  title: string;
}

const images: ImageItem[] = Array.from({ length: 100 }, (_, index) => ({
  id: index,
  url: `https://picsum.photos/200/150?random=${index}`,
  title: `Image ${index + 1}`
}));

const ImageCard = ({ index, style }: ListChildComponentProps) => {
  const image = images[index];

  return (
    <div
      style={{
        ...style,
        padding: '8px'
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <img
          src={image.url}
          alt={image.title}
          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
        />
        <div style={{ padding: '8px', textAlign: 'center', fontWeight: 500 }}>
          {image.title}
        </div>
      </div>
    </div>
  );
};

const HorizontalImageGallery: React.FC = () => {
  return (
    <List
      height={220}
      itemCount={images.length}
      itemSize={216}
      width={800}
      layout="horizontal"
    >
      {ImageCard}
    </List>
  );
};

export default HorizontalImageGallery;
```

### FixedSizeGrid

```tsx
import React from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

const products: Product[] = Array.from({ length: 1000 }, (_, index) => ({
  id: index,
  name: `Product ${index + 1}`,
  price: Math.floor(Math.random() * 1000) + 10,
  image: `https://picsum.photos/150/150?random=${index}`
}));

const COLUMN_COUNT = 4;
const ROW_COUNT = Math.ceil(products.length / COLUMN_COUNT);

const ProductCell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
  const index = rowIndex * COLUMN_COUNT + columnIndex;

  if (index >= products.length) {
    return <div style={style} />;
  }

  const product = products[index];

  return (
    <div
      style={{
        ...style,
        padding: '8px'
      }}
    >
      <div
        style={{
          height: '100%',
          border: '1px solid #eee',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
        />
        <div style={{ padding: '12px', flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{product.name}</h4>
          <p style={{ margin: 0, color: '#007bff', fontWeight: 600 }}>
            ${product.price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

const ProductGrid: React.FC = () => {
  return (
    <Grid
      columnCount={COLUMN_COUNT}
      columnWidth={220}
      height={600}
      rowCount={ROW_COUNT}
      rowHeight={280}
      width={900}
    >
      {ProductCell}
    </Grid>
  );
};

export default ProductGrid;
```

## Advanced Techniques

### Infinite Loading

Combine `react-window` with infinite loading for data that loads on demand:

```tsx
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps, ListOnItemsRenderedProps } from 'react-window';

interface DataItem {
  id: number;
  content: string;
}

const InfiniteList: React.FC = () => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<() => void>();

  // Simulate loading more items
  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasNextPage) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newItems: DataItem[] = Array.from({ length: 50 }, (_, index) => ({
      id: items.length + index,
      content: `Item ${items.length + index + 1}`
    }));

    setItems(prev => [...prev, ...newItems]);
    setIsLoading(false);

    // Stop after 500 items for demo
    if (items.length + newItems.length >= 500) {
      setHasNextPage(false);
    }
  }, [items.length, isLoading, hasNextPage]);

  loadMoreRef.current = loadMoreItems;

  // Load initial data
  useEffect(() => {
    loadMoreItems();
  }, []);

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
      if (visibleStopIndex >= items.length - 10 && hasNextPage && !isLoading) {
        loadMoreRef.current?.();
      }
    },
    [items.length, hasNextPage, isLoading]
  );

  const itemCount = hasNextPage ? items.length + 1 : items.length;

  const Row = ({ index, style }: ListChildComponentProps) => {
    if (index >= items.length) {
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isLoading ? 'Loading more...' : 'Load more'}
        </div>
      );
    }

    const item = items[index];
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #eee'
        }}
      >
        {item.content}
      </div>
    );
  };

  return (
    <List
      height={400}
      itemCount={itemCount}
      itemSize={50}
      width="100%"
      onItemsRendered={handleItemsRendered}
    >
      {Row}
    </List>
  );
};

export default InfiniteList;
```

### Auto-Sizer for Responsive Lists

Use `react-virtualized-auto-sizer` to make your list fill its container:

```bash
npm install react-virtualized-auto-sizer
```

```tsx
import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const items = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);

const Row = ({ index, style }: ListChildComponentProps) => (
  <div style={{ ...style, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
    {items[index]}
  </div>
);

const ResponsiveList: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={35}
            width={width}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default ResponsiveList;
```

### Sticky Headers

Implement sticky headers with custom positioning:

```tsx
import React, { forwardRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface Section {
  type: 'header' | 'item';
  id: string;
  content: string;
  sectionId?: string;
}

// Flatten data with headers
const createSectionedData = (): Section[] => {
  const sections = ['A', 'B', 'C', 'D', 'E'];
  const result: Section[] = [];

  sections.forEach(section => {
    result.push({ type: 'header', id: `header-${section}`, content: `Section ${section}` });
    for (let i = 1; i <= 20; i++) {
      result.push({
        type: 'item',
        id: `${section}-${i}`,
        content: `${section} - Item ${i}`,
        sectionId: section
      });
    }
  });

  return result;
};

const data = createSectionedData();

const Row = ({ index, style }: ListChildComponentProps) => {
  const item = data[index];

  if (item.type === 'header') {
    return (
      <div
        style={{
          ...style,
          backgroundColor: '#f0f0f0',
          fontWeight: 'bold',
          padding: '12px 16px',
          borderBottom: '2px solid #ddd',
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}
      >
        {item.content}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        padding: '12px 16px',
        borderBottom: '1px solid #eee'
      }}
    >
      {item.content}
    </div>
  );
};

// Custom outer element with overflow handling
const OuterElement = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} style={{ ...props.style, overflow: 'auto' }} />
);

OuterElement.displayName = 'OuterElement';

const SectionedList: React.FC = () => {
  return (
    <List
      height={400}
      itemCount={data.length}
      itemSize={45}
      width="100%"
      outerElementType={OuterElement}
    >
      {Row}
    </List>
  );
};

export default SectionedList;
```

## Performance Best Practices

### 1. Memoize Row Components

Always wrap row components with `React.memo` to prevent unnecessary re-renders:

```tsx
const Row = React.memo(({ index, style, data }: ListChildComponentProps) => {
  // Row implementation
}, areEqual);
```

### 2. Memoize itemData

Use `useMemo` to prevent itemData from changing on every render:

```tsx
const itemData = useMemo(() => ({
  items,
  onItemClick: handleItemClick
}), [items, handleItemClick]);
```

### 3. Use Appropriate overscanCount

The `overscanCount` prop determines how many items to render outside the visible area:

```tsx
<List
  overscanCount={5} // Render 5 extra items above and below
  // ... other props
>
  {Row}
</List>
```

- Lower values = better performance, possible flickering during fast scroll
- Higher values = smoother scrolling, more DOM elements

### 4. Avoid Inline Styles in Row Components

Define styles outside the component or use CSS classes:

```tsx
// Good - styles defined outside
const rowStyles = {
  container: { padding: '12px 16px' },
  title: { fontWeight: 600 }
};

const Row = ({ index, style }) => (
  <div style={{ ...style, ...rowStyles.container }}>
    <span style={rowStyles.title}>Title</span>
  </div>
);

// Bad - inline styles created each render
const Row = ({ index, style }) => (
  <div style={{ ...style, padding: '12px 16px' }}>
    <span style={{ fontWeight: 600 }}>Title</span>
  </div>
);
```

### 5. Use itemKey for Stable Keys

Provide stable keys to help React identify items:

```tsx
<List
  itemKey={(index, data) => data.items[index].id}
  // ... other props
>
  {Row}
</List>
```

## Troubleshooting Common Issues

### Issue: Items Not Rendering

**Problem**: List appears empty or items are invisible.

**Solutions**:
1. Ensure the container has a defined height
2. Check that `itemCount` is greater than 0
3. Verify `itemSize` is a positive number
4. Ensure the `style` prop is applied to the row element

### Issue: Scroll Position Resets

**Problem**: Scroll position jumps to top unexpectedly.

**Solutions**:
1. Ensure itemData is memoized
2. Check if the list key is changing
3. Verify itemCount isn't resetting to 0

### Issue: Items Overlap or Have Wrong Positions

**Problem**: Items appear stacked or in wrong positions.

**Solutions**:
1. Make sure you're spreading the `style` prop on the outer element
2. Don't add margins to row items (use padding instead)
3. For VariableSizeList, call `resetAfterIndex` when item sizes change

### Issue: Performance Still Slow

**Problem**: List is still sluggish despite virtualization.

**Solutions**:
1. Profile your Row component for expensive operations
2. Move calculations outside the Row component
3. Use `React.memo` and `areEqual` from react-window
4. Reduce `overscanCount` if it's set too high
5. Simplify row DOM structure

## Summary Comparison Table

| Feature | FixedSizeList | VariableSizeList | FixedSizeGrid | VariableSizeGrid |
|---------|---------------|------------------|---------------|------------------|
| **Use Case** | Uniform height items | Dynamic height items | Uniform cell grids | Dynamic cell grids |
| **Performance** | Best | Good | Best | Good |
| **Complexity** | Low | Medium | Low | Medium |
| **itemSize Prop** | `number` | `(index) => number` | N/A | N/A |
| **columnWidth Prop** | N/A | N/A | `number` | `(index) => number` |
| **rowHeight Prop** | N/A | N/A | `number` | `(index) => number` |
| **resetAfterIndex** | No | Yes | No | Yes |
| **Memory Usage** | Constant | Constant | Constant | Constant |
| **Best For** | Tables, logs, chats | Social feeds, comments | Product grids, galleries | Pinterest-style layouts |

## Key Takeaways

1. **Virtualization is essential** for rendering large lists efficiently in React applications
2. **react-window** provides a lightweight, performant solution with a simple API
3. **Choose the right component**: Use `FixedSizeList` when possible for best performance
4. **Memoize everything**: Row components, itemData, and callbacks to prevent unnecessary re-renders
5. **Measure dynamic heights carefully** when using `VariableSizeList`
6. **Use AutoSizer** for responsive lists that adapt to container size
7. **Handle infinite loading** by combining react-window with scroll position detection
8. **Profile and optimize** your row components for complex UIs

## Conclusion

Implementing virtualization with `react-window` can dramatically improve your React application's performance when dealing with large datasets. By rendering only what's visible, you maintain constant memory usage and smooth scrolling regardless of list size.

Start with `FixedSizeList` for the simplest implementation, move to `VariableSizeList` when you need dynamic heights, and explore grids for two-dimensional layouts. Remember to follow the performance best practices outlined in this guide, and your users will enjoy a fast, responsive experience even with tens of thousands of items.

The techniques covered in this article will help you build production-ready virtualized lists that scale effortlessly. Happy coding!

## Further Resources

- [react-window GitHub Repository](https://github.com/bvaughn/react-window)
- [react-window Examples and Sandbox](https://react-window.vercel.app/)
- [react-virtualized-auto-sizer](https://github.com/bvaughn/react-virtualized-auto-sizer)
- [React Performance Optimization Guide](https://react.dev/learn/render-and-commit)
