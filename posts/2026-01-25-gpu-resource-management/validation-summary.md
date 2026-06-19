# Validation Summary: How to Configure GPU Resource Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes GPU scheduling and ResourceQuota
- NVIDIA Kubernetes Device Plugin
- NVIDIA GPU time-slicing
- NVIDIA DCGM Exporter
- PyTorch CUDA memory management
- PyTorch automatic mixed precision
- PyTorch distributed launch
- NVIDIA System Management Interface (nvidia-smi)
- Prometheus metrics
- KEDA Prometheus scaler

## Sources Consulted
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- NVIDIA GPU Operator time-slicing documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- NVIDIA Kubernetes Device Plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- NVIDIA nvidia-smi documentation: https://docs.nvidia.com/deploy/nvidia-smi/index.html
- PyTorch AMP documentation: https://docs.pytorch.org/docs/stable/amp.html
- PyTorch torchrun documentation: https://docs.pytorch.org/docs/stable/elastic/run.html
- PyTorch CUDA memory documentation: https://docs.pytorch.org/docs/stable/generated/torch.cuda.memory.mem_get_info.html
- PyTorch per-process CUDA memory fraction documentation: https://docs.pytorch.org/docs/stable/generated/torch.cuda.memory.set_per_process_memory_fraction.html
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/

## Issues Found
- The NVIDIA Device Plugin DaemonSet used an outdated image tag and an environment variable that does not enable time-slicing. Updated the image to `v0.17.1`, enabled fail-fast initialization, mounted the time-slicing ConfigMap, and set `CONFIG_FILE` so the plugin actually loads the sharing configuration.
- The time-slicing comment described replicas as virtual GPUs. Changed it to "shared access slots" because NVIDIA documents that time-slicing does not provide MIG-like memory or fault isolation.
- The basic GPU pod manually set `NVIDIA_VISIBLE_DEVICES=all` and included a TensorFlow-specific memory-growth setting in a PyTorch container. Removed those environment variables because Kubernetes/NVIDIA device plugin allocation should control visible GPU devices.
- The multi-GPU job used deprecated `torch.distributed.launch` and a multi-worker setup without the Kubernetes networking/indexing needed for a valid rendezvous address. Updated the example to a single-node, four-GPU `torch.distributed.run` invocation using current PyTorch launcher arguments.
- The PyTorch memory helper calculated free GPU memory as total minus PyTorch-allocated memory, which ignores other processes and reserved memory. Replaced it with `torch.cuda.mem_get_info()`.
- The AMP example used deprecated `torch.cuda.amp.GradScaler` and `torch.cuda.amp.autocast`. Updated it to `torch.amp.GradScaler("cuda")` and `torch.amp.autocast("cuda")`, and softened the memory-savings claim.
- The KEDA Prometheus trigger included `metricName`, which is not part of the current documented Prometheus scaler metadata. Removed it and adjusted the DCGM query label to use `pod`, consistent with current DCGM Kubernetes metric labeling.

## Review Notes
The reviewed Python and YAML code fences were syntax-checked locally after edits. The examples remain illustrative; production multi-node distributed training generally needs additional Kubernetes networking, stable rank assignment, and framework-specific startup logic.
