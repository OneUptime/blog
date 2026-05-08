# How to List Supported Platforms for Podman Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Build

Description: Learn how to discover which platforms and architectures are available for Podman builds by checking QEMU registrations, base image support, and system capabilities.

---

> Knowing which platforms your Podman setup supports prevents build failures and helps you plan multi-architecture image strategies.

Before building multi-architecture images, you need to know which platforms your system can target. This depends on your QEMU installation, the base images you use, and your Podman configuration. This guide shows how to discover all available platforms.

---

## Checking Host Architecture

Start by identifying your native platform.

```bash
# Check your host architecture

uname -m
# Common outputs: x86_64, aarch64, s390x, ppc64le

# Get full platform information
uname -a

# Check what Podman reports
podman info --format '{{.Host.Arch}}'
podman info --format '{{.Host.OS}}'
```

## Listing QEMU-Supported Platforms

QEMU user-static registrations determine which non-native architectures you can emulate.

```bash
# List all registered QEMU emulators
ls /proc/sys/fs/binfmt_misc/ | grep qemu

# Get detailed information about each emulator
for handler in /proc/sys/fs/binfmt_misc/qemu-*; do
  [ -e "${handler}" ] || { echo "No QEMU handlers registered"; break; }
  name=$(basename "${handler}")
  enabled=$(head -1 "${handler}")
  echo "${name}: ${enabled}"
done
```

Example output:

```text
qemu-aarch64: enabled
qemu-arm: enabled
qemu-mips64el: enabled
qemu-ppc64le: enabled
qemu-riscv64: enabled
qemu-s390x: enabled
```

## Mapping QEMU Names to Platform Strings

```bash
#!/bin/bash
# list-platforms.sh - Show all available build platforms

echo "Native platform:"
case "$(uname -m)" in
  x86_64) native_arch="amd64" ;;
  aarch64) native_arch="arm64" ;;
  armv7l) native_arch="arm/v7" ;;
  armv6l) native_arch="arm/v6" ;;
  i386|i686) native_arch="386" ;;
  *) native_arch="$(uname -m)" ;;
esac
echo "  linux/${native_arch}"
echo ""

echo "Emulated platforms (via QEMU):"

declare -A QEMU_TO_PLATFORM=(
  ["qemu-aarch64"]="linux/arm64"
  ["qemu-arm"]="linux/arm/v7"
  ["qemu-s390x"]="linux/s390x"
  ["qemu-ppc64le"]="linux/ppc64le"
  ["qemu-mips64el"]="linux/mips64le"
  ["qemu-riscv64"]="linux/riscv64"
  ["qemu-i386"]="linux/386"
)

for handler in /proc/sys/fs/binfmt_misc/qemu-*; do
  [ -e "${handler}" ] || { echo "  (none registered)"; break; }
  name=$(basename "${handler}")
  status=$(head -1 "${handler}")
  platform="${QEMU_TO_PLATFORM[${name}]:-unknown}"

  if [ "${status}" = "enabled" ]; then
    echo "  ${platform} (${name}: enabled)"
  fi
done
```

## Testing Available Platforms

Verify each platform actually works by running a simple container.

```bash
#!/bin/bash
# test-platforms.sh - Test which platforms actually work

PLATFORMS=(
  "linux/amd64"
  "linux/arm64"
  "linux/arm/v7"
  "linux/s390x"
  "linux/ppc64le"
  "linux/386"
  "linux/riscv64"
  "linux/mips64le"
)

echo "Platform Availability Test"
echo "=========================="

for PLATFORM in "${PLATFORMS[@]}"; do
  printf "  %-20s " "${PLATFORM}"

  RESULT=$(podman run --rm --platform "${PLATFORM}" alpine:3.19 uname -m 2>&1)

  if [ $? -eq 0 ]; then
    echo "OK (${RESULT})"
  else
    echo "NOT AVAILABLE"
  fi
done
```

## Checking Base Image Platform Support

Different base images support different platforms. Check what a specific image offers.

```bash
# Inspect a remote image's manifest to see supported platforms
podman manifest inspect docker://alpine:3.19 | \
  jq -r '.manifests[]
    | select(.platform.os and .platform.architecture)
    | select(.platform.os != "unknown" and .platform.architecture != "unknown")
    | "\(.platform.os)/\(.platform.architecture)\(if .platform.variant then "/\(.platform.variant)" else "" end)"'

# Example output for alpine:3.19:
# linux/amd64
# linux/arm/v6
# linux/arm/v7
# linux/arm64/v8
# linux/386
# linux/ppc64le
# linux/s390x
```

Compare multiple base images:

```bash
#!/bin/bash
# compare-base-images.sh - Show platform support for common base images

IMAGES=(
  "alpine:3.19"
  "ubuntu:22.04"
  "debian:bookworm-slim"
  "node:20-alpine"
  "golang:1.22-alpine"
  "python:3.12-slim"
)

for IMAGE in "${IMAGES[@]}"; do
  echo "=== ${IMAGE} ==="
  podman manifest inspect "docker://${IMAGE}" 2>/dev/null | \
    jq -r '.manifests[]
      | select(.platform.os and .platform.architecture)
      | select(.platform.os != "unknown" and .platform.architecture != "unknown")
      | "  \(.platform.os)/\(.platform.architecture)\(if .platform.variant then "/\(.platform.variant)" else "" end)"' 2>/dev/null || \
    echo "  (not a multi-arch image or unavailable)"
  echo ""
done
```

## Checking Podman Build Capabilities

```bash
# Check Podman version (newer versions have better multi-arch support)
podman version

# Check the OCI runtime
podman info --format '{{.Host.OCIRuntime.Name}}: {{.Host.OCIRuntime.Version}}'

# Check if rootless or rootful (both support multi-arch)
podman info --format 'Rootless: {{.Host.Security.Rootless}}'
```

## Finding the Intersection of Available Platforms

The platforms you can actually build for are the intersection of what QEMU supports and what your base image provides.

```bash
#!/bin/bash
# available-build-platforms.sh
# Shows platforms you can actually build for with a given base image

BASE_IMAGE="${1:-alpine:3.19}"

echo "Checking buildable platforms for: ${BASE_IMAGE}"
echo ""

# Get platforms supported by the base image
IMAGE_PLATFORMS=$(podman manifest inspect "docker://${BASE_IMAGE}" 2>/dev/null | \
  jq -r '.manifests[]
    | select(.platform.os and .platform.architecture)
    | select(.platform.os != "unknown" and .platform.architecture != "unknown")
    | "\(.platform.os)/\(.platform.architecture)\(if .platform.variant then "/\(.platform.variant)" else "" end)"')

if [ -z "${IMAGE_PLATFORMS}" ]; then
  echo "Could not inspect ${BASE_IMAGE}. It may not be a multi-arch image."
  exit 1
fi

echo "Base image supports:"
echo "${IMAGE_PLATFORMS}" | sed 's/^/  /'
echo ""

echo "Your system can build:"
for PLATFORM in ${IMAGE_PLATFORMS}; do
  printf "  %-20s " "${PLATFORM}"

  RESULT=$(podman run --rm --platform "${PLATFORM}" "${BASE_IMAGE}" true 2>&1)

  if [ $? -eq 0 ]; then
    echo "YES"
  else
    echo "NO (missing QEMU support)"
  fi
done
```

Usage:

```bash
chmod +x available-build-platforms.sh
./available-build-platforms.sh alpine:3.19
./available-build-platforms.sh ubuntu:22.04
```

## Installing Missing Platform Support

If a platform test fails, install the corresponding QEMU handler.

```bash
# Install all QEMU user-static emulators
sudo dnf install qemu-user-static   # Fedora
sudo apt-get install qemu-user-static  # Ubuntu

# Restart binfmt to register new handlers
sudo systemctl restart systemd-binfmt

# Or use the container approach
podman run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Re-check available platforms
ls /proc/sys/fs/binfmt_misc/qemu-*
```

## Platform Support in CI/CD

Check platform availability as the first step in your CI pipeline.

```bash
#!/bin/bash
# ci-check-platforms.sh

REQUIRED_PLATFORMS=("linux/amd64" "linux/arm64")
MISSING=()

for PLATFORM in "${REQUIRED_PLATFORMS[@]}"; do
  if ! podman run --rm --platform "${PLATFORM}" alpine:3.19 true 2>/dev/null; then
    MISSING+=("${PLATFORM}")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing platform support for: ${MISSING[*]}"
  echo "Install qemu-user-static and restart binfmt."
  exit 1
fi

echo "All required platforms available. Proceeding with build."
```

## Summary

Discover available Podman build platforms by checking your native architecture with `uname -m`, listing QEMU registrations in `/proc/sys/fs/binfmt_misc/`, and inspecting base image manifests with `podman manifest inspect`. Test each platform by running a simple container. The buildable platforms are the intersection of what QEMU emulates and what your base image supports. Always verify platform availability before attempting multi-architecture builds, especially in CI/CD environments.
