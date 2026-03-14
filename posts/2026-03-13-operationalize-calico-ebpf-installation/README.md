# How to Operationalize Calico eBPF Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Installation, Operations

Description: Build a repeatable, documented Calico eBPF installation process including cluster templates, installation runbooks, and handoff procedures for production clusters.

---

## Introduction

Operationalizing the Calico eBPF installation means creating a standard cluster template that includes eBPF configuration by default, with documented procedures for the installation team to follow and acceptance criteria that the receiving team can use to confirm the cluster is production-ready.

## Cluster Template for eBPF

```yaml
# cluster-templates/ebpf-standard/calico-config.yaml
# This is the standard Calico eBPF configuration for all new clusters

# 1. API Server endpoint (filled in by automation)
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubernetes-services-endpoint
  namespace: tigera-operator
data:
  KUBERNETES_SERVICE_HOST: "${API_SERVER_HOST}"
  KUBERNETES_SERVICE_PORT: "6443"

---
# 2. eBPF Installation
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: BPF
    hostPorts: Disabled
    ipPools:
      - cidr: "${POD_CIDR}"
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: "all()"
  variant: Calico

---
# 3. Felix security configuration
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  prometheusMetricsEnabled: true
  logSeverityScreen: Info
```

## Installation Runbook

```markdown
# Runbook: New Cluster - Calico eBPF Installation

**Estimated Time**: 30 minutes
**Required Skills**: Kubernetes administration, Calico basics

## Pre-Installation Checklist
- [ ] All nodes running kernel 5.10+
- [ ] kube-proxy disabled in cluster bootstrap config
- [ ] Private registry accessible (if using ImageSet)
- [ ] Control plane IP identified (not service VIP)

## Installation Steps

1. Install Tigera Operator
   ```
   kubectl create -f tigera-operator.yaml
   kubectl rollout status deploy/tigera-operator -n tigera-operator
   ```

2. Create API Server ConfigMap
   ```
   API_IP=$(kubectl get endpoints kubernetes -n default \
     -o jsonpath='{.subsets[0].addresses[0].ip}')
   # Apply cluster-templates/ebpf-standard/calico-config.yaml
   # Replace ${API_SERVER_HOST} with ${API_IP}
   ```

3. Apply Installation
   ```
   kubectl apply -f calico-config.yaml
   kubectl wait --for=condition=Available tigerastatus/calico --timeout=300s
   ```

4. Run Validation Script
   ```
   ./validate-calico-ebpf-installation.sh
   ```

## Acceptance Criteria (for handoff)
- [ ] All nodes in Ready state
- [ ] TigeraStatus shows Available
- [ ] BPF programs loaded (>10 per node)
- [ ] DNS resolves
- [ ] Pod-to-pod connectivity works
- [ ] Network policy enforcement verified
```

## Team Handoff Documentation

```bash
# Generate cluster information for handoff
cat <<EOF > cluster-handoff-$(date +%Y%m%d).txt
CLUSTER HANDOFF: Calico eBPF Installation
Date: $(date)
Cluster: $(kubectl config current-context)

Calico Version: $(kubectl get installation default -o jsonpath='{.status.calicoVersion}')
Data Plane: $(kubectl get installation default -o jsonpath='{.spec.calicoNetwork.linuxDataplane}')
Pod CIDR: $(kubectl get installation default -o jsonpath='{.spec.calicoNetwork.ipPools[0].cidr}')
Encapsulation: $(kubectl get installation default -o jsonpath='{.spec.calicoNetwork.ipPools[0].encapsulation}')

Node Count: $(kubectl get nodes --no-headers | wc -l)
eBPF Active Nodes: $(kubectl exec -n calico-system ds/calico-node -c calico-node -- bpftool prog list 2>/dev/null | grep -c calico || echo "check manually")

Monitoring: Prometheus metrics enabled on port 9091
Validation: See validate-calico-ebpf-installation.sh

Known Limitations:
- hostPorts disabled (use NodePort or LoadBalancer instead)
- kube-proxy disabled (Calico handles service routing)
EOF

cat cluster-handoff-$(date +%Y%m%d).txt
```

## Conclusion

Operationalizing Calico eBPF installation through standardized cluster templates, clear runbooks, and formal acceptance criteria ensures consistent, high-quality cluster deliveries. The cluster template captures the organization's standard eBPF configuration decisions (CIDR, encapsulation, Felix settings), the runbook provides step-by-step instructions for any team member to follow, and the handoff documentation gives the receiving team everything they need to operate the cluster from day one.
