# How to Set Up Absolute Imports and Path Aliases in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, TypeScript, Path Aliases, Babel, Metro, Configuration

Description: Learn how to configure absolute imports and path aliases in React Native projects to improve code organization and avoid relative import hell.

---

If you have ever worked on a large React Native project, you have probably encountered the dreaded relative import paths that look something like this:

```typescript
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { API_URL } from '../../../../../constants/config';
```

These deeply nested relative imports make your code harder to read, maintain, and refactor. In this comprehensive guide, we will walk through how to set up absolute imports and path aliases in React Native to transform those messy imports into clean, readable ones:

```typescript
import { Button } from '@components/ui/Button';
import { useAuth } from '@hooks/useAuth';
import { API_URL } from '@constants/config';
```

## Table of Contents

1. [Why Use Absolute Imports](#why-use-absolute-imports)
2. [TypeScript Paths Configuration](#typescript-paths-configuration)
3. [Babel Plugin Module Resolver Setup](#babel-plugin-module-resolver-setup)
4. [Metro Bundler Configuration](#metro-bundler-configuration)
5. [Common Alias Patterns](#common-alias-patterns)
6. [IDE and Editor Autocomplete Setup](#ide-and-editor-autocomplete-setup)
7. [Integrating with Jest](#integrating-with-jest)
8. [ESLint Import Resolver](#eslint-import-resolver)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Best Practices for Alias Naming](#best-practices-for-alias-naming)
11. [Migration from Relative Imports](#migration-from-relative-imports)
12. [Monorepo Considerations](#monorepo-considerations)

---

## Why Use Absolute Imports

Before diving into the implementation, let us understand why absolute imports and path aliases are worth the setup effort.

### Improved Readability

Absolute imports make it immediately clear where a module comes from. When you see `@components/Button`, you know it is from your components directory without having to mentally trace through relative paths.

### Easier Refactoring

Moving files around in your project becomes much simpler. With relative imports, renaming or relocating a file means updating all the import paths in that file. With absolute imports, your imports remain unchanged regardless of where the importing file lives.

### Better Developer Experience

Modern IDEs can provide better autocomplete and navigation when path aliases are properly configured. This speeds up development and reduces errors.

### Cleaner Codebase

Consistent import patterns across your team lead to a more maintainable codebase. New team members can quickly understand the project structure by looking at the aliases.

### Reduced Merge Conflicts

Relative imports often change when files move, leading to merge conflicts. Absolute imports are more stable and result in fewer conflicts during collaborative development.

---

## TypeScript Paths Configuration

The first step is configuring TypeScript to understand your path aliases. This is done in your `tsconfig.json` file.

### Basic Setup

Open your `tsconfig.json` and add the `baseUrl` and `paths` options under `compilerOptions`:

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
      "@constants/*": ["src/constants/*"],
      "@assets/*": ["src/assets/*"],
      "@types/*": ["src/types/*"],
      "@navigation/*": ["src/navigation/*"],
      "@store/*": ["src/store/*"],
      "@api/*": ["src/api/*"]
    }
  },
  "extends": "@react-native/typescript-config/tsconfig.json"
}
```

### Understanding the Configuration

- **baseUrl**: Sets the base directory for resolving non-relative module names. Setting it to `"."` means the root of your project.
- **paths**: A mapping of import paths to actual file locations. The `*` acts as a wildcard.

### Complete tsconfig.json Example

Here is a more complete `tsconfig.json` for a React Native project:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "lib": ["es2019"],
    "allowJs": true,
    "jsx": "react-native",
    "noEmit": true,
    "isolatedModules": true,
    "strict": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@constants/*": ["src/constants/*"],
      "@assets/*": ["src/assets/*"],
      "@types/*": ["src/types/*"],
      "@navigation/*": ["src/navigation/*"],
      "@store/*": ["src/store/*"],
      "@api/*": ["src/api/*"],
      "@theme/*": ["src/theme/*"]
    },
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

Note that TypeScript configuration alone only provides type checking and IDE support. The actual module resolution at runtime requires Babel configuration, which we will cover next.

---

## Babel Plugin Module Resolver Setup

React Native uses Babel for transpilation, so we need to configure `babel-plugin-module-resolver` to actually resolve the path aliases at build time.

### Installation

First, install the plugin:

```bash
npm install --save-dev babel-plugin-module-resolver
# or
yarn add --dev babel-plugin-module-resolver
```

### Configuration

Update your `babel.config.js` to include the module resolver plugin:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
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
          '@constants': './src/constants',
          '@assets': './src/assets',
          '@types': './src/types',
          '@navigation': './src/navigation',
          '@store': './src/store',
          '@api': './src/api',
          '@theme': './src/theme',
        },
      },
    ],
  ],
};
```

### Important Configuration Options

- **root**: The root directory for module resolution. Usually your source directory.
- **extensions**: File extensions to consider when resolving modules. The order matters for platform-specific files.
- **alias**: The mapping between alias names and actual paths. Must match your `tsconfig.json` paths.

### Platform-Specific Extensions

React Native has a unique file resolution order. Make sure to include platform-specific extensions:

```javascript
extensions: [
  '.ios.ts',
  '.android.ts',
  '.ts',
  '.ios.tsx',
  '.android.tsx',
  '.tsx',
  '.ios.js',
  '.android.js',
  '.jsx',
  '.js',
  '.json',
],
```

This ensures that `Button.ios.tsx` is resolved correctly on iOS while `Button.android.tsx` is used on Android.

### Clear Metro Cache

After updating Babel configuration, always clear the Metro bundler cache:

```bash
npm start -- --reset-cache
# or
yarn start --reset-cache
# or
npx react-native start --reset-cache
```

---

## Metro Bundler Configuration

While Babel handles the transpilation, Metro is React Native's JavaScript bundler. For most cases, the Babel configuration is sufficient, but you may need to configure Metro for complex setups.

### Basic Metro Configuration

Create or update `metro.config.js`:

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [path.resolve(__dirname, 'src')],
  resolver: {
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@theme': path.resolve(__dirname, 'src/theme'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### When Metro Configuration is Necessary

You typically need explicit Metro configuration when:

1. Working with monorepos
2. Linking to packages outside the project root
3. Using symlinked packages
4. Customizing the bundler behavior

For standard projects, the Babel plugin alone is usually sufficient.

---

## Common Alias Patterns

Establishing consistent alias patterns helps maintain a clean and organized codebase. Here are recommended patterns for React Native projects:

### Standard Project Structure

```
src/
├── api/                 # @api - API clients and endpoints
├── assets/              # @assets - Images, fonts, etc.
├── components/          # @components - Reusable UI components
│   ├── common/          # @components/common - Shared components
│   ├── forms/           # @components/forms - Form components
│   └── ui/              # @components/ui - Basic UI elements
├── constants/           # @constants - App constants
├── hooks/               # @hooks - Custom React hooks
├── navigation/          # @navigation - Navigation configuration
├── screens/             # @screens - Screen components
├── services/            # @services - Business logic services
├── store/               # @store - State management
├── theme/               # @theme - Styling and theming
├── types/               # @types - TypeScript type definitions
└── utils/               # @utils - Utility functions
```

### Recommended Aliases

```json
{
  "@/*": ["src/*"],
  "@api/*": ["src/api/*"],
  "@assets/*": ["src/assets/*"],
  "@components/*": ["src/components/*"],
  "@constants/*": ["src/constants/*"],
  "@hooks/*": ["src/hooks/*"],
  "@navigation/*": ["src/navigation/*"],
  "@screens/*": ["src/screens/*"],
  "@services/*": ["src/services/*"],
  "@store/*": ["src/store/*"],
  "@theme/*": ["src/theme/*"],
  "@types/*": ["src/types/*"],
  "@utils/*": ["src/utils/*"]
}
```

### Feature-Based Aliases

For larger applications, consider feature-based organization:

```json
{
  "@features/*": ["src/features/*"],
  "@features/auth/*": ["src/features/auth/*"],
  "@features/profile/*": ["src/features/profile/*"],
  "@features/settings/*": ["src/features/settings/*"],
  "@shared/*": ["src/shared/*"]
}
```

### Example Usage

```typescript
// Before (relative imports)
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { colors } from '../../../theme/colors';
import { LoginScreen } from '../../../screens/auth/LoginScreen';

// After (absolute imports with aliases)
import { Button } from '@components/ui/Button';
import { useAuth } from '@hooks/useAuth';
import { colors } from '@theme/colors';
import { LoginScreen } from '@screens/auth/LoginScreen';
```

---

## IDE and Editor Autocomplete Setup

Proper IDE configuration ensures you get autocomplete, go-to-definition, and other helpful features with your path aliases.

### VS Code Configuration

VS Code should automatically pick up path aliases from `tsconfig.json`. If not, ensure your workspace settings are correct:

Create or update `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "javascript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.paths": true,
  "javascript.suggest.paths": true
}
```

### VS Code Extensions

Install these helpful extensions:

1. **Path Intellisense** - Autocompletes filenames
2. **TypeScript Hero** - Organizes and manages imports
3. **Auto Import** - Automatically finds and adds imports

### WebStorm and IntelliJ IDEA

JetBrains IDEs should automatically recognize `tsconfig.json` paths. If you experience issues:

1. Go to **Preferences > Languages & Frameworks > TypeScript**
2. Ensure the correct TypeScript version is selected
3. Check **Use tsconfig.json** is enabled

### Sublime Text

For Sublime Text, install the **TypeScript** package and ensure your project has a proper `tsconfig.json`.

### Ensuring Autocomplete Works

If autocomplete is not working:

1. Restart your IDE
2. Ensure `tsconfig.json` is in the project root
3. Check that the TypeScript language server is running
4. Verify paths are correctly configured with no typos

---

## Integrating with Jest

Jest needs its own configuration to understand path aliases for testing.

### Jest Configuration

Update your `jest.config.js`:

```javascript
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
};
```

### Alternative: Using jest-module-name-mapper

To avoid duplication between `tsconfig.json` and Jest config, use `ts-jest` with `pathsToModuleNameMapper`:

```bash
npm install --save-dev ts-jest
```

Then update your Jest config:

```javascript
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'react-native',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  // ... rest of config
};
```

### Testing the Configuration

Create a simple test to verify path aliases work:

```typescript
// src/utils/__tests__/example.test.ts
import { formatDate } from '@utils/formatDate';
import { Button } from '@components/ui/Button';

describe('Path aliases in tests', () => {
  it('should resolve utils alias', () => {
    expect(formatDate).toBeDefined();
  });

  it('should resolve components alias', () => {
    expect(Button).toBeDefined();
  });
});
```

---

## ESLint Import Resolver

Configure ESLint to understand your path aliases and provide proper linting for imports.

### Installation

```bash
npm install --save-dev eslint-plugin-import eslint-import-resolver-typescript eslint-import-resolver-babel-module
```

### ESLint Configuration

Update your `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  plugins: ['import'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      'babel-module': {},
    },
  },
  rules: {
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
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@components/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@screens/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@hooks/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@utils/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/no-duplicates': 'error',
  },
};
```

### Flat Config Format (ESLint 9+)

For newer ESLint versions using flat config:

```javascript
// eslint.config.js
import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      'import/order': ['error', { 'newlines-between': 'always' }],
    },
  },
];
```

---

## Troubleshooting Common Issues

Here are solutions to common problems you might encounter when setting up path aliases.

### Issue 1: Module Not Found Error

**Symptom**: `Unable to resolve module @components/Button`

**Solutions**:

1. Clear Metro cache:
   ```bash
   npx react-native start --reset-cache
   ```

2. Verify Babel config matches tsconfig paths exactly

3. Check file extensions in Babel config

4. Ensure the file actually exists at the specified path

### Issue 2: TypeScript Errors But App Runs

**Symptom**: IDE shows errors but the app compiles and runs

**Solutions**:

1. Restart TypeScript server in VS Code (Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server")

2. Ensure `baseUrl` is set in `tsconfig.json`

3. Check that paths use correct glob patterns (`*` for wildcards)

### Issue 3: Jest Tests Failing

**Symptom**: Tests fail with module resolution errors

**Solutions**:

1. Ensure `moduleNameMapper` in Jest config matches your aliases

2. Check regex patterns in moduleNameMapper are correct

3. Verify Jest is using the correct config file

### Issue 4: Autocomplete Not Working

**Symptom**: IDE does not suggest path aliases

**Solutions**:

1. Ensure `tsconfig.json` is in the project root

2. Check VS Code is using workspace TypeScript version

3. Try reloading the IDE window

### Issue 5: iOS/Android Build Errors

**Symptom**: Native builds fail after adding path aliases

**Solutions**:

1. Clean native builds:
   ```bash
   cd ios && rm -rf build Pods Podfile.lock && pod install
   cd android && ./gradlew clean
   ```

2. Reset Metro cache and rebuild

3. Check for circular dependencies

### Issue 6: ESLint Import Errors

**Symptom**: ESLint reports unresolved imports

**Solutions**:

1. Install `eslint-import-resolver-typescript`

2. Configure the resolver in ESLint settings

3. Ensure TypeScript project path is correct

### Debug Checklist

When troubleshooting, go through this checklist:

- [ ] `tsconfig.json` has `baseUrl` and `paths` configured
- [ ] `babel.config.js` has module-resolver plugin with matching aliases
- [ ] Metro cache has been cleared
- [ ] All file paths exist and are spelled correctly
- [ ] File extensions are included in Babel config
- [ ] Jest `moduleNameMapper` matches aliases (if using tests)
- [ ] ESLint resolver is configured (if using ESLint)

---

## Best Practices for Alias Naming

Follow these conventions to maintain a clean and intuitive alias system.

### Use the @ Prefix

The `@` prefix is a widely adopted convention that clearly distinguishes path aliases from npm packages:

```typescript
// Good - clear distinction from npm packages
import { Button } from '@components/Button';

// Avoid - could be confused with an npm package
import { Button } from 'components/Button';
```

### Keep Aliases Flat

Avoid deeply nested aliases. Keep them at the top level for simplicity:

```typescript
// Good - simple and clear
import { Input } from '@components/forms/Input';

// Avoid - too many aliases to maintain
import { Input } from '@components/forms/inputs/text/Input';
```

### Match Directory Structure

Alias names should mirror your directory structure:

```
src/
├── components/  ->  @components
├── hooks/       ->  @hooks
├── screens/     ->  @screens
└── utils/       ->  @utils
```

### Be Consistent

Use the same naming pattern throughout:

```typescript
// Good - consistent pattern
@components
@screens
@hooks
@utils

// Avoid - inconsistent patterns
@components
@Screens
@app-hooks
@util
```

### Document Your Aliases

Add a comment in your `tsconfig.json` or create documentation for team members:

```json
{
  "compilerOptions": {
    "paths": {
      // UI Components - reusable UI elements
      "@components/*": ["src/components/*"],
      // Screen components - full page views
      "@screens/*": ["src/screens/*"],
      // Custom React hooks
      "@hooks/*": ["src/hooks/*"],
      // Utility functions
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### Avoid Overly Granular Aliases

Do not create an alias for every subdirectory:

```typescript
// Good - use the parent alias with path
import { TextInput } from '@components/forms/TextInput';

// Avoid - too granular
import { TextInput } from '@forms/TextInput';
import { Button } from '@buttons/Button';
import { Modal } from '@modals/Modal';
```

---

## Migration from Relative Imports

Migrating an existing project to path aliases requires a systematic approach.

### Step 1: Set Up Configuration

First, complete all the configuration steps outlined above:

1. Update `tsconfig.json` with paths
2. Configure `babel.config.js` with module-resolver
3. Update Jest config if applicable
4. Configure ESLint resolver

### Step 2: Create a Migration Script

You can use a script to automate the conversion:

```javascript
// scripts/migrate-imports.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const aliasMap = {
  'src/components': '@components',
  'src/screens': '@screens',
  'src/hooks': '@hooks',
  'src/utils': '@utils',
  'src/services': '@services',
  'src/constants': '@constants',
  'src/types': '@types',
  'src/navigation': '@navigation',
  'src/store': '@store',
  'src/api': '@api',
  'src/theme': '@theme',
};

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match import statements with relative paths
  const importRegex = /from\s+['"](\.\.[\/\w-]+)['"]/g;

  content = content.replace(importRegex, (match, importPath) => {
    const absolutePath = path.resolve(path.dirname(filePath), importPath);
    const relativeToCwd = path.relative(process.cwd(), absolutePath);

    for (const [srcPath, alias] of Object.entries(aliasMap)) {
      if (relativeToCwd.startsWith(srcPath)) {
        const newPath = relativeToCwd.replace(srcPath, alias);
        modified = true;
        return `from '${newPath}'`;
      }
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Migrated: ${filePath}`);
  }
}

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(migrateFile);

console.log('Migration complete!');
```

### Step 3: Use IDE Refactoring Tools

Most IDEs offer bulk import refactoring:

**VS Code**:
1. Open a file with relative imports
2. Hover over an import
3. Click the lightbulb icon
4. Select "Update import path"

**WebStorm**:
1. Right-click on a directory
2. Select "Refactor > Move"
3. WebStorm will update all imports

### Step 4: Gradual Migration

For large codebases, consider a gradual approach:

1. Apply aliases to new code immediately
2. Update imports when you touch existing files
3. Dedicate time to migrate entire directories

### Step 5: Verify the Migration

After migration:

1. Run the TypeScript compiler: `npx tsc --noEmit`
2. Run your test suite: `npm test`
3. Build and run the app on both platforms
4. Check for ESLint import errors

---

## Monorepo Considerations

Setting up path aliases in a monorepo requires additional configuration.

### Yarn Workspaces Example

For a monorepo using Yarn workspaces:

```
monorepo/
├── packages/
│   ├── mobile/              # React Native app
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── babel.config.js
│   ├── shared/              # Shared code
│   │   └── src/
│   └── web/                 # Web app
│       └── src/
├── package.json
└── tsconfig.base.json
```

### Base TypeScript Configuration

Create a shared `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Mobile Package tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@shared/*": ["../shared/src/*"]
    }
  }
}
```

### Mobile Package babel.config.js

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@shared': '../shared/src',
        },
      },
    ],
  ],
};
```

### Metro Configuration for Monorepo

Update `metro.config.js` to watch workspace packages:

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  watchFolders: [
    workspaceRoot,
    path.resolve(workspaceRoot, 'packages/shared'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@shared': path.resolve(workspaceRoot, 'packages/shared/src'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### Handling Shared Dependencies

Ensure shared packages are properly symlinked and Metro can resolve them:

```javascript
// metro.config.js
const config = {
  resolver: {
    // Prevent Metro from trying to resolve from multiple node_modules
    disableHierarchicalLookup: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};
```

### Turborepo and Nx Support

If using Turborepo or Nx, configure path aliases at the workspace level and inherit them in each package. Refer to their respective documentation for specific setup instructions.

---

## Conclusion

Setting up absolute imports and path aliases in React Native significantly improves code organization and developer experience. While the initial setup requires configuring multiple tools (TypeScript, Babel, Metro, Jest, and ESLint), the long-term benefits are worth the effort.

### Key Takeaways

1. **TypeScript paths** provide IDE support and type checking
2. **babel-plugin-module-resolver** handles runtime resolution
3. **Metro configuration** is needed for complex setups and monorepos
4. **Jest and ESLint** require separate configuration for full toolchain support
5. **Consistent naming conventions** make aliases intuitive
6. **Gradual migration** is recommended for existing projects

### Quick Reference

Here is a summary of all the files you need to configure:

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript path resolution and IDE support |
| `babel.config.js` | Runtime module resolution |
| `metro.config.js` | Bundler configuration (monorepos) |
| `jest.config.js` | Test runner path resolution |
| `.eslintrc.js` | Linting import validation |

By following this guide, you will have a fully configured React Native project with clean, maintainable import paths. Your team will thank you for eliminating the `../../../` chaos from your codebase.

---

## Additional Resources

- [TypeScript Module Resolution Documentation](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [babel-plugin-module-resolver GitHub](https://github.com/tleunen/babel-plugin-module-resolver)
- [Metro Bundler Documentation](https://facebook.github.io/metro/)
- [React Native TypeScript Template](https://github.com/react-native-community/react-native-template-typescript)
- [ESLint Import Plugin](https://github.com/import-js/eslint-plugin-import)

---

*Happy coding, and enjoy your cleaner import statements!*
