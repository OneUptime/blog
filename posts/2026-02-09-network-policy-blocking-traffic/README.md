# How to Diagnose Kubernetes Network Policy Blocking Legitimate Pod-to-Pod Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Troubleshooting

Description: Learn how to identify and fix Kubernetes NetworkPolicy rules that inadvertently block legitimate pod-to-pod communication with debugging techniques and examples.

---

Network policies in Kubernetes provide essential security controls, but overly restrictive or incorrectly configured policies can block legitimate traffic between pods. When your application suddenly can't reach its database or API calls time out, misconfigured network policies are often the culprit.

## Understanding Network Policy Behavior

Kubernetes network policies work as a whitelist. Once you apply any network policy selecting a pod, that pod blocks all traffic not explicitly allowed. This default-deny behavior catches many engineers off guard.

Network policies are namespace-scoped and use label selectors to target pods. Both ingress (incoming) and egress (outgoing) traffic can be controlled separately. A common mistake is defining ingress rules but forgetting egress rules, or vice versa.

## Symptoms of Blocked Traffic

When network policies block legitimate traffic, you'll see connection timeouts or refused connections. Applications log errors like "connection timed out", "no route to host", or "connection refused". These symptoms look identical to many other network issues, making diagnosis tricky.

DNS resolution failures are particularly common when egress policies don't allow traffic to kube-dns or CoreDNS. Your pods can't resolve service names, breaking service discovery.

## Initial Diagnosis Steps

Start by checking if network policies exist in the namespace and whether they select your pods.

```bash
# List all network policies in namespace
kubectl get networkpolicy -n production

# Check which policies select your pod
kubectl get networkpolicy -n production -o json | \
  jq '.items[] | select(.spec.podSelector.matchLabels.app=="frontend")'

# Describe a specific policy
kubectl describe networkpolicy frontend-policy -n production
```

Verify that your CNI plugin supports network policies. Not all CNI plugins implement NetworkPolicy. Calico, Cilium, and Weave support them, but the basic Flannel does not.

```bash
# Check your CNI plugin
kubectl get pods -n kube-system | grep -E "calico|cilium|weave|flannel"
```

## Example: Overly Restrictive Ingress Policy

Here's a network policy that's too restrictive. It allows traffic from the frontend to the API but blocks the health check endpoint from the ingress controller.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
      tier: backend
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

This policy blocks the ingress controller's health checks because it only allows traffic from pods labeled `app=frontend`. The ingress controller pods have different labels, so they can't reach the API's health check endpoint.

Fix it by adding a rule for the ingress controller.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy-fixed
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  # Allow traffic from frontend pods
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  # Allow traffic from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
      podSelector:
        matchLabels:
          app.kubernetes.io/component: controller
    ports:
    - protocol: TCP
      port: 8080
```

## Debugging DNS Resolution Issues

DNS failures are extremely common with network policies. If you apply an egress policy but don't explicitly allow DNS traffic, your pods can't resolve any hostnames.

```yaml
# This policy blocks DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

This policy allows traffic to the database but blocks everything else, including DNS. Your backend pods can reach the database by IP but can't resolve hostnames.

Test DNS from within a pod.

```bash
# Execute DNS query inside pod
kubectl exec -it backend-pod-abc123 -n production -- nslookup database-service

# Check if pod can reach DNS server
kubectl exec -it backend-pod-abc123 -n production -- nc -zv 10.96.0.10 53
```

Fix it by explicitly allowing DNS traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress-with-dns
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Egress
  egress:
  # Allow DNS queries
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  # Allow traffic to database
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

## Testing Connectivity Between Pods

Use temporary test pods to verify network connectivity when you suspect policy issues.

```bash
# Create a test pod in the namespace
kubectl run test-pod --image=nicolaka/netshoot -n production --rm -it -- /bin/bash

# From inside the test pod, test connectivity
curl http://api-service:8080/health
nc -zv database-service 5432
wget -O- http://frontend-service
```

Compare connectivity with and without matching labels. Create two test pods, one with labels matching your policy and one without.

```bash
# Test pod with matching labels
kubectl run allowed-test --image=nicolaka/netshoot \
  --labels="app=frontend" -n production --rm -it -- \
  curl http://api-service:8080

# Test pod without matching labels
kubectl run blocked-test --image=nicolaka/netshoot \
  -n production --rm -it -- \
  curl http://api-service:8080
```

If the first succeeds and the second times out, your network policy is working as intended.

## Example: Missing Egress Policy

Applications often need to make external API calls, but egress policies can block them. Here's a frontend that needs to call an external payment API but is blocked by policy.

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
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 8080
```

This policy allows the frontend to call the internal API but blocks external traffic. Add a rule for external traffic using CIDR blocks.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy-external
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  # Allow internal API calls
  - to:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 8080
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  # Allow external payment API
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 443
```

The ipBlock with exceptions allows all external traffic on port 443 while blocking RFC1918 private ranges.

## Using Namespace Selectors

Cross-namespace communication requires namespace selectors. A common mistake is using only pod selectors when traffic crosses namespace boundaries.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  # Allow from multiple namespaces
  - from:
    - namespaceSelector:
        matchLabels:
          env: production
      podSelector:
        matchLabels:
          access: database
    ports:
    - protocol: TCP
      port: 5432
```

This policy allows database access from any pod labeled `access=database` in namespaces labeled `env=production`. Ensure your namespaces have the correct labels.

```bash
# Label a namespace
kubectl label namespace production env=production

# Verify namespace labels
kubectl get namespace production --show-labels
```

## Monitoring Network Policy Denials

Some CNI plugins provide metrics or logs for denied connections. Cilium, for example, exposes detailed network flow data.

```bash
# View Cilium network policy denials (if using Cilium)
kubectl exec -it -n kube-system cilium-xxxxx -- cilium monitor --type drop

# Check Calico policy logs (if using Calico)
kubectl logs -n kube-system calico-node-xxxxx | grep "calico/denied"
```

Set up alerts for unexpected connection failures in your applications. Sudden spikes in connection timeouts often indicate new network policy issues.

## Gradual Policy Rollout

When adding network policies to existing applications, start with permissive policies and gradually tighten them. Begin with ingress policies only, test thoroughly, then add egress policies.

```yaml
# Phase 1: Allow all egress, restrict ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-phase1
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
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
    - podSelector: {}
  - to:
    - namespaceSelector: {}
```

Monitor for several days before tightening egress rules. Use application logs and metrics to identify all legitimate traffic patterns.

## Best Practices

Always include DNS in egress policies unless you use IP addresses exclusively. Test policies in a staging environment before applying to production. Use descriptive names and annotations to document policy intent.

Create separate policies for different concerns rather than one giant policy. This makes debugging easier when you need to temporarily disable specific rules.

Maintain a library of common policy patterns for your organization, such as "allow DNS", "allow metrics scraping", or "allow ingress health checks". This reduces copy-paste errors.

## Conclusion

Diagnosing network policy issues requires systematic testing and understanding of how policies combine. Start by verifying that policies exist and select the correct pods, then test connectivity with and without matching labels. Remember that network policies are additive, so multiple policies selecting the same pod will all apply. With careful testing and gradual rollout, you can implement secure network policies without disrupting legitimate traffic.
