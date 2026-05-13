# Validation Summary: How to Deploy PyTorch Serve on GPU with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kubernetes Deployments, Services, ConfigMaps, and HorizontalPodAutoscaler
- NVIDIA GPU scheduling in Kubernetes
- PyTorch
- TorchServe
- GitOps

## Sources Consulted
- TorchServe repository and maintenance notice: https://github.com/pytorch/serve
- TorchServe Docker documentation: https://github.com/pytorch/serve/blob/master/docker/README.md
- TorchServe advanced configuration: https://docs.pytorch.org/serve/configuration.html
- TorchServe batch inference configuration: https://docs.pytorch.org/serve/batch_inference_with_ts.html
- TorchServe token authorization API: https://docs.pytorch.org/serve/token_authorization_api.html
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The introduction described TorchServe as an actively production-ready framework without noting its current maintenance status. The upstream PyTorch Serve repository states that it was archived on August 7, 2025 and is no longer actively maintained, with no planned updates, bug fixes, new features, or security patches. Added a short maintenance caveat and softened the conclusion from "production-ready" to "repeatable."
- The deployment used `pytorch/torchserve:0.9.0-gpu`, which is outdated. Updated the example to `pytorch/torchserve:0.12.0-gpu`, the latest release tag available for the official TorchServe GPU image.
- The sample curl commands omitted authorization, but current TorchServe enables token authorization by default. Added `--disable-token-auth` to the tutorial startup arguments so the unauthenticated test commands work as written. In a hardened production setup, token auth should be configured instead of disabled.
- The ConfigMap used top-level `batch_size` and `max_batch_delay` properties for dynamic batching. Current TorchServe documentation shows per-model batching in the `models` JSON configuration using `batchSize` and `maxBatchDelay`. Replaced the top-level batching keys with a per-model `models` block.
- The model startup configuration used `load_models=my_model.mar` while the inference command targeted `/predictions/my_model`. Changed it to `load_models=my_model=my_model.mar` so the model name is explicit and matches the test endpoint.
- The comment for `number_of_gpu` called it a 0-indexed GPU number. TorchServe documents `number_of_gpu` as the maximum number of GPUs TorchServe can use, not a device index. Updated the comment.

## Review Notes
- The Kubernetes GPU resource configuration is syntactically valid because GPU `requests` and `limits` are both specified and equal. Kubernetes also permits specifying only GPU limits, but the current form is accepted.
- The Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization and `healthChecks` fields are current and valid.
- The HPA uses the current stable `autoscaling/v2` API and a valid CPU utilization metric. For real GPU inference services, future improvements could include queue depth, latency, or GPU utilization metrics through Prometheus/KEDA or a custom metrics adapter.
- The tutorial disables TorchServe token authorization to keep the included curl commands simple. That is suitable for a local or internal tutorial path, but production deployments should configure authentication, network policy, and limited exposure for management APIs.
