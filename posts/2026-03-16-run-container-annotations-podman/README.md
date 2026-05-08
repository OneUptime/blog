# How to Run a Container with Annotations in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Annotation, Metadata

Description: Learn how to use annotations in Podman containers to attach structured metadata that follows OCI standards for tooling integration.

---

> Annotations provide OCI-standard metadata that travels with your containers and integrates with the broader container ecosystem.

Annotations are key-value metadata pairs that follow the OCI (Open Container Initiative) specification. While similar to labels, annotations are specifically designed for interoperability with OCI-compliant tools and registries. Podman supports annotations on both containers and images, making them useful for build pipelines, deployment tooling, and compliance tracking.

---

## Adding Annotations to a Container

Use the `--annotation` flag to attach annotations:

```bash
# Add a single annotation

podman run -d --name web \
  --annotation description="Main web server" \
  nginx:latest

# Add multiple annotations
podman run -d --name api-server \
  --annotation description="REST API server" \
  --annotation owner="platform-team" \
  --annotation created="2026-03-16" \
  --annotation environment="production" \
  alpine sleep 3600
```

## OCI-Standard Annotations

The OCI image specification defines standard annotation keys:

```bash
# Using OCI standard annotation keys
podman run -d --name oci-standard \
  --annotation org.opencontainers.image.title="My Application" \
  --annotation org.opencontainers.image.description="A REST API for user management" \
  --annotation org.opencontainers.image.version="2.1.0" \
  --annotation org.opencontainers.image.created="2026-03-16T00:00:00Z" \
  --annotation org.opencontainers.image.authors="ops@example.com" \
  --annotation org.opencontainers.image.url="https://example.com/app" \
  --annotation org.opencontainers.image.source="https://github.com/example/app" \
  --annotation org.opencontainers.image.revision="abc123def" \
  --annotation org.opencontainers.image.vendor="Example Corp" \
  --annotation org.opencontainers.image.licenses="Apache-2.0" \
  alpine sleep 3600
```

## Inspecting Container Annotations

```bash
# View all annotations on a container
podman inspect api-server --format '{{json .Config.Annotations}}' | python3 -m json.tool

# Get a specific annotation
podman inspect api-server --format '{{index .Config.Annotations "owner"}}'

# List running containers with annotations
for cid in $(podman ps -q); do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  annotations=$(podman inspect "$cid" --format '{{json .Config.Annotations}}')
  echo "$name: $annotations"
done
```

## Annotations vs Labels

Both annotations and labels are key-value metadata, but they serve different roles:

```bash
# Labels: used for container management, filtering, and selection
podman run -d --name with-labels \
  --label app=myservice \
  --label env=production \
  alpine sleep 3600

# Annotations: used for OCI-standard metadata and tooling integration
podman run -d --name with-annotations \
  --annotation org.opencontainers.image.title="My Service" \
  --annotation org.opencontainers.image.version="1.0" \
  alpine sleep 3600

# You can use both together
podman run -d --name with-both \
  --label app=myservice \
  --label env=production \
  --annotation org.opencontainers.image.title="My Service" \
  --annotation build.pipeline="ci-main-456" \
  alpine sleep 3600

# Labels support filtering; annotations are for metadata
podman ps --filter label=app=myservice
```

Key differences:
- Labels can be used with `--filter` in podman commands
- Annotations follow OCI specifications for cross-tool compatibility
- Podman exposes labels and annotations separately in inspect output

## Custom Annotation Namespaces

Use reverse-DNS notation for custom annotations to avoid conflicts:

```bash
# Custom annotations with namespace
podman run -d --name namespaced \
  --annotation com.mycompany.team="backend" \
  --annotation com.mycompany.cost-center="eng-42" \
  --annotation com.mycompany.compliance.pci="true" \
  --annotation com.mycompany.sla="99.9" \
  --annotation io.kubernetes.pod.name="api-pod" \
  alpine sleep 3600

# Read back the custom annotations
podman inspect namespaced --format '{{json .Config.Annotations}}' | python3 -m json.tool
```

## Annotations for Build Provenance

Track build information using annotations:

```bash
# Attach build provenance information
podman run -d --name build-tracked \
  --annotation build.number="1542" \
  --annotation build.pipeline="main-ci" \
  --annotation build.commit="a1b2c3d4e5f6" \
  --annotation build.branch="main" \
  --annotation build.timestamp="2026-03-16T10:30:00Z" \
  --annotation build.builder="jenkins" \
  alpine sleep 3600

# Query build information
podman inspect build-tracked --format '
  Build: {{index .Config.Annotations "build.number"}}
  Commit: {{index .Config.Annotations "build.commit"}}
  Branch: {{index .Config.Annotations "build.branch"}}
'
```

## Annotations on Containers in Pods

Podman pods support labels, and containers inside pods can have their own annotations:

```bash
# Create a pod with labels
podman pod create --name annotated-pod \
  --label app=myapp

# Add containers with their own annotations
podman run -d --pod annotated-pod --name pod-web \
  --annotation role="frontend" \
  nginx:latest

podman run -d --pod annotated-pod --name pod-api \
  --annotation role="backend" \
  alpine sleep 3600

# Inspect pod labels and container annotations
podman pod inspect annotated-pod --format '{{json .Labels}}' | python3 -m json.tool
podman inspect pod-web --format '{{json .Config.Annotations}}' | python3 -m json.tool

# Clean up
podman pod stop annotated-pod && podman pod rm annotated-pod
```

## Annotations for Compliance and Auditing

```bash
# Attach compliance-related metadata
podman run -d --name compliant-app \
  --annotation compliance.standard="SOC2" \
  --annotation compliance.data-classification="confidential" \
  --annotation compliance.reviewed-by="security-team" \
  --annotation compliance.review-date="2026-03-01" \
  --annotation compliance.encryption="AES-256" \
  alpine sleep 3600

# Audit script to find containers with compliance annotations
echo "Containers with compliance annotations:"
for cid in $(podman ps -q); do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  standard=$(podman inspect "$cid" --format '{{index .Config.Annotations "compliance.standard"}}' 2>/dev/null)
  if [ -n "$standard" ]; then
    echo "  $name: $standard"
  fi
done
```

## Summary

Annotations in Podman provide OCI-standard metadata for containers:

- Use `--annotation key=value` to attach metadata to containers
- Follow OCI standard annotation keys for interoperability
- Use reverse-DNS notation for custom annotation namespaces
- Annotations are ideal for build provenance, compliance tracking, and tooling integration
- Labels are better for filtering and container management; annotations are better for structured metadata
- Both can be used together on the same container

Annotations help bridge the gap between container runtime and the broader ecosystem of OCI-compliant tools.
