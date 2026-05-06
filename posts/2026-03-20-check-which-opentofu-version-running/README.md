# How to Check Which OpenTofu Version You Are Running - Which Running

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Management, DevOps, Infrastructure as Code, Debugging

Description: Learn all the ways to check which OpenTofu version is active in your environment, including where the binary is located and which version file is controlling the selection.

---

Knowing exactly which OpenTofu version is running - and why - is essential for debugging version mismatch issues. This guide covers every method to check the active version, its source, and the binary location.

---

## The Quickest Check

```bash
# Show the current OpenTofu version

tofu version
# OpenTofu v1.9.0
# on linux_amd64

# Get just the version number (useful in scripts)
tofu version | head -1 | awk '{print $2}'
# v1.9.0

# Or using JSON output
tofu version -json
```

The JSON output provides structured version information:

```json
{
  "terraform_version": "1.9.0",
  "platform": "linux_amd64",
  "provider_selections": {}
}
```

---

## Check the Binary Location

```bash
# Find where the tofu binary is located
which tofu
# /home/user/.tofuenv/bin/tofu  (if using tofuenv)
# /usr/local/bin/tofu           (if installed directly)

# On Linux, get the full resolved path (follow symlinks)
readlink -f $(which tofu)
# /home/user/.tofuenv/versions/1.9.0/tofu
```

---

## Check Which Version File Is Controlling the Version

With tofuenv:

```bash
# Show the version selected for the current directory
tofuenv version-name
# 1.9.0

# tofuenv searches for version in this order:
# 1. TOFUENV_TOFU_VERSION environment variable
# 2. .opentofu-version file (current directory, then parents)
# 3. ~/.opentofu-version file (if not already found above)
# 4. ~/.tofuenv/version (global default)

# Check for a local .opentofu-version file
cat .opentofu-version 2>/dev/null || echo "No local .opentofu-version file"

# Check for a home-level .opentofu-version file
cat ~/.opentofu-version 2>/dev/null || echo "No ~/.opentofu-version file"

# Check the global tofuenv default fallback
cat ~/.tofuenv/version 2>/dev/null || echo "No ~/.tofuenv/version file"
```

With asdf:

```bash
# Show version and where it came from
asdf current opentofu
# opentofu 1.9.0 (set by /home/user/projects/myinfra/.tool-versions)

# Or globally
# opentofu 1.9.0 (set by /home/user/.tool-versions)
```

---

## Check All Installed Versions

```bash
# With tofuenv
tofuenv list
#   1.7.3
#   1.8.5
# * 1.9.0 (set by /home/user/.tofuenv/version)

# With asdf
asdf list opentofu
#   1.7.3
#   1.8.5
# * 1.9.0

# Manual check (directly in tofuenv versions dir)
ls ~/.tofuenv/versions/
```

---

## Check Version in Scripts

```bash
#!/bin/bash
# get-tofu-version.sh - extract version in scripts

TOFU_VERSION=$(tofu version -json | python3 -c "
import sys, json
print(json.load(sys.stdin)['terraform_version'])
")

echo "OpenTofu version: $TOFU_VERSION"

# Compare against a required version
REQUIRED="1.9.0"
if [ "$TOFU_VERSION" != "$REQUIRED" ]; then
  echo "WARNING: Expected $REQUIRED but found $TOFU_VERSION"
fi
```

---

## Debug Version Selection

```bash
# Show all OpenTofu-related environment variables
env | grep -i tofu

# Check if TOFUENV_TOFU_VERSION override is set
echo "TOFUENV_TOFU_VERSION: ${TOFUENV_TOFU_VERSION:-not set}"

# Walk up from current dir to find the controlling .opentofu-version
dir=$(pwd)
while [ "$dir" != "/" ]; do
  if [ -f "$dir/.opentofu-version" ]; then
    echo "Found .opentofu-version in: $dir ($(cat $dir/.opentofu-version))"
    break
  fi
  dir=$(dirname "$dir")
done
```

---

## Summary

The canonical way to check your OpenTofu version is `tofu version` or `tofu version -json` for scripts. Use `which tofu` and, on Linux, `readlink -f $(which tofu)` to find the actual binary. With tofuenv, `tofuenv list` shows all installed versions with an asterisk on the active one. With asdf, `asdf current opentofu` tells you both the version and which configuration file selected it.
