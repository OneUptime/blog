# How to Use Docker Ignore Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, Build Process, Best Practices, DevOps

Description: Learn how to use .dockerignore files to exclude unnecessary files from Docker builds, speed up build times, reduce image sizes, and prevent sensitive data from being included in images.

---

The `.dockerignore` file tells Docker which files and directories to exclude when building images. Proper use of this file dramatically improves build performance and prevents sensitive or unnecessary files from ending up in your images.

## Why .dockerignore Matters

When you run `docker build`, Docker sends the entire build context (usually your project directory) to the Docker daemon. Without a .dockerignore file:

- Build context transfer takes longer
- Large files slow down every build
- Sensitive files may end up in the image
- Cache invalidation happens more frequently

```bash
# See what gets sent to the daemon
docker build . 2>&1 | head -5
# Sending build context to Docker daemon  450.2MB

# With proper .dockerignore
docker build . 2>&1 | head -5
# Sending build context to Docker daemon  2.3MB
```

## Basic Syntax

The .dockerignore syntax is similar to .gitignore.

```bash
# .dockerignore

# Comments start with #
# Blank lines are ignored

# Ignore specific file
secret.key

# Ignore all files with extension
*.log
*.tmp

# Ignore entire directories
node_modules/
.git/

# Ignore files starting with pattern
temp-*

# Ignore files in any subdirectory
**/*.md

# But include specific file (exception)
!README.md
```

## Pattern Matching Rules

```bash
# Exact file/directory match
Dockerfile
docker-compose.yml

# Wildcard (*) matches any sequence except /
*.log           # matches app.log, error.log
config-*.json   # matches config-dev.json, config-prod.json

# Double asterisk (**) matches any path
**/node_modules  # matches node_modules anywhere in tree
**/*.test.js     # matches any .test.js file anywhere

# Question mark (?) matches single character
log?.txt         # matches log1.txt, logA.txt

# Negation (!) includes previously excluded files
*.md             # ignore all markdown
!README.md       # but keep README.md

# Directory matching
docs/            # ignore docs directory and contents
```

## Essential .dockerignore Template

```bash
# .dockerignore - Essential exclusions for most projects

# Version control
.git
.gitignore
.gitattributes

# Documentation
*.md
docs/
LICENSE

# Docker files (prevent recursive builds)
Dockerfile*
docker-compose*
.docker/

# IDE and editor files
.idea/
.vscode/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Test files
**/test/
**/tests/
**/__tests__/
*.test.*
*.spec.*
coverage/

# Build artifacts (will be generated in container)
dist/
build/
out/
target/

# Dependencies (will be installed in container)
node_modules/
vendor/
venv/
.venv/
__pycache__/
*.pyc

# Environment and secrets
.env
.env.*
*.pem
*.key
credentials/
secrets/

# Logs
*.log
logs/

# Temporary files
tmp/
temp/
*.tmp
```

## Language-Specific Examples

### Node.js Project

```bash
# .dockerignore for Node.js

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Test
coverage/
.nyc_output/
*.test.js
*.spec.js
__tests__/
jest.config.js

# TypeScript
*.tsbuildinfo

# Environment
.env
.env.*

# Development
.eslintcache
.prettierignore
nodemon.json

# Git
.git
.gitignore
```

### Python Project

```bash
# .dockerignore for Python

# Byte-compiled files
__pycache__/
*.py[cod]
*$py.class

# Virtual environments
venv/
.venv/
env/
ENV/

# Testing
.pytest_cache/
.tox/
.coverage
htmlcov/
coverage.xml
*.cover
tests/

# Build
*.egg-info/
dist/
build/
*.egg

# IDE
.idea/
.vscode/
*.pyc

# Environment
.env
.env.*

# Git
.git
.gitignore
```

### Go Project

```bash
# .dockerignore for Go

# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib
bin/

# Test binary
*.test

# Output
*.out
coverage.txt

# Vendor (if managed externally)
# vendor/

# IDE
.idea/
.vscode/

# Git
.git
.gitignore
```

## Exception Patterns

Sometimes you need to exclude everything except specific files.

```bash
# Ignore everything
*

# But keep these essential files
!src/
!package.json
!package-lock.json
!tsconfig.json
```

This pattern is useful when you want explicit control over what gets included.

### Ordering Matters

Patterns are processed in order. Later patterns can override earlier ones.

```bash
# Ignore all markdown files
*.md

# But keep the main README
!README.md

# This order matters - if reversed, README.md would be ignored
```

## Debugging .dockerignore

### Test What Gets Included

```bash
# Create a simple Dockerfile to list context files
cat > Dockerfile.test << 'EOF'
FROM alpine
COPY . /context
RUN find /context -type f | sort
EOF

# Build and see what files were included
docker build -f Dockerfile.test -t context-test . 2>&1 | grep "context/"

# Clean up
rm Dockerfile.test
docker rmi context-test
```

### Measure Build Context Size

```bash
# Check current context size
du -sh --exclude='.git' .

# Build with BuildKit to see context size
DOCKER_BUILDKIT=1 docker build . 2>&1 | grep "transferring context"
```

## Multi-Stage Builds and .dockerignore

```dockerfile
# Dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
```

```bash
# .dockerignore - optimized for multi-stage build
# Build stage gets source, but final image doesn't need it

# Always exclude
.git
node_modules/    # Will be installed fresh in container
*.md
docker*

# Test files not needed in build
*.test.js
*.spec.js
__tests__/
coverage/

# These are regenerated during build
dist/
build/
```

## Common Mistakes

### Ignoring Necessary Files

```bash
# Wrong: Ignoring all JSON files breaks package.json
*.json

# Correct: Be specific about what to ignore
tsconfig.json   # Keep package.json, ignore config
```

### Not Ignoring node_modules

```bash
# Without this, builds are slow and unpredictable
# Always exclude and let npm/yarn install fresh in container
node_modules/
```

### Forgetting Environment Files

```bash
# These should always be ignored
.env
.env.local
.env.development
.env.production
*.env

# Use build args or secrets instead
```

### Path Matching Confusion

```bash
# This only matches 'logs' in the root directory
logs

# This matches 'logs' anywhere in the tree
**/logs

# This matches files/dirs starting with 'log' in root
log*

# This matches files/dirs starting with 'log' anywhere
**/log*
```

## .dockerignore vs .gitignore

They serve different purposes and often differ:

```bash
# .gitignore - excludes from version control
dist/           # Don't commit build output
node_modules/   # Don't commit dependencies

# .dockerignore - excludes from build context
.git/           # Not needed in container
*.md            # Docs not needed in container
tests/          # Tests not needed in production image
```

Files can be in one, both, or neither depending on your needs.

---

A well-crafted .dockerignore file improves build speed, reduces image size, and prevents sensitive files from leaking into your images. Start with the essential template covering version control, dependencies, and secrets, then customize for your language and project structure. Remember that the goal is to include only what the container actually needs to build and run your application.
