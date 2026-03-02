# How to Use APT to Search for Packages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Command Line

Description: A comprehensive guide to searching for packages using APT on Ubuntu, covering apt search, apt-cache, dpkg, and additional tools for finding the right package.

---

Ubuntu's package ecosystem contains tens of thousands of packages. Knowing how to search effectively saves time and ensures you install the right software. APT and its supporting tools provide several search mechanisms, each with different strengths.

## Basic apt search

The simplest search:

```bash
# Search for packages by name or description
apt search nginx

# Output includes package name, version, and short description
# Example output:
# nginx/noble 1.24.0-2ubuntu7 amd64
#   high performance web server
#
# nginx-core/noble 1.24.0-2ubuntu7 amd64
#   nginx web server with minimal module set
```

The search is case-insensitive and matches against both package names and descriptions. Be specific to reduce noise:

```bash
# Narrow by matching only package names
apt search --names-only nginx

# Search for a description keyword
apt search "web server"

# Combine with grep for more filtering
apt search python3 | grep "^python3-"
```

## apt-cache search vs apt search

`apt-cache search` is the older command that predates the unified `apt` tool. Both do essentially the same thing, but `apt-cache` offers more options:

```bash
# Basic search (equivalent to apt search)
apt-cache search nginx

# Search with multiple keywords (all must match)
apt-cache search --names-only python library

# Show full description in search results
apt-cache search --full nginx | head -40
```

## Getting Package Details with apt-cache show

Once you find a package name, get detailed information:

```bash
# Show package details
apt-cache show nginx

# Output includes:
# Package name and version
# Architecture
# Depends/Recommends/Suggests
# Installed-Size
# Homepage
# Full description
```

For a cleaner summary:

```bash
# Show only specific fields
apt-cache show nginx | grep -E "^Package:|^Version:|^Description:|^Homepage:"
```

## Checking Package Availability and Versions

```bash
# Show available versions and their sources
apt-cache policy nginx

# Example output:
# nginx:
#   Installed: (none)
#   Candidate: 1.24.0-2ubuntu7
#   Version table:
#      1.24.0-2ubuntu7 500
#         500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
```

The priority number (500) and source URL show which repository the package comes from. Higher priority sources take precedence when multiple repositories provide the same package.

```bash
# Compare versions available from different repositories
apt-cache policy php8.3 php8.2 php8.1

# Check if a specific version is available
apt-cache showpkg nginx | grep "^Versions"
```

## Searching by File or Command

Sometimes you know the name of a file or command but not which package provides it:

```bash
# Find which installed package provides a file
dpkg -S /usr/bin/nginx
# Output: nginx: /usr/bin/nginx

# Find which package provides a command
dpkg -S $(which curl)

# Search uninstalled packages for a file
# Requires apt-file package
sudo apt install apt-file
sudo apt-file update

# Search for the package that contains a specific file
apt-file search libssl.so.3

# Search for packages containing a file matching a pattern
apt-file search "*/bin/htop"
```

`apt-file` downloads the file lists for all packages in your configured repositories and searches them. It is particularly useful when you see an error like "library not found" and need to know which package provides the missing file.

## Using dpkg to Search Installed Packages

For packages already installed on the system:

```bash
# List all installed packages
dpkg -l

# Search installed packages by name
dpkg -l | grep nginx
dpkg -l nginx

# Status codes in dpkg -l output:
# ii = installed correctly
# rc = removed but config files remain
# un = not installed

# Get a clean list of all installed packages
dpkg --get-selections | grep install | awk '{print $1}'

# Check if a specific package is installed
dpkg -s nginx
# Exit code 0 if installed, non-zero if not

# A simpler installed check
dpkg -l nginx | grep "^ii" && echo "installed" || echo "not installed"
```

## Searching by Package Category

Ubuntu packages are organized into sections:

```bash
# Search within a specific section
apt-cache search "" | grep "^perl"

# Show section information for a package
apt-cache show htop | grep "^Section:"

# List all available sections
apt-cache show $(apt-cache search "" | head -1 | cut -d' ' -f1) | grep Section
```

More useful: search for all packages in a category:

```bash
# Find all web server packages
apt-cache search "web server"

# Find all database clients
apt-cache search "database client"

# Find all python packages
apt-cache search python3 | grep -c ""  # Count total python3 packages
```

## Advanced Search with aptitude

The `aptitude` tool has a more powerful search syntax:

```bash
sudo apt install aptitude

# Search by name
aptitude search nginx

# Search by description
aptitude search '~dnginx'

# Search installed packages only
aptitude search '~i nginx'

# Search not-installed packages
aptitude search '~Unginx'

# Search by maintainer
aptitude search '~mcanonical'

# Combine searches with logical operators
# Both conditions must match (and):
aptitude search '~i ~dapache'

# Either condition can match (or):
aptitude search '~nnginx | ~napache2'
```

Aptitude's search expressions are more expressive than `apt search` for complex queries.

## Filtering Search Output

```bash
# Show only package names from search (no version/description)
apt search nginx | grep -E "^[a-z]" | cut -d'/' -f1

# Count matching packages
apt search nginx | grep -c "^[a-z]"

# Sort by name
apt search python3 | grep "^python3" | sort

# Find packages matching a pattern and show their status (installed or not)
apt search nginx | grep "^nginx" | while read line; do
    pkg=$(echo "$line" | cut -d'/' -f1)
    status=$(dpkg -l "$pkg" 2>/dev/null | grep "^ii" && echo "[INSTALLED]" || echo "")
    echo "$line $status"
done
```

## Searching PPA and Third-Party Repositories

When you add PPAs, their packages appear in search results:

```bash
# Add a PPA and search its packages
sudo add-apt-repository ppa:example/ppa
sudo apt update
apt search package-from-ppa

# Check which repository a package comes from
apt-cache policy package-name | grep "http"
```

## Searching for Package Dependencies

Understanding what a package requires:

```bash
# Show what a package depends on
apt-cache depends nginx

# Show recursive dependencies (everything required)
apt-cache depends --recurse nginx | grep "^  Depends"

# Show what depends on a package (reverse dependencies)
apt-cache rdepends nginx

# Show what would be installed with a package
apt-get install --simulate nginx

# Or with apt
apt install --dry-run nginx
```

## Finding Documentation Packages

Many packages have separate documentation packages:

```bash
# Search for documentation packages
apt search "-doc " | grep "documentation\|manual\|man pages"

# Find doc package for a specific tool
apt search "nginx-doc"
apt show nginx-doc 2>/dev/null
```

## Searching for Package Source Code

```bash
# Find the source package for a binary package
apt-cache showsrc nginx

# Search available source packages
apt-cache search --names-only "" | head -20  # All sources
apt-cache search nginx | grep "source\|src"
```

## Creating a Search Alias

If you frequently use a specific search pattern:

```bash
# Add to ~/.bashrc
alias aptsearch='apt-cache search --names-only'
alias aptshow='apt-cache show'

# Reload
source ~/.bashrc

# Use
aptsearch nginx
aptshow nginx
```

## Practical Search Workflow

When you need a package but do not know its name:

```bash
# 1. Start broad
apt search "http server"

# 2. If too many results, narrow it
apt search --names-only nginx

# 3. Find the right one
apt-cache show nginx nginx-extras nginx-full

# 4. Check what it installs and requires
apt install --dry-run nginx

# 5. Install
sudo apt install nginx
```

For a command you know exists but is not installed:

```bash
# 1. Try command-not-found (built into Ubuntu)
# Just type the command - bash will suggest packages

# 2. Or search explicitly
apt-file search $(which ncdu 2>/dev/null || echo "ncdu")

# 3. Or use apt search
apt search ncdu
```

Ubuntu's package search tools are fast and thorough when you know the right approach. `apt search` for quick lookups, `apt-cache show` for detailed information, `apt-file search` for file-to-package mapping, and `aptitude search` for complex queries with boolean logic cover essentially every search scenario.
