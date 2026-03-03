# How to Compile Software from Source on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Compilation, Development, Build Tool, Linux

Description: A practical guide to compiling software from source on Ubuntu, covering build tools, dependency resolution, configure options, and managing custom builds alongside apt-managed packages.

---

Most software on Ubuntu comes through apt, but there are legitimate reasons to build from source: you need a version newer than what's in the repositories, you need specific compile-time options enabled, you want to apply a patch, or you're building something that simply isn't packaged. Compiling from source isn't as intimidating as it looks once you understand the general pattern that most projects follow.

## Installing Build Tools

Before you can compile anything, you need the core build tools:

```bash
# Install the essential build tools meta-package
sudo apt update
sudo apt install build-essential

# This installs: gcc, g++, make, and various headers
# Verify gcc is available
gcc --version

# Also commonly needed
sudo apt install cmake pkg-config autoconf automake libtool
```

`build-essential` covers the vast majority of C and C++ projects. Language-specific compilers (Go, Rust, etc.) need to be installed separately.

## The General Build Pattern

Most open-source software follows one of a few build systems. Understanding which one a project uses tells you what commands to run.

### Autoconf/Automake (./configure && make)

This is the classic pattern, used by projects like nginx, OpenSSH, and many GNU utilities:

```bash
# 1. Configure the build, checking for dependencies
./configure

# 2. Compile
make

# 3. Install (usually to /usr/local by default)
sudo make install
```

The `./configure` script examines your system, checks for required libraries, and generates Makefiles suited to your environment.

### CMake

Modern C/C++ projects often use CMake. The pattern is slightly different:

```bash
# Create a build directory (keeps source tree clean)
mkdir build && cd build

# Generate build files
cmake ..

# Compile using available CPU cores
make -j$(nproc)

# Install
sudo make install
```

### Meson + Ninja

GNOME projects and increasingly many others use Meson:

```bash
# Set up build directory
meson setup build

# Compile
ninja -C build

# Install
sudo ninja -C build install
```

## A Worked Example: Compiling nginx from Source

Compiling nginx from source is a good practical example because you might want to enable modules not included in the Ubuntu package:

```bash
# Install nginx's build dependencies
sudo apt install libpcre3-dev libssl-dev zlib1g-dev

# Download the source
NGINX_VERSION="1.26.1"
wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
tar -xzf nginx-${NGINX_VERSION}.tar.gz
cd nginx-${NGINX_VERSION}

# Configure with specific options
# --prefix sets where it installs
# --with-* enables optional modules
./configure \
  --prefix=/usr/local/nginx \
  --sbin-path=/usr/local/sbin/nginx \
  --conf-path=/etc/nginx/nginx.conf \
  --pid-path=/var/run/nginx.pid \
  --with-http_ssl_module \
  --with-http_v2_module \
  --with-http_gzip_static_module \
  --with-stream

# Compile using all available CPU cores
make -j$(nproc)

# Install
sudo make install

# Verify
nginx -v
```

## Installing Build Dependencies Automatically

For software that's already in Ubuntu's repositories (even if you're not using the packaged version), apt can install all build dependencies automatically:

```bash
# Enable source repositories if not already enabled
sudo apt edit-sources
# Add deb-src lines matching your deb lines

# Install build dependencies for a package
sudo apt build-dep nginx
sudo apt build-dep python3

# This installs everything needed to build the package from source
```

For software not in the repositories, you'll need to read the project's documentation to find what libraries are required, then install the dev packages:

```bash
# Dev packages provide headers and are needed at compile time
# Runtime packages only provide shared libraries for running already-compiled software

# Example: if a project requires libcurl
sudo apt install libcurl4-openssl-dev

# Most library packages follow the pattern: lib{name}-dev
apt search "lib*-dev" | grep ssl   # Find SSL-related dev packages
```

## Understanding ./configure Options

The `./configure` script accepts many options that control what gets built and where it gets installed:

```bash
# See all available options
./configure --help

# Common options:
# --prefix=/path       Install root (default: /usr/local)
# --sysconfdir=/etc    Config file location
# --localstatedir=/var Runtime data location
# --enable-featurename Enable optional feature
# --disable-featurename Disable feature
# --with-library       Use this library
# --without-library    Build without this library

# Example for SQLite
./configure \
  --prefix=/usr/local \
  --enable-readline \
  --enable-threadsafe \
  --disable-tcl
```

## Managing Where Software Installs

The default install prefix is `/usr/local/`. This keeps custom builds separate from apt-managed software in `/usr/`:

```bash
# /usr/local/ structure after installing from source:
/usr/local/bin/      # Executables
/usr/local/lib/      # Libraries
/usr/local/include/  # Headers
/usr/local/share/    # Data files, man pages
/usr/local/etc/      # Config files (some projects)
```

To install to a completely isolated location:

```bash
# Install to a specific prefix
./configure --prefix=/opt/myapp-1.2.3
make
sudo make install

# The software is fully contained in /opt/myapp-1.2.3/
# Easy to remove: sudo rm -rf /opt/myapp-1.2.3
```

## Updating the Linker and PATH

After installing to `/usr/local/`, the system usually works without any extra configuration. But sometimes you need to update:

```bash
# Update the dynamic linker cache after installing libraries
sudo ldconfig

# If executables aren't found, check PATH
echo $PATH
# /usr/local/bin should already be included

# For libraries in non-standard paths, add to ldconfig
echo "/usr/local/lib/mylib" | sudo tee /etc/ld.so.conf.d/mylib.conf
sudo ldconfig
```

## Tracking Files Installed from Source

`make install` has no uninstall tracking - it just copies files and forgets about them. This can make cleanup difficult. A few approaches:

### Approach 1: DESTDIR Installation

```bash
# Install to a staging directory
sudo make install DESTDIR=/tmp/myapp-staging

# Now you can see exactly what would be installed
find /tmp/myapp-staging -type f

# Then copy to the real prefix
sudo cp -r /tmp/myapp-staging/* /
```

### Approach 2: Record with stow

GNU stow manages symlinks to keep source-compiled packages organized:

```bash
sudo apt install stow

# Install to /usr/local/stow/appname/
./configure --prefix=/usr/local/stow/myapp-1.2.3
make
sudo make install

# Create symlinks in /usr/local/
cd /usr/local/stow
sudo stow myapp-1.2.3

# Later, to remove
sudo stow --delete myapp-1.2.3
sudo rm -rf /usr/local/stow/myapp-1.2.3
```

### Approach 3: Use checkinstall (Recommended)

`checkinstall` intercepts `make install` and creates a `.deb` package instead, which apt can then manage properly. See the separate post on checkinstall for details.

## Parallel Compilation

Large projects can take a long time to compile. Use all available CPU cores:

```bash
# Check how many cores are available
nproc

# Use all cores
make -j$(nproc)

# Leave one core free for the system
make -j$(($(nproc) - 1))

# For cmake
cmake --build . -j$(nproc)
```

## Debugging Build Failures

Build failures usually fall into a few categories:

### Missing Dependencies

```text
configure: error: zlib library not found
```

```bash
# Search for the missing package
apt search zlib | grep dev
sudo apt install zlib1g-dev
```

### Compiler Version Issues

Some projects require a newer GCC or specific C++ standard:

```bash
# Install a specific GCC version
sudo apt install gcc-12 g++-12

# Use it for the build
CC=gcc-12 CXX=g++-12 ./configure
```

### Enabling Verbose Compilation Output

```bash
# See the actual compiler commands being run
make VERBOSE=1

# Or with cmake
cmake --build . --verbose
```

## Uninstalling Source-Compiled Software

If you kept the build directory:

```bash
# Many projects support make uninstall
cd /path/to/source
sudo make uninstall
```

If not, you need to manually remove the installed files. This is why using `checkinstall` or `stow` from the start makes life easier.

Building from source is a useful skill that opens up access to the full breadth of open-source software rather than just what's packaged for your particular Ubuntu release. The effort required scales with the project's complexity, but the general pattern - get source, install dependencies, configure, make, make install - applies broadly.
