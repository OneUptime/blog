# How to Build an Image with SSH Keys with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, SSH, Security

Description: Learn how to securely use SSH keys during Podman image builds for cloning private repositories and accessing remote resources without leaking keys into image layers.

---

> SSH key forwarding during builds lets you access private repositories securely without embedding keys in your container image.

Many build processes need to clone private git repositories or access remote resources over SSH. Copying SSH keys directly into the image is a security risk because they persist in image layers. Podman supports SSH agent forwarding during builds, making keys available temporarily without storing them. This guide covers secure SSH key usage patterns in Podman builds.

---

## The Problem with Copying SSH Keys

Never copy SSH keys directly into an image.

```bash
# BAD: SSH key persists in image layers even after deletion

cat > Containerfile.bad << 'EOF'
FROM docker.io/library/alpine:latest
COPY id_rsa /root/.ssh/id_rsa
RUN chmod 600 /root/.ssh/id_rsa && \
    git clone git@github.com:myorg/private-repo.git /app && \
    rm /root/.ssh/id_rsa
# Key is still recoverable from earlier layer!
EOF
```

Even if you delete the key in a later instruction, it remains in the image layer history.

## Using --ssh Flag for SSH Agent Forwarding

Podman can forward your SSH agent into build steps.

```bash
# Make sure your SSH agent is running and has your key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Verify the key is loaded
ssh-add -l

# Build with SSH forwarding
podman build --ssh default -t myapp:latest .
```

## Containerfile with SSH Mount

Use `--mount=type=ssh` in RUN instructions to access forwarded SSH keys.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

RUN apk add --no-cache git openssh-client

# Configure SSH to trust GitHub
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts

# Clone a private repository using forwarded SSH key
RUN --mount=type=ssh \
    git clone git@github.com:myorg/private-repo.git /app

WORKDIR /app
CMD ["sh"]
EOF

# Build with SSH agent forwarding
podman build --ssh default -t myapp:latest .
```

## Named SSH Sockets

You can use named SSH sockets for different keys.

```bash
# Forward a specific key file
podman build --ssh mykey=/path/to/specific/id_rsa -t myapp:latest .
```

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache git openssh-client
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

# Reference the named SSH socket
RUN --mount=type=ssh,id=mykey \
    git clone git@github.com:myorg/private-repo.git /app

CMD ["sh"]
EOF
```

## Multi-Stage Build with SSH

Use SSH only in the build stage to keep the final image clean.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Build (needs SSH access)
FROM docker.io/library/golang:1.26 AS builder

RUN apt-get update && apt-get install -y openssh-client git
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /src

# Clone private dependencies using SSH
RUN --mount=type=ssh \
    git clone git@github.com:myorg/private-lib.git /go/src/private-lib

COPY . .
RUN go build -o /app .

# Stage 2: Runtime (no SSH keys, no git)
FROM docker.io/library/alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build with SSH forwarding
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
podman build --ssh default -t myapp:latest .
```

## Go Private Modules with SSH

Configure Go to use SSH for private modules during build.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.26

RUN apt-get update && apt-get install -y openssh-client
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

# Configure git to use SSH for GitHub
RUN git config --global url."git@github.com:".insteadOf "https://github.com/"

ENV GOPRIVATE=github.com/myorg/*

WORKDIR /src
COPY go.mod go.sum ./

# Download private modules via SSH
RUN --mount=type=ssh go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /app .

FROM docker.io/library/alpine:latest
COPY --from=0 /app /usr/local/bin/app
CMD ["app"]
EOF

podman build --ssh default -t go-app:latest .
```

## Python Private Packages with SSH

Install Python packages from private repositories.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends git openssh-client && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /app
COPY requirements.txt .

# requirements.txt can include:
# git+ssh://git@github.com/myorg/private-package.git@v1.0.0
RUN --mount=type=ssh pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
EOF

podman build --ssh default -t py-app:latest .
```

## Alternative: Using Secrets for SSH Keys

If SSH agent forwarding is not available, use the `--secret` flag as an alternative.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache git openssh-client

RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts

# Mount SSH key as a secret
RUN --mount=type=secret,id=ssh_key,target=/root/.ssh/id_ed25519 \
    chmod 600 /root/.ssh/id_ed25519 && \
    git clone git@github.com:myorg/private-repo.git /app

# Key is NOT in the image
WORKDIR /app
CMD ["sh"]
EOF

podman build --secret id=ssh_key,src=$HOME/.ssh/id_ed25519 -t myapp:latest .
```

## Verifying Keys Are Not in the Image

Always verify that SSH keys are not embedded in the final image.

```bash
# Check for SSH keys in the image
podman run --rm myapp:latest find / -name "id_*" -o -name "*.pem" 2>/dev/null

# Check image history for key-related commands
podman history myapp:latest --no-trunc | grep -i ssh

# Look for known_hosts (this is fine to keep, it is not sensitive)
podman run --rm myapp:latest cat /root/.ssh/known_hosts 2>/dev/null
```

## CI/CD Integration

Use SSH keys securely in CI/CD pipelines.

```bash
#!/bin/bash
# ci-build-with-ssh.sh

set -e

# Start SSH agent and add the deploy key (stored as CI secret)
eval "$(ssh-agent -s)"
echo "${DEPLOY_SSH_KEY}" | ssh-add -

# Build with SSH forwarding
podman build --ssh default -t myapp:latest .

# Clean up SSH agent
eval "$(ssh-agent -k)"
```

## Summary

SSH key forwarding with `--mount=type=ssh` is the secure way to access private repositories during container builds. Keys are never written to image layers and are only available during the specific RUN instruction that requests them. Always use multi-stage builds to ensure the final image contains no SSH-related tooling or configuration. Verify your built images to confirm no keys have leaked, and prefer SSH agent forwarding over mounting key files directly.
