# How to Validate the Resolution of ClusterIP Reachability Issues with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, ClusterIP, Validation, Testing, Networking, SRE

Description: How to systematically validate that ClusterIP reachability issues have been fully resolved in Calico-managed Kubernetes clusters.

---

## Introduction

Fixing a ClusterIP reachability issue is only half the job. Without thorough validation, latent problems can re-emerge minutes or hours later, causing repeated incidents. Validation must confirm not only that the immediate symptom is resolved but that the underlying root cause has been addressed across all affected nodes and services.

A proper validation process tests connectivity from multiple pods on different nodes, verifies that supporting infrastructure like kube-proxy and Calico Felix is healthy, and confirms that the fix survives component restarts. Rushed validation is a common cause of incident recurrence.

This guide provides a structured validation framework for ClusterIP reachability fixes in Calico clusters.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools
- The specific ClusterIP fix that was applied
- Access to monitoring dashboards (Prometheus/Grafana)
- List of affected services and namespaces

## Step 1: Basic Connectivity Validation

Test the affected ClusterIP service from multiple locations in the cluster.

```bash
# Test from a pod on the same node as a service endpoint
kubectl run validate-same-node --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<endpoint-node>"}}' \
  --rm -it -- curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}" \
  http://<service-name>.<namespace>.svc.cluster.local:<port>

# Test from a pod on a different node
kubectl run validate-diff-node --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<different-node>"}}' \
  --rm -it -- curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}" \
  http://<service-name>.<namespace>.svc.cluster.local:<port>

# Test using ClusterIP directly (not DNS)
kubectl run validate-ip --image=nicolaka/netshoot --rm -it -- \
  curl -s --connect-timeout 5 http://<cluster-ip>:<port>
```

## Step 2: DNS Resolution Validation

```bash
# Verify DNS resolves correctly
kubectl run validate-dns --image=nicolaka/netshoot --rm -it -- \
  nslookup <service-name>.<namespace>.svc.cluster.local

# Verify DNS returns the correct ClusterIP
EXPECTED_IP=$(kubectl get svc <service-name> -n <namespace> -o jsonpath='{.spec.clusterIP}')
RESOLVED_IP=$(kubectl run dns-check --image=nicolaka/netshoot --rm -it -- \
  dig +short <service-name>.<namespace>.svc.cluster.local)
echo "Expected: $EXPECTED_IP, Resolved: $RESOLVED_IP"
```

## Step 3: Endpoint Health Validation

```bash
# Confirm all expected endpoints are present and ready
kubectl get endpoints <service-name> -n <namespace> -o yaml

# Verify each endpoint pod is running and passing readiness checks
kubectl get pods -n <namespace> -l <selector> -o wide
kubectl describe pods -n <namespace> -l <selector> | grep -A 3 "Conditions:"

# Check endpoint slices for detailed status
kubectl get endpointslices -n <namespace> \
  -l kubernetes.io/service-name=<service-name> -o yaml
```

## Step 4: Infrastructure Health Validation

Confirm that kube-proxy and Calico components are healthy after the fix.

```bash
# Verify kube-proxy on all nodes
kubectl get pods -n kube-system -l k8s-app=kube-proxy -o wide
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=10 --since=5m 2>&1 | grep -i error

# Verify Calico node status
calicoctl node status

# Check Calico pods are running
kubectl get pods -n calico-system -o wide

# Verify Felix is not reporting errors
kubectl logs -n calico-system -l k8s-app=calico-node --tail=20 --since=5m 2>&1 | grep -i "error\|deny"

# Validate iptables rules on a sample node
sudo iptables -t nat -L KUBE-SERVICES -n | grep <cluster-ip>
```

## Step 5: Load and Stress Validation

Confirm the fix holds under realistic traffic.

```bash
# Run repeated connectivity tests
kubectl run load-test --image=nicolaka/netshoot --rm -it -- \
  bash -c 'for i in $(seq 1 100); do
    curl -s --connect-timeout 2 -o /dev/null -w "%{http_code}\n" \
      http://<service-name>.<namespace>.svc.cluster.local:<port>
  done | sort | uniq -c'

# Test concurrent connections
kubectl run concurrent-test --image=nicolaka/netshoot --rm -it -- \
  bash -c 'for i in $(seq 1 20); do
    curl -s --connect-timeout 3 -o /dev/null \
      http://<service-name>.<namespace>.svc.cluster.local:<port> &
  done; wait; echo "All requests completed"'
```

## Step 6: Persistence Validation

Verify the fix survives restarts and time.

```bash
# Restart kube-proxy and re-validate
kubectl rollout restart daemonset/kube-proxy -n kube-system
kubectl rollout status daemonset/kube-proxy -n kube-system

# Re-test connectivity after restart
kubectl run post-restart-test --image=nicolaka/netshoot --rm -it -- \
  curl -s --connect-timeout 5 http://<service-name>.<namespace>.svc.cluster.local:<port>

# Check monitoring dashboards for error rate
# Look at the last 30 minutes for any connectivity blips
```

## Step 7: Cross-Service Validation

If the fix involved shared infrastructure, validate other services too.

```bash
# Test a sample of other ClusterIP services
kubectl get svc --all-namespaces --field-selector spec.type=ClusterIP -o json | \
  jq -r '.items[] | select(.spec.ports != null) | "\(.metadata.namespace) \(.metadata.name) \(.spec.ports[0].port)"' | \
  head -10 | while read ns name port; do
    echo -n "$ns/$name: "
    kubectl run "check-$name" --image=busybox --rm -it --restart=Never -- \
      wget -qO- --timeout=3 "http://$name.$ns.svc.cluster.local:$port" > /dev/null 2>&1 \
      && echo "OK" || echo "FAIL"
  done
```

## Validation Checklist

```markdown
- [ ] ClusterIP reachable from same-node pod
- [ ] ClusterIP reachable from different-node pod
- [ ] DNS resolution returns correct ClusterIP
- [ ] All endpoints present and ready
- [ ] kube-proxy pods healthy on all nodes
- [ ] Calico node status shows no issues
- [ ] No deny entries in Felix logs
- [ ] iptables NAT rules present for the service
- [ ] 100 consecutive requests succeed
- [ ] Fix persists after kube-proxy restart
- [ ] Other ClusterIP services unaffected
- [ ] Monitoring shows error rate returned to baseline
```

## Troubleshooting

- **Intermittent failures in load test**: Check if a specific endpoint pod is failing. Remove it and test again.
- **Fix does not survive restart**: The fix was likely a transient workaround. Investigate the persistent configuration.
- **Other services broken after fix**: The fix may have had unintended side effects. Review any policy or iptables changes.
- **DNS resolves but connection times out**: The issue may be in DNAT rules rather than DNS. Re-check iptables.

## Conclusion

Validating a ClusterIP reachability fix requires testing from multiple network locations, verifying infrastructure health, stress testing under load, and confirming persistence across restarts. The validation checklist ensures nothing is missed. Only after all checks pass should the incident be marked as resolved. Any shortcuts in validation risk incident recurrence and erode confidence in the resolution process.
