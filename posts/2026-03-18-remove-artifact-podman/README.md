# How to Remove an Artifact from Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Cleanup

Description: Learn how to remove OCI artifacts from your local Podman artifact store to free up disk space and keep your environment clean.

---

> Regularly cleaning up unused OCI artifacts from your local store prevents disk bloat and keeps your development environment organized.

As you work with OCI artifacts in Podman, your local artifact store accumulates entries over time. Old versions, test artifacts, and unused configurations take up disk space and clutter your listings. The `podman artifact rm` command lets you remove artifacts you no longer need. This post explains how to remove artifacts safely and efficiently.

---

## Prerequisites

Ensure you have a Podman version that includes the `podman artifact` commands. These commands were experimental in older 5.x releases, so check the local help output before using the examples.

```bash
# Verify Podman version

podman --version

# Check the rm subcommand
podman artifact rm --help
```

## Setting Up Sample Artifacts

Let us populate the store with a few artifacts to demonstrate removal.

```bash
# Create sample files
echo "config-v1" > config-v1.txt
echo "config-v2" > config-v2.txt
echo "config-v3" > config-v3.txt
echo "old-policy" > policy-old.txt

# Add multiple artifacts
podman artifact add localhost/myorg/app-config:v1.0 config-v1.txt
podman artifact add localhost/myorg/app-config:v2.0 config-v2.txt
podman artifact add localhost/myorg/app-config:v3.0 config-v3.txt
podman artifact add localhost/myorg/security-policy:v1.0 policy-old.txt

# Verify they exist
podman artifact ls
```

## Removing a Single Artifact

Remove an artifact by specifying its full reference.

```bash
# Remove a specific artifact version
podman artifact rm localhost/myorg/app-config:v1.0

# Verify it was removed
podman artifact ls
```

The artifact is deleted from the local store. This does not affect any copies in remote registries.

## Removing Multiple Artifacts

You can remove several artifacts in a single command.

```bash
# Remove multiple artifacts at once
podman artifact rm \
    localhost/myorg/app-config:v2.0 \
    localhost/myorg/security-policy:v1.0

# Verify both are gone
podman artifact ls
```

## Removing by Digest

If you know the digest of an artifact, you can remove it that way.

```bash
# First, find the artifact manifest digest
DIGEST=$(podman artifact inspect localhost/myorg/app-config:v3.0 --format "{{.Digest}}")

# Remove by the digest
podman artifact rm "$DIGEST"
```

## Removing All Artifacts Matching a Pattern

Podman does not have a built-in glob for artifact removal, but you can use shell scripting.

```bash
# Re-add some artifacts for this example
echo "test1" > test1.txt
echo "test2" > test2.txt
podman artifact add localhost/myorg/test-config:v1 test1.txt
podman artifact add localhost/myorg/test-config:v2 test2.txt
podman artifact add localhost/myorg/prod-config:v1 test1.txt

# Remove all artifacts matching "test-config"
podman artifact ls --format "{{.Repository}}:{{.Tag}}" | \
    grep "test-config" | \
    while read -r artifact; do
        podman artifact rm "$artifact"
    done

# Verify only prod-config remains
podman artifact ls
```

## Removing All Local Artifacts

To clear the entire local artifact store, use the `--all` option.

```bash
# Remove every artifact in the local store
podman artifact rm --all

# Confirm the store is empty
podman artifact ls
```

Use this with caution, as it removes everything without confirmation.

## Safe Removal with Confirmation

For safety, add a confirmation step before removing artifacts.

```bash
#!/bin/bash
# Script to remove artifacts with confirmation

ARTIFACT="$1"

if [ -z "$ARTIFACT" ]; then
    echo "Usage: $0 <artifact-reference>"
    exit 1
fi

# Check if the artifact exists
if ! podman artifact ls --format "{{.Repository}}:{{.Tag}}" | grep -Fxq "$ARTIFACT"; then
    echo "Artifact $ARTIFACT not found in local store"
    exit 1
fi

# Show artifact details before removal
echo "About to remove the following artifact:"
podman artifact inspect "$ARTIFACT" | python3 -m json.tool
echo ""
read -p "Are you sure you want to remove $ARTIFACT? (y/N): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    podman artifact rm "$ARTIFACT"
    echo "Artifact removed successfully"
else
    echo "Removal cancelled"
fi
```

## Cleanup Script for Old Artifacts

Automate the cleanup of old artifact versions, keeping only the latest.

```bash
#!/bin/bash
# Remove all but the latest version of each artifact repository

# Get unique repository names
REPOS=$(podman artifact ls --format "{{.Repository}}" | sort -u)

for repo in $REPOS; do
    # Get all tags for this repo, sorted by creation time
    TAGS=$(podman artifact ls --format "{{.CreatedAt}}	{{.Repository}}:{{.Tag}}" | \
        grep "	${repo}:" | \
        sort | \
        cut -f2-)
    TAG_COUNT=$(echo "$TAGS" | wc -l)

    if [ "$TAG_COUNT" -gt 1 ]; then
        # Keep the last (newest) entry, remove the rest
        echo "$TAGS" | head -n -1 | while read -r artifact; do
            echo "Removing old artifact: $artifact"
            podman artifact rm "$artifact"
        done
    fi
done

echo "Cleanup complete"
podman artifact ls
```

## Summary

Removing OCI artifacts from the local Podman store is done with `podman artifact rm` followed by the artifact reference. You can remove single artifacts, multiple artifacts in one command, or use shell scripting to remove artifacts matching a pattern or to clear the entire store. Removal is local only and does not affect remote registry copies. Building confirmation prompts and automated cleanup scripts helps maintain a tidy artifact store without accidental deletions.
