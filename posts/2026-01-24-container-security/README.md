# How to Handle Container Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, Security, DevOps, Kubernetes, DevSecOps

Description: A comprehensive guide to securing containers in production, covering image hardening, runtime security, and vulnerability scanning.

---

Containers have transformed how we deploy applications, but they also introduce new security challenges. A single vulnerable container can compromise your entire cluster. This guide walks through practical techniques to secure your containerized workloads from build time to runtime.

## Understanding Container Security Layers

Container security spans multiple layers, from the base image to runtime behavior.

```mermaid
flowchart TB
    subgraph Build["Build Time Security"]
        A[Base Image] --> B[Dependencies]
        B --> C[Application Code]
        C --> D[Image Scanning]
    end

    subgraph Deploy["Deploy Time Security"]
        E[Registry Security]
        F[Image Signing]
        G[Admission Control]
    end

    subgraph Runtime["Runtime Security"]
        H[Network Policies]
        I[Resource Limits]
        J[Seccomp/AppArmor]
        K[Read-only Filesystem]
    end

    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

## Securing the Base Image

Start with minimal base images to reduce the attack surface.

### Use Distroless or Alpine Images

```dockerfile
# Bad: Full Ubuntu image (100+ MB, many vulnerabilities)
FROM ubuntu:22.04

# Better: Alpine (5 MB, fewer packages)
FROM alpine:3.19

# Best: Distroless (minimal attack surface)
FROM gcr.io/distroless/static-debian12
```

### Multi-Stage Builds for Minimal Production Images

```dockerfile
# Build stage with all tools
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build static binary with security flags
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/server ./cmd/server

# Production stage - minimal image
FROM gcr.io/distroless/static-debian12

# Copy only the binary
COPY --from=builder /app/server /server

# Run as non-root user
USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

### Pin Image Versions

```dockerfile
# Bad: Mutable tag, can change unexpectedly
FROM nginx:latest

# Better: Specific version
FROM nginx:1.25.3

# Best: SHA256 digest for immutability
FROM nginx@sha256:6926dd802f40b1...
```

## Running Containers as Non-Root

Most container breaches escalate through root privileges. Never run as root.

### Create Non-Root User in Dockerfile

```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy application files
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

### Kubernetes Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    # Run as non-root user
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    # Prevent privilege escalation
    allowPrivilegeEscalation: false
    # Drop all capabilities
    capabilities:
      drop:
        - ALL
    # Read-only root filesystem
    readOnlyRootFilesystem: true
  containers:
    - name: app
      image: myapp:1.0.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      # Writable temp directory if needed
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
```

## Image Vulnerability Scanning

Scan images in CI/CD before they reach production.

### Using Trivy for Scanning

```bash
# Install Trivy
brew install trivy

# Scan a local image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Output as JSON for CI/CD
trivy image --format json --output results.json myapp:latest

# Fail CI if vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

### GitHub Actions Integration

```yaml
name: Container Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

## Runtime Security with Seccomp and AppArmor

Restrict what system calls containers can make.

### Custom Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close",
        "fstat", "lseek", "mmap", "mprotect",
        "munmap", "brk", "rt_sigaction",
        "rt_sigprocmask", "ioctl", "access",
        "pipe", "select", "sched_yield",
        "mremap", "msync", "mincore", "madvise",
        "socket", "connect", "accept", "sendto",
        "recvfrom", "bind", "listen", "getsockname",
        "getpeername", "socketpair", "setsockopt",
        "getsockopt", "clone", "fork", "vfork",
        "execve", "exit", "wait4", "kill",
        "uname", "fcntl", "flock", "fsync",
        "fdatasync", "truncate", "ftruncate",
        "getcwd", "chdir", "mkdir", "rmdir",
        "creat", "link", "unlink", "readlink",
        "chmod", "chown", "lchown", "umask",
        "gettimeofday", "getrlimit", "getrusage",
        "sysinfo", "times", "getuid", "getgid",
        "setuid", "setgid", "geteuid", "getegid",
        "setpgid", "getppid", "getpgrp", "setsid",
        "setreuid", "setregid", "getgroups",
        "setgroups", "setresuid", "getresuid",
        "setresgid", "getresgid", "sigpending",
        "sigsuspend", "sigaltstack", "statfs",
        "fstatfs", "sched_setparam", "sched_getparam",
        "sched_setscheduler", "sched_getscheduler",
        "sched_get_priority_max", "sched_get_priority_min",
        "sched_rr_get_interval", "mlock", "munlock",
        "mlockall", "munlockall", "vhangup", "pivot_root",
        "prctl", "arch_prctl", "adjtimex", "setrlimit",
        "sync", "acct", "settimeofday", "sethostname",
        "setdomainname", "ioperm", "iopl", "create_module",
        "init_module", "delete_module", "get_kernel_syms",
        "query_module", "quotactl", "nfsservctl",
        "getpmsg", "putpmsg", "afs_syscall", "tuxcall",
        "security", "gettid", "readahead", "setxattr",
        "lsetxattr", "fsetxattr", "getxattr", "lgetxattr",
        "fgetxattr", "listxattr", "llistxattr",
        "flistxattr", "removexattr", "lremovexattr",
        "fremovexattr", "tkill", "time", "futex",
        "sched_setaffinity", "sched_getaffinity",
        "set_thread_area", "get_thread_area",
        "epoll_create", "epoll_ctl", "epoll_wait",
        "set_tid_address", "restart_syscall", "fadvise64",
        "timer_create", "timer_settime", "timer_gettime",
        "timer_getoverrun", "timer_delete",
        "clock_settime", "clock_gettime", "clock_getres",
        "clock_nanosleep", "exit_group", "epoll_wait",
        "epoll_ctl", "tgkill", "utimes", "mbind",
        "set_mempolicy", "get_mempolicy"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

### Apply Seccomp in Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault  # Use container runtime's default profile
  containers:
    - name: app
      image: myapp:1.0.0
      securityContext:
        seccompProfile:
          type: RuntimeDefault
```

## Secrets Management

Never bake secrets into images.

### Use Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgres://user:pass@host:5432/db"
  API_KEY: "sk-xxxxxxxxxxxxx"
---
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:1.0.0
      envFrom:
        - secretRef:
            name: app-secrets
      # Or mount as files
      volumeMounts:
        - name: secrets
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secrets
      secret:
        secretName: app-secrets
```

### Use External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/data/myapp
        property: database_url
```

## Network Security for Containers

Isolate containers with network policies.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

## Security Checklist

Before deploying containers to production, verify:

- [ ] Base images are minimal (distroless or Alpine)
- [ ] Images are pinned to SHA256 digests
- [ ] Containers run as non-root users
- [ ] Read-only root filesystem enabled
- [ ] All capabilities dropped
- [ ] Vulnerability scanning in CI/CD
- [ ] Secrets managed externally (not in images)
- [ ] Network policies restrict traffic
- [ ] Resource limits set
- [ ] Seccomp profile applied

---

Container security is not a one-time task but a continuous process. Implement these practices in your CI/CD pipeline, monitor for drift, and stay updated on new vulnerabilities. A secure container today can become vulnerable tomorrow with a single CVE disclosure.
