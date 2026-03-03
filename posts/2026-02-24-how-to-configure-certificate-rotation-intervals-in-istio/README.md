# How to Configure Certificate Rotation Intervals in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate Rotation, mTLS, Security, Operations

Description: Learn how to configure and tune certificate rotation intervals in Istio, including workload certificate TTL, grace periods, and monitoring rotation events.

---

Istio automatically rotates workload certificates before they expire. This is one of its best security features, but the default rotation settings might not be right for every environment. Knowing how to tune rotation intervals helps you balance security (short-lived certificates) with performance (fewer rotation events).

## Default Rotation Behavior

By default, Istio issues workload certificates with a 24-hour TTL. The sidecar proxy requests a new certificate when the current one reaches 80% of its lifetime. So with a 24-hour certificate, rotation happens roughly every 19.2 hours.

Here is the timeline:

```text
T+0h    : Certificate issued, valid for 24 hours
T+19.2h : Rotation triggered (80% of 24h)
T+19.2h : New certificate issued, valid for 24 hours
T+24h   : Old certificate expires (but we already have the new one)
```

The rotation happens seamlessly without dropping any connections.

## Configuring Workload Certificate TTL

To change the certificate lifetime, you configure istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        DEFAULT_WORKLOAD_CERT_TTL: "12h"
        MAX_WORKLOAD_CERT_TTL: "48h"
```

- `DEFAULT_WORKLOAD_CERT_TTL` sets the default certificate lifetime for all workloads
- `MAX_WORKLOAD_CERT_TTL` sets the maximum lifetime that any workload can request

You can also set this per-workload using a proxy annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            SECRET_TTL: "6h0m0s"
    spec:
      containers:
      - name: my-api
        image: my-api:latest
```

The `SECRET_TTL` annotation overrides the default for that specific workload.

## Rotation Grace Period

The grace period determines when the sidecar starts requesting a new certificate. It is expressed as a percentage of the certificate's lifetime:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_GRACE_PERIOD_RATIO: "0.5"
```

With `SECRET_GRACE_PERIOD_RATIO: "0.5"` and a 24-hour TTL, rotation starts at 12 hours (50% of lifetime). The default is `0.8` (80% of lifetime).

Lowering this ratio gives you more buffer time. If a rotation fails at the 50% mark, you still have 50% of the certificate's lifetime to retry. With the default 80%, you only have 20% buffer.

## Why Short-Lived Certificates Matter

Shorter certificate lifetimes reduce the window of exposure if a certificate is compromised. If your certificates are valid for 24 hours, a stolen certificate is useless after a day. Compare that to a 30-day certificate where an attacker has a month to use stolen credentials.

But shorter lifetimes mean more rotation events, which means:

- More load on istiod (it has to sign more CSRs)
- More SDS (Secret Discovery Service) updates
- Slightly more CPU usage on each sidecar

For most clusters, the default 24-hour lifetime is a good balance. If you have thousands of pods, you might want to increase it to reduce load on istiod.

## Monitoring Rotation Events

Track rotation events through the proxy logs:

```bash
# Watch for certificate rotation in sidecar logs
kubectl logs <pod-name> -c istio-proxy -f | grep -i "SDS"
```

You will see messages like:

```text
info    sds    resource:default new connection
info    sds    resource:default pushed key/cert pair to proxy
```

For monitoring at scale, use Prometheus metrics:

```promql
# Number of certificate signing requests
sum(rate(citadel_server_csr_count[5m]))

# Certificate signing errors
sum(rate(citadel_server_csr_parsing_err_count[5m]))

# Successful certificate signing
sum(rate(citadel_server_success_cert_issuance_count[5m]))
```

## Handling Rotation Failures

If a certificate rotation fails, the sidecar retries with exponential backoff. The old certificate is still valid during this time (assuming the rotation was triggered early enough).

Common rotation failure causes:

### istiod Unavailable

If istiod is down, sidecars cannot get new certificates:

```bash
# Check istiod health
kubectl get pods -n istio-system -l app=istiod

# Check istiod logs for CA errors
kubectl logs -n istio-system deploy/istiod | grep -i "error"
```

### Service Account Token Issues

The sidecar uses a Kubernetes service account token to authenticate to istiod. If the token is invalid or expired:

```bash
# Check the SA token mount
kubectl exec <pod-name> -c istio-proxy -- \
  cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
  cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

### Resource Limits

If istiod is resource-constrained, it might not be able to process CSRs fast enough:

```bash
# Check istiod resource usage
kubectl top pod -n istio-system -l app=istiod
```

Consider increasing istiod's CPU and memory limits if you see throttling.

## Configuring Root CA Rotation

Root CA rotation is different from workload certificate rotation. It is a more involved process because you need to ensure that all workloads trust both the old and new root CAs during the transition.

The process:

1. Generate a new root CA and intermediate CA
2. Create the `cacerts` secret with both the new and old root certificates
3. Restart istiod
4. Wait for all workload certificates to be rotated with certificates signed by the new CA
5. Remove the old root CA from the trust bundle

```bash
# Step 1: Generate new CA certs (see certificate chain validation post for details)

# Step 2: Create combined trust bundle
cat new-root-cert.pem old-root-cert.pem > combined-root-cert.pem

# Step 3: Update the secret
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 4: Restart istiod
kubectl rollout restart deployment/istiod -n istio-system

# Step 5: Wait for all workloads to get new certs (monitor the logs)
# Then remove the old root from the trust bundle
```

## Scaling Considerations

For large clusters (1000+ pods), certificate rotation can create significant load spikes on istiod. Here are some strategies:

1. **Stagger TTLs**: Use slightly different TTLs for different workloads so rotations do not all happen at the same time

2. **Scale istiod**: Run multiple istiod replicas for HA and load distribution

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
```

3. **Increase TTL**: Longer TTLs mean fewer rotations. For internal services with good network security, 48-hour or 72-hour TTLs are reasonable.

```yaml
DEFAULT_WORKLOAD_CERT_TTL: "72h"
```

## Verifying Rotation Configuration

After changing rotation settings, verify they are applied:

```bash
# Check the effective proxy config
istioctl proxy-config bootstrap <pod-name> -o json | \
  jq '.bootstrap.node.metadata'

# Check the current certificate's expiration
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -enddate -noout
```

Certificate rotation is one of those things that should be boring. If you have configured it correctly, it runs silently in the background and your certificates stay fresh. The goal is to set it up once, monitor it, and only touch it again when you need to rotate the root CA.
