# Validation Summary: How to Deploy Kubeflow Training Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD v2
- Kubernetes
- Kustomize
- Kubeflow Training Operator v1
- Kubeflow PyTorchJob, TFJob, MPIJob, and XGBoostJob CRDs
- Prometheus metrics
- GPU workload scheduling and gang scheduling

## Sources Consulted
- Kubeflow Training Operator v1 installation documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/installation/
- Kubeflow Training Operator v1 PyTorchJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow Training Operator v1 job scheduling documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/job-scheduling/
- Kubeflow Training Operator v1 Prometheus monitoring documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/prometheus/
- Kubeflow Trainer v2 installation documentation: https://www.kubeflow.org/docs/components/trainer/operator-guides/installation/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Kubeflow Training Operator Git repository and v1.8.1 tag: https://github.com/kubeflow/training-operator

## Issues Found
- The post used a `HelmRepository` pointing at `https://kubeflow.github.io/training-operator`, but that URL does not publish a valid Helm repository index. Replaced the Helm-based install with a Flux `GitRepository` that tracks the official Kubeflow Training Operator repository at tag `v1.8.1`.
- The post used a `HelmRelease` with chart values such as `replicaCount`, `image`, and `monitoring.prometheus.enabled` for a chart that is not available from the referenced repository. Replaced it with a Flux `Kustomization` that applies the official `./manifests/overlays/standalone` Kustomize overlay.
- The original version pin used `1.7.*` and `v1.7.0`; the current official legacy Training Operator v1 installation documentation identifies `v1.8.1` as the stable release. Updated the Flux source reference to `v1.8.1`.
- The PyTorchJob example used the `ml-workloads` namespace without creating it. Added a `Namespace` manifest to the sample workload YAML so the resource can be applied declaratively through Flux.
- The best-practice note named Koordinator as an example for the `--gang-scheduler-name` flag, but the official legacy v1 scheduling guide documents Volcano and Kubernetes Scheduler Plugins coscheduling for that flag. Updated the wording accordingly.

## Review Notes
The post intentionally remains on legacy Kubeflow Training Operator v1 because its examples use `PyTorchJob`, `TFJob`, `MPIJob`, and `XGBoostJob`. Kubeflow's current Trainer v2 documentation uses newer Trainer APIs and Helm charts, so a future rewrite could migrate the guide to Trainer v2 rather than the legacy v1 CRDs.
