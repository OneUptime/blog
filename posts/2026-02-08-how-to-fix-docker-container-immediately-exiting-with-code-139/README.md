# How to Fix Docker Container Immediately Exiting with Code 139

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, exit code 139, segfault, SIGSEGV, troubleshooting, containers, debugging, crash

Description: Fix Docker containers crashing with exit code 139, caused by segmentation faults from memory access violations, incompatible binaries, or library issues.

---

Your container starts and immediately crashes with exit code 139. Sometimes it runs for a few seconds first. There is no error message from the application, just a sudden exit. Exit code 139 means the process received SIGSEGV (signal 11), commonly known as a segmentation fault. The math: 128 + 11 = 139. The process tried to access memory it was not allowed to touch, and the kernel killed it.

Segfaults in containers are trickier than in normal development because the container environment can introduce its own causes. Let's go through the most common reasons and fixes.

## What Causes a Segfault in a Container

A segmentation fault happens when a process tries to read or write to a memory address that has not been allocated to it. In Docker containers, the common triggers are:

1. Running a binary compiled for a different architecture (ARM binary on x86, or vice versa)
2. Running a binary linked against glibc inside an Alpine container (which uses musl)
3. Corrupted binary or incompatible shared library versions
4. Application bug triggered by the container's environment
5. Stack size limits that are too restrictive

## Diagnosing the Segfault

First, confirm the exit code:

```bash
# Check the container's exit code
docker inspect my-container --format '{{.State.ExitCode}}'

# Check the container logs for any output before the crash
docker logs my-container
```

Check the kernel logs for segfault details:

```bash
# Look for segfault messages in kernel logs
dmesg | grep -i segfault

# You might see something like:
# myapp[12345]: segfault at 0 ip 00007f5a3c2d1234 sp 00007ffd3a4b5678 error 4 in libc.so.6
```

Run the container interactively to see the crash in real time:

```bash
# Start the container interactively to observe the crash
docker run -it --entrypoint sh myimage

# Then manually run the application
./myapp
```

If the application crashes with "Segmentation fault (core dumped)", you have confirmed the issue.

## Cause 1: Architecture Mismatch

The most common cause of immediate segfaults in containers is running a binary compiled for the wrong CPU architecture. This happens when you build an image on an ARM Mac (Apple Silicon) and try to run it on an x86 Linux server, or vice versa.

Check the image architecture:

```bash
# Check what architecture the image was built for
docker inspect myimage --format '{{.Architecture}}'

# Check your host architecture
uname -m

# For multi-platform images, check available architectures
docker manifest inspect nginx:latest | grep architecture
```

If there is a mismatch, rebuild for the correct architecture:

```bash
# Build for a specific platform
docker build --platform linux/amd64 -t myimage .

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t myimage .
```

In Docker Compose, specify the platform:

```yaml
# docker-compose.yml with explicit platform
services:
  app:
    image: myapp:latest
    platform: linux/amd64
    build:
      context: .
      platforms:
        - linux/amd64
```

If you are on an Apple Silicon Mac and need to run x86 images locally:

```bash
# Force x86 emulation on ARM Mac
docker run --platform linux/amd64 myimage
```

Note that running x86 images through QEMU emulation on ARM is slow and can sometimes crash with segfaults itself. Building native ARM images is always preferable.

## Cause 2: glibc vs musl Mismatch

Alpine Linux uses musl libc instead of glibc. If you compile a binary on a glibc system (Ubuntu, Debian, CentOS) and try to run it on Alpine, it will segfault.

Check which libc the binary expects:

```bash
# Inside the container, check what libraries the binary needs
docker run --entrypoint sh myimage -c "ldd /app/myapp"

# If you see "not found" for any library, that's the problem
# You might see: libc.musl-x86_64.so.1 => not found
```

Fix by either using a glibc-based image or recompiling for Alpine:

```dockerfile
# Option 1: Switch from Alpine to a glibc-based slim image
FROM debian:bookworm-slim
COPY myapp /app/myapp
CMD ["/app/myapp"]
```

```dockerfile
# Option 2: Build inside Alpine to link against musl
FROM alpine:latest AS builder
RUN apk add --no-cache build-base
COPY . /src
WORKDIR /src
RUN gcc -o myapp main.c -static  # Static linking avoids the issue entirely

FROM alpine:latest
COPY --from=builder /src/myapp /app/myapp
CMD ["/app/myapp"]
```

For Go applications, ensure CGO is disabled or that you cross-compile correctly:

```dockerfile
# Go application built for Alpine (CGO disabled)
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .

FROM alpine:latest
COPY --from=builder /app/myapp /myapp
CMD ["/myapp"]
```

## Cause 3: Corrupted Binary or Image Layer

If an image layer was corrupted during push or pull, the binary might be damaged.

```bash
# Pull the image fresh, ignoring local cache
docker pull myimage:latest --quiet
docker rmi myimage:latest
docker pull myimage:latest

# Or rebuild from scratch
docker build --no-cache -t myimage .
```

## Cause 4: Stack Size Limits

Some applications need more stack space than the default. Docker containers inherit the host's ulimit settings, which might be restrictive.

```bash
# Check current stack size limit inside a container
docker run --rm myimage sh -c "ulimit -s"

# Run with an increased stack size
docker run --ulimit stack=67108864:67108864 myimage
```

In Docker Compose:

```yaml
# docker-compose.yml with increased stack size
services:
  app:
    image: myapp:latest
    ulimits:
      stack:
        soft: 67108864   # 64MB
        hard: 67108864
```

## Cause 5: Seccomp Profile Restrictions

Docker applies a default seccomp profile that restricts which system calls a container can make. Some applications use system calls that are blocked by default.

Test if seccomp is causing the issue:

```bash
# Run without the seccomp profile (for testing only, not production)
docker run --security-opt seccomp=unconfined myimage
```

If the application works without the seccomp profile, you need to create a custom profile that allows the specific system calls your application needs.

## Cause 6: Application Bug

Sometimes the segfault is a genuine bug in your application, and the container just happens to be where it manifests.

Enable core dumps for debugging:

```bash
# Run with core dumps enabled
docker run --ulimit core=-1 -v /tmp/coredumps:/tmp myimage

# Inside the container, set the core dump location
# Add to your entrypoint:
echo "/tmp/core.%p" > /proc/sys/kernel/core_pattern
```

Install debugging tools and analyze:

```dockerfile
# Debug Dockerfile with analysis tools
FROM ubuntu:22.04

# Install debugging tools
RUN apt-get update && apt-get install -y \
    gdb \
    strace \
    valgrind \
    && rm -rf /var/lib/apt/lists/*

COPY myapp /app/myapp
CMD ["gdb", "-ex", "run", "-ex", "bt full", "-ex", "quit", "/app/myapp"]
```

```bash
# Run with strace to see what the app is doing before it crashes
docker run --cap-add SYS_PTRACE myimage strace -f /app/myapp 2>&1 | tail -30
```

## Cause 7: Incompatible Shared Libraries

When you copy binaries between different Linux distributions, the shared library versions might not match.

```bash
# Check shared library dependencies
docker run --entrypoint sh myimage -c "ldd /app/myapp"

# Check for missing libraries
docker run --entrypoint sh myimage -c "ldd /app/myapp | grep 'not found'"
```

If libraries are missing, install them or use static linking:

```dockerfile
# Install missing libraries
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    libssl3 \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*
COPY myapp /app/myapp
CMD ["/app/myapp"]
```

## Quick Diagnostic Script

Run this to quickly identify the cause:

```bash
#!/bin/bash
# diagnose-139.sh - Diagnose exit code 139 in a Docker container
IMAGE=$1

echo "=== Image Architecture ==="
docker inspect "$IMAGE" --format '{{.Architecture}}'

echo ""
echo "=== Host Architecture ==="
uname -m

echo ""
echo "=== Checking binary dependencies ==="
docker run --entrypoint sh "$IMAGE" -c "ldd /app/myapp 2>&1 || echo 'ldd not available'"

echo ""
echo "=== Running with strace ==="
docker run --cap-add SYS_PTRACE --entrypoint strace "$IMAGE" -f -e trace=memory /app/myapp 2>&1 | tail -20
```

## Summary

Exit code 139 is a segmentation fault (SIGSEGV). In Docker, the three most common causes are architecture mismatches (running ARM binaries on x86 or vice versa), libc mismatches (glibc binaries on Alpine's musl), and corrupted image layers. Start by checking `docker inspect` for the image architecture and comparing it to `uname -m` on the host. If architectures match, check shared library compatibility with `ldd`. For genuine application bugs, enable core dumps and use `gdb` or `strace` to find the exact instruction that crashes. When all else fails, rebuild the image from scratch with `--no-cache` to rule out corrupted layers.
