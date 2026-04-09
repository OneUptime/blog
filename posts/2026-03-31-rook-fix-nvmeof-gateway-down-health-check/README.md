# How to Fix NVMEOF_GATEWAY_DOWN Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, NVMe-oF, Health Check, Gateway

Description: Learn how to resolve NVMEOF_GATEWAY_DOWN in Ceph, a critical health error indicating one or more NVMe-oF gateway instances are not reachable or have failed.

---

## What Is NVMEOF_GATEWAY_DOWN?

`NVMEOF_GATEWAY_DOWN` is a Ceph health error that fires when one or more NVMe-oF (NVMe over Fabrics) gateway instances are reported as down. The NVMe-oF gateway service provides NVMe block storage access over TCP or RDMA networks. When a gateway is down, any NVMe-oF initiators connected to it lose block storage access unless multipath failover is configured.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[ERR] NVMEOF_GATEWAY_DOWN: 1 NVMe-oF gateway(s) are down
    gateway 'nvmeof-gw-b' in group 'group0' is down
```

Check gateway status in detail from within a gateway pod:

```bash
kubectl -n rook-ceph exec -it <nvmeof-gateway-pod> -- ceph-nvmeof gw info
```

Check Kubernetes pod status:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof
kubectl -n rook-ceph describe pod ceph-nvmeof-b-<hash>
```

## Diagnosing the Cause

### Check Pod Logs

```bash
kubectl -n rook-ceph logs ceph-nvmeof-b-<hash> --previous
kubectl -n rook-ceph logs ceph-nvmeof-b-<hash>
```

Look for:
- OOM (Out of Memory) kills
- Crash signals (SIGSEGV, SIGABRT)
- Network connectivity issues
- Ceph auth/credentials errors

### Check Node Status

```bash
kubectl get node <node-name>
kubectl describe node <node-name>
```

### Check Ceph Connectivity from Gateway

```bash
kubectl -n rook-ceph exec -it ceph-nvmeof-a-<hash> -- ceph -s
```

## Fix Steps

### Step 1 - Restart the Down Gateway Pod

```bash
kubectl -n rook-ceph delete pod ceph-nvmeof-b-<hash>
```

Kubernetes will recreate it automatically. Monitor the restart:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof -w
```

### Step 2 - Check Resource Limits

If the pod was OOM killed:

```bash
kubectl -n rook-ceph describe pod ceph-nvmeof-b-<hash> | grep -A 3 "OOM\|Memory"
```

Update the NVMEoF CR to increase memory limits:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
spec:
  gateway:
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "2Gi"
```

### Step 3 - Verify RBD Credentials

```bash
kubectl -n rook-ceph get secret rook-ceph-nvmeof
ceph auth get client.nvmeof
```

### Step 4 - Check Network Connectivity

Verify the gateway can reach the Ceph monitors and OSDs:

```bash
kubectl -n rook-ceph exec -it ceph-nvmeof-b-<hash> -- ceph mon stat
```

### Step 5 - Check for NVMe-oF Client Impact

On initiator nodes, verify current NVMe connections:

```bash
nvme list
nvme list-subsys
```

If multipath is configured, the surviving gateway should have taken over.

## Summary

`NVMEOF_GATEWAY_DOWN` is a critical error indicating a NVMe-oF gateway is unreachable. Immediately check the gateway pod logs and status, then restart the pod. Investigate OOM kills (increase memory limits), network issues, or credential problems. With 2+ gateways and NVMe-oF multipath configured on initiators, a single gateway failure does not cause I/O outages.
