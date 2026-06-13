# Validation Summary: How to Get Started with Kubeflow on Kubernetes

## Status
validated

## Post Type
Tutorial / Getting started guide

## Technologies Covered
- Kubeflow
- Kubernetes
- kubectl
- Kustomize
- Kubeflow Pipelines SDK
- Kubeflow Notebooks
- KServe
- Istio
- Python
- scikit-learn
- joblib

## Sources Consulted
- Kubeflow installation documentation: https://www.kubeflow.org/docs/started/installing-kubeflow/
- Kubeflow manifests v1.9.0 README: https://raw.githubusercontent.com/kubeflow/manifests/v1.9.0/README.md
- Kubeflow AI reference platform 1.9 release documentation: https://www.kubeflow.org/docs/kubeflow-platform/releases/kubeflow-1.9/
- Kubeflow Pipelines component documentation: https://www.kubeflow.org/docs/components/pipelines/concepts/component/
- Kubeflow Pipelines artifact documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/artifacts/
- KServe predictive InferenceService documentation: https://kserve.github.io/website/docs/getting-started/predictive-first-isvc
- KServe PVC storage documentation: https://kserve.github.io/website/docs/model-serving/storage/providers/pvc
- KServe 0.13 scikit-learn InferenceService documentation: https://kserve.github.io/archive/0.13/modelserving/v1beta1/sklearn/v2/

## Issues Found
- The prerequisites said Kubernetes 1.25 or later and 16GB RAM / 4 CPUs. Kubeflow manifests v1.9.0 documentation validates Kubernetes 1.29 and recommends 32GB RAM / 16 CPUs for the default manifests. Updated the prerequisites accordingly and added the standalone Kustomize version requirement.
- The post said Kustomize is built into kubectl while using the `kustomize` binary. Updated the wording to require the standalone Kustomize CLI.
- `kubectl version --short` is not portable across current kubectl versions. Replaced it with `kubectl version`.
- The install retry loop slept for 10 seconds, while the Kubeflow manifests v1.9.0 README uses a 20 second retry interval. Updated the command to match the release documentation.
- The Kubeflow Pipelines `load_data` component incorrectly returned `dsl.Output[dsl.Dataset]` and referenced `load_data.outputs` inside the component body. Updated it to accept an output artifact parameter and write to `dataset.path`, then updated downstream references to `load_task.outputs["dataset"]`.
- Examples used `kubeflow-user`, but the default user namespace created by the Kubeflow manifests is `kubeflow-user-example-com`. Updated notebook, KServe, and troubleshooting commands to use the default namespace.
- The KServe InferenceService example used the older framework shortcut shape under `spec.predictor.sklearn`. Updated it to the documented `spec.predictor.model.modelFormat.name: sklearn` structure and added a trailing slash to the PVC model directory URI.
- The prediction request omitted the Istio/KServe service host header needed when calling through the ingress gateway. Added `SERVICE_HOSTNAME` and sent it as the `Host` header.

## Review Notes
- The corrected pipeline example was compiled successfully with KFP 2.16.1 to verify the current KFP 2.x artifact API shape. KFP 2.2.0, the SDK version bundled with Kubeflow 1.9.0, could not be installed in this local Python 3.12 environment because that SDK requires Python earlier than 3.12.
- The post still pins Kubeflow manifests v1.9.0. That version is technically valid, but newer Kubeflow releases exist; future updates could refresh the article to the latest stable Kubeflow manifest release.
