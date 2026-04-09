# How to Configure High Availability with NVMe-oF Gateway Group

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, High Availability, Gateway

Description: Learn how to configure an NVMe-oF gateway group in Rook-Ceph for high availability with automatic failover and multipath I/O support.

---

## NVMe-oF Gateway High Availability

A single NVMe-oF gateway is a single point of failure. To achieve high availability, Ceph supports gateway groups where multiple gateways share ownership of the same NVMe subsystems. Clients connect to multiple gateways simultaneously using Asymmetric Namespace Access (ANA), with one gateway serving as the Optimal path and others as Non-Optimal standby paths.

When a gateway fails, the client's NVMe/TCP multipath driver automatically switches to an available path with minimal disruption.

## Step 1 - Deploy Multiple Gateway Instances

Configure the `CephNVMEofGateway` with multiple instances:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMEofGateway
metadata:
  name: nvmeof-gateway
  namespace: rook-ceph
spec:
  server:
    image: quay.io/ceph/nvmeof:latest
    instances: 4
  serviceLoadBalancerSourceRanges:
  - 10.0.0.0/8
  placement:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values: ["rook-ceph-nvmeof"]
        topologyKey: kubernetes.io/hostname
```

The `podAntiAffinity` rule ensures each gateway runs on a different host.

## Step 2 - Configure Gateway Group for a Subsystem

Add all gateway instances as listeners for the same subsystem:

```bash
for GW in 0 1 2 3; do
  kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
    nvmeof listener add \
    --subsystem nqn.2026-03.com.ceph:ha-subsystem \
    --host-name nvmeof-gateway-${GW} \
    --traddr 192.168.1.$((50+GW)) \
    --trsvcid 4420 \
    --adrfam ipv4 \
    --trtype tcp
done
```

## Step 3 - Allow Host Access to the Subsystem

Allow all hosts to connect to the subsystem:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  nvmeof host add \
  --subsystem nqn.2026-03.com.ceph:ha-subsystem \
  --host "*"
```

## Step 4 - Connect with Multipath from the Client

On the NVMe/TCP client, connect to all gateway addresses simultaneously:

```bash
nvme connect-all \
  -t tcp -n "nqn.2026-03.com.ceph:ha-subsystem" \
  -a 192.168.1.50 -s 4420

nvme connect-all \
  -t tcp -n "nqn.2026-03.com.ceph:ha-subsystem" \
  -a 192.168.1.51 -s 4420
```

Verify multipath:

```bash
nvme list
nvme list-subsys
```

Sample output:

```text
nvme-subsys0 - nqn.2026-03.com.ceph:ha-subsystem
\
 +- nvme0 tcp traddr=192.168.1.50,trsvcid=4420 live optimized
 +- nvme1 tcp traddr=192.168.1.51,trsvcid=4420 live non-optimized
```

## Step 5 - Test Failover

Simulate a gateway failure:

```bash
kubectl delete pod nvmeof-gateway-0 -n rook-ceph
```

Monitor I/O on the client - the non-optimal path should automatically become optimal:

```bash
watch -n 1 'nvme list-subsys'
```

## Step 6 - Monitor Gateway Health

Check gateway pod health and ANA state via Prometheus:

```yaml
groups:
- name: nvmeof-ha
  rules:
  - alert: NVMeofGatewayDown
    expr: kube_pod_status_ready{pod=~"nvmeof-gateway.*",namespace="rook-ceph"} == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "NVMe-oF gateway pod is not ready"
```

## Summary

NVMe-oF gateway high availability in Rook-Ceph is achieved by deploying multiple gateway instances across different hosts and configuring them as listeners for the same NVMe subsystem. Clients connect to all gateways simultaneously using multipath, with ANA providing Optimal and Non-Optimal path designation. When a gateway fails, the client driver automatically switches paths, ensuring continuous I/O.
