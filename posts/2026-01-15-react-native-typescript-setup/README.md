# How to Set Up a Production-Ready React Native Project with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TypeScript, Mobile Development, iOS, Android, Project Setup

Description: Learn how to set up a production-ready React Native project with TypeScript, including proper configuration, ESLint, Prettier, and essential tooling.

---

Setting up a React Native project for production goes far beyond running `npx react-native init`. A truly production-ready setup requires careful consideration of type safety, code quality, testing, performance, and developer experience. In this comprehensive guide, we'll walk through every step of creating a React Native project with TypeScript that's ready for the real world.

## Table of Contents

1. [Creating a New React Native Project with TypeScript](#creating-a-new-react-native-project-with-typescript)
2. [TypeScript Configuration](#typescript-configuration)
3. [ESLint and Prettier Setup](#eslint-and-prettier-setup)
4. [Path Aliases Configuration](#path-aliases-configuration)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Directory Structure Best Practices](#directory-structure-best-practices)
7. [Setting Up Debugging Tools](#setting-up-debugging-tools)
8. [Absolute Imports Configuration](#absolute-imports-configuration)
9. [Testing Setup with Jest](#testing-setup-with-jest)
10. [CI/CD Considerations](#cicd-considerations)
11. [Performance Optimization from Start](#performance-optimization-from-start)
12. [Essential Dependencies](#essential-dependencies)

---

## Creating a New React Native Project with TypeScript

The React Native CLI now includes excellent TypeScript support out of the box. Let's start by creating a new project with the TypeScript template:

```bash
# Using the React Native CLI with TypeScript template
npx react-native@latest init MyProductionApp --template react-native-template-typescript

# Navigate to your project
cd MyProductionApp
```

Alternatively, if you prefer Expo for managed workflow:

```bash
# Using Expo with TypeScript
npx create-expo-app@latest MyProductionApp --template expo-template-blank-typescript

cd MyProductionApp
```

After initialization, verify your setup by running:

```bash
# For iOS (macOS only)
npx react-native run-ios

# For Android
npx react-native run-android
```

### Initial Project Cleanup

Remove unnecessary boilerplate from the generated project:

```typescript
// App.tsx - Clean starting point
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

const App: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        <Text style={styles.title}>MyProductionApp</Text>
        <Text style={styles.subtitle}>Production-Ready React Native</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});

export default App;
```

---

## TypeScript Configuration

A proper `tsconfig.json` is crucial for a production React Native app. Here's an optimized configuration:

```json
{
  "compilerOptions": {
    // Target and Module
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "jsx": "react-native",

    // Module Resolution
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,

    // Type Checking - Strict Mode
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@constants/*": ["src/constants/*"],
      "@assets/*": ["src/assets/*"],
      "@navigation/*": ["src/navigation/*"],
      "@store/*": ["src/store/*"]
    },

    // Output
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowJs": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Other
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": false
  },
  "include": [
    "src/**/*",
    "App.tsx",
    "index.js",
    "jest.config.js",
    "babel.config.js",
    "metro.config.js",
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js",
    "android",
    "ios",
    "coverage",
    "*.config.js"
  ]
}
```

### Creating Type Definitions

Create a global types file for custom type definitions:

```typescript
// src/types/global.d.ts
declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.jpg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.jpeg' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.gif' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Environment variables type augmentation
declare module '@env' {
  export const API_URL: string;
  export const API_KEY: string;
  export const ENV: 'development' | 'staging' | 'production';
  export const DEBUG_MODE: string;
}
```

---

## ESLint and Prettier Setup

A robust linting setup ensures code quality and consistency across your team.

### Install Dependencies

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-native \
  eslint-plugin-import eslint-plugin-prettier eslint-config-prettier \
  prettier @trivago/prettier-plugin-sort-imports
```

### ESLint Configuration

Create `.eslintrc.js`:

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ],
  env: {
    'react-native/react-native': true,
    es2020: true,
    node: true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // React rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': [
      'error',
      { props: 'never', children: 'never' },
    ],
    'react/self-closing-comp': 'error',
    'react/jsx-sort-props': [
      'warn',
      {
        callbacksLast: true,
        shorthandFirst: true,
        ignoreCase: true,
        reservedFirst: true,
      },
    ],

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native rules
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off',
    'react-native/no-single-element-style-arrays': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
        pathGroups: [
          { pattern: 'react', group: 'builtin', position: 'before' },
          { pattern: 'react-native', group: 'builtin', position: 'before' },
          { pattern: '@/**', group: 'internal' },
        ],
        pathGroupsExcludedImportTypes: ['react', 'react-native'],
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-duplicates': 'error',

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],

    // Prettier
    'prettier/prettier': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    '*.config.js',
    'metro.config.js',
    'babel.config.js',
  ],
};
```

### Prettier Configuration

Create `.prettierrc.js`:

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: [
    '^react$',
    '^react-native$',
    '<THIRD_PARTY_MODULES>',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
```

Create `.prettierignore`:

```
node_modules/
android/
ios/
coverage/
.expo/
*.lock
```

### Add Scripts to package.json

```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json}\"",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint && npm run format:check"
  }
}
```

---

## Path Aliases Configuration

Path aliases improve code readability and make refactoring easier. We've already configured them in `tsconfig.json`, but we also need to configure Babel and Metro.

### Babel Configuration

Install the module resolver plugin:

```bash
npm install -D babel-plugin-module-resolver
```

Update `babel.config.js`:

```javascript
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: [
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.jsx',
          '.js',
          '.json',
        ],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@services': './src/services',
          '@types': './src/types',
          '@constants': './src/constants',
          '@assets': './src/assets',
          '@navigation': './src/navigation',
          '@store': './src/store',
        },
      },
    ],
  ],
};
```

### Metro Configuration

Update `metro.config.js` for better path resolution:

```javascript
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  watchFolders: [path.resolve(__dirname, 'src')],
};

module.exports = mergeConfig(defaultConfig, config);
```

---

## Environment Variables Setup

Managing environment variables securely is essential for production apps.

### Install react-native-dotenv

```bash
npm install react-native-dotenv
npm install -D @types/react-native-dotenv
```

### Configure Babel

Add to `babel.config.js`:

```javascript
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        blocklist: null,
        allowlist: null,
        safe: true,
        allowUndefined: false,
        verbose: false,
      },
    ],
    // ... other plugins
  ],
};
```

### Create Environment Files

Create `.env`, `.env.development`, `.env.staging`, and `.env.production`:

```bash
# .env.development
API_URL=https://dev-api.myapp.com
API_KEY=dev_api_key_here
ENV=development
DEBUG_MODE=true

# .env.staging
API_URL=https://staging-api.myapp.com
API_KEY=staging_api_key_here
ENV=staging
DEBUG_MODE=true

# .env.production
API_URL=https://api.myapp.com
API_KEY=prod_api_key_here
ENV=production
DEBUG_MODE=false
```

### Environment Configuration Service

```typescript
// src/services/config.ts
import { API_KEY, API_URL, DEBUG_MODE, ENV } from '@env';

interface AppConfig {
  apiUrl: string;
  apiKey: string;
  env: 'development' | 'staging' | 'production';
  isDebug: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const config: AppConfig = {
  apiUrl: API_URL,
  apiKey: API_KEY,
  env: ENV,
  isDebug: DEBUG_MODE === 'true',
  isDevelopment: ENV === 'development',
  isProduction: ENV === 'production',
};

// Validate required environment variables
const requiredEnvVars = ['API_URL', 'API_KEY', 'ENV'] as const;

export const validateEnv = (): void => {
  const missing: string[] = [];

  if (!API_URL) missing.push('API_URL');
  if (!API_KEY) missing.push('API_KEY');
  if (!ENV) missing.push('ENV');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
};
```

Add `.env*` to `.gitignore`:

```
# Environment files
.env
.env.local
.env.development
.env.staging
.env.production
```

Create `.env.example` for reference:

```bash
# .env.example
API_URL=https://api.example.com
API_KEY=your_api_key_here
ENV=development
DEBUG_MODE=true
```

---

## Directory Structure Best Practices

A well-organized directory structure makes your codebase maintainable and scalable.

```
MyProductionApp/
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   ├── images/
│   │   └── icons/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.styles.ts
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   └── index.ts
│   │   └── specific/
│   │       └── ProductCard/
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useDebounce.ts
│   │   └── index.ts
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── index.ts
│   │   ├── Home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── index.ts
│   │   └── Profile/
│   │       ├── ProfileScreen.tsx
│   │       └── index.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── index.ts
│   │   ├── storage/
│   │   │   ├── asyncStorage.ts
│   │   │   └── secureStorage.ts
│   │   └── config.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── index.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── navigation.ts
│   │   ├── global.d.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── helpers.ts
│   │   └── index.ts
│   └── App.tsx
├── __tests__/
│   └── setup.ts
├── android/
├── ios/
├── .env.example
├── .eslintrc.js
├── .prettierrc.js
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── jest.config.js
└── package.json
```

### Sample Component Structure

```typescript
// src/components/common/Button/Button.tsx
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  ViewStyle,
} from 'react-native';

import { styles } from './Button.styles';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = memo(
  ({
    title,
    variant = 'primary',
    size = 'medium',
    isLoading = false,
    isDisabled = false,
    leftIcon,
    rightIcon,
    style,
    ...pressableProps
  }) => {
    const disabled = isDisabled || isLoading;

    return (
      <Pressable
        {...pressableProps}
        disabled={disabled}
        style={({ pressed }) => [
          styles.container,
          styles[variant],
          styles[size],
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#ffffff' : '#007AFF'}
            size="small"
          />
        ) : (
          <>
            {leftIcon}
            <Text
              style={[
                styles.text,
                styles[`${variant}Text`],
                styles[`${size}Text`],
              ]}
            >
              {title}
            </Text>
            {rightIcon}
          </>
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
```

```typescript
// src/components/common/Button/Button.styles.ts
import { StyleSheet } from 'react-native';

import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: spacing.sm,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
  },
  medium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },

  // States
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#ffffff',
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
```

```typescript
// src/components/common/Button/index.ts
export { Button } from './Button';
```

---

## Setting Up Debugging Tools

### Install Flipper and Reactotron

```bash
# Flipper is built into React Native CLI apps
# For Reactotron:
npm install -D reactotron-react-native reactotron-redux
```

### Configure Reactotron

```typescript
// src/services/reactotron.ts
import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { config } from './config';

declare global {
  interface Console {
    tron: typeof Reactotron;
  }
}

const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage)
  .configure({
    name: 'MyProductionApp',
    host: 'localhost',
  })
  .useReactNative({
    asyncStorage: true,
    networking: {
      ignoreUrls: /symbolicate/,
    },
    editor: true,
    errors: { veto: () => false },
    overlay: true,
  })
  .use(reactotronRedux())
  .connect();

// Extend console for easy logging
console.tron = reactotron;

export default reactotron;

// Initialize only in development
export const initReactotron = (): void => {
  if (config.isDevelopment) {
    // eslint-disable-next-line no-console
    console.log('Reactotron Configured');
  }
};
```

### Error Boundary Component

```typescript
// src/components/common/ErrorBoundary/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { config } from '@services/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to crash reporting service
    if (config.isProduction) {
      // Crashlytics.recordError(error);
    }

    this.props.onError?.(error, errorInfo);

    if (config.isDevelopment) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry for the inconvenience. Please try again.
          </Text>
          {config.isDevelopment && this.state.error && (
            <Text style={styles.errorText}>
              {this.state.error.toString()}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Absolute Imports Configuration

We've already configured absolute imports in the TypeScript, Babel, and Metro configurations. Here's how to use them:

```typescript
// Instead of relative imports like this:
import { Button } from '../../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../../constants/colors';

// Use absolute imports like this:
import { Button } from '@components/common/Button';
import { useAuth } from '@hooks/useAuth';
import { colors } from '@constants/colors';
```

### VSCode Configuration

Create `.vscode/settings.json` for better IDE support:

```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.paths": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Testing Setup with Jest

React Native comes with Jest pre-configured, but we need to enhance it for production use.

### Install Additional Testing Dependencies

```bash
npm install -D @testing-library/react-native @testing-library/jest-native \
  jest-expo @types/jest ts-jest msw
```

### Jest Configuration

Create `jest.config.js`:

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.styles.ts',
    '!src/**/index.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
```

### Test Setup File

```typescript
// __tests__/setup.ts
import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock environment variables
jest.mock('@env', () => ({
  API_URL: 'https://test-api.example.com',
  API_KEY: 'test-api-key',
  ENV: 'development',
  DEBUG_MODE: 'true',
}));

// Silence console during tests (optional)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// Global test timeout
jest.setTimeout(10000);
```

### Sample Test File

```typescript
// src/components/common/Button/Button.test.tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

describe('Button', () => {
  it('renders correctly with title', () => {
    render(<Button title="Click me" />);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    render(<Button title="Click me" onPress={onPressMock} />);

    fireEvent.press(screen.getByText('Click me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<Button isLoading title="Click me" />);
    expect(screen.queryByText('Click me')).toBeNull();
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('is disabled when isDisabled is true', () => {
    const onPressMock = jest.fn();
    render(<Button isDisabled title="Click me" onPress={onPressMock} />);

    fireEvent.press(screen.getByText('Click me'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('applies correct styles for different variants', () => {
    const { rerender } = render(<Button title="Primary" variant="primary" />);
    expect(screen.getByText('Primary')).toBeTruthy();

    rerender(<Button title="Secondary" variant="secondary" />);
    expect(screen.getByText('Secondary')).toBeTruthy();

    rerender(<Button title="Outline" variant="outline" />);
    expect(screen.getByText('Outline')).toBeTruthy();
  });
});
```

### Add Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## CI/CD Considerations

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npm run typecheck

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  build-android:
    needs: lint-and-test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Build Android Release
        run: |
          cd android
          ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk

  build-ios:
    needs: lint-and-test
    runs-on: macos-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install CocoaPods
        run: |
          cd ios
          pod install

      - name: Build iOS
        run: |
          xcodebuild -workspace ios/MyProductionApp.xcworkspace \
            -scheme MyProductionApp \
            -configuration Release \
            -sdk iphonesimulator \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            build
```

### Fastlane Integration

Create `fastlane/Fastfile`:

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and deploy to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "ios/MyProductionApp.xcodeproj")

    build_app(
      workspace: "ios/MyProductionApp.xcworkspace",
      scheme: "MyProductionApp",
      export_method: "app-store"
    )

    upload_to_testflight(skip_waiting_for_build_processing: true)
  end

  desc "Build and deploy to App Store"
  lane :release do
    build_app(
      workspace: "ios/MyProductionApp.xcworkspace",
      scheme: "MyProductionApp",
      export_method: "app-store"
    )

    upload_to_app_store(
      skip_metadata: false,
      skip_screenshots: false
    )
  end
end

platform :android do
  desc "Build and deploy to Play Store Internal"
  lane :beta do
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android/"
    )

    upload_to_play_store(
      track: "internal",
      aab: "android/app/build/outputs/bundle/release/app-release.aab"
    )
  end

  desc "Build and deploy to Play Store Production"
  lane :release do
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android/"
    )

    upload_to_play_store(
      track: "production",
      aab: "android/app/build/outputs/bundle/release/app-release.aab"
    )
  end
end
```

---

## Performance Optimization from Start

### Enable Hermes Engine

Hermes is enabled by default in new React Native projects, but verify it:

```javascript
// android/gradle.properties
hermesEnabled=true

// ios/Podfile
:hermes_enabled => true
```

### Optimize Images

Install and configure image optimization:

```bash
npm install react-native-fast-image
```

```typescript
// src/components/common/OptimizedImage/OptimizedImage.tsx
import React, { memo } from 'react';
import FastImage, { FastImageProps, Priority } from 'react-native-fast-image';

interface OptimizedImageProps extends Omit<FastImageProps, 'priority'> {
  priority?: 'low' | 'normal' | 'high';
}

const priorityMap: Record<string, Priority> = {
  low: FastImage.priority.low,
  normal: FastImage.priority.normal,
  high: FastImage.priority.high,
};

export const OptimizedImage: React.FC<OptimizedImageProps> = memo(
  ({ priority = 'normal', ...props }) => {
    return (
      <FastImage
        {...props}
        resizeMode={FastImage.resizeMode.cover}
        source={{
          ...props.source,
          priority: priorityMap[priority],
          cache: FastImage.cacheControl.immutable,
        }}
      />
    );
  },
);

OptimizedImage.displayName = 'OptimizedImage';
```

### Memoization Utilities

```typescript
// src/utils/performance.ts
import { useCallback, useMemo, useRef } from 'react';

// Deep comparison for memoization
export const useDeepMemo = <T>(factory: () => T, deps: unknown[]): T => {
  const ref = useRef<{ deps: unknown[]; value: T } | null>(null);

  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
};

// Stable callback that doesn't change reference
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
): T => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    [],
  );
};

// Deep equality check
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
};
```

### List Performance with FlashList

```bash
npm install @shopify/flash-list
```

```typescript
// src/components/common/OptimizedList/OptimizedList.tsx
import React from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';

interface OptimizedListProps<T> extends FlashListProps<T> {
  estimatedItemSize?: number;
}

export function OptimizedList<T>({
  estimatedItemSize = 50,
  ...props
}: OptimizedListProps<T>): React.ReactElement {
  return (
    <FlashList
      {...props}
      estimatedItemSize={estimatedItemSize}
      drawDistance={250}
    />
  );
}
```

### Enable RAM Bundle for Android

```gradle
// android/app/build.gradle
project.ext.react = [
    enableHermes: true,
    bundleCommand: "ram-bundle",
]
```

---

## Essential Dependencies

Here's a curated list of production-ready dependencies:

```json
{
  "dependencies": {
    // Navigation
    "@react-navigation/native": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "react-native-screens": "^3.x",
    "react-native-safe-area-context": "^4.x",

    // State Management
    "@reduxjs/toolkit": "^2.x",
    "react-redux": "^9.x",
    "redux-persist": "^6.x",

    // Data Fetching
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",

    // Storage
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-keychain": "^8.x",

    // UI Components
    "react-native-gesture-handler": "^2.x",
    "react-native-reanimated": "^3.x",
    "react-native-svg": "^15.x",

    // Performance
    "@shopify/flash-list": "^1.x",
    "react-native-fast-image": "^8.x",

    // Forms
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",

    // Utilities
    "date-fns": "^3.x",
    "lodash": "^4.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-native": "^0.73.x",

    // Linting & Formatting
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^7.x",
    "@typescript-eslint/parser": "^7.x",
    "prettier": "^3.x",

    // Testing
    "jest": "^29.x",
    "@testing-library/react-native": "^12.x",
    "@testing-library/jest-native": "^5.x",

    // Build Tools
    "babel-plugin-module-resolver": "^5.x",
    "react-native-dotenv": "^3.x"
  }
}
```

### Install Script

```bash
# Core Navigation
npm install @react-navigation/native @react-navigation/native-stack \
  @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context

# State Management
npm install @reduxjs/toolkit react-redux redux-persist

# Data Fetching
npm install @tanstack/react-query axios

# Storage
npm install @react-native-async-storage/async-storage react-native-keychain

# UI
npm install react-native-gesture-handler react-native-reanimated react-native-svg

# Performance
npm install @shopify/flash-list react-native-fast-image

# Forms
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns lodash uuid
npm install -D @types/lodash @types/uuid
```

---

## Final Checklist

Before shipping to production, ensure you've completed:

- [ ] TypeScript strict mode enabled
- [ ] ESLint and Prettier configured and passing
- [ ] Path aliases working in TypeScript, Babel, and Metro
- [ ] Environment variables properly configured
- [ ] Directory structure follows best practices
- [ ] Error boundaries implemented
- [ ] Unit tests with good coverage (70%+)
- [ ] CI/CD pipeline configured
- [ ] Hermes engine enabled
- [ ] List virtualization with FlashList
- [ ] Image optimization with FastImage
- [ ] Proper memoization for performance
- [ ] Security: sensitive data in secure storage
- [ ] Crash reporting service configured
- [ ] Analytics service configured
- [ ] Deep linking configured
- [ ] Push notifications set up
- [ ] App signing configured for both platforms

---

## Conclusion

Setting up a production-ready React Native project with TypeScript requires attention to many details, but the investment pays off significantly in the long run. A well-configured project leads to:

- **Better Developer Experience**: Type safety, code completion, and consistent formatting
- **Higher Code Quality**: Automated linting, testing, and CI/CD pipelines catch issues early
- **Improved Performance**: Proper optimization from the start prevents technical debt
- **Easier Maintenance**: Clear directory structure and absolute imports make navigation simple
- **Faster Onboarding**: New team members can understand and contribute quickly

Remember that this setup is a starting point. As your project grows, you may need to adjust configurations, add new tools, or optimize further. The key is to establish solid foundations that can evolve with your application's needs.

Happy coding, and may your React Native journey be smooth and productive!

---

## Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Testing Library React Native](https://testing-library.com/docs/react-native-testing-library/intro/)
- [Fastlane Documentation](https://docs.fastlane.tools/)
