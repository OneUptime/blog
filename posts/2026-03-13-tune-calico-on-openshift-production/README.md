# How to Tune Calico on OpenShift for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Performance, Production

Description: A guide to performance-tuning Calico for production workloads on OpenShift, accounting for OpenShift's specific kernel and security constraints.

---

## Introduction

Tuning Calico for production on OpenShift requires working within OpenShift's constraints. OpenShift uses specific kernel parameters, Security Context Constraints, and may run on RHEL CoreOS nodes where some advanced kernel features - such as certain eBPF program types - require careful compatibility checking before enabling.

Despite these constraints, significant performance improvements are available: correct MTU settings for the overlay network, Felix refresh tuning for faster dataplane reconciliation, and IPAM block optimization for dense clusters. These should be validated against your OpenShift and Calico installation mode before being applied in production.

This guide covers production tuning for Calico on OpenShift.

## Prerequisites

- Calico running on OpenShift
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Optimize MTU for OpenShift's VXLAN

If your OpenShift Calico installation uses VXLAN encapsulation, set the MTU correctly to avoid fragmentation.

```bash
# If the underlying network MTU is 1500

# VXLAN overhead is 50 bytes
oc patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

Verify the MTU is applied:

```bash
oc exec -n calico-system -it <calico-node-pod> -- ip link show vxlan.calico | grep mtu
```

## Step 2: Tune Felix for OpenShift Workload Patterns

OpenShift clusters often have frequent pod scheduling during builds and deployments. Tune Felix refresh intervals when you need faster detection of dataplane drift and have validated the additional CPU cost.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "iptablesRefreshInterval": "30s",
    "routeRefreshInterval": "15s",
    "reportingInterval": "60s"
  }}'
```

## Step 3: Optimize IPAM for OpenShift

Calico IPAM allocates addresses in blocks. Tune the block size before installation, or follow Calico's migration procedure for an existing cluster, because the `blockSize` field cannot be edited directly on an existing IPPool.

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

## Step 4: Enable Prometheus Metrics for OpenShift Monitoring

OpenShift has a built-in monitoring stack. Configure Calico to expose metrics and create Kubernetes discovery resources that OpenShift user workload monitoring can scrape.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'

oc apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: calico-system
  labels:
    app: felix-metrics
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: felix-metrics
  namespace: calico-system
spec:
  endpoints:
  - interval: 30s
    path: /metrics
    port: metrics
    scheme: http
  selector:
    matchLabels:
      app: felix-metrics
EOF
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
oc get installation.operator.tigera.io default -o yaml | grep mtu
```

## Conclusion

Tuning Calico for production on OpenShift involves setting the correct VXLAN MTU when VXLAN is in use, adjusting Felix refresh timers after measuring the CPU tradeoff, optimizing IPAM block sizes at install time or through a planned migration, and exposing metrics to OpenShift's built-in monitoring stack. These changes can improve network throughput and operational visibility within OpenShift's security and kernel constraints.
