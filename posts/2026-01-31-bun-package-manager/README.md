# How to Use Bun as a Package Manager

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Package Manager, npm, Yarn

Description: A comprehensive guide to using Bun as a fast and efficient package manager for JavaScript and TypeScript projects.

---

Bun has emerged as a powerful all-in-one JavaScript runtime that includes a blazingly fast package manager. While many developers know Bun for its runtime capabilities, its package manager is often overlooked despite being one of the fastest available today. In this guide, we will explore how to use Bun as your primary package manager, covering everything from basic installation to advanced configurations like workspaces and registry customization.

## Why Choose Bun as Your Package Manager?

Before diving into the technical details, let's understand why Bun's package manager deserves your attention. Bun's package manager is written in Zig and uses native system calls for maximum performance. It can install packages up to 25x faster than npm and significantly faster than yarn or pnpm. This speed improvement comes from several optimizations including parallel downloads, hardlinks instead of copies, and an optimized dependency resolution algorithm.

Beyond speed, Bun maintains full compatibility with existing npm packages and the npm registry. You can use it as a drop-in replacement for npm or yarn without modifying your project's dependencies or structure.

## Getting Started with Bun

First, you need to install Bun on your system. The installation process is straightforward across different operating systems.

For macOS and Linux, use this curl command to install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

For Windows, you can use PowerShell:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

After installation, verify that Bun is properly installed by checking the version:

```bash
bun --version
```

## Bun Install vs npm/yarn

The primary command you will use is `bun install`, which works similarly to `npm install` or `yarn install` but with significant performance improvements. Let's compare the commands side by side.

This table shows the equivalent commands across package managers:

| Action | npm | yarn | Bun |
|--------|-----|------|-----|
| Install all dependencies | `npm install` | `yarn` | `bun install` |
| Add a package | `npm install pkg` | `yarn add pkg` | `bun add pkg` |
| Add dev dependency | `npm install -D pkg` | `yarn add -D pkg` | `bun add -d pkg` |
| Remove a package | `npm uninstall pkg` | `yarn remove pkg` | `bun remove pkg` |
| Update packages | `npm update` | `yarn upgrade` | `bun update` |
| Run a script | `npm run script` | `yarn script` | `bun run script` |

Here is an example of initializing a new project with Bun:

```bash
# Initialize a new project with default settings
bun init

# Initialize with specific options
bun init -y
```

To add dependencies to your project, use the `bun add` command with various flags:

```bash
# Add a production dependency
bun add express

# Add multiple packages at once
bun add express cors helmet

# Add a development dependency
bun add -d typescript @types/node

# Add a package as an optional dependency
bun add --optional sharp

# Add a specific version of a package
bun add lodash@4.17.21

# Add a package from a git repository
bun add github:user/repo

# Add a package globally
bun add -g typescript
```

## Understanding the Lockfile Format

Bun uses a binary lockfile called `bun.lockb` instead of the text-based lockfiles used by npm (`package-lock.json`) or yarn (`yarn.lock`). This binary format is significantly smaller and faster to read and write.

The binary lockfile offers several advantages over text-based alternatives:

```bash
# View the contents of your lockfile in a human-readable YAML format
bun bun.lockb

# Generate a yarn.lock file from bun.lockb for compatibility
bun install --yarn
```

If you need to work with team members who use different package managers, Bun can generate traditional lockfiles:

```bash
# This creates both bun.lockb and yarn.lock
bun install --yarn

# You can also configure this in bunfig.toml
```

Here is how to configure automatic lockfile generation in your bunfig.toml:

```toml
[install.lockfile]
# Always generate a yarn.lock file alongside bun.lockb
print = "yarn"
```

## Workspaces Configuration

Bun fully supports npm and yarn workspaces, making it ideal for monorepo setups. Workspaces allow you to manage multiple packages within a single repository, sharing dependencies and linking local packages automatically.

Create a root package.json with workspaces configuration:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

Here is an example monorepo structure with multiple packages:

```
my-monorepo/
├── package.json
├── bun.lockb
├── packages/
│   ├── shared-utils/
│   │   └── package.json
│   └── ui-components/
│   │   └── package.json
└── apps/
    ├── web-app/
    │   └── package.json
    └── api-server/
        └── package.json
```

Each workspace package can reference other workspace packages directly:

```json
{
  "name": "@myorg/web-app",
  "dependencies": {
    "@myorg/shared-utils": "workspace:*",
    "@myorg/ui-components": "workspace:^1.0.0"
  }
}
```

Run commands across all workspaces using the filter flag:

```bash
# Install dependencies for all workspaces
bun install

# Run a script in a specific workspace
bun run --filter @myorg/web-app build

# Run a script in all workspaces that have it
bun run --filter '*' test
```

## Handling Peer Dependencies

Bun handles peer dependencies automatically by default, which differs from npm's approach. When you install a package, Bun will automatically install its peer dependencies unless they conflict with existing packages.

You can control peer dependency behavior through bunfig.toml:

```toml
[install]
# Automatically install peer dependencies (default: true)
peer = true

# Install optional dependencies (default: true)
optional = true

# Install dev dependencies (default: true in development)
dev = true
```

Here is an example showing how peer dependencies work in practice:

```json
{
  "name": "my-react-app",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0"
  }
}
```

When you install a package like `react-router-dom` that has `react` as a peer dependency, Bun will recognize that `react` is already installed and link to it:

```bash
# Bun automatically resolves peer dependencies
bun add react-router-dom

# No need for --legacy-peer-deps like in npm
```

## Registry Configuration

Bun supports multiple npm registries and can be configured to use private registries for specific scopes. This is essential for enterprise environments or when using private packages.

Configure registries in your bunfig.toml file:

```toml
[install]
# Set the default registry
registry = "https://registry.npmjs.org"

# Configure authentication for the default registry
[install.registry]
url = "https://registry.npmjs.org"
token = "$NPM_TOKEN"

# Configure a scoped registry for private packages
[install.scopes]
"@mycompany" = { url = "https://npm.mycompany.com", token = "$PRIVATE_NPM_TOKEN" }
"@another-scope" = "https://registry.another.com"
```

You can also use environment variables for sensitive tokens:

```bash
# Set the npm token via environment variable
export NPM_TOKEN="your-token-here"
export PRIVATE_NPM_TOKEN="your-private-token"

# Bun will automatically use these tokens
bun install
```

For GitHub Packages or other alternative registries, configure them like this:

```toml
[install.scopes]
"@your-github-username" = { 
  url = "https://npm.pkg.github.com", 
  token = "$GITHUB_TOKEN" 
}
```

## Caching Mechanism

Bun maintains a global cache of downloaded packages, which dramatically speeds up subsequent installations. Understanding how caching works can help you troubleshoot issues and optimize your workflow.

The default cache locations vary by operating system:

```bash
# macOS and Linux
~/.bun/install/cache

# Windows
%USERPROFILE%\.bun\install\cache
```

Here are useful cache management commands:

```bash
# Clear the entire cache
bun pm cache rm

# View cache location
bun pm cache

# Install from cache only (offline mode)
bun install --offline

# Force fresh installation ignoring cache
bun install --force
```

Configure cache behavior in bunfig.toml:

```toml
[install.cache]
# Custom cache directory
dir = "~/.my-bun-cache"

# Disable cache entirely (not recommended)
disable = false

# Disable fetching from remote registries (offline mode)
disableManifest = false
```

## Publishing Packages

Bun includes built-in support for publishing packages to npm registries. The publishing workflow is straightforward and supports all standard npm publishing features.

Before publishing, ensure your package.json is properly configured:

```json
{
  "name": "@myorg/my-package",
  "version": "1.0.0",
  "description": "A useful package for doing useful things",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/my-package.git"
  },
  "keywords": ["utility", "helper"],
  "author": "Your Name",
  "license": "MIT",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
```

Publish your package using these commands:

```bash
# Login to npm registry
bunx npm login

# Publish the package
bunx npm publish

# Publish with a specific tag
bunx npm publish --tag beta

# Publish a scoped package publicly
bunx npm publish --access public
```

For automated publishing in CI/CD pipelines, use authentication tokens:

```bash
# Set the auth token
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

# Publish using the token
bunx npm publish
```

## Performance Comparison

Let's examine concrete performance numbers comparing Bun with other package managers. These benchmarks were conducted on a typical Node.js project with approximately 500 dependencies.

Here is a simple benchmark script you can use to compare performance:

```bash
#!/bin/bash
# benchmark.sh - Compare package manager speeds

PROJECT_DIR="./benchmark-project"

echo "Testing npm..."
rm -rf $PROJECT_DIR/node_modules $PROJECT_DIR/package-lock.json
time npm install --prefix $PROJECT_DIR

echo "Testing yarn..."
rm -rf $PROJECT_DIR/node_modules $PROJECT_DIR/yarn.lock
time yarn --cwd $PROJECT_DIR install

echo "Testing pnpm..."
rm -rf $PROJECT_DIR/node_modules $PROJECT_DIR/pnpm-lock.yaml
time pnpm install --dir $PROJECT_DIR

echo "Testing bun..."
rm -rf $PROJECT_DIR/node_modules $PROJECT_DIR/bun.lockb
time bun install --cwd $PROJECT_DIR
```

Typical results on a modern machine with fast internet:

| Package Manager | Cold Install | Warm Install (with cache) |
|-----------------|--------------|---------------------------|
| npm | 45-60 seconds | 20-30 seconds |
| yarn | 30-45 seconds | 15-20 seconds |
| pnpm | 20-30 seconds | 10-15 seconds |
| Bun | 5-10 seconds | 2-5 seconds |

The performance gains are even more pronounced in CI/CD environments where you can leverage Bun's caching:

```yaml
# GitHub Actions example with Bun caching
name: CI
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Cache Bun dependencies
        uses: actions/cache@v3
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Run tests
        run: bun test
```

## Advanced Configuration Options

Bun's package manager can be extensively customized through bunfig.toml. Here is a comprehensive configuration file covering most options:

```toml
# bunfig.toml - Complete configuration example

[install]
# Automatically install peer dependencies
peer = true

# Install optional dependencies
optional = true

# Run lifecycle scripts after install
scripts = true

# Exact versions only (no ranges)
exact = false

# Save packages to dependencies by default
save = true

# Global packages directory
globalDir = "~/.bun/install/global"

# Global bin directory
globalBinDir = "~/.bun/bin"

[install.lockfile]
# Save lockfile
save = true

# Print yarn.lock alongside bun.lockb
print = "yarn"

[install.cache]
# Cache directory
dir = "~/.bun/install/cache"

# Disable cache
disable = false

[install.registry]
# Default registry URL
url = "https://registry.npmjs.org"

# Authentication token
token = "$NPM_TOKEN"

[install.scopes]
# Scoped registry configuration
"@mycompany" = { url = "https://npm.mycompany.com", token = "$PRIVATE_TOKEN" }

[run]
# Shell to use for scripts
shell = "/bin/bash"

# Enable watch mode by default
watch = false
```

## Troubleshooting Common Issues

When working with Bun as a package manager, you might encounter some common issues. Here are solutions to frequently encountered problems:

If you experience resolution conflicts, try clearing the cache and reinstalling:

```bash
# Clear cache and force reinstall
bun pm cache rm
rm -rf node_modules bun.lockb
bun install
```

For packages that require native compilation, ensure you have the necessary build tools:

```bash
# macOS - install Xcode command line tools
xcode-select --install

# Linux - install build essentials
sudo apt-get install build-essential python3
```

If a package does not work with Bun's runtime but you still want to use Bun for installation, you can run with Node.js:

```bash
# Install with Bun, run with Node
bun install
node dist/index.js
```

## Best Practices Summary

Here are the essential best practices for using Bun as your package manager:

1. **Use bunfig.toml for configuration** - Keep your configuration centralized and version-controlled in bunfig.toml rather than using command-line flags.

2. **Commit bun.lockb to version control** - Always commit your lockfile to ensure reproducible builds across all environments and team members.

3. **Use frozen lockfile in CI/CD** - Run `bun install --frozen-lockfile` in continuous integration to fail builds if the lockfile would change.

4. **Leverage workspaces for monorepos** - Use Bun's workspace support to manage multiple packages efficiently with shared dependencies.

5. **Configure caching in CI/CD** - Cache the `~/.bun/install/cache` directory to dramatically speed up CI builds.

6. **Use exact versions for production** - Consider using `--exact` flag or configuring `exact = true` in bunfig.toml for production applications.

7. **Keep Bun updated** - Bun is actively developed with frequent improvements. Update regularly to benefit from performance improvements and bug fixes.

8. **Use scoped registries for private packages** - Configure scoped registries in bunfig.toml for clean separation of public and private packages.

9. **Audit dependencies regularly** - Run `bun pm ls` to review your dependency tree and identify potential issues.

10. **Prefer bun.lockb over other lockfiles** - While Bun can generate yarn.lock for compatibility, the binary lockfile is faster and more efficient.

## Conclusion

Bun's package manager represents a significant leap forward in JavaScript dependency management. Its incredible speed, combined with full npm compatibility, makes it an excellent choice for both new projects and existing applications looking to improve their development workflow.

The key advantages of using Bun as your package manager include dramatically faster installation times, a smaller and more efficient lockfile format, seamless workspace support for monorepos, and straightforward configuration through bunfig.toml. Whether you are working on a small personal project or a large enterprise application, Bun can handle your package management needs with ease.

As the JavaScript ecosystem continues to evolve, tools like Bun are pushing the boundaries of what we expect from our development tooling. By adopting Bun as your package manager today, you position yourself to take advantage of ongoing improvements and maintain a modern, efficient development workflow.

Start by installing Bun in your next project and experience the difference that a truly fast package manager can make. Your CI/CD pipelines will thank you, and your team will appreciate the time saved waiting for dependencies to install.
