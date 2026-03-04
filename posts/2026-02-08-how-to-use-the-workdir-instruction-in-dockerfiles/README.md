# How to Use the WORKDIR Instruction in Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, WORKDIR, Containers, Best Practices

Description: Understand how the WORKDIR instruction sets the working directory in Dockerfiles and why it matters for clean builds.

---

The WORKDIR instruction in a Dockerfile sets the working directory for all subsequent instructions. Any RUN, CMD, ENTRYPOINT, COPY, or ADD instruction that follows will execute relative to this directory. It is a simple instruction, but using it correctly makes your Dockerfiles cleaner, more predictable, and easier to maintain.

This guide explains how WORKDIR works, when to use it, and how it interacts with other Dockerfile instructions.

## Basic Syntax

The syntax is straightforward:

```dockerfile
# Set the working directory to /app
WORKDIR /app
```

After this instruction, all subsequent commands run in the `/app` directory. If the directory does not exist, Docker creates it automatically.

## Why WORKDIR Matters

Without WORKDIR, you might write something like this:

```dockerfile
# Without WORKDIR - messy and error-prone
FROM python:3.11-slim
RUN mkdir -p /usr/src/app
RUN cd /usr/src/app && pip install flask
COPY . /usr/src/app/
RUN cd /usr/src/app && python setup.py install
CMD ["python", "/usr/src/app/app.py"]
```

The problem here is that `cd` in a RUN instruction only affects that single RUN. The next RUN starts back at the root directory. You have to repeat the path in every instruction.

With WORKDIR, this becomes much cleaner:

```dockerfile
# With WORKDIR - clean and maintainable
FROM python:3.11-slim
WORKDIR /usr/src/app
RUN pip install flask
COPY . .
RUN python setup.py install
CMD ["python", "app.py"]
```

Every instruction after WORKDIR /usr/src/app operates in that directory. COPY `.` copies files to `/usr/src/app/`. CMD runs from `/usr/src/app/`. No repeated paths, no `cd` commands.

## WORKDIR Creates Directories Automatically

If the specified directory does not exist, WORKDIR creates it. You do not need a separate `RUN mkdir` instruction.

```dockerfile
# Docker creates /app/src/config automatically - no mkdir needed
WORKDIR /app/src/config
```

This creates the full directory path, similar to `mkdir -p`. Every intermediate directory in the path is created if it does not exist.

## Multiple WORKDIR Instructions

You can use WORKDIR multiple times in a Dockerfile. Each one changes the working directory for subsequent instructions.

```dockerfile
FROM node:20-alpine

# Install dependencies in /app
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the frontend in /app/frontend
WORKDIR /app/frontend
COPY frontend/ .
RUN npm run build

# Switch to the server directory
WORKDIR /app/server
COPY server/ .
```

Each WORKDIR changes the context. Instructions between two WORKDIR statements execute in the directory set by the most recent one.

## Relative Paths in WORKDIR

WORKDIR accepts both absolute and relative paths. Relative paths are resolved relative to the previous WORKDIR.

```dockerfile
# Start at /app
WORKDIR /app

# Relative path - resolves to /app/src
WORKDIR src

# Another relative path - resolves to /app/src/main
WORKDIR main
```

After these three instructions, the working directory is `/app/src/main`. Using relative paths can make Dockerfiles harder to read, so absolute paths are generally preferred for clarity.

## WORKDIR with Environment Variables

WORKDIR supports environment variable expansion. Variables set with ENV are available in WORKDIR:

```dockerfile
# Use an environment variable in WORKDIR
ENV APP_HOME=/opt/myapp
WORKDIR $APP_HOME
```

This sets the working directory to `/opt/myapp`. This is useful when you want to define the application path once and reference it in multiple places.

```dockerfile
# Define the path once, use it everywhere
ENV APP_HOME=/opt/myapp
WORKDIR $APP_HOME

COPY . .
RUN pip install -r requirements.txt

# CMD also runs from $APP_HOME
CMD ["python", "main.py"]
```

## How WORKDIR Interacts with Other Instructions

### WORKDIR and COPY

COPY destinations are relative to the current WORKDIR:

```dockerfile
WORKDIR /app

# These two are equivalent
COPY app.py .
COPY app.py /app/app.py
```

The `.` in `COPY app.py .` refers to the current WORKDIR, which is `/app`.

### WORKDIR and RUN

RUN commands execute in the WORKDIR directory:

```dockerfile
WORKDIR /app

# This runs "ls" in /app
RUN ls -la

# This creates a file in /app
RUN echo "hello" > greeting.txt
```

Remember that unlike `cd`, WORKDIR persists across instructions. A `cd` inside a RUN only lasts for that single instruction:

```dockerfile
WORKDIR /app

# The cd to /tmp only affects this RUN instruction
RUN cd /tmp && echo "in tmp"

# This still runs in /app, not /tmp
RUN pwd
# Output: /app
```

### WORKDIR and CMD/ENTRYPOINT

The working directory at runtime is determined by the last WORKDIR instruction:

```dockerfile
WORKDIR /app
CMD ["python", "app.py"]
# This runs: python /app/app.py
```

You can override the working directory at runtime with the `-w` flag:

```bash
# Override WORKDIR when running the container
docker run -w /tmp myimage pwd
# Output: /tmp
```

### WORKDIR and USER

WORKDIR creates directories as root, regardless of the USER instruction. If you switch to a non-root user before WORKDIR, the directory is still created with root ownership:

```dockerfile
# The directory is created with root ownership
RUN useradd -m appuser
USER appuser
WORKDIR /app/data
# /app/data is owned by root, not appuser
```

To fix this, set permissions explicitly:

```dockerfile
FROM python:3.11-slim

# Create user first
RUN useradd -m appuser

# Set up the directory with correct ownership
WORKDIR /app
RUN chown appuser:appuser /app

# Now switch to the non-root user
USER appuser

# Subsequent files will be created by appuser
COPY --chown=appuser:appuser . .
```

## Common WORKDIR Patterns

### Standard Application Layout

Most Dockerfiles use a single WORKDIR for the application:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### Multi-Stage Build with Different WORKDIRs

In multi-stage builds, each stage can have its own WORKDIR:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /build/dist .
```

### Monorepo with Multiple Services

For monorepo structures, WORKDIR helps navigate between directories:

```dockerfile
FROM node:20-alpine

# Install root dependencies
WORKDIR /app
COPY package.json lerna.json ./
RUN npm install

# Build the shared library
WORKDIR /app/packages/shared
COPY packages/shared/ .
RUN npm run build

# Build the API service
WORKDIR /app/packages/api
COPY packages/api/ .
RUN npm run build

CMD ["node", "dist/index.js"]
```

## What Not to Do with WORKDIR

**Don't use cd in RUN instructions instead of WORKDIR**:

```dockerfile
# Bad - cd only lasts for one RUN instruction
RUN cd /app && pip install -r requirements.txt
RUN python setup.py install  # This runs in /, not /app

# Good - WORKDIR persists
WORKDIR /app
RUN pip install -r requirements.txt
RUN python setup.py install  # This runs in /app
```

**Don't use deeply nested paths without a good reason**:

```dockerfile
# Unnecessarily deep - harder to work with
WORKDIR /var/opt/mycompany/myapp/production/v2/current

# Simple and clear
WORKDIR /app
```

**Don't forget to set WORKDIR before COPY with relative destinations**:

```dockerfile
# Confusing - where does this file go?
COPY app.py .

# Clear - the file goes to /app/app.py
WORKDIR /app
COPY app.py .
```

## Inspecting the WORKDIR of an Image

You can check what WORKDIR is set in an existing image:

```bash
# Inspect the working directory of an image
docker inspect --format='{{.Config.WorkingDir}}' python:3.11-slim
```

Or check it by running a command in a container:

```bash
# Print the working directory inside a container
docker run --rm python:3.11-slim pwd
```

## Summary

WORKDIR sets the working directory for all subsequent Dockerfile instructions. It creates directories automatically, supports environment variables, and persists across RUN instructions (unlike `cd`). Use absolute paths for clarity, set WORKDIR early in your Dockerfile, and use it consistently instead of hard-coding paths in every instruction. It is a small instruction that makes a big difference in keeping your Dockerfiles clean and maintainable.
