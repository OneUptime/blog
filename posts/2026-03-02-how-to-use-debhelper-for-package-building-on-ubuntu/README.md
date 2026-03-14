# How to Use debhelper for Package Building on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, Debian, Debhelper, Development

Description: Master debhelper for streamlined Debian package building on Ubuntu. Covers dh command sequences, overrides, add-ons, and best practices for maintainable packaging.

---

debhelper is the standard toolkit for building Debian packages. It abstracts away the repetitive parts of writing `debian/rules` files by providing a collection of small tools - each prefixed with `dh_` - that handle individual steps of the build process. Modern packages use the `dh` sequencer to run these tools in the correct order automatically.

Understanding debhelper well will save you significant time when packaging software for Ubuntu.

## Installing debhelper

```bash
# Install debhelper and related tools
sudo apt update
sudo apt install debhelper devscripts dh-make -y

# Check the installed version
dpkg -l debhelper | tail -1

# See all available dh_ commands
dpkg -L debhelper | grep '/usr/bin/dh_'
```

## The compat Level

debhelper behavior changes between compatibility levels. Always set this explicitly in `debian/compat` or in `Build-Depends`:

```bash
# Modern approach - specify compat in Build-Depends (preferred since compat 12)
# In debian/control:
# Build-Depends: debhelper-compat (= 13)

# Older approach - separate file (still works)
echo "13" > debian/compat
```

Each compat level may change defaults. Compat 13 is the current recommendation for new packages targeting Ubuntu 22.04 and later.

## The Minimal debian/rules with dh

The `dh` command runs a sequence of `dh_*` helpers automatically:

```bash
# The simplest possible debian/rules file
cat debian/rules << 'EOF'
#!/usr/bin/make -f

%:
	dh $@
EOF
```

This single rule handles everything: configure, build, test, install, strip, compress, and more. The `%` target matches any make target passed to `debian/rules`, and `dh $@` passes that target name to the sequencer.

When you run `dpkg-buildpackage`, it calls targets like `clean`, `build`, `binary` on `debian/rules`. The `dh` sequencer maps each to the appropriate sequence of `dh_*` commands.

## Viewing the Build Sequence

To see exactly what `dh` will run:

```bash
cd your-package-directory

# Show the sequence of commands for the 'build' target
dh build --no-act

# Show sequence for 'binary' (package assembly)
dh binary --no-act
```

Output looks like:

```text
   dh_auto_configure
   dh_auto_build
   dh_auto_test
   dh_prep
   dh_auto_install
   dh_installdocs
   dh_installchangelogs
   dh_compress
   dh_fixperms
   dh_strip
   dh_makeshlibs
   dh_shlibdeps
   dh_gencontrol
   dh_md5sums
   dh_builddeb
```

## Overriding Individual Steps

Override specific steps without rewriting the whole sequence:

```bash
cat > debian/rules << 'EOF'
#!/usr/bin/make -f

%:
	dh $@

# Override the configure step for a non-standard build system
override_dh_auto_configure:
	./configure --prefix=/usr --sysconfdir=/etc --localstatedir=/var

# Override the build step
override_dh_auto_build:
	$(MAKE) CFLAGS="-O2 -Wall" all

# Skip tests (use sparingly - tests catch regressions)
override_dh_auto_test:
	# Tests require network access, skip during build

# Custom install with specific DESTDIR
override_dh_auto_install:
	$(MAKE) install DESTDIR=$(CURDIR)/debian/mypackage
EOF
```

The naming convention is `override_dh_STEP`: the override runs instead of the automatic `dh_STEP` call.

## Build System Detection

`dh_auto_configure` and `dh_auto_build` detect the build system automatically:

- Makefile with `./configure` - autoconf
- `CMakeLists.txt` - cmake
- `setup.py` / `pyproject.toml` - Python
- `Cargo.toml` - Rust (with dh-cargo)
- `pom.xml` - Maven

Force a specific build system if detection fails:

```bash
# Force cmake build system
cat > debian/rules << 'EOF'
#!/usr/bin/make -f

%:
	dh $@ --buildsystem=cmake

override_dh_auto_configure:
	dh_auto_configure -- -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON
EOF
```

## Using debhelper Add-ons

Add-ons extend `dh` with additional sequences for specific languages or frameworks:

```bash
# Python 3 packaging with pybuild
# First install the add-on
sudo apt install dh-python -y

cat > debian/rules << 'EOF'
#!/usr/bin/make -f

%:
	dh $@ --with python3 --buildsystem=pybuild
EOF

# In debian/control, add to Build-Depends:
# Build-Depends: debhelper-compat (= 13), python3-all, dh-python

# Perl module packaging
sudo apt install dh-perl -y

# Systemd service integration
sudo apt install dh-systemd -y
# With compat 13+, systemd integration is built in via dh_installsystemd
```

## Key debhelper Commands Reference

These commands run automatically but you can also call them manually or override them:

```bash
# dh_install - install files using debian/package.install lists
# Create debian/mypackage.install:
cat > debian/mypackage.install << 'EOF'
usr/bin/myprogram
usr/share/mypackage/data/
EOF

# dh_installdocs - installs documentation
# Create debian/mypackage.docs:
cat > debian/mypackage.docs << 'EOF'
README.md
CHANGELOG.md
docs/
EOF

# dh_installman - install man pages
# Create debian/mypackage.manpages:
cat > debian/mypackage.manpages << 'EOF'
docs/myprogram.1
EOF

# dh_installsystemd - install and enable systemd services
# Place service file at:
mkdir -p debian/
# debian/mypackage.service (or just a .service file in the source)

# dh_installcron - install cron jobs
cat > debian/mypackage.cron.d << 'EOF'
0 2 * * * root /usr/bin/myprogram --cleanup
EOF
```

## Handling Multiple Binary Packages

A single source package can produce multiple `.deb` files:

```bash
cat > debian/control << 'EOF'
Source: mypackage
Section: utils
Priority: optional
Maintainer: Your Name <you@example.com>
Build-Depends: debhelper-compat (= 13)
Standards-Version: 4.6.0

Package: mypackage
Architecture: any
Depends: ${shlibs:Depends}, ${misc:Depends}
Description: The main package

Package: mypackage-dev
Architecture: any
Depends: mypackage (= ${binary:Version}), ${misc:Depends}
Description: Development headers for mypackage
EOF

# Use per-package .install files to split files
cat > debian/mypackage.install << 'EOF'
usr/bin/myprogram
usr/lib/libmypackage.so.1
EOF

cat > debian/mypackage-dev.install << 'EOF'
usr/include/mypackage/
usr/lib/libmypackage.so
usr/lib/libmypackage.a
EOF
```

## Environment Variables

debhelper respects several environment variables:

```bash
# DH_VERBOSE - print each command before running
DH_VERBOSE=1 dpkg-buildpackage -us -uc

# DH_QUIET - suppress output
DH_QUIET=1 dpkg-buildpackage -us -uc

# Set in debian/rules for permanent verbose output
export DH_VERBOSE=1
```

## Stripping and Debug Packages

debhelper automatically handles binary stripping and can generate debug symbol packages:

```bash
# In debian/control, add a debug package
cat >> debian/control << 'EOF'

Package: mypackage-dbgsym
Architecture: any
Section: debug
Depends: mypackage (= ${binary:Version})
Description: Debug symbols for mypackage
EOF

# dh_strip automatically creates -dbgsym packages in compat 10+
# No extra configuration needed
```

## Running Lintian

After building, always validate with lintian:

```bash
# Build the package
dpkg-buildpackage -us -uc

# Run lintian with pedantic checks
lintian -iIE --pedantic ../mypackage_1.0-1_amd64.deb

# Common issues debhelper helps avoid:
# - Wrong file permissions
# - Missing documentation
# - Incorrect dependency substitution variables
# - Non-stripped binaries
```

## Debugging Build Failures

```bash
# Run individual dh_ commands manually during development
cd your-package-directory

# Simulate the build without actually packaging
fakeroot dh build

# Run just the install step
fakeroot dh install

# Check what files ended up in the package staging area
find debian/mypackage/ -type f | sort
```

debhelper handles the vast majority of packaging tasks automatically. The key to good packaging is knowing when to trust the defaults and when to override them - and always running lintian to catch anything that was missed.
