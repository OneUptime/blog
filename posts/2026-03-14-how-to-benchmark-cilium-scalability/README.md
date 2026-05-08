# How to Benchmark Cilium Scalability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Performance

Description: A practical guide covering how to benchmark cilium scalability with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

Benchmarking is the foundation of performance engineering. Without proper benchmarks, optimization efforts are guesswork. Cilium's eBPF-based architecture provides high performance by default, but understanding the limits of your specific deployment requires systematic measurement.

In this guide, we cover benchmarking Cilium scalability in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster with a supported Cilium version for that Kubernetes release
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Preparing the Benchmark Environment

Set up a clean environment for accurate benchmarking results.

```bash
# Record baseline state

cilium status
CILIUM_POD=$(kubectl -n kube-system get pod -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
echo "Baseline identities: $(kubectl get ciliumidentities --no-headers 2>/dev/null | wc -l)"
echo "Baseline endpoints: $(kubectl get ciliumendpoints -A --no-headers 2>/dev/null | wc -l)"
kubectl top pods -n kube-system -l k8s-app=cilium

# Ensure monitoring is enabled for data collection
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true
```

## Running Benchmarks

### Workload Scaling Benchmark

```bash
# Create test namespaces
for ns in $(seq 1 5); do
  kubectl create namespace bench-ns-$ns
done

# Deploy workloads progressively
for ns in $(seq 1 5); do
  for dep in $(seq 1 10); do
    kubectl create deployment bench-$dep \
      --image=nginx:alpine \
      --namespace=bench-ns-$ns \
      --replicas=5
  done
  echo "Deployed to bench-ns-$ns, current identity count: $(kubectl get ciliumidentities --no-headers 2>/dev/null | wc -l)"
done
```

### Network Policy Benchmark

```yaml
# bench-policy.yaml
# Test network policy at scale
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: bench-policy
spec:
  endpointSelector:
    matchLabels:
      app: bench-1
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: bench-2
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
```

```bash
# Apply policies across all namespaces
for ns in $(seq 1 5); do
  for i in $(seq 1 10); do
    sed -e "s/name: bench-policy/name: bench-policy-$i/" -e "s/bench-1/bench-$i/g" bench-policy.yaml | kubectl apply -n bench-ns-$ns -f -
  done
done
```

## Collecting Results

```bash
# Record post-benchmark metrics
echo "=== Benchmark Results ==="
echo "Identity count: $(kubectl get ciliumidentities --no-headers 2>/dev/null | wc -l)"
echo "Endpoint count: $(kubectl get ciliumendpoints -A --no-headers 2>/dev/null | wc -l)"
kubectl top pods -n kube-system -l k8s-app=cilium
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg metrics list | grep -E "endpoint_regenerations|endpoint_regeneration_time|identity"
```

```mermaid
flowchart LR
    A[Baseline] --> B[Deploy Workloads]
    B --> C[Apply Policies]
    C --> D[Collect Metrics]
    D --> E[Analyze Results]
    E --> F[Report]
```

## Cleanup

```bash
# Remove benchmark resources
for ns in $(seq 1 5); do
  kubectl delete namespace bench-ns-$ns
done
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Check overall Cilium deployment health
cilium status --verbose

# Verify inter-node connectivity
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-health status --verbose

# Confirm all Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify the Cilium operator is healthy
kubectl get deployment cilium-operator -n kube-system

# Check for recent error events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Run a connectivity test to validate the data plane
cilium connectivity test --single-node

# Verify endpoint count matches expected pod count
echo "Cilium endpoints: $(kubectl get ciliumendpoints -A -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("items", [])))' 2>/dev/null || echo 'N/A')"
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **Cilium agent not starting**: Check resource limits and node capacity with `kubectl describe pod -n kube-system -l k8s-app=cilium`. Verify the BPF filesystem is mounted at `/sys/fs/bpf` and the kernel version is supported by your Cilium release. Current Cilium releases require Linux kernel 5.10 or later, or a documented distribution equivalent. Check init container logs with `kubectl logs -n kube-system <pod> -c cilium-init`.

- **Connectivity failures**: Run `cilium connectivity test` and inspect the specific failing test case. Check for conflicting network policies with `kubectl get networkpolicies,ciliumnetworkpolicies,ciliumclusterwidenetworkpolicies -A`. Verify inter-node tunnel connectivity with `kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg bpf tunnel list`.

- **Configuration not applied**: Verify the Helm values or ConfigMap are correctly formatted. Run `kubectl rollout restart daemonset/cilium -n kube-system` and wait for the rollout to complete. Confirm with `cilium config view`.

- **High resource usage**: Review resource consumption with `kubectl top pods -n kube-system -l k8s-app=cilium`. Consider tuning label exclusion to reduce identity count. Increase agent memory limits if needed. Check `kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg metrics list | grep process_resident_memory_bytes`.

- **Endpoints stuck in regenerating state**: This usually indicates the agent is overloaded or encountering errors during BPF program compilation. Check agent logs with `kubectl logs -n kube-system -l k8s-app=cilium --tail=200 | grep -i error`.

- **Policy not being enforced**: Verify the policy selectors match the intended pods using `kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg endpoint list`. Confirm the policy is applied with `kubectl get ciliumnetworkpolicies -A`. Check that the endpoint has the correct identity with `kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg endpoint get <id>`.

To collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing all diagnostic information
# This collects logs, configs, BPF maps, and cluster state
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered benchmarking Cilium scalability with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
