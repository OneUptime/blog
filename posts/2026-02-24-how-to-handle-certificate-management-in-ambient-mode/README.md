# How to Handle Certificate Management in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, Ambient Mesh, mTLS, Security, Kubernetes

Description: Practical guide to managing TLS certificates in Istio ambient mode including rotation, custom CAs, and troubleshooting certificate issues.

---

Certificate management in Istio ambient mode is handled differently from the sidecar model. In sidecar mode, each pod's sidecar managed its own certificate through the Istio agent (pilot-agent). In ambient mode, ztunnel manages certificates for all workloads on the node. This centralized approach simplifies some things but introduces new considerations.

Every ztunnel instance requests certificates from the Istio CA (istiod) on behalf of all ambient mesh pods running on its node. It holds multiple identities simultaneously, one for each service account used by pods on that node.

## How Certificates Work in Ambient Mode

When a pod joins the ambient mesh, ztunnel requests a certificate for that pod's service account identity. The certificate contains a SPIFFE ID like:

```text
spiffe://cluster.local/ns/default/sa/my-app
```

ztunnel caches these certificates and uses them to establish mTLS connections between workloads. The certificate lifecycle is fully managed by ztunnel, including rotation.

To verify that certificates are being issued properly:

```bash
istioctl ztunnel-config certificates
```

This shows all certificates held by all ztunnel instances, including their expiration times and SPIFFE IDs.

For a specific ztunnel pod:

```bash
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')
istioctl ztunnel-config certificates $ZTUNNEL_POD
```

## Certificate Rotation

By default, Istio certificates have a 24-hour validity period and get rotated automatically before expiration. ztunnel handles rotation without any traffic interruption.

You can tune the certificate lifetime in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: 12h
```

Or configure it at the istiod level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  pilot:
    env:
      MAX_WORKLOAD_CERT_TTL: 48h
      DEFAULT_WORKLOAD_CERT_TTL: 24h
```

To verify rotation is working, watch the certificates and check their ages:

```bash
# Check certificate validity times
istioctl ztunnel-config certificates | grep -E "VALID|EXPIRED"
```

If certificates aren't rotating, check ztunnel logs for errors:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=200 | grep -i "cert\|tls\|secret"
```

## Using a Custom CA

By default, Istio uses a self-signed root CA. For production, you'll likely want to plug in your own CA. There are several options.

### Option 1: Plug in CA Certificates

Create a secret with your CA cert and key before installing Istio:

```bash
kubectl create namespace istio-system

kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

Then install Istio. It will detect the `cacerts` secret and use it as the signing CA.

Verify the CA is being used:

```bash
istioctl ztunnel-config certificates | head -20
```

### Option 2: Use cert-manager

cert-manager can act as the CA for Istio through the istio-csr project:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s
```

Install istio-csr:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.server.clusterID=cluster.local"
```

Then configure Istio to use cert-manager as the CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  pilot:
    env:
      ENABLE_CA_SERVER: "false"
```

This setup gives you full control over the CA chain and integrates with whatever PKI infrastructure you already have through cert-manager's various issuer types.

### Option 3: External CA with CSR API

You can configure Istio to use the Kubernetes CSR API, which lets external signers handle certificate requests:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  pilot:
    env:
      EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API
      K8S_SIGNER: clusterissuers.cert-manager.io/istio-system
```

## Inspecting Certificates

When debugging mTLS issues, you'll want to look at the actual certificate contents. You can extract and inspect certificates from ztunnel:

```bash
# Get the cert info from ztunnel's admin API
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s localhost:15020/config_dump | python3 -c "
import json, sys
data = json.load(sys.stdin)
for cert in data.get('certificates', []):
    print(f\"Identity: {cert.get('identity', 'unknown')}\")
    print(f\"  Valid from: {cert.get('valid_from', 'N/A')}\")
    print(f\"  Expiration: {cert.get('expiration_time', 'N/A')}\")
    print()
"
```

You can also use openssl to inspect the certificate chain when testing mTLS:

```bash
# From a test pod, connect and show the peer certificate
kubectl run openssl-test -n default --image=alpine --rm -it -- sh -c '
apk add --no-cache openssl
echo | openssl s_client -connect my-app.default.svc.cluster.local:8080 -showcerts 2>/dev/null | openssl x509 -noout -text
'
```

## Troubleshooting Common Certificate Problems

### Problem: Certificates Not Being Issued

If ztunnel can't get certificates, check connectivity to istiod:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=100 | grep -i "ca\|grpc\|connect"
```

Verify istiod is healthy:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl logs -n istio-system -l app=istiod --tail=50 | grep -i "error\|cert"
```

### Problem: Certificate Mismatch Errors

If you see TLS handshake failures, the issue might be mismatched trust domains:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=100 | grep -i "handshake\|tls\|verify"
```

Make sure all clusters in a multi-cluster setup use the same root CA. The trust domain should match:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster.local
```

### Problem: Expired Certificates

If certificate rotation fails and certs expire, ztunnel traffic will break. Check for expired certs:

```bash
istioctl ztunnel-config certificates | grep -i expired
```

Restart the affected ztunnel pod to force re-enrollment:

```bash
kubectl delete pod $ZTUNNEL_POD -n istio-system
```

The DaemonSet will recreate it, and the new pod will request fresh certificates.

## Best Practices

Keep these in mind for production:

1. Always use a proper CA chain, not the self-signed default. The self-signed CA stores its private key in a Kubernetes secret, which is only as secure as your etcd encryption.

2. Monitor certificate expiration. Set up Prometheus alerts for certificates approaching expiration.

3. Test certificate rotation before going to production. Lower the TTL temporarily and verify that rotation happens cleanly.

4. Back up your CA certificates. If you lose the root CA key, you'll need to re-issue all certificates, which means restarting all ztunnel pods.

5. Use separate CAs for different trust boundaries if you're running multi-cluster setups.

Certificate management in ambient mode is largely automated, but understanding how it works under the hood helps you troubleshoot faster when issues come up and make better decisions about your PKI setup.
