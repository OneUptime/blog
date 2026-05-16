# Validation Summary: How to Deploy Triton Inference Server on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NVIDIA Triton Inference Server (image tag `nvcr.io/nvidia/tritonserver:23.12-py3`)
- Talos Linux
- Kubernetes (Deployment, Service, PVC, Job, HorizontalPodAutoscaler)
- NVIDIA GPU scheduling (`nvidia.com/gpu` resource)
- PyTorch / torchvision (ResNet50 ONNX export)
- ONNX Runtime
- Triton model configuration (`config.pbtxt`, dynamic batching, instance groups, ensembles)
- Triton HTTP/REST v2 inference protocol
- Triton Python gRPC client (`tritonclient.grpc`)
- Prometheus Operator `ServiceMonitor` (`monitoring.coreos.com/v1`)
- Kubernetes `autoscaling/v2` HPA with custom Pods metric

## Sources Consulted
- Triton model configuration docs (r23.12): https://github.com/triton-inference-server/server/blob/r23.12/docs/user_guide/model_configuration.md
- Triton `model_config.proto` (ModelDynamicBatching fields including `priority_levels` and `default_priority_level`): https://github.com/triton-inference-server/common/blob/main/protobuf/model_config.proto
- Triton HTTP/REST protocol extension docs (request body format with `name`, `shape`, `datatype`, `data`): https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_binary_data.html
- torchvision ResNet50 docs (new `weights=` API): https://docs.pytorch.org/vision/main/models/generated/torchvision.models.resnet50.html
- Triton Inference Server v2.40.0 release notes (corresponds to NGC container 23.11): https://github.com/triton-inference-server/server/releases/tag/v2.40.0

## Issues Found

1. **Deprecated `pretrained=True` argument in torchvision** — The `prepare-models-job.yaml` used `models.resnet50(pretrained=True)`. The `pretrained` parameter has been deprecated since torchvision 0.13 in favor of the explicit `weights=` API. Changed to `models.resnet50(weights=models.ResNet50_Weights.DEFAULT)` so the example works on current torchvision releases.

2. **Deprecated `--strict-model-config=false` flag** — The Deployment passed `--strict-model-config=false` to `tritonserver`. This flag was deprecated; the modern replacement is `--disable-auto-complete-config`, and auto-complete is the default behavior (i.e., passing nothing produces the same effect that `--strict-model-config=false` used to produce). Removed the deprecated flag rather than swapping in `--disable-auto-complete-config`, since the post's intent is to *enable* auto-complete, which is now the default.

## Review Notes

- Triton image tag `23.12-py3` is a real published NGC image. It is older than the post's publication date (March 2026) but still serves as a valid example; readers should pick a newer tag for production. Left as-is since it is not technically wrong.
- The illustrative HTTP `curl` example sends `"data": [0.0]` with shape `[1, 3, 224, 224]`. A literal request would need 150,528 FP32 values, so this snippet would not pass Triton's shape validation if executed verbatim. The JSON *structure* is correct per the Triton v2 protocol, and the example is clearly meant as a request-shape template — left as-is.
- `dynamic_batching.priority_levels` and `default_priority_level` are valid `ModelDynamicBatching` proto fields per the Triton model_config.proto definition.
- The TensorFlow SavedModel directory name `model.savedmodel/` and TorchScript filename `model.pt` shown in the layout match Triton's expected defaults.
- HPA uses `autoscaling/v2` with a custom `Pods` metric (`nv_inference_request_success`); this requires a metrics adapter (e.g., prometheus-adapter) to be installed for the metric to be queryable. The post does not call this out, but the YAML itself is correct.
- `max_queue_delay_microseconds: 100` in the initial config is very aggressive (0.1 ms) and would rarely permit batching; the later "Configuring Dynamic Batching" section uses a more reasonable 200 µs. Not technically wrong, just a tuning note.
