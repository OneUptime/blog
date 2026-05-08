# How to Install Podman from Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: A detailed guide to building and installing Podman from source code, including all dependencies, build configuration, and post-installation setup.

---

> Building Podman from source gives you access to the latest features, custom build options, and the ability to contribute patches upstream.

Building from source is useful when you need a version not yet available in your distribution's repositories, want to apply custom patches, or need to build with specific compile-time options. This guide walks through the complete process on a Fedora/RHEL-based system, with notes for Debian-based systems.

---

## Prerequisites

- A Linux system (Fedora, Debian/Ubuntu, or similar)
- Go 1.24.2 or later for current Podman releases (check the `go` directive in `go.mod` for the version you build)
- Git
- A user account with sudo privileges
- At least 4GB of free disk space

## Step 1: Install Build Dependencies

### On Fedora / CentOS Stream / RHEL

```bash
# Install development tools and Podman build dependencies

sudo dnf install -y \
  git \
  golang \
  make \
  gcc \
  pkgconfig \
  gpgme-devel \
  libassuan-devel \
  libseccomp-devel \
  device-mapper-devel \
  glib2-devel \
  libselinux-devel \
  systemd-devel \
  btrfs-progs-devel \
  conmon \
  containers-common \
  crun \
  netavark \
  aardvark-dns \
  nftables \
  passt \
  slirp4netns \
  iptables \
  go-md2man
```

### On Debian / Ubuntu

```bash
# Install development tools and Podman build dependencies
sudo apt install -y \
  git \
  golang-go \
  make \
  gcc \
  pkg-config \
  libgpgme-dev \
  libassuan-dev \
  libseccomp-dev \
  libdevmapper-dev \
  libglib2.0-dev \
  libsystemd-dev \
  libselinux1-dev \
  libapparmor-dev \
  libbtrfs-dev \
  btrfs-progs \
  conmon \
  crun \
  netavark \
  aardvark-dns \
  nftables \
  passt \
  slirp4netns \
  iptables \
  go-md2man
```

## Step 2: Install Go (If Not Already Present)

Verify Go is installed and meets the minimum version:

```bash
# Check Go version
go version

# If Go is not installed or too old, install a current supported version
wget https://go.dev/dl/go1.26.3.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.3.linux-amd64.tar.gz

# Add Go to your PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
go version
```

## Step 3: Clone the Podman Repository

```bash
# Clone the Podman source code
git clone https://github.com/containers/podman.git /tmp/podman-src
cd /tmp/podman-src

# List available release tags
git tag | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -10
```

## Step 4: Checkout the Desired Version

```bash
# Checkout a specific release (replace with your desired version)
cd /tmp/podman-src
git checkout v5.3.0

# Or stay on the main branch for the latest development code
# git checkout main
```

## Step 5: Build Podman

```bash
# Build Podman with standard options
cd /tmp/podman-src
make BUILDTAGS="selinux seccomp exclude_graphdriver_devicemapper"

# For a build with systemd support (recommended on systemd-based systems)
make BUILDTAGS="selinux seccomp systemd exclude_graphdriver_devicemapper"
```

The build produces the `podman` binary in the `bin/` directory:

```bash
# Verify the build succeeded
ls -la bin/podman

# Check the built version
./bin/podman --version
```

## Step 6: Install Podman System-Wide

```bash
# Install Podman and its man pages
cd /tmp/podman-src
sudo env PATH=$PATH make install PREFIX=/usr

# Verify the installation
which podman
podman --version
```

## Step 7: Install Supporting Components

Podman requires several companion tools. Install them if not already present:

### Install conmon (Container Monitor)

```bash
# Check if conmon is installed
conmon --version 2>/dev/null

# If not, build from source
git clone https://github.com/containers/conmon.git /tmp/conmon-src
cd /tmp/conmon-src
make
sudo make podman
```

### Install crun (OCI Runtime)

```bash
# Check if crun is installed
crun --version 2>/dev/null

# If not, install from package manager
sudo dnf install -y crun    # Fedora
# or
sudo apt install -y crun     # Debian/Ubuntu
```

### Install Netavark (Network Stack)

```bash
# Check if netavark is available
which netavark 2>/dev/null

# Install from package manager if available
sudo dnf install -y netavark aardvark-dns  # Fedora
sudo apt install -y netavark aardvark-dns  # Debian/Ubuntu
# or build from source
git clone https://github.com/containers/netavark.git /tmp/netavark-src
cd /tmp/netavark-src
make
sudo make install
```

## Step 8: Set Up Configuration Files

```bash
# Create the containers configuration directory
sudo mkdir -p /etc/containers

# Install default configuration files
sudo curl -L -o /etc/containers/registries.conf https://raw.githubusercontent.com/containers/image/main/registries.conf
sudo curl -L -o /etc/containers/policy.json https://raw.githubusercontent.com/containers/image/main/default-policy.json
```

## Step 9: Configure Rootless Support

```bash
# Add subuid and subgid mappings
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)

# Install pasta or slirp4netns if not already present
if ! command -v pasta >/dev/null && ! command -v slirp4netns >/dev/null; then
  sudo dnf install -y passt slirp4netns || sudo apt install -y passt slirp4netns
fi
```

## Step 10: Verify the Source Build

```bash
# Run a comprehensive test
podman --version
podman info

# Run a test container
podman run --rm docker.io/library/hello-world

# Test rootless container
podman run --rm docker.io/library/alpine:latest id

# Test networking
podman run --rm docker.io/library/alpine:latest wget -qO- https://httpbin.org/ip
```

## Building with Custom Options

### Enable Remote Client

```bash
# Build the remote client for connecting to remote Podman instances
cd /tmp/podman-src
make podman-remote
sudo cp bin/podman-remote /usr/local/bin/
```

### Build with Additional Tags

```bash
# Build with all common tags
cd /tmp/podman-src
make BUILDTAGS="selinux seccomp systemd exclude_graphdriver_devicemapper exclude_graphdriver_btrfs"
```

### Cross-Compile for ARM

```bash
# Build for ARM64
cd /tmp/podman-src
GOARCH=arm64 make BUILDTAGS="selinux seccomp exclude_graphdriver_devicemapper"
```

## Updating a Source Installation

```bash
# Pull the latest changes
cd /tmp/podman-src
git fetch --all
git checkout v5.4.0  # Replace with the new version

# Rebuild and reinstall
make clean
make BUILDTAGS="selinux seccomp systemd exclude_graphdriver_devicemapper"
sudo env PATH=$PATH make install PREFIX=/usr

# Verify the update
podman --version
```

## Uninstalling a Source Build

```bash
# Remove the installed binaries
cd /tmp/podman-src
sudo make uninstall

# Clean the build directory
make clean

# Optionally remove the source
rm -rf /tmp/podman-src
```

## Troubleshooting

If the build fails with missing Go modules:

```bash
# Ensure Go modules are downloaded
cd /tmp/podman-src
go mod download
```

If you get `gpgme` related build errors:

```bash
# Ensure development headers are installed
sudo dnf install -y gpgme-devel libassuan-devel  # Fedora
sudo apt install -y libgpgme-dev libassuan-dev    # Debian
```

If `make install` fails with permission errors:

```bash
# Use PREFIX to install to a different location
make install PREFIX=$HOME/.local

# Add to PATH
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Summary

Building Podman from source requires installing Go and several C library dependencies, then following a standard `make && make install` workflow. This approach gives you complete control over the build configuration and version. Remember to also install companion tools like conmon, crun, and netavark for a fully functional container environment.
