# How to Configure cert-manager with External DNS for Automated DNS Record Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, TLS

Description: Learn how to integrate cert-manager with External DNS to automate DNS record creation and certificate issuance for dynamic Kubernetes services and ingresses.

---

DNS-01 challenges require creating DNS records for certificate validation. Manually managing DNS records for every certificate doesn't scale, especially in dynamic Kubernetes environments where services and ingresses change frequently. External DNS automates DNS record creation based on Kubernetes resources, and when combined with cert-manager, provides end-to-end automation from service creation to certificate issuance.

This integration enables truly dynamic certificate management where creating an Ingress automatically provisions DNS records and TLS certificates without manual intervention.

## Understanding the Integration Flow

The workflow combines External DNS and cert-manager:

1. Create an Ingress with a hostname
2. External DNS detects the Ingress and creates DNS records
3. cert-manager detects the Ingress annotation for certificate management
4. cert-manager initiates certificate request with DNS-01 challenge
5. DNS records already exist (created by External DNS), challenge succeeds
6. cert-manager stores certificate in secret referenced by Ingress

This seamless integration eliminates manual DNS management for certificate validation.

## Installing External DNS

Install External DNS configured for your DNS provider. This example uses AWS Route53:

```bash
# Create service account for External DNS
kubectl create serviceaccount external-dns -n kube-system

# Create IAM policy for Route53 access (same as cert-manager Route53 policy)
# Bind policy to service account using IRSA

# Install External DNS
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=ingress
        - --source=service
        - --provider=aws
        - --aws-zone-type=public
        - --registry=txt
        - --txt-owner-id=kubernetes-cluster
        - --log-level=info
EOF
```

Verify External DNS installation:

```bash
kubectl get pods -n kube-system -l app=external-dns
kubectl logs -n kube-system -l app=external-dns
```

## Configuring cert-manager for DNS-01

Set up cert-manager with DNS-01 challenge support (assuming Route53):

```yaml
# letsencrypt-dns01-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns01
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-dns01-account-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          # Use IRSA for authentication
```

Apply the issuer:

```bash
kubectl apply -f letsencrypt-dns01-issuer.yaml
kubectl get clusterissuer letsencrypt-dns01
```

## Automated Ingress with DNS and Certificates

Create an Ingress that triggers both DNS record creation and certificate issuance:

```yaml
# auto-provisioned-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    # Tell External DNS to create DNS records
    external-dns.alpha.kubernetes.io/hostname: app.example.com

    # Tell cert-manager to issue certificate
    cert-manager.io/cluster-issuer: "letsencrypt-dns01"

    # Ingress class
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
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

Apply the Ingress:

```bash
kubectl apply -f auto-provisioned-ingress.yaml

# Watch DNS record creation
watch -n 5 'dig app.example.com'

# Monitor certificate issuance
kubectl get certificate -n production -w

# Check both DNS and certificate status
kubectl describe ingress app-ingress -n production
kubectl describe certificate app-example-com-tls -n production
```

Within minutes, External DNS creates the DNS A record, and cert-manager issues the certificate using DNS-01 validation.

## Multiple Domains with Wildcard Certificates

Combine External DNS and wildcard certificates for dynamic subdomains:

```yaml
# wildcard-ingress-setup.yaml
---
# Wildcard certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: production
spec:
  secretName: wildcard-example-com-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-dns01
    kind: ClusterIssuer

  commonName: "*.example.com"
  dnsNames:
  - "*.example.com"
  - "example.com"
---
# Ingress using wildcard certificate
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.example.com
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: wildcard-example-com-tls
  rules:
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
---
# Another ingress using same wildcard certificate
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: dashboard.example.com
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - dashboard.example.com
    secretName: wildcard-example-com-tls
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

External DNS creates DNS records for both api.example.com and dashboard.example.com, and both use the same wildcard certificate.

## LoadBalancer Services with External DNS

External DNS also works with LoadBalancer services:

```yaml
# loadbalancer-with-dns.yaml
apiVersion: v1
kind: Service
metadata:
  name: external-service
  namespace: production
  annotations:
    # Create DNS record for this service
    external-dns.alpha.kubernetes.io/hostname: service.example.com
spec:
  type: LoadBalancer
  selector:
    app: external-service
  ports:
  - port: 443
    targetPort: 8443
    name: https
```

Then create a certificate for the service:

```yaml
# loadbalancer-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: external-service-cert
  namespace: production
spec:
  secretName: external-service-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-dns01
    kind: ClusterIssuer

  dnsNames:
  - service.example.com
```

The service gets a DNS record and certificate automatically.

## Dynamic Environment-Based DNS

Use External DNS with environment-specific domains:

```yaml
# dev-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: development
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.dev.example.com
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
    external-dns.alpha.kubernetes.io/hostname: app.example.com
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

Each environment gets appropriate DNS records and certificates automatically.

## DNS Record TTL Configuration

Configure DNS record TTL through External DNS annotations:

```yaml
# ingress-with-ttl.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.example.com
    # Set DNS TTL to 60 seconds for faster updates
    external-dns.alpha.kubernetes.io/ttl: "60"
    cert-manager.io/cluster-issuer: "letsencrypt-dns01"
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

Lower TTLs enable faster DNS updates but increase DNS query costs.

## Monitoring DNS and Certificate Status

Monitor both DNS records and certificates:

```bash
# Check External DNS logs
kubectl logs -n kube-system -l app=external-dns -f

# Verify DNS records created
dig app.example.com

# Check DNS records in Route53
aws route53 list-resource-record-sets --hosted-zone-id YOUR-ZONE-ID

# Monitor certificate status
kubectl get certificate --all-namespaces

# Check certificate details
kubectl describe certificate app-example-com-tls -n production
```

Create alerts for DNS and certificate issues:

```yaml
# dns-cert-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dns-cert-alerts
spec:
  groups:
  - name: dns-certificate
    rules:
    - alert: DNSRecordMissing
      expr: |
        external_dns_registry_errors_total > 0
      labels:
        severity: warning
      annotations:
        summary: "External DNS errors detected"

    - alert: CertificateNotReady
      expr: |
        certmanager_certificate_ready_status == 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} not ready"
```

## Handling DNS Propagation Delays

DNS propagation takes time. Configure cert-manager to wait appropriately:

```yaml
# issuer-with-propagation-timeout.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns01-patient
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-dns01-patient-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
        # Additional DNS-01 specific settings
        cnameStrategy: Follow
```

cert-manager automatically waits for DNS propagation before presenting challenges to Let's Encrypt.

## Troubleshooting Integration Issues

### DNS Record Not Created

```bash
# Check External DNS logs
kubectl logs -n kube-system -l app=external-dns

# Verify Ingress annotation
kubectl get ingress <ingress-name> -o yaml | grep external-dns

# Check DNS provider permissions
# Ensure External DNS has permissions to create records
```

### Certificate Issuance Fails

```bash
# Check if DNS record exists
dig <domain-name>

# Verify DNS record points to correct target
# For Ingress, should point to LoadBalancer IP

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# View challenge details
kubectl get challenge --all-namespaces
kubectl describe challenge <challenge-name>
```

### DNS and Certificate Out of Sync

```bash
# Delete and recreate Ingress to sync
kubectl delete ingress <ingress-name>
kubectl apply -f <ingress-file>

# Or force External DNS resync
kubectl delete pod -n kube-system -l app=external-dns

# Force cert-manager renewal
kubectl delete secret <cert-secret-name>
```

## Best Practices

Use descriptive hostname annotations for clarity. This helps track which Ingress created which DNS record.

Set appropriate DNS TTLs based on service stability. Lower TTLs for frequently changing services, higher TTLs for stable production services.

Monitor External DNS and cert-manager logs for errors. Early detection prevents certificate and DNS issues.

Use staging issuers for development environments. This avoids hitting Let's Encrypt rate limits during testing.

Implement proper RBAC for External DNS and cert-manager. Limit permissions to required resources and operations.

Test the integration in development before production. Verify DNS creation and certificate issuance work correctly.

Use wildcard certificates for dynamic subdomain environments. This reduces certificate management overhead.

## Advanced Configuration

### External DNS with Multiple Providers

Configure External DNS to manage multiple DNS providers:

```yaml
# external-dns-multi-provider.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-aws
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=ingress
        - --provider=aws
        - --domain-filter=example.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-cloudflare
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=ingress
        - --provider=cloudflare
        - --domain-filter=example.net
```

Each deployment manages a different DNS provider/domain.

## Conclusion

Integrating cert-manager with External DNS provides complete automation for DNS and certificate management in Kubernetes. From Ingress creation to DNS provisioning to certificate issuance, the entire workflow happens automatically without manual intervention.

This integration is essential for dynamic Kubernetes environments where services change frequently. It eliminates operational toil while ensuring services are always accessible via DNS with valid TLS certificates. Combined with proper monitoring and alerting, it delivers production-ready, fully automated DNS and certificate management.
