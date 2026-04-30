# How to Configure Helm Repositories over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Helm, Kubernetes, Chart Repository, OCI, Package Management

Description: Configure Helm to pull charts from repositories hosted on IPv6 servers, including HTTPS chart repositories, OCI registries with IPv6 addresses, and authentication for private IPv6 Helm repos.

## Introduction

Helm fetches chart packages from HTTP/HTTPS repositories and OCI registries. When chart repositories are hosted on IPv6-addressed servers, Helm connects via IPv6 using bracket notation for literal IPv6 addresses in URLs. Authentication, TLS verification, and OCI registry access all work identically to IPv4, with the URL or registry host being the only IPv6-specific element.

## Add a Helm Repository with IPv6 Address

```bash
# Add an HTTP Helm repository over IPv6

helm repo add myrepo "http://[2001:db8::10]:8080/charts"

# Add an HTTPS Helm repository over IPv6
helm repo add myrepo "https://[2001:db8::10]:443/charts"

# Add with authentication
helm repo add private-repo "https://[2001:db8::10]:443/charts" \
    --username myuser \
    --password mypassword

# Add with custom CA certificate (for self-signed certs on IPv6 servers)
helm repo add secure-repo "https://[2001:db8::10]:443/charts" \
    --ca-file /etc/ssl/certs/internal-ca.crt

# Skip TLS verification (testing only)
helm repo add insecure-repo "https://[2001:db8::10]:443/charts" \
    --insecure-skip-tls-verify

# Update all repos
helm repo update

# List repos
helm repo list
# Shows the IPv6 URL
```

## Host a Helm Repository on IPv6 (ChartMuseum)

```bash
# Start ChartMuseum listening on IPv6
chartmuseum \
    --port 8080 \
    --storage local \
    --storage-local-rootdir /var/chartmuseum \
    --listen-host "[::]"    # Listen on all IPv6 interfaces

# Or bind to specific IPv6 address
chartmuseum \
    --port 8080 \
    --storage local \
    --storage-local-rootdir /var/chartmuseum \
    --listen-host "[2001:db8::10]"

# Install the ChartMuseum push plugin
helm plugin install https://github.com/chartmuseum/helm-push

# Push a chart to ChartMuseum over IPv6 using the helm cm-push plugin
helm cm-push mychart-1.0.0.tgz "http://[2001:db8::10]:8080"
# Or package and push from a chart directory:
helm cm-push mychart/ "http://[2001:db8::10]:8080"
```

## OCI Registry Helm Charts over IPv6

```bash
# Log in to an OCI registry over IPv6
helm registry login "[2001:db8::20]:5000" \
    --username user \
    --password password

# For a plain-HTTP registry, add --plain-http to registry operations.

# Push a chart to OCI registry over IPv6
helm push mychart-1.0.0.tgz "oci://[2001:db8::20]:5000/charts"

# Pull a chart from OCI registry over IPv6
helm pull "oci://[2001:db8::20]:5000/charts/mychart" --version 1.0.0

# Install from OCI registry over IPv6
helm install myrelease "oci://[2001:db8::20]:5000/charts/mychart" \
    --version 1.0.0

# Show chart metadata from OCI registry over IPv6
helm show chart "oci://[2001:db8::20]:5000/charts/mychart" --version 1.0.0
```

## Helm with Harbor Registry over IPv6

```bash
# Harbor OCI registry over IPv6
helm registry login "[2001:db8::30]:443" \
    --username admin \
    --password harborpassword

helm install myapp "oci://[2001:db8::30]:443/myproject/mychart" \
    --version 2.1.0
```

## Chartmuseum Docker Deployment on IPv6

```yaml
# docker-compose.yml for ChartMuseum with IPv6
# Requires Docker IPv6 support.

services:
  chartmuseum:
    image: chartmuseum/chartmuseum:latest
    ports:
      - "[::]:8080:8080"    # Expose on all IPv6 interfaces
    volumes:
      - chartmuseum-data:/charts
    environment:
      STORAGE: local
      STORAGE_LOCAL_ROOTDIR: /charts
      PORT: "8080"
      LISTEN_HOST: "[::]"   # Listen on all IPv6 interfaces
    networks:
      - chartmuseum-net

volumes:
  chartmuseum-data:

networks:
  chartmuseum-net:
    enable_ipv6: true
```

## Kubernetes Helm with IPv6 Service

```yaml
# chartmuseum-service.yaml - Dual-stack service

apiVersion: v1
kind: Service
metadata:
  name: chartmuseum
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv6
    - IPv4
  selector:
    app: chartmuseum
  ports:
    - port: 8080
      targetPort: 8080
```

```bash
# Access chartmuseum from within the cluster using Service DNS
NAMESPACE=default
helm repo add internal "http://chartmuseum.${NAMESPACE}.svc.cluster.local:8080"

# Or via the primary IPv6 Service address
CHART_SVC_IP=$(kubectl get svc chartmuseum -o jsonpath='{.spec.clusterIPs[0]}')
helm repo add internal "http://[$CHART_SVC_IP]:8080"
```

## ~/.config/helm/repositories.yaml with IPv6

```yaml
# ~/.config/helm/repositories.yaml (or %APPDATA%/helm/repositories.yaml)
# Helm stores repo configs here

apiVersion: v1
generated: "2024-01-01T00:00:00.000000000Z"
repositories:
  - caFile: ""
    certFile: ""
    insecure_skip_tls_verify: false
    keyFile: ""
    name: myrepo
    pass_credentials_all: false
    password: ""
    url: https://[2001:db8::10]:443/charts
    username: ""
```

## Verify Helm IPv6 Repo Access

```bash
# Test repository connectivity
helm repo update myrepo

# Search for charts in the IPv6 repo
helm search repo myrepo/

# Fetch chart info without installing
helm show chart myrepo/mychart

# Check proxy settings (may affect IPv6 and NO_PROXY behavior)
env | grep -iE '^(http|https|no)_proxy='

# Debug connection issues
helm repo add myrepo "https://[2001:db8::10]:443/charts" \
    --debug 2>&1 | head -30
```

## Conclusion

Helm connects to chart repositories and OCI registries over IPv6 using bracket notation for IPv6 literal addresses in URLs (e.g., `https://[2001:db8::10]:443/charts`). Standard Helm repo and OCI operations accept IPv6 addresses; flags such as `--ca-file`, `--insecure-skip-tls-verify`, or `--plain-http` depend on your TLS configuration, not on IPv6 itself. ChartMuseum binds to IPv6 with `--listen-host "[::]"`, and uploads to ChartMuseum use the `helm cm-push` plugin while Helm's built-in `helm push` is for OCI registries. When you connect to a Helm repo or registry by literal IPv6 address, the certificate must include that IP address as an `iPAddress` Subject Alternative Name. Provide the CA certificate via `--ca-file` when using self-signed certificates on IPv6 endpoints.
