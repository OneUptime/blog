# Validation Summary: How to Deploy TensorFlow Serving via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TensorFlow
- Keras
- TensorFlow Serving
- Docker Compose
- Portainer
- Python
- REST API
- gRPC
- Prometheus

## Sources Consulted
- TensorFlow Keras saving and export guide: https://www.tensorflow.org/guide/keras/serialization_and_saving
- `tf.keras.Model.export` API reference: https://www.tensorflow.org/api_docs/python/tf/keras/Model#export
- TensorFlow Serving configuration guide: https://www.tensorflow.org/tfx/serving/serving_config
- TensorFlow SavedModel guide: https://www.tensorflow.org/guide/saved_model
- TensorFlow Serving SignatureDefs guide: https://www.tensorflow.org/tfx/serving/signature_defs
- TensorFlow Serving performance guide: https://www.tensorflow.org/tfx/serving/performance
- TensorFlow Serving setup guide: https://www.tensorflow.org/tfx/serving/setup
- TensorFlow Serving releases: https://github.com/tensorflow/serving/releases
- TensorFlow Serving Docker tags: https://hub.docker.com/r/tensorflow/serving/tags
- Docker Compose version field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The SavedModel export example used `model.save(...)` for a serving artifact. I updated it to `model.export(...)`, which is the current TensorFlow API documented for creating SavedModel artifacts intended for inference serving.
- The example model did not define a stable named input, while the gRPC client assumed an input key of `dense_input`. I changed the model to use `tf.keras.Input(..., name="inputs")` and updated the gRPC request to use `request.inputs["inputs"]` so the snippets are aligned.
- The Step 2 stack pinned `tensorflow/serving:2.15.0`, which was outdated as of 2026-05-01. I updated the CPU and GPU image tags to `2.19.1` based on the official TensorFlow Serving release and Docker tag listings.
- The Compose snippet used the top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it.
- The stack only configured `--model_config_file_poll_wait_seconds=60`, but Step 6 said the model directory was polled every 60 seconds. I added `--file_system_poll_wait_seconds=60` and corrected the explanation so the polling behavior matches the actual TF Serving flags.
- The `mnist-classifier` config used an explicit multi-version policy while the later update walkthrough described latest-version cutover behavior. I removed that policy from the example model config so the Step 6 explanation is consistent with the configuration shown.
- The gRPC section claimed that gRPC is `~2x` faster than REST. Official TensorFlow Serving guidance only describes gRPC as slightly more performant in practice, so I removed the unsupported numeric claim.
- The zero-downtime update section claimed that old versions are unloaded after the new version becomes healthy. I replaced that with behavior the docs support directly: TF Serving discovers and loads the new version, and unversioned requests use the latest available version.
- The monitoring section implied that Prometheus metrics were exposed by default. I corrected it to show that Prometheus monitoring requires a `monitoring.config` file and the `--monitoring_config_file` flag.
- The REST client example imported `json` unnecessarily. I removed the unused import.

## Review Notes
- TensorFlow Serving `2.19.1` was the latest stable release visible from the official release page and Docker Hub tags on 2026-05-01.
- TensorFlow Serving performance guidance says the gRPC surface is generally slightly more performant than HTTP, but exact speedups depend on workload and request shape.
- The gRPC input tensor key must match the exported SavedModel signature. For custom models, `saved_model_cli show --dir <path> --tag_set serve --signature_def serving_default` is the authoritative way to confirm the input names.
- TensorFlow was not installed in this workspace, so the snippets were verified against official documentation rather than executed locally.
