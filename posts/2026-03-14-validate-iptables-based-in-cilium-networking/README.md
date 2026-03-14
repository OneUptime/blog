# Validating iptables-Based Masquerading in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking

Description: Systematically validate that iptables-based masquerading mode in Cilium networking as an alternative to eBPF-based masquerading is correctly configured and functioning as expected in your...

---

## Introduction

Validating iptables-based masquerading in cilium ensures that your Cilium configuration is not only applied but actually working correctly under real traffic conditions. Cilium can use iptables for masquerading instead of eBPF. The iptables mode is the legacy approach that provides broader kernel compatibility but lower performance compared to eBPF masquerading. It works by installing iptables MASQUERADE rules in the POSTROUTING chain for traffic leaving the pod CIDR.

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

# Specifically check settings related to iptables-based masquerading in cilium
iptables -t nat -L CILIUM_POST_nat -n 2>/dev/null | head -10

# Compare with expected Helm values
helm get values cilium -n kube-system -o yaml
```

## Running Automated Validation

Use the Cilium connectivity test to validate the data path:

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

Deploy workloads that specifically test iptables-based masquerading in cilium:

```yaml
# validation-workload.yaml
# Test deployment for iptables-based masquerading in cilium validation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: validate-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: validate-server
  template:
    metadata:
      labels:
        app: validate-server
    spec:
      # Use anti-affinity to spread across nodes
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
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: validate-svc
  namespace: default
spec:
  selector:
    app: validate-server
  ports:
    - port: 80
      targetPort: 80
```

```bash
# Deploy and test
kubectl apply -f validation-workload.yaml
kubectl rollout status deployment/validate-server --timeout=60s

# Test same-node and cross-node connectivity
kubectl run validate-client --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/validate-client --timeout=30s

# Test service access
kubectl exec validate-client -- wget -qO- --timeout=5 http://validate-svc

# Test direct pod IP access
for IP in $(kubectl get pods -l app=validate-server -o jsonpath='{.items[*].status.podIP}'); do
  echo "Testing $IP..."
  kubectl exec validate-client -- wget -qO- --timeout=5 http://$IP >/dev/null 2>&1 && echo "  OK" || echo "  FAIL"
done

# Cleanup
kubectl delete pod validate-client
kubectl delete -f validation-workload.yaml
```

## Validating Cilium Endpoint Health

Check that all endpoints managed by Cilium are healthy:

```bash
# List all Cilium endpoints and their health
cilium endpoint list

# Check for endpoints in a non-ready state
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep -v "ready"

# Verify endpoint count matches pod count
ENDPOINT_COUNT=$(kubectl exec -n kube-system ds/cilium -- cilium endpoint list -o json | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
POD_COUNT=$(kubectl get pods --all-namespaces --no-headers | grep Running | wc -l)
echo "Cilium endpoints: $ENDPOINT_COUNT, Running pods: $POD_COUNT"
```

## Validating Metrics and Observability

Confirm metrics are being collected for iptables-based masquerading in cilium:

```bash
# Check Cilium agent metrics
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep -i "datapath"

# Verify Hubble is observing flows
kubectl exec -n kube-system ds/cilium -- hubble observe --last 5

# Check for any drop metrics
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep drop
```

## Verification

Complete validation checklist:

```bash
echo "=== iptables-Based Masquerading in Cilium Validation Summary ==="

# 1. Configuration correct
echo "1. Configuration:"
iptables -t nat -L CILIUM_POST_nat -n 2>/dev/null | head -10 2>/dev/null | head -5

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
- **Metrics show high drop count**: Check the drop reason with `cilium metrics list | grep drop`. Common reasons include policy deny (expected if policies are configured) and conntrack table full (increase BPF map sizes).
- **Validation passes but production traffic fails**: The validation tests may not cover your specific traffic pattern. Create custom test workloads that mirror your production traffic patterns.

## Conclusion

Validating iptables-based masquerading in cilium requires checking the active configuration matches your intent, running automated connectivity tests, deploying custom test workloads that exercise the specific feature, verifying endpoint health, and confirming metrics collection. A passing validation gives confidence that the feature is working correctly before production traffic flows through it.
