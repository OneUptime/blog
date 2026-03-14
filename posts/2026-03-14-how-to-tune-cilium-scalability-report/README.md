# How to Tune Cilium Scalability report

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Performance

Description: A practical guide covering how to tune cilium scalability report with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

Performance tuning is an iterative process that requires understanding your workload patterns, cluster size, and growth trajectory. Cilium provides numerous configuration knobs that can be adjusted to optimize for your specific environment.

In this guide, we cover tuning Cilium for scalability in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster (v1.21+) with Cilium installed (v1.14+)
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Identifying Tuning Opportunities

Start by profiling your current Cilium deployment to identify areas for improvement.

```bash
# Profile current resource usage
kubectl top pods -n kube-system -l k8s-app=cilium

# Check identity management efficiency
cilium identity list | wc -l

# Check policy regeneration performance
kubectl logs -n kube-system -l k8s-app=cilium --tail=200 | grep "regeneration completed" | tail -5

# Review current configuration
cilium config view
```

## Applying Tuning Changes

### Resource Tuning

```yaml
# cilium-tuning-values.yaml
# Optimized resource allocation for performance
resources:
  limits:
    cpu: "2000m"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

operator:
  resources:
    limits:
      cpu: "1000m"
      memory: "1Gi"
```

### Identity and Policy Tuning

```yaml
# Identity optimization
labels:
  exclude:
    - "k8s:pod-template-hash"
    - "k8s:controller-revision-hash"
    - "k8s:job-name"

identityAllocationMode: "crd"
identityGCInterval: "15m"

# BPF map optimization
bpf:
  mapDynamicSizeRatio: 0.0025
  masquerade: true
```

```bash
# Apply tuning configuration
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-tuning-values.yaml

# Wait for rollout
kubectl rollout status daemonset/cilium -n kube-system
```

## Measuring Improvement

```bash
# Compare metrics before and after tuning
kubectl top pods -n kube-system -l k8s-app=cilium
cilium identity list | wc -l
cilium metrics list | grep -E "regeneration|identity"
```

```mermaid
flowchart TD
    A[Profile Current State] --> B[Identify Bottlenecks]
    B --> C[Plan Tuning Changes]
    C --> D[Apply via Helm]
    D --> E[Measure Impact]
    E --> F{Improved?}
    F -->|Yes| G[Document and Monitor]
    F -->|No| H[Try Different Parameters]
    H --> C
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Check overall Cilium deployment health
cilium status --verbose

# Verify inter-node connectivity
cilium health status

# Confirm all Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify the Cilium operator is healthy
kubectl get pods -n kube-system -l name=cilium-operator

# Check for recent error events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Run a connectivity test to validate the data plane
cilium connectivity test --single-node

# Verify endpoint count matches expected pod count
echo "Cilium endpoints: $(cilium endpoint list -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **Cilium agent not starting**: Check resource limits and node capacity with `kubectl describe pod -n kube-system -l k8s-app=cilium`. Verify the BPF filesystem is mounted at `/sys/fs/bpf` and the kernel version is 4.19 or later. Check init container logs with `kubectl logs -n kube-system <pod> -c cilium-init`.

- **Connectivity failures**: Run `cilium connectivity test` and inspect the specific failing test case. Check for conflicting network policies with `cilium policy get`. Verify inter-node tunnel connectivity with `cilium bpf tunnel list`.

- **Configuration not applied**: Verify the Helm values or ConfigMap are correctly formatted. Run `kubectl rollout restart daemonset/cilium -n kube-system` and wait for the rollout to complete. Confirm with `cilium config view`.

- **High resource usage**: Review resource consumption with `kubectl top pods -n kube-system -l k8s-app=cilium`. Consider tuning label exclusion to reduce identity count. Increase agent memory limits if needed. Check `cilium metrics list | grep process_resident_memory`.

- **Endpoints stuck in regenerating state**: This usually indicates the agent is overloaded or encountering errors during BPF program compilation. Check agent logs with `kubectl logs -n kube-system -l k8s-app=cilium --tail=200 | grep -i error`.

- **Policy not being enforced**: Verify the policy selectors match the intended pods using `cilium endpoint list`. Confirm the policy is applied with `cilium policy get`. Check that the endpoint has the correct identity with `cilium endpoint get <id>`.

To collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing all diagnostic information
# This collects logs, configs, BPF maps, and cluster state
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered tuning Cilium for scalability with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
