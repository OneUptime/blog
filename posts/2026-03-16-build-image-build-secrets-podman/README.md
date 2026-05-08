# How to Build an Image with Build Secrets with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Secret, Security

Description: Learn how to securely pass secrets during Podman image builds without embedding them in image layers using the --secret flag and mount options.

---

> Build secrets let you access credentials during the build process without leaking them into the final image layers.

Container builds frequently need access to private registries, APIs, or package repositories that require authentication. Passing credentials via build arguments or COPY instructions embeds them in image layers where they can be extracted. Podman's `--secret` flag provides a secure alternative by mounting secrets temporarily during specific RUN instructions. This guide covers all the practical patterns.

---

## The Problem with Secrets in Build Args

Build arguments are visible in the image history and should never contain secrets.

```bash
# BAD: Secret visible in image history

podman build --build-arg API_KEY=sk-12345 -t myapp .
podman history myapp
# Shows: --build-arg API_KEY=sk-12345

# GOOD: Use --secret instead (covered below)
```

## Using the --secret Flag

The `--secret` flag makes a secret available during the build without persisting it in any layer.

```bash
# Create a secret file
echo "my-secret-token" > /tmp/my-secret.txt

# Build with the secret
podman build --secret id=mysecret,src=/tmp/my-secret.txt -t myapp:latest .

# Clean up the secret file
rm /tmp/my-secret.txt
```

## Accessing Secrets in the Containerfile

Use the `--mount=type=secret` option in RUN instructions to access the secret.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

WORKDIR /app
COPY requirements.txt .

# Mount the secret during pip install for private packages
RUN --mount=type=secret,id=pip_token \
    PIP_TOKEN=$(cat /run/secrets/pip_token) && \
    pip install --no-cache-dir \
      --extra-index-url "https://token:${PIP_TOKEN}@pypi.example.com/simple" \
      -r requirements.txt

COPY . .
CMD ["python", "app.py"]
EOF

# Build with the secret
echo "my-pip-token-value" > /tmp/pip-token.txt
podman build --secret id=pip_token,src=/tmp/pip-token.txt -t myapp:latest .
rm /tmp/pip-token.txt

# Verify the secret is NOT in the image
podman history myapp:latest
podman run --rm myapp:latest cat /run/secrets/pip_token 2>&1
# File not found - secret is not in the image
```

## Multiple Secrets

Pass multiple secrets for different purposes.

```bash
# Create secret files
echo "ghp_abc123" > /tmp/github-token.txt
echo "npm_xyz789" > /tmp/npm-token.txt

cat > Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

WORKDIR /app
COPY package*.json ./

# Use GitHub token for private packages
RUN --mount=type=secret,id=github_token \
    --mount=type=secret,id=npm_token \
    GITHUB_TOKEN=$(cat /run/secrets/github_token) && \
    NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc && \
    npm ci && \
    rm -f .npmrc

COPY . .
CMD ["node", "server.js"]
EOF

podman build \
  --secret id=github_token,src=/tmp/github-token.txt \
  --secret id=npm_token,src=/tmp/npm-token.txt \
  -t myapp:latest .

rm /tmp/github-token.txt /tmp/npm-token.txt
```

## Custom Mount Paths

By default, secrets mount at `/run/secrets/<id>`. You can specify a custom path.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

RUN mkdir -p /etc/myapp

# Mount at a custom path
RUN --mount=type=secret,id=config,target=/etc/myapp/config.json \
    cat /etc/myapp/config.json && \
    echo "Config processed during build"

CMD ["sh"]
EOF

echo '{"api_key": "secret-value"}' > /tmp/config.json
podman build --secret id=config,src=/tmp/config.json -t myapp:latest .
rm /tmp/config.json
```

## Secrets from Environment Variables

You can pass environment variables as secrets.

```bash
# Set the secret in an environment variable
export MY_SECRET="super-secret-value"

# Read the secret directly from the environment variable
podman build --secret id=my_secret,env=MY_SECRET -t myapp:latest .
```

## Private Git Repository Access

Clone private repositories during build using secrets.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

RUN apk add --no-cache git

# Use a token to clone a private repo
RUN --mount=type=secret,id=git_token \
    GIT_TOKEN=$(cat /run/secrets/git_token) && \
    git clone "https://${GIT_TOKEN}@github.com/myorg/private-repo.git" /app

WORKDIR /app
CMD ["sh"]
EOF

echo "ghp_your_token_here" > /tmp/git-token.txt
podman build --secret id=git_token,src=/tmp/git-token.txt -t myapp:latest .
rm /tmp/git-token.txt
```

## Private Package Registry Authentication

Access private package registries during build.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.22

WORKDIR /src
COPY go.mod go.sum ./

# Configure Go private modules with a token and download dependencies
RUN --mount=type=secret,id=goprivate_token \
    GOTOKEN=$(cat /run/secrets/goprivate_token) && \
    export GOPRIVATE=github.com/myorg/* && \
    git config --global url."https://token:${GOTOKEN}@github.com/".insteadOf "https://github.com/" && \
    echo "machine github.com login token password ${GOTOKEN}" > ~/.netrc && \
    go mod download && \
    rm -f ~/.netrc && \
    git config --global --unset-all url."https://token:${GOTOKEN}@github.com/".insteadOf

COPY . .
RUN go build -o /app .

FROM docker.io/library/alpine:latest
COPY --from=0 /app /usr/local/bin/app
CMD ["app"]
EOF
```

## Secrets in Multi-Stage Builds

Secrets are only available in the stages where they are mounted. They do not leak to subsequent stages.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/node:20 AS builder
WORKDIR /app
COPY package*.json ./

# Secret only available in this stage
RUN --mount=type=secret,id=npm_token \
    echo "//registry.npmjs.org/:_authToken=$(cat /run/secrets/npm_token)" > .npmrc && \
    npm ci && \
    rm -f .npmrc

COPY . .
RUN npm run build

# Clean stage: no secrets ever accessed here
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
EOF
```

## Verifying Secrets Are Not Leaked

Always verify that secrets do not appear in the final image.

```bash
# Check image history for leaked secrets
podman history myapp:latest --no-trunc

# Search the image filesystem for secret values
podman run --rm myapp:latest find / -name ".npmrc" 2>/dev/null
podman run --rm myapp:latest find / -name ".netrc" 2>/dev/null
podman run --rm myapp:latest cat /run/secrets/mysecret 2>/dev/null || echo "No secrets found"
```

## Summary

Build secrets are the secure way to pass credentials during container image builds. They are mounted temporarily during RUN instructions and never persist in image layers. Always prefer `--secret` over `--build-arg` for sensitive data, verify that secrets do not leak into the final image, and clean up secret files after the build completes. Combine build secrets with multi-stage builds for maximum security.
