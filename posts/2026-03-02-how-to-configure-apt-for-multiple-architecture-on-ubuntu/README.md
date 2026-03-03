# How to Configure APT for Multiple Architecture on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Multi-Architecture, Package Management, Linux

Description: Learn how to configure APT for multi-architecture support on Ubuntu to install 32-bit packages on 64-bit systems, cross-compile software, and manage packages for different CPU architectures.

---

Ubuntu's APT package manager supports multiple CPU architectures simultaneously through a feature called multi-arch. This lets you install 32-bit libraries alongside 64-bit software, run 32-bit applications on 64-bit Ubuntu, cross-compile for ARM or other architectures, and manage packages for embedded systems from a desktop development machine. This guide explains how multi-arch works and how to configure it for common scenarios.

## Understanding Multi-Arch in APT

APT identifies packages by both name and architecture. When you have multi-arch enabled, packages get architecture suffixes: `libc6:amd64` and `libc6:i386` can coexist on the same system. The current system architecture (from `dpkg --print-architecture`) installs packages without a suffix by default.

```bash
# Check current system architecture
dpkg --print-architecture
# Output: amd64

# Check what foreign architectures are currently enabled
dpkg --print-foreign-architectures
# If empty, no foreign architectures are configured yet
```

## Adding a Foreign Architecture

The most common use case is adding i386 (32-bit x86) support to an amd64 system:

```bash
# Add i386 architecture support
sudo dpkg --add-architecture i386

# Update package lists to include i386 packages
sudo apt-get update

# Verify the architecture was added
dpkg --print-foreign-architectures
# Output: i386
```

Now APT knows about i386 packages and can install them.

## Installing 32-bit Packages

With i386 architecture enabled, install 32-bit libraries and applications:

```bash
# Install a specific 32-bit library (colon suffix specifies architecture)
sudo apt-get install -y libc6:i386

# Install 32-bit development libraries (for compiling 32-bit code)
sudo apt-get install -y \
  libc6:i386 \
  libncurses5:i386 \
  libstdc++6:i386 \
  lib32gcc-s1 \
  lib32stdc++6

# Install a 32-bit application (if the package supports i386)
sudo apt-get install -y steam:i386
```

### Running 32-bit Binaries

Some proprietary software ships as 32-bit ELF binaries. Install the minimum required 32-bit libraries:

```bash
# Check what libraries a 32-bit binary needs
file /path/to/32bit-application  # Should show "32-bit" or "ELF 32-bit LSB"
ldd /path/to/32bit-application   # Shows required shared libraries

# Install the required 32-bit libraries
sudo apt-get install -y libc6:i386 libGL:i386
```

## Configuring Sources for Multiple Architectures

By default, when you add an architecture, all existing apt sources serve packages for that architecture too (if the repository supports it). To restrict which architectures a repository provides, use architecture filters in your sources configuration.

### Modern Sources Format (DEB822)

Ubuntu 22.04 and later use the DEB822 format for apt sources:

```text
# /etc/apt/sources.list.d/ubuntu.sources
Types: deb
URIs: http://archive.ubuntu.com/ubuntu
Suites: jammy jammy-updates jammy-backports
Components: main restricted universe multiverse
# Explicitly set which architectures this source provides
Architectures: amd64 i386
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

To add an ARM architecture source (for cross-compilation or Docker):

```text
# /etc/apt/sources.list.d/ubuntu-arm.sources
Types: deb
URIs: http://ports.ubuntu.com/ubuntu-ports
Suites: jammy jammy-updates
Components: main restricted universe
# Only arm64 packages from this source
Architectures: arm64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

### Legacy sources.list Format

For Ubuntu 20.04 and older, the traditional format uses `[arch=...]` notation:

```bash
# /etc/apt/sources.list - Restrict main repos to amd64
# This prevents APT from trying to download i386 packages from the main repo
# when you only want i386 from specific sources

deb [arch=amd64] http://archive.ubuntu.com/ubuntu focal main restricted universe multiverse
deb [arch=amd64] http://archive.ubuntu.com/ubuntu focal-updates main restricted universe multiverse
deb [arch=amd64] http://archive.ubuntu.com/ubuntu focal-security main restricted universe multiverse

# Add i386 packages from the same repos
deb [arch=i386] http://archive.ubuntu.com/ubuntu focal main restricted universe multiverse
deb [arch=i386] http://archive.ubuntu.com/ubuntu focal-updates main restricted universe multiverse
```

For third-party repositories, always specify the architecture to prevent APT from requesting packages for architectures the repository doesn't have:

```bash
# Add a third-party repository that only supports amd64
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
```

Without the `arch=amd64` specification, APT will try to fetch i386 packages from Docker's repository and produce errors since Docker doesn't publish i386 packages.

## Cross-Compilation Setup

Multi-arch is essential for cross-compiling software for different target architectures.

### Setting Up ARM64 Cross-Compilation

```bash
# Add ARM64 architecture
sudo dpkg --add-architecture arm64

# Add the ARM64 package source (Ubuntu ports repository)
sudo tee /etc/apt/sources.list.d/arm64-cross.sources << 'EOF'
Types: deb
URIs: http://ports.ubuntu.com/ubuntu-ports
Suites: jammy jammy-updates
Components: main restricted universe
Architectures: arm64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

sudo apt-get update

# Install cross-compilation toolchain
sudo apt-get install -y \
  gcc-aarch64-linux-gnu \     # C compiler for arm64
  g++-aarch64-linux-gnu \     # C++ compiler for arm64
  libc6-dev:arm64 \           # C standard library dev headers for arm64
  linux-libc-dev:arm64        # Kernel headers for arm64

# Verify the cross-compiler is available
aarch64-linux-gnu-gcc --version
```

### Cross-Compiling a Program

```bash
# Cross-compile a simple C program for ARM64
cat > hello.c << 'EOF'
#include <stdio.h>
int main() {
    printf("Hello from ARM64!\n");
    return 0;
}
EOF

# Compile for arm64 using the cross-compiler
aarch64-linux-gnu-gcc -o hello-arm64 hello.c

# Verify the output architecture
file hello-arm64
# Should show: ELF 64-bit LSB executable, ARM aarch64

# Run on arm64 hardware or emulate with qemu
sudo apt-get install -y qemu-user-static
qemu-aarch64-static hello-arm64
```

### Cross-Compiling with CMake

```cmake
# toolchain-arm64.cmake
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)

# Cross-compiler paths
set(CMAKE_C_COMPILER aarch64-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER aarch64-linux-gnu-g++)

# Tell CMake where to find ARM64 libraries
set(CMAKE_FIND_ROOT_PATH /usr/aarch64-linux-gnu)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

```bash
# Build a project with the ARM64 toolchain
mkdir build-arm64 && cd build-arm64
cmake .. -DCMAKE_TOOLCHAIN_FILE=../toolchain-arm64.cmake
make -j$(nproc)
```

## Managing Package Conflicts Between Architectures

Some packages conflict between architectures. Common issues:

```bash
# Check for broken packages after adding an architecture
sudo apt-get check

# Fix dependency issues
sudo apt-get install -f

# List all installed packages with their architectures
dpkg -l | grep ':i386'
dpkg -l | grep ':arm64'

# Remove a package for a specific architecture
sudo apt-get remove libssl1.1:i386

# Remove a foreign architecture entirely
sudo dpkg --remove-architecture i386
# Note: This fails if any i386 packages are still installed
# First remove all i386 packages, then remove the architecture
```

## Finding Architecture-Specific Packages

```bash
# Search for packages available for a specific architecture
apt-cache search --names-only . | xargs -I {} \
  apt-cache show {}:i386 2>/dev/null | grep "^Package:" | head -20

# Check if a specific package has an i386 version
apt-cache show libssl-dev:i386 2>/dev/null | grep -E "Package:|Architecture:|Version:"

# Show all available architectures for a package
apt-cache showpkg libssl-dev | grep "^  " | head -5
```

## Docker Multi-Architecture Builds

Multi-arch APT is useful when building Docker images for multiple platforms:

```bash
# Enable Docker Buildx for multi-architecture builds
docker buildx create --name multiarch-builder --use

# Build for multiple architectures simultaneously
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t myapp:latest \
  --push \
  .
```

In a multi-arch Dockerfile, use the built-in `TARGETARCH` build argument:

```dockerfile
# Dockerfile
FROM ubuntu:22.04 AS base

# TARGETARCH is set automatically by buildx (amd64, arm64, etc.)
ARG TARGETARCH

# Install architecture-specific packages
RUN apt-get update && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        apt-get install -y some-amd64-specific-tool; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        apt-get install -y some-arm64-specific-tool; \
    fi
```

Multi-arch support in APT is one of Ubuntu's more powerful features for developers working across architectures, from running legacy 32-bit software to building embedded systems software from a desktop workstation.
