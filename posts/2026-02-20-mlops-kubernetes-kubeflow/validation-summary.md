# Validation Summary: How to Set Up MLOps Pipelines on Kubernetes with Kubeflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubeflow
- Kubernetes
- Kubeflow Pipelines SDK
- KServe
- Katib
- Python
- scikit-learn
- pandas
- joblib
- kustomize
- kubectl

## Sources Consulted
- Kubeflow manifests installation documentation: https://github.com/kubeflow/manifests
- Kubeflow Pipelines getting started documentation: https://www.kubeflow.org/docs/components/pipelines/getting-started/
- Kubeflow Pipelines component documentation: https://www.kubeflow.org/docs/components/pipelines/concepts/component/
- KServe scikit-learn serving documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/frameworks/sklearn
- KServe Knative Pod Autoscaler documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/kpa-autoscaler
- KServe HPA autoscaling documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/hpa-autoscaler
- Kubeflow Katib experiment configuration documentation: https://www.kubeflow.org/docs/components/katib/user-guides/hp-tuning/configure-experiment/
- Kubeflow Katib trial template documentation: https://www.kubeflow.org/docs/components/katib/user-guides/trial-template/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- scikit-learn load_iris documentation: https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_iris.html
- scikit-learn RandomForestClassifier documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html

## Issues Found
- The Kubeflow manifests install command used plain `kubectl apply -f -`. The current Kubeflow manifests installation guidance uses `kubectl apply --server-side --force-conflicts -f -` and a 20-second retry interval, so the command was updated.
- The install snippet said it waited for all pods, but the command only waits for pods in the `kubeflow` namespace. The comment was corrected to match the command's behavior.
- The KServe `InferenceService` example used the older `predictor.sklearn` schema. Current KServe documentation shows the `predictor.model.modelFormat.name: sklearn` schema, so the manifest was updated while preserving the V1 prediction endpoint used later in the post.

## Review Notes
- The Kubeflow Pipelines Python example was compiled successfully with `kfp` 2.16.1.
- The KServe storage URI remains an example placeholder. In a real deployment, it must point to a directory containing a supported scikit-learn model file such as `model.joblib`, `.pkl`, or `.pickle`.
- The Katib example assumes the training container emits the `accuracy` metric in a way Katib can collect. A production example should show the training image and metric output format explicitly.
