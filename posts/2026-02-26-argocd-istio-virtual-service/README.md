# How to Expose ArgoCD with Istio Virtual Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Istio, Service Mesh

Description: Learn how to expose ArgoCD through Istio Virtual Service and Gateway with mTLS, traffic management, and service mesh integration for production clusters.

---

If your Kubernetes cluster runs Istio service mesh, you can expose ArgoCD through Istio's Gateway and VirtualService resources instead of using a traditional ingress controller. This approach gives you mTLS between services, fine-grained traffic management, and integration with Istio's observability stack. This guide covers the complete setup.

## Why Istio for ArgoCD

When you already have Istio running in your cluster, using it for ArgoCD ingress makes sense because:

- You get mTLS encryption between the gateway and ArgoCD automatically
- Istio's telemetry gives you request-level metrics for ArgoCD traffic
- You can apply Istio authorization policies for fine-grained access control
- Traffic management features like fault injection and circuit breaking are available
- You avoid deploying another ingress controller

The trade-off is complexity. Istio adds overhead, and debugging routing issues requires understanding both Istio and ArgoCD configurations.

## Prerequisites

- A Kubernetes cluster with Istio installed
- ArgoCD installed in the cluster
- Istio ingress gateway deployed with an external IP

## Configuring ArgoCD for Istio

First, decide whether to include ArgoCD in the Istio mesh. If you want mTLS and telemetry, label the ArgoCD namespace for sidecar injection:

```bash
# Enable Istio sidecar injection for ArgoCD namespace
kubectl label namespace argocd istio-injection=enabled

# Restart ArgoCD pods to get sidecars injected
kubectl rollout restart deployment -n argocd
```

Set ArgoCD to insecure mode since Istio will handle TLS at the gateway:

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

## Creating the Istio Gateway

Create a Gateway resource that listens for HTTPS traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: argocd-gateway
  namespace: argocd
spec:
  selector:
    # Use the default Istio ingress gateway
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: argocd-server-tls
      hosts:
        - argocd.example.com
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - argocd.example.com
      tls:
        httpsRedirect: true
```

Create the TLS secret in the `istio-system` namespace (where the ingress gateway runs):

```bash
kubectl create secret tls argocd-server-tls \
  --namespace istio-system \
  --cert=tls.crt \
  --key=tls.key
```

## Creating the Virtual Service

Create a VirtualService to route traffic to ArgoCD:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: argocd-server
  namespace: argocd
spec:
  hosts:
    - argocd.example.com
  gateways:
    - argocd-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: argocd-server
            port:
              number: 80
      timeout: 300s
      retries:
        attempts: 3
        perTryTimeout: 120s
```

## Handling gRPC Traffic

ArgoCD CLI uses gRPC. Istio handles gRPC natively since it is built on Envoy. The VirtualService above already routes gRPC because both HTTP and gRPC use the same port on ArgoCD when running in insecure mode.

If you need separate routing for gRPC, you can match on headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: argocd-server
  namespace: argocd
spec:
  hosts:
    - argocd.example.com
  gateways:
    - argocd-gateway
  http:
    # gRPC route (higher priority)
    - match:
        - headers:
            content-type:
              prefix: application/grpc
      route:
        - destination:
            host: argocd-server
            port:
              number: 80
      timeout: 600s
    # HTTP route for the web UI
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: argocd-server
            port:
              number: 80
      timeout: 300s
```

## TLS Passthrough

If you want ArgoCD to handle its own TLS (no insecure mode), configure TLS passthrough at the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: argocd-gateway
  namespace: argocd
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - argocd.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: argocd-server
  namespace: argocd
spec:
  hosts:
    - argocd.example.com
  gateways:
    - argocd-gateway
  tls:
    - match:
        - port: 443
          sniHosts:
            - argocd.example.com
      route:
        - destination:
            host: argocd-server
            port:
              number: 443
```

## Authorization Policies

Add Istio authorization policies to control who can access ArgoCD:

```yaml
# Allow traffic only from specific namespaces
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: argocd-allow-ingress
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  action: ALLOW
  rules:
    - from:
        - source:
            # Allow traffic from the Istio ingress gateway
            namespaces: ["istio-system"]
    - from:
        - source:
            # Allow traffic from within the argocd namespace
            namespaces: ["argocd"]
```

For IP-based restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: argocd-ip-whitelist
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            ipBlocks: ["10.0.0.0/8", "172.16.0.0/12"]
      to:
        - operation:
            hosts: ["argocd.example.com"]
```

## Destination Rules

Configure how traffic reaches ArgoCD with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: argocd-server
  namespace: argocd
spec:
  host: argocd-server
  trafficPolicy:
    tls:
      # Use Istio mTLS for service-to-service communication
      mode: ISTIO_MUTUAL
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 0
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

## Verifying the Setup

```bash
# Check Gateway resource
kubectl get gateway -n argocd

# Check VirtualService
kubectl get virtualservice -n argocd

# Check that Istio ingress gateway has an external IP
kubectl get svc -n istio-system istio-ingressgateway

# Test with istioctl
istioctl analyze -n argocd

# Test the proxy configuration
istioctl proxy-config routes -n istio-system deploy/istio-ingressgateway

# Test access
curl -I https://argocd.example.com

# Test CLI
argocd login argocd.example.com --grpc-web
```

## Troubleshooting

**404 Not Found**: Verify the Gateway and VirtualService are in the correct namespace and the host matches your DNS.

**Connection Refused**: Check that the Istio ingress gateway pod is running and has an external IP.

**mTLS Errors**: If ArgoCD pods have sidecars but services cannot communicate, check the PeerAuthentication policy:

```bash
kubectl get peerauthentication -n argocd
istioctl x describe pod <argocd-server-pod> -n argocd
```

**Sidecar Issues with ArgoCD Components**: Some ArgoCD components (like the repo server) may have issues with Istio sidecars. Exclude them if needed:

```yaml
metadata:
  annotations:
    sidecar.istio.io/inject: "false"
```

For more on ArgoCD with service meshes, check out [configuring ArgoCD with Linkerd](https://oneuptime.com/blog/post/2026-02-26-argocd-service-mesh/view) and [Integrating Istio with Argo CD for GitOps](https://oneuptime.com/blog/post/2026-02-24-integrate-istio-with-argo-cd-for-gitops/view).
