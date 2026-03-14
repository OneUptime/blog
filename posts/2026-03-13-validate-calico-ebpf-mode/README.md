# How to Validate Calico eBPF Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Validation, Performance

Description: Validate that Calico eBPF mode is correctly active by checking BPF programs, service routing, network performance benchmarks, and policy enforcement.

---

## Introduction

Validating Calico eBPF mode requires confirming that BPF programs are actually running (not just that the setting is enabled), that service routing works correctly without kube-proxy, that network policies are enforced via BPF rather than iptables, and that the performance improvements expected from eBPF are measurable.

A common false positive in eBPF validation is checking only the Installation resource setting and declaring success. The Installation resource may say `linuxDataplane: BPF` but if the kernel doesn't support it, Felix silently falls back to iptables. Real validation requires checking the actual BPF programs running in the kernel.

## Prerequisites

- Calico with eBPF mode configured
- `bpftool` on nodes (install with `apt install linux-tools-$(uname -r)`)
- `iperf3` or similar for performance testing
- `kubectl` exec access

## Validation 1: BPF Programs Are Loaded

```bash
#!/bin/bash
# validate-ebpf-programs.sh
echo "=== BPF Program Validation ==="

for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo ""
  echo "Node: ${node}"

  program_count=$(kubectl exec \
    $(kubectl get pod -n calico-system -l k8s-app=calico-node \
      --field-selector=spec.nodeName=${node} -o jsonpath='{.items[0].metadata.name}') \
    -n calico-system -c calico-node -- \
    bpftool prog list 2>/dev/null | grep "calico" | wc -l)

  if [[ "${program_count}" -gt 5 ]]; then
    echo "  OK: ${program_count} Calico BPF programs loaded"
  else
    echo "  FAIL: Only ${program_count} programs. eBPF may not be active."
  fi
done
```

## Validation 2: iptables Rules Are Gone

```bash
# If eBPF is active, iptables should have NO calico rules
iptables_rules=$(kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  iptables-legacy -L -n 2>/dev/null | grep -c "cali\|CALICO" || echo 0)

echo "iptables Calico rules: ${iptables_rules}"
if [[ "${iptables_rules}" -eq 0 ]]; then
  echo "OK: No iptables rules - eBPF mode confirmed"
else
  echo "WARN: iptables rules present - may be in hybrid or iptables mode"
fi
```

## Validation 3: Service Routing Without kube-proxy

```bash
# Verify kube-proxy is not running (or is disabled)
kube_proxy_count=$(kubectl get pods -n kube-system -l k8s-app=kube-proxy \
  --field-selector=status.phase=Running --no-headers | wc -l)

echo "Running kube-proxy pods: ${kube_proxy_count}"
[[ "${kube_proxy_count}" -eq 0 ]] && echo "OK: kube-proxy disabled" || \
  echo "WARN: kube-proxy still running - may cause double NAT"

# Test service routing via eBPF (Calico BPF handles this)
kubectl run svc-test --image=busybox --restart=Never -- \
  sh -c 'wget -qO- --timeout=5 http://kubernetes.default.svc.cluster.local && echo "Service routing OK"'
kubectl wait pod/svc-test --for=condition=completed --timeout=30s
kubectl logs svc-test
kubectl delete pod svc-test
```

## Validation 4: Network Policy Enforcement via BPF

```bash
# Deploy test workloads with a deny policy
kubectl create namespace ebpf-test

kubectl run server --image=nginx -n ebpf-test --expose --port=80
kubectl run client --image=busybox -n ebpf-test -- sleep 3600

# Apply a deny policy
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: ebpf-test
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
EOF

sleep 5

# Test that policy is enforced
kubectl exec -n ebpf-test client -- \
  wget -qO- --timeout=3 http://server.ebpf-test && echo "FAIL: Policy not enforced!" || \
  echo "OK: Policy enforced - connection denied"

# Check that denial was logged in BPF (not iptables)
kubectl logs -n calico-system ds/calico-node -c calico-node | \
  grep -i "denied\|drop" | tail -5

# Cleanup
kubectl delete namespace ebpf-test
```

## Validation 5: Performance Benchmark

```bash
# Compare network throughput in eBPF vs baseline (iptables)
# Deploy iperf3 server and client
kubectl run iperf3-server -n default --image=networkstatic/iperf3 -- \
  iperf3 --server --port 5201
kubectl expose pod iperf3-server --port=5201 -n default

sleep 5

SERVER_IP=$(kubectl get pod iperf3-server -n default -o jsonpath='{.status.podIP}')

# Run bandwidth test
kubectl run iperf3-client -n default --image=networkstatic/iperf3 \
  --restart=Never -- \
  iperf3 --client "${SERVER_IP}" --port 5201 --time 10

kubectl wait pod/iperf3-client -n default --for=condition=completed --timeout=60s
kubectl logs iperf3-client -n default

kubectl delete pod iperf3-server iperf3-client svc/iperf3-server -n default
```

## Conclusion

Validating Calico eBPF mode requires evidence from multiple layers: BPF program count in the kernel, absence of iptables rules, service routing without kube-proxy, network policy enforcement via BPF drops, and measurable performance improvements. The most important validation step is checking BPF program presence with `bpftool prog list` — this is the ground truth for whether eBPF is actually active. The absence of iptables rules is a secondary confirming signal that the transition from iptables to eBPF was complete.
