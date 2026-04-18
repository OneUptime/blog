# How to Troubleshoot PVC Binding Issues in Portainer - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, PVC, Storage, Troubleshooting

Description: Debug Kubernetes PersistentVolumeClaim binding failures including StorageClass mismatches and capacity issues through Portainer.

---

A PersistentVolumeClaim (PVC) stuck in Pending state means Kubernetes cannot find a matching PersistentVolume to bind it to. Portainer's storage view surfaces PVC and PV status, and the events view shows the binding decision.

## PVC Binding Failure Causes

| Cause | Solution |
|---|---|
| No PV matches the requested StorageClass | Create a PV or use the correct StorageClass name |
| Requested capacity exceeds available PV | Use a smaller request or provision a larger PV |
| Access mode mismatch | Ensure PVC and PV access modes match |
| VolumeBindingMode: WaitForFirstConsumer | PVC binds only when a pod is scheduled |

## Step 1: Check PVC Status in Portainer

Go to **Kubernetes > Volumes** in Portainer. Pending PVCs show with no Bound PV.

```bash
kubectl get pvc -n production
kubectl describe pvc my-pvc -n production
```

The describe output shows the binding failure reason in Events.

## Step 2: List Available StorageClasses

```bash
kubectl get storageclass

Example output:
NAME                 PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
standard (default)   rancher.io/local-path   Delete          WaitForFirstConsumer   false                  30d
## nfs-storage          nfs-provisioner         Retain          Immediate              false                  12d
```

Verify your PVC's \`storageClassName\` matches an available class.

## Step 3: Check PV Availability

```bash
## List all PVs and their status
kubectl get pv

## A PV in Released state needs to be reclaimed before reuse
kubectl describe pv <pv-name>
```

## Step 4: Fix a Released PV

A PV in Released state has the old claim reference blocking reuse. Clear it:

```bash
kubectl patch pv <pv-name> --type=merge -p '{"spec":{"claimRef": null}}'
```

## Step 5: Dynamic Provisioning

If your cluster has a dynamic provisioner (AWS EBS, GCE PD, local-path), PVCs should bind automatically. If they don't:

```bash
## Check if the provisioner pod is running
kubectl get pods -n kube-system | grep provisioner

## Check provisioner logs
kubectl logs -n kube-system -l app=local-path-provisioner
```

## Summary

PVC binding failures are almost always due to StorageClass mismatches, capacity constraints, or access mode incompatibilities. Portainer's Volumes view shows PVC status at a glance, and the terminal lets you run the kubectl describe and patch commands needed to resolve binding issues.
