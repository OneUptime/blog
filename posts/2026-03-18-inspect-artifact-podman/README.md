# How to Inspect an Artifact in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Inspection

Description: Learn how to inspect OCI artifacts in Podman to view metadata, media types, digests, and layer details.

---

> Inspecting an artifact reveals its full metadata, including content digests, media types, and layer structure, giving you confidence in what you are distributing.

When working with OCI artifacts in Podman, you often need to examine their contents and metadata before pushing them to a registry or using them in a pipeline. The `podman artifact inspect` command provides detailed information about any artifact in your local store. This post covers how to use it effectively.

---

## Prerequisites

Ensure Podman 5.4 or later is installed with artifact support.

```bash
# Verify Podman is available

podman --version

# Check the inspect subcommand
podman artifact inspect --help
```

## Setting Up a Sample Artifact

Let us create and add an artifact so we have something to inspect.

```bash
# Create a sample configuration file
cat > nginx.conf <<EOF
worker_processes auto;
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        location / {
            root /usr/share/nginx/html;
        }
    }
}
EOF

# Add it to the local artifact store
podman artifact add localhost/myorg/nginx-config:v1.0 nginx.conf
```

## Basic Artifact Inspection

Run the inspect command with the full artifact reference.

```bash
# Inspect the artifact
podman artifact inspect localhost/myorg/nginx-config:v1.0
```

This outputs a JSON document containing the artifact manifest, artifact name, and manifest digest. The manifest includes the media type, config descriptor, and layers.

## Understanding the Inspect Output

The JSON output from inspect typically contains these key fields:

- **Manifest.mediaType** - The OCI media type of the manifest
- **Manifest.config** - The configuration descriptor with its own media type, digest, and size
- **Manifest.layers** - An array of layer descriptors, each representing a file added to the artifact
- **Digest** - The digest of the artifact manifest

```bash
# Pretty-print the inspect output for readability
podman artifact inspect localhost/myorg/nginx-config:v1.0 | python3 -m json.tool
```

The output resembles the following structure:

```json
{
    "Manifest": {
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.manifest.v1+json",
        "config": {
            "mediaType": "application/vnd.oci.empty.v1+json",
            "digest": "sha256:...",
            "size": 2
        },
        "layers": [
            {
                "mediaType": "application/octet-stream",
                "digest": "sha256:...",
                "size": 195,
                "annotations": {
                    "org.opencontainers.image.title": "nginx.conf"
                }
            }
        ]
    },
    "Name": "localhost/myorg/nginx-config:v1.0",
    "Digest": "sha256:..."
}
```

## Inspecting Multi-File Artifacts

When an artifact contains multiple files, each file appears as a separate layer.

```bash
# Create multiple files
echo "upstream backend { server 10.0.0.1:8080; }" > upstream.conf
echo "ssl_certificate /etc/ssl/cert.pem;" > ssl.conf

# Add as a single artifact
podman artifact add localhost/myorg/nginx-extras:v1.0 upstream.conf ssl.conf

# Inspect to see both layers
podman artifact inspect localhost/myorg/nginx-extras:v1.0 | python3 -m json.tool
```

You will see two entries in the `Manifest.layers` array, one for each file. The `org.opencontainers.image.title` annotation on each layer identifies the original filename.

## Extracting Specific Fields

Use `jq` to extract specific fields from the inspect output for scripting or automation.

```bash
# Get just the digest of the artifact manifest
podman artifact inspect localhost/myorg/nginx-config:v1.0 | jq -r '.Digest'

# Get the digest of the first layer
podman artifact inspect localhost/myorg/nginx-config:v1.0 | jq -r '.Manifest.layers[0].digest'

# Get the media type
podman artifact inspect localhost/myorg/nginx-config:v1.0 | jq -r '.Manifest.mediaType'

# List all layer filenames
podman artifact inspect localhost/myorg/nginx-extras:v1.0 | jq -r '.Manifest.layers[].annotations["org.opencontainers.image.title"]'

# Get total size of all layers
podman artifact inspect localhost/myorg/nginx-extras:v1.0 | jq '[.Manifest.layers[].size] | add'
```

## Verifying Artifact Integrity

The layer digest field is a SHA256 hash of the layer content. You can use it to verify integrity.

```bash
# Get the expected digest from the artifact
EXPECTED=$(podman artifact inspect localhost/myorg/nginx-config:v1.0 | jq -r '.Manifest.layers[0].digest')

# Compute the actual digest of the original file
ACTUAL="sha256:$(sha256sum nginx.conf | awk '{print $1}')"

# Compare them
if [ "$EXPECTED" = "$ACTUAL" ]; then
    echo "Integrity check passed"
else
    echo "Integrity check failed"
fi
```

## Inspecting Artifacts in Automation

In CI/CD pipelines, inspecting artifacts helps validate them before deployment.

```bash
#!/bin/bash
# Validate that an artifact has the expected number of layers

ARTIFACT="localhost/myorg/nginx-extras:v1.0"
EXPECTED_LAYERS=2

# Count the actual layers
ACTUAL_LAYERS=$(podman artifact inspect "$ARTIFACT" | jq '.Manifest.layers | length')

if [ "$ACTUAL_LAYERS" -eq "$EXPECTED_LAYERS" ]; then
    echo "Artifact $ARTIFACT has the expected $EXPECTED_LAYERS layers"
    exit 0
else
    echo "ERROR: Expected $EXPECTED_LAYERS layers but found $ACTUAL_LAYERS"
    exit 1
fi
```

## Summary

The `podman artifact inspect` command outputs detailed JSON metadata about any OCI artifact in your local store. It shows the artifact name, manifest digest, manifest media type, configuration descriptor, and all layers with their digests, sizes, and filename annotations. You can pipe the output through `jq` or `python3 -m json.tool` for readability and field extraction. This command is essential for verifying artifact content, checking integrity, and building automation around artifact workflows.
