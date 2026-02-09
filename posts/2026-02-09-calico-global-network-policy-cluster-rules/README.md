# How to Use Calico GlobalNetworkPolicy for Cluster-Wide Network Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Calico, Security

Description: Implement Calico GlobalNetworkPolicy resources to enforce cluster-wide network security rules across all namespaces, establishing baseline security controls and managing cross-namespace traffic with centralized policy management.

---

Calico's GlobalNetworkPolicy extends standard Kubernetes NetworkPolicy with cluster-wide rules that apply across all namespaces. While namespace-scoped policies handle application-specific rules, GlobalNetworkPolicy establishes baseline security, enforces organizational standards, and manages cross-namespace communication from a central location.

## Understanding GlobalNetworkPolicy

Standard Kubernetes NetworkPolicy applies only within a single namespace. Calico's GlobalNetworkPolicy:

- Applies cluster-wide, not limited to one namespace
- Can select pods across all namespaces
- Enforces organizational security baselines
- Works alongside namespace-scoped policies
- Supports tier-based policy ordering

GlobalNetworkPolicy is perfect for:
- Denying all traffic by default (zero-trust networking)
- Allowing infrastructure pods (DNS, monitoring) cluster-wide access
- Blocking egress to specific external IPs or domains
- Enforcing compliance requirements across all applications

## Installing Calico

If you haven't installed Calico:

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
```

Verify installation:

```bash
kubectl get tigerastatus
calicoctl version
```

## Creating a Default-Deny Global Policy

Establish a zero-trust baseline by denying all traffic by default:

```yaml
# global-default-deny.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  order: 1000  # Higher order = lower priority
  selector: all()
  types:
  - Ingress
  - Egress
  # No ingress or egress rules = deny all
```

Apply with calicoctl:

```bash
calicoctl apply -f global-default-deny.yaml
```

Now all pods are isolated by default. You must explicitly allow traffic.

## Allowing DNS for All Pods

Allow all pods to query DNS:

```yaml
# global-allow-dns.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns-access
spec:
  order: 100  # Lower order = higher priority (runs before deny-all)
  selector: all()
  types:
  - Egress
  egress:
  # Allow DNS queries to kube-dns/coredns
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
  - action: Allow
    protocol: TCP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53
```

Apply the policy:

```bash
calicoctl apply -f global-allow-dns.yaml
```

## Allowing Access to API Server

Allow all pods to communicate with the Kubernetes API server:

```yaml
# global-allow-apiserver.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-apiserver-access
spec:
  order: 100
  selector: all()
  types:
  - Egress
  egress:
  - action: Allow
    protocol: TCP
    destination:
      services:
        name: kubernetes
        namespace: default
      ports:
      - 443
```

## Namespace-Based Global Policies

Allow traffic between pods in the same namespace while blocking cross-namespace traffic:

```yaml
# global-same-namespace.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-same-namespace
spec:
  order: 200
  selector: all()
  types:
  - Ingress
  - Egress
  ingress:
  # Allow from same namespace
  - action: Allow
    source:
      namespaceSelector: projectcalico.org/name == "$namespace"
  egress:
  # Allow to same namespace
  - action: Allow
    destination:
      namespaceSelector: projectcalico.org/name == "$namespace"
```

The `$namespace` variable automatically matches the pod's namespace.

## Allowing Monitoring and Logging Infrastructure

Allow Prometheus, Grafana, and logging agents cluster-wide access:

```yaml
# global-allow-monitoring.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-monitoring-access
spec:
  order: 150
  types:
  - Ingress
  ingress:
  # Allow Prometheus to scrape metrics from all pods
  - action: Allow
    protocol: TCP
    source:
      namespaceSelector: name == "monitoring"
      selector: app == "prometheus"
    destination:
      ports:
      - 9090-9999  # Common metrics ports
  # Allow Grafana to query all services
  - action: Allow
    protocol: TCP
    source:
      namespaceSelector: name == "monitoring"
      selector: app == "grafana"
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-logging-agents
spec:
  order: 150
  types:
  - Ingress
  ingress:
  # Allow Fluentd/Fluentbit to collect logs
  - action: Allow
    protocol: TCP
    source:
      namespaceSelector: name == "logging"
      selector: app in {"fluentd", "fluent-bit"}
```

## Blocking Egress to External IPs

Prevent pods from accessing specific external IP ranges:

```yaml
# global-block-external-ips.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-dangerous-ips
spec:
  order: 50  # High priority to block before other allow rules
  selector: all()
  types:
  - Egress
  egress:
  # Block access to cloud metadata services
  - action: Deny
    protocol: TCP
    destination:
      nets:
      - 169.254.169.254/32  # AWS/Azure/GCP metadata
  # Block access to private IP ranges (for pods that should only access public internet)
  - action: Deny
    destination:
      nets:
      - 10.0.0.0/8
      - 172.16.0.0/12
      - 192.168.0.0/16
    # Except for pods with special label
    source:
      notSelector: allow-private-access == "true"
```

## Environment-Based Policies

Apply different rules to production vs development namespaces:

```yaml
# global-production-restrictions.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: production-egress-restrictions
spec:
  order: 100
  namespaceSelector: environment == "production"
  types:
  - Egress
  egress:
  # Production can only access approved external services
  - action: Allow
    protocol: TCP
    destination:
      nets:
      - 203.0.113.0/24  # Approved external service
      ports:
      - 443
  # Allow internal cluster communication
  - action: Allow
    destination:
      nets:
      - 10.244.0.0/16  # Pod network
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: development-open-egress
spec:
  order: 100
  namespaceSelector: environment == "development"
  types:
  - Egress
  egress:
  # Development has open internet access
  - action: Allow
```

Label namespaces appropriately:

```bash
kubectl label namespace production environment=production
kubectl label namespace staging environment=staging
kubectl label namespace dev environment=development
```

## Implementing Policy Tiers

Calico supports policy tiers for ordered evaluation:

```bash
# Create security tier
calicoctl create -f - <<EOF
apiVersion: projectcalico.org/v3
kind: Tier
metadata:
  name: security
spec:
  order: 100
EOF

# Create platform tier
calicoctl create -f - <<EOF
apiVersion: projectcalico.org/v3
kind: Tier
metadata:
  name: platform
spec:
  order: 200
EOF
```

Apply policies to tiers:

```yaml
# security-tier-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: security-baseline
  tier: security
spec:
  order: 100
  selector: all()
  types:
  - Ingress
  - Egress
  ingress:
  - action: Deny
    source:
      nets:
      - 0.0.0.0/0
    protocol: TCP
    destination:
      ports:
      - 22  # Block SSH
      - 23  # Block Telnet
```

## Host Endpoint Protection

Apply policies to host network interfaces:

```yaml
# global-host-protection.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: protect-host-interfaces
spec:
  order: 100
  selector: has(host-endpoint)
  types:
  - Ingress
  ingress:
  # Allow kubelet API
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 10250
    source:
      selector: k8s-app == "kube-apiserver"
  # Allow node exporter for monitoring
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 9100
    source:
      namespaceSelector: name == "monitoring"
```

## Monitoring Global Policies

List all global policies:

```bash
calicoctl get globalnetworkpolicy -o wide
```

Check policy order:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -A 2 "order:"
```

View policy statistics:

```bash
# Get policy stats (requires Calico Enterprise or certain versions)
calicoctl get felixconfiguration default -o yaml
```

## Debugging Global Policy Issues

Test if a policy blocks/allows traffic:

```bash
# From inside a pod
kubectl exec -it test-pod -- curl http://api-service

# Check Calico logs for policy decisions
kubectl logs -n calico-system -l k8s-app=calico-node | grep -i "policy"
```

Use calicoctl to evaluate policy for specific endpoints:

```bash
# Get endpoints
calicoctl get workloadendpoint

# Check policy applied to endpoint
calicoctl get workloadendpoint <endpoint-name> -o yaml
```

## Policy Precedence

Calico evaluates policies in this order:

1. **Tier order**: Lower tier order evaluated first
2. **Policy order**: Within a tier, lower policy order evaluated first
3. **First match wins**: First Allow or Deny action is applied
4. **Default action**: If no policy matches, traffic is denied (with default-deny) or allowed (without)

Example precedence:

```
Tier: security (order 100)
  Policy: block-ssh (order 50) - Evaluated first
  Policy: allow-monitoring (order 100) - Evaluated second
Tier: platform (order 200)
  Policy: allow-dns (order 100) - Evaluated third
Default deny-all - Evaluated last
```

## Best Practices

Follow these guidelines:

1. **Start with default-deny**: Establish zero-trust baseline
2. **Use low order numbers for critical policies**: Block dangerous traffic first
3. **Document policy purpose**: Use annotations
4. **Test in staging**: Verify policies don't break applications
5. **Monitor policy violations**: Set up alerts for denied traffic
6. **Regular audits**: Review and remove unused policies

Annotate policies for clarity:

```yaml
metadata:
  name: production-baseline
  annotations:
    description: "Baseline security for production workloads"
    owner: "security-team@example.com"
    last-reviewed: "2026-02-09"
```

GlobalNetworkPolicy provides centralized control over cluster-wide network security. Use it to establish organizational security baselines, enforce compliance requirements, and manage infrastructure access patterns. Combined with namespace-scoped policies for application-specific rules, GlobalNetworkPolicy creates a comprehensive defense-in-depth security posture for your Kubernetes clusters.
