# Validation Summary: How to Deploy TensorFlow Serving on GPU with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- TensorFlow Serving
- TensorFlow SavedModel
- NVIDIA GPU scheduling in Kubernetes
- Kubernetes Services and port forwarding

## Sources Consulted
- TensorFlow Serving configuration documentation: https://www.tensorflow.org/tfx/serving/serving_config
- TensorFlow Serving Docker documentation: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving REST API documentation: https://www.tensorflow.org/tfx/serving/api_rest
- TensorFlow Serving GitHub releases: https://github.com/tensorflow/serving/releases
- Official TensorFlow Serving Docker Hub tags: https://hub.docker.com/r/tensorflow/serving/tags
- TensorFlow GPU memory growth documentation: https://www.tensorflow.org/guide/gpu
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The introduction said the guide included a Horizontal Pod Autoscaler, but no HPA manifest was provided. Changed this to "batching configuration" to match the actual tutorial content.
- The deployment passed `--batching_parameters_file=/etc/tf-serving/batching.config`, but the ConfigMap only created `models.config`. Added a valid TensorFlow Serving batching parameters file to the ConfigMap so the mounted file exists.
- The TensorFlow Serving image was pinned to `tensorflow/serving:2.14.0-gpu`, while the current official TensorFlow Serving release and Docker tag checked during validation is `2.19.1-gpu`. Updated the pinned image to `tensorflow/serving:2.19.1-gpu`.
- The prerequisite mentioned model storage in object storage, but the manifests mount a PersistentVolumeClaim named `model-store-pvc`. Updated the prerequisite to match the deployment.
- The inference validation used `http://<service-ip>:8501`, which is usually not reachable from a local workstation for a default ClusterIP Service. Added `kubectl port-forward service/tf-serving -n tf-serving 8501:8501` and changed the curl target to `localhost`.
- The PodDisruptionBudget best practice said it ensures rolling updates keep at least one replica serving. Kubernetes documentation states PDBs limit voluntary disruptions such as evictions, while Deployment rolling update behavior is controlled by the workload strategy. Reworded the guidance to voluntary disruptions such as node drains.

## Review Notes
The Kubernetes GPU resource request and limit are technically valid because the request equals the limit. The TensorFlow Serving REST predict example is structurally valid, but the exact input tensor shape still depends on the exported model signature.
