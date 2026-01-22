# How to Fix npm Peer Dependency Conflicts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, Dependencies, PackageManager, Troubleshooting

Description: Learn how to diagnose and resolve npm peer dependency conflicts including understanding peer dependencies, using legacy-peer-deps, and managing complex dependency trees.

---

Peer dependency conflicts are one of the most frustrating npm errors. You try to install a package and npm refuses, citing conflicting versions. This guide explains why this happens and how to fix it.

## Understanding the Error

When you see this:

```bash
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: myapp@1.0.0
npm ERR! Found: react@18.2.0
npm ERR! node_modules/react
npm ERR!   react@"^18.2.0" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0" from some-package@1.2.3
npm ERR! node_modules/some-package
npm ERR!   some-package@"^1.2.3" from the root project
npm ERR!
npm ERR! Fix the upstream dependency conflict, or retry
npm ERR! this command with --force or --legacy-peer-deps
```

This means:
- You have React 18 installed
- `some-package` requires React 17
- npm cannot satisfy both requirements

## What Are Peer Dependencies?

Peer dependencies declare what version of another package your package expects to work with:

```json
{
  "name": "my-react-component",
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0"
  }
}
```

Unlike regular dependencies, peer dependencies:
- Are NOT installed automatically
- Must be provided by the consumer
- Ensure compatibility with the host environment

## Quick Fixes

### Option 1: Legacy Peer Deps (Quickest)

```bash
# Install ignoring peer dependency checks
npm install --legacy-peer-deps

# Make it default (not recommended long-term)
npm config set legacy-peer-deps true
```

### Option 2: Force Install

```bash
# Force through conflicts
npm install --force
```

### Option 3: Update the Conflicting Package

```bash
# Check if newer version exists
npm view some-package versions

# Install newer version that might support your dependencies
npm install some-package@latest
```

## Diagnostic Commands

### Understand the Conflict

```bash
# See dependency tree
npm ls react

# See why a package is installed
npm explain some-package

# Check peer dependencies of a package
npm info some-package peerDependencies

# Dry run to see what would be installed
npm install --dry-run
```

### Example Output

```bash
npm ls react
myapp@1.0.0
├── react@18.2.0
├─┬ react-dom@18.2.0
│ └── react@18.2.0 deduped
└─┬ some-legacy-package@1.0.0
  └── UNMET PEER DEPENDENCY react@^17.0.0
```

## Resolution Strategies

### Strategy 1: Update Dependencies

Often the simplest fix is updating packages:

```bash
# Update all packages
npm update

# Update specific package
npm update some-package

# Check for outdated packages
npm outdated
```

### Strategy 2: Find Compatible Versions

```bash
# Check what versions exist
npm view react-router-dom versions

# Check peer dependencies for each version
npm info react-router-dom@5 peerDependencies
npm info react-router-dom@6 peerDependencies

# Install specific compatible version
npm install react-router-dom@5
```

### Strategy 3: Use Overrides (npm 8.3+)

Force npm to use specific versions:

```json
{
  "name": "myapp",
  "dependencies": {
    "react": "^18.2.0",
    "some-package": "^1.0.0"
  },
  "overrides": {
    "some-package": {
      "react": "^18.2.0"
    }
  }
}
```

Or override globally:

```json
{
  "overrides": {
    "react": "^18.2.0"
  }
}
```

### Strategy 4: Use Resolutions (Yarn)

```json
{
  "resolutions": {
    "react": "18.2.0",
    "some-package/react": "18.2.0"
  }
}
```

### Strategy 5: Use Aliases

Install multiple versions of the same package:

```bash
npm install react-17@npm:react@17.0.2
npm install react@18.2.0
```

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-17": "npm:react@17.0.2"
  }
}
```

## Common Scenarios

### React 17 vs React 18

Many packages haven't updated for React 18:

```bash
# Check if package supports React 18
npm info some-package peerDependencies

# Temporary fix
npm install --legacy-peer-deps

# Better fix: check for updates
npm outdated some-package

# Or find alternatives
npx npm-check-updates --filter some-package
```

### TypeScript Type Packages

```bash
npm ERR! peer @types/react@"^17.0.0" from some-package

# Solution: Match @types version to react version
npm install @types/react@18 @types/react-dom@18
```

### Webpack Plugin Conflicts

```bash
# Check webpack version required
npm info html-webpack-plugin peerDependencies

# Install compatible version
npm install html-webpack-plugin@5  # for webpack 5
npm install html-webpack-plugin@4  # for webpack 4
```

### ESLint and Plugins

```bash
# ESLint plugins often have strict peer deps
npm info eslint-plugin-react peerDependencies

# Install compatible eslint
npm install eslint@8 eslint-plugin-react@latest
```

## Prevention

### Check Before Installing

```bash
# See what a package requires
npm info new-package peerDependencies

# Dry run installation
npm install new-package --dry-run
```

### Pin Versions Carefully

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

Keep major versions aligned for related packages.

### Use .npmrc for Team Settings

```ini
# .npmrc
legacy-peer-deps=false
save-exact=true
```

## Debugging Complex Trees

### Visualize Dependencies

```bash
# Tree view
npm ls --all

# Limit depth
npm ls --depth=2

# Find specific package
npm ls react --all
```

### Use npm-why

```bash
npx npm-why react

# Output shows why each version is installed
```

### Analyze with npm-check

```bash
npx npm-check

# Interactive mode
npx npm-check -u
```

## Working with Monorepos

### Hoisted Dependencies

In monorepos, ensure root and packages align:

```json
// root package.json
{
  "workspaces": ["packages/*"],
  "dependencies": {
    "react": "^18.2.0"
  }
}
```

```json
// packages/component/package.json
{
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

### Workspace Protocol

```json
{
  "dependencies": {
    "shared-utils": "workspace:*"
  }
}
```

## When to Use --legacy-peer-deps

Use `--legacy-peer-deps` when:
- Installing temporarily to test
- Package is abandoned but functional
- You've verified the version mismatch is cosmetic

Do NOT use when:
- Installing security updates
- Setting up production builds
- You haven't investigated the conflict

## CI/CD Considerations

```yaml
# GitHub Actions
- name: Install dependencies
  run: npm ci
  # npm ci respects package-lock.json strictly

# If you must use legacy peer deps
- name: Install dependencies
  run: npm ci --legacy-peer-deps
```

### Lock File Management

```bash
# Regenerate lock file
rm package-lock.json
npm install

# With legacy peer deps if needed
rm package-lock.json
npm install --legacy-peer-deps

# Commit the lock file
git add package-lock.json
```

## Summary

| Solution | When to Use |
|----------|-------------|
| `--legacy-peer-deps` | Quick fix, testing |
| `--force` | Override warnings |
| Update packages | First choice |
| `overrides` | Force specific versions |
| Compatible versions | Long-term solution |
| Aliases | Need multiple versions |

Resolution checklist:
1. Read the error message carefully
2. Check if package has updates
3. Try installing compatible versions
4. Use overrides if needed
5. Use --legacy-peer-deps as last resort
6. Document why in your README
