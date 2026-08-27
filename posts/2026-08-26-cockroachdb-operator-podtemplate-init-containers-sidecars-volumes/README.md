# How to Add Init Containers, Sidecars, and Volumes with the CockroachDB Operator `podTemplate`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, podTemplate, Init Containers, Sidecars, Volumes

Description: Add init containers, sidecars, and shared volumes to CockroachDB pods through the GA operator's v1beta1 podTemplate without replacing operator-managed defaults.

---

The GA CockroachDB Operator exposes a Kubernetes `PodSpec` at `spec.template.spec.podTemplate.spec`. Its Helm chart exposes the same object at `cockroachdb.crdbCluster.podTemplate.spec`. The operator merges this template into the pod it normally builds, so you can add containers and volumes while retaining its CockroachDB startup, locality, storage, health, and TLS configuration.

This guide is for `apiVersion: crdb.cockroachlabs.com/v1beta1`. Do not copy examples for the older public `v1alpha1` operator. In particular, the GA API retains fields such as `sideCars.initContainers`, `sideCars.containers`, and `sideCars.volumes` only for compatibility and marks them deprecated. New configurations belong under `podTemplate`.

## Understand the two configuration shapes

With Helm, edit a values file:

```yaml
cockroachdb:
  crdbCluster:
    podTemplate:
      metadata: {}
      spec: {}
```

These snippets are partial overrides and assume your base values already configure the cluster. For the single-namespace commands in this guide, set the active region's `cockroachdb.crdbCluster.regions[].namespace` to `crdb-prod`; Helm's `--namespace` sets the release and `CrdbCluster` namespace but does not rewrite region namespaces.

The CockroachDB chart renders that value here in the custom resource:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
spec:
  template:
    spec:
      podTemplate:
        metadata: {}
        spec: {}
```

Do not apply a Helm values file with `kubectl`. Conversely, do not place the full `CrdbCluster` path inside a values file. Render the chart when you are unsure which form you have:

```bash
helm template orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml \
  --show-only templates/crdb.yaml
```

## Add one init container, one sidecar, and one volume

The following Helm values demonstrate the merge mechanics. The init container writes a marker into an `emptyDir`; the sidecar reads the same volume and then stays alive. Replace the BusyBox image and illustrative command with your reviewed production workload.

```yaml
cockroachdb:
  crdbCluster:
    podTemplate:
      metadata:
        annotations:
          example.com/pod-template-owner: database-platform
      spec:
        initContainers:
          - name: prepare-observer-state
            image: docker.io/library/busybox:1.36.1
            command:
              - /bin/sh
              - -ec
              - printf '%s\n' 'initialized' > /shared/state
            securityContext:
              allowPrivilegeEscalation: false
              runAsNonRoot: true
              runAsUser: 65532
              capabilities:
                drop: ["ALL"]
            volumeMounts:
              - name: observer-state
                mountPath: /shared
        containers:
          - name: observer
            image: docker.io/library/busybox:1.36.1
            command:
              - /bin/sh
              - -ec
              - cat /shared/state; exec sleep 2147483647
            securityContext:
              allowPrivilegeEscalation: false
              runAsNonRoot: true
              runAsUser: 65532
              readOnlyRootFilesystem: true
              capabilities:
                drop: ["ALL"]
            resources:
              requests:
                cpu: 10m
                memory: 16Mi
              limits:
                memory: 32Mi
            volumeMounts:
              - name: observer-state
                mountPath: /shared
                readOnly: true
        volumes:
          - name: observer-state
            emptyDir:
              sizeLimit: 16Mi
```

Kubernetes runs regular init containers to completion before starting application containers. All ordinary containers in the pod, including the sidecar, then share the pod's network namespace and can exchange data through volumes mounted into each relevant container. An `emptyDir` survives individual container restarts but is deleted with the pod, so it is suitable for generated configuration or scratch state, not durable database data.

The operator's API documents that list fields are generally merged by name. Give every added container and volume a stable, unique name. A name collision means “modify the operator's object,” not “add another object.” That can be useful when intentionally augmenting the `cockroachdb` container, but it can also overwrite a command, image, probe, or mount that the operator needs.

## Mount ConfigMaps and Secrets instead of baking configuration into images

`podTemplate.spec.volumes` accepts normal Kubernetes `Volume` sources. For example, mount a sidecar configuration from a ConfigMap:

```yaml
cockroachdb:
  crdbCluster:
    podTemplate:
      spec:
        containers:
          - name: log-agent
            image: registry.example.com/platform/log-agent@sha256:REPLACE_WITH_DIGEST
            args: ["--config=/etc/log-agent/config.yaml"]
            volumeMounts:
              - name: log-agent-config
                mountPath: /etc/log-agent
                readOnly: true
        volumes:
          - name: log-agent-config
            configMap:
              name: orders-db-log-agent
              items:
                - key: config.yaml
                  path: config.yaml
```

ConfigMaps, Secrets, and persistent volume claims referenced by a pod are normally namespaced. Create them in the CockroachDB pod's namespace, not merely in the operator Deployment's namespace. Prefer read-only mounts and narrowly scoped Secrets. A sidecar runs in the same pod security boundary as the database, so a broadly privileged sidecar can read shared files, reach CockroachDB over localhost, and affect pod availability.

## Modify the CockroachDB container only by its real name

To add an environment variable or resource settings to the main container, merge an entry named `cockroachdb`:

```yaml
cockroachdb:
  crdbCluster:
    podTemplate:
      spec:
        containers:
          - name: cockroachdb
            env:
              - name: COCKROACH_CHANNEL
                value: platform-production
            resources:
              requests:
                cpu: "4"
                memory: 16Gi
              limits:
                memory: 16Gi
```

Do not repeat the CockroachDB image, command, ports, or probes unless you deliberately want to override them and have tested the exact operator release. Use the first-class `cockroachdb.crdbCluster.image.name` value to select the database image. Use `startFlags` for supported `cockroach start` flag changes.

Also avoid defining both a deprecated field and its `podTemplate` replacement. For example, do not set both `sideCars.containers` and `podTemplate.spec.containers`; the public API reference explicitly directs new configurations to the latter.

## Preview and roll out safely

First render the complete custom resource and inspect the merged input:

```bash
helm template orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml \
  --show-only templates/crdb.yaml
```

Then upgrade with the same pinned chart version:

```bash
helm upgrade --install orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml
```

A pod-template change changes the desired `CrdbNode` revision and can cause a rolling replacement. Check operator status and the actual pod before assuming the merge behaved as intended:

```bash
kubectl -n crdb-prod get crdbcluster,crdbnode,pod
kubectl -n crdb-prod get pod <cockroachdb-pod> \
  -o jsonpath='{.spec.initContainers[*].name}{"\n"}{.spec.containers[*].name}{"\n"}{.spec.volumes[*].name}{"\n"}'
kubectl -n crdb-prod describe pod <cockroachdb-pod>
```

Test init-container completion, sidecar readiness, resource consumption, shutdown behavior, and failure recovery in a non-production cluster. A sidecar that never becomes ready can make the whole pod unready; a regular init container that never exits prevents CockroachDB from starting; and a missing non-optional ConfigMap or Secret prevents the pod from starting because volume setup fails.

## Official Documentation

- [CockroachDB: Override deployment templates with the operator](https://www.cockroachlabs.com/docs/stable/override-templates-cockroachdb-operator)
- [CockroachDB GA v1beta1 API reference](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [CockroachDB `CrdbNodeSpec` and `PodTemplateSpec` source](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB chart pod-template example](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes volumes](https://kubernetes.io/docs/concepts/storage/volumes/)

## Conclusion

Use `cockroachdb.crdbCluster.podTemplate.spec` in Helm, or `spec.template.spec.podTemplate.spec` in a direct `v1beta1` resource. Add uniquely named containers and volumes, treat collisions as overrides, keep auxiliary containers least-privileged, and inspect the rendered and live pod before production rollout. The older `sideCars` fields are compatibility surface, not the right starting point for a new GA-operator deployment.
