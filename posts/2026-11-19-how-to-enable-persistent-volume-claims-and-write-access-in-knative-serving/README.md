# How to Enable Persistent Volume Claims and Write Access in Knative Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Storage

Description: Enable Knative PVC and write extensions at the correct configuration source, mount a claim explicitly, and separate admission failures from storage permissions.

A Knative Service can reject a volume that works in a regular Deployment. Persistent volume support is an extension, and write access has a separate switch. Passing admission is only the first step: the claim must also bind, mount, and allow the application's user to write.

This guide uses an existing claim and an illustrative application image. Verify the storage driver and workload's concurrency requirements before enabling multiple writers.

## Enable both required extensions

The [Knative storage guide](https://knative.dev/docs/serving/services/storage/) identifies two settings: one allows PVC references, and the other permits writable use. For an Operator-managed installation, merge these keys into the existing `KnativeServing` resource:

```yaml
spec:
  config:
    features:
      kubernetes.podspec-persistent-volume-claim: "enabled"
      kubernetes.podspec-persistent-volume-write: "enabled"
```

The [Operator configuration mapping](https://knative.dev/docs/install/operator/configuring-with-operator/) generates `config-features` from `spec.config.features`. For a YAML-managed installation, maintain the corresponding keys in that ConfigMap's `data`. Preserve other keys and use quoted strings. Direct edits to an Operator-owned ConfigMap can be reverted during reconciliation.

Check the live configuration before retrying the Service:

```bash
kubectl -n knative-serving get configmap config-features -o yaml
```

The [feature reference](https://knative.dev/docs/serving/configuration/feature-flags/#kubernetes-persistentvolumeclaim-pvc) documents the extension boundary. Enabling write access is an installation policy decision; it does not override Kubernetes volume mounts, filesystem permissions, or storage-server policy.

## Mount an existing claim

Assume `shared-data` exists in the `applications` namespace. This Service mounts it at `/data`. Replace the illustrative image with an application that serves HTTP on 8080 and uses that directory:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: file-api
  namespace: applications
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/apps/file-api:build-42
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: data
              mountPath: /data
              readOnly: false
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: shared-data
            readOnly: false
```

Make the intended write access explicit at both the claim reference and mount. The claim must be in the same namespace as the pod. Knative references this claim; it does not automatically create a separate claim for every replica.

Use server-side dry run to check admission, then deploy through your normal delivery process:

```bash
kubectl apply --dry-run=server -f service.yaml
kubectl -n applications get pvc shared-data
kubectl -n applications get pods -l serving.knative.dev/service=file-api
```

A dry run cannot prove that the storage system will provision or attach a volume. Inspect the actual PVC and pod events after deployment.

## Diagnose the failing layer

An admission error mentioning a disabled field points back to the extension configuration. A pending PVC points to provisioning, capacity, class, or binding constraints. A pod waiting on attachment needs storage and node investigation. An application-level `permission denied` after a successful mount requires checking its UID, GID, directory permissions, and the storage backend's export policy.

Use the [Kubernetes persistent-volume reference](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) to check access-mode and namespace behavior. `ReadWriteOnce` is a single-node mode; it does not promise one writer or make cross-node scaling work. A shared writable filesystem also does not provide application-level locking or transaction safety.

Test with a disposable object through the application's normal write path, then read it back through the same interface. Exercise a new Revision and a cold start. Measure attachment and mount time as part of startup: a bound claim can still add latency before a new pod becomes ready.

Keep the data lifecycle separate from the Service lifecycle. Before changing claims or reclaim policy, establish backups and a migration procedure. Recreating a Service should never be treated as a substitute for planning what happens to its persisted data.
