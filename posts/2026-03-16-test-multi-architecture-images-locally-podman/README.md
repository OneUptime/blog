# How to Test Multi-Architecture Images Locally with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Testing

Description: Learn how to test multi-architecture container images locally with Podman using QEMU emulation, verifying that each platform variant works correctly before pushing to a registry.

---

> Testing multi-arch images locally catches platform-specific bugs before they reach production, saving time and preventing deployment failures on target hardware.

After building multi-architecture images, you need to verify that each platform variant works correctly. Podman with QEMU emulation lets you run and test images for any supported architecture on your local machine, regardless of your host's native architecture.

---

## Prerequisites

Ensure QEMU user-static is installed for cross-architecture execution.

```bash
# Install QEMU (Fedora/RHEL)

sudo dnf install qemu-user-static

# Install QEMU (Ubuntu/Debian)
sudo apt-get install qemu-user-static binfmt-support

# Verify available emulators
ls /proc/sys/fs/binfmt_misc/qemu-*

# Quick test
podman run --rm --platform linux/arm64 alpine:3.19 uname -m
podman run --rm --platform linux/amd64 alpine:3.19 uname -m
```

## Running a Specific Platform Variant

Use `--platform` with `podman run` to select which architecture to execute. For ARM variants, use `--variant`.

```bash
# Run the AMD64 variant
podman run --rm --platform linux/amd64 myapp:latest

# Run the ARM64 variant
podman run --rm --platform linux/arm64 myapp:latest

# Run the ARMv7 variant
podman run --rm --platform linux/arm --variant v7 myapp:latest
```

## Verifying Image Architecture

Confirm that each variant is actually the correct architecture.

```bash
#!/bin/bash
# verify-arch.sh - Verify architecture of each manifest entry

MANIFEST="myapp:latest"

PLATFORMS=$(podman manifest inspect "${MANIFEST}" | \
  jq -r '.manifests[] | [.platform.os, .platform.architecture, (.platform.variant // "")] | @tsv')

while IFS=$'\t' read -r OS ARCH VARIANT; do
  PLATFORM="${OS}/${ARCH}"
  echo "=== Testing ${PLATFORM} ==="

  # Run uname to verify architecture
  RUN_ARGS=(--rm --platform "${PLATFORM}")
  if [ -n "${VARIANT}" ]; then
    RUN_ARGS+=(--variant "${VARIANT}")
    echo "  variant: ${VARIANT}"
  fi

  RESULT=$(podman run "${RUN_ARGS[@]}" "${MANIFEST}" uname -m 2>&1)
  echo "  uname -m: ${RESULT}"
  echo ""
done <<< "${PLATFORMS}"
```

## Running a Test Suite Per Platform

Execute your application's tests inside each platform container.

```bash
# Run tests for each architecture
for PLATFORM in linux/amd64 linux/arm64; do
  echo "=== Running tests on ${PLATFORM} ==="

  podman run --rm \
    --platform "${PLATFORM}" \
    -v "$(pwd)/tests:/tests:ro" \
    myapp:latest \
    sh -c "cd /tests && sh run-tests.sh"

  if [ $? -eq 0 ]; then
    echo "  PASSED on ${PLATFORM}"
  else
    echo "  FAILED on ${PLATFORM}"
  fi
  echo ""
done
```

## Testing HTTP Services

For web applications, start the container and send requests.

```bash
#!/bin/bash
# test-http.sh - Test HTTP endpoints on each platform

MANIFEST="myapp:latest"
PLATFORMS=("linux/amd64" "linux/arm64")
HOST_PORT=8080

for PLATFORM in "${PLATFORMS[@]}"; do
  echo "=== Testing HTTP on ${PLATFORM} ==="

  # Start the container
  CONTAINER_ID=$(podman run -d \
    --platform "${PLATFORM}" \
    -p "${HOST_PORT}:8080" \
    "${MANIFEST}")

  # Wait for the service to start
  sleep 3

  # Test the endpoint
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HOST_PORT}/health")

  if [ "${HTTP_STATUS}" = "200" ]; then
    echo "  Health check: PASSED (HTTP ${HTTP_STATUS})"
  else
    echo "  Health check: FAILED (HTTP ${HTTP_STATUS})"
    podman logs "${CONTAINER_ID}"
  fi

  # Clean up
  podman stop "${CONTAINER_ID}" >/dev/null
  podman rm "${CONTAINER_ID}" >/dev/null

  echo ""
done
```

## Interactive Debugging per Platform

Drop into a shell on a specific platform to debug issues.

```bash
# Interactive shell on ARM64
podman run --rm -it --platform linux/arm64 myapp:latest /bin/sh

# Inside the container, check:
uname -m          # Should show aarch64
cat /etc/os-release
which curl && curl --version

# Interactive shell on AMD64
podman run --rm -it --platform linux/amd64 myapp:latest /bin/sh
```

## Automated Multi-Arch Test Script

```bash
#!/bin/bash
# test-multiarch.sh - Comprehensive multi-arch testing
set -euo pipefail

MANIFEST="${1:?Usage: $0 <manifest>}"
REQUIRED_PLATFORMS=("linux/amd64" "linux/arm64")
FAILURES=0

echo "Testing manifest: ${MANIFEST}"
echo "================================"

# Check manifest structure
PLATFORM_COUNT=$(podman manifest inspect "${MANIFEST}" | jq '.manifests | length')
echo "Platforms in manifest: ${PLATFORM_COUNT}"
echo ""

for PLATFORM in "${REQUIRED_PLATFORMS[@]}"; do
  echo "--- ${PLATFORM} ---"

  # Test 1: Can we run the image?
  echo -n "  Run test: "
  if podman run --rm --platform "${PLATFORM}" "${MANIFEST}" true 2>/dev/null; then
    echo "PASS"
  else
    echo "FAIL"
    ((FAILURES+=1))
    continue
  fi

  # Test 2: Correct architecture?
  echo -n "  Arch test: "
  EXPECTED_ARCH=$(echo "${PLATFORM}" | cut -d/ -f2)
  ACTUAL=$(podman run --rm --platform "${PLATFORM}" "${MANIFEST}" uname -m 2>/dev/null)

  case "${EXPECTED_ARCH}" in
    amd64) EXPECTED_UNAME="x86_64" ;;
    arm64) EXPECTED_UNAME="aarch64" ;;
    arm)   EXPECTED_UNAME="armv7l" ;;
    *)     EXPECTED_UNAME="${EXPECTED_ARCH}" ;;
  esac

  if [ "${ACTUAL}" = "${EXPECTED_UNAME}" ]; then
    echo "PASS (${ACTUAL})"
  else
    echo "FAIL (expected ${EXPECTED_UNAME}, got ${ACTUAL})"
    ((FAILURES+=1))
  fi

  # Test 3: Application-specific test
  echo -n "  App test: "
  if podman run --rm --platform "${PLATFORM}" "${MANIFEST}" 2>/dev/null | grep -q "Running"; then
    echo "PASS"
  else
    echo "FAIL"
    ((FAILURES+=1))
  fi

  echo ""
done

echo "================================"
if [ ${FAILURES} -eq 0 ]; then
  echo "All tests PASSED"
  exit 0
else
  echo "${FAILURES} test(s) FAILED"
  exit 1
fi
```

Usage:

```bash
chmod +x test-multiarch.sh
./test-multiarch.sh myapp:latest
```

## Checking Binary Compatibility

Verify that binaries inside the image are for the correct architecture.

```bash
# Check binary architecture
podman run --rm --platform linux/amd64 myapp:latest \
  file /usr/local/bin/app
# Expected: ELF 64-bit LSB executable, x86-64

podman run --rm --platform linux/arm64 myapp:latest \
  file /usr/local/bin/app
# Expected: ELF 64-bit LSB executable, ARM aarch64
```

## Performance Comparison Across Platforms

```bash
#!/bin/bash
# bench-platforms.sh - Simple benchmark across platforms

MANIFEST="myapp:latest"

for PLATFORM in linux/amd64 linux/arm64; do
  echo "=== ${PLATFORM} ==="
  time podman run --rm --platform "${PLATFORM}" "${MANIFEST}" \
    sh -c 'for i in $(seq 1 1000); do echo "$i" > /dev/null; done'
  echo ""
done
```

## Summary

Testing multi-architecture images locally with Podman uses QEMU emulation to run containers for any supported platform. Use `--platform` with `podman run` to select the architecture variant. Verify architecture with `uname -m` and `file` commands inside the container. Build automated test scripts that check each required platform before pushing to a registry. While QEMU emulation is slower than native execution, it provides a reliable way to catch platform-specific issues during development.
