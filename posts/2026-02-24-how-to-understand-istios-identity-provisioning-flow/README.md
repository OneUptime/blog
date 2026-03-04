# How to Understand Istio's Identity Provisioning Flow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Identity, SPIFFE, Certificates, Security

Description: A step-by-step walkthrough of how Istio provisions cryptographic identities to workloads using SPIFFE, SDS, and Kubernetes service accounts.

---

Every workload in an Istio mesh gets a cryptographic identity. This identity is what makes mTLS, authorization policies, and secure naming possible. But how does a newly started pod actually get its identity? The provisioning flow involves several components working together - Kubernetes service accounts, the Istio pilot-agent, SDS (Secret Discovery Service), and the Istiod CA. Walking through this flow step by step gives you the full picture of Istio's identity system.

## The Starting Point: Kubernetes Service Accounts

Istio's identity model is built on top of Kubernetes service accounts. Every pod runs with a service account, and that service account becomes the basis for the pod's SPIFFE identity.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reviews
spec:
  template:
    spec:
      serviceAccountName: reviews
      containers:
        - name: reviews
          image: reviews:v1
```

If you don't specify a service account, the pod uses the `default` service account in its namespace. For proper identity management, always create dedicated service accounts:

```bash
kubectl create serviceaccount reviews -n default
```

The SPIFFE identity is derived as:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

So for the reviews pod:

```text
spiffe://cluster.local/ns/default/sa/reviews
```

## Step 1: Pod Starts with Injected Sidecar

When the pod is created, the Istio sidecar injector (a mutating admission webhook) modifies the pod spec to add:

1. The `istio-proxy` sidecar container running Envoy
2. The `istio-init` init container (or CNI configures iptables)
3. A projected service account token volume

The projected token is key to the identity flow:

```yaml
volumes:
  - name: istio-token
    projected:
      sources:
        - serviceAccountToken:
            audience: istio-ca
            expirationSeconds: 43200
            path: istio-token
```

This creates a short-lived, audience-scoped JWT token that pilot-agent uses to authenticate with Istiod. The `audience: istio-ca` field restricts the token so it can only be used with Istio's CA, not with the Kubernetes API server.

## Step 2: Pilot-Agent Starts

The `pilot-agent` process starts inside the sidecar container. It serves two purposes:

1. Bootstrap and manage the Envoy process
2. Handle certificate provisioning through SDS

On startup, pilot-agent reads the service account token from the mounted volume:

```bash
# The token is mounted at this path
/var/run/secrets/tokens/istio-token
```

It also reads the pod's identity information from environment variables and the Kubernetes downward API:

```bash
# These are injected by the sidecar injector
POD_NAME=reviews-v1-abc123
POD_NAMESPACE=default
SERVICE_ACCOUNT=reviews
```

## Step 3: Envoy Starts and Requests Certificates via SDS

Envoy starts and needs certificates for mTLS. Instead of loading them from files, it uses the Secret Discovery Service (SDS) protocol. Envoy connects to a local SDS server that pilot-agent runs on a Unix domain socket:

```text
/etc/istio/proxy/SDS
```

Envoy sends an SDS request asking for two secrets:

1. `default` - The workload's TLS certificate and private key
2. `ROOTCA` - The root certificate for validating peer certificates

```bash
# You can see these secrets
istioctl proxy-config secret my-pod
```

## Step 4: Pilot-Agent Generates Key Pair and CSR

When pilot-agent receives the SDS request from Envoy, it:

1. Generates an ECDSA P-256 private key (done in memory, never written to disk)
2. Creates a Certificate Signing Request (CSR) with the SPIFFE identity as the SAN
3. Reads the service account token from the mounted volume

The CSR looks like this (conceptually):

```text
Subject: (empty)
Subject Alternative Name: URI:spiffe://cluster.local/ns/default/sa/reviews
Public Key: <the generated ECDSA public key>
```

## Step 5: CSR Sent to Istiod

Pilot-agent sends the CSR to Istiod's CA signing endpoint over a gRPC connection. The request includes:

- The CSR
- The service account JWT token (for authentication)
- Pod metadata

The gRPC endpoint is typically `istiod.istio-system.svc:15012`.

```bash
# You can check if pilot-agent can reach Istiod
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET /healthz/ready
```

## Step 6: Istiod Validates and Signs

Istiod performs several validation checks:

1. **Token validation** - Verifies the JWT token by calling the Kubernetes TokenReview API
2. **Identity validation** - Confirms the requested SPIFFE identity matches the caller's service account and namespace
3. **Authorization** - Checks that the caller is allowed to request this identity
4. **CSR validation** - Verifies the CSR format and key strength

If all checks pass, Istiod signs the certificate with its CA private key:

```bash
# Check Istiod logs for signing events
kubectl logs -n istio-system -l app=istiod | grep "SDS.*cert" | tail -5
```

The signed certificate has:
- The SPIFFE URI in the SAN
- A default validity of 24 hours
- Key usage for both client and server authentication

## Step 7: Certificate Returned to Envoy

The signed certificate chain travels back:

1. Istiod returns the signed cert to pilot-agent
2. Pilot-agent packages the cert, private key, and cert chain
3. Pilot-agent sends this as an SDS response to Envoy
4. Envoy stores the certificate in memory

At this point, Envoy is ready for mTLS connections. The whole flow typically takes less than a second.

## Step 8: Certificate Rotation

Certificates don't last forever. The default 24-hour validity means they need regular rotation. Pilot-agent handles this automatically:

1. At approximately 50% of the certificate's lifetime (around 12 hours), pilot-agent initiates rotation
2. It generates a new key pair and CSR
3. The same flow (steps 4-7) repeats
4. Envoy gets the new certificate through an SDS update
5. Active connections continue with the old certificate
6. New connections use the new certificate

You can monitor rotation:

```bash
# Check certificate validity
istioctl proxy-config secret my-pod -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for s in data.get('dynamicActiveSecrets', []):
    name = s['name']
    cert_chain = s.get('secret', {}).get('tlsCertificate', {}).get('certificateChain', {})
    print(f'Secret: {name}')
"
```

## The Root Certificate Distribution

The root certificate (ROOTCA secret in SDS) is distributed differently. Istiod creates a ConfigMap called `istio-ca-root-cert` in every namespace:

```bash
kubectl get configmap istio-ca-root-cert -n default -o yaml
```

Pilot-agent reads this ConfigMap and serves it to Envoy through SDS when Envoy requests the `ROOTCA` secret.

When the root CA changes (e.g., during CA rotation), Istiod updates the ConfigMap in all namespaces, and pilot-agent picks up the change.

## Troubleshooting the Provisioning Flow

If identity provisioning fails, check each step:

```bash
# Step 1: Is the service account token mounted?
kubectl exec my-pod -c istio-proxy -- ls /var/run/secrets/tokens/istio-token

# Step 2: Is pilot-agent running?
kubectl exec my-pod -c istio-proxy -- ps aux | grep pilot-agent

# Step 3: Is SDS working?
istioctl proxy-config secret my-pod

# Step 4-6: Can pilot-agent reach Istiod?
kubectl exec my-pod -c istio-proxy -- \
  curl -s https://istiod.istio-system.svc:15012/debug/endpointz -k

# Step 7: Check for certificate errors
kubectl logs my-pod -c istio-proxy | grep -i "cert\|sds\|secret" | tail -20
```

Common failure modes:
- **Token expired** - The projected token has a limited lifetime. If the pod has been running longer than `expirationSeconds`, the token might be stale (Kubernetes should auto-refresh it)
- **Istiod unreachable** - Network policies or DNS issues prevent the gRPC connection
- **RBAC issues** - Istiod can't call the TokenReview API to validate the token
- **Resource exhaustion** - Istiod is overloaded and can't sign certificates fast enough

Understanding this flow end-to-end makes it much easier to debug certificate-related issues. When mTLS fails, you can pinpoint exactly which step in the provisioning chain broke down.
