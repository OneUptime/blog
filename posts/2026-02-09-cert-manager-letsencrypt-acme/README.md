# How to Deploy cert-manager with Let's Encrypt ACME for Automated TLS Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Certificates

Description: Learn how to deploy cert-manager with Let's Encrypt ACME protocol to automate TLS certificate issuance and renewal in Kubernetes clusters with practical examples.

---

Managing TLS certificates manually in Kubernetes is tedious and error-prone. You need to generate certificates, store them as secrets, track expiration dates, and renew them before they expire. Miss a renewal deadline and your services go down. This is where cert-manager comes in.

cert-manager is a Kubernetes native certificate management controller that automates the issuance and renewal of certificates from various sources. When integrated with Let's Encrypt using the ACME (Automated Certificate Management Environment) protocol, it provides free, automated TLS certificates that renew themselves without manual intervention.

## Understanding cert-manager and ACME

cert-manager extends Kubernetes with custom resources for certificate management. It watches for Certificate resources, validates domain ownership through ACME challenges, and stores the issued certificates as Kubernetes secrets. Let's Encrypt provides free TLS certificates valid for 90 days, and cert-manager handles renewal automatically before expiration.

The ACME protocol defines how certificate authorities communicate with applicants to verify domain ownership. cert-manager supports two primary challenge types: HTTP-01 (validates via HTTP endpoint) and DNS-01 (validates via DNS records). We'll explore both in this guide.

## Installing cert-manager

First, install cert-manager in your cluster using kubectl. The official installation method uses a single manifest file that includes all necessary resources.

```yaml
# Install cert-manager CRDs and controller
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Verify the installation
kubectl get pods -n cert-manager

# Expected output:
# NAME                                       READY   STATUS    RESTARTS   AGE
# cert-manager-5d7f97b46d-xyzab              1/1     Running   0          1m
# cert-manager-cainjector-69d7cb5d8f-abcde   1/1     Running   0          1m
# cert-manager-webhook-8677fdc9f-fghij       1/1     Running   0          1m
```

The installation creates three main components:
- cert-manager controller: watches Certificate resources and manages issuance
- cert-manager-cainjector: injects CA bundles into webhooks and API services
- cert-manager-webhook: validates cert-manager custom resources

## Creating a Let's Encrypt Issuer

An Issuer is a namespaced resource that defines a certificate authority from which certificates can be obtained. For cluster-wide issuance, use ClusterIssuer instead (covered in the next article). Let's create a Let's Encrypt staging issuer first.

```yaml
# letsencrypt-staging-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-staging
  namespace: default
spec:
  acme:
    # The ACME server URL for Let's Encrypt staging environment
    # Use this for testing to avoid rate limits
    server: https://acme-staging-v02.api.letsencrypt.org/directory

    # Email address used for ACME registration
    # Let's Encrypt will send expiration notices here
    email: your-email@example.com

    # Name of the secret used to store ACME account private key
    privateKeySecretRef:
      name: letsencrypt-staging-account-key

    # Enable HTTP-01 challenge solver
    solvers:
    - http01:
        ingress:
          # Use the default ingress class
          class: nginx
```

Apply the issuer configuration:

```bash
kubectl apply -f letsencrypt-staging-issuer.yaml

# Check issuer status
kubectl describe issuer letsencrypt-staging -n default

# The issuer should show "Ready" condition as True
```

The staging environment allows testing without hitting Let's Encrypt rate limits (50 certificates per registered domain per week for production). Once you confirm everything works, create a production issuer.

## Creating a Production Issuer

The production issuer configuration is nearly identical, but points to the production ACME server:

```yaml
# letsencrypt-prod-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-prod
  namespace: default
spec:
  acme:
    # Production ACME server URL
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply the production issuer:

```bash
kubectl apply -f letsencrypt-prod-issuer.yaml
kubectl get issuers -n default
```

## Requesting Your First Certificate

Now that we have an issuer configured, request a certificate by creating a Certificate resource:

```yaml
# example-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: default
spec:
  # Name of the secret where certificate will be stored
  secretName: example-com-tls-secret

  # Certificate validity duration (Let's Encrypt issues 90-day certs)
  duration: 2160h # 90 days

  # Renew certificate 30 days before expiration
  renewBefore: 720h # 30 days

  # Reference to the issuer
  issuerRef:
    name: letsencrypt-staging
    kind: Issuer

  # Common name for the certificate
  commonName: example.com

  # Subject Alternative Names
  dnsNames:
  - example.com
  - www.example.com
```

Apply the certificate request:

```bash
kubectl apply -f example-certificate.yaml

# Watch certificate issuance progress
kubectl get certificate -n default -w

# Check certificate details
kubectl describe certificate example-com-tls -n default

# View the stored secret
kubectl get secret example-com-tls-secret -n default -o yaml
```

cert-manager creates a temporary pod and service to complete the HTTP-01 challenge. Let's Encrypt verifies domain ownership by accessing a specific path on your domain, and once validated, issues the certificate.

## Using Certificates with Ingress

The most common use case is securing Ingress resources with TLS. You can either create a Certificate manually (as above) or let cert-manager automatically create one based on Ingress annotations:

```yaml
# example-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  namespace: default
  annotations:
    # Tell cert-manager to create a certificate automatically
    cert-manager.io/issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - example.com
    - www.example.com
    # Reference the secret where cert-manager will store the certificate
    secretName: example-com-tls-secret
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: example-service
            port:
              number: 80
```

When you apply this Ingress, cert-manager automatically creates a Certificate resource, completes the ACME challenge, and stores the certificate in the specified secret. The Ingress controller then uses this secret for TLS termination.

## Monitoring Certificate Status

cert-manager provides detailed status information for troubleshooting:

```bash
# List all certificates and their status
kubectl get certificates --all-namespaces

# Check certificate events
kubectl describe certificate example-com-tls -n default

# View CertificateRequest resources (created during issuance)
kubectl get certificaterequest -n default

# Check Order resources (ACME-specific)
kubectl get order -n default

# View Challenge resources (ACME-specific)
kubectl get challenge -n default
```

If certificate issuance fails, check the Challenge and Order resources for error messages. Common issues include DNS not propagating, ingress misconfiguration, or firewall rules blocking HTTP-01 challenge paths.

## Automatic Renewal

cert-manager automatically renews certificates based on the renewBefore setting. By default, it attempts renewal 30 days before expiration. You can monitor renewal activity through certificate events:

```bash
# Watch for renewal events
kubectl get events --field-selector involvedObject.kind=Certificate -n default

# Check when the certificate was last renewed
kubectl get certificate example-com-tls -n default -o jsonpath='{.status.renewalTime}'
```

The renewal process is identical to initial issuance: cert-manager creates a new CertificateRequest, completes the ACME challenge, and updates the secret with the new certificate.

## Best Practices

Start with the staging environment to test your configuration. The staging environment has more lenient rate limits and helps you identify issues before using production certificates.

Use email addresses you actively monitor for ACME registration. Let's Encrypt sends important notifications about certificate expiration (as a backup in case auto-renewal fails) and changes to their service.

Set appropriate renewal windows. The default 30-day window provides plenty of buffer time. If renewal fails, cert-manager retries with exponential backoff, giving you time to address issues before certificates expire.

Monitor certificate expiration dates using Prometheus metrics (covered in a future article) or tools like OneUptime. While cert-manager handles renewal automatically, having external monitoring provides defense in depth.

Deploy cert-manager with high availability in production. Use multiple replicas and pod disruption budgets to ensure certificate operations continue during node maintenance or failures.

## Conclusion

cert-manager with Let's Encrypt ACME provides production-grade automated certificate management for Kubernetes. You no longer need to manually track certificate expiration dates or perform renewal ceremonies. Once configured, cert-manager handles the entire lifecycle, from initial issuance through automatic renewal.

This automation significantly reduces operational burden and eliminates the risk of expired certificates causing outages. Combined with proper monitoring, it provides a robust foundation for securing Kubernetes applications with TLS.
