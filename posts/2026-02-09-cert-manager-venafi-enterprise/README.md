# How to Configure cert-manager with Venafi as an Enterprise Certificate Issuer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Enterprise

Description: Learn how to integrate cert-manager with Venafi Trust Protection Platform or Venafi as a Service for enterprise PKI management and compliance-driven certificate issuance.

---

Enterprise organizations often require sophisticated certificate management with strict governance, compliance tracking, and centralized policy enforcement. Venafi provides enterprise-grade PKI management that cert-manager can integrate with, combining Venafi's policy controls with Kubernetes-native certificate automation.

Venafi offers two products: Trust Protection Platform (TPP) for on-premises deployments and Venafi as a Service (VaaS) for cloud-based certificate management. Both integrate with cert-manager to provide automated certificate issuance while maintaining enterprise security and compliance requirements.

This integration enables organizations to adopt Kubernetes and containerization while preserving existing PKI investments and meeting regulatory requirements for certificate management.

## Understanding Venafi Integration Benefits

Integrating cert-manager with Venafi provides:

Centralized policy enforcement across all certificate requests. Venafi policies control certificate parameters like key algorithms, validity periods, and subject information, ensuring consistency across your infrastructure.

Comprehensive audit logging for compliance requirements. Every certificate request, issuance, and renewal is logged with full context for security audits and regulatory compliance.

Certificate lifecycle visibility across hybrid environments. Venafi provides a single pane of glass for certificates whether issued for Kubernetes, VMs, or legacy systems.

Integration with enterprise CAs like Microsoft CA, Entrust, and DigiCert. Venafi acts as a broker between cert-manager and your organization's approved certificate authorities.

## Prerequisites

You need:
- Kubernetes cluster with cert-manager installed
- Venafi TPP instance or VaaS account
- API credentials for Venafi (API key for VaaS, or username/password for TPP)
- Venafi policy folder configured for Kubernetes certificates

## Configuring Venafi TPP Integration

For Venafi Trust Protection Platform deployments, start by creating credentials:

```bash
# Create secret with TPP credentials
kubectl create secret generic venafi-tpp-credentials \
  --from-literal=username='tpp-user@example.com' \
  --from-literal=password='your-tpp-password' \
  -n cert-manager
```

Create an Issuer referencing Venafi TPP:

```yaml
# venafi-tpp-issuer.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: venafi-tpp-issuer
  namespace: production
spec:
  venafi:
    # Venafi TPP zone (policy folder path)
    zone: "Kubernetes\\Production"

    # TPP server URL
    tpp:
      url: https://tpp.example.com/vedsdk

      # Reference to credentials secret
      credentialsRef:
        name: venafi-tpp-credentials

      # CA bundle if TPP uses private certificates
      caBundle: <base64-encoded-ca-cert>
```

For cluster-wide certificate issuance, create a ClusterIssuer:

```yaml
# venafi-tpp-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-tpp-issuer
spec:
  venafi:
    zone: "Kubernetes\\Production"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Apply the configuration:

```bash
kubectl apply -f venafi-tpp-clusterissuer.yaml

# Verify issuer status
kubectl get clusterissuer venafi-tpp-issuer
kubectl describe clusterissuer venafi-tpp-issuer
```

## Configuring Venafi as a Service Integration

For Venafi as a Service (cloud-based), use API key authentication:

```bash
# Create secret with VaaS API key
kubectl create secret generic venafi-vaas-credentials \
  --from-literal=apikey='your-vaas-api-key' \
  -n cert-manager
```

Create a ClusterIssuer for VaaS:

```yaml
# venafi-vaas-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-vaas-issuer
spec:
  venafi:
    # VaaS zone (application name)
    zone: "Kubernetes Production"

    # VaaS cloud configuration
    cloud:
      # VaaS API URL
      url: https://api.venafi.cloud/v1

      # Reference to API key secret
      apiTokenSecretRef:
        name: venafi-vaas-credentials
        key: apikey
```

Apply the configuration:

```bash
kubectl apply -f venafi-vaas-clusterissuer.yaml

# Verify issuer is ready
kubectl get clusterissuer venafi-vaas-issuer
```

## Requesting Certificates from Venafi

Request certificates that comply with Venafi policies:

```yaml
# venafi-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-venafi-cert
  namespace: production
spec:
  # Secret to store certificate
  secretName: app-venafi-tls

  # Certificate parameters (must comply with Venafi policy)
  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  # Reference to Venafi issuer
  issuerRef:
    name: venafi-tpp-issuer
    kind: ClusterIssuer

  # Certificate subject (validated against Venafi policy)
  commonName: app.example.com

  # Subject information
  subject:
    organizations:
    - "Example Corporation"
    organizationalUnits:
    - "IT Department"
    countries:
    - "US"
    provinces:
    - "California"
    localities:
    - "San Francisco"

  # DNS names
  dnsNames:
  - app.example.com
  - app-prod.example.com

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048

  # Certificate usages
  usages:
  - digital signature
  - key encipherment
  - server auth
```

Apply the certificate request:

```bash
kubectl apply -f venafi-certificate.yaml

# Monitor certificate issuance
kubectl get certificate app-venafi-cert -w

# Check certificate status
kubectl describe certificate app-venafi-cert
```

Venafi validates the certificate request against configured policies. If the request violates policies (wrong key size, invalid subject, etc.), Venafi rejects it and cert-manager reports the error in the Certificate status.

## Working with Venafi Policy Zones

Venafi zones define certificate policies. Configure different zones for different environments:

```yaml
# Development environment issuer (relaxed policies)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-dev
spec:
  venafi:
    zone: "Kubernetes\\Development"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
---
# Production environment issuer (strict policies)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-prod
spec:
  venafi:
    zone: "Kubernetes\\Production"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
---
# External-facing issuer (public CA integration)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-external
spec:
  venafi:
    zone: "Kubernetes\\External"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Applications select the appropriate issuer based on environment and requirements.

## Custom Fields and Metadata

Pass additional metadata to Venafi for tracking and compliance:

```yaml
# certificate-with-metadata.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-with-metadata
  namespace: production
  # Annotations passed to Venafi as custom fields
  annotations:
    venafi.io/application: "Customer Portal"
    venafi.io/cost-center: "IT-1234"
    venafi.io/owner: "team-platform@example.com"
spec:
  secretName: app-with-metadata-tls
  issuerRef:
    name: venafi-tpp-issuer
    kind: ClusterIssuer
  commonName: portal.example.com
  dnsNames:
  - portal.example.com
```

Venafi stores these custom fields with the certificate, enabling reporting and cost allocation.

## Certificate Renewal with Venafi

cert-manager handles renewal automatically, requesting new certificates from Venafi before expiration:

```yaml
# auto-renewing-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: auto-renew-cert
  namespace: production
spec:
  secretName: auto-renew-tls

  # Certificate duration from Venafi
  duration: 2160h # 90 days

  # Renew 30 days before expiration
  renewBefore: 720h

  issuerRef:
    name: venafi-tpp-issuer
    kind: ClusterIssuer

  commonName: service.example.com
  dnsNames:
  - service.example.com

  # Private key rotation on renewal
  privateKey:
    rotationPolicy: Always
    algorithm: RSA
    size: 2048
```

Monitor renewal activity in Venafi:

```bash
# Check certificate renewal status
kubectl describe certificate auto-renew-cert -n production

# View renewal events
kubectl get events --field-selector involvedObject.name=auto-renew-cert -n production
```

Venafi logs all renewal requests, providing full audit trail of certificate lifecycle.

## Handling Policy Violations

When certificate requests violate Venafi policies, cert-manager reports errors:

```bash
# Check for policy violations
kubectl describe certificate <cert-name> -n <namespace>

# Example error:
# Message: Failed to request certificate: Venafi rejected request:
#   Key size 1024 violates policy (minimum 2048)
```

Common policy violations:
- Key size too small (e.g., 1024 when policy requires 2048)
- Invalid subject information (missing required fields)
- Unsupported key algorithm (e.g., RSA when policy requires ECDSA)
- Certificate duration exceeds maximum allowed
- DNS names don't match allowed patterns

Fix violations by adjusting Certificate specifications to match Venafi policies.

## Integrating with External CAs

Venafi can broker certificate requests to external CAs. Configure Venafi TPP to integrate with your organization's CA:

```yaml
# external-ca-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-digicert
spec:
  venafi:
    # Zone configured to use DigiCert integration
    zone: "Kubernetes\\DigiCert\\Production"
    tpp:
      url: https://tpp.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Certificates requested through this issuer are issued by DigiCert but managed through Venafi's policy and audit infrastructure.

## Monitoring and Reporting

Venafi provides comprehensive reporting on certificate inventory and compliance:

Access Venafi dashboard to view:
- All certificates issued for Kubernetes
- Certificate expiration timeline
- Policy compliance status
- Certificate usage by team/application
- Renewal success/failure rates

Export data for compliance reporting:

```bash
# Use Venafi API to extract certificate inventory
curl -X GET "https://tpp.example.com/vedsdk/Certificates" \
  -H "Authorization: Bearer $VENAFI_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.Certificates[] | select(.ManagedBy == "cert-manager")'
```

## High Availability Configuration

For production, configure multiple Venafi endpoints:

```yaml
# ha-venafi-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-ha-issuer
spec:
  venafi:
    zone: "Kubernetes\\Production"
    tpp:
      # Primary TPP URL
      url: https://tpp-primary.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Configure Venafi TPP in high availability mode with multiple servers behind a load balancer for reliability.

## Security Best Practices

Rotate Venafi credentials regularly:

```bash
# Update credentials secret
kubectl create secret generic venafi-tpp-credentials \
  --from-literal=username='tpp-user@example.com' \
  --from-literal=password='new-password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Use service accounts with minimal permissions. Grant cert-manager only the permissions needed to request and renew certificates in designated zones.

Enable audit logging in Venafi. Track all certificate operations for security monitoring and compliance.

Implement separate Venafi zones for different security domains (development, staging, production, external).

Use Kubernetes secrets encryption at rest to protect Venafi credentials.

## Troubleshooting Venafi Integration

Check connectivity to Venafi:

```bash
# Test from cert-manager pod
kubectl exec -it -n cert-manager deployment/cert-manager -- /bin/sh

# Test TPP connectivity
curl -k https://tpp.example.com/vedsdk

# Test VaaS connectivity
curl https://api.venafi.cloud/v1
```

Verify credentials:

```bash
# Check credentials secret
kubectl get secret venafi-tpp-credentials -n cert-manager -o yaml

# Verify credentials with Venafi API
curl -X POST "https://tpp.example.com/vedsdk/authorize" \
  -H "Content-Type: application/json" \
  -d '{"Username": "tpp-user@example.com", "Password": "your-password"}'
```

Check cert-manager logs for Venafi errors:

```bash
kubectl logs -n cert-manager deployment/cert-manager | grep -i venafi
```

## Best Practices

Start with Venafi staging/test zones before production. This allows testing policy compliance without affecting production certificates.

Document Venafi zone policies. Teams need to understand certificate requirements for each zone.

Implement monitoring for Venafi integration health. Alert on authentication failures or policy changes.

Use descriptive certificate names and metadata. This improves visibility in Venafi dashboards.

Regular review Venafi policies to ensure they match current security requirements.

## Conclusion

Integrating cert-manager with Venafi combines Kubernetes-native certificate automation with enterprise-grade PKI management. Organizations gain the benefits of automated certificate lifecycle management while maintaining the governance, compliance, and security controls required for enterprise environments.

This integration is essential for organizations with existing Venafi investments migrating to Kubernetes, or those requiring strict certificate governance and compliance tracking across hybrid infrastructure. The combination delivers enterprise-ready certificate management that scales from small deployments to large multi-cluster environments.
