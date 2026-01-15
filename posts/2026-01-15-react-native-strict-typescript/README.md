# How to Set Up Strict TypeScript Configuration for React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TypeScript, Configuration, Type Safety, Mobile Development, Best Practices

Description: Learn how to configure strict TypeScript settings in React Native projects for maximum type safety and better code quality.

---

TypeScript has become the de facto standard for building robust React Native applications. While the default TypeScript configuration provides basic type checking, enabling strict mode unlocks the full potential of TypeScript's type system, catching bugs at compile time that would otherwise surface at runtime. This comprehensive guide walks you through setting up a strict TypeScript configuration for your React Native project.

## Understanding Default vs Strict TypeScript

When you initialize a new React Native project with TypeScript, you get a basic `tsconfig.json` that provides minimal type checking. This default configuration is permissive, allowing many patterns that could lead to runtime errors.

### Default TypeScript Behavior

```typescript
// With default settings, this compiles without errors
function greetUser(user) {
  // user is implicitly 'any'
  return `Hello, ${user.name}`;
}

// This could crash at runtime if user is null
const message = greetUser(null);
```

### Strict TypeScript Behavior

```typescript
// With strict mode, TypeScript requires explicit types
function greetUser(user: User | null): string {
  if (!user) {
    return 'Hello, Guest';
  }
  return `Hello, ${user.name}`;
}

// Now we're forced to handle null cases properly
const message = greetUser(null); // Returns "Hello, Guest"
```

The difference is substantial. Strict mode transforms TypeScript from a helpful suggestion system into a powerful guardian of your codebase.

## Recommended Strict Options

TypeScript's strict mode is actually a collection of individual flags. Let's examine each one and understand why it matters for React Native development.

### The `strict` Flag

The `strict` flag is a shorthand that enables all strict type-checking options at once:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This single flag enables:
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitThis`
- `alwaysStrict`
- `useUnknownInCatchVariables`

### Additional Strict Options Beyond `strict: true`

While `strict: true` covers the basics, you should also consider these additional options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Complete tsconfig.json Configuration

Here's a comprehensive `tsconfig.json` configuration optimized for React Native projects:

```json
{
  "compilerOptions": {
    // Target and Module Settings
    "target": "esnext",
    "module": "commonjs",
    "lib": ["es2022"],
    "jsx": "react-native",

    // Strict Type-Checking Options
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module Resolution Options
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@assets/*": ["src/assets/*"],
      "@navigation/*": ["src/navigation/*"]
    },

    // Output Options
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",

    // Additional Options
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "allowJs": false,
    "noEmit": true
  },
  "include": ["src/**/*", "App.tsx", "index.js"],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx"
  ]
}
```

## The Importance of strictNullChecks

The `strictNullChecks` option is arguably the most impactful strict flag. Without it, `null` and `undefined` are assignable to any type, which is a common source of runtime crashes in React Native apps.

### Without strictNullChecks

```typescript
// This compiles but will crash at runtime
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserEmail(user: User): string {
  return user.email.toLowerCase(); // Could crash if user is null
}

// Later in your component
const user = users.find(u => u.id === id); // Returns User | undefined
const email = getUserEmail(user); // No error, but will crash if user not found
```

### With strictNullChecks

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserEmail(user: User | null | undefined): string {
  if (!user) {
    return '';
  }
  return user.email.toLowerCase();
}

// Or use optional chaining and nullish coalescing
function getUserEmailSafe(user: User | null | undefined): string {
  return user?.email?.toLowerCase() ?? '';
}

// The compiler now forces proper null handling
const user = users.find(u => u.id === id); // Returns User | undefined
const email = getUserEmail(user); // Works correctly
```

### Real-World React Native Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ProfileScreenProps {
  userId: string;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userId }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data: Profile = await response.json();
        setProfile(data);
      } catch (err) {
        // With useUnknownInCatchVariables, err is unknown, not any
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  // TypeScript knows profile could still be null here
  if (!profile) {
    return <Text>No profile found</Text>;
  }

  // Now TypeScript knows profile is definitely not null
  return (
    <View>
      <Text>{profile.displayName}</Text>
      {profile.avatarUrl && <Image source={{ uri: profile.avatarUrl }} />}
    </View>
  );
};
```

## Understanding noImplicitAny

The `noImplicitAny` flag prevents TypeScript from silently inferring the `any` type when it cannot determine a more specific type. This is crucial for maintaining type safety.

### Without noImplicitAny

```typescript
// TypeScript silently infers 'any' for parameters
function processData(data) {
  // data is 'any' - no type checking happens
  return data.map(item => item.value);
}

// No errors, but no type safety either
processData('not an array'); // Runtime error
```

### With noImplicitAny

```typescript
// TypeScript requires explicit type annotation
interface DataItem {
  id: string;
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}

// Now this is caught at compile time
processData('not an array'); // Error: Argument of type 'string' is not assignable
```

### Handling Event Handlers in React Native

```typescript
import React from 'react';
import { TextInput, TouchableOpacity, GestureResponderEvent } from 'react-native';

interface FormProps {
  onSubmit: (data: FormData) => void;
}

interface FormData {
  email: string;
  password: string;
}

const LoginForm: React.FC<FormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Without noImplicitAny, 'e' would be 'any'
  // With noImplicitAny, we must specify the type
  const handleEmailChange = (text: string): void => {
    setEmail(text);
  };

  const handlePasswordChange = (text: string): void => {
    setPassword(text);
  };

  const handleSubmit = (event: GestureResponderEvent): void => {
    event.preventDefault?.();
    onSubmit({ email, password });
  };

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={handleEmailChange}
        placeholder="Email"
        keyboardType="email-address"
      />
      <TextInput
        value={password}
        onChangeText={handlePasswordChange}
        placeholder="Password"
        secureTextEntry
      />
      <TouchableOpacity onPress={handleSubmit}>
        <Text>Login</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## strictFunctionTypes Explained

The `strictFunctionTypes` flag enables contravariant checking for function parameter types. This prevents subtle bugs when working with callbacks and event handlers.

### Understanding Contravariance

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// A function that accepts Animal
type AnimalHandler = (animal: Animal) => void;

// A function that accepts Dog
type DogHandler = (dog: Dog) => void;

// Without strictFunctionTypes, this would be allowed (unsafely)
// With strictFunctionTypes, this is an error
const handleAnimal: AnimalHandler = (animal: Animal) => {
  console.log(animal.name);
};

const handleDog: DogHandler = (dog: Dog) => {
  console.log(dog.breed); // Requires Dog, not just Animal
};

// This is the problematic assignment that strictFunctionTypes catches
const unsafeHandler: AnimalHandler = handleDog; // Error with strictFunctionTypes
```

### Practical React Native Example

```typescript
import React from 'react';
import { FlatList, ListRenderItem } from 'react-native';

interface BaseItem {
  id: string;
}

interface ProductItem extends BaseItem {
  name: string;
  price: number;
}

interface ServiceItem extends BaseItem {
  name: string;
  hourlyRate: number;
}

// With strictFunctionTypes, you can't pass a ProductItem renderer
// to a function expecting a BaseItem renderer
const renderProduct: ListRenderItem<ProductItem> = ({ item }) => (
  <View>
    <Text>{item.name}</Text>
    <Text>${item.price}</Text>
  </View>
);

const renderService: ListRenderItem<ServiceItem> = ({ item }) => (
  <View>
    <Text>{item.name}</Text>
    <Text>${item.hourlyRate}/hr</Text>
  </View>
);

// Type-safe component that accepts the correct renderer
interface ItemListProps<T extends BaseItem> {
  items: T[];
  renderItem: ListRenderItem<T>;
}

function ItemList<T extends BaseItem>({ items, renderItem }: ItemListProps<T>) {
  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
}

// Usage is type-safe
const ProductList: React.FC<{ products: ProductItem[] }> = ({ products }) => (
  <ItemList items={products} renderItem={renderProduct} />
);

const ServiceList: React.FC<{ services: ServiceItem[] }> = ({ services }) => (
  <ItemList items={services} renderItem={renderService} />
);
```

## ESLint TypeScript Rules

Combining TypeScript strict mode with ESLint provides an additional layer of code quality enforcement. Here's a recommended ESLint configuration for React Native with TypeScript:

### Installing Dependencies

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-native
```

### ESLint Configuration (.eslintrc.js)

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    // React-specific rules
    'react/prop-types': 'off', // Not needed with TypeScript
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native specific rules
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

## Path Aliases with TypeScript

Path aliases improve code readability and maintainability by replacing relative imports with absolute paths. Here's how to set them up properly in React Native.

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@assets/*": ["src/assets/*"],
      "@navigation/*": ["src/navigation/*"],
      "@store/*": ["src/store/*"],
      "@constants/*": ["src/constants/*"]
    }
  }
}
```

### Babel Configuration (babel.config.js)

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@services': './src/services',
          '@types': './src/types',
          '@assets': './src/assets',
          '@navigation': './src/navigation',
          '@store': './src/store',
          '@constants': './src/constants',
        },
      },
    ],
  ],
};
```

### Using Path Aliases

```typescript
// Before (relative imports)
import { Button } from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { UserService } from '../../../services/UserService';
import type { User } from '../../../types/user';

// After (path aliases)
import { Button } from '@components/Button';
import { useAuth } from '@hooks/useAuth';
import { UserService } from '@services/UserService';
import type { User } from '@types/user';
```

## Declaration Files for Third-Party Libraries

Many JavaScript libraries don't include TypeScript type definitions. Here's how to handle them in a strict TypeScript project.

### Installing Type Definitions

```bash
# Many popular libraries have community-maintained types
npm install --save-dev @types/react @types/react-native @types/lodash
```

### Creating Custom Declaration Files

For libraries without available type definitions, create your own:

```typescript
// src/types/declarations/react-native-custom-library.d.ts
declare module 'react-native-custom-library' {
  import type { ViewProps } from 'react-native';

  export interface CustomComponentProps extends ViewProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }

  export const CustomComponent: React.FC<CustomComponentProps>;

  export function initializeLibrary(config: {
    apiKey: string;
    environment: 'development' | 'production';
  }): Promise<void>;

  export default CustomComponent;
}
```

### Extending Existing Type Definitions

```typescript
// src/types/declarations/react-native-extensions.d.ts
import 'react-native';

declare module 'react-native' {
  interface TextStyle {
    // Add custom font family types
    fontFamily?: 'Roboto' | 'Roboto-Bold' | 'Roboto-Light' | 'OpenSans' | 'OpenSans-Bold';
  }

  interface ViewStyle {
    // Add custom elevation for Android
    elevation?: number;
  }
}
```

### Global Type Declarations

```typescript
// src/types/declarations/global.d.ts
declare global {
  // Extend the global namespace
  interface Window {
    __DEV__: boolean;
  }

  // Add type definitions for environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      API_URL: string;
      API_KEY: string;
    }
  }
}

// Make this a module
export {};
```

### Image and Asset Declarations

```typescript
// src/types/declarations/assets.d.ts
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.json' {
  const content: Record<string, unknown>;
  export default content;
}
```

## Gradual Strict Migration Strategy

Migrating an existing React Native project to strict TypeScript can be overwhelming. Here's a step-by-step approach:

### Phase 1: Enable Individual Strict Flags

Start by enabling one flag at a time:

```json
{
  "compilerOptions": {
    // Start with the least disruptive
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictBindCallApply": true
  }
}
```

### Phase 2: Add Null Checks

```json
{
  "compilerOptions": {
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictBindCallApply": true,
    // Add null checks
    "strictNullChecks": true
  }
}
```

### Phase 3: Eliminate Implicit Any

```json
{
  "compilerOptions": {
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictBindCallApply": true,
    "strictNullChecks": true,
    // Add implicit any checks
    "noImplicitAny": true
  }
}
```

### Phase 4: Full Strict Mode

```json
{
  "compilerOptions": {
    // Replace individual flags with strict
    "strict": true,
    // Add additional strict options
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Using TypeScript's Skip Checking for Gradual Migration

```typescript
// Temporarily suppress errors in specific files during migration
// @ts-nocheck - Disables all type checking for the entire file
// Use sparingly and remove once the file is properly typed

// For individual lines
// @ts-ignore - Ignores the next line (not recommended)
// @ts-expect-error - Better alternative, fails if there's no error

// Example usage during migration
function legacyFunction(data) {
  // @ts-expect-error - TODO: Add proper types during migration
  return data.map(item => item.value);
}
```

## Common Strict Mode Errors and Solutions

### Error: Object is possibly 'undefined'

```typescript
// Error
const user = users.find(u => u.id === id);
console.log(user.name); // Object is possibly 'undefined'

// Solution 1: Optional chaining
console.log(user?.name);

// Solution 2: Null check
if (user) {
  console.log(user.name);
}

// Solution 3: Non-null assertion (use sparingly)
console.log(user!.name); // Only if you're certain it exists
```

### Error: Parameter implicitly has 'any' type

```typescript
// Error
const handlePress = (event) => { // Parameter 'event' implicitly has an 'any' type
  console.log(event.nativeEvent);
};

// Solution: Add explicit type
import type { GestureResponderEvent } from 'react-native';

const handlePress = (event: GestureResponderEvent): void => {
  console.log(event.nativeEvent);
};
```

### Error: Property does not exist on type

```typescript
// Error
interface User {
  id: string;
  name: string;
}

const user: User = { id: '1', name: 'John' };
console.log(user.email); // Property 'email' does not exist on type 'User'

// Solution 1: Add the property to the interface
interface User {
  id: string;
  name: string;
  email?: string;
}

// Solution 2: Use type narrowing
interface UserWithEmail extends User {
  email: string;
}

function isUserWithEmail(user: User): user is UserWithEmail {
  return 'email' in user && typeof user.email === 'string';
}

if (isUserWithEmail(user)) {
  console.log(user.email); // Now TypeScript knows email exists
}
```

### Error: Type 'string | undefined' is not assignable to type 'string'

```typescript
// Error
const config: Record<string, string> = {};
const value: string = config['key']; // With noUncheckedIndexedAccess

// Solution 1: Handle undefined
const value: string = config['key'] ?? 'default';

// Solution 2: Use type assertion (when you're certain)
const value: string = config['key'] as string;

// Solution 3: Null check
const value = config['key'];
if (value !== undefined) {
  // value is string here
}
```

## Best Practices for Types in React Native

### 1. Use Type Imports

```typescript
// Prefer type imports for types-only imports
import type { FC, ReactNode } from 'react';
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native';

// Regular imports for values
import { View, Text, StyleSheet } from 'react-native';
```

### 2. Define Prop Types Explicitly

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: ReactNode;
}

const Button: FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
}) => {
  // Implementation
};
```

### 3. Use Discriminated Unions for State

```typescript
interface LoadingState {
  status: 'loading';
}

interface SuccessState<T> {
  status: 'success';
  data: T;
}

interface ErrorState {
  status: 'error';
  error: string;
}

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

// Usage
const [state, setState] = useState<AsyncState<User>>({ status: 'loading' });

// Type narrowing works automatically
if (state.status === 'success') {
  console.log(state.data.name); // TypeScript knows data exists
}
```

### 4. Create Reusable Type Utilities

```typescript
// src/types/utils.ts

// Make all properties required
type RequiredProps<T> = {
  [P in keyof T]-?: T[P];
};

// Make specific properties required
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Extract non-nullable type
type NonNullableProps<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

// Create async function type
type AsyncFunction<T, R> = (arg: T) => Promise<R>;

// Navigation params helper
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: { section?: string };
};

// Screen props helper
type ScreenProps<T extends keyof RootStackParamList> = {
  route: { params: RootStackParamList[T] };
  navigation: NavigationProp<RootStackParamList>;
};
```

### 5. Document Complex Types

```typescript
/**
 * Represents a user in the system.
 * @property id - Unique identifier for the user
 * @property email - User's email address (must be unique)
 * @property profile - Optional profile information
 */
interface User {
  readonly id: string;
  email: string;
  profile?: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile containing personal information.
 * All fields are optional as users may not complete their profile.
 */
interface UserProfile {
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string;
  location?: string;
  socialLinks?: SocialLinks;
}
```

### 6. Use Const Assertions for Literal Types

```typescript
// Define constants with const assertion
const THEME_COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
} as const;

// Type is automatically inferred as literal union
type ThemeColor = typeof THEME_COLORS[keyof typeof THEME_COLORS];
// Result: '#007AFF' | '#5856D6' | '#34C759' | '#FF9500' | '#FF3B30'

// Define routes with const assertion
const ROUTES = ['Home', 'Profile', 'Settings', 'Notifications'] as const;
type Route = typeof ROUTES[number];
// Result: 'Home' | 'Profile' | 'Settings' | 'Notifications'
```

## Conclusion

Setting up strict TypeScript configuration in your React Native project is an investment that pays dividends throughout the lifecycle of your application. While the initial setup and migration require effort, the benefits are substantial:

- **Catch bugs at compile time** rather than runtime
- **Improved code documentation** through explicit types
- **Better IDE support** with accurate autocompletion and refactoring
- **Easier maintenance** as the codebase grows
- **Confident refactoring** knowing TypeScript will catch breaking changes

Start with the basic strict configuration, gradually add more strict options, and establish consistent patterns across your team. The type safety and developer experience improvements will make your React Native development more productive and your applications more reliable.

Remember that strict TypeScript is not about making development harder; it is about making your code more predictable and your applications more robust. Embrace the compiler as your ally in building high-quality React Native applications.
