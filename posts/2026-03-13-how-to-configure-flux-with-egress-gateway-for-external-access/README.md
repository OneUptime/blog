# How to Configure Flux with Egress Gateway for External Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Egress, Egress Gateway, Istio, Service Mesh

Description: Route all Flux external traffic through an egress gateway for centralized monitoring, auditing, and control of outbound connections to Git and container registries.

---

In many enterprise environments, outbound traffic from Kubernetes clusters must pass through a controlled exit point for auditing, compliance, and security. An egress gateway provides this control by acting as a single point through which all external traffic flows. Instead of allowing each Flux controller to connect directly to external services like GitHub or Docker Hub, you route their traffic through an egress gateway where it can be logged, filtered, and monitored.

This guide covers configuring Flux to use an Istio egress gateway for all external access, including Git repository cloning, container registry pulls, and notification webhook deliveries.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Istio installed with the egress gateway component enabled
- Flux installed in the flux-system namespace with Istio sidecars injected
- kubectl and istioctl configured
- Istio configured with `meshConfig.outboundTrafficPolicy.mode: REGISTRY_ONLY` to block direct external access

Verify the egress gateway is running:

```bash
kubectl get pods -n istio-system -l istio=egressgateway
```

Verify Istio is configured to block unmeshed external traffic:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy -A2
```

The output should show `mode: REGISTRY_ONLY`. If it shows `ALLOW_ANY`, update it:

```bash
istioctl install --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY
```

Confirm Flux controllers have Istio sidecars:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{" containers: "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

## Step 1: Create ServiceEntry Resources for External Endpoints

Define the external services Flux needs to reach. Without these, the REGISTRY_ONLY policy blocks all external connections:

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
      name: tls
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
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: notification-endpoints
  namespace: flux-system
spec:
  hosts:
    - hooks.slack.com
    - events.pagerduty.com
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

```bash
kubectl apply -f flux-service-entries.yaml
```

## Step 2: Create a Gateway Resource for Egress Traffic

Define an Istio Gateway on the egress gateway for each external host:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: flux-egress-gateway
  namespace: flux-system
spec:
  selector:
    istio: egressgateway
  servers:
    - port:
        number: 443
        name: tls-github
        protocol: TLS
      hosts:
        - github.com
        - api.github.com
      tls:
        mode: PASSTHROUGH
    - port:
        number: 443
        name: tls-registries
        protocol: TLS
      hosts:
        - ghcr.io
        - registry-1.docker.io
        - auth.docker.io
        - production.cloudflare.docker.com
      tls:
        mode: PASSTHROUGH
    - port:
        number: 443
        name: tls-notifications
        protocol: TLS
      hosts:
        - hooks.slack.com
        - events.pagerduty.com
      tls:
        mode: PASSTHROUGH
```

```bash
kubectl apply -f flux-egress-gateway.yaml
```

The `PASSTHROUGH` mode means the egress gateway does not terminate TLS. It routes traffic based on the SNI header while keeping the end-to-end encryption intact.

## Step 3: Create VirtualService Resources to Route Through the Gateway

Route traffic from Flux pods to the egress gateway, then from the egress gateway to the external destination:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: github-via-egress
  namespace: flux-system
spec:
  hosts:
    - github.com
    - api.github.com
  gateways:
    - flux-egress-gateway
    - mesh
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - github.com
            - api.github.com
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443
    - match:
        - gateways:
            - flux-egress-gateway
          port: 443
          sniHosts:
            - github.com
            - api.github.com
      route:
        - destination:
            host: github.com
            port:
              number: 443
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ghcr-via-egress
  namespace: flux-system
spec:
  hosts:
    - ghcr.io
  gateways:
    - flux-egress-gateway
    - mesh
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - ghcr.io
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443
    - match:
        - gateways:
            - flux-egress-gateway
          port: 443
          sniHosts:
            - ghcr.io
      route:
        - destination:
            host: ghcr.io
            port:
              number: 443
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: dockerhub-via-egress
  namespace: flux-system
spec:
  hosts:
    - registry-1.docker.io
    - auth.docker.io
    - production.cloudflare.docker.com
  gateways:
    - flux-egress-gateway
    - mesh
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - registry-1.docker.io
            - auth.docker.io
            - production.cloudflare.docker.com
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443
    - match:
        - gateways:
            - flux-egress-gateway
          port: 443
          sniHosts:
            - registry-1.docker.io
            - auth.docker.io
            - production.cloudflare.docker.com
      route:
        - destination:
            host: registry-1.docker.io
            port:
              number: 443
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slack-via-egress
  namespace: flux-system
spec:
  hosts:
    - hooks.slack.com
  gateways:
    - flux-egress-gateway
    - mesh
  tls:
    - match:
        - gateways:
            - mesh
          port: 443
          sniHosts:
            - hooks.slack.com
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443
    - match:
        - gateways:
            - flux-egress-gateway
          port: 443
          sniHosts:
            - hooks.slack.com
      route:
        - destination:
            host: hooks.slack.com
            port:
              number: 443
```

```bash
kubectl apply -f flux-virtual-services.yaml
```

## Step 4: Add Network Policies to Enforce Gateway Routing

Use NetworkPolicies to ensure Flux pods can only reach the egress gateway, not external IPs directly:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: flux-egress-via-gateway-only
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow Kubernetes API server
    - to:
        - ipBlock:
            cidr: 10.0.0.1/32
      ports:
        - protocol: TCP
          port: 443
    # Allow egress gateway
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
          podSelector:
            matchLabels:
              istio: egressgateway
      ports:
        - protocol: TCP
          port: 443
    # Allow inter-controller communication
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 9292
        - protocol: TCP
          port: 8080
```

Update the API server IP to match your cluster and apply:

```bash
kubectl apply -f flux-netpol-egress-gateway.yaml
```

## Step 5: Configure Egress Gateway Access Logging

Enable access logging on the egress gateway to audit all Flux external traffic:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: egress-access-log
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  accessLogging:
    - providers:
        - name: envoy
```

```bash
kubectl apply -f egress-access-log.yaml
```

View the access logs:

```bash
kubectl logs -n istio-system -l istio=egressgateway --tail=30
```

Each log entry shows the source pod, destination host, response code, and bytes transferred.

## Verification

Trigger a Flux reconciliation and verify it passes through the egress gateway:

```bash
flux reconcile source git flux-system
```

Watch the egress gateway logs in real time:

```bash
kubectl logs -n istio-system -l istio=egressgateway -f
```

You should see log entries for connections to github.com, ghcr.io, and other configured hosts.

Verify Flux reconciliation succeeds:

```bash
flux get sources git
flux get kustomizations -A
```

Check that direct external access is blocked:

```bash
kubectl run test-direct -n flux-system --rm -it --image=busybox --annotations="sidecar.istio.io/inject=true" -- wget -qO- --timeout=5 https://example.com
```

This should fail because example.com has no ServiceEntry.

## Troubleshooting

**Flux cannot reach external services after enabling REGISTRY_ONLY**

Every external host must have a ServiceEntry. Check which hosts are missing:

```bash
istioctl proxy-config listeners deployment/source-controller -n flux-system | grep -i outbound
```

**Traffic bypasses the egress gateway**

Verify the VirtualService routes mesh traffic to the egress gateway first. Use proxy-config to check routing:

```bash
istioctl proxy-config routes deployment/source-controller -n flux-system | grep github
```

**Egress gateway shows no traffic**

Confirm the gateway port names match. Istio uses port names for protocol detection. TLS ports must start with `tls-`:

```bash
kubectl get gateway flux-egress-gateway -n flux-system -o yaml | grep -A3 "port:"
```

**SSH Git cloning fails through the egress gateway**

SSH (port 22) requires a separate TCP route. The TLS PASSTHROUGH mode only works for TLS traffic. For SSH, configure a TCP route:

```yaml
spec:
  servers:
    - port:
        number: 22
        name: tcp-ssh
        protocol: TCP
      hosts:
        - github.com
```

**High latency after adding egress gateway**

The egress gateway adds an extra network hop. Check the gateway pod resources and consider increasing replicas:

```bash
kubectl get hpa -n istio-system
kubectl top pods -n istio-system -l istio=egressgateway
```
