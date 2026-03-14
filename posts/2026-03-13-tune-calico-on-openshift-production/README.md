# How to Tune Calico on OpenShift for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Performance, Production

Description: A guide to performance-tuning Calico for production workloads on OpenShift, accounting for OpenShift's specific kernel and security constraints.

---

## Introduction

Tuning Calico for production on OpenShift requires working within OpenShift's constraints. OpenShift uses specific kernel parameters, Security Context Constraints, and may run on RHEL CoreOS nodes where some advanced kernel features - such as certain eBPF program types - require careful compatibility checking before enabling.

Despite these constraints, significant performance improvements are available: correct MTU settings for the overlay network, Felix timer tuning for lower policy convergence latency, and IPAM block optimization for dense clusters. These are safe to apply in any OpenShift environment.

This guide covers production tuning for Calico on OpenShift.

## Prerequisites

- Calico running on OpenShift
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Optimize MTU for OpenShift's VXLAN

OpenShift with Calico typically uses VXLAN encapsulation. Set the MTU correctly to avoid fragmentation.

```bash
# OpenShift node MTU is typically 1500
# VXLAN overhead is 50 bytes
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

Verify the MTU is applied:

```bash
oc exec -n calico-system -it <calico-node-pod> -- ip link show vxlan.calico | grep mtu
```

## Step 2: Tune Felix for OpenShift Workload Patterns

OpenShift clusters often have frequent pod scheduling during builds and deployments. Tune Felix to handle policy updates quickly.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "iptablesRefreshInterval": "30s",
    "routeRefreshInterval": "15s",
    "reportingInterval": "60s"
  }}'
```

## Step 3: Optimize IPAM for OpenShift

OpenShift uses a per-node pod CIDR allocation. Tune the Calico block size to align with this.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"blockSize":26}}'
```

## Step 4: Enable Prometheus Metrics for OpenShift Monitoring

OpenShift has a built-in Prometheus instance. Configure Calico to expose metrics in a format that OpenShift's monitoring stack can scrape.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'

oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-prometheus.yaml
```

## Step 5: Tune calico-kube-controllers Resources

For large OpenShift clusters with many namespaces and network policies:

```bash
oc patch deployment calico-kube-controllers -n calico-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"100m","memory":"128Mi"},"limits":{"cpu":"500m","memory":"512Mi"}}}]'
```

## Step 6: Verify Tuning

```bash
calicoctl get felixconfiguration default -o yaml
oc get installation default -o yaml | grep mtu
```

## Conclusion

Tuning Calico for production on OpenShift involves setting the correct VXLAN MTU, adjusting Felix timers for OpenShift's frequent pod scheduling patterns, optimizing IPAM block sizes, and exposing metrics to OpenShift's built-in monitoring stack. These changes improve policy convergence speed and network throughput within OpenShift's security and kernel constraints.
