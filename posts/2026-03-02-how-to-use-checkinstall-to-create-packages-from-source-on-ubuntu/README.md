# How to Use checkinstall to Create Packages from Source on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, checkinstall, Package Management, Build Tools, Linux

Description: Learn how to use checkinstall on Ubuntu to create .deb packages from source-compiled software, enabling proper installation tracking and clean removal via apt.

---

The biggest problem with compiling software from source and running `make install` is that the files end up scattered across your filesystem with no record of what was installed or where. When you want to upgrade or remove the software, you're manually hunting for files. `checkinstall` solves this by intercepting `make install`, watching which files get created, and packaging them all into a proper `.deb` file that apt can install and later remove cleanly.

## How checkinstall Works

When you run `checkinstall` instead of `sudo make install`, it:

1. Runs the install command while monitoring the filesystem
2. Collects information about every file that gets created
3. Prompts you for package metadata (name, version, description)
4. Creates a `.deb` (or `.rpm` or Slackware package) from those files
5. Installs the package using the system's package manager

The result is software compiled from source but managed like any other system package.

## Installing checkinstall

```bash
sudo apt update
sudo apt install checkinstall
```

## Basic Usage

The standard workflow is identical to a normal source build up until the install step:

```bash
# Download and extract source (using htop as an example)
wget https://github.com/htop-dev/htop/releases/download/3.3.0/htop-3.3.0.tar.xz
tar -xf htop-3.3.0.tar.xz
cd htop-3.3.0

# Install build dependencies
sudo apt install libncurses-dev autoconf automake

# Configure and compile as normal
./autogen.sh
./configure
make -j$(nproc)

# Instead of: sudo make install
# Run checkinstall
sudo checkinstall
```

checkinstall will ask you several questions before creating the package.

## Working Through the checkinstall Prompts

After running `sudo checkinstall`, you'll see output like:

```
checkinstall 1.6.2, Copyright 2009 Felipe Eduardo Sanchez Diaz Duran
           This software is released under the GNU GPL.

The package documentation directory ./doc-pak does not exist.
Should I create a default set of package docs?  [y]:

Please write a description for the package.
End your description with an empty line or EOF.
>> htop interactive process viewer compiled from source
>>

*****************************************
**** Debian package creation selected ***
*****************************************

This package will be built according to these values:

0 -  Maintainer: [ root@hostname ]
1 -  Summary: [ htop interactive process viewer compiled from source ]
2 -  Name:    [ htop ]
3 -  Version: [ 3.3.0 ]
4 -  Release: [ 1 ]
5 -  License: [ GPL ]
6 -  Group:   [ checkinstall ]
7 -  Architecture: [ amd64 ]
8 -  Source location: [ htop-3.3.0 ]
9 -  Alternate source location: [  ]
10 - Requires: [  ]
11 - Provides: [ htop ]
12 - Conflicts: [  ]
13 - Replaces: [ ]

Enter a number to change any of them or press ENTER to continue:
```

You can press Enter to accept defaults, or type a number to change a field.

### Important Fields to Review

**Name (2)** - Should match the package name so apt knows it's installed:
```
2 - Name: [ htop ]
```

**Version (3)** - Set this to match the upstream version:
```
3 - Version: [ 3.3.0 ]
```

**Requires (10)** - Dependencies that apt will enforce. If your compiled binary needs specific libraries:
```
10 - Requires: [ libncurses6, libc6 ]
```

**Conflicts (12)** - If your custom build conflicts with the version in apt repositories:
```
12 - Conflicts: [ htop ]
```

## Specifying Options Non-Interactively

For scripted or automated builds, pass options on the command line:

```bash
sudo checkinstall \
  --pkgname=htop \
  --pkgversion=3.3.0 \
  --pkgrelease=1 \
  --pkglicense=GPL \
  --pkggroup=utils \
  --maintainer="admin@example.com" \
  --requires="libncurses6,libc6" \
  --nodoc \
  --default \
  make install
```

Key flags:
- `--default` - Accept all defaults without prompting
- `--nodoc` - Don't create a documentation directory
- `--pkgname` - Package name
- `--pkgversion` - Version string
- `--requires` - Comma-separated list of dependencies
- `--conflicts` - Packages this conflicts with
- `--replaces` - Packages this replaces (useful if replacing the apt version)

## Example: Building a Custom nginx Package

Here's a complete example building nginx with additional modules:

```bash
# Install build dependencies
sudo apt build-dep nginx
sudo apt install libpcre3-dev libssl-dev zlib1g-dev

# Download nginx source
NGINX_VERSION="1.26.1"
wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
tar -xzf nginx-${NGINX_VERSION}.tar.gz
cd nginx-${NGINX_VERSION}

# Configure with custom options
./configure \
  --prefix=/usr \
  --conf-path=/etc/nginx/nginx.conf \
  --http-log-path=/var/log/nginx/access.log \
  --error-log-path=/var/log/nginx/error.log \
  --pid-path=/var/run/nginx.pid \
  --with-http_ssl_module \
  --with-http_v2_module \
  --with-http_gzip_static_module \
  --with-stream \
  --with-stream_ssl_module

# Compile
make -j$(nproc)

# Create the package with checkinstall
sudo checkinstall \
  --pkgname=nginx-custom \
  --pkgversion="${NGINX_VERSION}" \
  --pkgrelease=1 \
  --pkglicense=BSD \
  --pkggroup=httpd \
  --maintainer="ops@example.com" \
  --requires="libpcre3,libssl3,zlib1g" \
  --conflicts=nginx \
  --replaces=nginx \
  --nodoc \
  --default
```

This creates `nginx-custom_1.26.1-1_amd64.deb` and installs it.

## Verifying the Installation

After checkinstall creates and installs the package:

```bash
# Verify it's tracked by dpkg
dpkg -l | grep htop
dpkg -l | grep nginx-custom

# See all files owned by the package
dpkg -L htop

# Check package details
dpkg -s htop

# apt treats it like any other package
apt show htop
```

## Removing checkinstall-Created Packages

This is the main benefit - clean removal via apt/dpkg:

```bash
# Remove via apt
sudo apt remove htop

# Or via dpkg
sudo dpkg -r htop

# Remove along with any auto-installed dependencies
sudo apt autoremove htop
```

No manual file hunting required.

## Keeping the .deb File

checkinstall saves the `.deb` file in the current directory after installation. Keep this for reinstallation on other systems:

```bash
# The .deb is created in the current directory
ls *.deb
# htop_3.3.0-1_amd64.deb

# Install on another Ubuntu system
sudo dpkg -i htop_3.3.0-1_amd64.deb
# Or
sudo apt install ./htop_3.3.0-1_amd64.deb  # Resolves dependencies
```

## Using a Custom Install Command

By default, checkinstall runs `make install`. You can specify a different install command:

```bash
# Use cmake's install
sudo checkinstall \
  --pkgname=myapp \
  --pkgversion=1.0.0 \
  cmake --install build/

# Use ninja's install
sudo checkinstall \
  --pkgname=myapp \
  --pkgversion=1.0.0 \
  ninja -C build install
```

## Limitations of checkinstall

checkinstall works well for most cases, but has some limitations:

- It runs the install command as root and monitors the filesystem, which may miss files installed in unexpected ways
- It doesn't handle complex post-install scripts (like systemd unit registration) - you'll need to do that manually
- The dependency list isn't auto-detected - you must specify it manually via `--requires`
- Some install processes that use `install -D` or other non-standard methods can confuse it

For any package that needs post-install hooks (creating users, registering services, running migrations), you're better off writing a proper Debian package. But for straightforward software that just installs files into standard locations, checkinstall gets you 90% of the benefit with 5% of the effort.

## Comparing to GNU Stow

The other common approach for managing source-compiled software is GNU Stow, which uses symlinks. checkinstall integrates better with apt/dpkg and is simpler for most cases. Stow is better if you need to quickly switch between versions of the same software without reinstalling.

```bash
# checkinstall approach - one command after compilation
sudo checkinstall --default

# stow approach - more steps but more flexibility
./configure --prefix=/usr/local/stow/myapp-1.0
make install
cd /usr/local/stow
stow myapp-1.0
```

For most sysadmins building software from source for production use, checkinstall strikes the right balance between simplicity and proper system hygiene.
