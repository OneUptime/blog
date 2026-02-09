# How to Use cert-manager Istio Integration for Service Mesh Certificate Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Istio, TLS

Description: Learn how to integrate cert-manager with Istio service mesh for automated certificate management, custom CA configuration, and secure mTLS communication between mesh services.

---

Istio service mesh provides automatic mutual TLS between services, but by default uses its own certificate authority. For organizations with existing PKI infrastructure, compliance requirements, or multi-mesh deployments, integrating cert-manager allows using custom CAs, enterprise PKI systems, or external certificate authorities for Istio's mTLS certificates.

This integration combines Istio's traffic management and observability with cert-manager's flexible certificate issuance from various sources including Let's Encrypt, HashiCorp Vault, Venafi, and internal CAs.

## Understanding Istio Certificate Architecture

Istio uses certificates in several places:

Control plane certificates secure communication between Istio components (istiod, gateways).

Workload certificates enable mTLS between services in the mesh. Each pod receives a certificate identifying it to other mesh services.

Gateway certificates secure ingress and egress traffic. These often require public CA certificates for external access.

By default, Istio manages all these with its internal CA. Integrating cert-manager provides centralized management and flexibility in certificate sources.

## Installing Istio with cert-manager Integration

Install Istio configured to use cert-manager for certificate issuance:

```bash
# Install Istio with external CA configuration
istioctl install --set profile=demo \
  --set values.global.caAddress="cert-manager-istio-csr.cert-manager.svc:443" \
  --set values.pilot.env.EXTERNAL_CA=ISTIOD_RA_KUBERNETES_API \
  -y

# Verify Istio installation
kubectl get pods -n istio-system
```

This configures Istio to request certificates from an external CA (cert-manager) instead of using its internal CA.

## Installing cert-manager Istio CSR

The cert-manager istio-csr component acts as a certificate signing service for Istio:

```bash
# Install cert-manager istio-csr
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager-istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set app.certmanager.issuer.name=istio-ca \
  --set app.certmanager.issuer.kind=ClusterIssuer \
  --set app.server.maxCertificateDuration=48h \
  --wait

# Verify istio-csr installation
kubectl get pods -n cert-manager -l app=cert-manager-istio-csr
```

istio-csr listens for certificate requests from Istio and uses cert-manager to issue them.

## Creating an Issuer for Istio

Create a dedicated CA Issuer for Istio mesh certificates:

```bash
# Generate CA for Istio
openssl genrsa -out istio-ca.key 4096
openssl req -new -x509 -days 3650 -key istio-ca.key -out istio-ca.crt -subj \
  "/CN=Istio Mesh CA/O=Example Org"

# Create secret with CA
kubectl create secret tls istio-ca-key-pair \
  --cert=istio-ca.crt \
  --key=istio-ca.key \
  -n cert-manager
```

Create a ClusterIssuer for Istio:

```yaml
# istio-ca-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: istio-ca-key-pair
```

Apply the issuer:

```bash
kubectl apply -f istio-ca-issuer.yaml
kubectl get clusterissuer istio-ca
```

## Verifying Integration

Deploy a test application to verify cert-manager issues certificates for Istio:

```yaml
# test-app.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: test-mesh
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: test-mesh
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: test-mesh
spec:
  selector:
    app: httpbin
  ports:
  - port: 8000
    targetPort: 80
```

Apply and verify:

```bash
kubectl apply -f test-app.yaml

# Check pod has Istio sidecar
kubectl get pods -n test-mesh

# Verify certificate issued by cert-manager
kubectl exec -n test-mesh deployment/httpbin -c istio-proxy -- \
  cat /etc/certs/cert-chain.pem | openssl x509 -text -noout

# Check certificate issuer matches Istio CA
kubectl exec -n test-mesh deployment/httpbin -c istio-proxy -- \
  cat /etc/certs/cert-chain.pem | openssl x509 -issuer -noout
```

The certificate should show your Istio CA as the issuer, confirming cert-manager integration works.

## Configuring Istio Gateway with cert-manager

Configure Istio Ingress Gateway to use certificates from cert-manager:

```yaml
# gateway-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-gateway-cert
  namespace: istio-system
spec:
  secretName: istio-gateway-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  commonName: gateway.example.com
  dnsNames:
  - gateway.example.com
  - "*.example.com"

  privateKey:
    algorithm: RSA
    size: 2048
```

Apply the certificate:

```bash
kubectl apply -f gateway-certificate.yaml

# Verify certificate issued
kubectl get certificate istio-gateway-cert -n istio-system
kubectl describe certificate istio-gateway-cert -n istio-system
```

Configure Gateway to use this certificate:

```yaml
# istio-gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: external-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      # Reference cert-manager issued certificate
      credentialName: istio-gateway-tls
    hosts:
    - "*.example.com"
```

Apply the gateway:

```bash
kubectl apply -f istio-gateway.yaml

# Test HTTPS access
curl -v https://gateway.example.com
```

## Using Vault as Istio CA

For enterprise environments, use HashiCorp Vault as the Istio CA:

```yaml
# vault-istio-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-istio-ca
spec:
  vault:
    server: https://vault.example.com:8200
    path: pki_int/sign/istio-mesh
    auth:
      kubernetes:
        mountPath: /v1/auth/kubernetes
        role: cert-manager
        serviceAccountRef:
          name: cert-manager
```

Update istio-csr to use Vault issuer:

```bash
helm upgrade cert-manager-istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set app.certmanager.issuer.name=vault-istio-ca \
  --set app.certmanager.issuer.kind=ClusterIssuer \
  --reuse-values
```

## Certificate Rotation for Mesh Workloads

Configure certificate rotation for mesh workloads:

```bash
# Update istio-csr with rotation settings
helm upgrade cert-manager-istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set app.server.maxCertificateDuration=24h \
  --set app.server.servingCertificateDuration=1h \
  --reuse-values
```

This configures:
- Workload certificates valid for 24 hours
- Serving certificates (for istio-csr itself) valid for 1 hour

Istio automatically rotates certificates before expiration without disrupting traffic.

## Monitoring Istio Certificate Status

Monitor certificate issuance and status:

```bash
# Check cert-manager istio-csr logs
kubectl logs -n cert-manager -l app=cert-manager-istio-csr -f

# View certificate requests from Istio
kubectl get certificaterequest -n cert-manager

# Check Istio certificate status
istioctl proxy-config secret -n test-mesh deployment/httpbin

# Verify mTLS between services
istioctl authn tls-check -n test-mesh deployment/httpbin
```

## Implementing Zero-Trust with Custom Policies

Combine cert-manager and Istio for zero-trust architecture:

```yaml
# peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: test-mesh
spec:
  mtls:
    mode: STRICT
---
# authorization-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-httpbin
  namespace: test-mesh
spec:
  selector:
    matchLabels:
      app: httpbin
  rules:
  - from:
    - source:
        # Require valid certificate from our CA
        principals: ["cluster.local/ns/test-mesh/sa/*"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

Apply policies:

```bash
kubectl apply -f peer-authentication.yaml
kubectl apply -f authorization-policy.yaml

# Verify strict mTLS enforced
istioctl authn tls-check -n test-mesh deployment/httpbin
```

## Multi-Cluster Mesh with Shared CA

For multi-cluster meshes, use cert-manager to provide shared CA certificates:

```yaml
# shared-ca-for-multi-cluster.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: shared-mesh-ca
spec:
  ca:
    # Same CA certificate in all clusters
    secretName: shared-mesh-ca-key-pair
```

Deploy this ClusterIssuer to all clusters in the mesh. Services across clusters trust each other because they share the same root CA.

## Gateway Certificates with Auto-Renewal

Automate gateway certificate renewal:

```yaml
# auto-renewing-gateway-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gateway-auto-renew
  namespace: istio-system
spec:
  secretName: gateway-auto-renew-tls

  duration: 2160h # 90 days
  renewBefore: 720h # 30 days before expiration

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - api.example.com
  - app.example.com

  # Automatic key rotation
  privateKey:
    rotationPolicy: Always
    algorithm: RSA
    size: 2048
```

Istio Gateway automatically picks up renewed certificates without restart.

## Troubleshooting Integration Issues

### Certificates Not Issued

```bash
# Check istio-csr logs
kubectl logs -n cert-manager -l app=cert-manager-istio-csr

# Verify issuer ready
kubectl get clusterissuer istio-ca
kubectl describe clusterissuer istio-ca

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### mTLS Not Working

```bash
# Check Istio configuration
istioctl analyze -n test-mesh

# Verify certificate chain
kubectl exec -n test-mesh deployment/httpbin -c istio-proxy -- \
  cat /etc/certs/cert-chain.pem | openssl verify -CAfile /etc/certs/root-cert.pem

# Check peer authentication
kubectl get peerauthentication -n test-mesh
```

### Gateway Certificate Issues

```bash
# Verify certificate exists
kubectl get secret istio-gateway-tls -n istio-system

# Check certificate validity
kubectl get secret istio-gateway-tls -n istio-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# Verify gateway configuration
kubectl get gateway -n istio-system -o yaml
```

## Performance Considerations

cert-manager integration adds minimal overhead to Istio:

Certificate issuance happens during pod startup, adding seconds to startup time.

Certificate renewal is automatic and doesn't impact running services.

For large meshes with frequent pod churn, monitor cert-manager and istio-csr resource usage.

## Security Benefits

Using cert-manager with Istio provides security advantages:

Centralized certificate management with audit logging.

Integration with enterprise PKI systems for compliance.

Flexible CA sources (Vault, Venafi, internal CA) instead of only Istio's built-in CA.

Consistent certificate policies across mesh and non-mesh workloads.

## Best Practices

Use separate CAs for different security domains. Development and production meshes should have different CAs.

Set appropriate certificate durations. Shorter durations improve security but increase renewal frequency.

Monitor certificate expiration and renewal. Set up alerts for certificate issues.

Test certificate rotation in development before production. Verify services handle rotation without disruption.

Use ClusterIssuers for mesh-wide certificate policies. This ensures consistency across namespaces.

Implement proper authorization policies. Certificates provide identity, but authorization controls access.

## Conclusion

Integrating cert-manager with Istio provides flexible, enterprise-ready certificate management for service mesh deployments. Whether using internal CAs, Vault, or external PKI systems, the integration maintains Istio's transparent mTLS while enabling centralized certificate governance.

This combination is essential for organizations with existing PKI infrastructure, compliance requirements, or multi-mesh deployments requiring consistent certificate management across environments. The integration delivers production-grade security with operational simplicity.
