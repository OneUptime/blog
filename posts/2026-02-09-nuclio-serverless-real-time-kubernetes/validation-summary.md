# Validation Summary: Deploy Nuclio Serverless Platform on Kubernetes for Real-Time Data Processing

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Nuclio
- Kubernetes
- Helm
- nuctl
- Python
- Kafka
- Prometheus
- NVIDIA GPU resources and DCGM Exporter
- PyTorch
- Hugging Face Transformers

## Sources Consulted
- Nuclio Kubernetes installation documentation: https://docs.nuclio.io/en/stable/setup/k8s/getting-started-k8s.html
- Nuclio production Kubernetes/Helm documentation: https://docs.nuclio.io/en/stable/setup/k8s/running-in-production-k8s.html
- Nuclio function configuration reference: https://docs.nuclio.io/en/stable/reference/function-configuration/function-configuration-reference.html
- Nuclio Python runtime documentation: https://docs.nuclio.io/en/stable/reference/runtimes/python/python-reference.html
- Nuclio Kafka trigger documentation: https://docs.nuclio.io/en/1.15.x/reference/triggers/kafka.html
- Nuclio HTTP trigger documentation: https://docs.nuclio.io/en/stable/reference/triggers/http.html
- Nuclio nuctl deploy documentation: https://docs.nuclio.io/en/stable/reference/nuctl/cli/nuctl_deploy.html
- Nuclio nuctl invoke documentation: https://docs.nuclio.io/en/stable/reference/nuctl/cli/nuctl_invoke.html
- Nuclio v1.15.26 GitHub release metadata: https://api.github.com/repos/nuclio/nuclio/releases/latest
- Nuclio Prometheus metrics source: https://github.com/nuclio/nuclio/tree/1.15.26/pkg/processor/metricsink/prometheus
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- Kubernetes GPU resource documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/

## Issues Found
- The description claimed sub-millisecond latency as a general deployment outcome. Changed this to "low latency" to avoid an unsupported guarantee.
- The Nuclio install example omitted the registry secret and registry URL needed for Kubernetes function image builds. Added registry secret creation and `registry.pushPullUrl` Helm values.
- The Helm install pinned only the controller image to `latest-amd64`. Changed it to pin both controller and dashboard image tags to the current Nuclio release line used for validation.
- The `nuctl` download command used `uname -s` and `uname -m` values that do not match current release asset names on common Linux systems. Added lowercase OS normalization and architecture mapping.
- Function configs used `python:3.9`, which is not listed in the current Nuclio function configuration runtime set. Updated examples to `python:3.11`.
- HTTP triggers used deprecated `maxWorkers`. Replaced with `numWorkers`.
- The Kafka trigger used `kind: kafka`; current Nuclio docs use `kafka-cluster`. Updated the trigger kind.
- The Kafka SASL example used `enabled`; current Nuclio Kafka docs use `enable`. Updated the field.
- The NumPy dependency version was old for the updated runtime. Updated the example to `numpy==1.26.4`.
- The deploy examples omitted `--registry`, which `nuctl deploy` commonly needs for Kubernetes builds. Added the registry flag.
- The log parsing regex used an unescaped dot in the timestamp fractional seconds. Escaped it.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware UTC timestamps.
- The Kafka processing example could fail on empty readings when calling NumPy min/max. Added a 400 response for empty readings.
- The ML example did not put the PyTorch model into evaluation mode. Added `model.eval()`.
- The GPU node selector was placed under `platform.attributes`; current function config exposes `nodeSelector` at `spec.nodeSelector`. Moved it.
- The PromQL examples used metric names that do not match Nuclio processor metrics. Replaced them with `nuclio_processor_handled_events_total` and handled-event duration sum/count metrics.
- The GPU utilization metric used `nvidia_gpu_duty_cycle`, which is not the standard NVIDIA DCGM Exporter metric. Replaced it with `DCGM_FI_DEV_GPU_UTIL`.
- The scaling note implied manually using HPA separately. Clarified that Nuclio creates Kubernetes HPA resources when autoscaling parameters are configured.

## Review Notes
The examples are now aligned with Nuclio 1.15.x documentation. Users still need to replace registry placeholders, Kafka broker names, and GPU node labels with values from their own cluster.
