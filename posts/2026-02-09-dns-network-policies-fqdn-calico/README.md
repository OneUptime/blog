# How to Implement DNS-Based Network Policies with FQDN Rules in Calico

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Calico, DNS

Description: Configure Calico network policies using FQDN matching to control egress traffic based on domain names instead of IP addresses, enabling flexible external service access control that adapts to DNS changes automatically.

---

Standard Kubernetes network policies use IP addresses and CIDR ranges to control traffic. This creates problems when targeting external services with dynamic IP addresses. Calico's FQDN-based network policies allow you to specify domain names directly, letting Calico resolve DNS and automatically update firewall rules as IP addresses change.

## Why FQDN Policies Matter

External services like SaaS APIs, cloud services, and CDNs use dynamic IP addresses that change frequently. Maintaining network policies with hardcoded IP addresses becomes unmanageable. You need to:

- Track IP address changes for dozens of external services
- Update policies whenever IPs change
- Handle services with hundreds of IP addresses (like AWS S3)
- Support geographically distributed services with regional IPs

FQDN policies solve this by matching on domain names. Calico resolves the DNS, extracts IP addresses, and updates eBPF/iptables rules automatically.

## Prerequisites

Ensure Calico is installed with DNS policy support:

```bash
# Check if DNS policy is enabled
kubectl get felixconfiguration default -o yaml | grep DNSPolicy
```

If not enabled, configure it:

```bash
calicoctl patch felixconfiguration default --patch '{"spec":{"DNSPolicyMode":"Enabled"}}'
```

## Basic FQDN Egress Policy

Allow pods to access a specific external API:

```yaml
# fqdn-basic-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-github-api
  namespace: default
spec:
  selector: app == "backend"
  types:
  - Egress
  egress:
  # Allow access to GitHub API
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.github.com"
      ports:
      - 443
  # Allow DNS resolution
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

Apply the policy:

```bash
calicoctl apply -f fqdn-basic-policy.yaml
```

Test from a pod:

```bash
kubectl run backend --image=curlimages/curl -it --rm -- sh
# Inside pod
curl https://api.github.com  # Allowed
curl https://api.gitlab.com  # Blocked
```

## Wildcard Domain Matching

Allow access to all subdomains:

```yaml
# fqdn-wildcard-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-aws-services
  namespace: production
spec:
  selector: app == "application"
  types:
  - Egress
  egress:
  # Allow all AWS S3 endpoints
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "*.s3.amazonaws.com"
      - "*.s3.*.amazonaws.com"  # Regional endpoints
      ports:
      - 443
  # Allow AWS DynamoDB
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "dynamodb.*.amazonaws.com"
      ports:
      - 443
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

## Multiple FQDN Rules

Create policies for multiple external services:

```yaml
# fqdn-multi-service-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-external-apis
  namespace: backend
spec:
  selector: tier == "application"
  types:
  - Egress
  egress:
  # Payment gateway
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.stripe.com"
      ports:
      - 443
  # Email service
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.sendgrid.com"
      ports:
      - 587
      - 465
  # Cloud storage
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "*.blob.core.windows.net"  # Azure Blob Storage
      - "storage.googleapis.com"   # Google Cloud Storage
      ports:
      - 443
  # CDN
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "*.cloudfront.net"
      ports:
      - 443
  # DNS resolution
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

## Environment-Specific FQDN Policies

Use different domains for production and staging:

```yaml
# fqdn-production-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: production-external-access
  namespace: production
spec:
  selector: all()
  types:
  - Egress
  egress:
  # Production API endpoints
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.production-service.com"
      - "db.production-service.com"
      ports:
      - 443
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
---
# fqdn-staging-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: staging-external-access
  namespace: staging
spec:
  selector: all()
  types:
  - Egress
  egress:
  # Staging API endpoints
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.staging-service.com"
      - "db.staging-service.com"
      ports:
      - 443
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

## Combining FQDN and IP-Based Rules

Mix domain-based and IP-based egress controls:

```yaml
# fqdn-combined-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: mixed-egress-policy
  namespace: default
spec:
  selector: app == "backend"
  types:
  - Egress
  egress:
  # Allow FQDN-based access
  - action: Allow
    protocol: TCP
    destination:
      domains:
      - "api.external-service.com"
      ports:
      - 443
  # Allow IP-based access to legacy service
  - action: Allow
    protocol: TCP
    destination:
      nets:
      - 203.0.113.0/24
      ports:
      - 8080
  # Allow access to other pods in cluster
  - action: Allow
    destination:
      selector: tier == "database"
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

## Global FQDN Policy

Apply FQDN rules cluster-wide:

```yaml
# global-fqdn-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-approved-external-services
spec:
  order: 100
  selector: has(app)
  types:
  - Egress
  egress:
  # Allow access to approved cloud services
  - action: Allow
    protocol: TCP
    destination:
      domains:
      # Monitoring services
      - "*.datadog.com"
      - "*.newrelic.com"
      # Authentication
      - "*.auth0.com"
      - "*.okta.com"
      # Cloud providers
      - "*.amazonaws.com"
      - "*.azure.com"
      - "*.googleapis.com"
      ports:
      - 443
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

## Monitoring FQDN Resolution

Check DNS lookups performed by Calico:

```bash
# View DNS policy logs
kubectl logs -n calico-system -l k8s-app=calico-node | grep DNS

# Check which IPs are resolved for a domain
kubectl logs -n calico-system -l k8s-app=calico-node | grep "api.github.com"
```

Enable more verbose DNS logging:

```bash
calicoctl patch felixconfiguration default --patch '{"spec":{"LogSeverityScreen":"Debug"}}'
```

## Handling DNS TTL and Caching

Calico respects DNS TTL values and updates IP mappings when they expire. For domains with short TTLs, this happens frequently. For long TTLs, updates are less frequent.

Force DNS refresh by restarting Calico pods:

```bash
kubectl rollout restart ds/calico-node -n calico-system
```

Configure DNS cache settings:

```bash
calicoctl patch felixconfiguration default --patch '{
  "spec": {
    "DNSPolicyMaxTTL": "3600",  # Maximum cache time in seconds
    "DNSPolicyMinTTL": "60"     # Minimum cache time
  }
}'
```

## Debugging FQDN Policy Issues

Test DNS resolution from a pod:

```bash
kubectl exec -it backend-pod -- nslookup api.github.com
kubectl exec -it backend-pod -- dig api.github.com
```

Verify Calico has resolved the domain:

```bash
# Check Calico's DNS cache
kubectl exec -n calico-system -it calico-node-<id> -- calico-node -felix-live
```

Test connectivity:

```bash
# Should succeed if policy allows
kubectl exec -it backend-pod -- curl -v https://api.github.com

# Should fail if policy blocks
kubectl exec -it backend-pod -- curl -v https://blocked-domain.com
```

Check policy is applied to the pod:

```bash
calicoctl get networkpolicy -n default -o yaml
```

## Performance Considerations

FQDN policies have some performance characteristics:

- DNS resolution adds overhead when domains are first accessed
- Frequent DNS changes can cause policy update churn
- Large number of domains increases memory usage
- TTL expiration triggers policy recalculations

Optimize performance:

1. Use wildcard patterns to reduce policy count
2. Group related domains in single rules
3. Use longer TTLs when possible
4. Monitor Calico memory usage

```bash
kubectl top pods -n calico-system -l k8s-app=calico-node
```

## Security Best Practices

Follow these practices for secure FQDN policies:

**1. Use specific domains**: Avoid overly broad wildcards:

```yaml
# Good: Specific
domains:
- "api.service.com"
- "*.api.service.com"

# Risky: Too broad
domains:
- "*.com"
```

**2. Combine with default-deny**: Start with deny-all, then allow specific domains:

```yaml
# First, deny all egress
- action: Deny
  destination:
    nets:
    - 0.0.0.0/0

# Then allow specific domains
- action: Allow
  destination:
    domains:
    - "approved-service.com"
```

**3. Monitor DNS requests**: Alert on unexpected domains:

```bash
# Monitor for suspicious DNS queries
kubectl logs -n calico-system -l k8s-app=calico-node | \
  grep "DNS" | grep -v "api.github.com|api.stripe.com"
```

**4. Document approved domains**: Maintain a list of allowed external services:

```yaml
metadata:
  annotations:
    description: "Allows access to payment gateway and email service"
    approved-by: "security-team@example.com"
    domains: "api.stripe.com, api.sendgrid.com"
```

## Limitations

FQDN policies have some limitations:

- Only work for egress traffic
- Require DNS resolution (won't work for direct IP access)
- Don't support port ranges in all versions
- May have issues with very short TTLs (< 10s)
- Don't work with services using IP-based protocols (FTP active mode)

For these cases, use IP-based policies or consider service mesh alternatives.

FQDN-based network policies in Calico provide flexible control over egress traffic to external services without hardcoding IP addresses. Use them to allow access to SaaS APIs, cloud services, and any external dependency that uses DNS. The automatic IP resolution and updates make policies maintainable as external service IPs change, while providing the security benefits of explicit allow-listing.
