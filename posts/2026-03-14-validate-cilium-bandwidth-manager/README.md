# Validating Cilium Bandwidth Manager

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking

Description: Systematically validate that Cilium Bandwidth Manager for rate limiting pod traffic using eBPF-based traffic shaping is correctly configured and functioning as expected in your Kubernetes cluster.

---

## Introduction

Validating cilium bandwidth manager ensures that your Cilium configuration is not only applied but actually working correctly under real traffic conditions. Cilium Bandwidth Manager provides eBPF-based rate limiting for pod traffic. It enforces bandwidth limits specified in pod annotations without requiring traditional Linux traffic control (tc) rules. The bandwidth manager uses Earliest Departure Time (EDT) scheduling in the eBPF datapath for precise rate limiting with minimal overhead.

Validation goes beyond checking pod status. It requires testing actual traffic flows, verifying configuration values, and confirming that the feature behaves as documented. A validation failure caught early prevents production incidents caused by misconfigured networking.

This guide provides a structured validation process with automated checks and manual verification steps.

## Prerequisites

- A Kubernetes cluster with Cilium installed and configured
- The Cilium CLI installed
- `kubectl` with cluster-admin access
- Test workloads or the ability to create them

## Validating the Configuration

Verify the intended configuration is active:

```bash
# Check current Cilium configuration

cilium config view | head -40

# Specifically check settings related to cilium bandwidth manager
cilium config view | grep -i bandwidth
cilium status --verbose | grep -i BandwidthManager

# Compare with expected Helm values
helm get values cilium -n kube-system -o yaml
```

## Running Automated Validation

Use the Cilium connectivity test to validate the general data path before testing bandwidth enforcement:

```bash
# Run the full connectivity test suite
cilium connectivity test

# Run specific test categories
cilium connectivity test --test pod-to-pod
cilium connectivity test --test pod-to-service
cilium connectivity test --test dns-resolution

# Check Cilium status for any warnings
cilium status --verbose
```

## Validating with Custom Test Workloads

Deploy workloads that specifically test cilium bandwidth manager:

```yaml
# validation-workload.yaml
# Test deployment for cilium bandwidth manager validation
apiVersion: v1
kind: Pod
metadata:
  name: validate-server
  namespace: default
  annotations:
    kubernetes.io/egress-bandwidth: "10M"
    kubernetes.io/ingress-bandwidth: "20M"
  labels:
    app: validate-server
spec:
  containers:
    - name: netperf
      image: cilium/netperf
      args:
        - iperf3
        - "-s"
      ports:
        - containerPort: 5201
---
apiVersion: v1
kind: Pod
metadata:
  name: validate-client
  namespace: default
  labels:
    app: validate-client
spec:
  # Use anti-affinity to schedule the client away from the server when possible.
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: validate-server
            topologyKey: kubernetes.io/hostname
  containers:
    - name: netperf
      image: cilium/netperf
      args:
        - sleep
        - infinity
```

```bash
# Deploy and test
kubectl apply -f validation-workload.yaml
kubectl wait --for=condition=Ready pod/validate-server pod/validate-client --timeout=60s

# Test egress bandwidth from the annotated server pod
SERVER_IP=$(kubectl get pod validate-server -o jsonpath='{.status.podIP}')
kubectl exec validate-client -- iperf3 -R -c "$SERVER_IP"

# Test ingress bandwidth to the annotated server pod
kubectl exec validate-client -- iperf3 -c "$SERVER_IP"

# Inspect bandwidth settings from the Cilium agent on the server's node
SERVER_NODE=$(kubectl get pod validate-server -o jsonpath='{.spec.nodeName}')
CILIUM_POD=$(kubectl -n kube-system get pod -l k8s-app=cilium \
  --field-selector spec.nodeName="$SERVER_NODE" -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg bpf bandwidth list

# Cleanup
kubectl delete -f validation-workload.yaml
```

## Validating Cilium Endpoint Health

Check that all endpoints managed by Cilium are healthy:

```bash
# List all Cilium endpoints and their health
kubectl get ciliumendpoints --all-namespaces

# Check for endpoints in a non-ready state
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list | grep -v "ready"

# Compare endpoint count with the number of running pods
ENDPOINT_COUNT=$(kubectl get ciliumendpoints --all-namespaces --no-headers | wc -l)
POD_COUNT=$(kubectl get pods --all-namespaces --no-headers | grep Running | wc -l)
echo "Cilium endpoints: $ENDPOINT_COUNT, Running pods: $POD_COUNT"
```

## Validating Metrics and Observability

Confirm datapath metrics and flow observability are available while testing cilium bandwidth manager:

```bash
# Check Cilium agent metrics
kubectl exec -n kube-system ds/cilium -- cilium-dbg metrics list | grep -i "datapath"

# Verify Hubble is observing flows
kubectl exec -n kube-system ds/cilium -- hubble observe --last 5

# Check for any drop metrics
kubectl exec -n kube-system ds/cilium -- cilium-dbg metrics list | grep drop
```

## Verification

Complete validation checklist:

```bash
echo "=== Cilium Bandwidth Manager Validation Summary ==="

# 1. Configuration correct
echo "1. Configuration:"
cilium config view | grep -i bandwidth 2>/dev/null | head -5

# 2. Cilium healthy
echo "2. Cilium Status:"
cilium status | head -10

# 3. Connectivity working
echo "3. Connectivity Test:"
cilium connectivity test --test pod-to-pod 2>&1 | tail -3

# 4. No errors
echo "4. Recent Errors:"
kubectl logs -n kube-system -l k8s-app=cilium --tail=20 --since=10m | grep -c "error"
```

## Troubleshooting

- **Connectivity test fails on specific tests**: Not all tests apply to every configuration. Some tests require specific features (like encryption or L7 policy) to be enabled.
- **Endpoints show as not-ready**: The endpoint may still be initializing. Wait 30 seconds and check again. If persistent, check the Cilium agent logs for the node where the endpoint is running.
- **Metrics show high drop count**: Check the drop reason with `cilium-dbg metrics list | grep drop` from a Cilium agent pod. Common reasons include policy deny (expected if policies are configured) and conntrack table full (increase BPF map sizes).
- **Validation passes but production traffic fails**: The validation tests may not cover your specific traffic pattern. Create custom test workloads that mirror your production traffic patterns.

## Conclusion

Validating cilium bandwidth manager requires checking the active configuration matches your intent, running automated connectivity tests, deploying custom test workloads that exercise bandwidth annotations, verifying endpoint health, and confirming metrics collection. A passing validation gives confidence that the feature is working correctly before production traffic flows through it.
