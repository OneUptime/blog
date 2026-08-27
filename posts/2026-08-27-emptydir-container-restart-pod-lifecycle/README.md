# Does emptyDir Survive Container Restarts and Pod Replacement?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Pod, Container, Restart Policy, Ephemeral Storage

Description: Identify exactly when emptyDir data survives and when Pod replacement, deletion, eviction, rescheduling, or node failure removes it.

---

Yes. An `emptyDir` survives a routine container crash and the resulting kubelet-managed container restart while the same Pod remains assigned to the same node. Kubernetes creates the volume for the Pod, not for one container instance.

The boundary is the Pod's lifecycle and placement. When the Pod is removed from the node, its `emptyDir` data is deleted permanently. A replacement Pod with the same Deployment name, StatefulSet ordinal, labels, or hostname gets a new `emptyDir`.

## Container Restart Is Not Pod Replacement

A container's writable image layer belongs to that container instance. Files written only into that layer are lost when the container is recreated. A volume mount is separate:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restart-demo
spec:
  restartPolicy: Always
  containers:
    - name: worker
      image: docker.io/library/busybox:1.36.1
      command: ["sh", "-c"]
      args:
        - |
          count=$(cat /state/restarts 2>/dev/null || echo 0)
          count=$((count + 1))
          echo "$count" > /state/restarts
          echo "container start $count"
          sleep 20
          exit 1
      volumeMounts:
        - name: state
          mountPath: /state
  volumes:
    - name: state
      emptyDir: {}
```

Each restart reads the file written by the prior container instance. Verify that the Pod UID stays constant while the restart count rises:

```bash
kubectl get pod restart-demo \
  -o 'custom-columns=NAME:.metadata.name,UID:.metadata.uid,NODE:.spec.nodeName,RESTARTS:.status.containerStatuses[0].restartCount'
kubectl logs restart-demo --previous
kubectl exec restart-demo -- cat /state/restarts
```

An init container and an application container have the same relationship. The init container can write files to `emptyDir`, exit, and let application containers read those files later in the same Pod.

## Events That Keep the Same emptyDir

The Kubernetes contract explicitly covers a container crash: it does not remove the Pod from the node, so `emptyDir` remains. The same principle applies when kubelet restarts a container according to the Pod's restart policy.

Do not turn that into a durability promise for node reboot or runtime failure. Local ephemeral storage has no long-term durability guarantee, and a node failure can lose the data. The safe application assumption is only that a container restart within the current Pod may reuse it.

## Events That Create an Empty Replacement

Expect the data to disappear when the current Pod is removed, including:

- `kubectl delete pod`;
- a Deployment rollout or `kubectl rollout restart`;
- eviction for memory, local storage, inode, or other node pressure;
- a successful node drain that evicts or deletes the Pod;
- a replacement Pod scheduled after node loss;
- Job or Pod completion followed by Pod deletion;
- changes to a Pod template that cause a controller to replace Pods.

A StatefulSet often recreates `database-0` with the same Pod name, but its Pod UID changes. PersistentVolumeClaims can survive that recreation; `emptyDir` cannot.

Prove the identity change with UIDs rather than names:

```bash
kubectl get pod -l app=worker \
  -o custom-columns=NAME:.metadata.name,UID:.metadata.uid,NODE:.spec.nodeName,CREATED:.metadata.creationTimestamp
```

If the UID changed, treat every `emptyDir` as newly created.

## Choose the Volume from the Recovery Requirement

Use `emptyDir` for data the Pod can regenerate: unpacked assets, compiler intermediates, caches, sockets, temporary downloads, and handoff files between containers.

Use a PVC backed by storage with the required durability and topology when data must survive Pod deletion or be used by a replacement Pod. Use a generic ephemeral volume when scratch data should have PVC-backed capacity or storage-class behavior but should normally be garbage-collected with the Pod. Generic ephemeral still follows Pod deletion: the Pod owns its generated PVC, and garbage collection usually deletes it and the backing volume.

No ephemeral volume is a backup. If a cache significantly reduces recovery time, the application should still tolerate a cold start.

## Avoid Restart Loops Caused by Persistent Scratch State

Survival across a container restart can preserve the cause of failure. Examples include a corrupt generated file, a full disk-backed `emptyDir`, or a memory-backed cache that still consumes memory after an OOM restart.

Make startup idempotent:

```bash
set -eu
rm -rf /state/incomplete
mkdir -p /state/incomplete
# Build into the temporary directory.
rm -rf /state/current
mv /state/incomplete /state/current
```

Use application-level markers, checksums, bounded retention, and cleanup. Do not delete all scratch state blindly if another container in the Pod owns part of the volume.

For irreplaceable incident artifacts, copy them to durable storage while the Pod is still accessible. A termination hook can be a best-effort aid, but deletion deadlines, node failure, and force deletion mean it cannot provide a durability guarantee.

## Official Documentation

- [Kubernetes emptyDir lifecycle](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes configure a Pod to use a volume](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/)
- [Kubernetes Pod lifecycle and container restarts](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)

## Conclusion

`emptyDir` survives a restarted container because it belongs to the current Pod. It does not survive removal of that Pod from its node, even when a controller creates a replacement with the same name. Use the Pod UID as the identity boundary and store durable data elsewhere.
