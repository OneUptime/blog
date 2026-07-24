# Persistent Storage in Devfiles: Volumes, PVCs, and Data Between Dev Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Kubernetes, Persistent Volumes, odo, Developer Environments

Description: Choose persistent or ephemeral Devfile volumes, mount them safely across containers, and distinguish workspace storage from source synchronization.

---

Devfile storage has two related objects:

- a `volume` component declares storage and its persistence intent;
- a container's `volumeMounts` list attaches that named volume at a container path.

On Kubernetes, a consumer commonly realizes a persistent Devfile volume with a PersistentVolumeClaim (PVC) and an ephemeral one with pod-lifetime storage. The Devfile remains an abstraction: storage class selection, quota, access modes, and implementation details depend on the consumer and cluster.

## Declare and Mount a Persistent Cache

A useful starting point is a dependency cache:

```yaml
schemaVersion: 2.3.0
metadata:
  name: orders-api
components:
  - name: tools
    container:
      image: maven:3.9-eclipse-temurin-21
      mountSources: true
      volumeMounts:
        - name: maven-cache
          path: /home/developer/.m2
  - name: maven-cache
    volume:
      size: 2Gi
```

The mount's `name` must exactly match the volume component's `name`. The `path` is inside the container. A volume component that is never mounted provides no cache to the container, while a mount with no matching component is invalid.

`size` uses a Kubernetes-style quantity. It is a request to the consumer; the Devfile documentation explicitly notes that size handling depends on the tool and can be constrained by that tool or platform.

Persistent is the default intent when `ephemeral` is omitted or false:

```yaml
  - name: maven-cache
    volume:
      size: 2Gi
      ephemeral: false
```

Whether data survives every possible event still depends on lifecycle and platform policy. A PVC can be deleted when the development component is deleted, retained by another tool, or reclaimed according to cluster configuration. “Persistent” means the volume is not deliberately pod-ephemeral; it is not a backup guarantee.

## Use Ephemeral Storage for Rebuildable Data

Set `ephemeral: true` for scratch content:

```yaml
components:
  - name: test-output
    volume:
      ephemeral: true
      size: 1Gi
  - name: tools
    container:
      image: node:22
      mountSources: true
      volumeMounts:
        - name: test-output
          path: /tmp/test-output
```

Ephemeral data should be safe to lose when the pod or workspace is recreated. Suitable examples include:

- compiler scratch files;
- unpacked temporary archives;
- test outputs that are uploaded elsewhere;
- caches whose recreation cost is small.

Do not place uncommitted source, credentials, or the only copy of a database in an ephemeral volume.

The requested `size` does not automatically enforce an application-level limit in every consumer. Monitor node or namespace storage pressure and test the selected implementation.

## Share One Volume Across Containers

A Devfile volume can be mounted by multiple container components:

```yaml
components:
  - name: builder
    container:
      image: golang:1.24
      mountSources: true
      volumeMounts:
        - name: artifacts
          path: /workspace/artifacts
  - name: scanner
    container:
      image: registry.example.com/security/scanner:4
      mountSources: false
      volumeMounts:
        - name: artifacts
          path: /scan/input
  - name: artifacts
    volume:
      ephemeral: true
      size: 1Gi
```

The two mount paths can differ. Files written by `builder` below `/workspace/artifacts` are visible to `scanner` below `/scan/input` when the consumer mounts the same backing volume.

Sharing storage does not provide file locking or workflow ordering. Use a composite command or another explicit signal so the scanner does not read a half-written artifact:

```yaml
commands:
  - id: build-artifact
    exec:
      component: builder
      commandLine: go build -o /workspace/artifacts/app ./cmd/app
      workingDir: ${PROJECT_SOURCE}
  - id: scan-artifact
    exec:
      component: scanner
      commandLine: scanner /scan/input/app
      workingDir: /scan/input
  - id: build-and-scan
    composite:
      commands:
        - build-artifact
        - scan-artifact
      parallel: false
      group:
        kind: build
        isDefault: true
```

## Keep Mount Paths Compatible with the Image User

The container process must be able to read or write the mount path. A volume mounted at `/root/.cache` is not useful to a non-root image running as UID 1001, and changing permissions in a command may be forbidden by the cluster.

Before choosing a path:

1. inspect the image's runtime user and home directory;
2. prefer a path already writable by that user;
3. avoid masking important files shipped in the image;
4. avoid mounting over `${PROJECT_SOURCE}`;
5. test on a cluster with the same security policy.

Mounting a blank volume over a non-empty directory hides the image's original directory contents for the lifetime of that mount. Use a dedicated cache directory rather than `/usr`, `/etc`, or the runtime installation directory.

Devfile 2.3's `container-overrides` can configure allowed security-context fields, but it cannot be used to override volume mounts. Define `volumeMounts` through the normal container component schema.

## Source Storage Is Separate

`mountSources: true` asks a consumer to synchronize or mount the project source. It is not a reference to a user-declared volume component:

```yaml
components:
  - name: tools
    container:
      image: node:22
      mountSources: true
      sourceMapping: /workspace/source
      volumeMounts:
        - name: npm-cache
          path: /workspace/cache/npm
  - name: npm-cache
    volume:
      size: 2Gi
```

For current `odo` on Kubernetes, source synchronization uses an `odo-projects` volume. Its backing is affected by odo's `Ephemeral` preference: the documented default uses a PVC, while ephemeral mode uses `emptyDir`. That source volume is distinct from the explicit `npm-cache` Devfile component.

Do not infer a Devfile volume's lifecycle from the odo source preference, or vice versa. Document both settings if they matter to recovery time.

## A Devfile Volume Is Not an Existing PVC Reference

The standard Devfile `volume` component expresses `size` and `ephemeral`; it does not provide the full Kubernetes `PersistentVolumeClaim` spec or a portable `claimName` binding.

If an outer-loop workload must mount an existing PVC, define it in a native Kubernetes manifest:

```yaml
components:
  - name: production-storage
    kubernetes:
      uri: deploy/storage-and-workload.yaml
```

The manifest can then use Kubernetes-native fields:

```yaml
volumes:
  - name: data
    persistentVolumeClaim:
      claimName: orders-data
```

This belongs to the workload defined in that manifest, not automatically to the Devfile's inner-loop container. Keep development caches and production state separate unless the platform has a carefully designed integration.

## Plan Capacity and Cleanup

Dependency caches grow without bound unless package managers prune them. Choose a size based on measurements and provide a recovery path:

```bash
du -sh /home/developer/.m2
find /home/developer/.m2 -type f -mtime +30 -delete
```

Do not place an unsafe deletion command in a lifecycle event without tightly validating its path. Prefer package-manager-supported cleanup and let the cluster enforce namespace quota.

For persistent workspace data, answer these questions:

- Who owns the PVC?
- What deletes it?
- Can the workspace move to another node?
- Is the storage mode compatible with concurrent mounts?
- What happens when the size request changes?
- Is any data backed up independently?

Devfile does not replace Kubernetes storage architecture. It gives a portable development-level declaration that a consumer maps onto that architecture.

## Troubleshooting Mounts

When a workspace stays pending:

```bash
kubectl get pod,pvc
kubectl describe pod <pod-name>
kubectl describe pvc <claim-name>
kubectl get events --sort-by=.metadata.creationTimestamp
```

Look for an unavailable StorageClass, quota rejection, unbound claim, access-mode conflict, or permission failure.

When a command sees an empty directory, verify:

- the mount name matches the component name;
- the producer and consumer use the intended paths;
- the volume is persistent or ephemeral as intended;
- a mount has not hidden image content;
- the command runs after data is written.

## Official Documentation

- [Devfile: Adding a volume component](https://devfile.io/docs/2.2.0/adding-a-volume-component)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [odo architecture: Project source storage](https://odo.dev/docs/development/architecture/how-odo-works/)
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
