# How to Handle DNS Migration for Flux Managed Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, DNS, Migration, External DNS

Description: Migrate DNS entries for services deployed by Flux CD using a zero-downtime approach with ExternalDNS and GitOps-managed Ingress configuration.

---

## Introduction

DNS migrations are required when services move between clusters, change their domain names, or when organizations consolidate multiple domains. In Flux-managed clusters, DNS records are often managed by ExternalDNS, which automatically creates and updates DNS records based on Kubernetes Service and Ingress annotations. This means DNS records are derived from Git-declared Ingress configurations — changing a domain is a GitOps operation.

The challenge with DNS migrations is the propagation delay. DNS changes take time to propagate (typically minutes to hours depending on TTL), and during this window some users resolve to the old address while others resolve to the new one. A well-executed migration runs both endpoints simultaneously during the transition window and uses decreasing TTLs to speed up propagation.

This guide covers the complete DNS migration workflow for Flux-managed services, including ExternalDNS setup, pre-migration TTL reduction, cutover, and cleanup.

## Prerequisites

- Flux CD v2 managing Ingress and Service resources
- ExternalDNS deployed via Flux for automated DNS management
- Access to your DNS provider (Route53, Cloudflare, or similar)
- The target domain verified and accessible from the cluster

## Step 1: Deploy ExternalDNS via Flux

If ExternalDNS is not already managing your DNS records, deploy it through Flux.

```yaml
# infrastructure/controllers/external-dns/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-dns
  namespace: external-dns
spec:
  interval: 10m
  chart:
    spec:
      chart: external-dns
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: external-dns
        namespace: flux-system
  values:
    provider: aws          # Or cloudflare, azure, etc.
    aws:
      region: us-east-1
      zoneType: public
    # Only manage records that have this annotation
    domainFilters:
      - acme.example.com
      - acme-new.example.com   # Include the target domain during migration
    txtOwnerId: my-cluster     # Unique identifier for this cluster's DNS records
    policy: sync               # sync removes records when Ingresses are deleted
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/external-dns
```

## Step 2: Reduce DNS TTL Before Migration

Lower the TTL on existing DNS records to minimize propagation delay during cutover.

```bash
# Check current TTL on the existing record
dig +short my-service.acme.example.com
dig my-service.acme.example.com | grep TTL

# If managing DNS via Terraform or another IaC tool, reduce TTL to 60 seconds
# If ExternalDNS manages the record, it uses 300s by default
# Reduce via annotation on the Ingress:
```

```yaml
# deploy/ingress.yaml — Add TTL annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    # Reduce TTL to 60 seconds for faster DNS propagation during migration
    external-dns.alpha.kubernetes.io/ttl: "60"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-service.acme.example.com
      secretName: my-service-tls
  rules:
    - host: my-service.acme.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

Wait at least the old TTL duration after reducing TTL before proceeding with the migration.

## Step 3: Add the New DNS Name to the Ingress

Run both the old and new DNS names simultaneously during the migration window.

```yaml
# deploy/ingress.yaml — Add new hostname alongside old
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    external-dns.alpha.kubernetes.io/ttl: "60"
    cert-manager.io/cluster-issuer: letsencrypt-production
spec:
  ingressClassName: nginx
  tls:
    # Certificate now covers both domains
    - hosts:
        - my-service.acme.example.com          # Old domain (keep during migration)
        - my-service.acme-new.example.com      # New domain (being introduced)
      secretName: my-service-tls
  rules:
    # Old domain — keep routing traffic
    - host: my-service.acme.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
    # New domain — start routing traffic
    - host: my-service.acme-new.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

Commit and push — ExternalDNS will create the new DNS record, cert-manager will issue a certificate covering both domains.

## Step 4: Verify the New Domain Before Removing the Old

```bash
# Verify the new domain is resolving correctly
dig my-service.acme-new.example.com

# Verify HTTPS is working on the new domain
curl -v https://my-service.acme-new.example.com/healthz

# Verify the service responds correctly
curl -s https://my-service.acme-new.example.com/api/v1/status | jq .

# Check that the certificate is valid for the new domain
echo | openssl s_client -servername my-service.acme-new.example.com \
  -connect my-service.acme-new.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates -subject
```

## Step 5: Update All Clients to Use the New Domain

Coordinate the client migration across your organization.

```bash
# Find all references to the old domain in your application repositories
grep -r "my-service.acme.example.com" --include="*.yaml" \
  --include="*.json" --include="*.env" \
  /path/to/application-repos/

# Create a tracking list of all places the old domain is referenced
# Update each reference to the new domain
# Submit PRs for each team to update their service configurations
```

Update any downstream services or configuration that reference the old domain:

```yaml
# Another service that calls my-service — update its environment variable
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dependent-service
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: MY_SERVICE_URL
              # Updated: was my-service.acme.example.com
              value: "https://my-service.acme-new.example.com"
```

## Step 6: Remove the Old Domain After Migration Period

After confirming all traffic has migrated (monitor access logs on the old domain):

```bash
# Check access logs for traffic on the old domain
kubectl logs -n ingress-nginx \
  deployment/ingress-nginx-controller \
  | grep "my-service.acme.example.com" \
  | tail -20

# If no traffic on old domain for 24+ hours, remove it from Git
```

```yaml
# deploy/ingress.yaml — Remove old domain after migration complete
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    # Restore normal TTL after migration
    external-dns.alpha.kubernetes.io/ttl: "300"
    cert-manager.io/cluster-issuer: letsencrypt-production
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-service.acme-new.example.com   # Only new domain remains
      secretName: my-service-tls
  rules:
    - host: my-service.acme-new.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

Commit and push — ExternalDNS will remove the old DNS record, cert-manager will renew the certificate with only the new domain.

## Best Practices

- Reduce TTL to 60 seconds at least one old-TTL period before any cutover to enable fast propagation
- Always run both old and new domains simultaneously during the migration window (minimum 24 hours)
- Monitor ingress access logs on the old domain before removing it — make the removal data-driven
- Use `external-dns.alpha.kubernetes.io/alias: "true"` for CNAME-based migrations to reduce propagation delay
- Test the new domain with synthetic monitoring before updating client configurations
- Add a redirect (301) from the old domain to the new domain before removing DNS, to help search engines and cached bookmarks

## Conclusion

DNS migrations for Flux-managed services are GitOps-native operations when ExternalDNS is in the stack. The migration follows a clear sequence: reduce TTL, add the new domain to the Ingress, verify it works, update clients, monitor old domain traffic, then remove the old domain. Because Ingress configuration lives in Git and ExternalDNS derives DNS records from it, the entire migration is tracked in version control with a clear audit trail of when each change was made and by whom.
