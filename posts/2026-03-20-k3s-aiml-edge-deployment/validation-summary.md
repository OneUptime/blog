# Validation Summary: How to Deploy AI/ML Models at the Edge with K3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA Container Toolkit
- NVIDIA k8s-device-plugin
- NVIDIA Triton Inference Server
- ONNX Runtime
- TensorFlow Lite
- Longhorn
- DCGM Exporter

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.1/install-guide.html
- NVIDIA Container Toolkit overview: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html
- NVIDIA k8s-device-plugin README: https://github.com/NVIDIA/k8s-device-plugin
- Triton model configuration docs: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html
- Triton model repository docs: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2410/user-guide/docs/user_guide/model_repository.html
- Triton release notes: https://docs.nvidia.com/deeplearning/triton-inference-server/release-notes/index.html
- Triton 25.03 release notes: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2620/release-notes/rel-25-03.html
- Triton parameters extension: https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/protocol/extension_parameters.html
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- ONNX Runtime execution providers: https://onnxruntime.ai/docs/execution-providers
- TensorFlow Lite inference guide: https://www.tensorflow.org/lite/guide/inference
- DCGM Exporter docs: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html

## Issues Found
- The K3s GPU setup used generic `containerd` reconfiguration commands (`nvidia-ctk runtime configure --runtime=containerd` and `systemctl restart containerd`) that do not match K3s's embedded containerd workflow. I replaced them with the K3s-supported flow: install the NVIDIA container toolkit first, install or restart K3s, and verify that K3s detected the `nvidia` runtime.
- The NVIDIA device plugin manifest URL and version were outdated. I updated the post to the current official static manifest path under `v0.17.1/deployments/static/`.
- The Triton deployment manifest was incomplete for the rest of the tutorial. It defined no Namespace, no Service, omitted `runtimeClassName: nvidia` for K3s GPU workloads, used the older `--strict-model-config=false` flag, and used `hostPath.type: Directory`, which could fail before `/data/models` existed. I added the Namespace and Service, set `runtimeClassName: nvidia`, removed the obsolete flag, and changed the hostPath type to `DirectoryOrCreate`.
- The Triton image tag was old for a 2026 validation pass. I updated it to `25.02-py3`, which keeps TensorFlow backend compatibility while avoiding the much older `24.01` pin.
- The model repository example mixed generic backend wording with ONNX-specific filenames and used a `bash` code fence for a directory tree. I clarified that the example is ONNX-specific, moved the tree into a `text` block, and added `mkdir -p` before writing `config.pbtxt`.
- The inference walkthrough port-forwarded a Service that did not exist and sent an invalid JSON payload containing `[...]`. After adding the Service, I replaced the placeholder request with a valid `jq`-generated payload and clarified that the port-forward runs in a separate terminal.
- The CPU fallback best-practice incorrectly referenced TensorRT Lite for non-GPU nodes. I corrected that guidance to TensorFlow Lite or ONNX Runtime CPU execution providers.
- The Longhorn guidance described the cache volume as "local" even though Longhorn is a PVC-backed storage layer. I corrected that wording to avoid implying node-local storage semantics.

## Review Notes
- Triton 25.03 and later deprecate the TensorFlow backend in the standard container line, so pinning the example to `25.02-py3` is the safest way to keep the TensorFlow-related wording accurate.
- Jetson deployments should use a matching Triton `-igpu` image and a compatible JetPack release.
- On K3s, GPU workloads need `runtimeClassName: nvidia` unless the node has already been configured to use `nvidia` as the default runtime.
