# Validation Summary: PodGC, TTLStrategy, and Workflow Archive: What Gets Deleted—and When?

## Status
validated

## Post Type
Operations Guide / Technical Reference

## Technologies Covered
- Argo Workflows
- Kubernetes custom resources, Pods, owner references, finalizers, events, and PVCs
- Argo PodGC and TTLStrategy
- Argo Workflow Archive and archive garbage collection
- Argo archive logs and Artifact GC
- PostgreSQL-backed controller persistence
- `argo` and `kubectl` CLIs

## Sources Consulted
- [Argo Workflows field reference](https://argo-workflows.readthedocs.io/en/latest/fields/) - PodGC strategies and fields, TTLStrategy fields, ArtifactGC, and VolumeClaimGC.
- [Argo Workflows PodGC strategy example](https://github.com/argoproj/argo-workflows/blob/main/examples/pod-gc-strategy.yaml) - supported PodGC strategies and `deleteDelayDuration`.
- [Argo Workflows TTL GC example](https://github.com/argoproj/argo-workflows/blob/main/examples/gc-ttl.yaml) - TTL field precedence and terminal-outcome behavior.
- [Argo Workflows TTL controller source](https://github.com/argoproj/argo-workflows/blob/v4.0.8/workflow/gccontroller/gc_controller.go#L262-L273) - exact selection of success, failure, and completion TTLs, including the handling of the `Error` phase.
- [Argo Workflows Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/) - persistence configuration, stored history, log exclusion, `archiveTTL`, database requirements, and archive GC timing.
- [Argo Workflows controller ConfigMap reference](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/) and [default Workflow spec](https://argo-workflows.readthedocs.io/en/latest/default-workflow-specs/) - valid ConfigMap structures, persistence fields, and `workflowDefaults` override behavior.
- [Argo Workflows archive logs](https://argo-workflows.readthedocs.io/en/latest/configure-archive-logs/) - artifact-repository requirements and the distinction from the Workflow Archive.
- [Argo Workflows Artifact Garbage Collection](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/#artifact-garbage-collection) - `OnWorkflowCompletion`, `OnWorkflowDeletion`, and per-artifact overrides.
- [Argo Workflows CLI: `archive list`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_list/) and [`archive get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_get/) - command syntax and namespace support.
- [Argo Workflows scaling guide](https://argo-workflows.readthedocs.io/en/latest/scaling/) - `--workflow-ttl-workers` and `--pod-cleanup-workers`.
- [Kubernetes owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/) - dependent garbage collection after owner deletion.
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/), [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) - validation of the diagnostic commands.

## Issues Found
1. **Errored Workflows were not bounded by the example TTL policies.** `secondsAfterFailure` is selected only for a Workflow whose phase is `Failed`; a Workflow in the `Error` phase falls back to `secondsAfterCompletion`. The examples specified only `secondsAfterSuccess` and `secondsAfterFailure`, even though the surrounding text described a bounded retention policy. Added `secondsAfterCompletion: 604800` to both TTL examples, documented TTL precedence and the `Error` distinction, and updated the retention wording to include errored Workflows.

## Review Notes
- All four YAML snippets parse successfully and use the current `argoproj.io/v1alpha1` Workflow API and supported field names.
- The `argo archive get <workflow-name>` example is current for Argo Workflows 4.x. Older releases expected a Workflow UID, so readers on pre-4.0 versions should consult their versioned CLI documentation.
- The post correctly treats Argo archive logs as separate from the database-backed Workflow Archive and recommends a dedicated logging backend, consistent with the official warning that archive logs are a convenience feature rather than a purpose-built logging system.
- All documentation links in the post resolved successfully during validation.
