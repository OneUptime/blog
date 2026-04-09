# How to Fix Rook CSI Pods Not Starting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Troubleshooting, Kubernetes

Description: Learn how to diagnose and fix Rook CSI pods not starting by checking image availability, RBAC permissions, node driver registration, and kubelet socket path configuration.

---

## Understanding Rook CSI Components

Rook deploys two types of CSI pods:

- **CSI provisioner** (`csi-rbdplugin-provisioner`, `csi-cephfsplugin-provisioner`): Creates and deletes volumes, runs as a Deployment
- **CSI node plugin** (`csi-rbdplugin`, `csi-cephfsplugin`): Attaches and mounts volumes on nodes, runs as a DaemonSet

If either fails to start, PVC provisioning or mounting breaks for all workloads.

## Check CSI Pod Status

```bash
# List all CSI pods
kubectl -n rook-ceph get pods | grep csi

# Check DaemonSet status
kubectl -n rook-ceph get ds csi-rbdplugin
kubectl -n rook-ceph get ds csi-cephfsplugin

# Check Deployment status
kubectl -n rook-ceph get deploy csi-rbdplugin-provisioner

# Describe a failing pod
kubectl -n rook-ceph describe pod csi-rbdplugin-<id>
```

## Common Cause 1: Image Pull Failure

CSI pods use specific sidecar container images. If these are unavailable, pods fail:

```bash
# Check events on the pod
kubectl -n rook-ceph describe pod csi-rbdplugin-<id> | grep -A5 "Events:"
```

If you see `ImagePullBackOff`, you may need to update the image registry or pull the images manually and push to a private registry. Check the operator config:

```bash
kubectl -n rook-ceph get configmap rook-ceph-operator-config -o yaml | grep -i "ROOK_CSI_.*IMAGE"
```

## Common Cause 2: Missing RBAC Resources

CSI pods require specific ClusterRoles and ServiceAccounts:

```bash
# Verify required resources exist
kubectl get clusterrole rbd-csi-nodeplugin
kubectl get clusterrole rbd-external-provisioner-runner
kubectl get serviceaccount rook-csi-rbd-plugin-sa -n rook-ceph

# If missing, reapply RBAC
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/common.yaml
```

## Common Cause 3: Kubelet Socket Path Mismatch

CSI node plugins communicate with the kubelet via a Unix socket. The default path varies by Kubernetes distribution:

```bash
# Standard Kubernetes
/var/lib/kubelet/plugins_registry/

# Some distributions use:
/var/snap/microk8s/common/var/lib/kubelet/plugins_registry/
```

Update the CSI kubelet path in the operator ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_CSI_KUBELET_DIR_PATH: "/var/lib/kubelet"
```

## Common Cause 4: Node Driver Registration Failure

If CSI node pods start but the driver is not registered with kubelet:

```bash
# Check node plugin logs
kubectl -n rook-ceph logs csi-rbdplugin-<id> -c driver-registrar

# Check if the registration socket exists on the node
ls /var/lib/kubelet/plugins_registry/rook-ceph.rbd.csi.ceph.com-reg.sock
```

## Common Cause 5: Node Resource Constraints or Taints

DaemonSet pods may not schedule on tainted nodes:

```bash
# Check if CSI pods are scheduled on all nodes
kubectl -n rook-ceph get pods -l app=csi-rbdplugin -o wide

# Compare with all nodes
kubectl get nodes

# Check for unschedulable taints
kubectl describe node <node-name> | grep Taints
```

Add tolerations to the CSI DaemonSet if worker nodes have taints:

```bash
kubectl -n rook-ceph patch ds csi-rbdplugin --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/tolerations/-","value":{"key":"storage","operator":"Exists"}}]'
```

## Verify CSI is Functional

After fixing CSI pods, verify PVC provisioning works:

```bash
# Create a test PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 1Gi
EOF

# Check PVC status
kubectl get pvc test-pvc
```

## Summary

Rook CSI pods fail to start due to image pull failures, missing RBAC resources, kubelet socket path mismatches, node driver registration errors, or scheduling constraints. Checking pod events and container logs identifies the root cause. After applying fixes - whether updating image registry settings, reapplying RBAC, correcting the kubelet path, or adding node tolerations - verify CSI is functional by provisioning a test PVC.
