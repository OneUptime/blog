# How to Scale Out with NVMe-oF Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Scaling, Performance

Description: Learn how to scale out the Ceph NVMe-oF gateway in Rook-Ceph to handle more clients and higher throughput by adding gateway instances.

---

## Why Scale Out the NVMe-oF Gateway

A single NVMe-oF gateway can become a throughput bottleneck when serving many clients or high-bandwidth workloads. Ceph supports horizontal scaling of the NVMe-oF gateway layer - each gateway instance handles a subset of client connections while sharing access to the same RBD-backed namespaces.

Scaling out allows:
- More concurrent client connections
- Higher aggregate throughput by distributing CPU and network load
- Reduced per-client latency by avoiding gateway saturation

## Step 1 - Check Current Gateway Performance

Before scaling, measure current gateway utilization:

```bash
kubectl top pods -n rook-ceph -l app=rook-ceph-nvmeof
```

Check CPU saturation on the gateway pod. If CPU usage consistently exceeds 80%, scale out is warranted.

Check network throughput on the gateway node:

```bash
kubectl exec -it <nvmeof-gateway-pod> -n rook-ceph -- \
  cat /proc/net/dev | grep eth0
```

## Step 2 - Scale Up the Gateway Instances

Edit the `CephNVMeOFGateway` resource to increase the number of instances:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gateway
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:latest
  instances: 6
  pool: my-pool
  group: my-group
  resources:
    limits:
      cpu: "4"
      memory: "4Gi"
    requests:
      cpu: "2"
      memory: "2Gi"
```

Apply the change:

```bash
kubectl apply -f ceph-nvmeof-gateway.yaml
```

Rook will create additional gateway pods:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-nvmeof -w
```

## Step 3 - Add New Listeners for New Gateways

Register the new gateway instances as listeners on existing subsystems using the `ceph-nvmeof` gRPC client:

```bash
NEW_GATEWAY_IP="192.168.1.54"
NEW_GATEWAY_NAME="nvmeof-gateway-4"

ceph-nvmeof --server-address ${NEW_GATEWAY_IP} --server-port 5500 \
  listener add \
  --subsystem nqn.2026-03.com.ceph:primary-subsystem \
  --gateway-name ${NEW_GATEWAY_NAME} \
  --traddr ${NEW_GATEWAY_IP} \
  --trsvcid 4420 \
  --adrfam ipv4 \
  --trtype tcp
```

## Step 4 - Rebalance Client Connections

New clients will automatically connect to all available gateways. For existing clients that should use the new gateways, use `nvme discover` to find new paths:

```bash
nvme discover -t tcp -a 192.168.1.54 -s 4420
nvme connect -t tcp -n "nqn.2026-03.com.ceph:primary-subsystem" \
  -a 192.168.1.54 -s 4420
```

## Step 5 - Verify Load Distribution

Check that I/O is being distributed across gateways:

```bash
ceph-nvmeof --server-address <gateway-ip> --server-port 5500 \
  subsystem list
```

On each gateway pod, check connection counts:

```bash
ceph-nvmeof --server-address <gateway-ip> --server-port 5500 \
  gateway info
```

## Step 6 - Set Resource Limits Per Gateway

Configure resource limits to prevent any single gateway from starving others:

```yaml
spec:
  instances: 6
  resources:
    limits:
      cpu: "4"
      memory: "4Gi"
    requests:
      cpu: "2"
      memory: "2Gi"
```

## Summary

Scaling out the NVMe-oF gateway in Rook-Ceph is done by increasing the `instances` field in the `CephNVMeOFGateway` resource and registering new gateway pods as listeners on existing subsystems. New clients connect to all available gateways using multipath, while existing clients can add new paths with `nvme connect`. Use resource limits to ensure even workload distribution across gateway pods.
