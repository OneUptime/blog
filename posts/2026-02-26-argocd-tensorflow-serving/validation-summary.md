# Validation Summary: How to Deploy TensorFlow Serving with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- TensorFlow Serving
- Argo CD
- Kubernetes Deployments, Services, ConfigMaps, probes, and HorizontalPodAutoscaler
- Istio VirtualService and DestinationRule
- Prometheus Operator ServiceMonitor
- NVIDIA GPU scheduling on Kubernetes
- S3-backed model storage

## Sources Consulted
- TensorFlow Serving configuration guide: https://www.tensorflow.org/tfx/serving/serving_config
- TensorFlow Serving REST API guide: https://www.tensorflow.org/tfx/serving/api_rest
- TensorFlow Serving Docker guide: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving GitHub repository: https://github.com/tensorflow/serving
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/auto_sync/

## Issues Found
- The basic TensorFlow Serving deployment mounted a `model.config` but did not pass it to TensorFlow Serving, while the text described serving labeled model versions. Changed the container args to use `--model_config_file=/config/model.config` and added `--allow_version_labels_for_unavailable_models=true`, matching TensorFlow Serving's documented label behavior at startup.
- The Prometheus ServiceMonitor assumed TensorFlow Serving exposes metrics automatically on the REST port. TensorFlow Serving requires a monitoring config file passed with `--monitoring_config_file`, so I added `monitoring.config`, passed the flag, and clarified the monitoring text.
- The GPU deployment referenced `/config/batching.config` without mounting the ConfigMap. Added the missing volume mount and ConfigMap volume.
- The multi-model Deployment omitted the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added both fields.
- The autoscaling introduction claimed scaling on GPU utilization, but the HPA example used CPU utilization and a pod custom metric. Updated the text to match the manifest.
- The canary Deployment manifests omitted pod template labels required to match their selectors. Added the matching labels.
- The canary example used version-specific storage paths as `model_base_path` values. TensorFlow Serving pins specific versions through `model_version_policy` in a model config, so I added stable and canary ConfigMaps and changed both Deployments to use `--model_config_file`.
- The Istio VirtualService routed to `tf-serving-stable` and `tf-serving-canary` hosts without defining matching services, and used the older `networking.istio.io/v1alpha3` API version. Added a Kubernetes Service, an Istio DestinationRule with stable/canary subsets, and updated the VirtualService to `networking.istio.io/v1`.

## Review Notes
- The examples still pin `tensorflow/serving:2.14.0`. That is valid as a versioned image tag, but it is not the latest TensorFlow Serving release available from the upstream project.
- YAML snippets were parsed successfully after edits.
