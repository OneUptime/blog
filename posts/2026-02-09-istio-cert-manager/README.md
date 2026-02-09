# How to Use Istio Certificate Management with cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, cert-manager, TLS, Kubernetes, Security, Service Mesh

Description: Integrate cert-manager with Istio to automate TLS certificate provisioning and rotation for ingress gateways and service mesh workloads.

---

Managing TLS certificates manually becomes impractical at scale. Cert-manager automates certificate lifecycle management in Kubernetes, while Istio provides the service mesh infrastructure. Integrating them gives you automatic certificate provisioning, rotation, and renewal for both north-south and east-west traffic.

## Understanding the Integration Points

Istio and cert-manager intersect at two main points. First, ingress gateway certificates for external traffic. Second, custom CA certificates for mesh-internal mTLS. While Istio includes its own certificate authority for workload identity, cert-manager provides production-grade certificate management with external CA integration.

Istio's built-in CA works well for mesh-internal traffic. Use cert-manager when you need certificates from public CAs like Let's Encrypt for ingress, or when compliance requires using your organization's PKI infrastructure.

## Installing cert-manager

Install cert-manager before configuring Istio integration:

```bash
# Install cert-manager CRDs
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0
```

Verify the installation:

```bash
kubectl get pods -n cert-manager
kubectl get crd | grep cert-manager
```

You should see three cert-manager pods running and several custom resource definitions installed.

## Configuring an ACME Issuer for Let's Encrypt

Create a ClusterIssuer for Let's Encrypt certificates. This issuer works across all namespaces:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: istio
    - dns01:
        cloudflare:
          email: ops@example.com
          apiTokenSecretRef:
            name: cloudflare-api-token
            key: api-token
```

The http01 solver validates domain ownership by serving a challenge file. The dns01 solver works better for wildcard certificates but requires DNS provider credentials.

Create the Cloudflare API token secret if using dns01:

```bash
kubectl create secret generic cloudflare-api-token \
  -n cert-manager \
  --from-literal=api-token=your-cloudflare-token
```

## Provisioning Certificates for Istio Ingress Gateway

Create a Certificate resource that cert-manager will provision and inject into Istio:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-gateway-cert
  namespace: istio-system
spec:
  secretName: api-gateway-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - "*.api.example.com"
```

Cert-manager requests the certificate from Let's Encrypt and stores it in the `api-gateway-tls` secret. Monitor certificate status:

```bash
kubectl get certificate -n istio-system api-gateway-cert
kubectl describe certificate -n istio-system api-gateway-cert
```

Once ready, the certificate appears in the secret:

```bash
kubectl get secret -n istio-system api-gateway-tls
```

## Configuring Istio Gateway to Use the Certificate

Reference the cert-manager-provisioned certificate in your Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
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
      credentialName: api-gateway-tls
    hosts:
    - api.example.com
    - "*.api.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - api.example.com
    redirect:
      httpsRedirect: true
```

The credentialName must match the Certificate's secretName. Istio automatically loads the certificate from the secret. When cert-manager renews the certificate, Istio picks up the change without gateway restarts.

## Automating Certificate Rotation

Cert-manager automatically renews certificates before expiration. Configure renewal settings in the Certificate resource:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-gateway-cert
  namespace: istio-system
spec:
  secretName: api-gateway-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  renewBefore: 720h  # Renew 30 days before expiration
  duration: 2160h    # Certificate valid for 90 days
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always
```

The renewBefore field triggers renewal 30 days before expiration, providing ample time for troubleshooting if renewal fails. Setting rotationPolicy to Always generates a new private key with each renewal, following security best practices.

Monitor certificate expiration with Prometheus metrics:

```promql
# Certificate expiration time in seconds
certmanager_certificate_expiration_timestamp_seconds{name="api-gateway-cert"}

# Time until renewal
(certmanager_certificate_expiration_timestamp_seconds - time()) < 30*24*3600
```

Alert when certificates approach renewal time without successful updates.

## Using cert-manager for Istio's Internal CA

Replace Istio's self-signed CA with a cert-manager-managed CA for compliance scenarios:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  secretName: istio-ca-secret
  issuerRef:
    name: corporate-ca-issuer
    kind: ClusterIssuer
  isCA: true
  commonName: Istio CA
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year before expiration
```

Configure Istio to use this CA during installation:

```bash
istioctl install --set values.pilot.env.CITADEL_ENABLE_NAMESPACED_CA=false \
  --set values.global.caAddress="cert-manager-istio-csr.cert-manager.svc:443"
```

This requires the cert-manager CSR controller for Istio, which bridges Istio's certificate requests to cert-manager:

```bash
helm install cert-manager-istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set app.certmanager.issuer.name=corporate-ca-issuer \
  --set app.certmanager.issuer.kind=ClusterIssuer \
  --set app.server.maxCertificateDuration=48h
```

Now Istio workload certificates come from your corporate CA through cert-manager, maintaining the same automatic rotation Istio provides.

## Managing Multiple Gateways with Different Certificates

Large deployments often need separate certificates for different services:

```yaml
# Certificate for public API
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: public-api-cert
  namespace: istio-system
spec:
  secretName: public-api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
---
# Certificate for admin portal
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: admin-portal-cert
  namespace: istio-system
spec:
  secretName: admin-portal-tls
  issuerRef:
    name: corporate-ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - admin.example.com
---
# Gateway for public API
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: public-api-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https-public
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: public-api-tls
    hosts:
    - api.example.com
---
# Gateway for admin portal
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: admin-portal-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https-admin
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: admin-portal-tls
    hosts:
    - admin.example.com
```

Each gateway references its own certificate. The ingress gateway pod mounts all secrets and serves the appropriate certificate based on SNI.

## Implementing Certificate Pinning

For critical services, implement certificate pinning by monitoring the certificate's public key:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pinned-certificates
  namespace: istio-system
data:
  api.example.com.pin: |
    # SHA256 hash of the certificate's public key
    sha256/x3mJKISTKXW9z7aJt+Wt9l2pW8EbV3L5nJ8vQ2dR3cU=
```

Applications can verify the pinned key matches the served certificate. Update this ConfigMap during certificate rotation.

## Troubleshooting Certificate Issues

When certificates do not provision correctly, check several areas. First, review cert-manager logs:

```bash
kubectl logs -n cert-manager -l app=cert-manager -f
```

Look for errors related to ACME challenges or issuer configuration.

Check certificate status:

```bash
kubectl describe certificate -n istio-system api-gateway-cert
```

The Events section shows the certificate request progress. Common failures include DNS propagation delays for dns01 challenges or firewall issues blocking http01 validation.

Verify the secret exists and contains valid data:

```bash
kubectl get secret -n istio-system api-gateway-tls -o yaml
```

The secret should have `tls.crt` and `tls.key` fields. Decode the certificate to verify it:

```bash
kubectl get secret -n istio-system api-gateway-tls -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -text -noout
```

Check the certificate's subject, validity dates, and SAN entries match your expectations.

## Monitoring Certificate Health

Create ServiceMonitor resources for cert-manager metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  selector:
    matchLabels:
      app: cert-manager
  endpoints:
  - port: tcp-prometheus-servicemonitor
    interval: 60s
```

Query certificate metrics in Prometheus:

```promql
# Certificates expiring in 7 days
(certmanager_certificate_expiration_timestamp_seconds - time()) < 7*24*3600

# Failed certificate requests
rate(certmanager_certificate_request_count{condition="False"}[5m]) > 0

# Certificate ready status
certmanager_certificate_ready_status{condition="True"} == 0
```

Set up alerts for expiring certificates and failed renewals to catch issues before they impact traffic.

## Performance Considerations

Cert-manager adds minimal overhead to certificate operations. Certificate requests happen infrequently - only during initial provisioning and renewal. Once provisioned, certificates live in Kubernetes secrets with no runtime performance impact.

The cert-manager controller watches Certificate resources and Secret objects. In large clusters with thousands of certificates, consider resource limits:

```yaml
apiVersion: v1
kind: Deployment
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  template:
    spec:
      containers:
      - name: cert-manager
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Monitor cert-manager pod resource usage and adjust limits as needed. The controller is generally lightweight but memory usage increases with certificate count.

Integrating cert-manager with Istio provides production-grade certificate management with minimal operational overhead. Automatic renewal, broad CA support, and native Kubernetes integration make it the standard solution for Istio TLS certificate lifecycle management.
