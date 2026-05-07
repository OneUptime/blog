# How to Use Secrets During Podman Image Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Image Builds, Security

Description: Learn how to use secrets during Podman image builds to access private registries, repositories, and APIs without baking credentials into image layers.

---

> Build-time secrets let you access private resources during image builds without storing credentials in any image layer, maintaining security throughout the build process.

During image builds, you often need credentials to access private package registries, Git repositories, or APIs. Using `--secret` with `podman build` makes these credentials available only during the build step that needs them, without persisting them in the final image.

---

## Basic Build-Time Secret

```bash
# Create a secret file

echo -n "my-npm-token" > /tmp/npm_token

# Build with the secret available
podman build \
  --secret id=npm_token,src=/tmp/npm_token \
  -t my-app:latest .

# Clean up the secret file
rm /tmp/npm_token
```

## Using Secrets in a Containerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
COPY .npmrc ./

# Mount the secret during npm install for an .npmrc that uses ${NPM_TOKEN}
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm install

COPY . .
CMD ["node", "server.js"]

# The npm_token is NOT stored in any image layer
```

## Private Git Repository Access

```bash
# Make SSH key available during build
podman build \
  --secret id=ssh_key,src=$HOME/.ssh/id_ed25519 \
  -t my-app:latest .
```

In the Containerfile:

```dockerfile
FROM golang:1.21-alpine

RUN apk add --no-cache git openssh-client
WORKDIR /src
COPY go.mod go.sum ./

# Use the SSH key to download private modules
RUN --mount=type=secret,id=ssh_key \
    mkdir -p /root/.ssh && \
    cp /run/secrets/ssh_key /root/.ssh/id_ed25519 && \
    chmod 600 /root/.ssh/id_ed25519 && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    go mod download && \
    rm -rf /root/.ssh

COPY . .
RUN go build -o /app .
CMD ["/app"]
```

## Multiple Build-Time Secrets

```bash
# Pass multiple secrets to the build
podman build \
  --secret id=npm_token,src=/tmp/npm_token \
  --secret id=pip_index,src=/tmp/pip_credentials \
  --secret id=composer_auth,src=/tmp/composer_auth.json \
  -t multi-lang-app:latest .
```

## Secrets from Environment Variables

```bash
# Use environment variables as build secrets
export NPM_TOKEN="my-npm-token"

printf '%s' "$NPM_TOKEN" > /tmp/npm_token
podman build \
  --secret id=npm_token,src=/tmp/npm_token \
  -t my-app:latest .
rm /tmp/npm_token
```

## Verifying Secrets Are Not in the Image

```bash
# After building, verify no secrets are in the image layers
podman history my-app:latest

# Inspect the image to confirm no secret data
podman inspect my-app:latest | grep -i secret

# The secret is only available during the RUN instruction
# that uses --mount=type=secret and is never stored in layers
```

## Summary

Build-time secrets in Podman let you access private resources during image builds without storing credentials in image layers. Use `--secret id=name,src=file` with `podman build` and `RUN --mount=type=secret,id=name` in your Containerfile. This approach ensures that private registry tokens, SSH keys, and API credentials are available only during the specific build step that needs them and are never persisted in the final image.
