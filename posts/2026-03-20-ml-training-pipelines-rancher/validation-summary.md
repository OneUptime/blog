# Validation Summary: How to Configure ML Training Pipelines on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Kubernetes distribution)
- Argo Workflows (v3.5.0)
- Argo Events (EventSource)
- Kubernetes (kubectl, ConfigMap, PVC, Workflow, CronWorkflow)
- Longhorn (storage class for PVCs)
- NVIDIA GPU Operator (node labels and tolerations)
- MLflow (referenced as model registry endpoint)

## Sources Consulted
- [Argo Workflows install manifest (v3.5.0 release)](https://github.com/argoproj/argo-workflows/releases/tag/v3.5.0)
- [Argo Workflows workflow-controller-configmap reference](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows CronWorkflow documentation](https://argo-workflows.readthedocs.io/en/latest/cron-workflows/)
- [Argo Events MinIO/S3 EventSource setup guide](https://argoproj.github.io/argo-events/eventsources/setup/minio/)
- [Argo Events MinIO EventSource example](https://github.com/argoproj/argo-events/blob/master/examples/event-sources/minio.yaml)
- NVIDIA GPU Operator documentation (`nvidia.com/gpu.present` node label and `nvidia.com/gpu` taint convention)

## Issues Found

1. **Argo Events EventSource uses incorrect top-level spec key.** The post used `spec.s3:` for the EventSource, but the current Argo Events API uses `spec.minio:` for the MinIO/S3-compatible bucket-notification EventSource. Updated `s3:` → `minio:`.

2. **Argo Events EventSource uses incorrect credentials field.** The post had a single `credentials:` field with a generic `name`/`key` selector. The actual schema requires two separate fields, `accessKey:` and `secretKey:`, each containing a `SecretKeySelector` (`name` + `key`). Replaced `credentials:` with `accessKey:` and `secretKey:` referencing `accesskey` and `secretkey` keys (the conventional secret key names used in the Argo Events docs).

3. **Unsupported `region` field on the EventSource.** The MinIO/S3 EventSource schema in Argo Events does not include a top-level `region` field. Removed it.

4. **Misleading endpoint for Argo Events MinIO EventSource.** The post used `endpoint: s3.amazonaws.com`, implying the EventSource talks directly to AWS S3. Argo Events' `minio` EventSource uses MinIO's bucket-notification API, which AWS S3 does not natively expose; for AWS S3 you would normally route events through SNS/SQS. Changed the endpoint to a typical in-cluster MinIO service example (`minio-service.minio:9000`) and updated the comment to say "S3-compatible storage" rather than "S3", to avoid implying AWS S3 works out of the box here.

## Review Notes

- The post's `Description` advertises both Argo Workflows and Kubeflow Pipelines, but the body only covers Argo Workflows. This is an editorial inconsistency, not a technical error, so it was left untouched per the review guidelines (no scope/structure changes).
- Argo Workflows v3.5.0 (October 2023) was already an older release at the post's stated date; readers may want to consider a newer 3.x release. The pinned-version pattern itself is valid, so this was not changed.
- The `kubectl patch` command in Step 1 sets `argo-server` to `ClusterIP`, but `argo-server` is `ClusterIP` by default on the upstream `install.yaml`, so the patch is effectively a no-op. The accompanying comment ("Patch service to LoadBalancer or configure ingress") is also slightly misleading — it sets ClusterIP rather than LoadBalancer. Left as-is because it is not technically incorrect (ClusterIP is the right choice if you intend to front it with an Ingress), just suboptimal phrasing.
- The `workflow-controller-configmap` `workflowDefaults` and `executor` fields used in Step 2 are valid per the upstream reference; their values (TTL strategy, podGC, executor resource requests) are well-formed.
- The Workflow DAG, parameter passing (`{{workflow.parameters.*}}`, `{{inputs.parameters.*}}`, `{{tasks.<name>.outputs.parameters.<n>}}`), `volumeClaimTemplates`, and conditional `when:` expressions are all consistent with the Argo Workflows spec.
- The GPU node selector (`nvidia.com/gpu.present: "true"`) and toleration on the `nvidia.com/gpu` key match conventions established by the NVIDIA GPU Operator and the device plugin's automatic tainting.
- The `argo` CLI commands and the `kubectl port-forward svc/argo-server -n argo 2746:2746` invocation (with `https://localhost:2746` opening URL — Argo Server enables TLS by default in 3.x) are correct.
