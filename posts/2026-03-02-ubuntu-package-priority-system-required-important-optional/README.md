# How to Use the Ubuntu Package Priority System (Required, Important, Optional)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, System Administration, Debian

Description: Learn how Ubuntu's package priority system works, including Required, Important, Standard, Optional, and Extra priorities, and how APT pinning priorities affect package selection and upgrades.

---

Ubuntu inherits Debian's package priority system, which classifies packages by how essential they are to a functional system. Understanding these priorities helps explain why certain packages are always present on a minimal install, why some packages are suggested but not required, and how to use APT's own priority system to control which versions of packages get installed.

## Two Different Priority Systems

It's worth distinguishing two related but separate concepts:

1. **Package Priority** - A metadata field in each package's control file indicating how essential it is to a functional system (`required`, `important`, `standard`, `optional`, `extra`)

2. **APT Pin Priority** - A number you configure in APT preferences that determines which version of a package APT selects when multiple versions are available

Both use the word "priority" but they serve different purposes.

## Package Priority Levels

### Required

Packages marked `Priority: required` are the bare minimum needed for the system to function at all. Removing them makes the system inoperable or unrecoverable without intervention:

```bash
# View required packages
dpkg -l | awk '$2 ~ /^lib/ {next} {print}' | head -5
dpkg-query -Wf '${Package}\t${Priority}\n' | grep "\trequired" | awk '{print $1}' | head -20
```

Required packages include:
- `base-files` - Filesystem hierarchy and essential files
- `bash` - The shell
- `coreutils` - Core Unix utilities (ls, cp, rm, etc.)
- `dpkg` - The package manager itself
- `mount` - Filesystem mounting tools

### Important

`Priority: important` packages are expected to be present on any standard Unix-like system. Not having them causes significantly degraded functionality:

```bash
# List important packages
dpkg-query -Wf '${Package}\t${Priority}\n' | grep "\timportant" | awk '{print $1}' | sort
```

Important packages include:
- `openssh-client` - SSH client
- `sudo` - Privilege escalation
- `apt` - The package manager frontend
- `less`, `man-db` - Basic utilities
- `ifupdown` or `netplan.io` - Network configuration

### Standard

`Priority: standard` packages are found on almost every Linux system but aren't strictly required. A minimal server install typically includes these by default:

```bash
dpkg-query -Wf '${Package}\t${Priority}\n' | grep "\tstandard" | awk '{print $1}' | sort | head -30
```

Standard packages include mail utilities, basic documentation tools, and commonly-used system tools.

### Optional

`Priority: optional` is the default for most installable packages. These are packages you'd install because you want them, not because the system needs them:

```bash
# The vast majority of packages are optional
dpkg-query -Wf '${Package}\t${Priority}\n' | grep "\toptional" | wc -l
```

### Extra

`Priority: extra` packages conflict with higher-priority packages, or are only useful in specialized scenarios. This priority is deprecated in Debian and treated as `optional` in modern Ubuntu.

## Checking a Package's Priority

```bash
# Check the priority of a specific package
apt-cache show nginx | grep ^Priority
# Priority: optional

# Compare priorities of multiple packages
apt-cache show bash coreutils openssh-client nginx | grep -E "^Package:|^Priority:"

# Get a clean list
dpkg-query -Wf '${Package}\t${Priority}\n' bash coreutils openssh-client nginx
```

## APT Pin Priority: Controlling Version Selection

APT's pin priority is a separate, configurable number that determines which version of a package APT prefers to install. This is set in `/etc/apt/preferences` or `/etc/apt/preferences.d/`.

### Default APT Priorities

```bash
# View the current APT priorities for all sources
apt-cache policy

# View priority for a specific package
apt-cache policy nginx
```

The default priority numbers:
- **1001** - Packages installed from the local system (already installed)
- **990** - Packages targeted for installation (via `apt install`)
- **500** - Packages from the release that matches the system's pin
- **100** - Packages from other releases
- **1** - Packages with `Pin-Priority: 1` (last resort)

### Creating a Pin Priority File

Pin priorities are set in preferences files:

```bash
# Example: Prefer the jammy version of a package over any PPA version
sudo tee /etc/apt/preferences.d/prefer-official << 'EOF'
Package: nginx
Pin: release a=jammy
Pin-Priority: 600
EOF
```

```bash
# Example: Prevent a package from being upgraded
sudo tee /etc/apt/preferences.d/block-nodejs-upgrade << 'EOF'
Package: nodejs
Pin: version 18.*
Pin-Priority: 1001
EOF
```

A priority above 1000 means "install this version even over an already-installed higher version."

### Pin Priority Values Explained

```
< 0        - Prevent installation
0 - 99     - Never auto-install, only if explicitly requested
100 - 499  - Install if no other source has higher priority
500 - 989  - Normal range (default is 500)
990 - 999  - Prefer this over default sources
1000+      - Install even if it's a downgrade
```

### Pinning a Specific Version

```bash
# Hold a package at exactly the current version
sudo tee /etc/apt/preferences.d/hold-postgresql << 'EOF'
Package: postgresql-14 postgresql-client-14
Pin: version 14.*
Pin-Priority: 1001
EOF

# Verify the pin works
apt-cache policy postgresql-14
# Should show the pinned version as candidate
```

### Pinning a Specific Repository

```bash
# Prefer packages from the security repository
sudo tee /etc/apt/preferences.d/prefer-security << 'EOF'
Package: *
Pin: release a=jammy-security
Pin-Priority: 600
EOF

# Prevent all packages from a PPA from being auto-installed
sudo tee /etc/apt/preferences.d/ppa-guard << 'EOF'
Package: *
Pin: release o=LP-PPA-owner-ppa-name
Pin-Priority: 100
EOF
```

### Blocking a Package Entirely

```bash
# Prevent a specific package from ever being installed
sudo tee /etc/apt/preferences.d/block-package << 'EOF'
Package: telnetd
Pin: version *
Pin-Priority: -1
EOF

# Verify
apt-cache policy telnetd
# Should show that the package is "prevented from installation"
```

## Finding Package Priorities in Practice

```bash
# Show which version APT would install and why
apt-cache policy package-name

# Show all sources and their priorities
apt-cache policy

# The 'Version table' in policy output shows:
#  *** 1.18.0 500     <- currently installed (500 default priority)
#         500 http://archive.ubuntu.com/ubuntu jammy/main
#     1.18.0 100     <- available but lower priority
#         100 /var/lib/dpkg/status
```

## The Interaction Between Package Priority and APT Priority

To be clear about when each matters:

- **Package priority** (`Required`, `Optional`, etc.) affects which packages are included in a minimal install and how aggressively APT protects them. You can't easily remove `required` packages.

- **APT pin priority** affects which version APT selects when multiple versions are available. You configure this deliberately to control version selection.

```bash
# Check package priority (metadata from the package maintainer)
apt-cache show curl | grep ^Priority

# Check APT pin priority (your configuration or defaults)
apt-cache policy curl
```

## Summary

Ubuntu's package priority system operates at two levels:

1. **Package metadata priorities** (`required` through `optional`) describe how essential a package is to system functionality. These inform `debootstrap`, minimal installs, and tools like `tasksel`.

2. **APT pin priorities** are configurable numbers in `/etc/apt/preferences.d/` that control which version APT selects. Use these for:
   - Preventing specific packages from upgrading
   - Blocking packages from being installed
   - Preferring one repository's version over another
   - Ensuring a specific version is always installed

Both systems together give administrators precise control over what gets installed, what version, and from which source.
