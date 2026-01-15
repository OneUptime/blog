# How to Optimize React Native Re-Renders with useMemo and useCallback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Performance, useMemo, useCallback, Optimization, TypeScript

Description: Learn how to effectively use useMemo and useCallback hooks to optimize React Native performance and prevent unnecessary re-renders.

---

Performance optimization is a critical aspect of building smooth, responsive React Native applications. Among the most powerful tools in a developer's arsenal are the `useMemo` and `useCallback` hooks. When used correctly, these hooks can significantly reduce unnecessary re-renders and improve your app's performance. In this comprehensive guide, we'll explore everything you need to know about these hooks and how to use them effectively.

## Understanding React Native Re-Renders

Before diving into optimization techniques, it's essential to understand how React Native handles re-renders. React uses a virtual DOM (or in React Native's case, a virtual representation of the native component tree) to efficiently update the UI.

### What Triggers a Re-Render?

A component re-renders when:

1. **State changes:** When `useState` or `useReducer` state updates
2. **Props change:** When parent components pass new props
3. **Context changes:** When a consumed context value updates
4. **Parent re-renders:** When a parent component re-renders, all children re-render by default

Here's a simple example demonstrating re-render behavior:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CounterProps {
  label: string;
}

const Counter: React.FC<CounterProps> = ({ label }) => {
  console.log(`Counter "${label}" rendered`);

  return (
    <View style={styles.counter}>
      <Text>{label}</Text>
    </View>
  );
};

const ParentComponent: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [name, setName] = useState<string>('User');

  console.log('Parent rendered');

  return (
    <View style={styles.container}>
      <Text>Count: {count}</Text>
      <TouchableOpacity onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </TouchableOpacity>
      <Counter label="First Counter" />
      <Counter label="Second Counter" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  counter: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
  },
});

export default ParentComponent;
```

In this example, every time `count` changes, both `Counter` components re-render, even though their props haven't changed. This is where optimization becomes important.

## When Re-Renders Become Problematic

Not all re-renders are bad. React is highly optimized, and most re-renders are fast. However, re-renders become problematic when:

### 1. Expensive Calculations Run Repeatedly

```typescript
const ExpensiveComponent: React.FC<{ items: Item[] }> = ({ items }) => {
  // This runs on EVERY render, even if items haven't changed
  const sortedItems = items
    .filter(item => item.isActive)
    .sort((a, b) => b.priority - a.priority)
    .map(item => ({
      ...item,
      formattedDate: formatDate(item.createdAt),
    }));

  return (
    <FlatList
      data={sortedItems}
      renderItem={({ item }) => <ItemRow item={item} />}
      keyExtractor={item => item.id}
    />
  );
};
```

### 2. Large Component Trees Re-Render Unnecessarily

```typescript
const Dashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('home');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Every tab change causes ALL children to re-render
  return (
    <View style={styles.dashboard}>
      <Header notifications={notifications} />
      <TabBar selectedTab={selectedTab} onSelect={setSelectedTab} />
      <Content tab={selectedTab} />
      <Footer />
      <NotificationBadge count={notifications.length} />
      {/* Many more components... */}
    </View>
  );
};
```

### 3. Functions Are Recreated Every Render

```typescript
const SearchComponent: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // This function is recreated on every render
  const handleSearch = async (searchQuery: string): Promise<void> => {
    const data = await searchAPI(searchQuery);
    setResults(data);
  };

  // This causes SearchInput to re-render every time
  return (
    <View>
      <SearchInput onSearch={handleSearch} />
      <ResultsList results={results} />
    </View>
  );
};
```

## useMemo Hook Explained

The `useMemo` hook memoizes a computed value, preventing expensive recalculations when dependencies haven't changed.

### Syntax and Basic Usage

```typescript
const memoizedValue = useMemo<ReturnType>(() => computeExpensiveValue(a, b), [a, b]);
```

The hook takes two arguments:
1. A factory function that returns the value to memoize
2. A dependency array that determines when to recompute

### Practical Example: Memoizing Expensive Calculations

```typescript
import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

interface ProductListProps {
  products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [showInStockOnly, setShowInStockOnly] = useState<boolean>(false);

  // Without useMemo, this runs on every keystroke and any state change
  const processedProducts = useMemo<Product[]>(() => {
    console.log('Processing products...');

    let result = [...products];

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by stock
    if (showInStockOnly) {
      result = result.filter(product => product.inStock);
    }

    // Sort products
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return a.price - b.price;
    });

    return result;
  }, [products, searchTerm, sortBy, showInStockOnly]);

  // Calculate statistics - also memoized
  const statistics = useMemo(() => {
    const totalValue = processedProducts.reduce(
      (sum, product) => sum + product.price,
      0
    );
    const averagePrice = processedProducts.length > 0
      ? totalValue / processedProducts.length
      : 0;
    const inStockCount = processedProducts.filter(p => p.inStock).length;

    return {
      total: processedProducts.length,
      totalValue,
      averagePrice,
      inStockCount,
    };
  }, [processedProducts]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search products..."
      />
      <Text>
        Showing {statistics.total} products (Avg: ${statistics.averagePrice.toFixed(2)})
      </Text>
      <FlatList
        data={processedProducts}
        renderItem={({ item }) => (
          <View style={styles.productItem}>
            <Text>{item.name}</Text>
            <Text>${item.price}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default ProductList;
```

## useCallback Hook Explained

The `useCallback` hook memoizes a function definition, ensuring the same function reference is maintained across renders unless dependencies change.

### Syntax and Basic Usage

```typescript
const memoizedCallback = useCallback<CallbackType>(
  (args) => {
    // function body
  },
  [dependency1, dependency2]
);
```

### Why Function References Matter

In JavaScript, functions are objects. Two functions with identical code are not equal:

```typescript
const fn1 = () => console.log('hello');
const fn2 = () => console.log('hello');

console.log(fn1 === fn2); // false
```

This means when you define a function inside a component, a new function is created every render, causing child components that receive it as a prop to re-render.

### Practical Example: Preventing Child Re-Renders

```typescript
import React, { useState, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  label: string;
}

// Memoized child component
const MemoizedButton = memo<ButtonProps>(({ onPress, label }) => {
  console.log(`Button "${label}" rendered`);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
});

interface CounterState {
  count: number;
  step: number;
}

const CounterWithCallbacks: React.FC = () => {
  const [state, setState] = useState<CounterState>({ count: 0, step: 1 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Without useCallback, this creates a new function every render
  // causing MemoizedButton to re-render even when only theme changes
  const increment = useCallback((): void => {
    setState(prev => ({ ...prev, count: prev.count + prev.step }));
  }, []); // Empty deps because we use functional update

  const decrement = useCallback((): void => {
    setState(prev => ({ ...prev, count: prev.count - prev.step }));
  }, []);

  const reset = useCallback((): void => {
    setState(prev => ({ ...prev, count: 0 }));
  }, []);

  const updateStep = useCallback((newStep: number): void => {
    setState(prev => ({ ...prev, step: newStep }));
  }, []);

  const toggleTheme = (): void => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  console.log('Parent rendered');

  return (
    <View style={[styles.container, theme === 'dark' && styles.darkContainer]}>
      <Text style={styles.count}>Count: {state.count}</Text>
      <Text style={styles.step}>Step: {state.step}</Text>

      <View style={styles.buttonRow}>
        <MemoizedButton onPress={decrement} label="Decrement" />
        <MemoizedButton onPress={increment} label="Increment" />
      </View>

      <MemoizedButton onPress={reset} label="Reset" />

      <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
        <Text>Toggle Theme (causes parent re-render)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#333',
  },
  count: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  step: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  themeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default CounterWithCallbacks;
```

## Dependency Arrays Best Practices

The dependency array is crucial for both `useMemo` and `useCallback`. Getting it wrong can lead to stale data or infinite loops.

### Rule 1: Include All Referenced Values

```typescript
// BAD: Missing dependency
const [count, setCount] = useState(0);
const [multiplier, setMultiplier] = useState(2);

const calculate = useCallback(() => {
  return count * multiplier; // Uses multiplier but it's not in deps
}, [count]); // Bug: multiplier is missing

// GOOD: All dependencies included
const calculate = useCallback(() => {
  return count * multiplier;
}, [count, multiplier]);
```

### Rule 2: Use Functional Updates to Reduce Dependencies

```typescript
// SUBOPTIMAL: Requires count in dependencies
const increment = useCallback(() => {
  setCount(count + 1);
}, [count]); // Changes whenever count changes

// BETTER: No dependencies needed
const increment = useCallback(() => {
  setCount(prevCount => prevCount + 1);
}, []); // Stable reference
```

### Rule 3: Extract Stable Values with useRef

```typescript
import { useRef, useCallback, useEffect } from 'react';

interface UseDebounceOptions {
  delay: number;
  callback: (value: string) => void;
}

const useDebounce = ({ delay, callback }: UseDebounceOptions) => {
  // Store callback in ref to avoid dependency issues
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      callbackRef.current(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay]); // Only depends on delay, not callback

  return debouncedFn;
};
```

### Rule 4: Avoid Object and Array Literals in Dependencies

```typescript
// BAD: Object literal creates new reference every render
const config = { threshold: 10, enabled: true };
const result = useMemo(() => processData(data, config), [data, config]);
// config is always "new", so this recalculates every render

// GOOD: Move object outside component or memoize it
const CONFIG = { threshold: 10, enabled: true }; // Outside component

const MyComponent: React.FC<{ data: Data[] }> = ({ data }) => {
  const result = useMemo(() => processData(data, CONFIG), [data]);
  // ...
};

// OR memoize the config
const MyComponent: React.FC<{ threshold: number }> = ({ threshold }) => {
  const config = useMemo(
    () => ({ threshold, enabled: true }),
    [threshold]
  );

  const result = useMemo(
    () => processData(data, config),
    [data, config]
  );
};
```

## Memoizing Expensive Calculations

Identifying what qualifies as "expensive" is key to effective optimization.

### What Counts as Expensive?

1. **Complex data transformations**
2. **Large array operations (filter, map, sort, reduce)**
3. **Deep object comparisons**
4. **Regular expression operations on large strings**
5. **Mathematical computations**

### Real-World Example: Analytics Dashboard

```typescript
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  merchant: string;
  type: 'credit' | 'debit';
}

interface DateRange {
  start: Date;
  end: Date;
}

interface AnalyticsProps {
  transactions: Transaction[];
  dateRange: DateRange;
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  average: number;
  percentage: number;
}

interface DailyTotal {
  date: string;
  credits: number;
  debits: number;
  net: number;
}

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({
  transactions,
  dateRange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter transactions by date range
  const filteredTransactions = useMemo<Transaction[]>(() => {
    console.log('Filtering transactions by date...');
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Calculate category summaries
  const categorySummaries = useMemo<CategorySummary[]>(() => {
    console.log('Calculating category summaries...');

    const categoryMap = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    filteredTransactions.forEach(tx => {
      const existing = categoryMap.get(tx.category) || { total: 0, count: 0 };
      categoryMap.set(tx.category, {
        total: existing.total + Math.abs(tx.amount),
        count: existing.count + 1,
      });
      grandTotal += Math.abs(tx.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Calculate daily totals for chart
  const dailyTotals = useMemo<DailyTotal[]>(() => {
    console.log('Calculating daily totals...');

    const dailyMap = new Map<string, { credits: number; debits: number }>();

    filteredTransactions.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      const existing = dailyMap.get(dateKey) || { credits: 0, debits: 0 };

      if (tx.type === 'credit') {
        existing.credits += tx.amount;
      } else {
        existing.debits += Math.abs(tx.amount);
      }

      dailyMap.set(dateKey, existing);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        credits: data.credits,
        debits: data.debits,
        net: data.credits - data.debits,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    console.log('Calculating overall stats...');

    const totalCredits = filteredTransactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalDebits = filteredTransactions
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const uniqueMerchants = new Set(
      filteredTransactions.map(tx => tx.merchant)
    ).size;

    return {
      totalTransactions: filteredTransactions.length,
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      uniqueMerchants,
      averageTransaction: filteredTransactions.length > 0
        ? (totalCredits + totalDebits) / filteredTransactions.length
        : 0,
    };
  }, [filteredTransactions]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsCard}>
        <Text style={styles.statTitle}>Overview</Text>
        <Text>Total Transactions: {overallStats.totalTransactions}</Text>
        <Text>Net Flow: ${overallStats.netFlow.toFixed(2)}</Text>
        <Text>Unique Merchants: {overallStats.uniqueMerchants}</Text>
      </View>

      <View style={styles.categoriesCard}>
        <Text style={styles.statTitle}>By Category</Text>
        {categorySummaries.map(summary => (
          <View key={summary.category} style={styles.categoryRow}>
            <Text>{summary.category}</Text>
            <Text>${summary.total.toFixed(2)} ({summary.percentage.toFixed(1)}%)</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriesCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default AnalyticsDashboard;
```

## Preventing Child Component Re-Renders

Combining `useCallback` with `React.memo` is the standard pattern for preventing unnecessary child re-renders.

### The Complete Pattern

```typescript
import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

// Types
interface ListItem {
  id: string;
  title: string;
  description: string;
  isSelected: boolean;
}

interface ItemRowProps {
  item: ListItem;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// Memoized row component
const ItemRow = memo<ItemRowProps>(({ item, onSelect, onDelete }) => {
  console.log(`ItemRow ${item.id} rendered`);

  return (
    <View style={[styles.row, item.isSelected && styles.selectedRow]}>
      <TouchableOpacity
        style={styles.rowContent}
        onPress={() => onSelect(item.id)}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
});

// Custom comparison function for deeper control
const areItemsEqual = (
  prevProps: ItemRowProps,
  nextProps: ItemRowProps
): boolean => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.description === nextProps.item.description &&
    prevProps.item.isSelected === nextProps.item.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDelete === nextProps.onDelete
  );
};

const ItemRowWithCustomComparison = memo<ItemRowProps>(
  ({ item, onSelect, onDelete }) => {
    // Same implementation as above
    return (
      <View style={[styles.row, item.isSelected && styles.selectedRow]}>
        <TouchableOpacity
          style={styles.rowContent}
          onPress={() => onSelect(item.id)}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  },
  areItemsEqual
);

// Parent component
const OptimizedList: React.FC = () => {
  const [items, setItems] = useState<ListItem[]>([
    { id: '1', title: 'Item 1', description: 'Description 1', isSelected: false },
    { id: '2', title: 'Item 2', description: 'Description 2', isSelected: false },
    { id: '3', title: 'Item 3', description: 'Description 3', isSelected: false },
  ]);
  const [filter, setFilter] = useState<string>('');

  // Stable callback references
  const handleSelect = useCallback((id: string): void => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  }, []);

  const handleDelete = useCallback((id: string): void => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  // Memoized filtered list
  const filteredItems = useMemo(() => {
    if (!filter) return items;
    const lowerFilter = filter.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(lowerFilter) ||
        item.description.toLowerCase().includes(lowerFilter)
    );
  }, [items, filter]);

  // Memoized render function for FlatList
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <ItemRow
        item={item}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    ),
    [handleSelect, handleDelete]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={items} // Ensure re-render when items change
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  selectedRow: {
    backgroundColor: '#e3f2fd',
  },
  rowContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteText: {
    color: '#ff3b30',
  },
});

export default OptimizedList;
```

## Common Mistakes to Avoid

### Mistake 1: Over-Memoization

```typescript
// BAD: Memoizing simple values
const SimpleComponent: React.FC<{ name: string }> = ({ name }) => {
  // Unnecessary - string concatenation is trivial
  const greeting = useMemo(() => `Hello, ${name}!`, [name]);

  // Unnecessary - simple arithmetic
  const doubled = useMemo(() => 2 * 2, []);

  return <Text>{greeting}</Text>;
};

// GOOD: Just compute directly
const SimpleComponent: React.FC<{ name: string }> = ({ name }) => {
  const greeting = `Hello, ${name}!`;
  const doubled = 2 * 2;

  return <Text>{greeting}</Text>;
};
```

### Mistake 2: Missing Dependencies

```typescript
// BAD: Stale closure
const BuggyComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  const addItem = useCallback(() => {
    // Bug: count is captured at creation time
    setItems(prev => [...prev, `Item ${count}`]);
  }, []); // Missing count dependency!

  return (
    <View>
      <Text>Count: {count}</Text>
      <TouchableOpacity onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={addItem}>
        <Text>Add Item (will always use initial count)</Text>
      </TouchableOpacity>
    </View>
  );
};

// GOOD: Include all dependencies or use refs
const FixedComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, `Item ${countRef.current}`]);
  }, []); // Now stable but always has current count

  return (
    <View>
      <Text>Count: {count}</Text>
      <TouchableOpacity onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={addItem}>
        <Text>Add Item</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Mistake 3: Forgetting React.memo

```typescript
// BAD: useCallback without memo is often useless
const Parent: React.FC = () => {
  const [count, setCount] = useState(0);

  // This is memoized...
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <View>
      <Text>{count}</Text>
      {/* But ChildComponent is not memoized, so it re-renders anyway! */}
      <ChildComponent onClick={handleClick} />
    </View>
  );
};

const ChildComponent: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  console.log('Child rendered'); // Still logs on every parent render
  return <TouchableOpacity onPress={onClick}><Text>Click</Text></TouchableOpacity>;
};

// GOOD: Combine useCallback with memo
const MemoizedChild = memo<{ onClick: () => void }>(({ onClick }) => {
  console.log('Child rendered'); // Only logs when onClick changes
  return <TouchableOpacity onPress={onClick}><Text>Click</Text></TouchableOpacity>;
});
```

### Mistake 4: Inline Objects/Arrays in Props

```typescript
// BAD: New object reference every render breaks memo
const BadParent: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <MemoizedChild
      // New object every render!
      style={{ padding: 10, margin: 5 }}
      // New array every render!
      options={['a', 'b', 'c']}
    />
  );
};

// GOOD: Memoize or extract constants
const CHILD_STYLE = { padding: 10, margin: 5 };
const OPTIONS = ['a', 'b', 'c'];

const GoodParent: React.FC = () => {
  const [count, setCount] = useState(0);

  // Or memoize dynamic values
  const dynamicStyle = useMemo(
    () => ({ padding: 10, margin: count > 5 ? 10 : 5 }),
    [count]
  );

  return (
    <MemoizedChild
      style={CHILD_STYLE}
      options={OPTIONS}
    />
  );
};
```

## Profiling to Identify Issues

Before optimizing, you need to identify what needs optimization. React Native provides several tools for this.

### Using React DevTools Profiler

```typescript
import React, { Profiler, ProfilerOnRenderCallback } from 'react';

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
    startTime,
    commitTime,
  });
};

const ProfiledComponent: React.FC = () => {
  return (
    <Profiler id="MyComponent" onRender={onRenderCallback}>
      <MyExpensiveComponent />
    </Profiler>
  );
};
```

### Custom Performance Hooks

```typescript
import { useRef, useEffect, useCallback } from 'react';

interface RenderInfo {
  count: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

const useRenderCount = (componentName: string): void => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    renderCount.current += 1;

    if (__DEV__) {
      console.log(
        `[${componentName}] Render #${renderCount.current} took ${(endTime - startTime.current).toFixed(2)}ms`
      );
    }

    startTime.current = performance.now();
  });
};

const useWhyDidYouUpdate = <T extends Record<string, unknown>>(
  componentName: string,
  props: T
): void => {
  const previousProps = useRef<T | undefined>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0 && __DEV__) {
        console.log(`[${componentName}] Changed props:`, changedProps);
      }
    }

    previousProps.current = props;
  });
};

// Usage
const MyComponent: React.FC<MyProps> = (props) => {
  useRenderCount('MyComponent');
  useWhyDidYouUpdate('MyComponent', props);

  // ... component logic
};
```

### Measuring Computation Time

```typescript
const useMeasuredMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  label: string
): T => {
  return useMemo(() => {
    const start = performance.now();
    const result = factory();
    const end = performance.now();

    if (__DEV__) {
      console.log(`[${label}] Computation took ${(end - start).toFixed(2)}ms`);
    }

    return result;
  }, deps);
};

// Usage
const processedData = useMeasuredMemo(
  () => expensiveProcessing(rawData),
  [rawData],
  'DataProcessing'
);
```

## When NOT to Use These Hooks

Memoization has costs. Using these hooks inappropriately can actually hurt performance.

### The Costs of Memoization

1. **Memory overhead:** Memoized values and functions are stored
2. **Comparison overhead:** Dependencies must be compared on every render
3. **Code complexity:** More hooks mean more complex code

### Guidelines for When to Skip Memoization

```typescript
// 1. DON'T memoize simple primitive calculations
const BadExample: React.FC<{ price: number; quantity: number }> = ({
  price,
  quantity,
}) => {
  // Unnecessary - multiplication is trivial
  const total = useMemo(() => price * quantity, [price, quantity]);

  // Just do this instead
  const total2 = price * quantity;

  return <Text>Total: ${total2}</Text>;
};

// 2. DON'T memoize when the component always re-renders anyway
const AlwaysReRendersComponent: React.FC<{ data: Data }> = ({ data }) => {
  // If data changes on every render (e.g., from an API response),
  // memoization provides no benefit
  const processed = useMemo(() => process(data), [data]);

  return <DataDisplay data={processed} />;
};

// 3. DON'T use useCallback for functions not passed to children
const NoChildrenExample: React.FC = () => {
  const [value, setValue] = useState('');

  // Unnecessary - this function isn't passed anywhere
  const handleChange = useCallback((text: string) => {
    setValue(text);
  }, []);

  // Just define it normally
  const handleChange2 = (text: string): void => {
    setValue(text);
  };

  return <TextInput onChangeText={handleChange2} value={value} />;
};

// 4. DON'T memoize when children aren't memoized
const ParentWithUnmemoizedChild: React.FC = () => {
  const [count, setCount] = useState(0);

  // Pointless - Child isn't wrapped in memo
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  // Child will re-render anyway because it's not memoized
  return <UnmemoizedChild onClick={handleClick} />;
};
```

### When Memoization IS Worth It

```typescript
// 1. Expensive calculations that don't need to run every render
const ExpensiveCalculation: React.FC<{ items: Item[] }> = ({ items }) => {
  const stats = useMemo(() => {
    // Complex statistical calculations
    return calculateStatistics(items); // Takes 50-100ms
  }, [items]);

  return <StatsDisplay stats={stats} />;
};

// 2. Preventing re-renders of expensive child trees
const ParentWithExpensiveChildren: React.FC = () => {
  const [unrelatedState, setUnrelatedState] = useState(0);

  const handleAction = useCallback(() => {
    // Some action
  }, []);

  return (
    <View>
      <Text>{unrelatedState}</Text>
      {/* ExpensiveTree is memoized and won't re-render when
          unrelatedState changes */}
      <MemoizedExpensiveTree onAction={handleAction} />
    </View>
  );
};

// 3. Referential equality for hooks dependencies
const HookDependencyExample: React.FC<{ userId: string }> = ({ userId }) => {
  // Memoize to maintain referential equality
  const fetchOptions = useMemo(
    () => ({ userId, includeMetadata: true }),
    [userId]
  );

  // Without useMemo, useEffect would run on every render
  useEffect(() => {
    fetchUserData(fetchOptions);
  }, [fetchOptions]);

  return <UserDisplay />;
};
```

## Real-World Optimization Examples

### Example 1: Optimized Chat Application

```typescript
import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface User {
  id: string;
  name: string;
  avatar: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onRetry: (messageId: string) => void;
  onLongPress: (messageId: string) => void;
}

const MessageBubble = memo<MessageBubbleProps>(
  ({ message, isOwnMessage, onRetry, onLongPress }) => {
    console.log(`MessageBubble ${message.id} rendered`);

    const formattedTime = useMemo(() => {
      return new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [message.timestamp]);

    return (
      <TouchableOpacity
        onLongPress={() => onLongPress(message.id)}
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timeText}>{formattedTime}</Text>
          {isOwnMessage && (
            <Text style={styles.statusText}>{message.status}</Text>
          )}
        </View>
        {message.status === 'sending' && (
          <TouchableOpacity onPress={() => onRetry(message.id)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.isOwnMessage === nextProps.isOwnMessage &&
      prevProps.onRetry === nextProps.onRetry &&
      prevProps.onLongPress === nextProps.onLongPress
    );
  }
);

interface ChatScreenProps {
  currentUserId: string;
  otherUser: User;
  initialMessages: Message[];
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUserId,
  otherUser,
  initialMessages,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Memoized callbacks for child components
  const handleRetry = useCallback((messageId: string): void => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: 'sending' as const } : msg
      )
    );
    // Retry send logic...
  }, []);

  const handleLongPress = useCallback((messageId: string): void => {
    // Show message options modal
    console.log('Long pressed:', messageId);
  }, []);

  const handleSend = useCallback((): void => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: currentUserId,
      timestamp: Date.now(),
      status: 'sending',
    };

    setMessages(prev => [newMessage, ...prev]);
    setInputText('');

    // Send message logic...
  }, [inputText, currentUserId]);

  // Memoized render function
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isOwnMessage={item.senderId === currentUserId}
        onRetry={handleRetry}
        onLongPress={handleLongPress}
      />
    ),
    [currentUserId, handleRetry, handleLongPress]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Memoized message count for header
  const messageStats = useMemo(() => {
    const sent = messages.filter(m => m.senderId === currentUserId).length;
    const received = messages.length - sent;
    return { sent, received, total: messages.length };
  }, [messages, currentUserId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{otherUser.name}</Text>
        <Text style={styles.headerSubtitle}>
          {messageStats.total} messages
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
      />

      {isTyping && (
        <Text style={styles.typingIndicator}>{otherUser.name} is typing...</Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#999',
  },
  statusText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
  retryText: {
    color: '#ff3b30',
    fontSize: 12,
  },
  typingIndicator: {
    padding: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatScreen;
```

### Example 2: Optimized Data Grid

```typescript
import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Column<T> {
  key: keyof T;
  title: string;
  width: number;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataGridProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowPress?: (row: T) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
}

interface HeaderCellProps {
  title: string;
  width: number;
  sortable: boolean;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
}

const HeaderCell = memo<HeaderCellProps>(
  ({ title, width, sortable, sortDirection, onSort }) => {
    console.log(`HeaderCell "${title}" rendered`);

    return (
      <TouchableOpacity
        style={[styles.headerCell, { width }]}
        onPress={sortable ? onSort : undefined}
        disabled={!sortable}
      >
        <Text style={styles.headerText}>{title}</Text>
        {sortable && sortDirection && (
          <Text style={styles.sortIndicator}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
);

interface DataRowProps<T> {
  row: T;
  columns: Column<T>[];
  onPress?: () => void;
  isEven: boolean;
}

function DataRowComponent<T extends { id: string }>({
  row,
  columns,
  onPress,
  isEven,
}: DataRowProps<T>): React.ReactElement {
  console.log(`DataRow ${row.id} rendered`);

  return (
    <TouchableOpacity
      style={[styles.dataRow, isEven && styles.evenRow]}
      onPress={onPress}
    >
      {columns.map(column => (
        <View key={String(column.key)} style={[styles.dataCell, { width: column.width }]}>
          {column.render ? (
            column.render(row[column.key], row)
          ) : (
            <Text style={styles.cellText} numberOfLines={1}>
              {String(row[column.key])}
            </Text>
          )}
        </View>
      ))}
    </TouchableOpacity>
  );
}

const MemoizedDataRow = memo(DataRowComponent, (prevProps, nextProps) => {
  if (prevProps.row !== nextProps.row) return false;
  if (prevProps.isEven !== nextProps.isEven) return false;
  if (prevProps.onPress !== nextProps.onPress) return false;
  if (prevProps.columns.length !== nextProps.columns.length) return false;
  return true;
}) as typeof DataRowComponent;

function DataGrid<T extends { id: string }>({
  data,
  columns,
  onRowPress,
  onSort,
}: DataGridProps<T>): React.ReactElement {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Memoize sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Create stable sort handlers for each column
  const handleSort = useCallback(
    (key: keyof T) => {
      setSortConfig(prev => {
        const newDirection =
          prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
        onSort?.(key, newDirection);
        return { key, direction: newDirection };
      });
    },
    [onSort]
  );

  // Memoize row press handlers
  const rowPressHandlers = useMemo(() => {
    if (!onRowPress) return {};
    return sortedData.reduce((acc, row) => {
      acc[row.id] = () => onRowPress(row);
      return acc;
    }, {} as Record<string, () => void>);
  }, [sortedData, onRowPress]);

  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(
    () => columns.reduce((sum, col) => sum + col.width, 0),
    [columns]
  );

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalWidth }}>
          {/* Header */}
          <View style={styles.headerRow}>
            {columns.map(column => (
              <HeaderCell
                key={String(column.key)}
                title={column.title}
                width={column.width}
                sortable={column.sortable ?? false}
                sortDirection={
                  sortConfig?.key === column.key ? sortConfig.direction : null
                }
                onSort={() => handleSort(column.key)}
              />
            ))}
          </View>

          {/* Data Rows */}
          {sortedData.map((row, index) => (
            <MemoizedDataRow
              key={row.id}
              row={row}
              columns={columns}
              onPress={rowPressHandlers[row.id]}
              isEven={index % 2 === 0}
            />
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  sortIndicator: {
    marginLeft: 4,
    fontSize: 12,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  dataCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
  },
});

export default DataGrid;
```

## Performance Measurement Techniques

### Creating a Performance Testing Utility

```typescript
import { useRef, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  logThreshold?: number; // Only log if render takes longer than this (ms)
}

export const usePerformanceMonitor = ({
  componentName,
  enabled = __DEV__,
  logThreshold = 0,
}: UsePerformanceMonitorOptions): PerformanceMetrics => {
  const metrics = useRef<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0,
  });

  const renderStartTime = useRef<number>(performance.now());

  // Mark render start
  renderStartTime.current = performance.now();

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;

    const m = metrics.current;
    m.renderCount += 1;
    m.totalRenderTime += renderDuration;
    m.averageRenderTime = m.totalRenderTime / m.renderCount;
    m.maxRenderTime = Math.max(m.maxRenderTime, renderDuration);
    m.minRenderTime = Math.min(m.minRenderTime, renderDuration);

    if (renderDuration >= logThreshold) {
      console.log(`[Performance] ${componentName}:`, {
        renderNumber: m.renderCount,
        duration: `${renderDuration.toFixed(2)}ms`,
        average: `${m.averageRenderTime.toFixed(2)}ms`,
        max: `${m.maxRenderTime.toFixed(2)}ms`,
      });
    }
  });

  return metrics.current;
};

// Hook to detect unnecessary re-renders
export const useRenderOptimizationCheck = <T extends Record<string, unknown>>(
  componentName: string,
  props: T,
  state: Record<string, unknown> = {}
): void => {
  const prevProps = useRef<T>();
  const prevState = useRef<Record<string, unknown>>();

  useEffect(() => {
    if (!__DEV__) return;

    const changedProps: string[] = [];
    const changedState: string[] = [];

    // Check props changes
    if (prevProps.current) {
      Object.keys(props).forEach(key => {
        if (prevProps.current![key] !== props[key]) {
          changedProps.push(key);
        }
      });
    }

    // Check state changes
    if (prevState.current) {
      Object.keys(state).forEach(key => {
        if (prevState.current![key] !== state[key]) {
          changedState.push(key);
        }
      });
    }

    // Log if render happened without changes (potential optimization opportunity)
    if (
      prevProps.current &&
      changedProps.length === 0 &&
      changedState.length === 0
    ) {
      console.warn(
        `[Optimization] ${componentName} re-rendered without prop/state changes. ` +
        `Consider wrapping with React.memo or checking parent component.`
      );
    } else if (changedProps.length > 0 || changedState.length > 0) {
      console.log(`[Render] ${componentName}:`, {
        changedProps,
        changedState,
      });
    }

    prevProps.current = props;
    prevState.current = state;
  });
};
```

### Using the Performance Utilities

```typescript
import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePerformanceMonitor, useRenderOptimizationCheck } from './performanceUtils';

interface ExpensiveListProps {
  items: Item[];
  onItemSelect: (id: string) => void;
}

const ExpensiveList: React.FC<ExpensiveListProps> = ({ items, onItemSelect }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Monitor performance
  usePerformanceMonitor({
    componentName: 'ExpensiveList',
    logThreshold: 5, // Only log renders taking > 5ms
  });

  // Check for unnecessary re-renders
  useRenderOptimizationCheck(
    'ExpensiveList',
    { items, onItemSelect },
    { selectedId }
  );

  // Expensive computation
  const processedItems = useMemo(() => {
    console.time('processItems');
    const result = items
      .filter(item => item.isActive)
      .map(item => ({
        ...item,
        displayName: `${item.firstName} ${item.lastName}`.trim(),
        score: calculateComplexScore(item),
      }))
      .sort((a, b) => b.score - a.score);
    console.timeEnd('processItems');
    return result;
  }, [items]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    onItemSelect(id);
  }, [onItemSelect]);

  return (
    <View>
      {processedItems.map(item => (
        <TouchableOpacity
          key={item.id}
          onPress={() => handleSelect(item.id)}
          style={[
            styles.item,
            selectedId === item.id && styles.selectedItem,
          ]}
        >
          <Text>{item.displayName}</Text>
          <Text>Score: {item.score}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default memo(ExpensiveList);
```

## Conclusion

Optimizing React Native re-renders with `useMemo` and `useCallback` is a powerful technique, but it requires understanding when and how to apply it effectively. Here are the key takeaways:

1. **Understand the problem first:** Use profiling tools to identify actual performance bottlenecks before optimizing.

2. **Use `useMemo` for expensive calculations:** Memoize computations that involve filtering, sorting, or transforming large datasets.

3. **Use `useCallback` with `React.memo`:** These work together to prevent unnecessary re-renders of child components.

4. **Get dependency arrays right:** Include all referenced values, use functional updates to reduce dependencies, and avoid inline objects/arrays.

5. **Don't over-optimize:** Memoization has costs. Only apply it where there's a measurable benefit.

6. **Profile your changes:** Always measure the impact of your optimizations to ensure they're actually helping.

7. **Consider the full picture:** Sometimes restructuring your component hierarchy or state management is more effective than adding memoization.

By following these principles and patterns, you can build React Native applications that remain smooth and responsive, even as they grow in complexity. Remember that performance optimization is an iterative process - profile, optimize, measure, and repeat.

## Further Reading

- [React Documentation on useMemo](https://react.dev/reference/react/useMemo)
- [React Documentation on useCallback](https://react.dev/reference/react/useCallback)
- [React Native Performance Overview](https://reactnative.dev/docs/performance)
- [Why Did You Render Library](https://github.com/welldone-software/why-did-you-render)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
