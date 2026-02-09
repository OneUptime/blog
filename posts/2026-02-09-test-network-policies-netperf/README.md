# How to Test Kubernetes Network Policies Using Netperf and Connectivity Matrix Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Network Policies, Testing, Netperf, Security

Description: Learn how to validate Kubernetes network policies using netperf for performance testing and connectivity matrices for comprehensive policy verification.

---

Kubernetes network policies define traffic rules between pods, but incorrect policies can block legitimate traffic or fail to restrict unauthorized access. Testing network policies with connectivity matrices and performance tools ensures policies work as intended without degrading application performance.

In this guide, we'll use netperf to measure network performance under policies and build connectivity matrices that validate policy enforcement across all pod combinations in your cluster.

## Understanding Network Policy Testing Challenges

Network policies control traffic flow at the pod level using label selectors and namespace boundaries. Unlike firewall rules that block at the network layer, Kubernetes policies operate at layer 4 with context about pod identity and namespace membership. This makes testing more complex because policies depend on dynamic pod labels and cluster topology.

Manual testing of network policies is error-prone and doesn't scale. As applications grow, the number of possible connections between pods increases exponentially. Automated testing with connectivity matrices validates all permutations systematically, catching policy gaps that manual testing misses.

Performance testing ensures policies don't introduce latency. Network policy implementations like Calico, Cilium, and Weave Net use different mechanisms for traffic filtering, each with varying performance characteristics. Measuring performance before and after applying policies quantifies overhead and identifies bottlenecks.

## Deploying Netperf for Testing

Netperf provides standardized network benchmarks that measure throughput, latency, and transaction rates. Deploy netperf servers and clients to test network performance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netperf-server
  namespace: default
  labels:
    app: netperf-server
    role: benchmark
spec:
  replicas: 3
  selector:
    matchLabels:
      app: netperf-server
  template:
    metadata:
      labels:
        app: netperf-server
        role: benchmark
    spec:
      containers:
      - name: netserver
        image: cilium/netperf
        command: ["netserver"]
        args: ["-D", "-4"]
        ports:
        - containerPort: 12865
          name: control
        resources:
          requests:
            cpu: "500m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: netperf-server
  namespace: default
spec:
  selector:
    app: netperf-server
  ports:
  - port: 12865
    targetPort: 12865
    name: control
  clusterIP: None
```

Deploy netperf clients in different namespaces to test cross-namespace policies:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netperf-client
  namespace: test-client
spec:
  replicas: 1
  selector:
    matchLabels:
      app: netperf-client
  template:
    metadata:
      labels:
        app: netperf-client
        role: tester
    spec:
      containers:
      - name: client
        image: cilium/netperf
        command: ["sleep", "infinity"]
```

Run baseline netperf tests:

```bash
# Run TCP throughput test
kubectl exec -n test-client deployment/netperf-client -- \
  netperf -H netperf-server.default.svc.cluster.local -l 30 -t TCP_STREAM

# Run latency test
kubectl exec -n test-client deployment/netperf-client -- \
  netperf -H netperf-server.default.svc.cluster.local -l 30 -t TCP_RR

# Run UDP throughput test
kubectl exec -n test-client deployment/netperf-client -- \
  netperf -H netperf-server.default.svc.cluster.local -l 30 -t UDP_STREAM
```

Record baseline metrics before applying network policies. These measurements provide comparison points for validating that policies don't degrade performance unacceptably.

## Creating Test Network Policies

Deploy policies that restrict traffic between application tiers:

```yaml
# frontend-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: load-balancer
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 8080
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
---
# backend-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

These policies create a tiered architecture where frontend pods can only talk to backend, backend can only talk to database, and all tiers can access DNS.

## Building Connectivity Matrix Tests

Create a comprehensive test that validates all connection patterns:

```bash
#!/bin/bash
# test-connectivity-matrix.sh

set -e

# Define test matrix
declare -A MATRIX=(
  ["frontend:load-balancer"]="ALLOW"
  ["frontend:backend"]="ALLOW"
  ["frontend:database"]="DENY"
  ["backend:frontend"]="DENY"
  ["backend:database"]="ALLOW"
  ["backend:external"]="DENY"
  ["database:backend"]="DENY"
  ["database:frontend"]="DENY"
)

NAMESPACES="default"
TIMEOUT=3

echo "Starting network policy connectivity matrix test"
echo "=============================================="

test_connection() {
  local source_ns=$1
  local source_label=$2
  local target_ns=$3
  local target_label=$4
  local expected=$5

  # Get source pod
  SOURCE_POD=$(kubectl get pod -n "$source_ns" -l "$source_label" -o name | head -1)
  if [ -z "$SOURCE_POD" ]; then
    echo "SKIP: No source pod found for $source_label in $source_ns"
    return
  fi

  # Get target pod IP
  TARGET_IP=$(kubectl get pod -n "$target_ns" -l "$target_label" -o jsonpath='{.items[0].status.podIP}')
  if [ -z "$TARGET_IP" ]; then
    echo "SKIP: No target pod found for $target_label in $target_ns"
    return
  fi

  # Test connection
  if kubectl exec -n "$source_ns" "$SOURCE_POD" -- timeout "$TIMEOUT" nc -zv "$TARGET_IP" 80 2>&1 | grep -q "succeeded"; then
    RESULT="ALLOW"
  else
    RESULT="DENY"
  fi

  # Compare with expected
  if [ "$RESULT" = "$expected" ]; then
    echo "PASS: $source_label -> $target_label ($RESULT)"
  else
    echo "FAIL: $source_label -> $target_label (expected: $expected, got: $RESULT)"
    exit 1
  fi
}

# Run all tests
for key in "${!MATRIX[@]}"; do
  IFS=':' read -r source target <<< "$key"
  expected="${MATRIX[$key]}"
  test_connection "default" "tier=$source" "default" "tier=$target" "$expected"
done

echo "=============================================="
echo "All connectivity matrix tests passed!"
```

This script systematically tests all connections and verifies they match expected policy behavior.

## Measuring Performance Impact

Quantify network policy overhead:

```bash
#!/bin/bash
# benchmark-policies.sh

echo "Measuring baseline performance (no policies)..."
kubectl delete networkpolicy --all

BASELINE=$(kubectl exec -n test-client deployment/netperf-client -- \
  netperf -H netperf-server.default.svc.cluster.local -l 30 -t TCP_STREAM | \
  grep "^MIGRATED" | awk '{print $5}')

echo "Baseline throughput: $BASELINE Mbps"

echo "Applying network policies..."
kubectl apply -f network-policies/

sleep 10

echo "Measuring performance with policies..."
WITH_POLICY=$(kubectl exec -n test-client deployment/netperf-client -- \
  netperf -H netperf-server.default.svc.cluster.local -l 30 -t TCP_STREAM | \
  grep "^MIGRATED" | awk '{print $5}')

echo "Throughput with policies: $WITH_POLICY Mbps"

# Calculate overhead
OVERHEAD=$(echo "scale=2; (($BASELINE - $WITH_POLICY) / $BASELINE) * 100" | bc)
echo "Performance overhead: ${OVERHEAD}%"

if (( $(echo "$OVERHEAD > 5" | bc -l) )); then
  echo "WARNING: Network policy overhead exceeds 5%"
  exit 1
fi

echo "Performance impact acceptable"
```

This benchmark measures throughput before and after applying policies, calculating overhead percentage.

## Automated Policy Validation in CI/CD

Integrate network policy testing into pipelines:

```yaml
# .github/workflows/network-policy-test.yml
name: Network Policy Tests

on:
  pull_request:
    paths:
      - 'network-policies/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Create Kind cluster
      uses: helm/kind-action@v1.8.0

    - name: Install Calico CNI
      run: |
        kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/tigera-operator.yaml
        kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/custom-resources.yaml

    - name: Deploy test applications
      run: |
        kubectl apply -f test/test-apps/

    - name: Run connectivity matrix tests
      run: |
        chmod +x test/scripts/test-connectivity-matrix.sh
        ./test/scripts/test-connectivity-matrix.sh

    - name: Run performance benchmarks
      run: |
        chmod +x test/scripts/benchmark-policies.sh
        ./test/scripts/benchmark-policies.sh
```

## Visualizing Network Policy Graphs

Generate visual representations of policies:

```bash
# Install network policy viewer
kubectl apply -f https://raw.githubusercontent.com/runoncloud/kubectl-np-viewer/master/deploy.yaml

# Access viewer
kubectl port-forward -n np-viewer svc/np-viewer 8080:8080
```

The viewer generates diagrams showing allowed and denied connections, making it easier to understand complex policy sets.

## Conclusion

Testing network policies with netperf and connectivity matrices ensures policies enforce intended access controls without impacting application performance. Regular validation catches policy misconfigurations before they cause production issues.

Automated testing in CI/CD pipelines maintains policy correctness as applications evolve, while performance measurements ensure policies don't introduce unacceptable latency. Connectivity matrices provide comprehensive validation across all possible connections, catching edge cases that manual testing misses.

For production network policy deployments, establish baseline performance metrics, test policies in staging environments first, automate connectivity matrix validation, and monitor policy effectiveness with network flow logs and metrics.
