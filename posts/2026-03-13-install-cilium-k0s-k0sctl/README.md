# Install Cilium on k0s with k0sctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K0s, EBPF

Description: Step-by-step guide to installing Cilium on k0s Kubernetes clusters using k0sctl for eBPF-powered networking and network policies.

---

## Introduction

k0s is a lightweight, zero-friction Kubernetes distribution from Mirantis. It supports Cilium as a CNI plugin through its add-on system, making it straightforward to deploy Cilium as part of the cluster provisioning process with k0sctl.

This guide covers deploying a k0s cluster with Cilium CNI using k0sctl, including Hubble observability configuration.

## Prerequisites

- `k0sctl` installed: `curl -sSfL https://get.k0sproject.io | sh`
- SSH access to target machines (or local access for single-node)
- Target machines with Linux and sufficient resources (2+ CPU, 4+ GB RAM)
- `kubectl` and `cilium` CLI installed on the management machine

## Step 1: Install k0sctl

```bash
# Install k0sctl binary
curl -sSfL https://github.com/k0sproject/k0sctl/releases/latest/download/k0sctl-linux-x64 \
  -o /usr/local/bin/k0sctl
chmod +x /usr/local/bin/k0sctl

# Verify installation
k0sctl version
```

## Step 2: Create k0s Cluster Configuration with Cilium

k0sctl uses a YAML configuration file to define the cluster. Specify Cilium as the CNI:

```yaml
# k0sctl-cilium-config.yaml - k0s cluster with Cilium CNI
apiVersion: k0sctl.k0sproject.io/v1beta1
kind: Cluster
metadata:
  name: k0s-cilium-cluster
spec:
  hosts:
    - ssh:
        address: <CONTROL_PLANE_IP>
        user: ubuntu
        keyPath: ~/.ssh/id_rsa
      role: controller+worker
    - ssh:
        address: <WORKER1_IP>
        user: ubuntu
        keyPath: ~/.ssh/id_rsa
      role: worker
    - ssh:
        address: <WORKER2_IP>
        user: ubuntu
        keyPath: ~/.ssh/id_rsa
      role: worker
  k0s:
    version: "1.29.2+k0s.0"
    dynamicConfig: false
    config:
      apiVersion: k0s.k0sproject.io/v1beta1
      kind: ClusterConfig
      metadata:
        name: k0s-cilium-cluster
      spec:
        # Disable kube-proxy since Cilium will replace it
        network:
          # Use Cilium as the CNI provider
          provider: custom
          podCIDR: 10.244.0.0/16
          serviceCIDR: 10.96.0.0/12
          kubeProxy:
            disabled: true
        # Deploy Cilium as a k0s add-on
        extensions:
          helm:
            repositories:
              - name: cilium
                url: https://helm.cilium.io/
            charts:
              - name: cilium
                chartname: cilium/cilium
                version: "1.15.0"
                namespace: kube-system
                values: |
                  ipam:
                    mode: kubernetes
                  kubeProxyReplacement: true
                  k8sServiceHost: <CONTROL_PLANE_IP>
                  k8sServicePort: "6443"
                  hubble:
                    relay:
                      enabled: true
                    ui:
                      enabled: true
                  prometheus:
                    enabled: true
```

## Step 3: Deploy the Cluster

```bash
# Apply the k0sctl configuration to deploy the cluster
k0sctl apply -c k0sctl-cilium-config.yaml

# This command provisions all nodes and installs k0s + Cilium
# Monitor the output for any errors

# Generate kubeconfig for the new cluster
k0sctl kubeconfig -c k0sctl-cilium-config.yaml > ~/.kube/k0s-cilium-config
export KUBECONFIG=~/.kube/k0s-cilium-config

# Verify cluster and Cilium are ready
kubectl get nodes
cilium status --wait
```

## Step 4: Verify Cilium Installation

```bash
# Check all Cilium pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=cilium

# Run the connectivity test
cilium connectivity test

# Check Hubble status
cilium hubble status

# Port-forward Hubble UI
cilium hubble ui &
```

## Step 5: Apply Network Policies on k0s + Cilium

```yaml
# k0s-cilium-policy.yaml - Network policy for k0s cluster
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-web-traffic
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: web
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: load-balancer
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
            - port: "443"
              protocol: TCP
  egress:
    # Allow DNS
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
    # Allow access to backend services
    - toEndpoints:
        - matchLabels:
            app: backend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

## Step 6: Upgrade k0s Cluster with Cilium

```bash
# Update the k0sctl config with a new k0s or Cilium version
# Then apply the upgrade
k0sctl apply -c k0sctl-cilium-config.yaml --no-drain

# Monitor Cilium upgrade
kubectl rollout status daemonset/cilium -n kube-system

# Verify after upgrade
cilium status --wait
cilium connectivity test
```

## Best Practices

- Use k0sctl's built-in add-on Helm chart mechanism to keep Cilium version in sync with the cluster definition
- Set `kubeProxy: disabled: true` when using Cilium's kube-proxy replacement for better performance
- Test k0sctl `apply` upgrades against a staging cluster before running on production
- Back up the k0sctl config file in Git for cluster reproducibility
- Enable k0s's built-in etcd backup for control plane data protection

## Conclusion

k0s with Cilium via k0sctl provides a clean, declarative way to provision Kubernetes clusters with eBPF-powered networking. The k0s add-on system makes Cilium a first-class citizen in the cluster lifecycle, installed and upgraded alongside k0s itself. For teams looking for a lightweight Kubernetes distribution with modern networking, k0s + Cilium is an excellent combination.
