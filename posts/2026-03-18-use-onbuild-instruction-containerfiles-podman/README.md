# How to Use ONBUILD Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, ONBUILD, Base Images, DevOps

Description: Learn how to use the ONBUILD instruction in Containerfiles for Podman to create reusable base images that automatically execute build steps in child images.

---

> ONBUILD lets you create base images that are smart enough to configure themselves when other images build on top of them.

When multiple projects share the same build patterns, you often end up duplicating Containerfile instructions across repositories. The ONBUILD instruction solves this by letting you define build steps in a base image that are deferred and executed automatically when a child image uses that base with FROM. This guide explains how ONBUILD works with Podman, when to use it, and what pitfalls to avoid.

---

## What Is the ONBUILD Instruction?

The ONBUILD instruction registers a build trigger in the image metadata. The instruction itself does nothing during the current build. Instead, it fires when another Containerfile uses this image as its base with the FROM instruction.

The syntax wraps another Containerfile instruction:

```dockerfile
ONBUILD <INSTRUCTION>
```

For example:

```dockerfile
ONBUILD COPY . /app
ONBUILD RUN npm install
```

These instructions are stored in the image but only execute when a downstream image inherits from it. Most build instructions can be used this way, but there are a few limitations covered later in this guide.

## How ONBUILD Works

The lifecycle of ONBUILD involves two phases:

**Phase 1: Building the base image.** ONBUILD instructions are recorded in the image metadata but not executed.

**Phase 2: Building a child image.** When a Containerfile starts with `FROM base-image`, Podman reads the ONBUILD triggers from the base image and executes them immediately after the FROM instruction, before any other instructions in the child Containerfile.

Let us see this in action.

## Important: Use Docker Format with ONBUILD

Podman defaults to the OCI image format, which does not support the ONBUILD instruction. If you build with the default format, Podman warns that the ONBUILD instruction will be ignored. You must use the Docker format by passing `--format docker` to `podman build`, or by setting the environment variable `BUILDAH_FORMAT=docker`.

## Building a Reusable Node.js Base Image

Create a base image for Node.js applications:

```dockerfile
# base/Containerfile

FROM node:20-alpine

WORKDIR /app

# These run when child images are built
ONBUILD COPY package*.json ./
ONBUILD RUN npm ci --omit=dev
ONBUILD COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

Build the base image:

```bash
podman build --format docker -t my-node-base -f base/Containerfile .
```

Now any Node.js project that includes `package-lock.json` can use this base with a minimal Containerfile:

```dockerfile
# app/Containerfile
FROM my-node-base
```

That is it. When this child image is built, Podman automatically executes the ONBUILD triggers, which copy `package.json` and `package-lock.json`, install dependencies, and copy the application code.

```bash
cd my-node-app
podman build --format docker -t my-app -f Containerfile .
```

Behind the scenes, the effective build is equivalent to:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Inspecting ONBUILD Triggers

You can view the ONBUILD triggers registered in an image:

```bash
podman image inspect my-node-base --format '{{json .Config.OnBuild}}' | jq
```

This will output:

```json
[
  "COPY package*.json ./",
  "RUN npm ci --omit=dev",
  "COPY . ."
]
```

## Python Base Image Example

Create a reusable base for Python applications with poetry:

```dockerfile
# python-base/Containerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false

WORKDIR /app

ONBUILD COPY pyproject.toml poetry.lock* ./
ONBUILD RUN poetry install --without dev --no-interaction --no-ansi
ONBUILD COPY . .

CMD ["python", "main.py"]
```

Child Python projects need only:

```dockerfile
FROM my-python-base

# Optionally override the default command
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Go Base Image Example

For Go applications, ONBUILD can standardize the entire build process:

```dockerfile
# go-base/Containerfile
FROM golang:1.22-alpine

WORKDIR /app

ONBUILD COPY go.mod go.sum ./
ONBUILD RUN go mod download && go mod verify
ONBUILD COPY . .
ONBUILD RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server .

CMD ["/server"]
```

Note that ONBUILD with multi-stage builds requires careful consideration. If you want to use `ONBUILD COPY --from=build ...`, the `build` stage must be defined in the child Containerfile where the ONBUILD trigger fires. In practice, this limits ONBUILD's usefulness with multi-stage builds.

## ONBUILD with Validation

You can use ONBUILD to enforce requirements on child images:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Ensure child images have required files
ONBUILD COPY package*.json ./
ONBUILD RUN test -f package.json || (echo "package.json is required" && exit 1)
ONBUILD RUN test -f package-lock.json || (echo "package-lock.json is required for npm ci" && exit 1)
ONBUILD RUN npm ci --omit=dev
ONBUILD COPY . .

# Validate the application structure
ONBUILD RUN test -f server.js || test -f index.js || \
    (echo "Either server.js or index.js must exist" && exit 1)

EXPOSE 3000
CMD ["node", "server.js"]
```

If a child project does not have the required files, the build fails with a clear error message.

## ONBUILD for Testing Standards

Enforce testing standards across projects:

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir pytest pylint

WORKDIR /app

ONBUILD COPY requirements.txt ./
ONBUILD RUN pip install --no-cache-dir -r requirements.txt
ONBUILD COPY . .

# Run linting as part of every child build
ONBUILD RUN find . -name '*.py' -exec pylint --errors-only {} + || true

# Run tests as part of every child build
ONBUILD RUN pytest --tb=short || echo "WARNING: Tests failed"

CMD ["python", "main.py"]
```

## Instructions That Cannot Use ONBUILD

There are a few limitations on what can be used with ONBUILD:

- `ONBUILD FROM` is not allowed because it would change the base image of the child.
- `ONBUILD MAINTAINER` is not allowed.
- `ONBUILD ONBUILD` is not allowed because triggers do not chain. An ONBUILD trigger in a base image does not propagate to grandchild images.

This means ONBUILD only affects direct children, not all descendants.

## When to Use ONBUILD

ONBUILD works best in specific scenarios. It is ideal when you have multiple projects with identical build patterns, such as a team with many microservices using the same language and framework. It is also useful for creating standardized base images for an organization, where you want to enforce consistent build steps, testing, or security scanning across all projects.

## When to Avoid ONBUILD

ONBUILD is not always the right choice. Avoid it when child images need significantly different build steps, as the hidden triggers make it hard to understand what the build actually does. Avoid it for public base images unless you document the triggers thoroughly. Do not use it if any child image needs to skip or modify one of the triggered steps. The opacity of ONBUILD instructions can make debugging harder because the build steps are not visible in the child Containerfile.

## Debugging ONBUILD Issues

When ONBUILD triggers cause build failures, the error messages can be confusing because the failing instruction is not in the Containerfile you are building. Always check the base image's ONBUILD triggers:

```bash
# View what triggers are set
podman image inspect my-base --format '{{json .Config.OnBuild}}' | jq

# View the history to understand all layers
podman history my-base
```

## Best Practices

Document ONBUILD triggers in the base image's README or comments. Keep ONBUILD triggers minimal and focused on universal build steps. Inspect base images before using them to understand what triggers exist. Version your base images so child projects can pin to stable versions. Do not use ONBUILD for steps that frequently change. Test your base images with representative child projects to verify the triggers work correctly. Consider whether a simple copy-paste of instructions or a template might be more maintainable than ONBUILD.

## Conclusion

The ONBUILD instruction is a powerful mechanism for creating smart, reusable base images that automatically configure themselves when inherited. It reduces boilerplate across projects and enforces consistent build patterns within an organization. However, the hidden nature of ONBUILD triggers demands careful documentation and disciplined use. Use it when you have genuine consistency across many projects, and prefer explicit instructions when builds need flexibility.
