# How to Handle Trust Domain Configuration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Trust Domain, Security, SPIFFE, Multi-Cluster

Description: Complete guide to configuring and managing trust domains in Istio for single and multi-cluster service mesh deployments.

---

The trust domain in Istio defines the trust boundary for your service mesh. It is the root component of every SPIFFE identity in the mesh, and getting it wrong can cause all sorts of authentication and authorization headaches. Most people leave it at the default `cluster.local` and only realize they need to change it when they start building multi-cluster or multi-mesh setups.

## What Is a Trust Domain?

A trust domain is essentially a namespace for identities. Every workload in Istio gets a SPIFFE ID that starts with the trust domain:

```
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

When two workloads communicate, they check whether the other workload's identity belongs to a trusted domain. If it does not, the connection is rejected.

By default, Istio uses `cluster.local` as the trust domain. For single-cluster deployments, this works fine. But when you have multiple clusters or multiple meshes, you need to think about trust domains more carefully.

## Setting the Trust Domain

Configure the trust domain during Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: prod.mycompany.com
```

Install with:

```bash
istioctl install -f istio-config.yaml
```

After installation, all workload certificates will use this trust domain. A workload with service account `payment-svc` in namespace `finance` would get the identity:

```
spiffe://prod.mycompany.com/ns/finance/sa/payment-svc
```

## Trust Domain in Authorization Policies

When you reference identities in authorization policies, you need to use the full SPIFFE principal with the trust domain:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-payment-access
  namespace: finance
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "prod.mycompany.com/ns/orders/sa/order-service"
```

Note that in the `principals` field, you omit the `spiffe://` prefix and just use `<trust-domain>/ns/<namespace>/sa/<service-account>`. Alternatively, you can use wildcard matching:

```yaml
principals:
- "prod.mycompany.com/*"
```

This trusts any identity from the `prod.mycompany.com` trust domain.

## Trust Domain Aliases

Sometimes you need to accept identities from multiple trust domains. This happens during trust domain migrations or when federating meshes. Istio supports trust domain aliases:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: prod.mycompany.com
    trustDomainAliases:
    - old-domain.mycompany.com
    - staging.mycompany.com
```

With aliases configured, authorization policies that reference `prod.mycompany.com` will also accept identities from `old-domain.mycompany.com` and `staging.mycompany.com`. This is the mechanism that makes trust domain migration possible without downtime.

## Migrating Trust Domains

Changing a trust domain in a running mesh is a delicate operation. You cannot just flip it overnight because existing workloads have certificates with the old trust domain, and authorization policies reference the old domain. Here is the step-by-step approach:

Step 1: Add the new trust domain as an alias on your current installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: old-domain.mycompany.com
    trustDomainAliases:
    - prod.mycompany.com
```

Step 2: Update all authorization policies to accept both domains:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-payment-access
  namespace: finance
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "old-domain.mycompany.com/ns/orders/sa/order-service"
        - "prod.mycompany.com/ns/orders/sa/order-service"
```

Step 3: Switch the primary trust domain and make the old one an alias:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: prod.mycompany.com
    trustDomainAliases:
    - old-domain.mycompany.com
```

Step 4: Wait for all workload certificates to be rotated (default TTL is 24 hours, so wait at least that long).

Step 5: Update authorization policies to only reference the new domain:

```yaml
principals:
- "prod.mycompany.com/ns/orders/sa/order-service"
```

Step 6: Remove the old trust domain alias once you are confident everything is working:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: prod.mycompany.com
```

## Multi-Cluster Trust Domain Scenarios

There are several ways to handle trust domains in multi-cluster Istio:

**Same trust domain, shared root CA**: Both clusters use the same trust domain (e.g., `mycompany.com`) and share the same root CA. This is the simplest setup and the recommended approach when all clusters belong to the same organization.

```yaml
# Cluster 1
meshConfig:
  trustDomain: mycompany.com

# Cluster 2
meshConfig:
  trustDomain: mycompany.com
```

**Different trust domains, shared root CA**: Clusters use different trust domains but still share a root CA. You use trust domain aliases to enable cross-cluster communication.

```yaml
# Cluster 1
meshConfig:
  trustDomain: us-east.mycompany.com
  trustDomainAliases:
  - eu-west.mycompany.com

# Cluster 2
meshConfig:
  trustDomain: eu-west.mycompany.com
  trustDomainAliases:
  - us-east.mycompany.com
```

**Different trust domains, different root CAs**: This is the most complex scenario and is not natively supported by Istio. You would need to federate trust at a higher level or use SPIFFE federation.

## Verifying Trust Domain Configuration

Check the current trust domain:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep trustDomain
```

Verify a workload's identity matches the expected trust domain:

```bash
istioctl proxy-config secret deploy/payment-service -n finance -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep URI
```

The output should show:

```
URI:spiffe://prod.mycompany.com/ns/finance/sa/payment-svc
```

## Trust Domain and Request Authentication

Trust domains also interact with request authentication. When using JWTs, the request principal is formatted differently from the SPIFFE principal:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: combined-auth
spec:
  rules:
  - from:
    - source:
        # This is the workload identity (trust domain)
        principals: ["prod.mycompany.com/ns/frontend/sa/web-app"]
        # This is the JWT identity (issuer/subject)
        requestPrincipals: ["https://auth.mycompany.com/user123"]
```

Do not confuse the trust domain-based principal with the JWT-based request principal. They serve different purposes and are evaluated independently.

## Common Mistakes

The most common mistake is changing the trust domain without adding aliases first. This instantly breaks all authorization policies that reference the old domain. Always add aliases before switching.

Another mistake is using different trust domains across clusters when you intend for them to be a single mesh. If you want seamless cross-cluster communication, use the same trust domain.

Finally, some people try to use the trust domain as a security boundary between tenants. While the trust domain does define a trust boundary, it is better to use namespaces and authorization policies for tenant isolation within a single mesh. Trust domains are meant for organizational or infrastructure boundaries, not tenant boundaries.

The trust domain is a foundational configuration choice in Istio. Pick a meaningful domain name, plan your multi-cluster strategy around it, and understand how aliases work for migrations. Getting this right early saves you from painful reconfiguration later.
