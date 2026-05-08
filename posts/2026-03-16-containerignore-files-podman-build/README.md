# How to Use .containerignore Files with Podman Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Containerignore, Build Context

Description: Learn how to use .containerignore files to exclude unnecessary files from Podman build contexts, reducing build times and image sizes.

---

> A well-crafted .containerignore file can cut build context transfer time from minutes to seconds.

When you run `podman build`, the entire build context directory is sent to the build process. Without a `.containerignore` file, this includes everything: git history, node_modules, test data, documentation, and IDE configurations. Excluding unnecessary files speeds up builds and prevents accidentally copying sensitive data into images. This guide covers practical `.containerignore` patterns.

---

## How Build Context Works

The build context is the directory you pass to `podman build`. All files in it become available to COPY and ADD instructions.

```bash
# The dot (.) is the build context

podman build -t myapp:latest .

# See how large your build context is
du -sh --exclude=.git .
```

## Creating a .containerignore File

Create a `.containerignore` file in your project root. Podman also recognizes `.dockerignore` if `.containerignore` is not present.

```bash
cat > .containerignore << 'EOF'
# Version control
.git
.gitignore
.gitattributes

# IDE and editor files
.vscode
.idea
*.swp
*.swo
*~

# Documentation
*.md
LICENSE
docs/

# Dependencies installed locally
node_modules

# Build artifacts
dist
build
*.o
*.pyc
__pycache__

# Test files
test
tests
coverage
.nyc_output

# Configuration files not needed in the image
.env
.env.*
docker-compose*.yml

# CI/CD configuration
.github
.gitlab-ci.yml
.circleci
Jenkinsfile

# OS files
.DS_Store
Thumbs.db
EOF
```

## Pattern Syntax

The `.containerignore` file uses the same syntax as `.dockerignore`: newline-separated Unix shell-style glob patterns, with `!` for exceptions and `**` to match any number of directories.

```bash
cat > .containerignore << 'EOF'
# Ignore specific files
README.md
LICENSE
Makefile

# Ignore by extension
*.log
*.tmp
*.bak

# Ignore directories
node_modules/
vendor/
.git/

# Wildcard patterns
**/temp
**/*.test.js
**/*.spec.ts

# Negate a pattern (include something previously excluded)
*.md
!CHANGELOG.md

# Ignore everything, then explicitly include
*
!src/
!src/**
!package.json
!package-lock.json
!Containerfile
EOF
```

## Measuring the Impact

Compare the raw project size and build time with and without `.containerignore`.

```bash
# Check raw project size before ignore filtering
echo "Project size before ignore filtering:"
tar -cf - --exclude=.git . 2>/dev/null | wc -c | awk '{printf "%.2f MB\n", $1/1048576}'

# Build without ignore rules by using an empty ignore file
echo "Without .containerignore rules:"
time podman build --ignorefile /dev/null -t test:no-ignore .

# Build with .containerignore applied
echo "With .containerignore rules:"
time podman build -t test:with-ignore .
```

## Node.js Project

A typical `.containerignore` for a Node.js project.

```bash
cat > .containerignore << 'EOF'
# Dependencies (will be installed during build)
node_modules
npm-debug.log*

# Build output (will be built during build)
dist
build

# Test files
test
tests
**/*.test.js
**/*.spec.js
coverage
.nyc_output
jest.config.*

# Development files
.eslintrc*
.prettierrc*
tsconfig.json
nodemon.json

# Documentation
*.md
docs

# Git and IDE
.git
.gitignore
.vscode
.idea

# Environment files
.env
.env.*

# Container files
Containerfile
Dockerfile
docker-compose*
.containerignore
.dockerignore
EOF
```

## Python Project

A typical `.containerignore` for a Python project.

```bash
cat > .containerignore << 'EOF'
# Virtual environments
venv
.venv
env

# Python artifacts
__pycache__
*.py[cod]
*.pyo
*.egg-info
dist
build
*.egg

# Test files
tests
test
.pytest_cache
.coverage
htmlcov
.tox

# Development tools
.flake8
.mypy_cache
.pylintrc
pyproject.toml
setup.cfg
Makefile

# Documentation
*.md
docs

# Git and IDE
.git
.gitignore
.vscode
.idea

# Environment
.env
.env.*

# Container files
Containerfile
Dockerfile
docker-compose*
.containerignore
.dockerignore
EOF
```

## Go Project

A typical `.containerignore` for a Go project.

```bash
cat > .containerignore << 'EOF'
# Binary output
/bin
*.exe

# Test files
*_test.go
testdata

# Vendor (if vendoring is handled in the build)
# vendor/

# Documentation
*.md
docs

# Git and IDE
.git
.gitignore
.vscode
.idea

# CI/CD
.github
.gitlab-ci.yml

# Container files
Containerfile
Dockerfile
docker-compose*
.containerignore
.dockerignore
EOF
```

## Allowlist Pattern (Exclude Everything, Include Specific)

The most restrictive approach: exclude everything and explicitly include what you need.

```bash
cat > .containerignore << 'EOF'
# Exclude everything
*

# Include only what the build needs
!src/
!src/**
!public/
!public/**
!package.json
!package-lock.json
!tsconfig.json
!next.config.js
EOF
```

This is the most secure approach as new files are excluded by default.

## Debugging .containerignore Issues

When files are unexpectedly included or excluded, debug with these techniques.

```bash
# Test what gets included by creating a Containerfile that lists files
cat > Containerfile.debug << 'EOF'
FROM docker.io/library/alpine:latest
COPY . /build-context
RUN find /build-context -type f | sort
EOF

podman build -f Containerfile.debug -t debug-context:latest .
podman run --rm debug-context:latest find /build-context -type f | sort

# Clean up
podman rmi debug-context:latest
```

## .containerignore vs .dockerignore Priority

Podman checks for ignore files in this order:

```bash
# Priority order:
# 1. .containerignore (Podman-native)
# 2. .dockerignore (Docker compatibility)

# If both exist, .containerignore is used
ls -la .containerignore .dockerignore 2>/dev/null

# For Docker compatibility, you can symlink
ln -s .containerignore .dockerignore
```

## Summary

A well-maintained `.containerignore` file is essential for fast, secure builds. It reduces build context size, prevents sensitive files from being copied into images, and improves cache efficiency. Start with an allowlist pattern for maximum security, or use a blocklist pattern for convenience. Always verify your ignore patterns by inspecting what actually gets included in the build context.
