# Validation Summary: How to Debug Kubeflow Pipeline Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubeflow Pipelines
- KFP Python SDK
- kfp-kubernetes
- Kubernetes and kubectl
- MinIO/S3-compatible object storage
- pandas and PyArrow
- Prometheus and PrometheusRule

## Sources Consulted
- Kubeflow Pipelines SDK v2 reference: https://www.kubeflow.org/docs/components/pipelines/reference/sdk/
- KFP SDK API reference for `PipelineTask`: https://kubeflow-pipelines.readthedocs.io/en/stable/source/dsl.html
- kfp-kubernetes API reference: https://kfp-kubernetes.readthedocs.io/
- Kubeflow Pipelines local execution guide: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/execute-kfp-pipelines-locally/
- Kubeflow Pipelines object store configuration: https://www.kubeflow.org/docs/components/pipelines/operator-guides/configure-object-store/
- Kubeflow Pipelines pipeline root documentation: https://www.kubeflow.org/docs/components/pipelines/concepts/pipeline-root/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes private registry image pull guide: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- pandas `read_parquet` API reference: https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html
- Prometheus operator precedence documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- Replaced `kubectl get pipelineruns` with `kubectl get workflows.argoproj.io` for the default Argo-backed Kubeflow Pipelines workflow resource. `pipelineruns` is Tekton-specific and is not the default KFP backend resource.
- Changed hard-coded `setup` and `sidecar` log examples to backend-specific placeholders. KFP and workflow backends vary in whether they create init containers or sidecars and what those containers are named.
- Updated artifact commands from the old `mlpipeline/artifacts` path to the KFP v2 default pipeline root path, `mlpipeline/v2/artifacts`, and clarified that users should check their configured pipeline root.
- Corrected the image pull secret example from nonexistent `task.set_image_pull_secrets(...)` to `kubernetes.set_image_pull_secrets(task, ...)` from `kfp-kubernetes`, and changed the code fence from YAML to Python.
- Corrected the timeout example from nonexistent `task.set_timeout(...)` to `kubernetes.set_timeout(task, ...)` from `kfp-kubernetes`.
- Replaced invalid `pandas.read_parquet(..., chunksize=...)` usage with a PyArrow `ParquetFile.iter_batches(...)` implementation and wrote output incrementally to avoid accumulating all chunks in memory.
- Clarified that `kubectl top pod` can show resource usage only while reproducing or while the pod is still running, not after historical failure data has disappeared.
- Added missing imports and install metadata in Python snippets using `dsl`, `Input`, `Output`, `Dataset`, `os`, `pandas`, and `requests`.
- Replaced undefined placeholder calls such as `transform(chunk)`, `process(df)`, and an undefined `df` with minimal working example logic.
- Added parentheses to the `PipelineStuck` PromQL expression so `time() - kube_pod_created` is evaluated before multiplying by pod labels.

## Review Notes
The pod label selector `pipeline/runid=<run-id>` is common in KFP/Argo deployments but may vary by backend and distribution. The post now preserves that pattern but users should still inspect labels with `kubectl get pod --show-labels` if selectors return no pods.
