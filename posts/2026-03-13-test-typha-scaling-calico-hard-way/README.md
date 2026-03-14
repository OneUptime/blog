# Testing Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Scaling, Testing, Hard Way

Description: Validate that your manually configured Typha deployment correctly serves Felix connections, survives pod restarts without network disruption, and enforces network policies consistently during...

---

## Introduction

Deploying Typha is not enough - you need to verify that it works correctly under the conditions your production cluster encounters. This means confirming that Felix agents connect through Typha rather than directly to the API server, that policy updates propagate to all nodes, and that Typha pod restarts do not create enforcement gaps.

This post provides a set of repeatable test procedures for each of these scenarios.

---

## Prerequisites

- Typha deployed with 2+ replicas per the setup post
- `kubectl` and `calicoctl` access
- A test namespace available for running network policy tests
- Prometheus metrics enabled on Typha (`TYPHA_PROMETHEUSMETRICSENABLED=true`)

---

## Step 1: Verify Felix Is Connected to Typha

Confirm that Felix on each node is using Typha rather than connecting directly to the API server:

```bash
# Check Felix logs across several nodes for the Typha connection message
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | head -5); do
  POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
    --field-selector spec.nodeName=$node -o name 2>/dev/null | head -1)
  if [ -n "$POD" ]; then
    echo "=== Node: $node ==="
    kubectl logs -n kube-system $POD -c calico-node --tail=20 2>/dev/null \
      | grep -i "typha" | tail -3
  fi
done
```

You should see lines like `Connected to Typha v3.x.x` for each node. If nodes show direct API server connections instead, the `typhaK8sServiceName` in `FelixConfiguration` is not set correctly.

---

## Step 2: Test Network Policy Enforcement Through Typha

Create a test `NetworkPolicy` via calicoctl and confirm it takes effect on cluster nodes within the expected time window:

```bash
# Create test namespace
kubectl create namespace typha-test

# Deploy a server and client pod
kubectl run server --image=nginx:alpine --port=80 -n typha-test
kubectl run client --image=curlimages/curl:latest \
  --command -- sleep 3600 -n typha-test

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/server pod/client -n typha-test --timeout=60s

# Baseline: confirm client can reach server
kubectl exec -n typha-test client -- curl -s --max-time 5 \
  http://server.typha-test.svc.cluster.local | head -3
```

Apply a deny policy through Typha and confirm it takes effect:

```yaml
# deny-all-test.yaml
# Deny-all ingress policy - validates Typha is distributing policies to Felix
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: deny-all-test
  namespace: typha-test
spec:
  selector: "all()"
  types:
    - Ingress
  # No ingress rules = deny all ingress traffic
```

```bash
calicoctl apply -f deny-all-test.yaml
sleep 2

# Verify policy is now blocking traffic (should timeout)
kubectl exec -n typha-test client -- curl -s --max-time 3 \
  http://server.typha-test.svc.cluster.local
echo "Expected: timeout/connection refused"

# Clean up
calicoctl delete -f deny-all-test.yaml
kubectl delete namespace typha-test
```

---

## Step 3: Test Typha Pod Restart Resilience

Verify that restarting one Typha pod does not cause a policy enforcement gap:

```bash
# Record the current Typha pods
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide

# Simulate a pod crash by deleting one Typha pod
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
echo "Deleting: $TYPHA_POD"
kubectl delete $TYPHA_POD -n kube-system

# Immediately apply a new policy while the pod restarts
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restart-resilience-test
spec:
  selector: "has(restart-test)"
  ingress:
    - action: Allow
  egress:
    - action: Allow
EOF

# Confirm the policy appears correctly despite the Typha restart
calicoctl get globalnetworkpolicy restart-resilience-test

# Monitor the Deployment rolling replacement
kubectl rollout status deployment/calico-typha -n kube-system

# Clean up
calicoctl delete globalnetworkpolicy restart-resilience-test
```

---

## Step 4: Test Scale-Up Behavior

Verify that adding a Typha replica does not disrupt existing Felix connections:

```bash
# Record connection counts before scaling
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ==="
  kubectl exec -n kube-system $pod -- wget -qO- http://localhost:9093/metrics 2>/dev/null \
    | grep typha_connections_active
done

# Scale up by one replica
CURRENT=$(kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='{.spec.replicas}')
kubectl scale deployment calico-typha -n kube-system --replicas=$((CURRENT + 1))
kubectl rollout status deployment/calico-typha -n kube-system

# Confirm the new pod is in the Service endpoints
kubectl get endpoints calico-typha -n kube-system
```

---

## Step 5: Validate Metrics Are Collecting

Confirm Prometheus can reach Typha metrics and the critical metric families are present:

```bash
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl port-forward -n kube-system $TYPHA_POD 9093:9093 &
sleep 2

# Check for the three most important Typha metrics
curl -s http://localhost:9093/metrics | grep -E \
  "^typha_connections_active|^typha_updates_sent_total|^typha_snapshots_generated_total"

kill %1
```

All three metric families must be present and non-zero after at least 5 minutes of operation.

---

## Best Practices

- Run the network policy enforcement test after every Typha configuration change to confirm Felix is still receiving updates.
- Include the pod restart resilience test in your cluster upgrade runbook to catch regressions before they reach production.
- Test scaling down (from 3 to 2 replicas) as well - the Felix agents connected to the removed pod must reconnect gracefully to the remaining replicas.
- Use a dedicated test namespace for all Typha validation tests to avoid polluting production policy state.
- Automate these tests in your CI/CD pipeline so they run on every Calico version upgrade.

---

## Conclusion

Testing Typha means verifying three things: Felix connects through Typha rather than the API server directly, policies propagate correctly to all nodes, and Typha pod restarts do not create enforcement windows. With these tests in your toolkit, you can confidently validate any Typha configuration change before it reaches production.

---

*Integrate Typha health checks into your deployment pipeline with [OneUptime](https://oneuptime.com).*
