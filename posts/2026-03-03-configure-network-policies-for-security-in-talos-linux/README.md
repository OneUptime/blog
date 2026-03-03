# How to Configure Network Policies for Security in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Policies, Kubernetes, Security, Networking

Description: A hands-on guide to configuring Kubernetes network policies on Talos Linux clusters for microsegmentation and securing pod-to-pod communication.

---

By default, every pod in a Kubernetes cluster can communicate with every other pod. There are no firewalls between namespaces, no access controls between services, and no restrictions on outbound traffic. For a production Talos Linux cluster, this is a serious security gap. Network policies give you the ability to control which pods can talk to each other and which external endpoints they can reach.

This guide covers how to set up network policies on Talos Linux, starting with the basics and building up to a production-ready microsegmentation strategy.

## Prerequisites: A CNI That Supports Network Policies

Network policies are enforced by the CNI (Container Network Interface) plugin, not by Kubernetes itself. You need a CNI that supports them. Talos Linux works well with several options:

- **Cilium** (recommended) - Full network policy support with extended features
- **Calico** - Mature network policy support
- **Flannel** - Does NOT support network policies

If you are using Flannel (the default in some setups), you will need to switch to Cilium or Calico.

### Install Cilium on Talos Linux

```bash
# Install Cilium CLI
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin/

# Install Cilium on the cluster
cilium install --version 1.16.0

# Verify installation
cilium status --wait
```

Or configure Cilium through the Talos machine configuration:

```yaml
cluster:
  network:
    cni:
      name: none  # Disable default CNI
  inlineManifests:
    - name: cilium
      contents: |
        # Cilium Helm chart values applied as inline manifest
```

## Understanding Network Policy Basics

A NetworkPolicy selects pods using labels and defines rules for ingress (incoming) and egress (outgoing) traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: example-policy
  namespace: default
spec:
  podSelector:         # Which pods this policy applies to
    matchLabels:
      app: web
  policyTypes:
    - Ingress          # Control incoming traffic
    - Egress           # Control outgoing traffic
  ingress:             # Rules for incoming traffic
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:              # Rules for outgoing traffic
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

Key rules to remember:
- If no NetworkPolicy selects a pod, all traffic is allowed
- Once a pod is selected by any NetworkPolicy, only traffic explicitly allowed by a rule is permitted
- Policies are additive - multiple policies combine their allow rules

## Step 1: Default Deny Policies

Start with default-deny policies for every namespace. This flips the model from "allow everything" to "deny everything unless explicitly allowed."

```yaml
# default-deny-all.yaml
# Apply this to every namespace that needs protection

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all-ingress
  namespace: production
spec:
  podSelector: {}   # Empty selector matches ALL pods
  policyTypes:
    - Ingress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

```bash
# Apply default deny to all application namespaces
for ns in production staging development; do
  kubectl apply -f default-deny-all.yaml -n $ns
done
```

## Step 2: Allow DNS

After applying default-deny egress, pods cannot resolve DNS names. Allow DNS first.

```yaml
# allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

```bash
kubectl apply -f allow-dns.yaml -n production
```

## Step 3: Application-Specific Policies

Now create policies for each application based on its actual communication needs.

### Web Application Policy

```yaml
# web-app-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-app-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from the ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow connections to the API backend
    - to:
        - podSelector:
            matchLabels:
              app: api-backend
      ports:
        - protocol: TCP
          port: 3000
    # Allow connections to Redis cache
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

### Database Policy

```yaml
# database-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only allow connections from the API backend
    - from:
        - podSelector:
            matchLabels:
              app: api-backend
      ports:
        - protocol: TCP
          port: 5432
  egress:
    # Database only needs DNS - no outbound connections
    # (DNS already allowed by the allow-dns policy)
    []
```

### Monitoring Policy

```yaml
# monitoring-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scraping
  namespace: production
spec:
  podSelector: {}  # Apply to all pods
  policyTypes:
    - Ingress
  ingress:
    # Allow Prometheus to scrape metrics from all pods
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
```

## Step 4: Cross-Namespace Policies

Control traffic between namespaces.

```yaml
# Allow staging to call production APIs (read-only)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-staging-to-prod-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: staging
          podSelector:
            matchLabels:
              role: api-consumer
      ports:
        - protocol: TCP
          port: 3000
```

## Step 5: External Traffic Policies

Control which pods can communicate with external services.

```yaml
# Allow specific pods to reach external APIs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS to external payment provider
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

## Testing Network Policies

Verify that your policies are working correctly.

```bash
# Deploy test pods
kubectl run test-client -n production \
  --image=alpine --restart=Never --labels="app=test-client" \
  -- sleep 3600

kubectl run test-server -n production \
  --image=nginx --restart=Never --labels="app=test-server" \
  --port=80

# Test connectivity (should be blocked by default-deny)
kubectl exec -n production test-client -- \
  wget -qO- --timeout=3 http://test-server 2>&1 || echo "Blocked as expected"

# Test DNS (should work with allow-dns policy)
kubectl exec -n production test-client -- \
  nslookup kubernetes.default 2>&1

# Clean up test pods
kubectl delete pod -n production test-client test-server
```

## Visualizing Network Policies

Use tools to understand your policy coverage.

```bash
# With Cilium, use Hubble for network flow visualization
cilium hubble enable

# View real-time traffic flows
hubble observe --namespace production

# View policy verdicts (allowed/denied)
hubble observe --namespace production --verdict DROPPED

# Export flow data for analysis
hubble observe --namespace production -o json > flows.json
```

## Common Patterns for Talos Linux Clusters

### Allow Talos System Communication

Make sure network policies do not block Talos internal communication.

```yaml
# Do not apply network policies to these namespaces:
# - kube-system
# - kube-public
# - kube-node-lease
# Or explicitly allow the necessary traffic
```

### Allow Node-to-Node Communication

If using KubeSpan, make sure WireGuard traffic is not blocked at the infrastructure level.

```bash
# KubeSpan uses UDP port 51820 for WireGuard
# This is node-level traffic, not affected by Kubernetes network policies
# But make sure infrastructure firewalls allow it
```

## Auditing Network Policy Coverage

```bash
#!/bin/bash
# audit-network-policies.sh

echo "=== Network Policy Coverage Audit ==="

echo ""
echo "Namespaces without default-deny:"
ALL_NS=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')
for ns in $ALL_NS; do
  DENY=$(kubectl get networkpolicies -n $ns -o json | \
    jq '[.items[] | select(.spec.podSelector == {})] | length')
  if [ "$DENY" -eq 0 ]; then
    POD_COUNT=$(kubectl get pods -n $ns --no-headers 2>/dev/null | wc -l)
    if [ "$POD_COUNT" -gt 0 ]; then
      echo "  $ns ($POD_COUNT pods) [WARNING]"
    fi
  fi
done

echo ""
echo "Policy count per namespace:"
kubectl get networkpolicies --all-namespaces --no-headers | \
  awk '{print $1}' | sort | uniq -c | sort -rn
```

## Conclusion

Network policies are essential for securing pod communication in a Talos Linux cluster. Start with default-deny policies in every namespace, then carefully add allow rules for the specific traffic patterns your applications need. Use Cilium or Calico as your CNI since they actually enforce the policies. Test your policies thoroughly, use Hubble for visibility, and audit your coverage regularly. Network policies combined with Talos Linux's host-level security create a defense-in-depth strategy that limits the blast radius of any compromise.
