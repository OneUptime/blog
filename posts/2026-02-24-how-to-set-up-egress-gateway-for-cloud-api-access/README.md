# How to Set Up Egress Gateway for Cloud API Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress Gateway, Cloud API, Kubernetes, Service Mesh

Description: Learn how to configure an Istio egress gateway to securely route traffic from your mesh to external cloud APIs like AWS, GCP, and Azure endpoints.

---

If your workloads running inside an Istio service mesh need to talk to external cloud APIs (think AWS S3, Google Cloud Storage, Azure Blob Storage), you probably want that traffic flowing through a controlled egress point. Without an egress gateway, every sidecar proxy can potentially reach out to the internet directly, and you lose visibility and control over what leaves your cluster.

An egress gateway acts as a dedicated exit point for outbound traffic. It gives you a single place to apply policies, monitor traffic, and lock things down. This guide walks through setting up an Istio egress gateway specifically for cloud API access.

## Why Use an Egress Gateway for Cloud APIs

There are a few practical reasons to route cloud API traffic through an egress gateway:

- **Security auditing**: All outbound traffic to cloud services flows through one point, making it easy to log and audit.
- **Network policy enforcement**: You can restrict which pods are allowed to reach external APIs by controlling access to the egress gateway.
- **IP whitelisting**: Some cloud APIs require you to whitelist source IPs. With an egress gateway, your outbound traffic comes from a known set of IPs.
- **TLS origination**: You can handle TLS at the gateway level instead of requiring every application to manage its own TLS connections.

## Prerequisites

You need an Istio installation with the egress gateway enabled. If you installed Istio with the default profile, the egress gateway might not be included. Check with:

```bash
kubectl get pods -n istio-system -l istio=egressgateway
```

If nothing shows up, you need to enable it. Using IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

Apply it:

```bash
istioctl install -f egress-gateway.yaml
```

You also want to configure the mesh to block direct external access so that traffic must go through the gateway. Set the outbound traffic policy to `REGISTRY_ONLY`:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A1 outboundTrafficPolicy
```

If it is not set to `REGISTRY_ONLY`, update the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

## Setting Up Egress for AWS APIs

Suppose your application needs to call AWS S3. The S3 API endpoint is `s3.amazonaws.com` (or region-specific like `s3.us-east-1.amazonaws.com`). Here is the full configuration.

First, create a ServiceEntry to register the external AWS endpoint with the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3-api
  namespace: default
spec:
  hosts:
  - s3.amazonaws.com
  - s3.us-east-1.amazonaws.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Next, create a Gateway resource for the egress gateway to handle this traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: aws-s3-egress-gateway
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
    - s3.amazonaws.com
    - s3.us-east-1.amazonaws.com
    tls:
      mode: PASSTHROUGH
```

Now create VirtualService and DestinationRule resources to route traffic from the sidecars to the egress gateway, and from the egress gateway to the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: aws-s3-through-egress
  namespace: default
spec:
  hosts:
  - s3.amazonaws.com
  - s3.us-east-1.amazonaws.com
  gateways:
  - mesh
  - aws-s3-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - s3.amazonaws.com
      - s3.us-east-1.amazonaws.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - aws-s3-egress-gateway
      port: 443
      sniHosts:
      - s3.amazonaws.com
      - s3.us-east-1.amazonaws.com
    route:
    - destination:
        host: s3.amazonaws.com
        port:
          number: 443
      weight: 100
```

## Adding Google Cloud APIs

The same pattern applies to GCP APIs. Google Cloud services typically use `*.googleapis.com` endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-storage-api
  namespace: default
spec:
  hosts:
  - storage.googleapis.com
  - www.googleapis.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: gcp-egress-gateway
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
    - storage.googleapis.com
    - www.googleapis.com
    tls:
      mode: PASSTHROUGH
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: gcp-through-egress
  namespace: default
spec:
  hosts:
  - storage.googleapis.com
  - www.googleapis.com
  gateways:
  - mesh
  - gcp-egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - storage.googleapis.com
      - www.googleapis.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - gcp-egress-gateway
      port: 443
      sniHosts:
      - storage.googleapis.com
      - www.googleapis.com
    route:
    - destination:
        host: storage.googleapis.com
        port:
          number: 443
      weight: 100
```

## Verifying the Setup

Deploy a test pod and try reaching the cloud API:

```bash
kubectl exec -it deploy/sleep -- curl -sI https://s3.amazonaws.com
```

You should get a valid HTTP response. To confirm traffic is flowing through the egress gateway, check the gateway logs:

```bash
kubectl logs -n istio-system -l istio=egressgateway --tail=50
```

You should see log entries for the S3 requests.

Another way to verify is by looking at the Envoy access logs on the egress gateway:

```bash
kubectl logs -n istio-system deploy/istio-egressgateway -c istio-proxy --tail=20
```

## Restricting Access with Authorization Policies

Once traffic flows through the egress gateway, you can add authorization policies to control which services are allowed to reach specific cloud APIs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-s3-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["data-pipeline"]
    to:
    - operation:
        ports: ["443"]
```

This policy only allows workloads from the `data-pipeline` namespace to send traffic through the egress gateway on port 443.

## Common Issues

**Traffic bypasses the egress gateway**: Make sure `outboundTrafficPolicy` is set to `REGISTRY_ONLY`. If it is `ALLOW_ANY`, sidecars will route directly to external services without going through the gateway.

**DNS resolution fails**: The ServiceEntry must have `resolution: DNS` for external hostnames. If you use `resolution: NONE`, Istio will not resolve the hostname and the connection will fail.

**TLS handshake errors**: When using `PASSTHROUGH` mode on the gateway, the original TLS connection from the application passes through untouched. Make sure your application is initiating TLS connections to the cloud APIs. If you want the gateway to handle TLS, use `mode: ISTIO_MUTUAL` on the gateway and configure TLS origination in the DestinationRule.

## Summary

Setting up an egress gateway for cloud API access gives you centralized control over outbound traffic. The pattern is the same regardless of which cloud provider you are targeting: create a ServiceEntry for the external host, a Gateway to accept the traffic at the egress gateway, and a VirtualService to route traffic from sidecars through the gateway to the external service. From there, you can layer on authorization policies, monitoring, and rate limiting as needed.
