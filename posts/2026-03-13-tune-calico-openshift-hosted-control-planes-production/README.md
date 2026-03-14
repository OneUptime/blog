# How to Tune Calico on OpenShift Hosted Control Planes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Performance, Production

Description: A guide to tuning Calico for production workloads on OpenShift Hosted Control Plane worker nodes.

---

## Introduction

Production tuning for Calico on OpenShift Hosted Control Planes addresses the same performance parameters as standard OpenShift tuning, plus one HCP-specific concern: the latency of Calico's communication with the remote API server in the management cluster. Every Felix datastore poll, IPAM operation, and workload endpoint update involves a round-trip to the management cluster's API server. Higher latency to this API server increases policy convergence time and IPAM response time.

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
    curl -sk -w "%{time_total}\n" https://kubernetes.default.svc.cluster.local/healthz -o /dev/null
done
```

If latency is above 10ms, the management cluster should be co-located with worker nodes.

## Step 2: Tune Felix Datastore Poll Intervals

Increase poll intervals to reduce API server call volume, especially important for HCP where every call crosses a cluster boundary.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "routeRefreshInterval": "60s",
    "iptablesRefreshInterval": "90s",
    "reportingInterval": "120s"
  }}'
```

## Step 3: Set the Correct MTU

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

## Step 4: Enable Prometheus Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

## Step 5: Tune IPAM Block Size

Larger blocks reduce the frequency of IPAM API calls as blocks fill up and new ones are allocated.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"blockSize":24}}'
```

A block size of 24 gives 256 IPs per block, reducing IPAM API calls for clusters with many short-lived pods (e.g., build pods in OpenShift).

## Step 6: Monitor Performance Metrics

```bash
curl -s http://<worker-node-ip>:9091/metrics | grep -E "felix_exec|felix_int_dataplane"
```

Watch `felix_exec_time_seconds` and `felix_int_dataplane_apply_time_seconds` for signs of dataplane slowness.

## Conclusion

Production tuning for Calico on OpenShift Hosted Control Planes focuses on managing API server communication overhead — measuring and minimizing latency to the management cluster, increasing Felix poll intervals to reduce call frequency, and sizing IPAM blocks to batch allocation requests. These HCP-specific considerations complement the standard Calico tuning parameters for a well-performing production deployment.
