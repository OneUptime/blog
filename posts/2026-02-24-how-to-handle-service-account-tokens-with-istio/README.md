# How to Handle Service Account Tokens with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Account Tokens, Kubernetes, Security, MTLS

Description: A practical guide to managing Kubernetes service account tokens in Istio for secure workload identity and authentication.

---

Service account tokens are the glue between Kubernetes identity and Istio's security model. When a sidecar proxy starts up, it uses the pod's service account token to prove its identity to istiod (the Istio control plane). Istiod validates the token and issues an X.509 certificate that the sidecar uses for mutual TLS. If the token handling is broken, your sidecars cannot get certificates, and mTLS falls apart.

Kubernetes has evolved how service account tokens work over the years. The old-style tokens were long-lived secrets mounted as files. The newer projected tokens are short-lived, audience-bound, and automatically rotated. Istio works with both but strongly prefers the newer style.

## Understanding Token Types

There are two types of service account tokens you will encounter:

**Legacy tokens**: Stored as Kubernetes Secrets, never expire, and are not audience-bound. These are the `kubernetes.io/service-account-token` type secrets.

**Projected tokens**: Mounted via the projected volume source. They have a configurable lifetime, are bound to a specific audience, and Kubernetes rotates them before expiry.

Check which type your pods are using:

```bash
kubectl get pod -n your-namespace your-pod -o json | \
  jq '.spec.volumes[] | select(.projected or .secret)'
```

Istio's sidecar injector configures pods to use projected tokens by default. You can verify:

```bash
kubectl get pod -n your-namespace -l app=your-app -o json | \
  jq '.items[0].spec.containers[] | select(.name == "istio-proxy") | .volumeMounts[] | select(.name | contains("istio"))'
```

## How Istio Uses Service Account Tokens

The flow goes like this:

1. Pod starts with a projected service account token
2. The istio-proxy container reads the token
3. The proxy sends the token to istiod in a certificate signing request (CSR)
4. Istiod validates the token against the Kubernetes API server
5. If valid, istiod issues an X.509 certificate with a SPIFFE identity
6. The proxy uses this certificate for mTLS with other proxies

The token audience for Istio is typically `istio-ca`. You can check this in the mesh configuration:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A2 "ISTIO_META"
```

## Configuring Token Lifetime

The default token lifetime for Istio's projected tokens is 43200 seconds (12 hours). You can adjust this in the Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      jwtPolicy: third-party-jwt
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_TOKEN_ROTATION_PERIOD: "3600s"
```

For the underlying Kubernetes projected volumes, configure the expiration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      serviceAccountName: your-app
      containers:
        - name: your-app
          image: your-app:latest
      volumes:
        - name: sa-token
          projected:
            sources:
              - serviceAccountToken:
                  audience: istio-ca
                  expirationSeconds: 43200
                  path: istio-token
```

In practice, the Istio sidecar injector handles this volume configuration for you. You only need to touch it if you have custom requirements.

## Troubleshooting Token Issues

When sidecars cannot get certificates, the first thing to check is token health.

Check if the token is mounted and readable:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  ls -la /var/run/secrets/tokens/
```

Verify the token is valid:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  cat /var/run/secrets/tokens/istio-token | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

This decodes the JWT payload and shows you the audience, expiry, and service account name.

Check istiod logs for token validation errors:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "token\|authentication\|unauthorized"
```

Common error messages and what they mean:

- `authentication handshake failed`: Token audience mismatch or expired token
- `failed to validate token`: Kubernetes API server rejected the token
- `no credential found`: Token not mounted in the expected location

## Handling Token Rotation

Kubernetes automatically rotates projected tokens before they expire. The kubelet requests a new token when the current one reaches 80% of its lifetime. The new token is written to the same file path.

Istio's proxy monitors the token file for changes and picks up the new token automatically. You can verify rotation is working:

```bash
# Watch the token file for changes
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  stat /var/run/secrets/tokens/istio-token
```

Run this command twice with some time between them. The modification time should change as tokens rotate.

If rotation is not happening, check the kubelet logs on the node:

```bash
# On the node (requires node access)
journalctl -u kubelet | grep "token\|rotate"
```

## Multi-Cluster Token Configuration

In multi-cluster Istio setups, service account tokens from one cluster need to be validated by the control plane in another cluster. This requires setting up remote secrets.

Create a remote secret for the remote cluster:

```bash
istioctl create-remote-secret \
  --name=cluster-west \
  --server=https://west-api-server:6443 \
  --context=cluster-west | kubectl apply -f - -n istio-system
```

The remote secret contains a kubeconfig that istiod in the primary cluster uses to validate tokens from the remote cluster.

Verify the remote secret is configured:

```bash
kubectl get secret -n istio-system -l istio/multiCluster=true
```

## Disabling Auto-Mount and Handling Manually

Some security policies require disabling automatic token mounting. You can do this while still letting Istio work:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: your-app
  namespace: production
automountServiceAccountToken: false
```

When you disable auto-mounting, the Istio sidecar injector still adds its own projected volume for the istio-token. But the default Kubernetes API token is no longer mounted. This is actually a security improvement since most applications do not need to talk to the Kubernetes API.

Verify the injected volume:

```bash
kubectl get pod -n production -l app=your-app -o json | \
  jq '.items[0].spec.volumes[] | select(.name == "istio-token")'
```

## Using Third-Party JWT vs First-Party JWT

Istio supports two JWT policies:

- `third-party-jwt`: Uses projected service account tokens with a specific audience. This is the default and recommended approach.
- `first-party-jwt`: Uses the legacy Kubernetes API server token. Only use this if your cluster does not support projected tokens.

Check which policy your Istio installation uses:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep jwtPolicy
```

If you are running an older cluster that does not support the TokenRequest API, you might need to fall back:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      jwtPolicy: first-party-jwt
```

But every modern Kubernetes cluster (1.20+) supports projected tokens, so there should not be a reason to use first-party JWT anymore.

## Security Best Practices for Tokens

Keep these practices in mind:

1. Always use `third-party-jwt` policy. It provides audience binding, which means a token intended for Istio cannot be used to authenticate against other services.

2. Set appropriate token lifetimes. Shorter lifetimes reduce the window of compromise if a token is leaked, but tokens that are too short can cause issues if there is clock skew between nodes.

3. Disable auto-mount for the default service account token. Your application containers rarely need Kubernetes API access.

4. Monitor token validation failures. A spike in failures could indicate an attack or a misconfiguration.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: token-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-token-health
      rules:
        - alert: HighTokenValidationFailures
          expr: |
            rate(pilot_total_xds_rejects{type="cds"}[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of xDS rejections, possibly token-related"
```

Service account tokens are a critical but often overlooked part of the Istio security chain. When they work, you never think about them. When they break, nothing works. Understanding how they flow from Kubernetes through Istio to your workloads makes troubleshooting much faster when problems do show up.
