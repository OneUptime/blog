# Monitor Cilium on k0s Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K0s, EBPF

Description: Learn how to deploy and monitor Cilium on k0s, a minimal Kubernetes distribution, including health checks, Hubble observability, and network policy validation.

---

## Introduction

k0s is a lightweight, single-binary Kubernetes distribution designed for simplicity and minimal resource overhead. Like K3s, k0s ships with a default CNI (kube-router), but teams requiring Cilium's advanced eBPF capabilities, network policy enforcement, and Hubble observability can replace kube-router with Cilium.

Monitoring Cilium on k0s requires understanding both k0s's unique cluster structure (no separate etcd, embedded control plane) and Cilium's standard monitoring interfaces. Because k0s uses a simplified node architecture, some Cilium monitoring approaches need minor adjustments compared to standard kubeadm clusters.

This guide covers installing Cilium on k0s, setting up Hubble for observability, and monitoring Cilium health in the k0s environment.

## Prerequisites

- k0s cluster v1.27+ with controller and worker nodes
- `k0sctl` or direct SSH access to k0s controller
- `kubectl` configured for the k0s cluster (`k0s kubeconfig admin`)
- `cilium` CLI v0.15+ installed
- Helm v3.10+ for Cilium installation via Helm

## Step 1: Install Cilium on k0s

Configure k0s to use Cilium as its CNI by disabling the default kube-router.

Create a k0s configuration file with Cilium CNI settings:

```yaml
# k0s-config.yaml - k0s configuration with Cilium CNI
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  network:
    provider: custom              # Use custom CNI instead of default kube-router
    podCIDR: 10.244.0.0/16
    serviceCIDR: 10.96.0.0/12
  # Disable default CNI extensions
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
          kubeProxyReplacement: strict
          k8sServiceHost: <controller-ip>
          k8sServicePort: 6443
          hubble:
            enabled: true
            relay:
              enabled: true
```

Apply the configuration and create the k0s cluster:

```bash
# Apply k0s config with Cilium CNI
k0sctl apply --config k0s-config.yaml

# Get kubeconfig for kubectl access
k0sctl kubeconfig > ~/.kube/config

# Verify cluster is up and Cilium is being deployed
kubectl get pods -n kube-system -l k8s-app=cilium -w
```

## Step 2: Verify Cilium is Running on k0s

Confirm all Cilium components are healthy after installation.

Check Cilium status and node connectivity:

```bash
# Check overall Cilium health
cilium status --wait

# Verify all Cilium DaemonSet pods are running
kubectl get daemonset cilium -n kube-system

# Check that k0s nodes are registered with Cilium
kubectl get ciliumnodes -o wide

# Run Cilium connectivity test (uses test namespace)
cilium connectivity test --namespace cilium-test
```

## Step 3: Enable and Monitor with Hubble

Set up Hubble for network flow observability on the k0s cluster.

Configure Hubble and verify flow collection:

```bash
# Enable Hubble if not already enabled via k0s config
cilium hubble enable --ui

# Wait for Hubble relay to be ready
kubectl wait --for=condition=Ready pod -l k8s-app=hubble-relay \
  -n kube-system --timeout=120s

# Port-forward the Hubble relay
cilium hubble port-forward &

# Verify Hubble is receiving flows
hubble status

# Observe live network flows in the k0s cluster
hubble observe --follow
```

## Step 4: Monitor Cilium Network Policies

Validate that Cilium network policies are being enforced on k0s workloads.

Create and test a CiliumNetworkPolicy on the k0s cluster:

```yaml
# k0s-cilium-policy.yaml - test network policy for k0s with Cilium
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: web
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

Apply the policy and verify enforcement:

```bash
kubectl apply -f k0s-cilium-policy.yaml

# Monitor policy enforcement via Hubble
hubble observe --namespace default --verdict DROPPED --follow

# Check Cilium endpoint policy status
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium endpoint list
```

## Step 5: Set Up Prometheus Metrics for k0s Cilium

Configure Prometheus metrics collection for ongoing Cilium monitoring.

Enable Cilium Prometheus metrics and configure scraping:

```bash
# Check that Cilium metrics are exposed
kubectl get svc -n kube-system | grep cilium

# Port-forward to check metrics endpoint
kubectl port-forward -n kube-system svc/cilium-agent 9962:9962 &
curl http://localhost:9962/metrics | head -20

# Key metrics to monitor:
# cilium_endpoint_state{state="ready"} - healthy endpoints
# cilium_drop_count_total - network policy drops
# cilium_policy_count - active policies
# cilium_forward_count_total - forwarded packets
```

## Best Practices

- Use k0s's built-in Helm extension management to keep Cilium in sync with k0s upgrades
- Enable kube-proxy replacement in Cilium to reduce resource usage on k0s nodes
- Monitor Cilium DaemonSet rollout status during k0s version upgrades
- Use lightweight Hubble metrics mode on resource-constrained k0s edge nodes
- Configure OneUptime to monitor critical endpoints in the k0s cluster for continuous availability validation

## Conclusion

Running Cilium on k0s combines the simplicity of k0s with Cilium's powerful eBPF networking and observability capabilities. By configuring k0s to use Cilium as its CNI from the start and enabling Hubble for observability, you get a complete monitoring stack for your lightweight Kubernetes deployment. Use OneUptime to monitor application-level availability alongside Cilium's internal metrics for end-to-end network health visibility.
