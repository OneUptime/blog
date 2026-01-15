# How to Type React Props, State, and Hooks with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, TypeScript, Props, State, Hooks, Type Safety

Description: A comprehensive guide to typing React components, props, state, and hooks with TypeScript for building type-safe, maintainable frontend applications.

---

TypeScript has become the standard for building React applications at scale. Strong typing catches bugs at compile time, provides better IDE support, and serves as living documentation. This guide covers everything you need to know about typing React props, state, and hooks effectively.

## Why Type Your React Code?

Before diving into patterns, here's what proper typing gives you:

- **Compile-time error detection:** Catch prop mismatches before runtime
- **Enhanced autocomplete:** Your IDE knows exactly what props and state exist
- **Refactoring confidence:** Change types and see everywhere that breaks
- **Self-documenting code:** Types explain what data flows through components

## Typing Component Props

### Basic Props Interface

The most straightforward approach is defining an interface for your props:

```tsx
interface UserCardProps {
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

function UserCard({ name, email, age, isActive }: UserCardProps) {
  return (
    <div className={isActive ? 'active' : 'inactive'}>
      <h2>{name}</h2>
      <p>{email}</p>
      <span>Age: {age}</span>
    </div>
  );
}

// Usage - TypeScript will error if props are missing or wrong type
<UserCard name="John" email="john@example.com" age={30} isActive={true} />
```

### Using Type Alias vs Interface

Both `type` and `interface` work for props. Choose based on your team's conventions:

```tsx
// Interface - can be extended and merged
interface ButtonProps {
  label: string;
  onClick: () => void;
}

interface IconButtonProps extends ButtonProps {
  icon: string;
}

// Type alias - more flexible for unions and intersections
type ButtonVariant = 'primary' | 'secondary' | 'danger';

type StyledButtonProps = {
  label: string;
  variant: ButtonVariant;
  onClick: () => void;
};
```

Generally, use `interface` for props that might be extended and `type` for unions or more complex type compositions.

### Optional Props with Default Values

Mark optional props with `?` and provide defaults:

```tsx
interface NotificationProps {
  message: string;
  type?: 'info' | 'warning' | 'error';
  dismissible?: boolean;
  autoHideDuration?: number;
}

function Notification({
  message,
  type = 'info',
  dismissible = true,
  autoHideDuration = 5000,
}: NotificationProps) {
  return (
    <div className={`notification notification-${type}`}>
      <p>{message}</p>
      {dismissible && <button>Dismiss</button>}
    </div>
  );
}

// All these are valid
<Notification message="Hello" />
<Notification message="Warning!" type="warning" />
<Notification message="Error!" type="error" dismissible={false} />
```

### Children Props

Type the `children` prop based on what your component accepts:

```tsx
import { ReactNode, ReactElement } from 'react';

// Accept any renderable content
interface ContainerProps {
  children: ReactNode;
}

function Container({ children }: ContainerProps) {
  return <div className="container">{children}</div>;
}

// Accept only a single React element
interface WrapperProps {
  children: ReactElement;
}

// Accept specific element types
interface ListProps {
  children: ReactElement<ListItemProps> | ReactElement<ListItemProps>[];
}

// Accept a render function
interface DataFetcherProps<T> {
  children: (data: T, loading: boolean) => ReactNode;
}

function DataFetcher<T>({ children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  // ... fetch logic
  return <>{children(data as T, loading)}</>;
}
```

### Function Props and Event Handlers

Type callback props precisely:

```tsx
interface FormProps {
  // Simple callback
  onSubmit: () => void;

  // Callback with parameters
  onChange: (value: string) => void;

  // Callback with return value
  validate: (value: string) => boolean;

  // DOM event handlers
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function SearchForm({ onSubmit, onChange, onClick }: FormProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick(e);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <input onChange={(e) => onChange(e.target.value)} />
      <button onClick={handleClick}>Search</button>
    </form>
  );
}
```

### Common Event Types Reference

```tsx
// Mouse events
onClick: (event: React.MouseEvent<HTMLElement>) => void;
onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void;
onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;

// Form events
onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
onFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;

// Keyboard events
onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => void;

// Drag events
onDrag: (event: React.DragEvent<HTMLElement>) => void;
onDrop: (event: React.DragEvent<HTMLElement>) => void;
```

### Spreading Props to HTML Elements

Use `ComponentPropsWithoutRef` to accept all native element props:

```tsx
import { ComponentPropsWithoutRef } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant: 'primary' | 'secondary';
  isLoading?: boolean;
}

function Button({ variant, isLoading, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={isLoading}
      {...rest}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

// Now accepts all button props plus custom ones
<Button variant="primary" type="submit" aria-label="Submit form">
  Submit
</Button>
```

For components that forward refs, use `ComponentPropsWithRef`:

```tsx
import { forwardRef, ComponentPropsWithRef } from 'react';

interface InputProps extends ComponentPropsWithRef<'input'> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...rest }, ref) => {
    return (
      <div className="input-wrapper">
        <label>{label}</label>
        <input ref={ref} {...rest} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);
```

## Typing Component State

### useState with Type Inference

TypeScript infers state type from the initial value:

```tsx
function Counter() {
  // Type is inferred as number
  const [count, setCount] = useState(0);

  // Type is inferred as string
  const [name, setName] = useState('');

  // Type is inferred as boolean
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Explicit State Types

Specify types explicitly when inference is insufficient:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function UserProfile() {
  // Explicit type for object state
  const [user, setUser] = useState<User | null>(null);

  // Explicit type for array state
  const [users, setUsers] = useState<User[]>([]);

  // Union types for complex state
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const fetchUser = async (id: string) => {
    setStatus('loading');
    try {
      const response = await fetch(`/api/users/${id}`);
      const data: User = await response.json();
      setUser(data);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      {status === 'loading' && <p>Loading...</p>}
      {status === 'error' && <p>Error loading user</p>}
      {status === 'success' && user && (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span>{user.role}</span>
        </div>
      )}
    </div>
  );
}
```

### Complex State Objects

For complex state, define comprehensive interfaces:

```tsx
interface FormState {
  values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  errors: Partial<Record<keyof FormState['values'], string>>;
  touched: Partial<Record<keyof FormState['values'], boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

const initialFormState: FormState = {
  values: {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  },
  errors: {},
  touched: {},
  isSubmitting: false,
  isValid: false,
};

function RegistrationForm() {
  const [form, setForm] = useState<FormState>(initialFormState);

  const updateField = (field: keyof FormState['values'], value: string) => {
    setForm((prev) => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      touched: { ...prev.touched, [field]: true },
    }));
  };

  const setFieldError = (field: keyof FormState['values'], error: string) => {
    setForm((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  };

  return (
    <form>
      <input
        value={form.values.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
      />
      {form.errors.firstName && <span>{form.errors.firstName}</span>}
      {/* ... more fields */}
    </form>
  );
}
```

## Typing React Hooks

### useReducer

Type your reducer actions with discriminated unions:

```tsx
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  loading: boolean;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

// Discriminated union for actions
type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoState['filter'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TODOS'; payload: Todo[] };

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            text: action.payload.text,
            completed: false,
          },
        ],
      };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload.id),
      };
    case 'SET_FILTER':
      return { ...state, filter: action.payload.filter };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TODOS':
      return { ...state, todos: action.payload };
    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    loading: false,
  });

  const addTodo = (text: string) => {
    dispatch({ type: 'ADD_TODO', payload: { text } });
  };

  const toggleTodo = (id: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: { id } });
  };

  return (
    <div>
      {state.todos.map((todo) => (
        <div key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}
```

### useContext

Type your context value and create a typed hook:

```tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Create context with undefined as default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a typed hook that throws if used outside provider
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provider component
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const userData: User = await response.json();
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Usage in components
function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### useRef

Type refs based on what they reference:

```tsx
function FormWithRefs() {
  // DOM element ref - initialize with null
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Mutable value ref - provide initial value
  const renderCount = useRef<number>(0);
  const previousValue = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    renderCount.current += 1;

    // Focus input on mount
    inputRef.current?.focus();

    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    previousValue.current = value;
  };

  return (
    <form ref={formRef}>
      <input ref={inputRef} onChange={(e) => handleChange(e.target.value)} />
      <button ref={buttonRef} type="submit">
        Submit
      </button>
    </form>
  );
}
```

### useCallback and useMemo

Type inference usually works, but you can be explicit:

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

function ProductList({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');

  // useMemo with explicit return type
  const filteredProducts = useMemo<Product[]>(() => {
    return products
      .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return a.price - b.price;
      });
  }, [products, filter, sortBy]);

  // useCallback with typed parameters
  const handleProductClick = useCallback((product: Product) => {
    console.log('Selected:', product.name);
  }, []);

  // useCallback for event handlers
  const handleFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilter(event.target.value);
    },
    []
  );

  return (
    <div>
      <input value={filter} onChange={handleFilterChange} />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'name' | 'price')}
      >
        <option value="name">Name</option>
        <option value="price">Price</option>
      </select>
      {filteredProducts.map((product) => (
        <div key={product.id} onClick={() => handleProductClick(product)}>
          {product.name} - ${product.price}
        </div>
      ))}
    </div>
  );
}
```

### Custom Hooks

Create well-typed custom hooks:

```tsx
// Typed custom hook for API fetching
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: T = await response.json();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
interface Post {
  id: number;
  title: string;
  body: string;
}

function PostList() {
  const { data: posts, loading, error, refetch } = useFetch<Post[]>(
    '/api/posts'
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {posts?.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
        </article>
      ))}
    </div>
  );
}
```

### useLocalStorage Hook

A typed hook for persistent state:

```tsx
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

// Usage
interface UserPreferences {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}

function Settings() {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'user-preferences',
    {
      theme: 'light',
      fontSize: 16,
      notifications: true,
    }
  );

  return (
    <div>
      <select
        value={preferences.theme}
        onChange={(e) =>
          setPreferences((prev) => ({
            ...prev,
            theme: e.target.value as 'light' | 'dark',
          }))
        }
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
```

## Generic Components

### Basic Generic Component

Create reusable components that work with any data type:

```tsx
interface SelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getValue: (item: T) => string | number;
  placeholder?: string;
}

function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  placeholder = 'Select an option',
}: SelectProps<T>) {
  return (
    <select
      value={value ? String(getValue(value)) : ''}
      onChange={(e) => {
        const selected = options.find(
          (opt) => String(getValue(opt)) === e.target.value
        );
        if (selected) onChange(selected);
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={getValue(option)} value={getValue(option)}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  );
}

// Usage with different types
interface Country {
  code: string;
  name: string;
}

interface User {
  id: number;
  email: string;
}

function App() {
  const [country, setCountry] = useState<Country | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const countries: Country[] = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
  ];

  const users: User[] = [
    { id: 1, email: 'alice@example.com' },
    { id: 2, email: 'bob@example.com' },
  ];

  return (
    <div>
      <Select<Country>
        options={countries}
        value={country}
        onChange={setCountry}
        getLabel={(c) => c.name}
        getValue={(c) => c.code}
      />

      <Select<User>
        options={users}
        value={user}
        onChange={setUser}
        getLabel={(u) => u.email}
        getValue={(u) => u.id}
      />
    </div>
  );
}
```

### Generic List Component

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  className?: string;
}

function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items',
  className,
}: ListProps<T>) {
  if (items.length === 0) {
    return <p className="empty-list">{emptyMessage}</p>;
  }

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
interface Task {
  id: string;
  title: string;
  done: boolean;
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <List<Task>
      items={tasks}
      keyExtractor={(task) => task.id}
      renderItem={(task) => (
        <span className={task.done ? 'completed' : ''}>{task.title}</span>
      )}
      emptyMessage="No tasks yet"
    />
  );
}
```

### Generic Table Component

```tsx
interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
}

function Table<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
}: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {columns.map((col) => (
              <td key={col.key}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Name', render: (e) => e.name },
    { key: 'dept', header: 'Department', render: (e) => e.department },
    {
      key: 'salary',
      header: 'Salary',
      render: (e) => `$${e.salary.toLocaleString()}`,
    },
  ];

  return (
    <Table<Employee>
      data={employees}
      columns={columns}
      keyExtractor={(e) => e.id}
      onRowClick={(employee) => console.log('Selected:', employee.name)}
    />
  );
}
```

## Advanced Patterns

### Discriminated Union Props

Use discriminated unions for components with mutually exclusive props:

```tsx
type AlertProps =
  | {
      type: 'success';
      message: string;
      onDismiss?: () => void;
    }
  | {
      type: 'error';
      message: string;
      errorCode: string;
      onRetry: () => void;
    }
  | {
      type: 'loading';
      message?: string;
    };

function Alert(props: AlertProps) {
  switch (props.type) {
    case 'success':
      return (
        <div className="alert alert-success">
          <p>{props.message}</p>
          {props.onDismiss && <button onClick={props.onDismiss}>Dismiss</button>}
        </div>
      );
    case 'error':
      return (
        <div className="alert alert-error">
          <p>{props.message}</p>
          <code>{props.errorCode}</code>
          <button onClick={props.onRetry}>Retry</button>
        </div>
      );
    case 'loading':
      return (
        <div className="alert alert-loading">
          <p>{props.message || 'Loading...'}</p>
        </div>
      );
  }
}

// Usage - TypeScript ensures correct props for each type
<Alert type="success" message="Saved!" />
<Alert type="error" message="Failed" errorCode="ERR_001" onRetry={() => {}} />
<Alert type="loading" />
```

### Polymorphic Components

Create components that can render as different HTML elements:

```tsx
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

interface TextOwnProps {
  color?: 'primary' | 'secondary' | 'muted';
  size?: 'sm' | 'md' | 'lg';
}

type TextProps<C extends React.ElementType> = PolymorphicComponentProps<
  C,
  TextOwnProps
>;

function Text<C extends React.ElementType = 'span'>({
  as,
  color = 'primary',
  size = 'md',
  children,
  ...rest
}: TextProps<C>) {
  const Component = as || 'span';

  return (
    <Component
      className={`text-${color} text-${size}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Usage - renders as different elements
<Text>Default span</Text>
<Text as="p" color="muted">Paragraph text</Text>
<Text as="h1" size="lg">Heading</Text>
<Text as="a" href="/about" color="primary">Link text</Text>
```

### Compound Components with Context

Type compound components that share state:

```tsx
interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs provider');
  }
  return context;
}

interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tabId: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultTab);

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      onChange?.(id);
    },
    [onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
  className?: string;
}

function TabList({ children, className }: TabListProps) {
  return <div className={`tab-list ${className || ''}`}>{children}</div>;
}

interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

function Tab({ id, children, disabled }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <button
      className={`tab ${activeTab === id ? 'active' : ''}`}
      onClick={() => !disabled && setActiveTab(id)}
      disabled={disabled}
      aria-selected={activeTab === id}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  id: string;
  children: ReactNode;
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabs();

  if (activeTab !== id) return null;

  return <div className="tab-panel">{children}</div>;
}

// Attach sub-components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
function SettingsPage() {
  return (
    <Tabs defaultTab="profile" onChange={(tab) => console.log('Tab:', tab)}>
      <Tabs.List>
        <Tabs.Tab id="profile">Profile</Tabs.Tab>
        <Tabs.Tab id="security">Security</Tabs.Tab>
        <Tabs.Tab id="notifications">Notifications</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel id="profile">Profile settings content</Tabs.Panel>
      <Tabs.Panel id="security">Security settings content</Tabs.Panel>
      <Tabs.Panel id="notifications">Notification settings content</Tabs.Panel>
    </Tabs>
  );
}
```

## Utility Types for React

### Extract Props from Components

```tsx
import { ComponentProps, ComponentPropsWithRef } from 'react';

// Extract props from a component
type ButtonProps = ComponentProps<typeof Button>;

// Extract props from HTML elements
type DivProps = ComponentProps<'div'>;
type InputProps = ComponentProps<'input'>;

// With ref
type InputPropsWithRef = ComponentPropsWithRef<'input'>;
```

### Require at Least One Prop

```tsx
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

interface IconButtonBaseProps {
  icon?: string;
  label?: string;
  onClick: () => void;
}

// Require either icon or label (or both)
type IconButtonProps = RequireAtLeastOne<IconButtonBaseProps, 'icon' | 'label'>;

function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} aria-label={label}>
      {icon && <span className="icon">{icon}</span>}
      {label && <span className="label">{label}</span>}
    </button>
  );
}

// Valid
<IconButton icon="+" onClick={() => {}} />
<IconButton label="Add" onClick={() => {}} />
<IconButton icon="+" label="Add" onClick={() => {}} />

// Error - neither icon nor label provided
// <IconButton onClick={() => {}} />
```

### Make Specific Props Required

```tsx
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

interface BaseConfig {
  id?: string;
  name?: string;
  value?: number;
}

// Make id and name required
type StrictConfig = WithRequired<BaseConfig, 'id' | 'name'>;

// StrictConfig = { id: string; name: string; value?: number; }
```

## Summary Table

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Basic Interface** | Simple component props | `interface Props { name: string }` |
| **Optional Props** | Props with defaults | `title?: string` |
| **Children Props** | Content slots | `children: ReactNode` |
| **Event Handlers** | Callbacks | `onClick: (e: MouseEvent) => void` |
| **Spread Props** | Extend HTML elements | `extends ComponentPropsWithoutRef<'button'>` |
| **useState Generic** | Typed state | `useState<User \| null>(null)` |
| **useReducer Actions** | Complex state updates | Discriminated union actions |
| **useContext** | Typed context | `createContext<Type \| undefined>` |
| **useRef DOM** | Element references | `useRef<HTMLInputElement>(null)` |
| **useRef Mutable** | Mutable values | `useRef<number>(0)` |
| **Custom Hooks** | Reusable logic | Generic return types |
| **Generic Components** | Flexible components | `function Select<T>(props: SelectProps<T>)` |
| **Discriminated Unions** | Mutually exclusive props | `type Props = A \| B \| C` |
| **Polymorphic Components** | Render as different elements | `as?: React.ElementType` |
| **Compound Components** | Related component groups | Context + sub-components |

## Conclusion

Proper TypeScript typing in React applications provides safety nets that catch errors before they reach production. Start with basic prop interfaces and gradually adopt more advanced patterns as your components grow in complexity.

Key takeaways:

1. Always type your props explicitly rather than relying on `any`
2. Use discriminated unions for components with different behavior modes
3. Create typed custom hooks for reusable stateful logic
4. Leverage generics for flexible, reusable components
5. Use utility types to reduce boilerplate and enforce constraints

Type safety is an investment that pays dividends in maintainability, developer experience, and runtime reliability. The patterns covered here form the foundation for building robust React applications that scale with your team and codebase.
