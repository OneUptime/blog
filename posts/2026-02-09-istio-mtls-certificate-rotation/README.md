# How to Automate Istio mTLS Certificate Rotation with Custom CA Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate Management, Security, PKI

Description: Learn how to automate mTLS certificate rotation in Istio by integrating custom Certificate Authorities, configuring certificate lifetimes, and implementing zero-downtime rotation strategies.

---

Istio's built-in Certificate Authority issues short-lived certificates for mTLS, but many organizations need to integrate with existing PKI infrastructure. This guide shows you how to configure custom CA integration, automate certificate rotation, and ensure zero-downtime renewals in your service mesh.

## Understanding Istio Certificate Management

Istio uses SPIFFE (Secure Production Identity Framework For Everyone) identities for workloads. Each service gets a certificate with a SPIFFE ID like `spiffe://cluster.local/ns/default/sa/my-service`. The certificate proves the workload's identity during mTLS handshakes.

By default, Istio CA (istiod) signs certificates with a self-signed root. Certificates have a 24-hour lifetime and rotate automatically before expiry. This works well for development but production environments often require integration with enterprise CAs.

Three integration approaches exist: plugging in CA certificates through the `cacerts` secret, using a custom CA through the Kubernetes CSR API, or delegating workload signing to cert-manager's `istio-csr` agent. This guide covers all three.

## Prerequisites

You need a Kubernetes cluster with Istio installed. Check your current CA configuration:

```bash
istioctl version
kubectl get configmap istio-ca-root-cert -n istio-system -o yaml
```

The configmap contains the root certificate that workloads trust. Istio normally updates this from the configured CA material; do not edit it directly except as part of a planned root transition.

## Using Kubernetes CSR API

The Kubernetes CSR integration lets Istio request workload certificates through the Kubernetes certificates API. A signer such as cert-manager must be configured to approve and sign CSRs for the signer name you choose:

```yaml
# istio-k8s-csr-ca.yaml

apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-k8s-csr-ca
  namespace: istio-system
spec:
  values:
    pilot:
      env:
        # Forward workload CSRs to the Kubernetes certificates API
        EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API
  components:
    pilot:
      k8s:
        env:
        - name: CERT_SIGNER_DOMAIN
          value: clusterissuers.cert-manager.io
        - name: PILOT_CERT_PROVIDER
          value: k8s.io/clusterissuers.cert-manager.io/istio-system
        overlays:
        - kind: ClusterRole
          name: istiod-clusterrole-istio-system
          patches:
          - path: rules[-1]
            value: |
              apiGroups:
              - certificates.k8s.io
              resourceNames:
              - clusterissuers.cert-manager.io/istio-system
              resources:
              - signers
              verbs:
              - approve
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-system
    caCertificates:
    - pem: |
        -----BEGIN CERTIFICATE-----
        <root certificate for the istio-system signer>
        -----END CERTIFICATE-----
      certSigners:
      - clusterissuers.cert-manager.io/istio-system
```

```bash
istioctl install -f istio-k8s-csr-ca.yaml
```

Verify certificates come from the configured signer:

```bash
kubectl exec <pod-name> -c istio-proxy -- openssl s_client -showcerts -connect backend:8080 < /dev/null 2>&1 | openssl x509 -text -noout | grep Issuer
```

The issuer should match the CA behind the Kubernetes CSR signer.

## Integrating with cert-manager

cert-manager provides a robust certificate management solution. For Istio workload certificates, use the `istio-csr` agent so Envoy sidecars request certificates from cert-manager. First, install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
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
  name: istio-ca
  namespace: istio-system
spec:
  secretName: istio-ca
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

Install `istio-csr` and update Istio to send workload CSRs to it:

```bash
kubectl get -n istio-system secret istio-ca -o go-template='{{index .data "tls.crt"}}' | base64 -d > ca.pem
kubectl create secret generic -n cert-manager istio-root-ca --from-file=ca.pem=ca.pem

helm upgrade cert-manager-istio-csr oci://quay.io/jetstack/charts/cert-manager-istio-csr \
  --install \
  --namespace cert-manager \
  --wait \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.certmanager.issuer.name=istio-ca" \
  --set "app.certmanager.issuer.kind=ClusterIssuer" \
  --set "app.certmanager.issuer.group=cert-manager.io" \
  --set "volumeMounts[0].name=root-ca" \
  --set "volumeMounts[0].mountPath=/var/run/secrets/istio-csr" \
  --set "volumes[0].name=root-ca" \
  --set "volumes[0].secret.secretName=istio-root-ca"
```

```yaml
# istio-external-ca.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-external-ca
  namespace: istio-system
spec:
  values:
    global:
      # Send workload CSR requests to cert-manager istio-csr
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  components:
    pilot:
      k8s:
        env:
        # Disable istiod's built-in CA server
        - name: ENABLE_CA_SERVER
          value: "false"
```

```bash
istioctl install -f istio-external-ca.yaml
```

Istio agents now request workload certificates from `istio-csr`, which signs them through cert-manager.

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
  values:
    global:
      proxy:
        env:
          # Certificate lifetime requested by istio-agent (1 hour)
          SECRET_TTL: 1h
          # Grace period for certificate rotation (25% of TTL)
          SECRET_GRACE_PERIOD_RATIO: "0.25"
```

```bash
istioctl install -f istio-cert-rotation.yaml
```

With a 1-hour TTL and 25% grace period, istio-agent starts renewal when about 15 minutes remain. The previous certificate remains valid until its normal expiry, so existing connections can continue while new certificates are fetched.

## Verifying Automatic Certificate Rotation

Watch certificates rotate automatically. Check a workload's certificate expiry:

```bash
kubectl exec <pod-name> -c istio-proxy -- pilot-agent request GET certs | jq -r '.certificates[0].valid_until'
```

Wait past the rotation time and check again. The expiry time should update, indicating a new certificate was issued.

Monitor certificate rotation events:

```bash
kubectl get certificaterequests.cert-manager.io -n istio-system -w
```

When using `istio-csr`, you'll see CertificateRequest resources as workload proxies request new certificates.

## Integrating with Vault PKI

HashiCorp Vault provides enterprise-grade certificate management. Istio does not consume Vault PKI directly through `VAULT_*` environment variables; integrate Vault through cert-manager's Vault issuer and then use `istio-csr` as shown above.

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
  allowed_uri_sans="spiffe://cluster.local/*" \
  require_cn=false \
  use_csr_sans=true \
  max_ttl=72h
```

Create a cert-manager issuer that signs through Vault:

```yaml
# vault-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-issuer
  namespace: istio-system
spec:
  vault:
    server: http://vault.vault.svc:8200
    path: pki/sign/istio-ca
    auth:
      kubernetes:
        role: vault-issuer
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: vault-issuer
```

Set up Vault Kubernetes auth so cert-manager can authenticate:

```bash
kubectl create serviceaccount vault-issuer -n istio-system

kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: vault-issuer
  namespace: istio-system
rules:
- apiGroups: [""]
  resources: ["serviceaccounts/token"]
  resourceNames: ["vault-issuer"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: vault-issuer
  namespace: istio-system
subjects:
- kind: ServiceAccount
  name: cert-manager
  namespace: cert-manager
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: vault-issuer
EOF

# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create policy for cert-manager-issued Istio certificates
vault policy write vault-issuer - <<EOF
path "pki/sign/istio-ca" {
  capabilities = ["create", "update"]
}
EOF

# Bind policy to the issuer service account
vault write auth/kubernetes/role/vault-issuer \
  bound_service_account_names=vault-issuer \
  bound_service_account_namespaces=istio-system \
  audience="vault://istio-system/vault-issuer" \
  policies=vault-issuer \
  ttl=1h
```

Use this `vault-issuer` in the cert-manager `Certificate` or `istio-csr` issuer configuration.

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
          citadel_server_root_cert_expiry_timestamp - time() < 86400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Istio certificate expiring soon"
          description: "The Istio root certificate expires in less than 24 hours"

      - alert: IstioCertificateRotationFailed
        expr: |
          increase(pilot_sds_certificate_errors_total[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Certificate rotation failed"
          description: "Failed to rotate certificates for workloads"
```

## Implementing Certificate Pinning

For external services or custom TLS origination, pin certificates to specific CAs:

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
      mode: MUTUAL
      # Pin to specific CA certificate
      caCertificates: /etc/certs/custom-ca.crt
      clientCertificate: /etc/certs/client.crt
      privateKey: /etc/certs/client.key
```

Mount the client certificate, key, and CA certificate in pods:

```yaml
volumeMounts:
- name: custom-ca
  mountPath: /etc/certs
  readOnly: true
volumes:
- name: custom-ca
  secret:
    secretName: payment-service-client-certs
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
istioctl install -f istio-cert-rotation.yaml --set values.global.proxy.env.SECRET_TTL=10m
kubectl rollout restart deployment -n default

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
# Create a cacerts secret with the new intermediate and both roots
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca/ca-cert.pem \
  --from-file=ca-key.pem=new-ca/ca-key.pem \
  --from-file=root-cert.pem=combined-roots.pem \
  --from-file=cert-chain.pem=new-ca/cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart workloads to pick up new trust bundle
kubectl rollout restart deployment -n default
```

## Conclusion

Automating certificate rotation in Istio ensures continuous mTLS security without manual intervention. Integrate with your organization's CA infrastructure using the Kubernetes CSR API, cert-manager, or Vault for centralized certificate management.

Configure appropriate certificate lifetimes balancing security and rotation overhead. Short-lived certificates are more secure but rotate frequently. Monitor certificate health and set up alerts for expiry or rotation failures.

Test rotation under load to ensure zero downtime. Use PERMISSIVE mode as a fallback during migration or when testing new CA configurations. This gives you production-grade certificate management for your service mesh.
