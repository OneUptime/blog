# How to Type React Native Props, State, and Hooks with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TypeScript, Props, Hooks, Type Safety, Mobile Development

Description: Learn how to properly type props, state, and hooks in React Native with TypeScript for type-safe components.

---

TypeScript has become the standard for building robust React Native applications. By adding static type checking to your components, you catch bugs at compile time, get better IDE support, and create self-documenting code. This comprehensive guide covers everything you need to know about typing props, state, and hooks in React Native.

## Why TypeScript in React Native?

Before diving into the specifics, let's understand why TypeScript matters for React Native development:

- **Catch errors early**: TypeScript identifies type mismatches before runtime
- **Better autocomplete**: Your IDE can suggest properties and methods
- **Self-documenting code**: Types serve as inline documentation
- **Safer refactoring**: Rename with confidence knowing all usages are tracked
- **Team collaboration**: Clear contracts between components

## Component Props Typing

### Basic Props Interface

The most common way to type component props is using an interface:

```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface UserCardProps {
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ name, email, age, isActive }) => {
  return (
    <View>
      <Text>{name}</Text>
      <Text>{email}</Text>
      <Text>Age: {age}</Text>
      <Text>Status: {isActive ? 'Active' : 'Inactive'}</Text>
    </View>
  );
};

export default UserCard;
```

### Using Type Aliases

You can also use type aliases instead of interfaces:

```typescript
type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled: boolean;
};

const CustomButton: React.FC<ButtonProps> = ({ title, onPress, disabled }) => {
  // Component implementation
};
```

### Explicit Function Typing (Recommended Approach)

Many developers prefer explicit function typing over `React.FC`:

```typescript
interface CardProps {
  title: string;
  subtitle: string;
}

function Card({ title, subtitle }: CardProps): React.ReactElement {
  return (
    <View>
      <Text>{title}</Text>
      <Text>{subtitle}</Text>
    </View>
  );
}

// Or with arrow functions
const Card = ({ title, subtitle }: CardProps): React.ReactElement => {
  return (
    <View>
      <Text>{title}</Text>
      <Text>{subtitle}</Text>
    </View>
  );
};
```

## Optional vs Required Props

### Optional Props with Question Mark

Use the `?` operator to mark props as optional:

```typescript
interface ProfileProps {
  name: string;           // Required
  bio?: string;           // Optional
  avatarUrl?: string;     // Optional
  followerCount?: number; // Optional
}

const Profile: React.FC<ProfileProps> = ({
  name,
  bio,
  avatarUrl,
  followerCount
}) => {
  return (
    <View>
      <Text>{name}</Text>
      {bio && <Text>{bio}</Text>}
      {avatarUrl && <Image source={{ uri: avatarUrl }} />}
      {followerCount !== undefined && (
        <Text>Followers: {followerCount}</Text>
      )}
    </View>
  );
};
```

### Partial and Required Utility Types

TypeScript provides utility types for making all props optional or required:

```typescript
interface CompleteUserProps {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// All props become optional
type PartialUserProps = Partial<CompleteUserProps>;

// All props become required (useful when extending partial types)
type RequiredUserProps = Required<PartialUserProps>;

// Pick specific props
type BasicUserProps = Pick<CompleteUserProps, 'id' | 'name'>;

// Omit specific props
type UserPropsWithoutPhone = Omit<CompleteUserProps, 'phone'>;
```

## Default Props with TypeScript

### Default Values in Destructuring

The cleanest way to set default props is in the parameter destructuring:

```typescript
interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  duration = 3000,
  dismissible = true,
}) => {
  const backgroundColor = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  }[type];

  return (
    <View style={{ backgroundColor }}>
      <Text>{message}</Text>
      {dismissible && <Text>Tap to dismiss</Text>}
    </View>
  );
};
```

### Default Props Object Pattern

For complex defaults, use a separate defaults object:

```typescript
interface ConfigProps {
  apiUrl?: string;
  timeout?: number;
  retryCount?: number;
  headers?: Record<string, string>;
}

const defaultConfig: Required<ConfigProps> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retryCount: 3,
  headers: { 'Content-Type': 'application/json' },
};

const ApiClient: React.FC<ConfigProps> = (props) => {
  const config = { ...defaultConfig, ...props };
  // Use config with all required properties
};
```

## Children Prop Typing

### Basic Children Typing

```typescript
import React, { ReactNode, PropsWithChildren } from 'react';

// Method 1: Explicit ReactNode
interface ContainerProps {
  children: ReactNode;
  padding?: number;
}

const Container: React.FC<ContainerProps> = ({ children, padding = 16 }) => {
  return <View style={{ padding }}>{children}</View>;
};

// Method 2: Using PropsWithChildren
interface CardContainerProps {
  title: string;
  bordered?: boolean;
}

const CardContainer: React.FC<PropsWithChildren<CardContainerProps>> = ({
  children,
  title,
  bordered = false,
}) => {
  return (
    <View style={bordered ? styles.bordered : undefined}>
      <Text>{title}</Text>
      {children}
    </View>
  );
};
```

### Typed Children (Render Props)

For render props patterns, type the children as a function:

```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null) => ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>): ReactElement {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch logic here...

  return <>{children(data, loading, error)}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {(users, loading, error) => {
    if (loading) return <ActivityIndicator />;
    if (error) return <Text>Error: {error.message}</Text>;
    return users?.map(user => <UserCard key={user.id} {...user} />);
  }}
</DataFetcher>
```

### ReactElement Children

When you need specifically React elements (not strings or numbers):

```typescript
interface TabContainerProps {
  children: ReactElement | ReactElement[];
  activeIndex: number;
}

const TabContainer: React.FC<TabContainerProps> = ({ children, activeIndex }) => {
  const tabs = React.Children.toArray(children) as ReactElement[];
  return <View>{tabs[activeIndex]}</View>;
};
```

## useState Typing

### Basic useState Types

TypeScript can often infer useState types, but explicit typing is clearer:

```typescript
import { useState } from 'react';

// Type inference (works for primitives)
const [count, setCount] = useState(0);           // number
const [name, setName] = useState('');            // string
const [isVisible, setIsVisible] = useState(true); // boolean

// Explicit typing (recommended for clarity)
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>('');
const [isVisible, setIsVisible] = useState<boolean>(true);
```

### Object State

Always explicitly type object state:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updatePreferences = (theme: 'light' | 'dark') => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: { ...prev.preferences, theme },
      };
    });
  };

  return (/* JSX */);
};
```

### Array State

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const addTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date(),
    };
    setTodos(prev => [...prev, newTodo]);
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return (/* JSX */);
};
```

### Union Types in State

```typescript
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface FetchState<T> {
  status: LoadingState;
  data: T | null;
  error: string | null;
}

const DataDisplay: React.FC = () => {
  const [state, setState] = useState<FetchState<User[]>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const fetchData = async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setState({ status: 'success', data, error: null });
    } catch (err) {
      setState({
        status: 'error',
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };
};
```

## useRef Typing

### DOM Element Refs

```typescript
import { useRef, useEffect } from 'react';
import { TextInput, ScrollView, View, Animated } from 'react-native';

const FormComponent: React.FC = () => {
  // TextInput ref
  const inputRef = useRef<TextInput>(null);

  // ScrollView ref
  const scrollViewRef = useRef<ScrollView>(null);

  // View ref
  const containerRef = useRef<View>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    // Focus on mount
    inputRef.current?.focus();
  }, []);

  return (
    <ScrollView ref={scrollViewRef}>
      <View ref={containerRef}>
        <TextInput ref={inputRef} placeholder="Enter text" />
      </View>
    </ScrollView>
  );
};
```

### Mutable Value Refs

For values that persist across renders but don't trigger re-renders:

```typescript
const Timer: React.FC = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countRef = useRef<number>(0);
  const previousValueRef = useRef<string>('');

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      countRef.current += 1;
      console.log('Count:', countRef.current);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (/* JSX */);
};
```

### Animated Value Refs

```typescript
const AnimatedComponent: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text>Fading content</Text>
    </Animated.View>
  );
};
```

## useReducer Typing

### Basic Reducer Pattern

```typescript
import { useReducer } from 'react';

// State type
interface CounterState {
  count: number;
  step: number;
}

// Action types using discriminated unions
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_COUNT'; payload: number };

// Initial state
const initialState: CounterState = {
  count: 0,
  step: 1,
};

// Reducer function
const counterReducer = (
  state: CounterState,
  action: CounterAction
): CounterState => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + state.step };
    case 'DECREMENT':
      return { ...state, count: state.count - state.step };
    case 'RESET':
      return initialState;
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_COUNT':
      return { ...state, count: action.payload };
    default:
      return state;
  }
};

const Counter: React.FC = () => {
  const [state, dispatch] = useReducer(counterReducer, initialState);

  return (
    <View>
      <Text>Count: {state.count}</Text>
      <Button title="+" onPress={() => dispatch({ type: 'INCREMENT' })} />
      <Button title="-" onPress={() => dispatch({ type: 'DECREMENT' })} />
      <Button title="Reset" onPress={() => dispatch({ type: 'RESET' })} />
    </View>
  );
};
```

### Complex State Management

```typescript
interface FormState {
  values: {
    username: string;
    email: string;
    password: string;
  };
  errors: {
    username?: string;
    email?: string;
    password?: string;
  };
  touched: {
    username: boolean;
    email: boolean;
    password: boolean;
  };
  isSubmitting: boolean;
  isValid: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState['values']; value: string }
  | { type: 'SET_ERROR'; field: keyof FormState['errors']; error: string }
  | { type: 'CLEAR_ERROR'; field: keyof FormState['errors'] }
  | { type: 'SET_TOUCHED'; field: keyof FormState['touched'] }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'RESET' };

const initialFormState: FormState = {
  values: { username: '', email: '', password: '' },
  errors: {},
  touched: { username: false, email: false, password: false },
  isSubmitting: false,
  isValid: false,
};

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
        isValid: false,
      };
    case 'CLEAR_ERROR':
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors,
        isValid: Object.keys(remainingErrors).length === 0,
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true },
      };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
};
```

## Custom Hook Typing

### Basic Custom Hook

```typescript
import { useState, useEffect } from 'react';

interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

const useToggle = (initialValue: boolean = false): UseToggleReturn => {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = () => setValue(prev => !prev);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);

  return { value, toggle, setTrue, setFalse };
};

// Usage
const Modal: React.FC = () => {
  const { value: isOpen, toggle, setFalse: close } = useToggle(false);
  return (/* JSX */);
};
```

### Generic Custom Hook

```typescript
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: T = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
interface Product {
  id: string;
  name: string;
  price: number;
}

const ProductList: React.FC = () => {
  const { data: products, loading, error, refetch } = useFetch<Product[]>('/api/products');

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => <ProductCard {...item} />}
      keyExtractor={item => item.id}
    />
  );
};
```

### Hook with Async Storage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseAsyncStorageResult<T> {
  value: T | null;
  setValue: (newValue: T) => Promise<void>;
  removeValue: () => Promise<void>;
  loading: boolean;
}

function useAsyncStorage<T>(key: string, defaultValue: T | null = null): UseAsyncStorageResult<T> {
  const [value, setStoredValue] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch (error) {
        console.error('Error loading from AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    };
    loadValue();
  }, [key]);

  const setValue = async (newValue: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  };

  const removeValue = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(null);
    } catch (error) {
      console.error('Error removing from AsyncStorage:', error);
    }
  };

  return { value, setValue, removeValue, loading };
}
```

## Event Handler Types

### Touch Events

```typescript
import {
  TouchableOpacity,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from 'react-native';

interface ButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
}

const InteractiveButton: React.FC<ButtonProps> = ({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Text>Press Me</Text>
    </TouchableOpacity>
  );
};
```

### Text Input Events

```typescript
import {
  TextInput,
  NativeSyntheticEvent,
  TextInputChangeEventData,
  TextInputSubmitEditingEventData,
  TextInputFocusEventData,
  TextInputKeyPressEventData,
} from 'react-native';

interface SearchInputProps {
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onChange?: (event: NativeSyntheticEvent<TextInputChangeEventData>) => void;
  onFocus?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onBlur?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onChangeText,
  onSubmit,
  onChange,
  onFocus,
  onBlur,
  onKeyPress,
}) => {
  const handleSubmitEditing = (
    event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    onSubmit(event.nativeEvent.text);
  };

  return (
    <TextInput
      onChangeText={onChangeText}
      onChange={onChange}
      onSubmitEditing={handleSubmitEditing}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyPress={onKeyPress}
    />
  );
};
```

### Scroll Events

```typescript
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

interface InfiniteScrollProps {
  onEndReached: () => void;
  threshold?: number;
  children: React.ReactNode;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onEndReached,
  threshold = 100,
  children,
}) => {
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;

    if (isCloseToBottom) {
      onEndReached();
    }
  };

  return (
    <ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
      {children}
    </ScrollView>
  );
};
```

## Style Prop Typing

### ViewStyle and TextStyle

```typescript
import {
  View,
  Text,
  ViewStyle,
  TextStyle,
  StyleSheet,
  StyleProp,
} from 'react-native';

interface StyledCardProps {
  title: string;
  subtitle?: string;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

const StyledCard: React.FC<StyledCardProps> = ({
  title,
  subtitle,
  containerStyle,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
```

### Image and FlatList Styles

```typescript
import { ImageStyle, FlatList, ListRenderItem } from 'react-native';

interface AvatarProps {
  uri: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const Avatar: React.FC<AvatarProps> = ({ uri, size = 50, style }) => {
  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
};

// FlatList with proper typing
interface ListItem {
  id: string;
  name: string;
}

const TypedList: React.FC<{ data: ListItem[] }> = ({ data }) => {
  const renderItem: ListRenderItem<ListItem> = ({ item, index }) => (
    <View>
      <Text>{item.name}</Text>
    </View>
  );

  return (
    <FlatList<ListItem>
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
};
```

## Generic Component Props

### Generic List Component

```typescript
interface GenericListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  header?: React.ReactElement;
  footer?: React.ReactElement;
}

function GenericList<T>({
  data,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items found',
  header,
  footer,
}: GenericListProps<T>): React.ReactElement {
  if (data.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <View>
      {header}
      {data.map((item, index) => (
        <View key={keyExtractor(item)}>{renderItem(item, index)}</View>
      ))}
      {footer}
    </View>
  );
}

// Usage
interface Product {
  id: string;
  name: string;
  price: number;
}

const ProductListScreen: React.FC = () => {
  const products: Product[] = [
    { id: '1', name: 'Widget', price: 9.99 },
    { id: '2', name: 'Gadget', price: 19.99 },
  ];

  return (
    <GenericList<Product>
      data={products}
      renderItem={(product) => (
        <View>
          <Text>{product.name}</Text>
          <Text>${product.price}</Text>
        </View>
      )}
      keyExtractor={(product) => product.id}
    />
  );
};
```

### Generic Form Field Component

```typescript
interface FormFieldProps<T> {
  name: keyof T;
  value: T[keyof T];
  onChange: (name: keyof T, value: T[keyof T]) => void;
  label: string;
  error?: string;
}

function FormField<T>({
  name,
  value,
  onChange,
  label,
  error,
}: FormFieldProps<T>): React.ReactElement {
  return (
    <View>
      <Text>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(text) => onChange(name, text as T[keyof T])}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

## Common Typing Patterns

### Discriminated Unions for Component Variants

```typescript
type ButtonVariant =
  | { variant: 'primary'; onPress: () => void }
  | { variant: 'secondary'; onPress: () => void }
  | { variant: 'link'; href: string; onPress?: never };

interface BaseButtonProps {
  title: string;
  disabled?: boolean;
}

type ButtonProps = BaseButtonProps & ButtonVariant;

const Button: React.FC<ButtonProps> = (props) => {
  const { title, disabled, variant } = props;

  if (variant === 'link') {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(props.href)}>
        <Text style={styles.link}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={disabled}
      style={variant === 'primary' ? styles.primary : styles.secondary}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};
```

### Extending Native Component Props

```typescript
import { TouchableOpacityProps, TextInputProps } from 'react-native';

interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...touchableProps
}) => {
  return (
    <TouchableOpacity
      style={[styles[variant], style]}
      disabled={disabled || loading}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// Extended TextInput
interface CustomInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  ...inputProps
}) => {
  return (
    <View style={containerStyle}>
      <Text>{label}</Text>
      <TextInput style={inputStyle} {...inputProps} />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
};
```

### Type Guards for Runtime Checking

```typescript
interface TextMessage {
  type: 'text';
  content: string;
}

interface ImageMessage {
  type: 'image';
  uri: string;
  caption?: string;
}

interface VideoMessage {
  type: 'video';
  uri: string;
  duration: number;
}

type Message = TextMessage | ImageMessage | VideoMessage;

// Type guard functions
const isTextMessage = (message: Message): message is TextMessage => {
  return message.type === 'text';
};

const isImageMessage = (message: Message): message is ImageMessage => {
  return message.type === 'image';
};

const isVideoMessage = (message: Message): message is VideoMessage => {
  return message.type === 'video';
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  if (isTextMessage(message)) {
    return <Text>{message.content}</Text>;
  }

  if (isImageMessage(message)) {
    return (
      <View>
        <Image source={{ uri: message.uri }} />
        {message.caption && <Text>{message.caption}</Text>}
      </View>
    );
  }

  if (isVideoMessage(message)) {
    return (
      <View>
        <Video source={{ uri: message.uri }} />
        <Text>Duration: {message.duration}s</Text>
      </View>
    );
  }

  return null;
};
```

### Context with TypeScript

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      // API call here
      const userData: User = { id: '1', name: 'John', email };
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook with type safety
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Conclusion

TypeScript transforms React Native development by providing comprehensive type safety throughout your application. By properly typing your props, state, and hooks, you create more maintainable, self-documenting code that catches errors before they reach production.

Key takeaways:

1. **Always type your props interfaces** - Even for simple components, explicit typing prevents bugs
2. **Use discriminated unions** - They make impossible states impossible
3. **Leverage generics** - Create reusable, type-safe components
4. **Type your hooks explicitly** - Especially for complex state objects
5. **Extend native props** - Get type safety while keeping native functionality
6. **Use type guards** - For runtime type checking with compile-time guarantees

As your React Native application grows, these TypeScript patterns will save countless hours of debugging and make your codebase more approachable for new team members. Start small, be consistent, and gradually adopt more advanced patterns as your comfort with TypeScript increases.

The investment in learning TypeScript for React Native pays dividends in code quality, developer experience, and application reliability. Happy coding!
