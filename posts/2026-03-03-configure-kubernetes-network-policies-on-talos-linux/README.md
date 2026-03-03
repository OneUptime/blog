# How to Configure Kubernetes Network Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Network Policies, Security, CNI

Description: A practical guide to configuring Kubernetes network policies on Talos Linux to control pod-to-pod communication and secure your cluster workloads.

---

Network policies are one of the most important security features in Kubernetes, and when you are running Talos Linux as your operating system, getting them right is especially important. Because Talos is immutable and does not allow SSH access, your cluster's network configuration is entirely managed through Kubernetes resources and the Talos machine config. This guide walks through setting up network policies from scratch on a Talos Linux cluster.

## Prerequisites

Before network policies can do anything useful, you need a CNI plugin that actually enforces them. Not every CNI supports network policies. Talos Linux ships with Flannel by default, and Flannel does not enforce network policies on its own. You will need to use a CNI like Cilium, Calico, or Weave Net that supports policy enforcement.

To switch to Cilium on Talos Linux, you can modify your machine configuration:

```yaml
# talos-machine-config.yaml snippet
cluster:
  network:
    cni:
      name: none  # Disable default Flannel
  inlineManifests:
    - name: cilium-install
      contents: |
        # Your Cilium installation manifest goes here
```

Then install Cilium using Helm or its CLI:

```bash
# Install Cilium CLI
cilium install --version 1.15.0

# Verify Cilium is running
cilium status
```

## Understanding Network Policy Basics

A Kubernetes NetworkPolicy is a namespaced resource that selects pods using labels and defines rules for ingress (incoming) and egress (outgoing) traffic. When you create your first network policy in a namespace, any pod selected by that policy becomes isolated - all traffic not explicitly allowed by a policy is denied.

Here is the basic structure:

```yaml
# basic-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: example-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              role: database
      ports:
        - protocol: TCP
          port: 5432
```

This policy applies to pods labeled `app: web`. It allows incoming traffic only from pods labeled `role: frontend` on port 8080, and outgoing traffic only to pods labeled `role: database` on port 5432.

## Default Deny All Traffic

The first policy you should create in any namespace is a default deny policy. This blocks all traffic that is not explicitly allowed by other policies:

```yaml
# default-deny-all.yaml
# Block all ingress and egress traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # Selects all pods in the namespace
  policyTypes:
    - Ingress
    - Egress
```

Apply it:

```bash
kubectl apply -f default-deny-all.yaml
```

After applying this, no pod in the production namespace can send or receive any traffic. You will then layer on specific allow rules.

## Allowing Specific Ingress Traffic

Let's say you have a web application that needs to receive traffic from a frontend service:

```yaml
# allow-frontend-to-web.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-web
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 3000
```

This allows the frontend pods to reach the web-api pods on port 3000, while everything else remains blocked.

## Allowing Specific Egress Traffic

Your web API probably needs to talk to a database and maybe an external API. Here is how to set up egress rules:

```yaml
# allow-web-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow traffic to the database
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS resolution (critical - without this, nothing works)
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

Notice the DNS rule. This is essential. Without allowing DNS traffic, your pods will not be able to resolve service names, and almost everything will break.

## Allowing Traffic from Specific Namespaces

Sometimes you need pods in one namespace to communicate with pods in another. You can use namespace selectors for this:

```yaml
# allow-monitoring-access.yaml
# Allow Prometheus in the monitoring namespace to scrape metrics
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
```

For this to work, your monitoring namespace needs the appropriate label:

```bash
# Label the monitoring namespace
kubectl label namespace monitoring name=monitoring
```

## CIDR-Based Rules for External Access

If your pods need to reach external services outside the cluster, you can use CIDR blocks:

```yaml
# allow-external-api.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow traffic to a specific external API
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24
      ports:
        - protocol: TCP
          port: 443
```

## Testing Your Network Policies

After applying policies, always test them. You can use a debug pod:

```bash
# Launch a test pod
kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh

# From inside the pod, try to reach the web-api
wget -qO- --timeout=3 http://web-api.production.svc:3000/health

# Try to reach something that should be blocked
wget -qO- --timeout=3 http://postgres.production.svc:5432
```

You can also use Cilium's built-in policy monitoring if you are running Cilium:

```bash
# Monitor policy decisions in real time
cilium monitor --type policy-verdict

# Check if policies are being enforced
cilium endpoint list
```

## Debugging Policy Issues on Talos

When policies do not work as expected on Talos Linux, check a few things. First, make sure your CNI is actually enforcing policies:

```bash
# For Cilium
cilium status | grep "Policy Enforcement"

# Check that network policies are loaded
kubectl get networkpolicies -A
```

Since you cannot SSH into Talos nodes directly, use `talosctl` to inspect network state:

```bash
# Check the CNI configuration on a node
talosctl get extensions --nodes <node-ip>

# View network interfaces
talosctl get addresses --nodes <node-ip>

# Check system logs for CNI issues
talosctl logs -k --nodes <node-ip> | grep -i cilium
```

## Best Practices for Talos Linux

Keep a few things in mind when working with network policies on Talos. Always start with a default deny policy and add allow rules incrementally. Label your namespaces so that namespace-based selectors work properly. Never forget the DNS egress rule because it is the most common cause of mysterious connectivity failures. Use pod labels consistently across your deployments so that policies are predictable. And finally, test your policies in a staging environment before applying them to production, because a misconfigured policy can take down your entire application.

Network policies on Talos Linux work the same way they do on any Kubernetes distribution, but the immutable nature of Talos makes it even more important to plan your policies carefully. You cannot quickly jump onto a node to debug networking issues, so having well-structured, well-tested policies from the start will save you significant time and trouble.
