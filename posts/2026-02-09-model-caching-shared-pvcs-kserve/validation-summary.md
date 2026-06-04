# Validation Summary: How to Set Up Model Caching on Shared PVCs for Fast KServe Cold Start Recovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- KServe InferenceService
- PersistentVolumes and PersistentVolumeClaims
- ReadWriteMany storage
- Kubernetes CronJob
- S3 model storage
- Python and boto3

## Sources Consulted
- KServe API reference: https://kserve.github.io/website/docs/reference/crd-api
- KServe model storage overview: https://kserve.github.io/website/docs/model-serving/storage/overview
- KServe storage containers documentation: https://kserve.github.io/website/docs/model-serving/storage/storage-containers
- KServe PVC storage provider documentation: https://kserve.github.io/website/docs/model-serving/storage/providers/pvc
- KServe custom predictor documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/frameworks/custom-predictor
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post said PVCs remain attached to the node after scale-down. Updated this to say the PersistentVolume and its data remain available for the next pod to mount, because PVC/PV persistence is independent of a specific pod and not necessarily a persistent node attachment.
- The post described RWX as allowing multiple pods to mount the same volume simultaneously. Updated this to the Kubernetes definition: RWX allows read-write mounting by multiple nodes.
- The storage class inspection command attempted to print `.parameters.accessModes`, which is not a standard StorageClass field. Replaced it with `kubectl get storageclass` and `kubectl describe storageclass nfs-client`, plus guidance to confirm RWX support in the provisioner documentation.
- The first InferenceService example used unsupported KServe cache configuration under `predictor.model.storage.parameters.cacheDir` and placed `volumeMounts` at the wrong level. Replaced it with a custom predictor shape using predictor-level `volumes`, an init container, and container-level `volumeMounts`.
- The smart cache example placed the `model-storage` `emptyDir` as an `initContainers` entry instead of under `volumes`. Moved it under `spec.predictor.volumes`.
- The smart cache example used shell variables from Python without exporting them. Exported `MODEL_URI`, `MODEL_PATH`, and `CACHE_MODEL_PATH`.
- The smart cache example used placeholder S3 download code while claiming to download from S3. Added concrete boto3 logic to list and download objects under the S3 prefix into `/tmp/model`.
- The CronJob eviction command could remove nested directories and potentially recurse into unintended cache paths. Constrained it to top-level cached model directories with `-mindepth 1 -maxdepth 1`.

## Review Notes
The corrected examples are still illustrative and require a real model server image, credentials secret, and production-grade concurrency handling if multiple pods can populate the same cache key at the same time. Access-time-based eviction can also be unreliable on storage mounted with `noatime` or provider-specific access-time behavior.
