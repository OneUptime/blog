# How to Set Up Kubernetes Network Policies That Allow Only Specific CIDR Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Network Policies, Security, CIDR, Networking

Description: Learn how to configure Kubernetes Network Policies to restrict traffic to specific CIDR ranges, implementing fine-grained network security controls for your cluster workloads.

---

Network policies in Kubernetes give you the power to control traffic at the IP address or port level. While most tutorials focus on pod-to-pod communication within the cluster, real-world scenarios often require restricting access to specific external IP ranges. This guide shows you how to configure network policies that allow only specific CIDR ranges.

## Understanding CIDR-Based Network Policies

CIDR (Classless Inter-Domain Routing) notation lets you specify IP address ranges in network policies. This becomes critical when you need to allow traffic only from specific networks, like your corporate VPN range, a partner's network, or specific cloud provider subnets.

Unlike pod selector-based policies that work with labels, CIDR-based policies operate at the IP layer, making them perfect for controlling access to external services or restricting which external networks can reach your pods.

## Default Deny Policy with CIDR Exceptions

Start by creating a default deny policy, then explicitly allow traffic from specific CIDR ranges. This approach follows the principle of least privilege.

```yaml
# default-deny-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Applies to all pods in namespace
  policyTypes:
  - Ingress
```

Apply this policy to establish a baseline:

```bash
kubectl apply -f default-deny-ingress.yaml
```

Now no ingress traffic reaches pods in the production namespace. Next, create a policy that allows specific CIDR ranges.

## Allowing Specific CIDR Ranges

Here's a policy that allows traffic only from your corporate network and a trusted partner network:

```yaml
# allow-specific-cidrs.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-corporate-networks
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Corporate VPN range
    - ipBlock:
        cidr: 10.100.0.0/16
        except:
        - 10.100.5.0/24  # Exclude guest network
    # Partner network
    - ipBlock:
        cidr: 192.168.50.0/24
    ports:
    - protocol: TCP
      port: 8080
```

This policy allows TCP traffic on port 8080 from two sources: your corporate network (10.100.0.0/16) except for the guest subnet, and a partner network (192.168.50.0/24).

Apply the policy:

```bash
kubectl apply -f allow-specific-cidrs.yaml
```

## Combining CIDR Rules with Pod Selectors

You can combine CIDR-based rules with pod selectors for more complex scenarios. The following policy allows traffic from specific CIDR ranges OR from pods with specific labels:

```yaml
# combined-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-access-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Allow from specific CIDR
    - ipBlock:
        cidr: 172.16.0.0/12
    # OR allow from application pods
    - podSelector:
        matchLabels:
          app: api-server
      namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 5432
```

Each item in the `from` array is evaluated with OR logic. Traffic is allowed if it matches any of the rules.

## Egress Policies with CIDR Restrictions

You can also restrict outbound traffic to specific CIDR ranges. This is useful when you want pods to communicate only with specific external services:

```yaml
# egress-cidr-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress-destinations
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-scraper
  policyTypes:
  - Egress
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  # Allow specific external APIs
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24  # External API subnet
    ports:
    - protocol: TCP
      port: 443
  # Allow AWS S3 endpoints (us-east-1 example)
  - to:
    - ipBlock:
        cidr: 52.216.0.0/15
    ports:
    - protocol: TCP
      port: 443
```

This policy allows the web-scraper pods to reach DNS servers, a specific external API range, and AWS S3 endpoints, but blocks all other egress traffic.

## Handling Multiple CIDR Blocks

When you need to allow many CIDR ranges, create separate ipBlock entries:

```yaml
# multiple-cidrs.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-multiple-offices
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: internal-tool
  policyTypes:
  - Ingress
  ingress:
  - from:
    # New York office
    - ipBlock:
        cidr: 10.1.0.0/16
    # London office
    - ipBlock:
        cidr: 10.2.0.0/16
    # Singapore office
    - ipBlock:
        cidr: 10.3.0.0/16
    # Cloud NAT gateway
    - ipBlock:
        cidr: 35.199.192.0/19
    ports:
    - protocol: TCP
      port: 443
```

## Testing CIDR-Based Policies

After applying policies, test them to verify they work as expected. Use a test pod to simulate traffic from different sources:

```bash
# Create a test pod in the allowed CIDR range
kubectl run test-allowed --image=nicolaka/netshoot -it --rm -- /bin/bash

# From inside the pod, test connectivity
curl http://api-server.production.svc.cluster.local:8080
```

For testing blocked traffic, you need a pod that appears to come from an unauthorized IP. This is tricky within a cluster, but you can test egress policies easily:

```bash
# Test egress blocking
kubectl run test-egress --image=nicolaka/netshoot -it --rm \
  --labels=app=web-scraper -- curl -v https://www.google.com

# This should fail if google.com's IP isn't in your allowed CIDR ranges
```

## Troubleshooting CIDR Policies

If your CIDR-based policies aren't working:

1. **Verify CNI plugin support**: Not all CNI plugins support network policies. Calico, Cilium, and Weave Net do, but the default kubenet does not.

```bash
# Check which CNI you're using
kubectl get pods -n kube-system | grep -E 'calico|cilium|weave'
```

2. **Check policy order**: Network policies are additive. Multiple policies selecting the same pods combine with OR logic.

```bash
# List all policies affecting a pod
kubectl get networkpolicies -n production
kubectl describe networkpolicy -n production
```

3. **Verify CIDR notation**: Ensure your CIDR ranges are correct. Common mistakes include wrong subnet masks or typos in IP addresses.

4. **Check logs**: Examine CNI plugin logs for policy enforcement errors:

```bash
# For Calico
kubectl logs -n kube-system -l k8s-app=calico-node

# For Cilium
kubectl logs -n kube-system -l k8s-app=cilium
```

## Best Practices

Keep these practices in mind when working with CIDR-based network policies:

- Always start with a default deny policy and explicitly allow what you need
- Document the purpose of each CIDR range in comments
- Use the except field to carve out specific subnets from larger ranges
- Combine with pod selectors for defense in depth
- Regularly audit your policies to remove obsolete CIDR ranges
- Test policies in a development environment before applying to production
- Use network policy visualization tools to understand the complete picture

## Monitoring Policy Effectiveness

After implementing CIDR-based policies, monitor their effectiveness:

```bash
# Check denied connections (Cilium example)
kubectl exec -n kube-system cilium-xxxxx -- cilium monitor --type drop

# View policy statistics
kubectl exec -n kube-system cilium-xxxxx -- cilium policy get
```

CIDR-based network policies give you precise control over which networks can communicate with your Kubernetes workloads. By combining default deny policies with explicit CIDR allowlists, you create a strong security posture that limits the attack surface of your applications.
