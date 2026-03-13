# How to Use RUN --mount=type=secret for Build-Time Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, BuildKit, Secrets, Security, DevOps, Best Practices

Description: Securely pass secrets like API keys and SSH keys during Docker builds using RUN --mount=type=secret without leaking them into image layers.

---

Passing secrets to Docker builds has always been tricky. You need credentials during the build to pull private packages, access private repositories, or authenticate with APIs. But anything you put in a Dockerfile through ARG or ENV instructions gets baked into the image layers. Anyone who pulls your image can extract those secrets.

The `RUN --mount=type=secret` feature in BuildKit solves this problem cleanly. It makes secrets available during a single RUN instruction without writing them to any layer. Once the instruction finishes, the secret disappears from the build context entirely.

## The Problem with Traditional Approaches

Before secret mounts, people used workarounds that all had drawbacks.

Passing secrets through ARG leaks them into image history:

```dockerfile
# BAD: Secret is stored in the image layer metadata
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && \
    rm .npmrc
# Even though .npmrc is deleted, the ARG value is visible in docker history
```

Anyone can see the secret:

```bash
# This reveals the secret from the build history
docker history myimage --no-trunc | grep NPM_TOKEN
```

Multi-stage builds help but still leave the secret in intermediate layers:

```dockerfile
# SLIGHTLY BETTER but secrets still exist in the builder stage layers
FROM node:20 AS builder
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
RUN npm install
RUN rm .npmrc

FROM node:20-slim
COPY --from=builder /app/node_modules /app/node_modules
# Secret is gone from final image, but still in builder layer cache
```

## How Secret Mounts Work

A secret mount makes a file available inside the build container at a temporary path. The file exists only during the execution of the RUN instruction that mounts it. It never appears in any image layer, not even in intermediate layers or build cache.

The basic flow:

1. You create a file containing the secret on your host machine
2. You pass it to the build command with `--secret`
3. Inside the Dockerfile, you mount it with `RUN --mount=type=secret`
4. The secret is available at `/run/secrets/<id>` during that RUN instruction
5. After the instruction completes, the secret vanishes

## Basic Usage

Pass a secret file during the build and use it in a RUN instruction.

Create a Dockerfile that uses a secret:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .

# Mount the secret and use it during pip install
# The secret is available at /run/secrets/pip_conf during this RUN only
RUN --mount=type=secret,id=pip_conf,target=/etc/pip.conf \
    pip install -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

Build the image, passing the secret file:

```bash
# Create the secret file
echo "[global]
index-url = https://user:token@private.pypi.org/simple/" > pip.conf

# Pass the secret during build
docker build --secret id=pip_conf,src=pip.conf -t myapp .

# The secret does not exist in the final image
docker run --rm myapp cat /etc/pip.conf
# Output: cat: /etc/pip.conf: No such file or directory
```

## npm Private Registry Authentication

Install packages from a private npm registry without leaking the auth token.

Dockerfile with npm secret:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./

# Mount .npmrc as a secret during npm install
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --production

COPY . .
CMD ["node", "index.js"]
```

Build with the npm credentials:

```bash
# Create .npmrc with your private registry token
echo "//registry.npmjs.org/:_authToken=your-token-here" > .npmrc

# Build with the secret
docker build --secret id=npmrc,src=.npmrc -t myapp .
```

## SSH Key for Private Git Repositories

When your build needs to clone private Git repositories, you can mount an SSH key as a secret. BuildKit also has a dedicated SSH mount type, but the secret mount approach works for any scenario.

Use an SSH key during the build:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends git openssh-client && \
    rm -rf /var/lib/apt/lists/*

# Mount the SSH key and configure SSH to use it
RUN --mount=type=secret,id=ssh_key,target=/tmp/id_rsa \
    mkdir -p /root/.ssh && \
    cp /tmp/id_rsa /root/.ssh/id_rsa && \
    chmod 600 /root/.ssh/id_rsa && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    pip install git+ssh://git@github.com/company/private-package.git && \
    rm -rf /root/.ssh

COPY . /app
CMD ["python", "/app/main.py"]
```

Wait, the above example has a problem. Copying the secret to a regular file (`cp /tmp/id_rsa`) and then deleting it still might leave traces in the layer. A better approach is to use the secret directly without copying:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends git openssh-client && \
    rm -rf /var/lib/apt/lists/*

# Use the SSH key directly from the mount point
RUN --mount=type=secret,id=ssh_key \
    mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    GIT_SSH_COMMAND="ssh -i /run/secrets/ssh_key -o StrictHostKeyChecking=no" \
    pip install git+ssh://git@github.com/company/private-package.git && \
    rm -rf /root/.ssh

COPY . /app
CMD ["python", "/app/main.py"]
```

Build with the SSH key:

```bash
docker build --secret id=ssh_key,src=~/.ssh/id_rsa -t myapp .
```

## BuildKit SSH Mount (Dedicated Approach)

For SSH specifically, BuildKit provides a dedicated `type=ssh` mount that integrates with your SSH agent:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends git openssh-client && \
    rm -rf /var/lib/apt/lists/*

# Use the SSH agent mount
RUN --mount=type=ssh \
    mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    pip install git+ssh://git@github.com/company/private-package.git && \
    rm -rf /root/.ssh
```

Build with SSH agent forwarding:

```bash
# Start the SSH agent and add your key
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa

# Build with SSH agent forwarding
docker build --ssh default -t myapp .
```

## Multiple Secrets

You can mount multiple secrets in a single RUN instruction.

Use several secrets at once:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./

# Mount multiple secrets for different registries
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=secret,id=github_token \
    GITHUB_TOKEN=$(cat /run/secrets/github_token) \
    npm ci --production

COPY . .
CMD ["node", "index.js"]
```

Pass all secrets during the build:

```bash
docker build \
    --secret id=npmrc,src=.npmrc \
    --secret id=github_token,src=github_token.txt \
    -t myapp .
```

## Environment Variable as Secret Source

Instead of reading from a file, you can pass environment variables as secrets.

Pass an environment variable as a secret:

```bash
# Pass an environment variable as a secret (no file needed)
docker build \
    --secret id=api_key,env=API_KEY \
    -t myapp .
```

The Dockerfile reads it the same way:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

# Read the secret from the mount
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) && \
    curl -H "Authorization: Bearer $API_KEY" https://api.example.com/setup
```

## Docker Compose with Build Secrets

Docker Compose supports build secrets in the compose file.

Define secrets in docker-compose.yml:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      secrets:
        - npmrc
        - api_key

secrets:
  npmrc:
    file: .npmrc
  api_key:
    environment: API_KEY
```

Build with Compose:

```bash
# Compose passes secrets to the build automatically
docker compose build
```

## Verifying Secrets Are Not Leaked

After building, verify that your secrets do not appear anywhere in the image.

Check for secret leaks:

```bash
# Check image history for leaked secrets
docker history myapp --no-trunc

# Inspect all layers for secret content
docker save myapp | tar -xf - -O | strings | grep -i "token\|password\|secret"

# Run the container and check if secret files exist
docker run --rm myapp ls -la /run/secrets/ 2>/dev/null
# Should show "No such file or directory"

# Use dive to inspect image layers
dive myapp
```

## CI/CD Integration

Use secrets in CI pipelines without exposing them in build logs.

GitHub Actions example:

```yaml
# .github/workflows/build.yml
name: Build

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with secrets
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          secrets: |
            npmrc=${{ secrets.NPMRC }}
            api_key=${{ secrets.API_KEY }}
```

## Summary

Secret mounts eliminate the risk of leaking credentials into Docker image layers. Use `RUN --mount=type=secret` to make secrets available during build instructions without persisting them. Pass secrets via `--secret id=name,src=file` on the command line. For SSH keys, prefer the dedicated `--mount=type=ssh` with agent forwarding. Always verify after building that secrets are not visible in the image history or layers. This approach is the standard way to handle build-time secrets in Docker, and it works reliably across local development and CI/CD pipelines.
