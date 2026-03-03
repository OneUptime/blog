# How to Use Aptitude as an Alternative to APT on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Aptitude, System Administration

Description: Learn how to use aptitude as a powerful alternative to APT on Ubuntu, including its interactive interface, superior dependency resolver, search syntax, and why it excels at conflict resolution.

---

`aptitude` has been around since the early days of Debian-based distributions, and despite `apt` being the default tool on Ubuntu, aptitude still has genuine advantages in specific situations. Its dependency resolver is more sophisticated, it maintains better package state history, and its interactive text interface provides a different workflow for package management.

## Installing Aptitude

```bash
# aptitude is not installed by default on Ubuntu Server
sudo apt install aptitude

# Verify it's working
aptitude --version
```

## Basic Command-Line Usage

Many aptitude commands mirror their APT equivalents, making it easy to switch between them:

```bash
# Update package lists
sudo aptitude update

# Upgrade all packages
sudo aptitude upgrade

# Full upgrade (allows installs and removals)
sudo aptitude full-upgrade

# Install a package
sudo aptitude install nginx

# Remove a package
sudo aptitude remove nginx

# Purge a package (removes config files too)
sudo aptitude purge nginx

# Search for packages
aptitude search nginx

# Show package information
aptitude show nginx
```

## The Interactive Interface

Run `aptitude` without arguments to enter the interactive text-mode browser:

```bash
sudo aptitude
```

The interface shows:
- Packages grouped by state (upgradable, new, installed, etc.)
- Navigation with arrow keys
- Actions triggered by keyboard shortcuts

Key bindings in the interactive interface:

```text
Arrow keys    - Navigate
Enter         - Expand/collapse category or view package details
u             - Update package lists
U             - Mark all upgradable packages for upgrade
g             - Preview and apply pending actions
+             - Mark a package for installation
-             - Mark a package for removal
_             - Mark a package for purge
=             - Hold a package at current version
:             - Keep package at current version
F10           - Access the menu
q             - Quit (or cancel current action)
/             - Search
\             - Search backwards
n             - Find next match
```

The interactive interface is particularly useful when you want to browse available packages in a category, compare options, or review what will be changed before committing.

## aptitude's Superior Dependency Resolver

The main practical advantage of aptitude over apt is its dependency resolver. When APT can't resolve a dependency conflict and gives up, aptitude often finds a solution by considering more options.

When you install a package with aptitude and it encounters a conflict, it presents multiple resolution strategies:

```bash
# Example of aptitude finding a conflict
sudo aptitude install some-package
# output:
# The following packages have unresolved dependencies:
#   some-package : Conflicts: other-package (< 2.0) but 1.5 is installed
#
# The following actions will resolve these dependencies:
#
#   Keep the following packages at their current version:
#   1) some-package [Not Installed]
#
#   Install the following packages:
#   2) other-package [2.1-1]
#
#   Downgrade the following packages:
#   3) some-package [1.0-1]
#
# Accept this solution? [Y/n/q/?]
```

Press `n` to see the next proposed solution if the first isn't acceptable. aptitude cycles through multiple resolution options rather than giving up.

## The aptitude Search Syntax

aptitude's search system is more expressive than `apt-cache search`:

```bash
# Search by name pattern
aptitude search '~nnginx'    # Name contains 'nginx'

# Find installed packages
aptitude search '~i'         # All installed packages

# Find packages not installed
aptitude search '!~i nginx'  # nginx packages that aren't installed

# Find packages with specific description
aptitude search '~dnginx'    # Description contains 'nginx'

# Find packages that depend on something
aptitude search '~Dnginx'    # Packages that depend on nginx

# Find packages from a specific archive
aptitude search '~Asecurity' # Packages in the security archive

# Combine conditions (AND)
aptitude search '~i~nlib'    # Installed library packages

# OR condition
aptitude search '~nnginx|~napache2'  # Either nginx or apache

# Find new packages (added since last update)
aptitude search '~N'

# Find packages marked for upgrade
aptitude search '~U'
```

## Viewing Package History

aptitude tracks the history of package state changes:

```bash
# View aptitude's package action log
cat /var/log/aptitude

# Or filter by package
grep "nginx" /var/log/aptitude | tail -20
```

## Comparing aptitude and apt

| Feature | apt | aptitude |
|---------|-----|----------|
| Dependency resolution | Good | Better |
| Interactive interface | No | Yes |
| Search syntax | Basic | Advanced |
| Package history tracking | Limited | Yes |
| Default in Ubuntu | Yes | No |
| Memory usage | Lower | Higher |
| Speed | Faster | Slower |

For routine package management, `apt` is fine and faster. For complex dependency problems, use aptitude.

## Resolving Dependency Conflicts with aptitude

```bash
# When apt fails with dependency errors:
sudo apt install problematic-package
# E: Unable to correct problems, you have held broken packages.

# Try with aptitude instead
sudo aptitude install problematic-package
# aptitude presents resolution options
# Navigate through them with 'n' until finding one that works
```

## Using aptitude for Safe Upgrades

```bash
# Preview what aptitude would do for a full upgrade
sudo aptitude --simulate full-upgrade

# The -s flag is equivalent
sudo aptitude -s full-upgrade

# Ask for confirmation before each action
sudo aptitude -P full-upgrade
```

## Managing Package Priorities with aptitude

```bash
# Find packages that have been manually installed
aptitude search '~i !~M'  # Installed, not automatically installed

# Find automatically installed packages
aptitude search '~i ~M'   # Installed and automatically installed

# Show what aptitude considers "garbage" (auto-installed, no dependents)
aptitude search '~g'

# Remove all garbage packages
sudo aptitude autoclean
sudo aptitude remove '~g'
```

## Aptitude's Why Command

One of aptitude's most useful features is explaining why a package is installed:

```bash
# Why is this package installed?
aptitude why libssl3
# Output:
# i   curl      Depends libssl3 (>= 3)

# Why can't this package be installed?
aptitude why-not some-conflicting-package
```

## Searching for Similar Packages

```bash
# Find all packages related to a topic
aptitude search '~dfirewall'      # All packages with "firewall" in description
aptitude search '~sdatabase'      # Packages with "database" in short description

# Find competing packages for the same task
aptitude search '~Pmail-transport-agent'  # All packages providing MTA
```

## Scripting with aptitude

aptitude works well in scripts because of its rich exit codes:

```bash
#!/bin/bash
# Install with aptitude and handle errors

if sudo aptitude -y install package-name; then
    echo "Installation successful"
else
    echo "Installation failed, trying to resolve..."
    sudo aptitude --schedule-only install package-name
    sudo aptitude --schedule-only -f install
    sudo aptitude install
fi
```

## Aptitude Configuration

Configure aptitude behavior in `~/.aptitude/config` or `/etc/apt/apt.conf`:

```text
// Prefer aptitude's behavior for autoremove
Aptitude::Delete-Unused "true";

// Automatically resolve dependency problems
Aptitude::Auto-Fix-Broken "true";

// Show verbose output
Aptitude::Verbose "1";

// Keep packages at current version by default when conflicts arise
Aptitude::Keep-Unused-Pattern "";
```

## Summary

Aptitude and APT are complementary rather than competing. Most sysadmins use `apt` for everyday package operations and reach for `aptitude` when:

- APT can't resolve a dependency conflict
- You need to find why a package is installed (`aptitude why`)
- You want the interactive browser for package exploration
- You need advanced search patterns
- You're managing complex package states

Install `aptitude` alongside `apt` - there's no conflict, they share the same underlying package database.
