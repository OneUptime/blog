# Share Build Artifacts Between Init and App Containers with emptyDir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Container, emptyDir, Volumes, Build Artifacts, Pod

Description: Use one Pod-scoped emptyDir for ordered build, verification, atomic publication, read-only consumption, and bounded scratch usage.

---

Init containers and application containers in one Pod can mount the same `emptyDir`. Init containers run to completion before application containers start, so the volume is a simple way to fetch, generate, verify, or unpack artifacts before the application consumes them.

The artifacts survive an application-container restart because the volume belongs to the Pod. They disappear when Kubernetes removes the Pod, and the init sequence runs again in a replacement Pod.

## Build and Verify in Ordered Init Containers

This Pod uses one init container to create an artifact, a second to verify it, and an application container to mount the result read-only:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: artifact-consumer
spec:
  restartPolicy: Always
  initContainers:
    - name: build
      image: docker.io/library/busybox:1.36.1
      command: ["sh", "-c"]
      args:
        - |
          set -eu
          rm -rf /workspace/release.tmp /workspace/release
          mkdir -p /workspace/release.tmp
          printf '%s\n' 'version=2026.08.27' > /workspace/release.tmp/build.txt
          cd /workspace/release.tmp
          sha256sum build.txt > SHA256SUMS
          cd /workspace
          mv /workspace/release.tmp /workspace/release
      resources:
        requests:
          ephemeral-storage: 320Mi
        limits:
          ephemeral-storage: 512Mi
      volumeMounts:
        - name: artifacts
          mountPath: /workspace
    - name: verify
      image: docker.io/library/busybox:1.36.1
      command: ["sh", "-c"]
      args:
        - |
          set -eu
          cd /workspace/release
          sha256sum -c SHA256SUMS
      resources:
        requests:
          ephemeral-storage: 320Mi
        limits:
          ephemeral-storage: 512Mi
      volumeMounts:
        - name: artifacts
          mountPath: /workspace
  containers:
    - name: app
      image: docker.io/library/busybox:1.36.1
      command: ["sh", "-c"]
      args:
        - |
          set -eu
          cat /opt/application/build.txt
          sleep 3600
      resources:
        requests:
          ephemeral-storage: 320Mi
        limits:
          ephemeral-storage: 512Mi
      volumeMounts:
        - name: artifacts
          mountPath: /opt/application
          subPath: release
          readOnly: true
  volumes:
    - name: artifacts
      emptyDir:
        sizeLimit: 256Mi
```

Init containers run sequentially. The application container is not started until both complete successfully. If `build` or `verify` fails, kubelet follows init-container restart behavior and the application remains waiting.

## Publish a Complete Directory

Write into a temporary directory and rename it only after the build is complete. Because both paths are in the same `emptyDir` filesystem, the rename avoids exposing a half-populated release directory. It also gives a verifier one stable location to check.

The example removes both staging and prior release directories so a retried build init container is idempotent. A production build can instead validate a completed release by checksum and reuse it deliberately.

Mounting the application's `subPath` read-only protects the artifact from accidental application writes. The init sequence ensures that the `release` directory and its files are populated before the app container starts. If the application needs to update runtime state, mount a different volume or a different path for that state.

## Plan Permissions Between Images

Different images may use different UIDs and GIDs. Align `runAsUser` and `runAsGroup`, or use an appropriate Pod `fsGroup` when the volume plugin and security policy support it. Test the exact images under the cluster's Pod Security settings.

Avoid a blanket `chmod -R 777`. Give the builder write access and the consumer only the access it needs. A read-only application mount also narrows the accidental mutation path.

## Account for the Artifact as Local Ephemeral Storage

A default disk-backed `emptyDir` is part of the Pod's local ephemeral-storage use. Build output competes with container writable layers and logs. `sizeLimit` is a volume-level eviction threshold checked by kubelet, while container `ephemeral-storage` requests influence scheduling and limits define the Pod's aggregate local storage eviction threshold. These limit-based checks depend on kubelet being able to measure the relevant local filesystems.

Regular init containers use different aggregate resource math from concurrently running application containers. For each resource, Kubernetes compares the largest init-container request or limit with the sum across application containers and uses the larger value as the Pod's effective request or limit. The example gives every container an explicit local storage limit: its effective local storage request is 320 MiB and its effective limit is 512 MiB, leaving room beyond the 256 MiB artifact volume for logs and writable layers.

Set requests from typical artifact size plus expected logs and writable-layer growth. Set limits above controlled peaks, not below normal builds. When measured usage exceeds either threshold, kubelet marks the Pod for eviction rather than returning a clean build error at exactly the configured byte.

`medium: Memory` is possible for small latency-sensitive artifacts, but those files then count against the writing init container's memory usage and remain in memory for the Pod. Use memory requests and limits sized for the artifact plus the builder's process memory.

## Know When to Use Another Mechanism

Use a container image when the artifact is part of the immutable application release and can be built before deployment. Use a ConfigMap or Secret for small configuration data of the corresponding type. Use a PVC when generated data must survive Pod replacement or be shared across Pods.

`emptyDir` is appropriate when generation is Pod-local, repeatable, and required before application startup. It does not provide a cluster-wide build cache or durable artifact repository.

## Validate the Handoff

Inspect init and application status separately:

```bash
kubectl get pod artifact-consumer -o json \
  | jq '{init: .status.initContainerStatuses, app: .status.containerStatuses}'
kubectl logs artifact-consumer -c build
kubectl logs artifact-consumer -c verify
kubectl exec artifact-consumer -c app -- cat /opt/application/build.txt
```

If the Pod is replaced, compare `.metadata.uid` and expect the new init sequence to regenerate an empty volume.

## Official Documentation

- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes emptyDir volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes configure a Pod to use a volume](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes volume subPath](https://kubernetes.io/docs/concepts/storage/volumes/#using-subpath)

## Conclusion

Mount one `emptyDir` in the init and application containers, build into a temporary directory, verify before startup, and expose the completed directory read-only. Budget its disk or memory consumption, make retries idempotent, and remember that a replacement Pod starts with an empty volume.
