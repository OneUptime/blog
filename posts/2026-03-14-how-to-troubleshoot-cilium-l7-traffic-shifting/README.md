# Troubleshooting Cilium L7 Traffic Shifting Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, L7, Traffic Shifting, Troubleshooting

Description: How to diagnose and fix Cilium L7 traffic shifting problems including uneven distribution, configuration errors, and backend routing failures.

---

## Introduction

Traffic shifting issues manifest as all traffic going to one version, weights not being respected, or errors when shifting begins. Because traffic shifting runs through the Envoy proxy, debugging requires checking both the CiliumEnvoyConfig and Envoy runtime state.

## Prerequisites

- Kubernetes cluster with Cilium L7 proxy and traffic shifting configured
- kubectl and Cilium CLI configured
- Multiple service versions deployed

## Diagnosing Shifting Issues

```bash
# Check CiliumEnvoyConfig status
kubectl get ciliumenvoyconfigs -n default -o yaml

# Verify Envoy weighted cluster configuration
kubectl exec -n kube-system <cilium-pod> -- \
  curl -s localhost:9901/config_dump | \
  jq '.configs[] | select(.["@type"] | contains("RoutesConfigDump"))' | \
  grep -A20 "weighted_clusters"

# Check cluster health for both versions
kubectl exec -n kube-system <cilium-pod> -- \
  curl -s localhost:9901/clusters | grep -E "backend-v[12]"
```

```mermaid
graph TD
    A[Traffic Shifting Issue] --> B{Config Applied?}
    B -->|No| C[Check CiliumEnvoyConfig]
    B -->|Yes| D{Both Backends Healthy?}
    D -->|No| E[Fix Backend Health]
    D -->|Yes| F{Weights Correct?}
    F -->|No| G[Update Weights]
    F -->|Yes| H[Check Envoy Stats]
```

## Fixing Uneven Distribution

```bash
# Verify both backend versions have healthy endpoints
kubectl get endpoints backend-v1 -n default
kubectl get endpoints backend-v2 -n default

# Test with enough requests to see distribution
for i in $(seq 1 200); do
  kubectl exec deploy/client -- curl -s http://backend/ 2>/dev/null &
done
wait

# Check Envoy stats for per-cluster request counts
kubectl exec -n kube-system <cilium-pod> -- \
  curl -s localhost:9901/stats | grep "upstream_rq_total" | grep backend
```

## Verification

```bash
kubectl get ciliumenvoyconfigs -n default
kubectl get pods -l app=backend -o wide
hubble observe --protocol http --to-label app=backend --last 50
```

## Troubleshooting

- **All traffic to v1**: CiliumEnvoyConfig may not be applied. Check L7 proxy is enabled.
- **Statistical variance**: Need 1000+ requests for weights to converge. Small samples show variance.
- **One version gets 503s**: That version may have unhealthy pods. Check readiness probes.
- **Config rejected**: Weighted clusters must reference valid Envoy cluster names. Check naming.

## Conclusion

Traffic shifting troubleshooting focuses on configuration correctness, backend health, and sample size. Verify both versions are healthy, ensure CiliumEnvoyConfig uses correct cluster names, and test with enough requests to observe the configured weights.