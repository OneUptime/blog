# How to Troubleshoot CSI Provisioner Pod Issues in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Troubleshoot, Kubernetes

Description: Step-by-step guide to diagnosing and resolving common CSI provisioner pod failures in Rook-Ceph Kubernetes deployments.

---

## Common CSI Provisioner Problems

The CSI provisioner pods in Rook are responsible for creating, deleting, and resizing Ceph volumes on behalf of Kubernetes. When these pods have issues, PVC provisioning stalls and workloads cannot get storage. Common symptoms include PVCs stuck in `Pending` state and `FailedAttachVolume` events.

## Step 1 - Check Pod Status

Start by examining the provisioner pod status:

```bash
kubectl get pods -n rook-ceph -l app=csi-rbdplugin-provisioner
kubectl get pods -n rook-ceph -l app=csi-cephfsplugin-provisioner
```

Look for pods in `CrashLoopBackOff`, `Error`, or `Pending` state.

## Step 2 - Check Container Logs

Each provisioner pod has multiple containers. Check the relevant ones:

```bash
# Check the main CSI provisioner container
kubectl logs -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-provisioner

# Check the Ceph CSI plugin container
kubectl logs -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-rbdplugin

# Check the snapshotter
kubectl logs -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-snapshotter
```

## Step 3 - Investigate PVC Events

When a PVC is stuck in `Pending`, describe it for events:

```bash
kubectl describe pvc <pvc-name> -n <namespace>
```

Look for messages like:

```text
Warning  ProvisioningFailed  Failed to provision volume with StorageClass "rook-ceph-block":
  rpc error: code = Internal desc = failed to create volume: ...
```

## Step 4 - Check RBAC and Secrets

Provisioner pods require specific RBAC permissions and secrets to communicate with Ceph. Verify they exist:

```bash
kubectl get secret rook-csi-rbd-provisioner -n rook-ceph
kubectl get clusterrolebinding rbd-csi-provisioner-role
```

If secrets are missing, recreate them by restarting the Rook operator to trigger a full reconciliation:

```bash
kubectl rollout restart deployment/rook-ceph-operator -n rook-ceph
```

## Step 5 - Check Ceph Cluster Health

Provisioning fails if the Ceph cluster is unhealthy:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail
```

Resolve any `HEALTH_ERR` or `HEALTH_WARN` conditions before attempting new provisions.

## Step 6 - Restart Provisioner Pods

After fixing underlying issues, restart the provisioner deployments:

```bash
kubectl rollout restart deployment/csi-rbdplugin-provisioner -n rook-ceph
kubectl rollout restart deployment/csi-cephfsplugin-provisioner -n rook-ceph
kubectl rollout status deployment/csi-rbdplugin-provisioner -n rook-ceph
```

## Step 7 - Enable Debug Logging

For persistent issues, enable verbose logging:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_LOG_LEVEL: "5"
  CSI_GRPC_TIMEOUT_SECONDS: "150"
```

```bash
kubectl apply -f operator-config.yaml
kubectl rollout restart deployment/csi-rbdplugin-provisioner -n rook-ceph
```

## Summary

Troubleshooting Rook CSI provisioner pod issues involves checking pod status, container logs, PVC events, RBAC configuration, and underlying Ceph cluster health. Most provisioning failures stem from misconfigured secrets, RBAC gaps, or Ceph cluster health problems. Increasing the CSI log level helps surface the root cause when standard logs are insufficient.
