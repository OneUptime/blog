# Validation Summary: How to Deploy Distributed Training Jobs with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Kubeflow Training Operator v1
- Kubeflow Trainer v2
- PyTorchJob
- TFJob
- NVIDIA GPUs
- ConfigMaps
- PersistentVolumeClaims
- kubectl

## Sources Consulted
- Kubeflow Trainer v2 overview: https://www.kubeflow.org/docs/components/trainer/overview/
- Kubeflow Training Operator v1 getting started: https://www.kubeflow.org/docs/components/trainer/legacy-v1/getting-started/
- Kubeflow Trainer migration guide: https://www.kubeflow.org/docs/components/trainer/operator-guides/migration/
- Kubeflow Trainer runtime guide: https://www.kubeflow.org/docs/components/trainer/operator-guides/runtime/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `PyTorchJob` and mentioned `TFJob` without identifying them as Kubeflow Training Operator v1 APIs. Current Kubeflow Trainer v2 documentation says the newer `TrainJob`, `TrainingRuntime`, and `ClusterTrainingRuntime` APIs replace the older framework-specific CRDs. I updated the introduction and prerequisites to make the v1 scope explicit and to note that new Trainer v2 installations should use `TrainJob`.
- The best-practices section said Flux `dependsOn` can make Flux only apply changes to completed or non-existent jobs. Flux `dependsOn` only sequences reconciliation after other Kustomizations are ready. I changed the guidance to say it should be used to sequence infrastructure before training job manifests.

## Review Notes
- The shown `PyTorchJob` manifest is valid for Kubeflow Training Operator v1, including `apiVersion: kubeflow.org/v1`, `pytorchReplicaSpecs`, `Master` and `Worker` replica specs, and `restartPolicy: OnFailure`.
- The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields such as `interval`, `path`, `prune`, and `sourceRef`.
- The kubectl monitoring commands use valid patterns for watching custom resources, selecting logs by labels, executing commands in pods, and describing custom resources.
- Future revisions should consider a Kubeflow Trainer v2 version of the tutorial using `TrainJob` and `ClusterTrainingRuntime`.
