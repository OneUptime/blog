# How to Tune Calico on OpenShift Hosted Control Planes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Performance, Production

Description: A guide to tuning Calico for production workloads on OpenShift Hosted Control Plane worker nodes.

---

## Introduction

Production tuning for Calico on OpenShift Hosted Control Planes addresses the same performance parameters as standard OpenShift tuning, plus one HCP-specific concern: the latency of Calico's communication with the remote API server in the management cluster. Calico API operations, including IPAM operations and workload endpoint updates, depend on communication with the hosted cluster API server. Higher latency to this API server increases policy convergence time and IPAM response time.

For low-latency HCP deployments, place the management cluster and worker node infrastructure in the same data center or region to minimize API server communication latency. Then apply the standard Calico tuning parameters to optimize the data plane.

This guide covers production tuning for Calico on OpenShift Hosted Control Planes.

## Prerequisites

- Calico running on OpenShift Hosted Control Plane worker nodes
- `kubectl` configured with hosted cluster kubeconfig
- `calicoctl` installed

## Step 1: Measure API Server Latency

```bash
for i in {1..5}; do
  kubectl exec -n calico-system -it <calico-node-pod> -- \
    curl -sk -w "%{time_total}\n" https://kubernetes.default.svc.cluster.local/readyz -o /dev/null
done
```

If latency is consistently higher than your production target, co-locate the management cluster with worker nodes or move them closer together.

## Step 2: Tune Felix Refresh Intervals

Increase refresh intervals to reduce Felix's periodic dataplane verification work. Keep these values conservative: higher values reduce background work, but they also delay Felix's detection of dataplane changes made by another process.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "routeRefreshInterval": "120s",
    "iptablesRefreshInterval": "300s"
  }}'
```

## Step 3: Set the Correct MTU

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

## Step 4: Enable Prometheus Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

## Step 5: Tune IPAM Block Size

Larger blocks reduce the frequency of IPAM block allocations as blocks fill up and new ones are allocated. The `blockSize` value can only be set when an IP pool is created; to change an existing pool, follow Calico's documented procedure to drain allocations through a temporary pool, delete the old pool, and recreate it.

```bash
calicoctl apply -f default-ipv4-ippool.yaml
```

Where `default-ipv4-ippool.yaml` recreates the pool with `spec.blockSize: 24`. A block size of 24 gives 256 IPs per block, reducing IPAM block allocations for clusters with many short-lived pods (e.g., build pods in OpenShift).

## Step 6: Monitor Performance Metrics

```bash
curl -s http://<worker-node-ip>:9091/metrics | grep -E "felix_exec_time_micros|felix_int_dataplane"
```

Watch `felix_exec_time_micros` and `felix_int_dataplane_apply_time_seconds` for signs of dataplane slowness.

## Conclusion

Production tuning for Calico on OpenShift Hosted Control Planes focuses on managing API server communication overhead - measuring and minimizing latency to the management cluster, increasing Felix refresh intervals to reduce background work, and sizing IPAM blocks to batch allocation requests. These HCP-specific considerations complement the standard Calico tuning parameters for a well-performing production deployment.
