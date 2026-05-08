# How to Validate Calico eBPF Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Validation, Performance

Description: Validate that Calico eBPF mode is correctly active by checking BPF programs, service routing, network performance benchmarks, and policy enforcement.

---

## Introduction

Validating Calico eBPF mode requires confirming that BPF programs are actually running (not just that the setting is enabled), that service routing works correctly without kube-proxy, that network policies are enforced via BPF rather than iptables, and that the performance improvements expected from eBPF are measurable.

A common false positive in eBPF validation is checking only the Installation resource setting and declaring success. The Installation resource may say `linuxDataplane: BPF` but if the kernel doesn't support it, Felix logs an error and disables BPF mode. Real validation requires checking the actual BPF dataplane state on the nodes.

## Prerequisites

- Calico with eBPF mode configured
- Calico's `calico-node -bpf` tool (included in the `calico/node` container) or `bpftool` on nodes (install with `apt install linux-tools-$(uname -r)` on Ubuntu)
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

  calico_pod=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector=spec.nodeName=${node} -o jsonpath='{.items[0].metadata.name}')

  if kubectl logs -n calico-system "${calico_pod}" -c calico-node | \
    grep -q "BPF enabled, starting BPF endpoint manager and map manager"; then
    echo "  OK: Felix started the BPF endpoint and map managers"
  else
    echo "  WARN: BPF startup message not found in current calico-node logs"
  fi

  if kubectl exec -n calico-system "${calico_pod}" -c calico-node -- \
    calico-node -bpf counters dump >/dev/null 2>&1; then
    echo "  OK: Calico BPF counters are available"
  else
    program_count=$(kubectl exec -n calico-system "${calico_pod}" -c calico-node -- \
      sh -c "bpftool prog list 2>/dev/null | grep -Ec 'cali_|calico' || true")

    if [[ "${program_count}" -gt 0 ]]; then
      echo "  OK: ${program_count} Calico BPF programs loaded"
    else
      echo "  FAIL: Calico BPF programs were not visible. eBPF may not be active."
    fi
  fi
done
```

## Validation 2: iptables Rules Are Gone

```bash
# In a clean eBPF migration, kube-proxy iptables rules should be gone and
# Calico-owned iptables rules should be minimal. This is a secondary signal,
# not proof by itself.
iptables_rules=$(kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  sh -c "iptables-legacy-save 2>/dev/null | grep -Ec 'cali|CALICO' || true")

echo "iptables Calico rules: ${iptables_rules}"
if [[ "${iptables_rules}" -eq 0 ]]; then
  echo "OK: No Calico iptables rules found"
else
  echo "WARN: Calico iptables rules present - verify whether they are expected for your configuration"
fi
```

## Validation 3: Service Routing Without kube-proxy

```bash
# Verify kube-proxy is not running (or is disabled)
kube_proxy_count=$(kubectl get pods -n kube-system -l k8s-app=kube-proxy \
  --field-selector=status.phase=Running --no-headers | wc -l)

echo "Running kube-proxy pods: ${kube_proxy_count}"
[[ "${kube_proxy_count}" -eq 0 ]] && echo "OK: kube-proxy disabled" || \
  echo "WARN: kube-proxy still running - disable it or configure Calico to avoid kube-proxy iptables cleanup conflicts"

# Test service routing via eBPF (Calico BPF handles this)
kubectl create deployment svc-echo --image=nginx
kubectl wait deployment/svc-echo --for=condition=Available --timeout=60s
kubectl expose deployment svc-echo --port=80

kubectl run svc-test --image=busybox --restart=Never -- \
  sh -c 'wget -qO- --timeout=5 http://svc-echo.default.svc.cluster.local && echo "Service routing OK"'
kubectl wait pod/svc-test --for=jsonpath='{.status.phase}'=Succeeded --timeout=30s
kubectl logs svc-test
kubectl delete pod svc-test
kubectl delete svc svc-echo
kubectl delete deployment svc-echo
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
SERVER_CLUSTER_IP=$(kubectl get svc server -n ebpf-test -o jsonpath='{.spec.clusterIP}')
kubectl exec -n ebpf-test client -- \
  wget -qO- --timeout=3 "http://${SERVER_CLUSTER_IP}" && echo "FAIL: Policy not enforced!" || \
  echo "OK: Policy enforced - connection denied"

# Check BPF counters for policy drops on a calico-node pod
CALICO_POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n calico-system "${CALICO_POD}" -c calico-node -- \
  calico-node -bpf counters dump | grep -i "Dropped.*by policy"

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

kubectl wait pod/iperf3-client -n default --for=jsonpath='{.status.phase}'=Succeeded --timeout=60s
kubectl logs iperf3-client -n default

kubectl delete pod iperf3-server iperf3-client svc/iperf3-server -n default
```

## Conclusion

Validating Calico eBPF mode requires evidence from multiple layers: BPF dataplane state on the nodes, minimal iptables involvement, service routing without kube-proxy conflicts, network policy enforcement via BPF drops, and measurable performance improvements. The most important validation step is checking Calico's BPF dataplane state on each node with `calico-node -bpf` or `bpftool`. The absence of iptables rules is a secondary confirming signal that the transition from iptables to eBPF was complete.
