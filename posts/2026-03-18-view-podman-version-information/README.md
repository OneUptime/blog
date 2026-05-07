# How to View Podman Version Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, System Administration, Versioning

Description: Learn how to check your Podman version and its component versions to ensure compatibility and troubleshoot issues effectively.

---

> Knowing your exact Podman version and its component versions is the first step toward resolving compatibility issues and staying current with security patches.

Podman evolves rapidly, with each release introducing new features, bug fixes, and security improvements. Checking your Podman version is essential when reporting bugs, verifying compatibility with container images, and ensuring your system is up to date. This guide covers all the ways to inspect Podman version information and what each component means.

---

## Basic Version Check

The simplest way to check your Podman version is with the `--version` flag.

```bash
# Display the Podman version string

podman --version

# Example output: podman version 4.9.3
```

This gives you the version number in a compact format suitable for quick checks.

## Detailed Version Information

For more comprehensive version details, use the `podman version` command.

```bash
# Display detailed version information for the client and, when using a remote connection, the server
podman version
```

This outputs a structured view with client version details and, when using a remote connection, server version details, including:

- **Version**: The Podman release version
- **API Version**: The REST API version supported
- **Go Version**: The Go compiler version used to build Podman
- **Built**: The build timestamp
- **OS/Arch**: The operating system and architecture

## Formatting Version Output

You can format the version output for scripting purposes.

```bash
# Output version information as JSON
podman version --format json

# Extract just the client version using Go templates
podman version --format '{{.Client.Version}}'

# Extract the API version
podman version --format '{{.Client.APIVersion}}'

# Get the Go version used to compile Podman
podman version --format '{{.Client.GoVersion}}'

# Display the build time
podman version --format '{{.Client.BuiltTime}}'
```

## Checking Component Versions

Podman relies on several underlying components. Checking their versions helps diagnose issues.

```bash
# Check the OCI runtime version (crun or runc)
podman info --format '{{.Host.OCIRuntime.Name}}: {{.Host.OCIRuntime.Version}}'

# Check the conmon (container monitor) version
podman info --format 'conmon: {{.Host.Conmon.Version}}'

# Check the Buildah version used internally
podman info --format 'Buildah: {{.Host.BuildahVersion}}'

# Check cgroup version
podman info --format 'Cgroup Version: {{.Host.CgroupsVersion}}'
```

## Comparing Client and Server Versions

When using Podman with a remote connection, client and server versions may differ.

```bash
# Display both client and server versions
podman version --format json | jq '{
  client: .Client.Version,
  server: .Server.Version
}'

# Check if client and server versions match
CLIENT=$(podman version --format '{{.Client.Version}}')
SERVER=$(podman version --format '{{.Server.Version}}')

if [ "$CLIENT" = "$SERVER" ]; then
    echo "Client and server versions match: $CLIENT"
else
    echo "WARNING: Version mismatch - Client: $CLIENT, Server: $SERVER"
fi
```

## Checking Version in Scripts

Automate version checks for CI/CD pipelines and deployment scripts.

```bash
#!/bin/bash
# check-podman-version.sh - Verify Podman meets minimum version requirements

# Define the minimum required version
MIN_VERSION="4.0.0"

# Get the current Podman version
CURRENT_VERSION=$(podman version --format '{{.Client.Version}}')

# Function to compare semantic versions
version_gte() {
    # Returns 0 (true) if $1 >= $2
    printf '%s\n%s' "$2" "$1" | sort -V -C
}

if version_gte "$CURRENT_VERSION" "$MIN_VERSION"; then
    echo "Podman version $CURRENT_VERSION meets minimum requirement ($MIN_VERSION)"
    exit 0
else
    echo "ERROR: Podman version $CURRENT_VERSION is below minimum ($MIN_VERSION)"
    exit 1
fi
```

## Checking for Available Updates

While Podman does not have a built-in update checker, you can use your package manager to check for newer packaged versions.

```bash
# Check the installed version
INSTALLED=$(podman version --format '{{.Client.Version}}')
echo "Installed Podman version: $INSTALLED"

# On Fedora/RHEL, check for available updates
dnf check-update podman 2>/dev/null

# On Ubuntu/Debian, check for available updates
apt list --upgradable 2>/dev/null | grep podman

# On macOS with Homebrew
brew outdated podman 2>/dev/null
```

## Version Information for Bug Reports

When filing bug reports, include comprehensive version details.

```bash
#!/bin/bash
# podman-bug-report-info.sh - Gather version info for bug reports

echo "=== Podman Bug Report Information ==="
echo ""
echo "--- Podman Version ---"
podman version
echo ""
echo "--- System Info ---"
podman info --format json | jq '{
  os: .host.os,
  arch: .host.arch,
  kernel: .host.kernel,
  cgroupManager: .host.cgroupManager,
  cgroupVersion: .host.cgroupVersion,
  ociRuntime: .host.ociRuntime,
  conmon: .host.conmon,
  rootless: .host.security.rootless,
  storageDriver: .store.graphDriverName
}'
echo ""
echo "--- OS Release ---"
cat /etc/os-release 2>/dev/null || sw_vers 2>/dev/null
echo ""
echo "=== End Report ==="
```

## Understanding Version Numbering

Podman follows semantic versioning (major.minor.patch):

```bash
# Parse version components
VERSION=$(podman version --format '{{.Client.Version}}')
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)
PATCH=$(echo "$VERSION" | cut -d. -f3)

echo "Full Version: $VERSION"
echo "Major: $MAJOR (breaking changes)"
echo "Minor: $MINOR (new features)"
echo "Patch: $PATCH (bug fixes)"
```

## Summary

Checking Podman version information goes beyond a simple version number. By inspecting component versions, comparing client and server versions, and automating version checks in scripts, you ensure a stable and compatible container environment. Always include comprehensive version information when troubleshooting issues or filing bug reports, and keep your Podman installation updated to benefit from the latest features and security patches.
