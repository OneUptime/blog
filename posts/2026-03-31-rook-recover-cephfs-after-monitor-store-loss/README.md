# How to Recover CephFS After Monitor Store Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Recovery, CephFS

Description: Learn how to recover a CephFS filesystem in Rook-Ceph after losing the Ceph monitor store due to disk failure or data corruption.

---

## Understanding Monitor Store Loss

Ceph monitors store the cluster map, OSD map, and CRUSH map in a RocksDB store on disk. If all monitors lose their stores simultaneously - due to disk failure, accidental deletion, or corruption - the cluster becomes inoperative and all filesystems, including CephFS, become inaccessible.

Recovery from monitor store loss is an advanced procedure that involves rebuilding the monitor store from OSD data.

## Step 1 - Confirm Total Monitor Store Loss

Verify that all monitor pods are in a crash loop:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-mon
kubectl logs -n rook-ceph <mon-pod> | grep -E "error|FAILED|leveldb"
```

If all monitors report database errors and cannot start, proceed with recovery.

## Step 2 - Stop All Rook Components

Scale down the operator and all Ceph daemons to prevent conflicting writes:

```bash
kubectl scale deployment rook-ceph-operator -n rook-ceph --replicas=0
kubectl scale deployment -n rook-ceph --replicas=0 \
  $(kubectl get deploy -n rook-ceph -o name | grep -v operator)
```

## Step 3 - Extract OSD Auth Keys

Before rebuilding, collect OSD authentication keys from any surviving OSD pod's keyring:

```bash
kubectl exec -it <osd-pod> -n rook-ceph -- \
  cat /var/lib/ceph/osd/ceph-0/keyring
```

Save all OSD keyrings to a secure location.

## Step 4 - Rebuild the Monitor Store

Use the `ceph-monstore-tool` to rebuild the store from OSD data. This tool scans OSD data stores to reconstruct the monitor database. You need to run this from a node or pod that has access to the OSD data directories:

```bash
ceph-monstore-tool /tmp/mon-store rebuild -- \
  --keyring /etc/ceph/ceph.client.admin.keyring \
  --monmap /tmp/monmap
```

Before running `rebuild`, generate a monmap with the expected monitor addresses:

```bash
monmaptool --create --add a <mon-a-ip>:6789 --fsid <cluster-fsid> /tmp/monmap
```

The rebuild command scans all available OSD stores to reconstruct the OSD map, crush map, and authentication data. Ensure all OSD data directories are accessible from where you run this command.

## Step 5 - Inject the Rebuilt Store

Copy the rebuilt store to the monitor's PVC. Use a temporary pod to access the monitor PVC:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mon-recovery
  namespace: rook-ceph
spec:
  containers:
  - name: recovery
    image: quay.io/ceph/ceph:v18.2.0
    command: ["sleep", "3600"]
    volumeMounts:
    - name: mon-data
      mountPath: /var/lib/ceph/mon
  volumes:
  - name: mon-data
    persistentVolumeClaim:
      claimName: rook-ceph-mon-a
```

Apply the pod and copy the rebuilt store into it:

```bash
kubectl apply -f mon-recovery.yaml
kubectl wait --for=condition=Ready pod/mon-recovery -n rook-ceph
kubectl cp /tmp/mon-store mon-recovery:/var/lib/ceph/mon/ceph-a -n rook-ceph
kubectl delete pod mon-recovery -n rook-ceph
```

## Step 6 - Restart Monitors and Verify

Scale the operator back up and let Rook restart the monitors:

```bash
kubectl scale deployment rook-ceph-operator -n rook-ceph --replicas=1
```

Watch the monitor pods recover:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-mon -w
```

Once quorum is reached, verify the cluster state:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph status
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
```

## Summary

Recovering CephFS after monitor store loss requires rebuilding the monitor database from OSD keyrings using `ceph-monstore-tool`. The process is destructive and should be a last resort after verifying all monitor stores are unrecoverable. Prevention is always preferable: use replicated monitors across failure domains and back up the monitor keyring and auth data regularly.
