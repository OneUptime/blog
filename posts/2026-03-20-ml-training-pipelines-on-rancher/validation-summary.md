# Validation Summary: How to Configure ML Training Pipelines on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Kubernetes management platform)
- Argo Workflows (v3.5.0)
- Kubeflow Pipelines (KFP v2 SDK)
- Kubernetes (kubectl)
- Python (3.11)
- scikit-learn
- pandas, joblib
- MLflow (referenced via `MLFLOW_TRACKING_URI`)
- NVIDIA GPU resource requests

## Sources Consulted
- Argo Workflows official docs and GitHub releases: https://github.com/argoproj/argo-workflows/releases (v3.5.0 release artifacts and `install.yaml` URL pattern)
- Argo Workflow spec / DAG and parameters reference: https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/ and https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/
- Argo `argoproj.io/v1alpha1` Workflow CRD reference: https://argo-workflows.readthedocs.io/en/latest/fields/
- Kubeflow Pipelines v2 SDK docs: https://www.kubeflow.org/docs/components/pipelines/v2/
- KFP `@dsl.component` and artifact I/O reference: https://kubeflow-pipelines.readthedocs.io/en/stable/source/dsl.html
- KFP `compiler.Compiler` reference: https://kubeflow-pipelines.readthedocs.io/en/stable/source/compiler.html
- Kubernetes scheduling for `nvidia.com/gpu` resources: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- scikit-learn `RandomForestClassifier` and `train_test_split` reference: https://scikit-learn.org/stable/

## Issues Found
No technical issues found.

The Argo install URL (`https://github.com/argoproj/argo-workflows/releases/download/v3.5.0/install.yaml`) is the correct namespace install path and v3.5.0 is a real release. The Workflow CRD uses the correct `argoproj.io/v1alpha1` apiVersion, with valid DAG `dependencies`, `when` conditional, and `outputs.parameters.valueFrom.path` syntax. The KFP v2 sample uses correct decorator syntax (`@dsl.component(base_image=..., packages_to_install=[...])`), correct artifact typing (`dsl.Input[dsl.Dataset]`, `dsl.Output[dsl.Dataset]`, `dsl.Output[dsl.Model]`), correct outputs access pattern (`prep_task.outputs["output_path"]` keyed by the sink parameter name), and the correct `compiler.Compiler().compile(pipeline, "pipeline.yaml")` invocation.

## Review Notes
- The `import kfp` import at the top is unused (only `dsl` and `compiler` from `kfp` are used) — harmless but stylistically redundant.
- Using `:latest` tags for container images (`myregistry/data-prep:latest`, etc.) is fine for an example, but in production should be pinned to immutable tags or digests for reproducibility — out of scope for a tutorial.
- The `train_task` variable in the KFP pipeline function is assigned but never returned/used; this is acceptable since KFP tracks the DAG via the task graph, not the return value.
- Argo Workflows v3.5.0 is from October 2023; newer 3.6.x releases exist. The v3.5.0 manifest still works, but readers may want to substitute the latest stable release. No correction needed since the example is valid.
- The `when` expression `"{{tasks.evaluate.outputs.parameters.accuracy}} > 0.90"` relies on Argo's expression evaluator coercing the string output to a number — this works in current Argo versions but readers should be aware that complex conditions may benefit from `expr` syntax.
