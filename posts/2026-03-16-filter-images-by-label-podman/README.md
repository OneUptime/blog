# How to Filter Images by Label with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Labels

Description: Learn how to filter container images by their metadata labels using Podman, including filtering by label key, value, and combining label filters.

---

> Labels provide structured metadata for container images, and filtering by label helps you organize and manage images systematically.

Container image labels are key-value pairs embedded in the image metadata during the build process. They can describe the maintainer, version, description, licensing, and any custom metadata. Podman lets you filter your local image store by these labels, making it easy to find images that match specific criteria.

---

## Understanding Image Labels

Labels are set in a Containerfile using the `LABEL` instruction.

```bash
# Example Containerfile with labels

cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:3.19
LABEL maintainer="devteam@example.com"
LABEL version="1.0.0"
LABEL description="A sample application"
LABEL org.opencontainers.image.source="https://github.com/example/app"
LABEL environment="production"
CMD ["echo", "hello"]
EOF

# Build the image with labels
podman build -t myapp:1.0 .
```

## Viewing Labels on an Image

Before filtering, inspect what labels are available on your images.

```bash
# View all labels on an image
podman image inspect myapp:1.0 --format '{{json .Labels}}' | python3 -m json.tool

# View a specific label
podman image inspect myapp:1.0 --format '{{index .Labels "maintainer"}}'

# List labels for all local images
podman images --format "{{.Repository}}:{{.Tag}} -> {{.Labels}}"
```

## Filtering by Label Key

Find images that have a specific label defined, regardless of its value.

```bash
# Find images with a "maintainer" label
podman images --filter label=maintainer

# Find images with a version label
podman images --filter label=version

# Find images with OCI standard labels
podman images --filter label=org.opencontainers.image.source

# Find images with a custom label
podman images --filter label=environment
```

## Filtering by Label Key and Value

Narrow results to images where a label has a specific value.

```bash
# Find images maintained by a specific team
podman images --filter label=maintainer=devteam@example.com

# Find production images
podman images --filter label=environment=production

# Find images with a specific version
podman images --filter label=version=1.0.0

# Find images from a specific source repository
podman images --filter label=org.opencontainers.image.source=https://github.com/example/app
```

## Combining Multiple Label Filters

Use multiple `--filter` flags to match images with several label criteria.

```bash
# Find production images from a specific maintainer
podman images \
  --filter label=environment=production \
  --filter label=maintainer=devteam@example.com

# Find versioned images with a description
podman images \
  --filter label=version \
  --filter label=description

# Combine label and name filters
podman images \
  --filter label=environment=production \
  --filter reference='.*myapp.*'
```

## Formatting Label Filter Output

Customize the output when filtering by label.

```bash
# Show filtered images with their labels
podman images --filter label=environment \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Labels}}"

# Show only names and the specific label value
podman images --filter label=version \
  --format "{{.Repository}}:{{.Tag}} version={{index .Labels \"version\"}}"

# JSON output for programmatic processing
podman images --filter label=maintainer --format json | \
  python3 -c "
import sys, json
for img in json.load(sys.stdin):
    name = img.get('names', [img.get('id', '<unknown>')])[0]
    print(f\"{name} -> {img.get('labels', {})}\")
"

# Get just the IDs of labeled images
podman images --filter label=environment=production -q
```

## Using Labels for Image Management

Labels enable organized image lifecycle management.

```bash
#!/bin/bash
# Remove all images labeled as "development"
echo "Finding development images..."
DEV_IMAGES=$(podman images --filter label=environment=development -q)

if [ -z "$DEV_IMAGES" ]; then
  echo "No development images found."
  exit 0
fi

echo "Removing development images:"
podman images --filter label=environment=development \
  --format "  {{.Repository}}:{{.Tag}}"

echo "$DEV_IMAGES" | xargs podman rmi
echo "Done."
```

## Best Practices for Image Labels

Set consistent labels across your images to make filtering effective.

```bash
# Build with OCI-standard labels for interoperability
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:3.19

LABEL org.opencontainers.image.title="My Application"
LABEL org.opencontainers.image.description="A production-ready application"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.vendor="My Company"
LABEL org.opencontainers.image.source="https://github.com/mycompany/myapp"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.created="2026-03-16T00:00:00Z"

CMD ["echo", "running"]
EOF

podman build -t myapp:2.0 .

# Now you can filter using standard labels
podman images --filter label=org.opencontainers.image.vendor="My Company"
```

## Auditing Images by Label

Generate reports based on image labels.

```bash
#!/bin/bash
# Audit all images and their labels
echo "=== Image Label Audit ==="
echo ""

podman images --format "{{.Repository}}:{{.Tag}}" | while read -r IMAGE; do
  LABELS=$(podman image inspect "$IMAGE" --format '{{json .Labels}}' 2>/dev/null)
  if [ "$LABELS" != "null" ] && [ "$LABELS" != "{}" ]; then
    echo "Image: $IMAGE"
    echo "Labels: $LABELS" | python3 -m json.tool 2>/dev/null
    echo "---"
  fi
done
```

## Summary

Filtering images by label with Podman provides a structured approach to image management. Use labels consistently across your image builds, follow OCI standard label conventions, and leverage Podman's label filters for querying, cleanup, and auditing. Labels transform your image store from a flat list into an organized, searchable inventory.
