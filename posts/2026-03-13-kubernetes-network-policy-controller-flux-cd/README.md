# How to Deploy Kubernetes Network Policy Controller with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Network-policy, Flux-cd, GitOps, Calico, Cilium, CNI

Description: Learn how to deploy a Kubernetes network policy controller (Calico or Cilium) using Flux CD and manage NetworkPolicy resources through GitOps.

---

## Introduction

Kubernetes NetworkPolicy resources define how pods can communicate with each other and with external services. However, NetworkPolicies require a CNI plugin that supports them-not all CNI plugins enforce NetworkPolicy by default. Deploying a policy-aware CNI controller like Calico or Cilium via Flux CD ensures consistent network security across clusters, with all policy changes tracked in Git.

## Prerequisites

- A Kubernetes cluster (CNI-agnostic at this stage)
- Flux CD bootstrapped
- Cluster admin permissions for CNI installation
- kubectl and flux CLI

## Step 1: Deploy Cilium CNI via Flux HelmRelease

Cilium provides eBPF-based networking with advanced NetworkPolicy support:

```yaml
# clusters/production/infrastructure/cilium.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cilium
      version: "1.15.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
  values:
    # Enable Kubernetes NetworkPolicy enforcement
    policyEnforcementMode: default
    # Enable Hubble for network observability
    hubble:
      enabled: true
      relay:
        enabled: true
      ui:
        enabled: true
    # Enable NetworkPolicy logging
    monitor:
      enabled: true
    # Resource limits
    resources:
      requests:
        cpu: 100m
        memory: 512Mi
      limits:
        cpu: "2"
        memory: 2Gi
```

## Step 2: Deploy Calico (Alternative)

For teams preferring Calico:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: projectcalico
  namespace: flux-system
spec:
  interval: 1h
  url: https://docs.tigera.io/calico/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: calico
  namespace: tigera-operator
spec:
  interval: 1h
  chart:
    spec:
      chart: tigera-operator
      version: "v3.27.x"
      sourceRef:
        kind: HelmRepository
        name: projectcalico
  values:
    installation:
      cniType: Calico
      calicoNetwork:
        bgp: Disabled
        ipPools:
          - cidr: 10.244.0.0/16
            encapsulation: VXLAN
```

## Step 3: Define Default-Deny NetworkPolicies

```yaml
# apps/myapp/network-policies/default-deny.yaml
# Deny all ingress and egress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: myapp
spec:
  podSelector: {}  # Applies to all pods in the namespace
  policyTypes:
    - Ingress
    - Egress
```

## Step 4: Allow Specific Traffic

```yaml
# apps/myapp/network-policies/allow-ingress.yaml
# Allow ingress from ingress-nginx only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-nginx
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
---
# Allow egress to database and DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress
  namespace: myapp
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
              kubernetes.io/metadata.name: database
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Step 5: Organize NetworkPolicies in Fleet Repository

```plaintext
fleet-repo/
  apps/
    myapp/
      network-policies/
        kustomization.yaml
        default-deny.yaml
        allow-ingress-nginx.yaml
        allow-egress-db.yaml
        allow-monitoring.yaml
```

```yaml
# apps/myapp/network-policies/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - default-deny.yaml
  - allow-ingress-nginx.yaml
  - allow-egress-db.yaml
  - allow-monitoring.yaml
```

## Step 6: Verify Network Policy Enforcement

```bash
# Check Cilium is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=cilium

# Test NetworkPolicy enforcement with Cilium CLI
cilium connectivity test

# Test that default-deny is working
kubectl run test-blocked --image=busybox:1.36 --rm -it --restart=Never \
  -n myapp -- wget -O- http://external-service --timeout=5
# Should fail if egress is blocked

# View Hubble flow logs for denied traffic
kubectl -n kube-system exec -it ds/cilium -- cilium monitor --type drop
```

## Best Practices

- Always start with a default-deny policy and then add explicit allow rules; this is the principle of least privilege.
- Use namespace labels (`kubernetes.io/metadata.name`) in NetworkPolicy `namespaceSelector` for reliable namespace matching.
- Always include a DNS egress rule when using default-deny egress; pods cannot resolve names without it.
- Use Cilium's Hubble for visibility into which network connections are being allowed or denied.
- Test NetworkPolicies in staging before production; a misconfigured policy can silently break application connectivity.
- Version and review NetworkPolicy changes through Git PRs; they are security-critical configuration.

## Conclusion

Deploying a network policy controller via Flux CD and managing NetworkPolicies through GitOps gives you a security-first networking posture where all policy changes are versioned, reviewed, and auditable. The default-deny approach ensures that only explicitly permitted communication is allowed, significantly reducing the blast radius of any compromised pod.
