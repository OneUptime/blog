# How to Migrate from Create React App to Vite for Faster Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Vite, Migration, Build Tools, Frontend, Performance

Description: A comprehensive guide to migrating your React application from Create React App (CRA) to Vite, unlocking significantly faster development builds, hot module replacement, and a modern tooling experience.

---

Create React App (CRA) served the React ecosystem well for years. It was the go-to solution for bootstrapping React projects without worrying about webpack configurations, Babel setups, or build tooling complexity. However, as projects grow and developer expectations evolve, CRA's limitations have become increasingly apparent. Slow startup times, lengthy hot module replacement (HMR) cycles, and mounting configuration frustrations have pushed many teams to seek alternatives.

Enter Vite. Created by Evan You (the creator of Vue.js), Vite represents a fundamental shift in how we approach frontend tooling. Instead of bundling your entire application during development, Vite leverages native ES modules to serve your code directly to the browser, resulting in near-instantaneous server startup and lightning-fast HMR.

In this guide, we'll walk through a complete migration from Create React App to Vite, covering every step from initial setup to production deployment. Whether you're working on a small side project or a large enterprise application, this guide will help you make the transition smoothly.

## Why Migrate from Create React App to Vite?

Before diving into the migration steps, let's understand why this migration is worth your time.

### Development Server Startup Time

CRA uses webpack under the hood, which bundles your entire application before serving it. For a moderately sized project with hundreds of components and dependencies, this can take 30 seconds to several minutes. Vite, on the other hand, starts in under a second regardless of project size because it doesn't bundle during development.

### Hot Module Replacement Speed

When you make a change in CRA, webpack rebuilds affected chunks and updates the browser. This process can take several seconds in large applications. Vite's HMR is nearly instantaneous because it only invalidates the exact module that changed, leveraging the browser's native ES module support.

### Build Performance

While both tools eventually produce bundled output for production, Vite uses Rollup under the hood, which often produces smaller bundles with better tree-shaking than webpack. Build times are typically 2-3x faster with Vite.

### Modern Tooling Stack

Vite embraces modern JavaScript features and tooling. It uses esbuild for dependency pre-bundling (10-100x faster than JavaScript-based bundlers), supports TypeScript out of the box, and has first-class support for CSS modules, PostCSS, and various preprocessors.

### Active Development and Community

While CRA has seen reduced maintenance activity, Vite enjoys active development with frequent releases, a growing ecosystem of plugins, and strong community support.

## Prerequisites

Before starting the migration, ensure you have:

- Node.js 18.0.0 or higher (Vite 5+ requires Node 18+)
- npm 9+ or yarn 1.22+ or pnpm 8+
- A working Create React App project
- Basic familiarity with React and JavaScript/TypeScript
- Git initialized in your project (for easy rollback if needed)

## Migration Steps Overview

Here's what we'll cover in this migration:

1. Create a backup branch
2. Install Vite and related dependencies
3. Create Vite configuration file
4. Update project structure
5. Migrate environment variables
6. Update import statements
7. Handle CSS and static assets
8. Update scripts in package.json
9. Remove CRA dependencies
10. Test and verify the migration

Let's begin!

## Step 1: Create a Backup Branch

Before making any changes, create a backup branch to preserve your working CRA setup.

```bash
git checkout -b pre-vite-migration
git push origin pre-vite-migration
git checkout -b migrate-to-vite
```

This ensures you can always return to your working state if something goes wrong during migration.

## Step 2: Install Vite and Related Dependencies

First, install Vite and the React plugin.

```bash
npm install -D vite @vitejs/plugin-react
```

If you're using TypeScript, you'll also want to install the type definitions:

```bash
npm install -D @types/node
```

For projects using specific features, install additional plugins as needed:

```bash
# For SVGR (importing SVGs as React components)
npm install -D vite-plugin-svgr

# For environment variable handling
npm install -D vite-plugin-environment
```

## Step 3: Create Vite Configuration File

Create a `vite.config.js` (or `vite.config.ts` for TypeScript projects) in your project root.

### Basic Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
});
```

### TypeScript Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
```

### Advanced Configuration with SVGR

If your CRA project imports SVGs as React components, you'll need to add the SVGR plugin:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg',
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
```

## Step 4: Update Project Structure

### Move index.html

The most significant structural change is moving `index.html` from the `public` folder to the project root.

```bash
mv public/index.html .
```

### Update index.html

Vite requires a different `index.html` structure. Here's how to update it:

**Before (CRA):**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using create-react-app" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

**After (Vite):**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using Vite and React" />
    <link rel="apple-touch-icon" href="/logo192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
```

Key changes:
- Replace `%PUBLIC_URL%` with `/` for static assets
- Add `<script type="module" src="/src/index.jsx"></script>` (or `.tsx` for TypeScript) before `</body>`

### Rename JavaScript Entry Point (if needed)

If your entry file is `src/index.js`, rename it to `src/index.jsx`:

```bash
mv src/index.js src/index.jsx
```

For TypeScript projects:

```bash
mv src/index.tsx src/index.tsx  # Usually already correct
```

Vite requires explicit file extensions for JSX files. Update all `.js` files containing JSX to `.jsx`.

## Step 5: Migrate Environment Variables

CRA and Vite handle environment variables differently.

### CRA Environment Variables

In CRA, environment variables are prefixed with `REACT_APP_`:

```bash
# .env
REACT_APP_API_URL=https://api.example.com
REACT_APP_FEATURE_FLAG=true
```

And accessed via `process.env`:

```javascript
const apiUrl = process.env.REACT_APP_API_URL;
```

### Vite Environment Variables

In Vite, environment variables are prefixed with `VITE_`:

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_FEATURE_FLAG=true
```

And accessed via `import.meta.env`:

```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

### Migration Script

Here's a script to help migrate your environment variables:

```bash
# Rename environment variables in .env files
sed -i '' 's/REACT_APP_/VITE_/g' .env .env.local .env.development .env.production 2>/dev/null
```

Then update all references in your source code:

```bash
# Find and replace in source files
find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g' {} \;
```

### TypeScript Type Definitions

For TypeScript projects, create or update `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FEATURE_FLAG: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Step 6: Update Import Statements

### File Extension Changes

Vite is stricter about file extensions. Update imports to use explicit extensions for JSX files:

```javascript
// Before
import App from './App';
import Header from './components/Header';

// After (if files are .jsx)
import App from './App.jsx';
import Header from './components/Header.jsx';
```

Alternatively, configure Vite to resolve extensions automatically:

```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  // ... other config
});
```

### Absolute Import Paths

If you're using absolute imports with CRA's `jsconfig.json` or `tsconfig.json`:

**CRA (jsconfig.json):**

```json
{
  "compilerOptions": {
    "baseUrl": "src"
  }
}
```

**Vite configuration:**

```javascript
// vite.config.js
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      // Or for @ alias
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### SVG Imports

CRA allows importing SVGs as React components by default:

```javascript
// CRA
import { ReactComponent as Logo } from './logo.svg';
```

With Vite and `vite-plugin-svgr`:

```javascript
// Vite with SVGR plugin
import Logo from './logo.svg';
// or
import Logo from './logo.svg?react';
```

Update your imports accordingly based on your SVGR configuration.

## Step 7: Handle CSS and Static Assets

### CSS Modules

CSS Modules work similarly in both CRA and Vite. Ensure your CSS module files follow the naming convention `*.module.css`:

```javascript
import styles from './Button.module.css';

function Button() {
  return <button className={styles.button}>Click me</button>;
}
```

### Global CSS

Global CSS imports remain the same:

```javascript
import './index.css';
```

### SASS/SCSS Support

If using SASS/SCSS, install the preprocessor:

```bash
npm install -D sass
```

No additional configuration needed - Vite handles SASS automatically.

### Static Assets

Static assets in the `public` folder work the same way. Reference them with absolute paths:

```javascript
// Both CRA and Vite
<img src="/logo.png" alt="Logo" />
```

For assets imported in JavaScript:

```javascript
import logo from './assets/logo.png';

function Header() {
  return <img src={logo} alt="Logo" />;
}
```

## Step 8: Update package.json Scripts

Replace the CRA scripts with Vite equivalents:

**Before (CRA):**

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

**After (Vite):**

```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

### Testing Configuration

If you were using Jest with CRA, you have two options:

**Option 1: Migrate to Vitest (Recommended)**

Vitest is designed to work seamlessly with Vite:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
```

Update `src/setupTests.ts`:

```typescript
import '@testing-library/jest-dom';
```

**Option 2: Keep Jest**

If you prefer to keep Jest, install the necessary dependencies:

```bash
npm install -D jest @types/jest babel-jest @babel/preset-env @babel/preset-react
```

Create `babel.config.js`:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
```

## Step 9: Remove CRA Dependencies

Remove the Create React App dependencies that are no longer needed:

```bash
npm uninstall react-scripts
```

Also remove any CRA-specific files:

```bash
rm -f config-overrides.js
rm -rf config/
```

Clean up unused dependencies:

```bash
npm uninstall @testing-library/jest-dom @testing-library/react @testing-library/user-event
```

Then reinstall for Vitest if using that:

```bash
npm install -D @testing-library/jest-dom @testing-library/react @testing-library/user-event
```

## Step 10: Test and Verify the Migration

### Start the Development Server

```bash
npm run dev
```

You should see output similar to:

```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Verify Hot Module Replacement

Make a small change to a component and save. The update should reflect in the browser almost instantly without a full page reload.

### Run the Build

```bash
npm run build
```

Verify the build output in the `build` directory (or `dist` if you didn't change the default).

### Preview the Production Build

```bash
npm run preview
```

This serves the production build locally, allowing you to test before deployment.

### Run Tests

```bash
npm run test
```

Ensure all tests pass with your new testing setup.

## Common Migration Issues and Solutions

### Issue 1: Module Not Found Errors

**Problem:** Vite can't resolve certain imports.

**Solution:** Check file extensions and update the resolve configuration:

```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Issue 2: process.env is Undefined

**Problem:** Code references `process.env` which doesn't exist in Vite.

**Solution:** Replace all `process.env.REACT_APP_*` with `import.meta.env.VITE_*`:

```javascript
// Before
const apiUrl = process.env.REACT_APP_API_URL;

// After
const apiUrl = import.meta.env.VITE_API_URL;
```

For `process.env.NODE_ENV`, use `import.meta.env.MODE`:

```javascript
// Before
if (process.env.NODE_ENV === 'development') {
  // ...
}

// After
if (import.meta.env.DEV) {
  // ...
}
// or
if (import.meta.env.MODE === 'development') {
  // ...
}
```

### Issue 3: Global Variables Not Defined

**Problem:** Libraries expect global variables like `global` or `Buffer`.

**Solution:** Add polyfills in `vite.config.js`:

```javascript
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  // ...
});
```

For Buffer and other Node.js polyfills:

```bash
npm install -D buffer
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process'],
    }),
  ],
});
```

### Issue 4: CSS Import Order Issues

**Problem:** CSS imports are processed in a different order, causing style conflicts.

**Solution:** Ensure CSS imports are consistent across files, or use CSS Modules to scope styles:

```javascript
// Import global styles first
import './global.css';
import styles from './Component.module.css';
```

### Issue 5: SVG Imports Not Working

**Problem:** SVG imports as React components fail.

**Solution:** Install and configure `vite-plugin-svgr`:

```bash
npm install -D vite-plugin-svgr
```

```javascript
// vite.config.js
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
});
```

Update imports:

```javascript
// Change from
import { ReactComponent as Logo } from './logo.svg';

// To
import Logo from './logo.svg?react';
```

### Issue 6: Tests Failing After Migration

**Problem:** Jest tests fail because of Vite-specific features.

**Solution:** Migrate to Vitest for better compatibility:

```bash
npm install -D vitest @vitest/ui
```

Update test configuration and replace Jest-specific features:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
```

### Issue 7: Proxy Configuration Not Working

**Problem:** API proxy doesn't work after migration.

**Solution:** Update the proxy configuration in `vite.config.js`:

**CRA (package.json):**

```json
{
  "proxy": "http://localhost:4000"
}
```

**Vite (vite.config.js):**

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

## Performance Comparison

After migration, you should see significant improvements in development workflow speed.

| Metric | Create React App | Vite | Improvement |
|--------|------------------|------|-------------|
| Cold Start (Dev Server) | 30-60 seconds | < 1 second | 30-60x faster |
| Hot Module Replacement | 2-5 seconds | < 100ms | 20-50x faster |
| Production Build | 60-120 seconds | 20-40 seconds | 2-3x faster |
| Initial Bundle Size | Varies | Often 10-20% smaller | Better tree-shaking |
| Dependency Pre-bundling | N/A | Once, cached | Faster subsequent starts |

## CRA vs Vite Feature Comparison Table

| Feature | Create React App | Vite | Migration Notes |
|---------|------------------|------|-----------------|
| **Development Server** | Webpack Dev Server | Vite Dev Server | Native ESM, much faster |
| **Build Tool** | Webpack | Rollup (prod), esbuild (dev) | Different config format |
| **HMR** | Webpack HMR | Vite HMR | Instant updates |
| **TypeScript** | Supported | Native support | No config needed |
| **CSS Modules** | Supported | Supported | Same syntax |
| **SASS/SCSS** | Requires setup | Install sass only | Simpler setup |
| **PostCSS** | Supported | Supported | Same config file |
| **Environment Variables** | REACT_APP_ prefix | VITE_ prefix | Find/replace needed |
| **Public Assets** | public/ folder | public/ folder | Move index.html out |
| **SVG as Components** | Built-in | Plugin required | vite-plugin-svgr |
| **Proxy** | package.json | vite.config.js | Different syntax |
| **Testing** | Jest | Vitest recommended | Migration may be needed |
| **Ejecting** | Supported | Not needed | Full config access |
| **PWA Support** | Built-in | Plugin required | vite-plugin-pwa |
| **Code Splitting** | Supported | Supported | Similar syntax |
| **Lazy Loading** | React.lazy | React.lazy | Same API |
| **Source Maps** | Built-in | Built-in | Config options differ |
| **Browser Support** | Configurable | Modern browsers default | Add @vitejs/plugin-legacy |

## Best Practices After Migration

### Optimize Dependencies

Vite pre-bundles dependencies for faster development. You can optimize this further:

```javascript
// vite.config.js
export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom', 'lodash'],
    exclude: ['your-local-package'],
  },
});
```

### Enable Build Analysis

Add bundle analysis to monitor your build size:

```bash
npm install -D rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
    }),
  ],
});
```

### Configure for Legacy Browser Support

If you need to support older browsers:

```bash
npm install -D @vitejs/plugin-legacy
```

```javascript
// vite.config.js
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
});
```

### Set Up Path Aliases

For cleaner imports, configure path aliases:

```javascript
// vite.config.js
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
});
```

Update `tsconfig.json` for TypeScript support:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"]
    }
  }
}
```

## Complete Migration Checklist

Use this checklist to ensure you've completed all migration steps:

- [ ] Created backup branch
- [ ] Installed Vite and @vitejs/plugin-react
- [ ] Created vite.config.js/ts
- [ ] Moved index.html to project root
- [ ] Updated index.html (removed %PUBLIC_URL%, added script tag)
- [ ] Renamed .js files with JSX to .jsx
- [ ] Renamed environment variables from REACT_APP_ to VITE_
- [ ] Updated environment variable access from process.env to import.meta.env
- [ ] Created vite-env.d.ts for TypeScript projects
- [ ] Updated import statements (extensions, aliases)
- [ ] Configured SVG imports if using SVGR
- [ ] Updated package.json scripts
- [ ] Set up Vitest or configured Jest
- [ ] Removed react-scripts dependency
- [ ] Removed CRA-specific config files
- [ ] Tested development server
- [ ] Verified Hot Module Replacement
- [ ] Tested production build
- [ ] Ran and fixed any failing tests
- [ ] Verified all features work correctly
- [ ] Committed changes to Git

## Final Project Structure

After migration, your project structure should look like this:

```
my-app/
├── node_modules/
├── public/
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx
│   ├── App.css
│   ├── index.jsx
│   ├── index.css
│   ├── setupTests.ts
│   └── vite-env.d.ts
├── .env
├── .env.local
├── .gitignore
├── index.html          # Moved from public/
├── package.json
├── tsconfig.json       # If using TypeScript
├── vite.config.js      # New file
└── vitest.config.ts    # If using Vitest
```

## Conclusion

Migrating from Create React App to Vite is a worthwhile investment that pays dividends in developer productivity. The near-instantaneous development server startup and lightning-fast HMR create a more enjoyable development experience, while the optimized production builds ensure your users get the best possible performance.

The migration process, while requiring careful attention to detail, is straightforward and well-documented. By following this guide and using the provided checklist, you can complete the migration in a few hours for most projects.

The React ecosystem continues to evolve, and Vite has emerged as the clear choice for modern React development. Teams that have made the switch report significant improvements in developer satisfaction and productivity. If you're still using Create React App, now is the perfect time to make the move to Vite.

**Key Takeaways:**

1. Vite offers 30-60x faster development server startup compared to CRA
2. Hot Module Replacement is nearly instantaneous with Vite
3. The migration requires updating environment variables, file structure, and configuration
4. Most CRA features have direct Vite equivalents or plugin alternatives
5. Vitest provides seamless testing integration with Vite
6. The investment in migration time quickly pays off in daily development productivity

**About OneUptime:** We're building the next generation of observability tools to help engineering teams maintain reliable systems. Our platform provides comprehensive monitoring, incident management, and status pages to keep your applications running smoothly. Visit [OneUptime.com](https://oneuptime.com) to learn more about our approach to modern observability.

**Related Reading:**

- [Dependency Hell: The Hidden Costs of Dependency Bloat in Software Development](https://oneuptime.com/blog/post/2025-09-02-the-hidden-costs-of-dependency-bloat-in-software-development/view)
- [The Power of Three: How Small Teams Drive Big Results at OneUptime](https://oneuptime.com/blog/post/2025-03-13-power-of-three-how-small-teams-drive-big-results/view)
- [Why Build Open-Source Datadog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)
