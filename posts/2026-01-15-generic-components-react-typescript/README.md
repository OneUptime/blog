# How to Implement Generic Components in React with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, TypeScript, Generics, Components, Type Safety, Reusability

Description: Learn how to build flexible, type-safe React components using TypeScript generics, from basic patterns to advanced constraints that maximize code reuse while preserving full type inference.

---

Generic components are one of the most powerful patterns in React with TypeScript. They allow you to create reusable components that work with any data type while maintaining complete type safety. Instead of writing separate components for lists of users, products, and orders, you write one generic list component that handles them all with full IntelliSense support.

## Why Generic Components Matter

Consider a simple dropdown component. Without generics, you either lose type safety or duplicate code:

```tsx
// BAD: Loses type information - item is 'any'
interface DropdownProps {
  items: any[];
  onSelect: (item: any) => void;
}

// BAD: Duplicates code for every type
interface UserDropdownProps {
  items: User[];
  onSelect: (item: User) => void;
}

interface ProductDropdownProps {
  items: Product[];
  onSelect: (item: Product) => void;
}
```

With generics, you write the component once and get full type safety for any data type:

```tsx
// GOOD: Single component, full type safety
interface DropdownProps<T> {
  items: T[];
  onSelect: (item: T) => void;
}
```

## Basic Generic Component Pattern

### Function Component Syntax

The most common pattern defines the generic type parameter on the function itself. TypeScript infers the type from the props you pass.

```tsx
// Define props with a generic type parameter T
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

// Generic function component - T is inferred from usage
function List<T>(props: ListProps<T>): React.ReactElement {
  const { items, renderItem, keyExtractor } = props;

  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage - TypeScript infers T as User
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

function App() {
  return (
    <List
      items={users}
      renderItem={(user) => <span>{user.name}</span>}  // user is typed as User
      keyExtractor={(user) => user.id}  // user is typed as User
    />
  );
}
```

### Arrow Function Syntax

Arrow functions require slightly different syntax for generics. The trailing comma prevents the parser from confusing `<T>` with JSX.

```tsx
// Arrow function with generic - note the trailing comma in <T,>
const List = <T,>(props: ListProps<T>): React.ReactElement => {
  const { items, renderItem, keyExtractor } = props;

  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
};

// Alternative: extend unknown to avoid JSX ambiguity
const List = <T extends unknown>(props: ListProps<T>): React.ReactElement => {
  // ...
};
```

## Adding Type Constraints

Unconstrained generics accept any type, but often your component needs specific properties to exist. Constraints ensure the generic type has required shape.

### Basic Constraints with extends

```tsx
// Constraint: T must have an 'id' property
interface WithId {
  id: string | number;
}

interface SelectableListProps<T extends WithId> {
  items: T[];
  selectedId: T['id'];  // Uses T's id type
  onSelect: (item: T) => void;
}

function SelectableList<T extends WithId>(
  props: SelectableListProps<T>
): React.ReactElement {
  const { items, selectedId, onSelect } = props;

  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.id}  // Safe - T extends WithId guarantees 'id' exists
          className={item.id === selectedId ? 'selected' : ''}
          onClick={() => onSelect(item)}
        >
          {/* Type error: item.name doesn't exist on WithId */}
          {/* We need a render function for item-specific content */}
        </li>
      ))}
    </ul>
  );
}
```

### Multiple Property Constraints

```tsx
// T must have both id and name properties
interface Identifiable {
  id: string | number;
  name: string;
}

interface SearchableListProps<T extends Identifiable> {
  items: T[];
  searchTerm: string;
  onSelect: (item: T) => void;
}

function SearchableList<T extends Identifiable>(
  props: SearchableListProps<T>
): React.ReactElement {
  const { items, searchTerm, onSelect } = props;

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ul>
      {filteredItems.map((item) => (
        <li key={item.id} onClick={() => onSelect(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// Works with any type that has id and name
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'premium';
}

// Both work because they satisfy the Identifiable constraint
<SearchableList items={products} searchTerm="laptop" onSelect={handleProduct} />
<SearchableList items={customers} searchTerm="john" onSelect={handleCustomer} />
```

## Generic Select/Dropdown Component

A practical example that combines several patterns: type inference, constraints, and value extraction.

```tsx
interface SelectOption {
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends SelectOption> {
  options: T[];
  value: T | null;
  onChange: (option: T) => void;
  placeholder?: string;
  getOptionValue?: (option: T) => string;
  isOptionDisabled?: (option: T) => boolean;
}

function Select<T extends SelectOption>(
  props: SelectProps<T>
): React.ReactElement {
  const {
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    getOptionValue = (opt) => opt.label,
    isOptionDisabled = (opt) => opt.disabled ?? false,
  } = props;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    const selectedOption = options.find(
      (opt) => getOptionValue(opt) === selectedValue
    );
    if (selectedOption && !isOptionDisabled(selectedOption)) {
      onChange(selectedOption);
    }
  };

  return (
    <select
      value={value ? getOptionValue(value) : ''}
      onChange={handleChange}
      className="select"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option
          key={getOptionValue(option)}
          value={getOptionValue(option)}
          disabled={isOptionDisabled(option)}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Usage with custom option type
interface CountryOption extends SelectOption {
  code: string;
  population: number;
}

const countries: CountryOption[] = [
  { label: 'United States', code: 'US', population: 331000000 },
  { label: 'Canada', code: 'CA', population: 38000000 },
  { label: 'Mexico', code: 'MX', population: 128000000 },
];

function CountrySelector() {
  const [country, setCountry] = useState<CountryOption | null>(null);

  return (
    <Select
      options={countries}
      value={country}
      onChange={(selected) => {
        // selected is fully typed as CountryOption
        console.log(`Selected: ${selected.code}, Pop: ${selected.population}`);
        setCountry(selected);
      }}
      getOptionValue={(opt) => opt.code}
      placeholder="Choose a country"
    />
  );
}
```

## Generic Table Component

Tables are a common use case for generics. This pattern provides type-safe column definitions with accessor functions.

```tsx
// Column definition with generic row type
interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

function Table<T>(props: TableProps<T>): React.ReactElement {
  const {
    data,
    columns,
    keyExtractor,
    onRowClick,
    emptyMessage = 'No data available',
  } = props;

  if (data.length === 0) {
    return <div className="table-empty">{emptyMessage}</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{ width: column.width }}
              className={column.sortable ? 'sortable' : ''}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'clickable' : ''}
          >
            {columns.map((column) => (
              <td key={column.key}>{column.accessor(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
interface Order {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: Date;
}

const orderColumns: Column<Order>[] = [
  {
    key: 'id',
    header: 'Order ID',
    accessor: (order) => order.id,
    width: 120,
  },
  {
    key: 'customer',
    header: 'Customer',
    accessor: (order) => order.customer,
    sortable: true,
  },
  {
    key: 'total',
    header: 'Total',
    accessor: (order) => `$${order.total.toFixed(2)}`,
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: (order) => (
      <span className={`status-badge status-${order.status}`}>
        {order.status}
      </span>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    accessor: (order) => order.createdAt.toLocaleDateString(),
    sortable: true,
  },
];

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  return (
    <Table
      data={orders}
      columns={orderColumns}
      keyExtractor={(order) => order.id}
      onRowClick={(order) => {
        // order is fully typed as Order
        console.log(`Clicked order: ${order.id}, status: ${order.status}`);
      }}
      emptyMessage="No orders found"
    />
  );
}
```

## Generic Form Field Component

Forms benefit greatly from generics. This pattern ensures the field value type matches the form state type.

```tsx
interface FormFieldProps<T, K extends keyof T> {
  name: K;
  label: string;
  value: T[K];
  onChange: (name: K, value: T[K]) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  required?: boolean;
  error?: string;
}

function FormField<T, K extends keyof T>(
  props: FormFieldProps<T, K>
): React.ReactElement {
  const {
    name,
    label,
    value,
    onChange,
    type = 'text',
    required = false,
    error,
  } = props;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number'
      ? (Number(event.target.value) as T[K])
      : (event.target.value as T[K]);
    onChange(name, newValue);
  };

  return (
    <div className="form-field">
      <label htmlFor={String(name)}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        id={String(name)}
        name={String(name)}
        type={type}
        value={String(value)}
        onChange={handleChange}
        required={required}
        className={error ? 'error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

// Usage
interface UserFormData {
  username: string;
  email: string;
  age: number;
  password: string;
}

function UserForm() {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    age: 0,
    password: '',
  });

  const handleFieldChange = <K extends keyof UserFormData>(
    name: K,
    value: UserFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form>
      <FormField
        name="username"
        label="Username"
        value={formData.username}
        onChange={handleFieldChange}
        required
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleFieldChange}
        required
      />
      <FormField
        name="age"
        label="Age"
        type="number"
        value={formData.age}
        onChange={handleFieldChange}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleFieldChange}
        required
      />
    </form>
  );
}
```

## Generic Modal Component

Modals often need to pass data of various types. Generics keep the data flow type-safe.

```tsx
interface ModalProps<T> {
  isOpen: boolean;
  title: string;
  data: T | null;
  onClose: () => void;
  onConfirm: (data: T) => void;
  renderContent: (data: T) => React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

function Modal<T>(props: ModalProps<T>): React.ReactElement | null {
  const {
    isOpen,
    title,
    data,
    onClose,
    onConfirm,
    renderContent,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
  } = props;

  if (!isOpen || data === null) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(data);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            X
          </button>
        </div>
        <div className="modal-body">{renderContent(data)}</div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Usage
interface DeleteConfirmation {
  itemId: string;
  itemName: string;
  itemType: 'user' | 'product' | 'order';
}

function ItemManager() {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    data: DeleteConfirmation | null;
  }>({ isOpen: false, data: null });

  const handleDelete = (confirmation: DeleteConfirmation) => {
    // confirmation is fully typed
    console.log(`Deleting ${confirmation.itemType}: ${confirmation.itemId}`);
    // Perform delete operation
  };

  return (
    <>
      <button
        onClick={() =>
          setDeleteModal({
            isOpen: true,
            data: { itemId: '123', itemName: 'Widget', itemType: 'product' },
          })
        }
      >
        Delete Item
      </button>

      <Modal
        isOpen={deleteModal.isOpen}
        title="Confirm Deletion"
        data={deleteModal.data}
        onClose={() => setDeleteModal({ isOpen: false, data: null })}
        onConfirm={handleDelete}
        renderContent={(data) => (
          <p>
            Are you sure you want to delete the {data.itemType} "{data.itemName}"?
            This action cannot be undone.
          </p>
        )}
        confirmText="Delete"
      />
    </>
  );
}
```

## Generic Pagination Hook

Hooks can also be generic, providing type-safe state management for any data type.

```tsx
interface PaginationState<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  currentItems: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationActions {
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

function usePagination<T>(
  items: T[],
  initialPageSize: number = 10
): PaginationState<T> & PaginationActions {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Adjust current page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const setPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return {
    items,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    currentItems,
    hasNextPage,
    hasPreviousPage,
    setPage,
    nextPage,
    previousPage,
    setPageSize,
  };
}

// Usage
interface Article {
  id: number;
  title: string;
  author: string;
  publishedAt: Date;
}

function ArticleList() {
  const [articles] = useState<Article[]>([
    // ... articles data
  ]);

  const pagination = usePagination(articles, 5);

  return (
    <div>
      <ul>
        {pagination.currentItems.map((article) => (
          // article is typed as Article
          <li key={article.id}>
            <h3>{article.title}</h3>
            <p>By {article.author}</p>
          </li>
        ))}
      </ul>

      <div className="pagination-controls">
        <button
          onClick={pagination.previousPage}
          disabled={!pagination.hasPreviousPage}
        >
          Previous
        </button>
        <span>
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <button
          onClick={pagination.nextPage}
          disabled={!pagination.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Generic Context Pattern

React Context with generics provides type-safe global state for any data shape.

```tsx
interface EntityContextValue<T> {
  items: T[];
  selectedItem: T | null;
  isLoading: boolean;
  error: string | null;
  selectItem: (item: T | null) => void;
  addItem: (item: T) => void;
  updateItem: (item: T) => void;
  removeItem: (item: T) => void;
  refresh: () => Promise<void>;
}

// Factory function to create typed context and provider
function createEntityContext<T extends { id: string | number }>() {
  const Context = createContext<EntityContextValue<T> | undefined>(undefined);

  interface ProviderProps {
    fetchItems: () => Promise<T[]>;
    children: React.ReactNode;
  }

  function Provider({ fetchItems, children }: ProviderProps) {
    const [items, setItems] = useState<T[]>([]);
    const [selectedItem, setSelectedItem] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchItems();
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch items');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      refresh();
    }, []);

    const selectItem = (item: T | null) => {
      setSelectedItem(item);
    };

    const addItem = (item: T) => {
      setItems((prev) => [...prev, item]);
    };

    const updateItem = (item: T) => {
      setItems((prev) =>
        prev.map((existing) => (existing.id === item.id ? item : existing))
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem(item);
      }
    };

    const removeItem = (item: T) => {
      setItems((prev) => prev.filter((existing) => existing.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    };

    const value: EntityContextValue<T> = {
      items,
      selectedItem,
      isLoading,
      error,
      selectItem,
      addItem,
      updateItem,
      removeItem,
      refresh,
    };

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useEntityContext(): EntityContextValue<T> {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useEntityContext must be used within Provider');
    }
    return context;
  }

  return { Provider, useEntityContext };
}

// Usage
interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
}

// Create typed context for tasks
const {
  Provider: TaskProvider,
  useEntityContext: useTaskContext,
} = createEntityContext<Task>();

// Use in app
function App() {
  const fetchTasks = async (): Promise<Task[]> => {
    const response = await fetch('/api/tasks');
    return response.json();
  };

  return (
    <TaskProvider fetchItems={fetchTasks}>
      <TaskList />
    </TaskProvider>
  );
}

function TaskList() {
  const { items, selectedItem, selectItem, isLoading } = useTaskContext();

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <ul>
      {items.map((task) => (
        // task is typed as Task
        <li
          key={task.id}
          onClick={() => selectItem(task)}
          className={selectedItem?.id === task.id ? 'selected' : ''}
        >
          {task.title} - {task.completed ? 'Done' : 'Pending'}
        </li>
      ))}
    </ul>
  );
}
```

## Generic Data Fetching Component

A render props pattern combined with generics for flexible data fetching.

```tsx
interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface DataFetcherProps<T> {
  url: string;
  options?: RequestInit;
  transform?: (response: unknown) => T;
  children: (state: FetchState<T>) => React.ReactNode;
}

function DataFetcher<T>(props: DataFetcherProps<T>): React.ReactElement {
  const { url, options, transform, children } = props;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState({ data: null, isLoading: true, error: null });

      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        const data = transform ? transform(json) : (json as T);

        if (!cancelled) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <>{children(state)}</>;
}

// Usage
interface ApiResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
  };
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

function PostsList() {
  return (
    <DataFetcher<Post[]>
      url="/api/posts"
      transform={(response) => (response as ApiResponse<Post>).data}
    >
      {({ data, isLoading, error }) => {
        if (isLoading) {
          return <div>Loading posts...</div>;
        }

        if (error) {
          return <div>Error: {error.message}</div>;
        }

        if (!data) {
          return <div>No posts found</div>;
        }

        return (
          <ul>
            {data.map((post) => (
              // post is typed as Post
              <li key={post.id}>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </li>
            ))}
          </ul>
        );
      }}
    </DataFetcher>
  );
}
```

## Multiple Generic Parameters

Components can accept multiple generic types for complex relationships between props.

```tsx
interface ComparatorProps<T, K extends keyof T> {
  items: T[];
  compareBy: K;
  ascending?: boolean;
  renderItem: (item: T, rank: number) => React.ReactNode;
}

function SortedList<T, K extends keyof T>(
  props: ComparatorProps<T, K>
): React.ReactElement {
  const { items, compareBy, ascending = true, renderItem } = props;

  const sortedItems = [...items].sort((a, b) => {
    const aValue = a[compareBy];
    const bValue = b[compareBy];

    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });

  return (
    <ol>
      {sortedItems.map((item, index) => (
        <li key={index}>{renderItem(item, index + 1)}</li>
      ))}
    </ol>
  );
}

// Usage
interface Player {
  name: string;
  score: number;
  level: number;
  joinedAt: Date;
}

const players: Player[] = [
  { name: 'Alice', score: 1500, level: 10, joinedAt: new Date('2024-01-01') },
  { name: 'Bob', score: 2000, level: 15, joinedAt: new Date('2023-06-15') },
  { name: 'Charlie', score: 1800, level: 12, joinedAt: new Date('2024-03-20') },
];

function Leaderboard() {
  return (
    <SortedList
      items={players}
      compareBy="score"  // TypeScript knows this must be a key of Player
      ascending={false}
      renderItem={(player, rank) => (
        <span>
          #{rank} {player.name}: {player.score} points (Level {player.level})
        </span>
      )}
    />
  );
}
```

## Generic Component with Ref Forwarding

Forwarding refs in generic components requires special handling to preserve type safety.

```tsx
interface InputFieldProps<T> {
  value: T;
  onChange: (value: T) => void;
  parse: (input: string) => T;
  format: (value: T) => string;
  placeholder?: string;
  className?: string;
}

// Factory function for generic component with forwarded ref
function createInputField<T>() {
  return forwardRef<HTMLInputElement, InputFieldProps<T>>(
    function InputField(props, ref) {
      const { value, onChange, parse, format, placeholder, className } = props;

      const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
          const parsed = parse(event.target.value);
          onChange(parsed);
        } catch {
          // Invalid input, ignore
        }
      };

      return (
        <input
          ref={ref}
          type="text"
          value={format(value)}
          onChange={handleChange}
          placeholder={placeholder}
          className={className}
        />
      );
    }
  );
}

// Create specific typed input components
const NumberInput = createInputField<number>();
const DateInput = createInputField<Date>();

// Usage
function FormWithRefs() {
  const numberRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date());

  return (
    <form>
      <NumberInput
        ref={numberRef}
        value={amount}
        onChange={setAmount}
        parse={(s) => parseFloat(s) || 0}
        format={(n) => n.toString()}
        placeholder="Enter amount"
      />

      <DateInput
        ref={dateRef}
        value={date}
        onChange={setDate}
        parse={(s) => new Date(s)}
        format={(d) => d.toISOString().split('T')[0]}
        placeholder="YYYY-MM-DD"
      />

      <button
        type="button"
        onClick={() => numberRef.current?.focus()}
      >
        Focus Amount
      </button>
    </form>
  );
}
```

## Default Type Parameters

Generic components can have default types for convenience when a specific type is commonly used.

```tsx
interface CardProps<T = string> {
  title: string;
  data: T;
  renderData?: (data: T) => React.ReactNode;
}

// Default renderData for string type
function Card<T = string>(props: CardProps<T>): React.ReactElement {
  const {
    title,
    data,
    renderData = (d) => String(d),
  } = props;

  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <div className="card-content">{renderData(data)}</div>
    </div>
  );
}

// Usage - defaults to string
<Card title="Simple Card" data="Just a string" />

// Usage - explicit type
interface Stats {
  views: number;
  likes: number;
  shares: number;
}

<Card<Stats>
  title="Post Statistics"
  data={{ views: 1500, likes: 120, shares: 45 }}
  renderData={(stats) => (
    <ul>
      <li>Views: {stats.views}</li>
      <li>Likes: {stats.likes}</li>
      <li>Shares: {stats.shares}</li>
    </ul>
  )}
/>
```

## Conditional Types in Generic Components

Advanced patterns using TypeScript's conditional types for highly flexible APIs.

```tsx
// Props differ based on whether multi-select is enabled
type SelectionMode = 'single' | 'multiple';

type SelectionValue<T, Mode extends SelectionMode> =
  Mode extends 'multiple' ? T[] : T | null;

interface TreeViewProps<T, Mode extends SelectionMode = 'single'> {
  items: T[];
  mode: Mode;
  selected: SelectionValue<T, Mode>;
  onSelectionChange: (selection: SelectionValue<T, Mode>) => void;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getChildren?: (item: T) => T[];
}

function TreeView<T, Mode extends SelectionMode = 'single'>(
  props: TreeViewProps<T, Mode>
): React.ReactElement {
  const {
    items,
    mode,
    selected,
    onSelectionChange,
    getItemId,
    getItemLabel,
    getChildren,
  } = props;

  const isSelected = (item: T): boolean => {
    if (mode === 'multiple') {
      return (selected as T[]).some(
        (s) => getItemId(s) === getItemId(item)
      );
    }
    return selected !== null && getItemId(selected as T) === getItemId(item);
  };

  const handleSelect = (item: T) => {
    if (mode === 'multiple') {
      const currentSelection = selected as T[];
      const itemId = getItemId(item);
      const isCurrentlySelected = currentSelection.some(
        (s) => getItemId(s) === itemId
      );

      const newSelection = isCurrentlySelected
        ? currentSelection.filter((s) => getItemId(s) !== itemId)
        : [...currentSelection, item];

      onSelectionChange(newSelection as SelectionValue<T, Mode>);
    } else {
      onSelectionChange(item as SelectionValue<T, Mode>);
    }
  };

  const renderItem = (item: T, depth: number = 0): React.ReactNode => {
    const children = getChildren?.(item) ?? [];

    return (
      <div key={getItemId(item)} style={{ marginLeft: depth * 20 }}>
        <div
          className={`tree-item ${isSelected(item) ? 'selected' : ''}`}
          onClick={() => handleSelect(item)}
        >
          {getItemLabel(item)}
        </div>
        {children.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  return <div className="tree-view">{items.map((item) => renderItem(item))}</div>;
}

// Usage - single selection
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

function SingleSelectTree() {
  const [selected, setSelected] = useState<FileNode | null>(null);

  return (
    <TreeView
      items={files}
      mode="single"
      selected={selected}
      onSelectionChange={setSelected}  // TypeScript knows this is FileNode | null
      getItemId={(file) => file.id}
      getItemLabel={(file) => file.name}
      getChildren={(file) => file.children}
    />
  );
}

// Usage - multiple selection
function MultiSelectTree() {
  const [selected, setSelected] = useState<FileNode[]>([]);

  return (
    <TreeView
      items={files}
      mode="multiple"
      selected={selected}
      onSelectionChange={setSelected}  // TypeScript knows this is FileNode[]
      getItemId={(file) => file.id}
      getItemLabel={(file) => file.name}
      getChildren={(file) => file.children}
    />
  );
}
```

## Summary Table: Generic Component Patterns

| Pattern | Use Case | Key Benefit |
|---------|----------|-------------|
| **Basic Generic** | Lists, tables, dropdowns | One component works with any data type |
| **Constrained Generic** | Components needing specific properties | Guarantees required properties exist |
| **Multiple Generics** | Complex relationships between props | Type-safe connections between related data |
| **Generic Hooks** | Reusable stateful logic | Type-safe state management for any type |
| **Generic Context** | Global state patterns | Type-safe context for any entity type |
| **Ref Forwarding** | Input components, focus management | Full ref support with generics |
| **Default Types** | Convenient defaults | Simpler API for common cases |
| **Conditional Types** | Mode-dependent behavior | Props change based on configuration |

## Best Practices

1. **Start simple**: Begin with basic generics, add constraints only when needed
2. **Use meaningful names**: `T` is fine for simple cases, but `TItem`, `TOption` improve readability
3. **Constrain appropriately**: Too loose loses safety, too strict limits reusability
4. **Document constraints**: Use JSDoc to explain what types are expected
5. **Provide defaults**: Default type parameters reduce boilerplate for common cases
6. **Test with multiple types**: Verify your component works with different data shapes
7. **Avoid over-engineering**: Not every component needs generics

## Conclusion

Generic components transform how you build React applications with TypeScript. They eliminate code duplication while preserving complete type safety. The patterns in this guide cover most common scenarios, from simple lists to complex form systems.

Start with the basic pattern for your next reusable component. Add constraints when you need guaranteed properties. Use multiple generics for complex type relationships. The investment in learning these patterns pays dividends in maintainable, type-safe code.
