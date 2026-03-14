# How to Configure Flux Behind Service Mesh for mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Service Mesh, mTLS, Istio, Linkerd

Description: Deploy Flux controllers behind a service mesh to encrypt all inter-controller communication with mutual TLS and enforce identity-based authorization.

---

Flux controllers communicate over plaintext HTTP within the cluster by default. The source-controller serves artifacts on port 9090, the notification-controller receives events on port 9292, and all controllers talk to the Kubernetes API server. While in-cluster traffic is often considered safe, a compromised workload in the same network can eavesdrop on or tamper with this traffic. A service mesh adds mutual TLS (mTLS) between all Flux controllers, ensuring traffic is encrypted and both sides of every connection are authenticated using cryptographic identities.

This guide covers configuring Flux with both Istio and Linkerd service meshes to achieve mTLS for all inter-controller communication.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Flux installed in the flux-system namespace
- Either Istio or Linkerd installed in the cluster
- kubectl with cluster-admin access
- Familiarity with sidecar proxy injection

## Option A: Configuring Flux with Istio

### Step 1: Enable Sidecar Injection for flux-system

Label the flux-system namespace to enable automatic Istio sidecar injection:

```bash
kubectl label namespace flux-system istio-injection=enabled
```

Restart Flux controllers to inject the Envoy sidecar:

```bash
kubectl rollout restart deployment -n flux-system
```

Verify sidecars are injected:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

Each pod should now list two containers: the controller and `istio-proxy`.

### Step 2: Create a PeerAuthentication Policy

Enforce mTLS for all traffic in the flux-system namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: flux-mtls
  namespace: flux-system
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f flux-peer-auth.yaml
```

STRICT mode means only mTLS connections are accepted. Any plaintext connection to Flux controllers will be rejected.

### Step 3: Create Destination Rules

Tell Istio to use mTLS when connecting to Flux services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: source-controller
  namespace: flux-system
spec:
  host: source-controller.flux-system.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  host: notification-controller.flux-system.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: webhook-receiver
  namespace: flux-system
spec:
  host: webhook-receiver.flux-system.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

```bash
kubectl apply -f flux-destination-rules.yaml
```

### Step 4: Create Authorization Policies

Use Istio AuthorizationPolicy to restrict which service accounts can access each controller:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: source-controller-authz
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app: source-controller
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/flux-system/sa/kustomize-controller
              - cluster.local/ns/flux-system/sa/helm-controller
              - cluster.local/ns/flux-system/sa/notification-controller
      to:
        - operation:
            ports: ["9090"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: notification-controller-authz
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app: notification-controller
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/flux-system/sa/source-controller
              - cluster.local/ns/flux-system/sa/kustomize-controller
              - cluster.local/ns/flux-system/sa/helm-controller
      to:
        - operation:
            ports: ["9292"]
    # Allow webhook ingress from ingress controller
    - from:
        - source:
            namespaces:
              - ingress-nginx
      to:
        - operation:
            ports: ["9292"]
            methods: ["POST"]
            paths: ["/hook/*"]
```

```bash
kubectl apply -f flux-authz-policies.yaml
```

### Step 5: Handle External Egress Through Istio

Configure a ServiceEntry for external Git and registry endpoints so Istio allows outbound connections:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: github
  namespace: flux-system
spec:
  hosts:
    - github.com
    - api.github.com
  ports:
    - number: 443
      name: https
      protocol: TLS
    - number: 22
      name: ssh
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: container-registries
  namespace: flux-system
spec:
  hosts:
    - ghcr.io
    - registry-1.docker.io
    - auth.docker.io
    - production.cloudflare.docker.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

```bash
kubectl apply -f flux-service-entries.yaml
```

## Option B: Configuring Flux with Linkerd

### Step 1: Inject Linkerd Proxy into Flux Controllers

Annotate the flux-system namespace and restart controllers:

```bash
kubectl annotate namespace flux-system linkerd.io/inject=enabled
kubectl rollout restart deployment -n flux-system
```

Verify the proxy is injected:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

Each pod should have a `linkerd-proxy` container.

Check the mTLS status:

```bash
linkerd viz stat deployment -n flux-system
```

The output should show meshed connections with a percentage indicating mTLS coverage.

### Step 2: Create a Server Resource for Source Controller

Linkerd uses Server resources to define which ports accept meshed traffic:

```yaml
apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata:
  name: source-controller-artifacts
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  port: 9090
  proxyProtocol: HTTP/2
```

### Step 3: Create ServerAuthorization Policies

Restrict which identities can access the source-controller artifact server:

```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: source-controller-authz
  namespace: flux-system
spec:
  server:
    name: source-controller-artifacts
  client:
    meshTLS:
      serviceAccounts:
        - name: kustomize-controller
        - name: helm-controller
        - name: notification-controller
```

Create similar resources for the notification-controller:

```yaml
apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata:
  name: notification-controller-events
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  port: 9292
  proxyProtocol: HTTP/2
---
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: notification-controller-authz
  namespace: flux-system
spec:
  server:
    name: notification-controller-events
  client:
    meshTLS:
      serviceAccounts:
        - name: source-controller
        - name: kustomize-controller
        - name: helm-controller
```

```bash
kubectl apply -f linkerd-flux-policies.yaml
```

### Step 4: Verify mTLS with Linkerd

Check that all traffic between Flux controllers is encrypted:

```bash
linkerd viz tap deployment/kustomize-controller -n flux-system --to deployment/source-controller
```

The output should show `tls=true` for all connections.

View the authorization status:

```bash
linkerd viz authz deployment/source-controller -n flux-system
```

## Handling the Source Controller Startup Issue

The source-controller must fetch Git repositories at startup before the mesh proxy is fully initialized. If the proxy is not ready when the controller starts, Git clones may fail. Use a startup probe delay or init container to handle this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    metadata:
      annotations:
        # For Istio: hold the application start until proxy is ready
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
        # For Linkerd: wait for proxy
        config.linkerd.io/proxy-await: "enabled"
```

Patch the deployment:

```bash
# For Istio
kubectl patch deployment source-controller -n flux-system -p '{"spec":{"template":{"metadata":{"annotations":{"proxy.istio.io/config":"{\"holdApplicationUntilProxyStarts\": true}"}}}}}'

# For Linkerd
kubectl patch deployment source-controller -n flux-system -p '{"spec":{"template":{"metadata":{"annotations":{"config.linkerd.io/proxy-await":"enabled"}}}}}'
```

## Verification

Check that all Flux controllers are running with sidecars:

```bash
kubectl get pods -n flux-system
```

Every pod should show 2/2 containers ready.

Verify mTLS is active:

```bash
# Istio
istioctl proxy-status -n flux-system
istioctl authn tls-check source-controller.flux-system.svc.cluster.local

# Linkerd
linkerd viz stat deployment -n flux-system
```

Confirm Flux reconciliation works end to end:

```bash
flux reconcile source git flux-system
flux get sources git
flux get kustomizations -A
```

## Troubleshooting

**Flux controllers crash loop after sidecar injection**

The controller may be starting before the proxy is ready. Apply the startup delay annotations described in the startup issue section.

**Source controller cannot reach external Git repositories**

With Istio in STRICT mTLS mode, outbound connections to external services require ServiceEntry resources. Make sure you have ServiceEntry resources for all external endpoints.

With Linkerd, external traffic is not affected by default, but if you have a restrictive NetworkPolicy, ensure egress is allowed.

**Authorization policy blocks legitimate traffic**

Check the service account names used by each controller:

```bash
kubectl get serviceaccount -n flux-system
```

The principals in Istio AuthorizationPolicy must match the exact format: `cluster.local/ns/<namespace>/sa/<service-account-name>`.

**Metrics scraping fails after enabling mTLS**

Prometheus needs to scrape through the mesh proxy. For Istio, configure Prometheus to use mTLS:

```yaml
annotations:
  sidecar.istio.io/inject: "true"
  traffic.sidecar.istio.io/includeInboundPorts: ""
```

For Linkerd, Prometheus must be meshed or use the skip-inbound-ports annotation on the controllers:

```bash
kubectl annotate deployment -n flux-system --all config.linkerd.io/skip-inbound-ports="8080"
```

**Health checks fail after mesh injection**

Kubelet health probes come from outside the mesh. Configure probe rewriting:

For Istio (automatic by default), verify:

```bash
kubectl get deployment source-controller -n flux-system -o yaml | grep -A5 "rewriteAppHTTPProbers"
```

For Linkerd, the proxy automatically handles health probe pass-through for HTTP probes.
