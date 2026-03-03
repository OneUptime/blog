# How to Set Up Default Deny Network Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Policies, Security, Kubernetes, Zero Trust

Description: Learn how to implement default deny network policies on Talos Linux at both the host level and Kubernetes level for a zero-trust network posture.

---

Default deny network policies are the foundation of a zero-trust network architecture. Instead of allowing all traffic and hoping nothing bad happens, you start by blocking everything and then explicitly allow only the traffic that is necessary. This approach dramatically reduces your attack surface because even if an attacker compromises one workload, they cannot freely communicate with other services in the cluster.

Talos Linux gives you two layers where you can implement default deny policies: the host level (using NetworkRuleConfig documents) and the Kubernetes level (using NetworkPolicies). This guide covers both approaches and shows you how to build a comprehensive default-deny network posture.

## Understanding the Two Layers

Before diving into configuration, it is important to understand how these two layers interact:

**Host-level rules (NetworkRuleConfig)**: Control traffic to and from the node itself. These protect system services like the Talos API, etcd, and the kubelet. They operate at the nftables level, before Kubernetes sees any traffic.

**Kubernetes NetworkPolicies**: Control traffic between pods. These are enforced by your CNI plugin (Cilium, Calico, etc.) and only affect traffic within the Kubernetes network.

For true default-deny, you want both layers in place.

## Host-Level Default Deny

When you create NetworkRuleConfig documents in Talos, the firewall switches to a default-deny posture for the specified services. You then explicitly allow the traffic you need.

Here is a comprehensive default-deny setup for a control plane node:

```yaml
# Host-level firewall for control plane - allow only necessary traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-default-deny
spec:
  ingress:
    # Talos API - management network only
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000

    # Kubernetes API - from nodes and authorized clients
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 6443

    # etcd - control plane subnet only
    - subnet: 10.0.1.0/24
      protocol: tcp
      ports:
        - 2379
        - 2380

    # Kubelet - from control plane subnet (API server)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 10250

    # Cluster discovery
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 10250
```

And for worker nodes:

```yaml
# Host-level firewall for workers - minimal access
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: worker-default-deny
spec:
  ingress:
    # Talos API - management only
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000

    # Kubelet
    - subnet: 10.0.1.0/24
      protocol: tcp
      ports:
        - 10250

    # NodePort services (if needed)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 30000-32767
```

## Kubernetes Default Deny NetworkPolicies

At the Kubernetes layer, you create NetworkPolicies that deny all ingress and egress traffic by default. These policies use empty pod selectors to match all pods in a namespace:

```yaml
# Default deny all ingress traffic in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}      # Matches all pods in the namespace
  policyTypes:
    - Ingress
```

```yaml
# Default deny all egress traffic in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

```yaml
# Default deny both ingress and egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Deploying Default Deny Through Inline Manifests

The best way to ensure default deny policies exist from cluster creation is through Talos inline manifests:

```yaml
# Deploy default deny policies during cluster bootstrap
cluster:
  inlineManifests:
    - name: default-deny-policies
      contents: |
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-all
          namespace: default
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
            - Egress
        ---
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-all
          namespace: production
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
            - Egress
        ---
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-all
          namespace: staging
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
            - Egress
```

## Allowing DNS Traffic

When you deny all egress, pods cannot resolve DNS names, which breaks most applications. You need to explicitly allow DNS traffic:

```yaml
# Allow DNS egress for all pods in the namespace
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
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

This allows all pods in the `production` namespace to make DNS queries to CoreDNS in `kube-system`.

## Allowing Specific Service Communication

After establishing default deny, you create allow policies for each legitimate communication path:

```yaml
# Allow web frontend to talk to the API backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web-frontend
      ports:
        - protocol: TCP
          port: 8080
---
# Allow API backend to talk to the database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-database
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-backend
      ports:
        - protocol: TCP
          port: 5432
```

## Automating Default Deny Across Namespaces

Manually creating default deny policies for every namespace is tedious. You can automate this with a few approaches:

Using a shell script:

```bash
#!/bin/bash
# Create default deny policies for all non-system namespaces

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep -v '^kube-'); do
  echo "Creating default deny for namespace: $ns"
  kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: $ns
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: $ns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
EOF
done
```

For a more sustainable approach, use an admission controller or policy engine like Kyverno to automatically create default deny policies whenever a new namespace is created.

## Protecting System Namespaces

Be careful with `kube-system`. Applying a strict default deny to `kube-system` can break core cluster services. If you want to restrict `kube-system`, do it gradually and with very specific allow rules:

```yaml
# Restricted kube-system policy (be very careful)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-ingress
  namespace: kube-system
spec:
  podSelector:
    matchLabels:
      k8s-app: kube-dns
  policyTypes:
    - Ingress
  ingress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Verifying Default Deny Is Working

Test that default deny is actually blocking traffic:

```bash
# Deploy test pods
kubectl -n production run source --image=busybox --command -- sleep 3600
kubectl -n production run target --image=nginx

# Test connectivity (should fail with default deny)
kubectl -n production exec source -- wget -T 5 -q -O- http://target
# Expected: wget: download timed out

# Apply an allow policy and test again
# (After creating an appropriate NetworkPolicy)
kubectl -n production exec source -- wget -T 5 -q -O- http://target
# Expected: HTML output from nginx

# Clean up
kubectl -n production delete pod source target
```

## Monitoring Policy Violations

If your CNI supports it, enable logging for dropped traffic. Cilium, for example, can log policy denials:

```bash
# View Cilium policy verdict logs
kubectl -n kube-system exec -it cilium-agent-xxx -- cilium monitor --type drop
```

This helps you identify legitimate traffic that is being blocked so you can create appropriate allow rules.

## Best Practices

Apply default deny to every namespace except `kube-system` (unless you are confident in your allow rules). Always include a DNS allow policy alongside default deny egress. Build allow policies incrementally - deploy the application, observe what traffic it needs, and create specific policies. Use labels consistently across your deployments so that NetworkPolicies can reference them reliably. Test policies in a staging environment before production. Document your network policy architecture so the team understands the intended communication patterns.

Default deny is the single most impactful network security measure you can implement in a Kubernetes cluster. Combined with Talos host-level firewall rules, it creates a robust defense-in-depth architecture that significantly limits the blast radius of any security incident.
