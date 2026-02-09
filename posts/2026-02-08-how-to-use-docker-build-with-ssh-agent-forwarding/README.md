# How to Use Docker Build with SSH Agent Forwarding

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Build, SSH, Security, Git, DevOps, Buildx

Description: Securely access private Git repositories and SSH resources during Docker builds using SSH agent forwarding without exposing keys.

---

Many Docker builds need to pull code from private Git repositories, download artifacts from internal servers, or access resources that require SSH authentication. The wrong way to do this is copying your SSH private key into the image. Even if you delete it in a later layer, it remains accessible in the image layer history. Docker's SSH agent forwarding solves this by letting the build process use your SSH keys without ever writing them to the image.

## The Problem with Copying SSH Keys

Here is what you should never do:

```dockerfile
# BAD: Never copy SSH keys into Docker images
COPY id_rsa /root/.ssh/id_rsa
RUN git clone git@github.com:myorg/private-repo.git
RUN rm /root/.ssh/id_rsa  # This does NOT remove it from previous layers
```

Even though the key is deleted in the last `RUN` instruction, it exists in the layer created by the `COPY` instruction. Anyone who pulls the image can extract that layer and recover the key.

## How SSH Agent Forwarding Works in Docker

Docker BuildKit supports mounting the host's SSH agent socket into the build container for a single `RUN` instruction. The key never touches the filesystem of the build. It stays in memory, used only during that instruction, and is not included in any image layer.

The mechanism uses two parts:
1. The `--ssh` flag on the `docker build` command to expose the agent
2. The `--mount=type=ssh` flag in the Dockerfile's `RUN` instruction to use it

## Prerequisites

Make sure your SSH agent is running and has your key loaded:

```bash
# Check if the SSH agent is running
echo $SSH_AUTH_SOCK

# List loaded keys
ssh-add -l

# If no keys are loaded, add your default key
ssh-add ~/.ssh/id_ed25519

# Or add a specific key
ssh-add ~/.ssh/github_deploy_key
```

On macOS, you might need to enable the keychain integration:

```bash
# Add key with keychain storage on macOS
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

## Basic SSH Forwarding Example

Here is a Dockerfile that clones a private repository during the build:

```dockerfile
# Dockerfile - using SSH agent forwarding for private repo access
FROM node:20-alpine

# Install git and openssh-client (required for SSH git operations)
RUN apk add --no-cache git openssh-client

# Configure SSH to skip host key verification for known services
# This prevents the build from hanging on "Are you sure you want to continue?"
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts && \
    ssh-keyscan gitlab.com >> /root/.ssh/known_hosts

WORKDIR /app

# Clone a private repository using the forwarded SSH agent
# The --mount=type=ssh makes the host's SSH agent available for this command only
RUN --mount=type=ssh git clone git@github.com:myorg/private-lib.git /app/lib

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Build with SSH forwarding enabled:

```bash
# Build with SSH agent forwarding
docker buildx build --ssh default -t myapp:latest .
```

The `--ssh default` flag passes the default SSH agent socket (`$SSH_AUTH_SOCK`) to the build.

## Using SSH for Private npm/pip Packages

### npm packages from private Git repos

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache git openssh-client
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /app
COPY package*.json ./

# npm install accesses private repos via SSH for git-based dependencies
RUN --mount=type=ssh npm ci

COPY . .
RUN npm run build

CMD ["node", "dist/server.js"]
```

Your `package.json` references private packages via SSH URLs:

```json
{
  "dependencies": {
    "private-lib": "git+ssh://git@github.com:myorg/private-lib.git#v2.0.0",
    "internal-utils": "git+ssh://git@github.com:myorg/internal-utils.git#main"
  }
}
```

### pip packages from private repos

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /app
COPY requirements.txt .

# pip install pulls private packages via SSH
RUN --mount=type=ssh pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

With a `requirements.txt` like:

```
flask==3.0.0
git+ssh://git@github.com/myorg/private-package.git@v1.0.0
git+ssh://git@github.com/myorg/shared-models.git@main
```

## Named SSH Agents

If you need multiple SSH identities during the build, use named SSH agents:

```bash
# Build with named SSH agents
docker buildx build \
  --ssh github=~/.ssh/github_key \
  --ssh gitlab=~/.ssh/gitlab_key \
  -t myapp:latest .
```

Reference specific agents in the Dockerfile:

```dockerfile
# Use the github key for GitHub repos
RUN --mount=type=ssh,id=github git clone git@github.com:myorg/repo1.git /app/lib1

# Use the gitlab key for GitLab repos
RUN --mount=type=ssh,id=gitlab git clone git@gitlab.com:myorg/repo2.git /app/lib2
```

## SSH Forwarding with Docker Compose

Docker Compose supports SSH agent forwarding in the build configuration:

```yaml
# docker-compose.yml - builds with SSH forwarding
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      ssh:
        - default    # Forward the default SSH agent
    ports:
      - "3000:3000"
```

Build:

```bash
# Make sure SSH agent has your key loaded
ssh-add -l

# Build with compose (SSH forwarding enabled via compose file)
docker compose build
```

For named agents in compose:

```yaml
services:
  app:
    build:
      context: .
      ssh:
        - github=${HOME}/.ssh/github_deploy_key
        - gitlab=${HOME}/.ssh/gitlab_deploy_key
```

## SSH Forwarding with Docker Bake

In a Bake HCL file:

```hcl
# docker-bake.hcl - with SSH forwarding

target "app" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["myapp:latest"]
  ssh        = ["default"]
}

target "multi-repo" {
  dockerfile = "Dockerfile.multi"
  context    = "."
  tags       = ["myapp:multi"]
  ssh = [
    "github=${HOME}/.ssh/github_key",
    "gitlab=${HOME}/.ssh/gitlab_key"
  ]
}
```

## Multi-Stage Builds with SSH

Limit SSH access to only the build stage that needs it:

```dockerfile
# Stage 1: Build (needs SSH for private dependencies)
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git openssh-client
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /app
COPY go.mod go.sum ./

# Only this stage uses SSH - the final image has no SSH access
RUN --mount=type=ssh go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /app/server ./cmd/server

# Stage 2: Runtime (no SSH, no Git, minimal image)
FROM alpine:3.19

RUN apk add --no-cache ca-certificates
COPY --from=builder /app/server /usr/local/bin/server

EXPOSE 8080
CMD ["server"]
```

The SSH agent is only available in the builder stage. The final runtime image contains no SSH configuration, no Git, and no trace of the private repositories' credentials.

## CI/CD Pipeline Setup

### GitHub Actions

```yaml
name: Build
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}

      - name: Build with SSH forwarding
        run: |
          docker buildx build --ssh default -t myapp:${{ github.sha }} --push .
```

### GitLab CI

```yaml
build:
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - mkdir -p ~/.ssh
    - ssh-keyscan github.com >> ~/.ssh/known_hosts
  script:
    - docker buildx build --ssh default -t myapp:${CI_COMMIT_SHA} --push .
  variables:
    DOCKER_BUILDKIT: 1
```

## Troubleshooting

**"Could not resolve host" errors:** Make sure `ssh-keyscan` ran for the target host:

```dockerfile
# Add host keys for all services you connect to
RUN ssh-keyscan github.com gitlab.com bitbucket.org >> /root/.ssh/known_hosts
```

**"Permission denied (publickey)" errors:** Verify your SSH agent has the right key:

```bash
# List loaded keys
ssh-add -l

# Test SSH access to the target host
ssh -T git@github.com
```

**BuildKit not enabled:** SSH forwarding requires BuildKit. Make sure it is enabled:

```bash
# Set BuildKit as the default builder
export DOCKER_BUILDKIT=1

# Or use buildx explicitly
docker buildx build --ssh default -t myapp:latest .
```

**SSH agent socket not found:** On some CI systems, the SSH agent socket path needs to be set explicitly:

```bash
# Start the SSH agent and capture the socket path
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_ed25519
echo "SSH_AUTH_SOCK=$SSH_AUTH_SOCK"
```

## Security Best Practices

1. Use deploy keys with read-only access for builds. Never use personal SSH keys in CI.
2. Use multi-stage builds so SSH access is limited to the build stage.
3. Always run `ssh-keyscan` to pre-populate known hosts. Never disable host key checking with `StrictHostKeyChecking no`.
4. Rotate deploy keys regularly. Set up key rotation in your CI secrets management.
5. Audit which repositories your build accesses. Each `--mount=type=ssh` instruction should be intentional.

## Summary

Docker SSH agent forwarding is the secure way to access private resources during builds. Your keys stay in the SSH agent's memory and never appear in image layers. Use `--ssh default` on the build command and `--mount=type=ssh` in your Dockerfile. Keep SSH access limited to build stages, use deploy keys instead of personal keys, and always pre-populate known hosts. This approach works across Docker builds, Compose, and Bake, making it the standard pattern for any Docker build that needs private repository access.
