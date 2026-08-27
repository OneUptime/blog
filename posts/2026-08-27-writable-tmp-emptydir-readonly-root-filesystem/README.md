# How to Make /tmp Writable with emptyDir When readOnlyRootFilesystem Is Enabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security Context, ReadOnlyRootFilesystem, emptyDir, Container, Pod Security

Description: Keep a container image filesystem read-only while mounting a bounded writable emptyDir only at /tmp and other required runtime paths.

---

`securityContext.readOnlyRootFilesystem: true` mounts a container's root filesystem read-only. Applications that create temporary files then fail at `/tmp` unless that path is a separate writable mount.

Mount an `emptyDir` at `/tmp`. A writable volume mount does not make the image root filesystem writable; it adds one explicit writable location with Pod-scoped lifecycle.

## Mount a Bounded Writable /tmp

This Deployment keeps the image filesystem read-only and mounts a temporary directory on the node's default storage medium at `/tmp`, with a 128 MiB size limit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: document-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: document-api
  template:
    metadata:
      labels:
        app: document-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: registry.example.com/document-api:3.8.0
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              ephemeral-storage: 64Mi
            limits:
              ephemeral-storage: 256Mi
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 128Mi
```

The application can write under `/tmp`; an attempt to write to an unmounted image path such as `/usr/local/bin` still fails. `fsGroup` gives the non-root workload a group-based path to volume access where supported. Test permissions with the exact runtime and image rather than assuming every image uses the same UID.

## Mount Every Required Runtime Path Deliberately

Many images write outside `/tmp`. Common paths include `/var/cache/<app>`, `/var/run/<app>`, a framework-specific home directory, or a working directory. Keep each writable area explicit:

```yaml
volumeMounts:
  - name: tmp
    mountPath: /tmp
  - name: cache
    mountPath: /var/cache/document-api
  - name: runtime
    mountPath: /var/run/document-api
volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 128Mi
  - name: cache
    emptyDir:
      sizeLimit: 256Mi
  - name: runtime
    emptyDir:
      sizeLimit: 16Mi
```

Separate volumes give each path its own cap and make ownership clearer. A single volume with `subPath` mounts can also work, but all of the mounts share one capacity budget.

Mounting a volume hides files that the image already contains at that mount path. If the application needs seed files from the image, use an init container to copy them into the volume before the application starts, or change the image so immutable defaults live outside the runtime-write path.

## Decide Whether /tmp Should Use Node Storage or Memory

The default `emptyDir` medium uses node local storage. Its usage contributes to the Pod's local `ephemeral-storage` total along with logs and container writable layers. Set requests and limits as well as `emptyDir.sizeLimit`; the size limit alone does not reserve scheduler capacity.

This alternative creates a tmpfs:

```yaml
emptyDir:
  medium: Memory
  sizeLimit: 128Mi
```

Memory-backed files count against the memory use of the container that writes them, not against local `ephemeral-storage`. Include the expected temporary-file footprint in memory requests and limits. Do not switch to memory merely to avoid local `ephemeral-storage` accounting.

An `emptyDir` is cleared when the Pod is removed, but survives an application-container restart within that same Pod. Applications should tolerate stale temporary files after a crash and clean up incomplete work safely at startup.

## Validate the Security Boundary

Check the live security context and mounts:

```bash
kubectl get pod -l app=document-api -o yaml

POD=$(kubectl get pod -l app=document-api \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec "$POD" -- sh -c '
  touch /tmp/write-test || exit 1
  rm /tmp/write-test || exit 1

  root_mount_options=
  while read -r mount_id parent_id device root mount_point mount_options rest; do
    if [ "$mount_point" = / ]; then
      root_mount_options=$mount_options
      break
    fi
  done < /proc/self/mountinfo

  case ",$root_mount_options," in
    *,ro,*) ;;
    *)
      echo "unexpected writable root filesystem" >&2
      exit 1
      ;;
  esac
'
```

Also exercise normal startup, shutdown, cache creation, uploads, and health checks. A successful `touch /tmp/test` does not prove that every application write path has been identified.

Read-only root filesystems reduce accidental or malicious modification of image content, but a writable volume remains writable. Apply least privilege, input validation, capacity limits, and appropriate Pod Security controls to that path.

## Official Documentation

- [Kubernetes security contexts and readOnlyRootFilesystem](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes SecurityContext API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#SecurityContext)
- [Kubernetes emptyDir volumes](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

## Conclusion

Keep `readOnlyRootFilesystem` enabled and add `emptyDir` only at paths the application must write. Bound `/tmp`, budget the correct local `ephemeral-storage` or memory resource, align non-root permissions, and test that intended paths are writable while the rest of the image remains read-only.
