# How to Use cert-manager Annotations to Request Certificates for Ingress Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Networking

Description: Learn how to use cert-manager annotations on Ingress resources to automatically request and manage TLS certificates without creating separate Certificate objects.

---

cert-manager can automatically create Certificate resources based on Ingress annotations. This approach simplifies certificate management by consolidating Ingress and certificate configuration in a single resource. When you create or update an Ingress with cert-manager annotations, it automatically handles certificate issuance and renewal without additional Certificate objects.

This annotation-driven approach reduces configuration duplication, simplifies application deployment, and provides a more intuitive workflow for developers who think in terms of Ingresses rather than certificates.

## Understanding Ingress Annotation Workflow

The workflow for annotation-based certificate management:

1. Create Ingress with cert-manager annotations and TLS section
2. cert-manager ingress-shim controller detects the annotated Ingress
3. cert-manager creates a Certificate resource automatically
4. Certificate controller issues the certificate from configured issuer
5. Certificate is stored in the secret specified in Ingress TLS section
6. Ingress controller uses the certificate for TLS termination

All certificate lifecycle management (renewal, rotation) happens automatically based on the auto-created Certificate resource.

## Basic Ingress with cert-manager Annotation

Create an Ingress that automatically provisions certificates:

```yaml
# basic-annotated-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    # Tell cert-manager to manage this certificate
    cert-manager.io/cluster-issuer: "letsencrypt-prod"

    # Ingress class
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    # cert-manager will create/update this secret
    secretName: app-example-com-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Apply and observe:

```bash
kubectl apply -f basic-annotated-ingress.yaml

# cert-manager creates Certificate resource automatically
kubectl get certificate -n production

# Monitor certificate issuance
kubectl describe certificate app-example-com-tls -n production

# Verify secret created
kubectl get secret app-example-com-tls -n production
```

## Namespace-Scoped Issuer Annotation

Use namespace-scoped Issuer instead of ClusterIssuer:

```yaml
# namespaced-issuer-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    # Reference namespace-scoped Issuer
    cert-manager.io/issuer: "production-issuer"

    # Optionally specify issuer kind explicitly
    cert-manager.io/issuer-kind: "Issuer"

    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.production.example.com
    secretName: app-production-tls
  rules:
  - host: app.production.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

The Issuer must exist in the same namespace as the Ingress.

## Multiple Hostnames in Single Ingress

Handle multiple hosts with one certificate:

```yaml
# multi-host-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    - www.example.com
    - api.example.com
    # Single certificate covers all hosts
    secretName: multi-host-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: www.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

cert-manager creates a single certificate with all hosts as Subject Alternative Names.

## Multiple Certificates in Single Ingress

Use separate certificates for different host groups:

```yaml
# multiple-certs-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multiple-certs-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  # Certificate for main app
  - hosts:
    - app.example.com
    - www.example.com
    secretName: app-tls

  # Separate certificate for API
  - hosts:
    - api.example.com
    secretName: api-tls

  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

cert-manager creates two Certificate resources, one for each TLS section.

## Advanced Certificate Configuration via Annotations

Configure certificate parameters through Ingress annotations:

```yaml
# advanced-cert-config-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-config-ingress
  namespace: production
  annotations:
    # Issuer configuration
    cert-manager.io/cluster-issuer: "letsencrypt-prod"

    # Certificate duration (in hours)
    cert-manager.io/duration: "2160h" # 90 days

    # Renewal time before expiration (in hours)
    cert-manager.io/renew-before: "720h" # 30 days

    # Private key algorithm
    cert-manager.io/private-key-algorithm: "ECDSA"

    # Private key size
    cert-manager.io/private-key-size: "256"

    # Private key rotation policy
    cert-manager.io/private-key-rotation-policy: "Always"

    # Common name for certificate
    cert-manager.io/common-name: "app.example.com"

    # Ingress class
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-advanced-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

These annotations translate to Certificate spec fields.

## Using Different Issuers for Different Ingresses

Configure environment-specific issuers:

```yaml
# dev-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: development
  annotations:
    # Use staging issuer for development
    cert-manager.io/cluster-issuer: "letsencrypt-staging"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.dev.example.com
    secretName: app-dev-tls
  rules:
  - host: app.dev.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
---
# prod-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    # Use production issuer
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-prod-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Ingress Annotations with ACME DNS-01

Configure DNS-01 challenges via annotations:

```yaml
# dns01-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wildcard-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-dns01"

    # ACME challenge type is determined by issuer configuration
    # No need to specify challenge type in Ingress annotations

    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    - api.example.com
    secretName: wildcard-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

The ClusterIssuer configuration determines challenge type, not Ingress annotations.

## Disabling Automatic Certificate Creation

Prevent automatic certificate creation for specific Ingresses:

```yaml
# manual-cert-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: manual-cert-ingress
  namespace: production
  annotations:
    # Disable cert-manager automatic certificate creation
    cert-manager.io/issuer: ""

    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    # Reference manually created certificate secret
    secretName: manually-managed-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Use this when you manage Certificate resources separately from Ingress resources.

## Ingress Controller Specific Annotations

Different ingress controllers may require additional annotations:

### nginx Ingress

```yaml
# nginx-specific-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"

    # nginx-specific annotations
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: nginx-app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

### Traefik Ingress

```yaml
# traefik-specific-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: traefik-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"

    # Traefik-specific annotations
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - app.example.com
    secretName: traefik-app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Debugging Annotation-Based Certificates

When certificates don't issue automatically:

```bash
# Check if Certificate was created
kubectl get certificates -n <namespace>

# View Certificate details
kubectl describe certificate <cert-name> -n <namespace>

# Check cert-manager ingress-shim logs
kubectl logs -n cert-manager -l app=cert-manager -c cert-manager | grep ingress-shim

# Verify Ingress annotations
kubectl get ingress <ingress-name> -n <namespace> -o yaml | grep cert-manager

# Check for CertificateRequest
kubectl get certificaterequest -n <namespace>
```

Common issues:
- Missing or incorrect issuer annotation
- TLS section missing in Ingress spec
- Referenced issuer doesn't exist
- Ingress controller not compatible with cert-manager

## Migrating from Manual Certificates to Annotations

Migrate existing Certificate resources to annotation-based management:

```yaml
# Before: Manual Certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: manual-cert
  namespace: production
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
---
# Before: Ingress without annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
---
# After: Annotation-based (delete manual Certificate)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Migration steps:
1. Add cert-manager annotation to Ingress
2. cert-manager creates new Certificate resource
3. Verify new Certificate manages same secret
4. Delete old manually created Certificate resource

## Best Practices

Use annotation-based certificates for simple scenarios where Ingress and certificate configuration are tightly coupled.

Use explicit Certificate resources for complex scenarios requiring advanced configuration or when multiple Ingresses share certificates.

Use consistent naming conventions for secrets. Consider naming pattern like `<service>-<environment>-tls`.

Document issuer selection in annotations or commit messages. Future operators need to understand why specific issuers were chosen.

Monitor auto-created Certificate resources. Ensure they match expected configuration.

Use namespace-scoped Issuers when different teams manage different namespaces with different certificate policies.

Test annotation-based certificate creation in development before production deployment.

## Conclusion

Annotation-based certificate management simplifies the developer experience by consolidating Ingress and certificate configuration. For straightforward use cases, this approach reduces configuration overhead and makes certificate management more intuitive.

However, for complex scenarios requiring detailed certificate configuration, explicit Certificate resources provide more control and visibility. Choose the approach that best matches your operational model and complexity requirements. Many organizations use both approaches depending on the specific use case.
