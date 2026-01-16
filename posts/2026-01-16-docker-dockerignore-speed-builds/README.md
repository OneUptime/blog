# How to Use .dockerignore to Speed Up Docker Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Build Optimization, DevOps, Performance, Best Practices

Description: Learn how to use .dockerignore to exclude unnecessary files from Docker build context, dramatically reducing build times and image sizes.

---

Every time you run `docker build`, Docker sends the entire build context (your project directory) to the daemon. Without a `.dockerignore` file, this includes node_modules, .git directories, build artifacts, and everything else - even files you never use in your image. A proper `.dockerignore` can reduce build times from minutes to seconds.

## How Build Context Works

When you run:
```bash
docker build -t myapp .
```

Docker packages everything in the current directory (`.`) and sends it to the Docker daemon. Only then does it start processing your Dockerfile.

```
Sending build context to Docker daemon  2.54GB
```

If you see a large number here, you're sending unnecessary files.

## The .dockerignore File

Create a `.dockerignore` file in your project root (same location as your Dockerfile). It uses the same syntax as `.gitignore`.

### Basic Syntax

```
# Comments start with #
pattern
!exception
```

| Pattern | Matches |
|---------|---------|
| `*.log` | All .log files |
| `temp?` | temp1, temp2, tempa, etc. |
| `**/node_modules` | node_modules in any subdirectory |
| `*.md` | All markdown files |
| `!README.md` | Exception: include README.md |

## Essential .dockerignore Patterns

### Node.js Projects

```dockerignore
# Dependencies - will be installed in container
node_modules
npm-debug.log
yarn-error.log
.pnpm-store

# Build outputs (if building in container)
dist
build
.next
.nuxt

# Development files
.env.local
.env.development
.env*.local

# Testing
coverage
.nyc_output
*.test.js
*.spec.js
__tests__
__mocks__

# IDE and editor
.vscode
.idea
*.swp
*.swo
.DS_Store

# Git
.git
.gitignore

# Docker files not needed in context
Dockerfile*
docker-compose*
.dockerignore

# Documentation
*.md
docs
LICENSE

# CI/CD
.github
.gitlab-ci.yml
.travis.yml
Jenkinsfile
```

### Python Projects

```dockerignore
# Virtual environments
venv
.venv
env
.env
ENV

# Byte-compiled files
__pycache__
*.py[cod]
*$py.class
*.so
.Python

# Distribution
dist
build
*.egg-info
.eggs

# Testing
.pytest_cache
.coverage
htmlcov
.tox
.nox

# Jupyter
.ipynb_checkpoints
*.ipynb

# IDE
.vscode
.idea
*.swp

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Documentation
docs
*.md
LICENSE
```

### Go Projects

```dockerignore
# Binary outputs
*.exe
*.dll
*.so
*.dylib
/bin
/build

# Test files
*_test.go

# IDE
.vscode
.idea

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Vendor (if vendoring in container)
# vendor/

# Documentation
*.md
docs

# Development
.env
*.log
```

### Generic Multi-Language Project

```dockerignore
# Version control
.git
.gitignore
.gitattributes
.svn
.hg

# IDE and editors
.vscode
.idea
*.sublime-*
*.swp
*.swo
*~
.DS_Store
Thumbs.db

# Docker files (not needed in build context)
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github
.gitlab-ci.yml
.travis.yml
.circleci
Jenkinsfile
azure-pipelines.yml

# Documentation
*.md
!README.md
docs
LICENSE
CHANGELOG
CONTRIBUTING

# Testing
test
tests
__tests__
*.test.*
*.spec.*
coverage
.nyc_output
.coverage

# Build artifacts
dist
build
out
target
*.o
*.a
*.so

# Logs
*.log
logs

# Temporary files
tmp
temp
*.tmp
*.temp

# Environment files
.env
.env.*
!.env.example

# Secrets (NEVER include)
*.pem
*.key
*.crt
secrets
credentials
```

## Negation Patterns (Exceptions)

Use `!` to include files that would otherwise be excluded.

```dockerignore
# Ignore all markdown
*.md

# But include README
!README.md

# Ignore all in docs
docs/

# But include API documentation
!docs/api/
```

**Important**: The order matters. Place exceptions after the patterns they override.

## Directory-Specific Ignores

```dockerignore
# Ignore test directories everywhere
**/test
**/tests

# Ignore node_modules only in root
/node_modules

# Ignore node_modules everywhere
**/node_modules
```

## Debugging .dockerignore

### Check What's Being Sent

```bash
# Create a tarball of what would be sent
tar -cvf context.tar --exclude-from=.dockerignore .
du -sh context.tar

# Or use a test build
docker build --no-cache -t test . 2>&1 | head -5
```

### List Ignored Files

```bash
# Using rsync to simulate
rsync -av --dry-run --exclude-from=.dockerignore . /dev/null
```

### Common Mistakes

#### Mistake 1: Ignoring Too Much

```dockerignore
# BAD: ignores everything, then your COPY fails
*

# GOOD: be specific
node_modules
.git
*.log
```

#### Mistake 2: Forgetting Leading Slash

```dockerignore
# Ignores "build" anywhere in the tree
build

# Ignores only root-level "build"
/build
```

#### Mistake 3: Trailing Slash Confusion

```dockerignore
# Matches "logs" directory AND file named "logs"
logs

# Matches only "logs" directory
logs/
```

## Optimization Strategies

### Strategy 1: Whitelist Approach

For very selective builds, ignore everything then whitelist what you need.

```dockerignore
# Ignore everything
*

# Include only what's needed
!src/
!package.json
!package-lock.json
!tsconfig.json
```

### Strategy 2: Separate Dockerfiles

For different build contexts (dev vs prod), use different Dockerfiles with different ignore patterns.

```bash
# Development build
docker build -f Dockerfile.dev -t myapp:dev .

# Production build (different .dockerignore)
docker build -f Dockerfile.prod -t myapp:prod .
```

### Strategy 3: Multi-stage Build Context

Structure your project so the Dockerfile is in a subdirectory with only what's needed.

```
project/
├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── (source files)
├── tests/
├── docs/
└── (other files not needed for build)
```

```bash
docker build -t myapp ./src
```

## Measuring the Impact

### Before Optimization

```bash
$ docker build -t myapp .
Sending build context to Docker daemon  847.3MB
...
Step 5/10 : COPY . .
...
Successfully built abc123
Time: 2m 34s
```

### After Adding .dockerignore

```bash
$ docker build -t myapp .
Sending build context to Docker daemon  12.4MB
...
Step 5/10 : COPY . .
...
Successfully built def456
Time: 18s
```

## Complete Example: Next.js Application

### Project Structure

```
myapp/
├── .git/              # 150MB
├── node_modules/      # 500MB
├── .next/             # 100MB
├── public/            # 5MB
├── src/               # 2MB
├── tests/             # 3MB
├── coverage/          # 20MB
├── docs/              # 10MB
├── package.json
├── next.config.js
├── Dockerfile
└── .dockerignore
```

### .dockerignore

```dockerignore
# Dependencies (installed in container)
node_modules

# Build output (built in container)
.next
out
build

# Development
.env.local
.env.development.local
.env.test.local
.env.production.local

# Testing
coverage
.nyc_output
**/*.test.js
**/*.test.tsx
**/*.spec.js
**/*.spec.tsx
__tests__
__mocks__
jest.config.js
jest.setup.js

# IDE
.vscode
.idea
*.swp

# Git
.git
.gitignore
.gitattributes

# Docker (not needed in context)
Dockerfile
docker-compose*.yml
.dockerignore

# Documentation
*.md
docs
LICENSE

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# Misc
*.log
tmp
temp
```

### Result

Build context reduced from 790MB to 7MB, build time from 3 minutes to 25 seconds.

## Summary

| What to Exclude | Why |
|-----------------|-----|
| `node_modules`, `vendor`, `venv` | Dependencies installed during build |
| `.git` | Version history not needed in image |
| `dist`, `build`, `.next` | Build artifacts recreated in container |
| `*.md`, `docs` | Documentation not needed at runtime |
| `*.test.js`, `coverage` | Test files not needed in production |
| `.env`, secrets | Never include secrets in images |
| IDE files, `.DS_Store` | Development artifacts |

A good `.dockerignore` is one of the simplest ways to improve Docker build performance. Start with a comprehensive template and adjust based on your project's needs.
