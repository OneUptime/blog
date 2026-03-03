# How to Block Inter-Namespace Traffic on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Network Policies, Namespace Isolation, Security

Description: Step-by-step instructions for blocking traffic between Kubernetes namespaces on Talos Linux to enforce workload isolation and improve cluster security.

---

One of the most common security requirements in multi-tenant Kubernetes clusters is keeping traffic separated between namespaces. Whether you are running different teams' workloads, isolating staging from production, or meeting compliance requirements, blocking inter-namespace traffic on Talos Linux is a fundamental task. This post covers how to do it properly, including the edge cases that catch people off guard.

## Why Namespace Isolation Matters

By default, Kubernetes does not enforce any network boundaries between namespaces. A pod in the `development` namespace can freely reach a pod in the `production` namespace, and vice versa. This is fine for small clusters with trusted workloads, but it becomes a real problem as your cluster grows or when you have workloads with different security requirements.

On Talos Linux, where the OS layer is locked down and immutable, namespace isolation through network policies is your primary tool for controlling lateral movement within the cluster. You cannot rely on host-level firewalls because there is no way to install them on a Talos node.

## Choosing a CNI That Supports Network Policies

Before any of this works, you need a CNI plugin that enforces network policies. Talos ships with Flannel by default, which does not enforce policies. The two most popular choices for policy-aware CNIs on Talos are Cilium and Calico.

To install Cilium on Talos, update your machine configuration to disable the default CNI:

```yaml
# talos-patch-cni.yaml
cluster:
  network:
    cni:
      name: none
```

Apply the patch:

```bash
# Patch the machine config
talosctl patch machineconfig --patch @talos-patch-cni.yaml --nodes <node-ip>
```

Then install Cilium:

```bash
# Install Cilium with policy enforcement enabled
helm install cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set policyEnforcementMode=default
```

## The Default Deny Approach

The cleanest way to block inter-namespace traffic is to apply a default deny policy to each namespace. This blocks all ingress and egress traffic that is not explicitly allowed:

```yaml
# default-deny.yaml
# Apply this to every namespace where you want isolation
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

Apply it to each namespace:

```bash
# Apply to production
kubectl apply -f default-deny.yaml

# Repeat for other namespaces, changing the namespace field
kubectl apply -f default-deny.yaml -n staging
kubectl apply -f default-deny.yaml -n development
```

This is the nuclear option. After applying this, nothing can communicate with anything. You then build up allow rules for the traffic you actually want.

## Blocking Cross-Namespace Ingress Only

If you want a less restrictive approach that only blocks incoming traffic from other namespaces while allowing pods within the same namespace to communicate freely:

```yaml
# deny-cross-namespace-ingress.yaml
# Allow same-namespace traffic, block everything else
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}  # Allow all pods in the same namespace
```

This policy selects all pods in the namespace and only allows ingress from other pods within the same namespace. Traffic from pods in other namespaces is denied.

## Allowing Essential Cross-Namespace Traffic

After locking things down, you will almost certainly need to allow some cross-namespace traffic. Here are the most common exceptions.

### DNS Resolution

Pods need to reach CoreDNS, which runs in the `kube-system` namespace:

```yaml
# allow-dns.yaml
# Allow all pods to reach CoreDNS for name resolution
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
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Monitoring and Observability

If you run Prometheus or another monitoring tool in a dedicated namespace, it needs access to scrape metrics from all namespaces:

```yaml
# allow-prometheus-scrape.yaml
# Let Prometheus scrape metrics from production pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector:
    matchLabels:
      prometheus-scrape: "true"
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 9091
```

### Ingress Controllers

Your ingress controller (running in its own namespace) needs to reach services in application namespaces:

```yaml
# allow-ingress-controller.yaml
# Allow the ingress controller to reach web services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
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
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

## Automating Policy Application

Applying policies to every namespace manually is tedious and error-prone. You can use a script to apply the default deny policy to all non-system namespaces:

```bash
#!/bin/bash
# apply-isolation.sh
# Apply default deny policy to all application namespaces

SYSTEM_NAMESPACES="kube-system kube-public kube-node-lease"

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces
  if echo "$SYSTEM_NAMESPACES" | grep -q "$ns"; then
    echo "Skipping system namespace: $ns"
    continue
  fi

  echo "Applying isolation to namespace: $ns"
  cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: $ns
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
EOF
done
```

For a more robust solution, consider using a policy engine like Kyverno or OPA Gatekeeper to automatically apply network policies when new namespaces are created:

```yaml
# kyverno-auto-isolation.yaml
# Automatically apply namespace isolation when namespaces are created
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-namespace-isolation
spec:
  rules:
    - name: add-deny-cross-namespace
      match:
        resources:
          kinds:
            - Namespace
      exclude:
        resources:
          namespaces:
            - kube-system
            - kube-public
      generate:
        kind: NetworkPolicy
        apiVersion: networking.k8s.io/v1
        name: deny-cross-namespace
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
            ingress:
              - from:
                  - podSelector: {}
```

## Verifying Isolation

Always verify that your policies are working. Create test pods in different namespaces and try to communicate between them:

```bash
# Create a test pod in the production namespace
kubectl run test-prod --image=busybox --rm -it -n production --restart=Never -- sh

# Try to reach a service in the staging namespace (should fail)
wget -qO- --timeout=3 http://my-service.staging.svc:8080

# Try to reach a service in the same namespace (should succeed)
wget -qO- --timeout=3 http://web-api.production.svc:8080
```

If you are using Cilium, you can inspect policy verdicts:

```bash
# Watch policy decisions in real time
cilium monitor --type policy-verdict -n production
```

## Things That Go Wrong

A few common mistakes trip people up. Forgetting to allow DNS is the biggest one - pods will fail to resolve service names and everything looks broken for no obvious reason. Another common issue is forgetting about the ingress controller; your services will become unreachable from outside the cluster. Also, be careful with how you label namespaces. The `kubernetes.io/metadata.name` label is automatically set by Kubernetes 1.21 and later, but older clusters might not have it.

On Talos Linux specifically, remember that you need to use `talosctl` for all node-level debugging since there is no SSH access. Use `talosctl logs` and `talosctl dmesg` to investigate network-level issues that might be related to the CNI rather than your policies.

Blocking inter-namespace traffic is a foundational security measure for any production Kubernetes cluster. On Talos Linux, where the operating system itself is locked down, network policies are your primary tool for enforcing boundaries between workloads. Start with a default deny policy, add explicit allow rules for the traffic you need, and always test your policies before relying on them.
