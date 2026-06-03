# How to Troubleshoot NetworkPolicy Allowing Unintended Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Networking

Description: Identify and fix NetworkPolicy misconfigurations that allow traffic that should be blocked, creating security vulnerabilities in Kubernetes clusters.

---

NetworkPolicies are meant to secure your Kubernetes cluster by controlling which pods can communicate with each other, when your cluster uses a network plugin that enforces them. However, misconfigured policies can allow unintended traffic, creating security gaps that attackers can exploit. Unlike policies that block too much traffic (which you notice immediately through broken applications), policies that allow too much traffic silently fail to protect your workloads.

These security gaps are dangerous because they go unnoticed until a security audit or breach reveals them. Proactive testing and verification of NetworkPolicy enforcement ensures your intended security posture matches reality.

## Understanding Default NetworkPolicy Behavior

NetworkPolicies use a default-allow model. Without any NetworkPolicy selecting a pod for a given direction, that pod can communicate freely in that direction. Once any NetworkPolicy selects a pod for ingress or egress, that direction becomes isolated and only explicitly allowed traffic passes. Reply traffic for allowed connections is allowed implicitly.

This means you must be explicit about isolation and allowed traffic. There are no explicit deny rules in Kubernetes NetworkPolicies, only allow rules.

## Testing Network Policy Enforcement

Start by testing if policies actually enforce restrictions:

```bash
# From a pod that should be blocked

kubectl exec -it unauthorized-pod -- curl http://protected-service:8080

# This should timeout or fail
# If it succeeds, NetworkPolicy is not working or is misconfigured

# Test from authorized pod
kubectl exec -it authorized-pod -- curl http://protected-service:8080

# This should succeed
```

If both succeed when only one should, the policy is not enforcing correctly.

## Checking Pod Label Selectors

NetworkPolicies select pods using labels. Incorrect selectors allow unintended traffic:

```bash
# Check the policy's pod selector
kubectl get networkpolicy my-policy -o yaml | grep -A5 podSelector

# Example:
# podSelector:
#   matchLabels:
#     app: backend

# Check which pods this actually selects
kubectl get pods -l app=backend --show-labels

# Verify these are the intended pods
# Extra pods selected = unintended traffic allowed
```

Overly broad selectors match more pods than intended.

## Verifying Ingress Rule Specificity

Ingress rules control what traffic pods accept. Too-broad rules allow unintended sources:

```bash
# Check ingress rules
kubectl get networkpolicy my-policy -o yaml

# Example problematic rule:
# ingress:
# - from:
#   - podSelector: {}  # Matches ALL pods in namespace

# This allows all pods in the namespace
# More specific:
# - from:
#   - podSelector:
#       matchLabels:
#         role: frontend  # Only frontend pods
```

Empty selectors match everything, creating unintended access.

## Testing Namespace Selectors

Namespace selectors can allow traffic from entire namespaces:

```bash
# Check for namespace selectors
kubectl get networkpolicy my-policy -o yaml | grep -A5 namespaceSelector

# Example:
# - from:
#   - namespaceSelector:
#       matchLabels:
#         team: platform

# Verify which namespaces this matches
kubectl get namespaces -l team=platform

# All pods in these namespaces can access your pod
# Ensure this is intentional
```

Broad namespace selectors allow access from many pods.

## Checking for Missing Egress Isolation

Policies that only apply to ingress leave egress unrestricted:

```yaml
# Problematic policy (only restricts ingress):
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: incomplete-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress  # Only ingress is restricted
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend

# Egress is unrestricted!
# Pod can connect to anything
```

Fix by adding Egress to policyTypes and defining egress rules:

```yaml
spec:
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
  - to:  # Allow DNS
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
```

## Testing Port Specificity

Policies without port restrictions allow all ports:

```bash
# Check if ports are specified
kubectl get networkpolicy my-policy -o yaml | grep -A10 ports

# Missing ports section:
# ingress:
# - from:
#   - podSelector:
#       matchLabels:
#         app: frontend
#   # No ports: specified - allows ALL ports!

# Should specify ports:
#   ports:
#   - protocol: TCP
#     port: 8080
```

Test unintended ports:

```bash
# Test the intended port
kubectl exec test-pod -- nc -zv protected-pod 8080

# Test an unintended port
kubectl exec test-pod -- nc -zv protected-pod 3000

# If both succeed, ports are not restricted
```

## Checking ipBlock Rules

ipBlock rules control external traffic. Overly broad blocks allow too much:

```bash
# Check ipBlock configuration
kubectl get networkpolicy my-policy -o yaml | grep -A5 ipBlock

# Example:
# egress:
# - to:
#   - ipBlock:
#       cidr: 0.0.0.0/0  # Allows ALL external IPs

# More restrictive:
#   - ipBlock:
#       cidr: 10.0.0.0/8  # Only specific network
#       except:
#       - 10.1.0.0/16     # Except certain subnets
```

Broad CIDR ranges allow unintended external access.

## Testing Multiple Policy Combination

Multiple policies selecting the same pod combine additively:

```bash
# List policies in the pod's namespace that select a pod
POD_NAMESPACE=$(kubectl get pod my-pod -o jsonpath='{.metadata.namespace}')
POD_LABELS=$(kubectl get pod my-pod -o json | jq '.metadata.labels')

kubectl get networkpolicies -n "$POD_NAMESPACE" -o json | \
  jq --argjson labels "$POD_LABELS" '
    def selector_matches($selector; $labels):
      ($selector == {} or (
        (($selector.matchLabels // {}) | to_entries | all($labels[.key] == .value)) and
        (($selector.matchExpressions // []) | all(. as $expr |
          if $expr.operator == "In" then (($expr.values // []) | index($labels[$expr.key]))
          elif $expr.operator == "NotIn" then ((($expr.values // []) | index($labels[$expr.key])) | not)
          elif $expr.operator == "Exists" then ($labels[$expr.key] != null)
          elif $expr.operator == "DoesNotExist" then ($labels[$expr.key] == null)
          else false end
        ))
      ));
    .items[] | select(selector_matches(.spec.podSelector; $labels))'

# Combined effect is union of all policies
# Any policy allowing traffic permits it
```

Unnoticed policies can create unintended access.

## Verifying Protocol Restrictions

Protocols (TCP, UDP, SCTP) should be specified:

```bash
# Check protocol specification
kubectl get networkpolicy my-policy -o yaml | grep -B2 -A2 protocol

# Missing protocol:
# ports:
# - port: 8080
#   # No protocol - defaults to TCP but may be confusing

# Explicit protocol:
# ports:
# - protocol: TCP
#   port: 8080
```

Test different protocols:

```bash
# Test TCP
kubectl exec test-pod -- nc -zv protected-pod 8080

# Test UDP
kubectl exec test-pod -- nc -zvu protected-pod 8080

# Both should not succeed if only TCP is intended
```

## Checking for Conflicting Policies

Policies can conflict in unexpected ways:

```bash
# Policy 1: Restrictive allow list
kubectl get networkpolicy deny-policy -o yaml

# Policy 2: Accidentally broadens allowed traffic
kubectl get networkpolicy allow-policy -o yaml

# Since policies are additive, allow-policy expands the effective allow list
# Review all policies selecting the same pods
```

The effective allowed traffic is the union of all matching policies.

## Testing Egress DNS Access

Many policies forget to allow DNS, accidentally blocking it:

```bash
# Test if DNS works
kubectl exec my-pod -- nslookup google.com

# If this fails, egress policy blocks DNS
# Even if it works, verify the policy explicitly allows it

# Correct egress DNS rule:
# egress:
# - to:
#   - namespaceSelector:
#       matchLabels:
#         kubernetes.io/metadata.name: kube-system
#   ports:
#   - protocol: UDP
#     port: 53
#   - protocol: TCP
#     port: 53
```

Forgetting DNS breaks name resolution silently.

## Using Network Policy Validation Tools

Some tools validate NetworkPolicy configuration:

```bash
# For Calico, inspect configured policies
kubectl exec -n kube-system calico-node-xxx -- \
  calicoctl get networkpolicy -o yaml

# For Cilium, check policy status
kubectl exec -n kube-system cilium-xxx -- \
  cilium-dbg endpoint list

# Look for warnings or recommendations
```

Validation tools catch common mistakes.

## Testing with Port Scanning

Scan to find unintended open ports:

```bash
# Deploy netshoot for scanning
kubectl run scanner --rm -it --image=nicolaka/netshoot -- bash

# Scan protected pod
nmap -p 1-65535 protected-pod-ip

# Should only show allowed ports
# Extra open ports indicate policy gaps

# Scan from different source pods
# Authorized vs unauthorized pods should show different results
```

Port scanning reveals actual enforcement.

## Checking for DefaultDeny Policies

Ensure default-deny baseline exists:

```yaml
# Default deny all ingress and egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # Selects all pods
  policyTypes:
  - Ingress
  - Egress
```

Apply default-deny, then explicitly allow needed traffic:

```bash
# Apply default-deny
kubectl apply -f default-deny-all.yaml

# Test - everything should be blocked
kubectl exec test-pod -- curl http://any-service:8080
# Should timeout

# Add specific allow policies
kubectl apply -f allow-frontend-to-backend.yaml
```

Default-deny prevents unintended access from the start.

## Auditing Policy Coverage

Verify all pods have appropriate policies:

```bash
# Find pods without NetworkPolicy
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | @base64' | \
  while read pod; do
    pod_json=$(echo "$pod" | base64 -d)
    namespace=$(echo "$pod_json" | jq -r '.metadata.namespace')
    podname=$(echo "$pod_json" | jq -r '.metadata.name')
    labels=$(echo "$pod_json" | jq -c '.metadata.labels // {}')
    policies=$(kubectl get networkpolicy -n "$namespace" -o json | \
      jq --argjson labels "$labels" '
        def selector_matches($selector; $labels):
          ($selector == {} or (
            (($selector.matchLabels // {}) | to_entries | all($labels[.key] == .value)) and
            (($selector.matchExpressions // []) | all(. as $expr |
              if $expr.operator == "In" then (($expr.values // []) | index($labels[$expr.key]))
              elif $expr.operator == "NotIn" then ((($expr.values // []) | index($labels[$expr.key])) | not)
              elif $expr.operator == "Exists" then ($labels[$expr.key] != null)
              elif $expr.operator == "DoesNotExist" then ($labels[$expr.key] == null)
              else false end
            ))
          ));
        [.items[] | select(selector_matches(.spec.podSelector; $labels))] | length')

    if [ "$policies" -eq 0 ]; then
      echo "No policy for: $namespace/$podname"
    fi
  done
```

Pods without policies have no restrictions.

## Testing with Different Namespaces

Verify namespace isolation:

```bash
# From namespace A, test access to namespace B
kubectl exec -n namespace-a test-pod -- \
  curl http://service.namespace-b:8080

# Should fail if policies enforce namespace isolation
# If succeeds, check namespace selectors
```

Cross-namespace access requires explicit policy rules.

## Monitoring Policy Violations

Set up monitoring for policy violations:

```bash
# For Cilium, monitor policy verdicts
kubectl exec -n kube-system cilium-xxx -c cilium-agent -- \
  hubble observe flows -t policy-verdict

# Look for unexpected allows
# Policy verdict: allowed

# For Calico, add a temporary Log rule with Calico NetworkPolicy
kubectl apply -f calico-log-policy.yaml

# Review Felix logs for unexpected traffic
kubectl logs -n calico-system -l k8s-app=calico-node | grep calico-packet
```

Monitoring catches policy gaps in real-time.

## Creating Test Matrix

Systematic testing matrix:

```bash
#!/bin/bash
# test-network-policies.sh

SOURCES=("frontend-pod" "backend-pod" "external-pod")
DESTINATIONS=("api-service 8080" "db-service 5432" "cache-service 6379")

echo "Testing NetworkPolicy enforcement..."

for src in "${SOURCES[@]}"; do
  for dst in "${DESTINATIONS[@]}"; do
    read -r host port <<< "$dst"
    result=$(kubectl exec "$src" -- nc -zvw2 "$host" "$port" 2>&1)
    if [ $? -eq 0 ]; then
      echo "ALLOWED: $src -> $host:$port"
    else
      echo "BLOCKED: $src -> $host:$port"
    fi
  done
done

# Compare with expected policy behavior
```

Automated testing catches policy drift.

## Conclusion

NetworkPolicies that allow unintended traffic create security vulnerabilities that are harder to detect than policies that block too much. Systematic verification tests actual enforcement against expected behavior, checking pod selectors, ingress and egress rules, port specifications, protocol restrictions, and the combination of multiple policies.

Start with default-deny policies and explicitly allow needed traffic. This approach makes unintended access impossible by default. Test policies from different source pods and namespaces to verify enforcement. Use port scanning and connectivity testing to reveal gaps.

Regular auditing ensures policies remain effective as applications evolve. Monitor policy decisions in production to catch unexpected allows. Automated testing matrices validate complex policy combinations. Master NetworkPolicy verification, and you will maintain strong security boundaries in your Kubernetes clusters without relying on hope that policies work as intended.
