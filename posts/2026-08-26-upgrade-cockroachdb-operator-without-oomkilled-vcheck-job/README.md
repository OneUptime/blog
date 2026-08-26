# How to Upgrade CockroachDB with the Operator Without an OOMKilled `vcheck` Job

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Upgrade, OOMKilled, Kubernetes Job, Troubleshooting

Description: Diagnose an OOMKilled version-check Job in the deprecated CockroachDB public operator and choose a supported-version or custom-image recovery without bypassing upgrade safety.

---

The deprecated CockroachDB public operator validates a custom `spec.image.name` by creating a short-lived Kubernetes Job whose name contains `vcheck`. That Job runs the candidate image, prints its CockroachDB build tag, and gives the controller evidence for the rolling upgrade. If the container is OOMKilled, the `CrdbVersionChecked` condition never becomes true and the operator will not advance the StatefulSet update.

Do not work around the block by editing the StatefulSet image. First prove why the Job died, then fix either the image-selection path or the capacity problem that caused it.

This guide is for the public `cockroach-operator` and `crdb.cockroachlabs.com/v1alpha1`. The current `v1beta1` CockroachDB Operator has a different API and upgrade controller. Confirm the generation before looking for `vcheck`.

## Understand What `vcheck` Actually Does

In the current public-operator source, the version-check Job:

- uses the exact CockroachDB image from the custom resource;
- runs `/bin/bash -c` and calls `/cockroach/cockroach.sh version`;
- extracts the `Build Tag` from the output;
- sleeps briefly so the controller can fetch the log;
- requests 300 millicores and 256 MiB of memory;
- limits the container to 300 millicores and 512 MiB of memory;
- never mounts the CockroachDB data PVC; and
- has a retry backoff limit of two.

Those values are implementation details, not an API contract. Inspect the live Job and the source for the installed operator tag. An OOM in this Job does not mean the database workload itself exhausted memory; the database pods have separate resources and do not run inside `vcheck`.

The public operator has two image-selection paths:

1. `spec.cockroachDBVersion` selects a version from the operator Deployment's `RELATED_IMAGE_COCKROACH_*` environment variables. The controller validates the mapping directly and does not need to launch `vcheck`.
2. `spec.image.name` permits an explicit image or digest. Because the operator cannot trust its tag, it creates `vcheck` and reads the version from inside that image.

The admission webhook rejects a resource that supplies both fields.

## Prove That the Container Was OOMKilled

Find the Job and its newest pod without assuming the time-based suffix:

```bash
export NAMESPACE=cockroach-operator-system
export CLUSTER=cockroachdb

kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp
kubectl get pods -n "$NAMESPACE" \
  -l job-name \
  --sort-by=.metadata.creationTimestamp
```

The selector form supported by a particular `kubectl` version may require a concrete value, so copy the exact Job name containing `-vcheck-` and resolve its pods:

```bash
export VCHECK_JOB=cockroachdb-vcheck-REPLACE_WITH_SUFFIX

kubectl get pods -n "$NAMESPACE" \
  -l "job-name=${VCHECK_JOB}" \
  -o wide
```

Inspect every retry, not just the newest pod:

```bash
kubectl get pods -n "$NAMESPACE" \
  -l "job-name=${VCHECK_JOB}" \
  -o jsonpath='{range .items[*]}{.metadata.name}{" current="}{.status.containerStatuses[0].state.terminated.reason}{" previous="}{.status.containerStatuses[0].lastState.terminated.reason}{" exit="}{.status.containerStatuses[0].state.terminated.exitCode}{"\n"}{end}'

kubectl describe job "$VCHECK_JOB" -n "$NAMESPACE"
kubectl describe pod VCHECK_POD_NAME -n "$NAMESPACE"
kubectl logs VCHECK_POD_NAME -n "$NAMESPACE" --all-containers=true
```

The vcheck pod template uses `restartPolicy: Never`, so every Job retry creates a different pod. Fetch the ordinary logs from each failed pod by name; `kubectl logs --previous` is for a restarted container in the same pod and cannot retrieve a different retry. Preserve each pod's status before deleting anything.

`reason=OOMKilled` and exit code 137 normally identify a cgroup memory-limit kill. Node events may instead show eviction or broader `MemoryPressure`. Check both the live Job resources and its assigned node:

```bash
kubectl get job "$VCHECK_JOB" -n "$NAMESPACE" \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{" request="}{.resources.requests.memory}{" limit="}{.resources.limits.memory}{" image="}{.image}{"\n"}{end}'

kubectl describe node NODE_NAME
kubectl top node NODE_NAME
```

Metrics Server is required for `kubectl top`; pod termination state and node events remain the authoritative evidence when it is unavailable.

## Check Whether a Custom Image Is Doing More Than Version Reporting

The official Job overrides the image entrypoint with `command: ["/bin/bash"]`, then invokes `/cockroach/cockroach.sh version` through `bash -c`. A custom image can still make that exact path expensive if it replaces `/bin/bash` or `/cockroach/cockroach.sh`, uses costly `BASH_ENV` shell initialization, introduces unusual dynamic-linker overhead, or bundles a CockroachDB binary that is incompatible with the public operator's expected layout. Entrypoint-only initialization does not run in this Job.

Inspect the exact digest from the failed Job:

```bash
kubectl get pod VCHECK_POD_NAME -n "$NAMESPACE" \
  -o jsonpath='{.status.containerStatuses[0].imageID}{"\n"}'
```

Compare that digest with the approved artifact. Do not test `latest` and assume it matches. In an isolated environment, run the exact command under an equivalent memory limit and record peak use. If an otherwise idle official image cannot print its version below the live limit, check the public-operator release notes and supported-version matrix before changing resources.

## Preferred Path: Select an Operator-Supported Version

If no custom image is required, use `spec.cockroachDBVersion`. First list the versions and immutable images actually embedded in the installed operator Deployment:

```bash
kubectl get deployment cockroach-operator-manager -n "$NAMESPACE" -o json |
  jq -r '
    .spec.template.spec.containers[].env[]?
    | select(.name | startswith("RELATED_IMAGE_COCKROACH_"))
    | [.name, .value]
    | @tsv
  '
```

Use the real Deployment name. Verify that the desired target is supported by both CockroachDB's upgrade rules and this operator release. The environment name uses underscores, but the custom-resource value uses the normal version string such as `vX.Y.Z`.

Because the webhook permits exactly one image field, replace the explicit image and add the version in one reviewed patch. Export the exact supported version first:

```bash
export TARGET_CRDB_VERSION=vX.Y.Z

kubectl patch crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  --type=json \
  -p="[
    {\"op\":\"remove\",\"path\":\"/spec/image\"},
    {\"op\":\"add\",\"path\":\"/spec/cockroachDBVersion\",\"value\":\"${TARGET_CRDB_VERSION}\"}
  ]"
```

Use `replace` instead of `add` if `cockroachDBVersion` already exists, and do not run the patch until the current JSON shape has been reviewed. The operator can now resolve a vetted `RELATED_IMAGE` without launching the candidate image merely to discover its version.

This avoids `vcheck`; it does not waive normal CockroachDB upgrade sequencing, backups, compatibility review, or finalization controls.

## Custom-Image Path: Fix the Image or the Operator, Not the Job

If organizational policy requires a custom registry image or digest, `spec.image.name` keeps the version-check Job in the path. The public API has no field for `vcheck` resources, and `spec.resources` configures CockroachDB database containers rather than this Job. Patching the generated Job is not durable: Job pod templates are effectively immutable and the public operator owns the resource.

Use one of these controlled fixes:

- mirror an officially supported CockroachDB image without changing `/bin/bash`, `/cockroach/cockroach.sh`, the CockroachDB binary, or their filesystem layout;
- correct the custom shell script, binary, dynamic libraries, or `BASH_ENV` setup so the exact version command stays within the Job's limit;
- keep workload-only initialization outside the shell and script path executed by the version check;
- upgrade to a tested public-operator release whose Job resources or compatibility match the target; or
- build and pin a reviewed operator patch that changes `JobBuilder` resources, then test the full upgrade and rollback flow.

A local operator fork is maintenance debt, especially now that the public operator is deprecated. Prefer migrating to the current CockroachDB Operator over carrying an indefinite patch.

Do not disable the GA `CrdbVersionValidator` feature merely to advance an urgent upgrade. That removes the compatibility gate for every cluster managed by the Deployment and can turn a visible Job failure into an unsafe rollout.

## Fix Node Pressure Separately

If the pod never exceeded its container limit but the node reports memory pressure or eviction, provide schedulable capacity:

- remove unrelated memory overcommit from the node pool;
- verify the namespace quota permits the Job's request and limit;
- ensure the Job's inherited priority class is appropriate;
- check whether public-operator affinity, toleration, and topology-spread feature gates constrain it to exhausted nodes; and
- leave room for Kubernetes system daemons and eviction thresholds.

Raising database pod memory in `CrdbCluster.spec.resources` will not raise the hard-coded `vcheck` limit. Likewise, a large node does not prevent a container-level OOM when its own limit is too small.

## Retry Only After the Cause Changes

Once the image path or capacity problem is fixed, delete the exact failed Job so the controller can create a clean attempt:

```bash
kubectl delete job "$VCHECK_JOB" -n "$NAMESPACE"
```

This removes only the disposable checker, not database pods or PVCs. Watch the replacement Job, operator log, and custom-resource condition:

```bash
kubectl get jobs,pods -n "$NAMESPACE" --watch

kubectl get crdbcluster "$CLUSTER" -n "$NAMESPACE" \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{"\n"}{end}'

kubectl logs -n "$NAMESPACE" \
  deployment/cockroach-operator-manager \
  --since=30m --all-containers=true
```

Proceed only after the operator records the expected build tag and `CrdbVersionChecked` becomes true. Then monitor the one-node-at-a-time StatefulSet rollout and CockroachDB health. A successful `vcheck` proves image identity, not cluster upgrade readiness.

## Official Documentation

- [CockroachDB public operator repository and deprecation notice](https://github.com/cockroachdb/cockroach-operator)
- [Public operator version-check controller](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/actor/validate_version.go)
- [Public operator `vcheck` Job command and resource limits](https://github.com/cockroachdb/cockroach-operator/blob/master/pkg/resource/job.go)
- [Public operator image-field admission validation](https://github.com/cockroachdb/cockroach-operator/blob/master/apis/v1alpha1/webhook.go)
- [Kubernetes container resource management and OOM behavior](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Job failure and retry behavior](https://kubernetes.io/docs/concepts/workloads/controllers/job/#handling-pod-and-container-failures)
- [CockroachDB upgrade overview](https://www.cockroachlabs.com/docs/stable/upgrade-cockroach-version)
- [Migration from the public operator to the current CockroachDB Operator](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)

## Conclusion

An OOMKilled `vcheck` Job is a failed image-identification step, not a reason to bypass the public operator. Confirm the live Job's limit and termination state, distinguish container OOM from node pressure, and inspect what the candidate image runs for a version query. Use `cockroachDBVersion` for an operator-supported image, or fix and validate the custom-image path. Only retry after the underlying cause changes and the version condition can become true.
