# How to Rescue Files from an emptyDir Before a Failing Pod Is Deleted

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Pods, Data Recovery, kubectl, Ephemeral Containers, Troubleshooting

Description: Copy diagnostic or work files from an emptyDir while its original Pod, node, and volume still exist, using a running container or an explicitly mounted debug container.

---

An `emptyDir` belongs to one Pod. Kubernetes creates it after the Pod is assigned to a node, keeps it across container crashes and restarts within that Pod, and permanently deletes its contents when the Pod is removed from the node.

That creates a narrow but useful recovery window: a container may be crash-looping while the Pod object, its node assignment, and the `emptyDir` still exist. During that window, you can copy files through a container in the same Pod. After the Pod is deleted or the volume is removed from the node, Kubernetes provides no way to recreate that `emptyDir` or recover its former contents.

This is an incident procedure, not a durability design. Work through it before deleting, evicting, replacing, or force-deleting the affected Pod.

## Confirm That a Recovery Window Still Exists

Record the namespace, Pod, application container, volume name, and mount path:

```bash
namespace=payments
pod=payment-worker-7bcf6b9c75-n7kxm
container=worker
volume=work-files
mount=/work
```

Inspect the Pod without changing it:

```bash
kubectl get pod "$pod" -n "$namespace" \
  -o jsonpath='{.metadata.uid}{" node="}{.spec.nodeName}{" phase="}{.status.phase}{" deleting="}{.metadata.deletionTimestamp}{"\n"}'

kubectl describe pod "$pod" -n "$namespace"
kubectl get pod "$pod" -n "$namespace" -o yaml
```

Proceed only while all of these are true:

- the original Pod object still exists;
- it is still assigned to the original node;
- the node and kubelet can still start or reach a container in that Pod;
- the `emptyDir` is still listed in `spec.volumes` and mounted at the expected path;
- deletion has not already completed.

A populated `metadata.deletionTimestamp` means termination has begun. You may not be able to add a debug container or finish a copy before the grace period expires. Do not promise recovery in that state.

Stop human or automated actions that would replace the Pod while the rescue is in progress. A rollout pause does not resurrect a deleted volume, and scaling a controller down can itself delete the Pod. For a Job or CronJob, account for TTL and history cleanup before the controller removes completed Pods.

## Use an Existing Running Container First

If any existing container mounts the volume and stays running long enough, use it. List the directory without allocating a TTY:

```bash
kubectl exec -n "$namespace" "$pod" -c "$container" -- \
  sh -c 'du -sh "$1"; find "$1" -maxdepth 2 -type f | head -n 100' sh "$mount"
```

For a small, ordinary directory, `kubectl cp` is convenient:

```bash
kubectl cp -n "$namespace" -c "$container" \
  "$pod:$mount" "./rescue-$pod"
```

`kubectl cp` requires `tar` in the container image. Minimal and distroless images often do not include it. When `tar` is available, streaming an archive makes the local output explicit and avoids an interactive shell:

```bash
kubectl exec -n "$namespace" "$pod" -c "$container" -- \
  tar -C "$mount" -cf - . > "rescue-$pod.tar"
```

Do not add `-t`; terminal allocation can alter a binary stream. Files that are actively being written can produce an inconsistent archive. If the application provides a safe quiesce or checkpoint operation, use it first. Otherwise record that the result is a best-effort live copy that may be inconsistent.

## Add an Ephemeral Container with the Volume Mounted

When the application container is crash-looping or has no shell or `tar`, an ephemeral container can help because it runs inside the existing Pod. However, a basic `kubectl debug` container does not automatically mount application volumes—the official example shows `Mounts: <none>`.

With `kubectl` 1.32 or later, which supports stable custom debug profiles, create a partial container specification that explicitly mounts the existing volume read-only:

```yaml
# emptydir-rescuer.yaml
volumeMounts:
  - name: work-files
    mountPath: /rescue
    readOnly: true
```

The `name` must exactly match the `emptyDir` entry in the original Pod. Set `debug_image` to the full reference for an image approved by your organization that contains `sh` and `tar`, then add the debug container. The `baseline` profile avoids requesting debugging capabilities that this file-recovery procedure does not need:

```bash
kubectl debug "$pod" -n "$namespace" -it \
  --image="$debug_image" \
  --container=emptydir-rescuer \
  --profile=baseline \
  --custom=emptydir-rescuer.yaml -- sh
```

Inside the debug container, verify that `/rescue` contains the expected files and leave the shell running. From another terminal, stream the archive from that named container and validate it. Exit the debug shell only after validation succeeds:

```bash
kubectl exec -n "$namespace" "$pod" -c emptydir-rescuer -- \
  tar -C /rescue -cf - . > "rescue-$pod.tar"
```

Important constraints apply:

- Ephemeral containers are stable from Kubernetes 1.25, and custom debug profiles are stable from `kubectl` 1.32. Use client and API server versions within the supported version skew.
- The caller needs `get`, `list`, and `watch` on Pods, `patch` on `pods/ephemeralcontainers`, and `create` on `pods/attach` and `pods/exec` for the commands shown here.
- Pod Security admission, image policy, volume permissions, SELinux, and the Pod security context still apply. Do not bypass them for convenience.
- Ephemeral containers are never restarted automatically and cannot be changed or removed after being added.
- Static Pods do not support ephemeral containers.

If custom profiles are unavailable, use an existing preplanned sidecar or ask a cluster administrator to add an API-valid ephemeral container with the required `volumeMounts`. Do not assume a default debug container can see `/work`.

## Do Not Use a Copied Pod for Recovery

`kubectl debug --copy-to` creates a new Pod. Even with `--same-node`, that new Pod receives a new `emptyDir`; it does not attach the original Pod's directory. A replacement Deployment Pod, cloned manifest, or newly scheduled helper Pod has the same limitation.

The volume identity is tied to the original Pod UID, not merely the Pod name, node, volume name, or mount path.

## If No Container Can Start

If the API server cannot reach the kubelet or no allowed container can access the volume, recovery becomes a node-level forensic task. Escalate immediately to the node operator while preserving the original Pod and node.

Kubelet and container-runtime storage paths are implementation details, and a node-debug Pod cannot run on an unreachable node. Do not drain the node or delete the Pod; those actions can unmount or remove the remaining data. Avoid restarting the kubelet or directly inspecting or copying paths such as `/var/lib/kubelet` unless the cluster distribution's supported forensic procedure calls for it.

Node-level access still does not guarantee recovery. If the node or backing device has failed, an `emptyDir` has no attachable persistent-volume replica for Kubernetes to move elsewhere.

## Validate the Rescued Data

Before allowing cleanup, inspect and hash the local artifact. If you streamed an archive, run:

```bash
tar -tf "rescue-$pod.tar" | head -n 100
sha256sum "rescue-$pod.tar"
```

If you used `kubectl cp`, first package the copied directory, then run the same archive checks:

```bash
tar -C "rescue-$pod" -cf "rescue-$pod.tar" .
tar -tf "rescue-$pod.tar" | head -n 100
sha256sum "rescue-$pod.tar"
```

Extract it into a new directory, check expected files, and store the archive and checksum in an approved durable location. Do not leave the only rescued copy on the same node or administrator laptop.

After the incident owner confirms the artifact, allow the controller to replace or delete the Pod. Expect the original `emptyDir` to disappear with it.

## Design Future Recovery Before Failure

If data matters after Pod deletion, `emptyDir` is the wrong sole storage location. Choose one or more of these patterns:

- write authoritative results to object storage, a database, or a persistent volume;
- continuously upload checkpoints from a sidecar instead of waiting for termination;
- expose a controlled diagnostic export endpoint;
- use a generic ephemeral volume when CSI snapshots or clones during the Pod lifetime are useful, while remembering that its generated claim is still deleted with the Pod;
- use an ordinary PVC when data must outlive the Pod.

A `preStop` hook is only best-effort within the Pod's termination grace period. It does not run successfully in every node failure or force-deletion scenario, so it cannot be the only backup mechanism.

## Rollback and Recovery Cautions

Adding an ephemeral container is an irreversible change to that Pod object; it remains listed until the Pod is deleted. The read-only mount reduces the risk of accidental modification, but the debug image and command still run with the Pod's applicable security context and network access.

If the archive is inconsistent, repeat the copy only while the same recovery window remains. Never delete the original first to test whether the rescue worked.

## Limitations and Version Scope

The command examples target Linux containers and tar-compatible files. Windows containers require platform-appropriate copy tools. File ownership, sparse files, hard links, extended attributes, concurrent writes, and very large datasets can require a specialized archival method. None of those methods changes the core lifetime rule: recovery is possible only while the original Pod, node, and volume still exist.

## Official Documentation

- [`emptyDir` lifecycle and deletion semantics](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Configure a Pod to use an `emptyDir`](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/)
- [Debug a running or crashing Pod with an ephemeral container](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Ephemeral container behavior and limitations](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [`kubectl debug` command reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [`kubectl cp` requirements and examples](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/)
- [Pod lifecycle and replacement](https://kubernetes.io/docs/concepts/workloads/pods/)

## Conclusion

Rescue an `emptyDir` through a container in the original Pod: use an existing mount when possible, or explicitly mount the volume read-only in an ephemeral debug container. Copy and verify the data before any deletion. Once Kubernetes removes the Pod from its node and deletes the volume, there is no Kubernetes-level recovery path.
