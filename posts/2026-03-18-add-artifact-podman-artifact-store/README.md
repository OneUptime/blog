# How to Add an Artifact to the Podman Artifact Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Artifact Store

Description: Learn how to add OCI artifacts to the Podman artifact store for local management and distribution of non-container content.

---

> OCI artifacts extend container registries beyond images, letting you store configuration files, binaries, documentation, and more alongside your container workloads.

Podman introduced support for OCI artifacts, allowing you to manage arbitrary content using the same tooling and registries you already use for container images. The Podman artifact store is a local repository where you can add, inspect, and manage artifacts before pushing them to a remote registry. In this post, we will walk through how to add artifacts to the Podman artifact store step by step.

---

## What Are OCI Artifacts?

OCI artifacts are any files or blobs stored in an OCI-compliant registry that are not container images. They follow the OCI image specification but use custom media types to represent different kinds of content. Examples include Helm charts, WebAssembly modules, security policies, and configuration files.

Podman provides the `podman artifact` subcommand family to work with these artifacts locally.

## Prerequisites

Before you begin, make sure you have Podman 5.x or later installed with artifact support enabled.

```bash
# Check your Podman version

podman --version

# Verify artifact subcommand is available
podman artifact --help
```

You should see output listing available artifact subcommands such as `add`, `inspect`, `ls`, `pull`, `push`, and `rm`.

## Adding a Single File as an Artifact

The simplest use case is adding a single file to the artifact store. You provide a name (in the form of a registry reference) and the file path.

```bash
# Create a sample configuration file
cat > app-config.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
data:
  log_level: "info"
  max_connections: "100"
  timeout: "30s"
EOF

# Add the file to the Podman artifact store
podman artifact add localhost/myorg/app-config:v1.0 app-config.yaml
```

The artifact is now stored locally under the reference `localhost/myorg/app-config:v1.0`. Artifacts added with `podman artifact add` remain in the local artifact store until you explicitly push them to a remote registry.

## Adding Multiple Files as a Single Artifact

You can bundle multiple files into a single artifact. This is useful for grouping related configuration or documentation together.

```bash
# Create multiple related files
echo "DB_HOST=postgres.internal" > db.env
echo "CACHE_HOST=redis.internal" > cache.env
echo "API_KEY=placeholder" > secrets.env

# Add all three files as one artifact
podman artifact add localhost/myorg/env-bundle:v1.0 db.env cache.env secrets.env
```

All three files are now stored together under a single artifact reference.

## Adding Files with a Custom File Media Type

OCI artifacts use media types to identify content. You can specify a custom media type for the file being added using the `--file-type` flag.

```bash
# Create a security policy file
cat > policy.rego <<EOF
package authz

default allow = false

allow {
    input.method == "GET"
    input.path == "/health"
}
EOF

# Add with a custom file media type
podman artifact add --file-type "application/vnd.rego.policy.v1+rego" \
  localhost/myorg/auth-policy:v1.0 policy.rego
```

Setting a meaningful media type helps consumers of the artifact understand what kind of content it contains without needing to inspect the bytes.

## Adding a Binary File

Artifacts are not limited to text files. You can add any binary content, such as compiled executables or archives.

```bash
# Create a sample tarball
mkdir -p release/bin
echo '#!/bin/bash' > release/bin/myapp
echo 'echo "Hello from myapp"' >> release/bin/myapp
chmod +x release/bin/myapp
tar -czf myapp-v2.0.tar.gz -C release .

# Add the tarball as an artifact
podman artifact add localhost/myorg/myapp-release:v2.0 myapp-v2.0.tar.gz
```

## Verifying the Artifact Was Added

After adding an artifact, you can verify it exists in the local store.

```bash
# List all artifacts in the local store
podman artifact ls

# Inspect the specific artifact for details
podman artifact inspect localhost/myorg/app-config:v1.0
```

The `ls` command shows all locally stored artifacts, and `inspect` gives you detailed metadata including the media type and digest.

## Organizing Artifacts with Tags

Like container images, artifacts support tags for versioning. Use a consistent tagging strategy to keep things organized.

```bash
# Add the same content with different version tags
podman artifact add localhost/myorg/app-config:v1.0 app-config.yaml
podman artifact add localhost/myorg/app-config:v1.1 app-config-updated.yaml
podman artifact add localhost/myorg/app-config:latest app-config-updated.yaml

# List all artifacts to see the tags
podman artifact ls
```

## Summary

Adding artifacts to the Podman artifact store is straightforward. You use `podman artifact add` with a reference name and one or more file paths. You can optionally set a custom file media type with the `--file-type` flag. Once added, artifacts live in your local store and can be inspected, listed, or pushed to a remote OCI registry. This workflow lets you manage configuration files, binaries, policies, and other non-container content using the same container tooling you already know.
