# How to Expose ArgoCD with Ambassador/Emissary Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Emissary-ingress, Networking

Description: Learn how to expose ArgoCD through Ambassador/Emissary-Ingress with proper gRPC routing, TLS termination, and authentication filters.

---

Emissary-Ingress (formerly Ambassador API Gateway) is a Kubernetes-native API gateway built on Envoy Proxy. It excels at handling gRPC traffic, making it a solid choice for exposing ArgoCD, which relies heavily on gRPC for CLI communication. This guide covers setting up Emissary-Ingress to serve the ArgoCD UI and API with proper TLS and routing.

## Why Emissary-Ingress for ArgoCD

Emissary-Ingress is built on Envoy Proxy and has first-class support for gRPC, HTTP/2, and WebSockets. Since ArgoCD uses gRPC for its CLI communication and HTTP for the web UI, Emissary handles both protocols natively without the workarounds that some other ingress controllers require.

Key advantages:

- Native gRPC support through Envoy
- Mapping CRD for declarative routing configuration
- Built-in rate limiting and authentication filters
- Automatic TLS with ACME support
- Canary routing capabilities

## Prerequisites

- A Kubernetes cluster with ArgoCD installed
- Emissary-Ingress deployed on the cluster
- A DNS record for your ArgoCD hostname

Install Emissary-Ingress if needed:

```bash
# Install Emissary-Ingress CRDs
kubectl apply -f https://app.getambassador.io/yaml/emissary/3.9.1/emissary-crds.yaml

# Install Emissary-Ingress with Helm
helm repo add datawire https://app.getambassador.io
helm repo update
helm install emissary-ingress datawire/emissary-ingress \
  --namespace emissary \
  --create-namespace
```

## Configuring ArgoCD Backend

Set ArgoCD server to insecure mode so Emissary handles TLS termination:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Creating Mappings for ArgoCD

Emissary uses Mapping resources to define routing rules. You need two mappings: one for the web UI (HTTP) and one for CLI access (gRPC).

```yaml
# Mapping for ArgoCD Web UI
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: argocd-server-ui
  namespace: argocd
spec:
  hostname: argocd.example.com
  prefix: /
  service: argocd-server.argocd:80
  # Timeout for long-running operations
  timeout_ms: 300000
---
# Mapping for ArgoCD gRPC (CLI)
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: argocd-server-grpc
  namespace: argocd
spec:
  hostname: argocd.example.com
  prefix: /
  service: argocd-server.argocd:80
  # Enable gRPC protocol
  grpc: true
  # Match on gRPC content-type header
  headers:
    Content-Type: "application/grpc"
  timeout_ms: 300000
```

The key difference is the `grpc: true` flag on the second mapping. Emissary uses the `Content-Type` header to distinguish between regular HTTP and gRPC requests, routing each to the appropriate backend configuration.

## TLS Configuration

Create a Host resource to handle TLS:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: argocd-host
  namespace: argocd
spec:
  hostname: argocd.example.com
  # Automatic TLS with ACME (Let's Encrypt)
  acmeProvider:
    email: admin@example.com
  tlsSecret:
    name: argocd-tls-secret
  # Request policy - redirect HTTP to HTTPS
  requestPolicy:
    insecure:
      action: Redirect
```

If you have an existing TLS certificate, create the secret manually:

```bash
kubectl create secret tls argocd-tls-secret \
  --namespace argocd \
  --cert=tls.crt \
  --key=tls.key
```

## Adding Authentication Filters

Emissary supports authentication filters that can add an extra layer before ArgoCD. This is useful for adding external authentication:

```yaml
# External authentication filter
apiVersion: getambassador.io/v3alpha1
kind: AuthService
metadata:
  name: argocd-auth
  namespace: argocd
spec:
  auth_service: "auth-service.auth:3000"
  proto: http
  path_prefix: "/extauth"
  allowed_request_headers:
    - "Authorization"
    - "Cookie"
  allowed_authorization_headers:
    - "X-Auth-User"
```

## Rate Limiting

Add rate limiting to protect your ArgoCD API:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: RateLimitService
metadata:
  name: argocd-ratelimit
  namespace: argocd
spec:
  service: ratelimit.ratelimit:8081
  protocol_version: v3
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: argocd-server-ui
  namespace: argocd
spec:
  hostname: argocd.example.com
  prefix: /
  service: argocd-server.argocd:80
  labels:
    ambassador:
      - request_label_group:
          - argocd_api_limit:
              header: ":authority"
              default: "argocd"
```

## Using TLS Passthrough

If you prefer to let ArgoCD handle its own TLS, configure TLS passthrough with a TCPMapping:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: argocd-host
  namespace: argocd
spec:
  hostname: argocd.example.com
  # Do not redirect - pass through
  requestPolicy:
    insecure:
      action: Route
  tlsSecret:
    name: argocd-tls-passthrough
---
apiVersion: getambassador.io/v3alpha1
kind: TCPMapping
metadata:
  name: argocd-server-tcp
  namespace: argocd
spec:
  port: 443
  service: argocd-server.argocd:443
  host: argocd.example.com
```

## Verifying the Setup

```bash
# Check Emissary Mapping resources
kubectl get mappings -n argocd

# Check Host resources
kubectl get hosts -n argocd

# View Emissary diagnostics
kubectl port-forward -n emissary svc/emissary-ingress-admin 8877:8877
# Then visit http://localhost:8877/ambassador/v0/diag/

# Test the UI
curl -I https://argocd.example.com

# Test CLI login
argocd login argocd.example.com --grpc-web
```

## Troubleshooting

**503 Service Unavailable**: Check that the ArgoCD server service name and port match what is in the Mapping. Emissary resolves services using `service-name.namespace:port` format.

**gRPC Failures**: Verify the `grpc: true` flag is set and the Content-Type header matching is correct. Check Emissary logs:

```bash
kubectl logs -n emissary -l app.kubernetes.io/name=emissary-ingress
```

**TLS Certificate Not Working**: If using ACME, make sure port 80 is accessible for the HTTP-01 challenge. Check the Host resource status:

```bash
kubectl describe host argocd-host -n argocd
```

**Timeout Errors**: ArgoCD sync operations can be long-running. Increase the `timeout_ms` value in the Mapping if you see timeouts during large deployments.

For other ingress options, see our guides on [exposing ArgoCD with Nginx Ingress](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) and [using Traefik with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-traefik-ingress/view).
