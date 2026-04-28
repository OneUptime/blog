# How to Create a Kubernetes NetworkPolicy for IPv4 Egress CIDRs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NetworkPolicy, IPv4, Egress, Security, CIDR

Description: Write Kubernetes NetworkPolicy manifests to restrict outbound IPv4 connections from pods to only approved CIDRs, preventing data exfiltration and unauthorized access.

Egress NetworkPolicies control where pods can send traffic. This is critical for security - preventing compromised pods from connecting to external attackers, limiting database pods to only connect to expected backends, or restricting workloads to internal-only access.

## Basic Egress Policy: Allow Only Specific Destinations

```yaml
# restrict-egress-to-cidr.yaml

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress-database-pods
  namespace: production
spec:
  # Apply to database pods
  podSelector:
    matchLabels:
      role: database
  policyTypes:
  - Egress
  egress:
  # Allow egress only to the internal application subnet
  - to:
    - ipBlock:
        cidr: 10.100.0.0/24
    ports:
    - protocol: TCP
      port: 5432
  # Allow DNS (required for hostname resolution)
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

## Restricting Egress to Only Internal RFC 1918 Ranges

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: internal-only-egress
  namespace: default
spec:
  podSelector:
    matchLabels:
      security-tier: internal
  policyTypes:
  - Egress
  egress:
  # Allow only RFC 1918 private ranges
  - to:
    - ipBlock:
        cidr: 10.0.0.0/8
  - to:
    - ipBlock:
        cidr: 172.16.0.0/12
  - to:
    - ipBlock:
        cidr: 192.168.0.0/16
```

## Block Egress to Specific External IPs

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-specific-egress
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        # Allow all internet traffic
        cidr: 0.0.0.0/0
        # But block connections to known bad IPs
        except:
        - 203.0.113.0/24
        - 198.51.100.0/24
```

## Allow Egress to External API + Internal Services

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-egress-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
  - Egress
  egress:
  # Allow connections to payment gateway
  - to:
    - ipBlock:
        cidr: 1.2.3.4/32
    ports:
    - protocol: TCP
      port: 443
  # Allow internal database
  - to:
    - podSelector:
        matchLabels:
          role: database
    ports:
    - protocol: TCP
      port: 5432
  # Always allow DNS
  - ports:
    - protocol: UDP
      port: 53
```

## Testing Egress Restrictions

```bash
# Apply the policy
kubectl apply -f restrict-egress-to-cidr.yaml

# From a restricted pod, test that unauthorized connections fail
kubectl exec -it <database-pod> -- wget -q --timeout=5 http://example.com
# Should fail: Connection timed out

# Test that allowed connections work
kubectl exec -it <database-pod> -- nc -zv 10.100.0.5 5432
# Should succeed

# Check which connections are blocked via Cilium Hubble
hubble observe --namespace production --verdict DROPPED --type drop
```

**Important:** Always add a DNS egress rule when applying egress policies, otherwise pods will lose the ability to resolve hostnames.
