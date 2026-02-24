# How to Configure Egress for Package Registry Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Package Registry, Kubernetes, DevOps

Description: Configure Istio egress rules to allow your pods to access npm, PyPI, Maven, and other package registries while keeping outbound traffic controlled.

---

Build pipelines and application pods often need to pull packages from external registries like npm, PyPI, Maven Central, or Docker Hub. If you have locked down your Istio mesh with `REGISTRY_ONLY` outbound traffic policy, those package downloads will fail unless you explicitly allow them.

This guide covers how to configure egress access for the most common package registries. The pattern is the same for each: create a ServiceEntry for the registry endpoints, optionally route through an egress gateway, and verify connectivity.

## The Challenge with Package Registries

Package registries are tricky for egress configuration because:

- They often use multiple hostnames and subdomains
- CDN-backed registries resolve to different IPs depending on location
- Some registries redirect downloads to CDN endpoints, so you need to allow both the API hostname and the CDN hostname
- Large downloads can be slow, so timeouts need to be configured properly

## npm Registry

The npm registry uses `registry.npmjs.org` for the main API. When you run `npm install`, your tooling hits this endpoint to fetch package metadata and tarballs.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: npm-registry
  namespace: default
spec:
  hosts:
  - registry.npmjs.org
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

npm also sometimes serves packages from a CDN. If your downloads are failing even with the ServiceEntry above, check the logs for the actual hostname being requested and add it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: npm-cdn
  namespace: default
spec:
  hosts:
  - "*.npmjs.org"
  - "*.npmjs.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: NONE
```

Note the `resolution: NONE` for wildcard hosts. Istio cannot perform DNS resolution on wildcards, so it passes through the connection based on the SNI hostname.

## PyPI (Python Package Index)

Python packages come from `pypi.org` and downloads are served from `files.pythonhosted.org`:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: pypi-registry
  namespace: default
spec:
  hosts:
  - pypi.org
  - files.pythonhosted.org
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Test from a pod:

```bash
kubectl exec -it deploy/build-runner -- pip install --dry-run requests
```

## Maven Central and JCenter

Java builds pull dependencies from Maven Central. The primary endpoints are:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: maven-central
  namespace: default
spec:
  hosts:
  - repo1.maven.org
  - repo.maven.apache.org
  - central.maven.org
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

If your project uses Gradle, it might also need access to the Gradle plugin portal and other repositories:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gradle-repos
  namespace: default
spec:
  hosts:
  - plugins.gradle.org
  - services.gradle.org
  - downloads.gradle.org
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

## Docker Hub and Container Registries

Container image pulls are another common egress requirement. Docker Hub uses several domains:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: docker-hub
  namespace: default
spec:
  hosts:
  - registry-1.docker.io
  - auth.docker.io
  - production.cloudflare.docker.com
  - index.docker.io
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

For GitHub Container Registry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: ghcr
  namespace: default
spec:
  hosts:
  - ghcr.io
  - pkg-containers.githubusercontent.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

## Go Module Proxy

Go modules use the `proxy.golang.org` and `sum.golang.org` endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: go-module-proxy
  namespace: default
spec:
  hosts:
  - proxy.golang.org
  - sum.golang.org
  - storage.googleapis.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Note that `storage.googleapis.com` is included because the Go module proxy stores modules on Google Cloud Storage.

## Routing Registry Traffic Through an Egress Gateway

For additional control, route all package registry traffic through the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: registry-egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - registry.npmjs.org
    - pypi.org
    - files.pythonhosted.org
    - repo1.maven.org
    tls:
      mode: PASSTHROUGH
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: npm-through-egress
  namespace: default
spec:
  hosts:
  - registry.npmjs.org
  gateways:
  - mesh
  - registry-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - registry.npmjs.org
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - registry-egress-gateway
      port: 443
      sniHosts:
      - registry.npmjs.org
    route:
    - destination:
        host: registry.npmjs.org
        port:
          number: 443
      weight: 100
```

## Handling Timeout Issues

Package downloads can be large. The default Envoy timeout might cause downloads to fail for big packages. Adjust the timeout in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: npm-registry-timeout
  namespace: default
spec:
  host: registry.npmjs.org
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30s
      http:
        idleTimeout: 300s
```

## Restricting Registry Access to Build Namespaces

You probably do not want every namespace to access package registries. Restrict access to your CI/CD or build namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-build-namespace-egress
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["ci-cd", "build"]
```

## Private Package Registries

If you use a private registry like Artifactory, Nexus, or GitHub Packages, create a ServiceEntry for your private registry endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: private-artifactory
  namespace: default
spec:
  hosts:
  - artifacts.mycompany.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

This is cleaner than allowing public registries because your private registry is a single, controlled endpoint that already has its own access controls.

## Troubleshooting

If package installs are failing after enabling `REGISTRY_ONLY`:

1. Check the sidecar proxy logs on the pod running the install: `kubectl logs deploy/my-pod -c istio-proxy`
2. Look for `BlackHoleCluster` entries that indicate blocked traffic
3. The blocked log entries will show you the hostname being blocked, which tells you what ServiceEntry you need to add
4. Remember that some registries redirect to CDN endpoints, so you might need multiple ServiceEntries

Configuring egress for package registries requires knowing the exact endpoints each registry uses, but once set up, you get a clean allowlist of external dependencies and full visibility into what your build processes are downloading.
