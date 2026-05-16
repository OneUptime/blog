# Validation Summary: How to Run TensorFlow on Talos Linux

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Talos Linux
- TensorFlow 2.15.x (Python ML framework)
- TensorFlow Serving (model inference server)
- Keras (high-level model API within TensorFlow)
- TensorBoard (training visualization)
- Kubernetes (Jobs, Deployments, Services, ConfigMaps, PVCs)
- NVIDIA device plugin for Kubernetes / `nvidia.com/gpu` resource
- CIFAR-10 dataset (example training data)
- `MultiWorkerMirroredStrategy` (TF distributed training)

## Sources Consulted
- TensorFlow Serving basic tutorial — https://www.tensorflow.org/tfx/serving/serving_basic (model_base_path / versioned subdirectory requirement)
- TensorFlow Serving Docker tags — https://hub.docker.com/r/tensorflow/serving/tags
- TensorFlow Docker tags — https://hub.docker.com/r/tensorflow/tensorflow/tags
- kubectl `run --limits` removal (Kubernetes v1.24) — https://github.com/kubernetes/kubernetes/pull/108820 and https://github.com/kubernetes/kubectl/issues/1101
- TensorFlow save/load tutorial (TF 2.15 `model.save()` default format) — https://www.tensorflow.org/tutorials/keras/save_and_load
- Multi-worker training with Keras (TF_CONFIG schema) — https://www.tensorflow.org/tutorials/distribute/multi_worker_with_keras
- Keras Mixed Precision API — https://www.tensorflow.org/guide/mixed_precision
- TensorFlow API reference for `tf.config.list_physical_devices`, `tf.test.is_built_with_cuda`, `tf.distribute.MultiWorkerMirroredStrategy`

## Issues Found

1. **`kubectl run --limits=nvidia.com/gpu=1` no longer works.** The `--limits` (and `--requests`) flag was removed from `kubectl run` in Kubernetes v1.24 (March 2022). Running it against any current cluster will error. **Fix:** Replaced the one-liner with a small `Pod` manifest that declares `resources.limits: nvidia.com/gpu: 1`, applied with `kubectl apply`, followed by `kubectl logs` and `kubectl delete pod` to clean up.

2. **`tensorflow/serving:2.15.0-gpu` image tag does not exist.** Docker Hub for `tensorflow/serving` jumped from the `2.15.0-rc0(-gpu)` release candidates directly to `2.15.1(-gpu)` — there is no stable `2.15.0` tag for the serving image. **Fix:** Updated the TF Serving Deployment to use `tensorflow/serving:2.15.1-gpu`. (The training image `tensorflow/tensorflow:2.15.0-gpu` does exist and was left as-is.)

3. **TF Serving `--model_base_path` was pointed at the SavedModel directory, not its parent.** TF Serving expects `model_base_path` to contain numbered version subdirectories (`1/`, `2/`, …) whose contents are SavedModels. The post's training script saved to `/models/cifar10/saved_model` and the serving Deployment used `--model_base_path=/models/cifar10/saved_model`, so the server would fail to discover any servable version. **Fix:** Changed the training script to save into `/models/cifar10/1` (a versioned subdirectory) and updated the Deployment to use `--model_base_path=/models/cifar10`. Updated the trailing print statement accordingly.

## Review Notes
- TF 2.15's `model.save('/path/to/dir')` (no extension) correctly produces a SavedModel — this matches what TF Serving needs. Note: in TF 2.16+ with Keras 3, the same call would require the `.keras` extension or `model.export()` for SavedModel. If the post is revisited later, this is the most likely source of future drift.
- `kubectl run` itself has accumulated many soft-deprecations over the years (`--port`, `--env`, `--serviceaccount` etc. were also removed in 1.24); the imperative Pod-creation pattern is generally fragile. The new manifest-based approach is more durable.
- The sample `curl` payload `{"instances": [[[0.1, 0.2, 0.3]]]}` is shape (1, 1, 3) and will not actually score against the CIFAR-10 model, which expects shape (1, 32, 32, 3). Left unchanged — it is clearly illustrative of the request format rather than a realistic input, and fixing it would require pasting ~3,000 floats.
- The distributed-training section shows only `tf-distributed-worker-0` and references `tf-worker-0.ml-workloads.svc` / `tf-worker-1.ml-workloads.svc` headless service DNS names. To actually run, the reader must additionally create the worker-1 Job, the `distributed-training-scripts` ConfigMap, and a headless Service per worker. Left as-is since the post explicitly frames this as a partial example ("Here is a setup using multiple pods").
- The distributed model save path (`/models/distributed_model`) has the same versioned-subdir caveat as the single-worker case, but the post never points TF Serving at it, so it is not load-bearing.
- TF Serving GPU images still ship as `latest-gpu` etc.; pinning to `2.15.1-gpu` keeps the example reproducible.
