# How to Troubleshoot NetworkPolicy Blocking Pod Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Networking

Description: Debug and fix NetworkPolicy configurations that unexpectedly block legitimate pod-to-pod communication in Kubernetes clusters.

---

NetworkPolicies are essential for securing Kubernetes clusters by controlling traffic between pods. However, they can also cause mysterious connectivity issues when misconfigured. A single typo in a selector or an overly restrictive rule can break critical application communication, and the symptoms often provide few clues about the root cause.

When pods cannot communicate and NetworkPolicies are in place, you need a systematic approach to identify which policy is blocking traffic and why. This guide walks you through practical troubleshooting techniques to diagnose and fix NetworkPolicy issues.

## Understanding NetworkPolicy Behavior

NetworkPolicies work differently from traditional firewalls. Once you apply any NetworkPolicy that selects a pod, that pod becomes isolated by default. Traffic is denied unless explicitly allowed by a policy rule.

This default-deny behavior catches many people by surprise. If you create a NetworkPolicy allowing ingress on port 8080 for a pod, all other ingress traffic to that pod gets blocked, even if no explicit deny rule exists.

Another critical point is that NetworkPolicies are additive. Multiple policies can select the same pod, and the pod can receive traffic that any of those policies allow. This means you need to check all policies selecting a pod, not just one.

## Identifying Which Pods Have NetworkPolicies

Start by determining if NetworkPolicies are selecting your pods:

```bash
# List all NetworkPolicies in a namespace
kubectl get networkpolicies -n my-namespace

# Get detailed information about a specific policy
kubectl describe networkpolicy my-policy -n my-namespace

# See all policies across all namespaces
kubectl get networkpolicies --all-namespaces
```

The description shows you which pods the policy selects and what traffic it allows. Look for the `PodSelector` section to understand which pods are affected.

## Checking Pod Labels Against Policies

NetworkPolicies use label selectors to choose which pods they apply to. Verify your pod's labels match the policy selectors:

```bash
# Get pod labels
kubectl get pod my-pod -n my-namespace --show-labels

# Compare with the policy's pod selector
kubectl get networkpolicy my-policy -n my-namespace -o yaml | grep -A5 podSelector
```

If the labels match, the policy applies to your pod. A common mistake is having similar but not identical labels, like `app=frontend` in the policy but `app=front-end` on the pod.

## Testing Basic Connectivity

Before diving into NetworkPolicy details, confirm the connectivity problem:

```bash
# Test from source pod to destination pod
kubectl exec -it source-pod -n source-ns -- curl -v http://dest-pod-ip:8080

# Test to destination service
kubectl exec -it source-pod -n source-ns -- curl -v http://dest-service.dest-ns.svc.cluster.local:8080

# Test with timeout to avoid hanging
kubectl exec -it source-pod -n source-ns -- curl -v --max-time 5 http://dest-service:8080
```

If the connection times out without any response, NetworkPolicy is likely blocking it. If you get connection refused, the issue is probably not NetworkPolicy related but rather the application not listening on the port.

## Finding Policies That Might Be Blocking Traffic

Identify all NetworkPolicies that could affect either the source or destination pod:

```bash
# Get policies selecting the destination pod
kubectl get networkpolicies -n dest-namespace -o json | \
  jq '.items[] | select(.spec.podSelector.matchLabels.app=="dest-app")'

# For policies with empty podSelector (affecting all pods in namespace)
kubectl get networkpolicies -n dest-namespace -o json | \
  jq '.items[] | select(.spec.podSelector == {})'
```

Check both ingress rules (on the destination) and egress rules (on the source). Both must allow the traffic for it to succeed.

## Analyzing Ingress Rules

Ingress rules on the destination pod control what traffic can reach it:

```bash
# View ingress rules for a policy
kubectl get networkpolicy my-policy -n my-namespace -o yaml

# Look at the ingress section
```

Here is an example policy that might be blocking traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

This policy allows traffic only from pods labeled `app=frontend` to port 8080. If your source pod has a different label or you are trying to connect to a different port, the traffic gets blocked.

## Analyzing Egress Rules

Egress rules on the source pod control what traffic can leave it:

```bash
# Check if source pod has egress restrictions
kubectl get networkpolicies -n source-namespace -o yaml | grep -A10 egress
```

An egress policy example:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 8080
```

If your source pod tries to connect to a different destination or port than specified in the egress rule, the traffic is blocked.

## Common NetworkPolicy Mistakes

Several patterns cause most NetworkPolicy issues.

First, missing DNS egress rules. Pods need to resolve service names via DNS, but egress policies often forget to allow DNS traffic:

```yaml
# DNS is blocked - pods cannot resolve service names
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: broken-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
```

Fix by allowing DNS:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: fixed-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    - podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  - to:
    - podSelector:
        matchLabels:
          app: backend
```

Second, namespace selector confusion. When using `namespaceSelector`, remember it must match the namespace labels, not pod labels:

```bash
# Check namespace labels
kubectl get namespace production --show-labels

# Add labels to namespace if needed
kubectl label namespace production env=prod
```

Third, forgetting to specify both ingress and egress in policyTypes. If you only specify ingress, egress remains unrestricted (and vice versa):

```yaml
# This allows all egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-only
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
```

## Using NetworkPolicy Logs

Some CNI plugins provide logging for NetworkPolicy decisions:

For Calico:

```bash
# Enable policy logging
kubectl annotate pod my-pod -n my-namespace \
  projectcalico.org/policy-logs='{"ingress": "allow,deny", "egress": "allow,deny"}'

# View logs on the node
kubectl logs -n kube-system calico-node-xxx | grep policy
```

For Cilium:

```bash
# Monitor policy verdicts
kubectl exec -n kube-system cilium-xxx -- cilium monitor --type policy-verdict

# Check policy enforcement for specific endpoints
kubectl exec -n kube-system cilium-xxx -- cilium endpoint list
```

These logs show exactly which policy allowed or denied specific packets.

## Creating Test Policies

To verify your understanding, create a test NetworkPolicy that explicitly allows your traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-allow-all
  namespace: my-namespace
spec:
  podSelector:
    matchLabels:
      app: dest-app
  policyTypes:
  - Ingress
  ingress:
  - {}  # Allow all ingress traffic
```

Apply this policy and test connectivity. If it works now, you know a NetworkPolicy was blocking the traffic. Then systematically make the policy more restrictive to find the minimum required rules.

## Debugging with Network Tools

Use network tools to understand exactly what is happening:

```bash
# Run tcpdump on the destination pod
kubectl debug -it pod/dest-pod --image=nicolaka/netshoot -- tcpdump -i any port 8080

# In another terminal, try connecting
kubectl exec -it source-pod -- curl http://dest-pod:8080

# If you see no packets in tcpdump, NetworkPolicy is blocking at source
# If you see SYN packets but no response, NetworkPolicy might be blocking return traffic
```

For Calico, check endpoint configuration:

```bash
# Get Calico endpoint for a pod
kubectl exec -n kube-system calico-node-xxx -- calicoctl get workloadEndpoint -o yaml

# This shows all policies applied to the endpoint
```

## Validating Policy Changes

After modifying a NetworkPolicy, verify it works:

```bash
# Apply updated policy
kubectl apply -f networkpolicy.yaml

# Verify the policy updated
kubectl get networkpolicy my-policy -o yaml

# Test connectivity immediately
kubectl exec -it source-pod -- curl http://dest-service:8080

# Check from multiple source pods to ensure the rules are correct
```

NetworkPolicies take effect immediately, but there can be a brief delay as the CNI plugin updates iptables or eBPF rules.

## Understanding Allow vs Deny Semantics

NetworkPolicies only support allow rules, not explicit deny rules. This can be confusing. To deny specific traffic while allowing others, you must allow everything except what you want to block.

For example, to allow traffic from all pods except those labeled `app=untrusted`:

```yaml
# This does NOT work - NetworkPolicy has no deny rules
# You must allow all trusted sources explicitly

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-trusted-only
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchExpressions:
        - key: app
          operator: NotIn
          values:
          - untrusted
```

## Best Practices for Troubleshooting

When troubleshooting NetworkPolicy issues, work systematically. Start by temporarily allowing all traffic to confirm NetworkPolicy is the problem. Then gradually add restrictions until you find the minimal policy that works.

Document your NetworkPolicies clearly with comments and meaningful names. Future you will thank present you when debugging at 2 AM.

Test NetworkPolicies in a development environment before applying them to production. A mistake can break critical services instantly.

Use monitoring and alerting to detect when NetworkPolicies block legitimate traffic. Track connection failures and correlate them with policy changes.

## Conclusion

NetworkPolicy troubleshooting requires understanding both the policy rules and how your CNI plugin implements them. By checking pod labels, analyzing ingress and egress rules, using CNI-specific debugging tools, and testing systematically, you can identify which policies block traffic and why.

Remember that NetworkPolicies provide critical security by implementing least-privilege network access. The troubleshooting effort pays off in a more secure cluster. Take time to understand the policies protecting your workloads, and you will be able to diagnose and fix connectivity issues quickly when they arise.
