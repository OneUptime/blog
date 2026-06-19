# How to Fix 'turbopack' Compatibility Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Next.js, Turbopack, Webpack, Bundler, Performance, Troubleshooting

Description: Learn how to diagnose and resolve Turbopack compatibility issues in Next.js including unsupported features and migration strategies.

---

Turbopack is Next.js's new bundler written in Rust, designed to be faster than Webpack. However, not all features and configurations are fully supported yet. This guide covers common compatibility issues and how to resolve them.

## Understanding Turbopack Support

Turbopack support in Next.js has evolved over time with varying levels of feature compatibility.

```mermaid
flowchart TB
    subgraph Supported["Fully Supported"]
        A[TypeScript/JavaScript]
        B[CSS Modules]
        C[Tailwind CSS]
        D[Image Optimization]
        E[App Router]
        F[Server Components]
    end

    subgraph Partial["Partial Support"]
        G[Webpack Loaders via turbopack.rules]
        H[Some Plugins]
        I[Legacy Features]
    end

    subgraph Unsupported["Not Yet Supported"]
        J[webpack() config function]
        K[Some Loaders]
        L[Certain Plugins]
    end
```

## Enabling Turbopack

In Next.js 16, Turbopack is used by default for both development and production builds.

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:webpack": "NEXT_USE_WEBPACK=true next dev --webpack",
    "build": "next build",
    "build:webpack": "NEXT_USE_WEBPACK=true next build --webpack",
    "start": "next start"
  }
}
```

In older Next.js versions, enable it with `next dev --turbopack` or `next dev --turbo`.

Configure Turbopack in next.config.js:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration
  turbopack: {
    // Turbopack-specific options
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

module.exports = nextConfig;
```

## Common Error: webpack() Function Not Supported

The most common error occurs when using custom Webpack configuration.

Error message:
```text
Error: Turbopack does not support custom webpack configuration.
Please remove the webpack() function from next.config.js to use Turbopack.
```

### Solution 1: Conditional Configuration

Create a configuration that works with both bundlers.

```javascript
// next.config.js
const useWebpack = process.env.NEXT_USE_WEBPACK === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Common configuration for both bundlers
  reactStrictMode: true,
  images: {
    remotePatterns: [new URL('https://example.com/**')],
  },
};

// Only add webpack config when explicitly using Webpack
if (useWebpack) {
  nextConfig.webpack = (config, { isServer }) => {
    // Custom webpack configuration
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  };
}

module.exports = nextConfig;
```

### Solution 2: Environment-Based Configuration

Use environment variables to switch bundlers.

```javascript
// next.config.js
const isTurbopack = process.env.TURBOPACK === 'true';

/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
};

if (isTurbopack) {
  // Turbopack configuration
  nextConfig.turbopack = {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  };
} else {
  // Webpack configuration
  nextConfig.webpack = (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  };
}

module.exports = nextConfig;
```

Package.json scripts:

```json
{
  "scripts": {
    "dev": "TURBOPACK=true next dev",
    "dev:webpack": "NEXT_USE_WEBPACK=true next dev --webpack",
    "build": "TURBOPACK=true next build",
    "build:webpack": "NEXT_USE_WEBPACK=true next build --webpack"
  }
}
```

## Fixing SVG Import Issues

SVG handling differs between Turbopack and Webpack.

### Using @svgr/webpack with Turbopack

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

module.exports = nextConfig;
```

### Alternative: Use next/image for SVGs

```tsx
// src/components/Icon.tsx
import Image from 'next/image';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 24, className }: IconProps) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={className}
    />
  );
}
```

### Alternative: Inline SVG Component

```tsx
// src/components/icons/ArrowIcon.tsx
export default function ArrowIcon({
  className = '',
  size = 24
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
```

## Configuration Migration Flow

Follow this process to migrate from Webpack to Turbopack.

```mermaid
flowchart TB
    A[Start Migration] --> B{Has webpack config?}

    B -->|Yes| C[Identify Features Used]
    B -->|No| D[Enable Turbopack]

    C --> E{Feature Supported?}

    E -->|Yes| F[Use Turbopack Equivalent]
    E -->|No| G[Find Alternative]

    F --> H{All Features Migrated?}
    G --> H

    H -->|Yes| D
    H -->|No| C

    D --> I[Test Application]
    I --> J{Issues Found?}

    J -->|Yes| K[Debug and Fix]
    J -->|No| L[Migration Complete]

    K --> I
```

## Fixing CSS Import Issues

Turbopack handles CSS differently in some cases.

### Global CSS Import Error

Error:
```text
Error: Global CSS cannot be imported from files other than your Custom App.
```

Solution: Import global CSS only in layout.tsx or _app.tsx.

```tsx
// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### CSS Modules Work Correctly

```tsx
// src/components/Button.tsx
import styles from './Button.module.css';

export default function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className={styles.button}>
      {children}
    </button>
  );
}
```

## Fixing Module Resolution Issues

Turbopack may handle path aliases differently.

### Ensure Proper tsconfig.json Setup

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  }
}
```

### Verify next.config.js Doesn't Override

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't use webpack resolve.alias with Turbopack
  // Use tsconfig.json paths instead
};

module.exports = nextConfig;
```

## Plugin Compatibility

Many Webpack plugins are not compatible with Turbopack.

### Incompatible Plugins

```javascript
// These won't work with Turbopack
const withBundleAnalyzer = require('@next/bundle-analyzer');
const withPWA = require('next-pwa');

// Remove or conditionally apply
const nextConfig = {
  // base config
};

// Only use plugins with Webpack
if (process.env.NEXT_USE_WEBPACK === 'true') {
  module.exports = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
  })(nextConfig);
} else {
  module.exports = nextConfig;
}
```

### Alternative for Bundle Analysis

Use built-in Next.js analysis:

```bash
# Analyze a Turbopack build without the Webpack plugin
npx next experimental-analyze

# Or write the analyzer output to disk
npx next experimental-analyze --output
```

## Environment Variable Handling

Turbopack handles environment variables similarly to Webpack.

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // These work with both bundlers
    CUSTOM_VAR: process.env.CUSTOM_VAR,
  },
};

module.exports = nextConfig;
```

## Fixing Third-Party Package Issues

Some packages may not work correctly with Turbopack.

### Transpile Packages Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Works with both bundlers
  transpilePackages: ['some-package', '@org/another-package'],
};

module.exports = nextConfig;
```

### External Packages for Server

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Specify packages that should stay external
  serverExternalPackages: ['sharp', 'canvas'],
};

module.exports = nextConfig;
```

## Development vs Production

Turbopack started as a development-only bundler, but it now powers production builds too. In Next.js 16, Turbopack is stable and the default bundler for both `next dev` and `next build`; in Next.js 15 you can opt into production builds with `next build --turbopack`. You can still fall back to Webpack with `next dev --webpack` or `next build --webpack`.

```mermaid
flowchart LR
    subgraph Development
        A[next dev --turbopack] --> B[Turbopack]
        C[next dev --webpack] --> D[Webpack]
    end

    subgraph Production
        E[next build --turbopack] --> F[Turbopack]
        F --> G[Optimized Bundle]
    end

    B --> H[Fast HMR]
    D --> I[Standard HMR]
```

## Troubleshooting Strategy

Follow this approach when encountering issues.

```javascript
// scripts/check-turbopack.js
function checkTurbopackCompatibility() {
  console.log('Checking Turbopack compatibility...\n');

  // Check for webpack config
  const fs = require('fs');
  const configPath = './next.config.js';

  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');

    if (config.includes('webpack:') || config.includes('webpack(')) {
      console.warn('Warning: Custom webpack configuration detected.');
      console.warn('This may not be compatible with Turbopack.\n');
    }
  }

  // Check for known incompatible packages
  const packageJson = require('./package.json');
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const incompatible = [
    '@next/bundle-analyzer',
    'next-pwa',
    'next-compose-plugins',
  ];

  incompatible.forEach((pkg) => {
    if (deps[pkg]) {
      console.warn(`Warning: ${pkg} may not be compatible with Turbopack.`);
    }
  });

  console.log('\nTry running: npm run dev');
}

checkTurbopackCompatibility();
```

## Feature Detection

Create utilities to detect the selected bundler when you control bundler selection with environment variables.

```typescript
// src/lib/bundler.ts
export function isTurbopack(): boolean {
  // Check if running with Turbopack
  return process.env.NEXT_USE_WEBPACK !== 'true';
}

export function getBundlerName(): 'turbopack' | 'webpack' {
  return isTurbopack() ? 'turbopack' : 'webpack';
}
```

## Migration Checklist

Use this checklist when migrating to Turbopack.

```typescript
// scripts/turbopack-checklist.ts
interface ChecklistItem {
  name: string;
  check: () => boolean;
  fix?: string;
}

const checklist: ChecklistItem[] = [
  {
    name: 'No custom webpack function',
    check: () => {
      // Check next.config.js
      return true;
    },
    fix: 'Remove or conditionally apply webpack configuration',
  },
  {
    name: 'Using supported CSS imports',
    check: () => true,
    fix: 'Import global CSS only in layout.tsx or _app.tsx',
  },
  {
    name: 'Path aliases in tsconfig.json',
    check: () => true,
    fix: 'Move path aliases from webpack config to tsconfig.json',
  },
  {
    name: 'No incompatible plugins',
    check: () => true,
    fix: 'Remove or conditionally apply plugins',
  },
  {
    name: 'SVG handling configured',
    check: () => true,
    fix: 'Use turbopack.rules for SVG or alternative approach',
  },
];

function runChecklist() {
  console.log('Turbopack Migration Checklist\n');

  checklist.forEach((item, index) => {
    const passed = item.check();
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${index + 1}. [${status}] ${item.name}`);

    if (!passed && item.fix) {
      console.log(`   Fix: ${item.fix}`);
    }
  });
}

runChecklist();
```

## Summary

Key points for fixing Turbopack compatibility issues:

1. Use conditional configuration to support both bundlers
2. Move path aliases from webpack to tsconfig.json
3. Handle SVGs using turbopack.rules or alternative methods
4. Import global CSS only in layout.tsx or _app.tsx
5. Remove or conditionally apply incompatible plugins
6. Use transpilePackages for third-party package issues
7. Turbopack now supports both development and production builds (default in Next.js 16)

As Turbopack matures, more features will become available. Check the Next.js documentation for the latest compatibility information.
