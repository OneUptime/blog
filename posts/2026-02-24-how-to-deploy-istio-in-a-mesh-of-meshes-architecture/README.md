# How to Deploy Istio in a Mesh of Meshes Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, MultiCluster, Architecture, Federation

Description: A practical guide to deploying Istio in a mesh of meshes architecture where independent service meshes communicate with each other while maintaining autonomy.

---

Most Istio multicluster documentation focuses on a single mesh spanning multiple clusters. But there is another model: multiple independent meshes that can communicate with each other while maintaining separate control planes, separate trust domains, and independent lifecycle management. This is the "mesh of meshes" approach, sometimes called mesh federation.

Think of it as the difference between one large company with multiple offices (single mesh, multiple clusters) versus separate companies that trade with each other (multiple meshes, federated communication). Each mesh is autonomous, with its own policies, certificates, and configuration. They just agree on how to exchange traffic at the boundaries.

## When to Use Mesh of Meshes

This architecture makes sense when:

- Different organizations or business units need to maintain independent meshes
- You want different trust domains for isolation (a security breach in one mesh should not compromise another)
- Teams need to upgrade and manage their meshes independently
- Regulatory requirements demand separate control planes for different environments

## Architecture Components

A mesh of meshes setup involves:

1. **Independent meshes**: Each mesh has its own Istiod, its own root CA, and its own configuration
2. **Federation gateways**: Dedicated gateways at mesh boundaries that handle cross-mesh traffic
3. **Exported services**: Each mesh explicitly declares which services are available to other meshes
4. **Trust negotiation**: Since meshes have different root CAs, you need a way to establish trust at the boundaries

## Step 1: Deploy Independent Meshes

Start by installing separate Istio instances. Each mesh gets its own mesh ID and trust domain:

Mesh A:

```yaml
# mesh-a.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mesh-a.example.com
  values:
    global:
      meshID: mesh-a
      multiCluster:
        clusterName: cluster-a
      network: network-a
```

```bash
istioctl install --context="${CTX_MESH_A}" -f mesh-a.yaml
```

Mesh B:

```yaml
# mesh-b.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mesh-b.example.com
  values:
    global:
      meshID: mesh-b
      multiCluster:
        clusterName: cluster-b
      network: network-b
```

```bash
istioctl install --context="${CTX_MESH_B}" -f mesh-b.yaml
```

Note the different `meshID` and `trustDomain` values. This is what makes them separate meshes rather than clusters within the same mesh.

## Step 2: Deploy Federation Gateways

Each mesh needs a gateway that handles traffic from the other mesh. This is similar to the east-west gateway but configured for cross-mesh communication:

```yaml
# federation-gateway-mesh-a.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: federation-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15443
        name: tls
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.mesh-b.example.com"
```

Deploy east-west gateways on both meshes:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network-a | \
  istioctl install --context="${CTX_MESH_A}" -f -

samples/multicluster/gen-eastwest-gateway.sh --network network-b | \
  istioctl install --context="${CTX_MESH_B}" -f -
```

## Step 3: Establish Cross-Mesh Trust

Since each mesh has its own root CA, direct mTLS will not work. You have two options:

**Option A: Shared root with different intermediates**

If you can control the CA setup, use the same root CA but different intermediate CAs for each mesh. This is the simplest approach:

```bash
# Both meshes trust the same root
make -f tools/certs/Makefile.selfsigned.mk root-ca
make -f tools/certs/Makefile.selfsigned.mk mesh-a-cacerts
make -f tools/certs/Makefile.selfsigned.mk mesh-b-cacerts
```

**Option B: TLS termination at the gateway**

If meshes truly have different roots, configure the federation gateway to terminate TLS and re-encrypt with the local mesh's certificates. This requires more configuration but provides true trust isolation:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: federation-ingress
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: mesh-b-client-cert
      hosts:
        - "*.exported.mesh-a.example.com"
```

## Step 4: Export Services

Each mesh explicitly exports the services it wants to make available. Create ServiceEntry resources on the consuming mesh that point to the federation gateway of the providing mesh:

On Mesh A, to consume a service from Mesh B:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-service-from-mesh-b
  namespace: default
spec:
  hosts:
    - payment.mesh-b.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: <mesh-b-federation-gateway-ip>
      ports:
        http: 15443
```

And a DestinationRule to configure the TLS settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-mesh-b-dr
  namespace: default
spec:
  host: payment.mesh-b.example.com
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      sni: payment.default.svc.cluster.local
```

## Step 5: Route Traffic Across Meshes

On the providing mesh (Mesh B), set up a VirtualService to route incoming federation traffic to the actual service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-federation-route
  namespace: default
spec:
  hosts:
    - payment.default.svc.cluster.local
  gateways:
    - istio-system/federation-gateway
  http:
    - route:
        - destination:
            host: payment.default.svc.cluster.local
            port:
              number: 80
```

## Managing the Federation

Unlike a single mesh where Istio handles cross-cluster discovery automatically, mesh federation requires explicit configuration on both sides. This is both a feature and a cost:

**Feature**: You have fine-grained control over what is exposed. A mesh admin can decide exactly which services are available to other meshes and apply policies at the federation boundary.

**Cost**: Every new cross-mesh service requires configuration changes on both sides. Automation is essential for managing this at scale.

Consider building a controller or using a GitOps workflow to manage federation resources. When Mesh B adds a new exported service, your automation should create the corresponding ServiceEntry and DestinationRule on Mesh A.

## Security at the Boundary

Federation gateways are the enforcement point for cross-mesh security. You can apply AuthorizationPolicy on the gateway to control which services from which meshes can access what:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: federation-access-control
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: eastwestgateway
  rules:
    - from:
        - source:
            principals:
              - "spiffe://mesh-a.example.com/ns/default/sa/payment-client"
      to:
        - operation:
            hosts:
              - "payment.default.svc.cluster.local"
```

The mesh of meshes model is the most flexible but also the most operationally complex way to connect Istio deployments. Use it when autonomy and isolation between meshes are genuine requirements, not just nice-to-haves.
