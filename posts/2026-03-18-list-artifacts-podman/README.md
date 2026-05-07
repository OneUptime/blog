# How to List Artifacts in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Artifact Management

Description: Learn how to list and filter OCI artifacts stored in your local Podman artifact store.

---

> Keeping track of your locally stored OCI artifacts is essential for managing configuration, binaries, and other distributable content alongside your container workflows.

Podman provides the `podman artifact ls` command to view all OCI artifacts stored locally. This is your primary tool for understanding what artifacts are available on your system before pushing them to a registry or cleaning up old versions. In this post, we will explore the various ways to list and filter artifacts in Podman.

---

## Prerequisites

Make sure you have Podman 5.4 or later with artifact support.

```bash
# Verify Podman version

podman --version

# Confirm artifact commands are available
podman artifact ls --help
```

## Adding Sample Artifacts

To demonstrate listing, let us first populate the artifact store with a few entries.

```bash
# Create sample files
echo "server.port=8080" > app.properties
echo "log.level=debug" > logging.properties
echo '{"name":"mylib","version":"3.0"}' > metadata.json

# Add artifacts with different names and tags
podman artifact add localhost/myorg/app-config:v1.0 app.properties
podman artifact add localhost/myorg/app-config:v2.0 app.properties
podman artifact add localhost/myorg/logging-config:latest logging.properties
podman artifact add localhost/myorg/lib-metadata:v3.0 metadata.json
```

## Listing All Artifacts

The simplest usage lists every artifact in the local store.

```bash
# List all artifacts
podman artifact ls
```

This produces a table showing the artifact repository, tag, digest, creation time, and size. Each row represents one artifact stored locally.

## Understanding the Output

The output columns typically include:

- **REPOSITORY** - The full reference including registry, namespace, and name
- **TAG** - The version tag for the artifact
- **DIGEST** - The content-addressable SHA256 digest
- **SIZE** - The total size of all blobs in the artifact
- **CREATED** - When the artifact was added to the local store

```bash
# Example output format
# REPOSITORY                      TAG     DIGEST       SIZE     CREATED
# localhost/myorg/app-config      v1.0    sha256:abc   1.2kB    2 minutes ago
# localhost/myorg/app-config      v2.0    sha256:def   1.2kB    1 minute ago
# localhost/myorg/logging-config  latest  sha256:ghi   856B     30 seconds ago
```

## Filtering Artifacts by Name

The `podman artifact ls` command lists all local artifacts. To focus on a partial or full artifact reference, format the output and filter it with standard shell tools.

```bash
# List only artifacts matching a specific repository
podman artifact ls --format "{{.Repository}}:{{.Tag}}" | grep "^localhost/myorg/app-config:"

# This shows only the app-config artifacts with all their tags
```

This is useful when you have many artifacts and want to focus on a specific one.

## Using Format Options

Podman supports Go template formatting for customized output, which is helpful for scripting.

```bash
# Output only the repository and tag in a custom format
podman artifact ls --format "{{.Repository}}:{{.Tag}}"

# Output without the table header for programmatic consumption
podman artifact ls --noheading

# Show only digests for all artifacts
podman artifact ls --format "{{.Digest}}"
```

## Counting Artifacts

You can combine the list command with standard shell tools to count artifacts.

```bash
# Count total number of artifacts
podman artifact ls --format "{{.Repository}}" | wc -l

# Count artifacts for a specific repository
podman artifact ls --format "{{.Repository}}" | grep "app-config" | wc -l
```

## Listing Artifacts in Scripts

When integrating artifact management into automation scripts, structured output is key.

```bash
#!/bin/bash
# Script to check if a specific artifact version exists locally

ARTIFACT="localhost/myorg/app-config"
VERSION="v2.0"

# Check if the artifact exists
if podman artifact ls --format "{{.Repository}}:{{.Tag}}" | grep -Fxq "${ARTIFACT}:${VERSION}"; then
    echo "Artifact ${ARTIFACT}:${VERSION} found in local store"
else
    echo "Artifact ${ARTIFACT}:${VERSION} not found"
    echo "Pulling from remote registry..."
    podman artifact pull registry.example.com/myorg/app-config:${VERSION}
fi
```

## Listing Artifacts with Size Information

To understand how much local disk space artifacts consume, inspect the size column.

```bash
# Show artifacts sorted by size (largest first)
podman artifact ls --format "{{.VirtualSize}}\t{{.Repository}}:{{.Tag}}" | sort -nr

# Show total artifact size in bytes
podman artifact ls --format "{{.VirtualSize}}" | awk '{total += $1} END {print total}'
```

## Checking for Stale Artifacts

Over time, your local store can accumulate old artifact versions. List them to identify cleanup candidates.

```bash
# List all artifacts and their creation times
podman artifact ls --format "{{.Created}}\t{{.Repository}}:{{.Tag}}"

# Find artifacts older than a certain reference
podman artifact ls --format "{{.Repository}}:{{.Tag}}"
```

Review the output and remove any artifacts you no longer need using `podman artifact rm`.

## Summary

The `podman artifact ls` command is your window into the local Podman artifact store. It lists all stored OCI artifacts with their references, tags, digests, sizes, and creation times. You can filter by repository name, format output for scripting with Go templates, and combine it with shell tools for counting and sorting. Regularly listing your artifacts helps you stay organized, identify stale entries, and verify that artifacts were added or pulled correctly.
