# How to Automate Istio mTLS Certificate Rotation with Custom CA Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate Management, Security, PKI

Description: Learn how to automate mTLS certificate rotation in Istio by integrating custom Certificate Authorities, configuring certificate lifetimes, and implementing zero-downtime rotation strategies.

---

Istio's built-in Certificate Authority issues short-lived certificates for mTLS, but many organizations need to integrate with existing PKI infrastructure. This guide shows you how to configure custom CA integration, automate certificate rotation, and ensure zero-downtime renewals in your service mesh.

## Understanding Istio Certificate Management

Istio uses SPIFFE (Secure Production Identity Framework For Everyone) identities for workloads. Each service gets a certificate with a SPIFFE ID like `spiffe://cluster.local/ns/default/sa/my-service`. The certificate proves the workload's identity during mTLS handshakes.

By default, Istio CA (istiod) signs certificates with a self-signed root. Certificates have a 24-hour lifetime and rotate automatically before expiry. This works well for development but production environments often require integration with enterprise CAs.

Three integration approaches exist: using Kubernetes CA, plugging in an external CA like cert-manager, or using a custom CA plugin. This guide covers all three.

## Prerequisites

You need a Kubernetes cluster with Istio installed. Check your current CA configuration:

```bash
istioctl version
kubectl get configmap istio-ca-root-cert -n istio-system -o yaml
```

The configmap contains the root certificate that workloads trust. You'll replace this when integrating a custom CA.

## Using Kubernetes Built-in CA

The simplest integration uses Kubernetes' built-in CA. Configure Istio to request certificates from the Kubernetes API:

```yaml
# istio-k8s-ca.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-k8s-ca
  namespace: istio-system
spec:
  meshConfig:
    # Use Kubernetes CA for cert signing
    ca:
      address: kubernetes.default:443
  values:
    global:
      # Enable CA integration
      pilotCertProvider: kubernetes
```

```bash
istioctl install -f istio-k8s-ca.yaml
```

Verify certificates come from Kubernetes CA:

```bash
kubectl exec <pod-name> -c istio-proxy -- openssl s_client -showcerts -connect backend:8080 < /dev/null 2>&1 | openssl x509 -text -noout | grep Issuer
```

The issuer should show Kubernetes' cluster CA.

## Integrating with cert-manager

cert-manager provides a robust certificate management solution. First, install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create a ClusterIssuer for your organization's CA:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: istio-ca-secret
```

Create the CA secret with your root certificate and key:

```bash
# Generate a CA certificate (or use your existing one)
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:4096 \
  -subj "/O=example Inc./CN=example.com" \
  -keyout ca.key -out ca.crt

# Create Kubernetes secret
kubectl create secret tls istio-ca-secret \
  --cert=ca.crt \
  --key=ca.key \
  -n cert-manager

kubectl apply -f cluster-issuer.yaml
```

Configure cert-manager to issue certificates for Istio:

```yaml
# istio-cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cacerts
  namespace: istio-system
spec:
  secretName: cacerts
  duration: 720h # 30 days
  renewBefore: 168h # Renew 7 days before expiry
  commonName: istio-ca
  isCA: true
  usages:
    - digital signature
    - key encipherment
    - cert sign
  dnsNames:
    - istio-ca.istio-system.svc
  issuerRef:
    name: istio-ca
    kind: ClusterIssuer
```

```bash
kubectl apply -f istio-cert-manager.yaml
```

Update Istio to use cert-manager certificates:

```yaml
# istio-external-ca.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-external-ca
  namespace: istio-system
spec:
  meshConfig:
    # Configure certificate options
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: cert-manager
  components:
    pilot:
      k8s:
        env:
        # Tell istiod to read CA from secret
        - name: CITADEL_ENABLE_CA_SERVER
          value: "false"
```

```bash
istioctl install -f istio-external-ca.yaml
```

Istiod now reads certificates from the cacerts secret that cert-manager maintains.

## Configuring Certificate Lifetime and Rotation

Control how long certificates live and when they rotate:

```yaml
# istio-cert-rotation.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cert-rotation
  namespace: istio-system
spec:
  meshConfig:
    # Set default certificate TTL
    defaultConfig:
      # Certificate lifetime in seconds (1 hour)
      secretTtl: 3600s
  values:
    pilot:
      env:
      # Grace period for certificate rotation (25% of TTL)
      - name: SECRET_GRACE_PERIOD_RATIO
        value: "0.25"
      # Maximum certificate lifetime (24 hours)
      - name: SECRET_TTL
        value: "86400s"
```

```bash
istioctl install -f istio-cert-rotation.yaml
```

With a 1-hour TTL and 25% grace period, certificates rotate every 45 minutes. The old certificate remains valid during the grace period for zero-downtime rotation.

## Verifying Automatic Certificate Rotation

Watch certificates rotate automatically. Check a workload's certificate expiry:

```bash
kubectl exec <pod-name> -c istio-proxy -- pilot-agent request GET certs | jq -r '.certificates[0].valid_until'
```

Wait past the rotation time and check again. The expiry time should update, indicating a new certificate was issued.

Monitor certificate rotation events:

```bash
kubectl logs -n istio-system -l app=istiod --tail=100 | grep "CSR signed"
```

You'll see log entries as istiod signs new certificate requests from workload proxies.

## Integrating with Vault PKI

HashiCorp Vault provides enterprise-grade certificate management. Configure Vault as Istio's CA.

First, enable Vault's PKI secrets engine:

```bash
# Enable PKI
vault secrets enable pki

# Configure max lease TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write -field=certificate pki/root/generate/internal \
  common_name="istio-ca.istio-system.svc" \
  ttl=87600h > ca.crt

# Configure CA certificate
vault write pki/config/urls \
  issuing_certificates="http://vault.vault.svc:8200/v1/pki/ca" \
  crl_distribution_points="http://vault.vault.svc:8200/v1/pki/crl"

# Create role for Istio
vault write pki/roles/istio-ca \
  allowed_domains="istio-system.svc,cluster.local" \
  allow_subdomains=true \
  max_ttl=72h
```

Configure Istio to use Vault:

```yaml
# istio-vault-ca.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-vault
  namespace: istio-system
spec:
  components:
    pilot:
      k8s:
        env:
        - name: VAULT_ADDR
          value: "http://vault.vault.svc:8200"
        - name: VAULT_ROLE
          value: "istio-ca"
        - name: VAULT_AUTH_PATH
          value: "auth/kubernetes"
        - name: VAULT_SIGN_CSR_PATH
          value: "pki/sign/istio-ca"
```

Set up Vault Kubernetes auth so istiod can authenticate:

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create policy for istiod
vault policy write istio-ca - <<EOF
path "pki/sign/istio-ca" {
  capabilities = ["create", "update"]
}
EOF

# Bind policy to istiod service account
vault write auth/kubernetes/role/istio-ca \
  bound_service_account_names=istiod \
  bound_service_account_namespaces=istio-system \
  policies=istio-ca \
  ttl=1h
```

## Monitoring Certificate Health

Create alerts for certificate expiry and rotation failures. Query certificate metrics from Envoy:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s http://localhost:15000/stats/prometheus | grep "ssl.connection_error"
```

Set up Prometheus alerts:

```yaml
# prometheus-cert-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-cert-alerts
  namespace: istio-system
data:
  cert-alerts.rules: |
    groups:
    - name: istio-certs
      interval: 30s
      rules:
      - alert: IstioCertificateExpiringSoon
        expr: |
          istio_certificate_expiration_timestamp - time() < 86400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Istio certificate expiring soon"
          description: "Certificate for {{ $labels.workload }} expires in less than 24 hours"

      - alert: IstioCertificateRotationFailed
        expr: |
          increase(pilot_xds_cds_reject[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Certificate rotation failed"
          description: "Failed to rotate certificates for workloads"
```

## Implementing Certificate Pinning

For critical services, pin certificates to specific CAs:

```yaml
# destinationrule-cert-pinning.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: default
spec:
  host: payment-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      # Pin to specific CA certificate
      caCertificates: /etc/certs/custom-ca.crt
```

Mount the CA certificate in pods:

```yaml
volumeMounts:
- name: custom-ca
  mountPath: /etc/certs
  readOnly: true
volumes:
- name: custom-ca
  configMap:
    name: custom-ca-cert
```

## Handling Certificate Rotation Failures

When rotation fails, workloads can't establish new connections. Implement fallback mechanisms:

```yaml
# peerauthentication-permissive.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: fallback-permissive
  namespace: default
spec:
  selector:
    matchLabels:
      app: critical-service
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode allows both mTLS and plaintext, preventing total outage during certificate issues. Switch to STRICT only when confident in your rotation process.

## Testing Certificate Rotation Under Load

Simulate rotation during high traffic to ensure zero downtime:

```bash
# Generate load
kubectl run load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://frontend:8080/health; done"

# Force certificate rotation by reducing TTL
kubectl patch istiooperator istio -n istio-system --type=json -p='[{"op": "replace", "path": "/spec/meshConfig/defaultConfig/secretTtl", "value": "60s"}]'

# Monitor for errors during rotation
kubectl logs -n istio-system -l app=istiod -f | grep -i error
```

Check that traffic continues flowing without connection errors during rotation.

## Rotating Root CA Certificates

Rotating the root CA is more complex because all workloads must trust the new root. Use a transitional dual-root approach:

1. Add new root to trust bundle
2. Issue new intermediate from new root
3. Rotate workload certificates to new intermediate
4. Remove old root from trust bundle

```bash
# Create trust bundle with both roots
kubectl create configmap istio-ca-root-cert \
  --from-file=root-cert.pem=combined-roots.pem \
  -n istio-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart workloads to pick up new trust bundle
kubectl rollout restart deployment -n default
```

## Conclusion

Automating certificate rotation in Istio ensures continuous mTLS security without manual intervention. Integrate with your organization's CA infrastructure using Kubernetes CA, cert-manager, or Vault for centralized certificate management.

Configure appropriate certificate lifetimes balancing security and rotation overhead. Short-lived certificates are more secure but rotate frequently. Monitor certificate health and set up alerts for expiry or rotation failures.

Test rotation under load to ensure zero downtime. Use PERMISSIVE mode as a fallback during migration or when testing new CA configurations. This gives you production-grade certificate management for your service mesh.
