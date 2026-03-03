# How to Configure Workload Identity in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Workload Identity, Security, SPIFFE, Kubernetes

Description: A hands-on guide to configuring workload identity in Istio using SPIFFE IDs, service accounts, and mTLS for secure service-to-service authentication.

---

Every service in your mesh needs an identity. Without it, you cannot answer the fundamental question: "who is making this request?" Istio assigns identities to workloads using the SPIFFE (Secure Production Identity Framework for Everyone) standard, and those identities become the basis for authentication, authorization, and encryption throughout your mesh.

## Understanding SPIFFE Identities in Istio

Istio assigns each workload a SPIFFE ID based on its Kubernetes service account. The format looks like this:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

For example, a workload running with the service account `order-service` in the `production` namespace with the default trust domain would get:

```text
spiffe://cluster.local/ns/production/sa/order-service
```

This identity is embedded in the X.509 certificate that Istio issues to the workload's sidecar proxy. Every time two services communicate, they exchange certificates and verify each other's identity through mTLS.

## Setting Up Service Accounts Properly

The first step toward good workload identity is creating dedicated service accounts for each service. Do not use the default service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: myregistry/order-service:v1.2.0
        ports:
        - containerPort: 8080
```

Each service gets its own service account, which translates to its own SPIFFE identity. This granularity is what makes fine-grained authorization possible.

## Configuring the Trust Domain

The trust domain is the root of your identity hierarchy. By default, Istio uses `cluster.local`, but you should set something meaningful for your organization:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
```

With this configuration, workload identities become:

```text
spiffe://mycompany.com/ns/production/sa/order-service
```

This matters especially in multi-cluster setups where you need to distinguish identities across clusters.

## Verifying Workload Identity

Once your workloads are running, verify that they have the correct identity:

```bash
istioctl proxy-config secret deployment/order-service -n production
```

To see the full certificate details including the SPIFFE ID:

```bash
istioctl proxy-config secret deployment/order-service -n production -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep URI
```

You should see something like:

```text
URI:spiffe://mycompany.com/ns/production/sa/order-service
```

## Using Identity for Authorization

The real power of workload identity shows up in authorization policies. You can write policies that reference specific identities:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/order-service"
        - "cluster.local/ns/production/sa/checkout-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments/*"]
```

Only the order-service and checkout-service can make POST requests to the payment service. Everything else gets denied.

## Peer Authentication with Identity

PeerAuthentication policies control how workloads verify each other's identities:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

In STRICT mode, every connection must present a valid mTLS certificate. There is no falling back to plain text. This guarantees that every request in the namespace comes from an authenticated identity.

You can also set per-port policies for workloads that need to accept non-mTLS traffic on certain ports:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

Port 8081 might be a health check endpoint that needs to accept traffic from the kubelet, which does not have an Istio identity.

## Request Authentication and JWT

Beyond mTLS identity, you can layer on request-level authentication using JWTs. This gives you end-user identity in addition to workload identity:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
  - issuer: "https://auth.mycompany.com"
    jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
    forwardOriginalToken: true
    outputPayloadToHeader: "x-jwt-payload"
```

Then combine workload identity and user identity in authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
  namespace: production
spec:
  selector:
    matchLabels:
      app: admin-panel
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/api-gateway"]
        requestPrincipals: ["https://auth.mycompany.com/*"]
    when:
    - key: request.auth.claims[role]
      values: ["admin"]
```

This requires both a valid workload identity (the api-gateway) and a valid JWT with the admin role.

## Identity in Multi-Cluster Setups

When running Istio across multiple clusters, workload identity becomes even more important. Each cluster needs to share the same root CA so they can verify each other's certificates.

Set the same trust domain across all clusters:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster-east
      network: network-east
```

With a shared trust domain and root CA, workloads in cluster-east can authenticate workloads in cluster-west using their SPIFFE identities.

## Debugging Identity Issues

When authorization fails unexpectedly, check the identity of the calling workload:

```bash
istioctl proxy-config listeners <pod-name> -n production -o json | \
  jq '.[] | select(.name=="virtualInbound") | .filterChains[].filters[].typedConfig.rules'
```

Check the istiod logs for certificate issuance problems:

```bash
kubectl logs deployment/istiod -n istio-system | grep -i "csr\|cert\|identity"
```

And use `istioctl authn tls-check` to verify mTLS status between services:

```bash
istioctl authn tls-check <pod-name>.production order-service.production.svc.cluster.local
```

## Best Practices

Always create unique service accounts for each workload. Never share service accounts between different services since that defeats the purpose of having distinct identities. Use strict mTLS everywhere in production. Set a meaningful trust domain that reflects your organization. And regularly audit your authorization policies to make sure they reference the correct principals.

Workload identity is the foundation that all of Istio's security features build on. Get the identity model right - proper service accounts, correct trust domain, strict mTLS - and everything else from authorization to observability becomes much more straightforward.
