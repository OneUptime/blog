# Validation Summary: How to Monitor GPU Utilization for ML Workloads with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python SDK metrics and tracing
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus and OTLP receivers
- NVIDIA NVML and `nvidia-ml-py`
- NVIDIA DCGM exporter
- Docker GPU access
- Kubernetes service discovery for Prometheus scraping
- PyTorch CUDA memory metrics

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector receiver list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- NVIDIA DCGM exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- Docker GPU access documentation: https://docs.docker.com/engine/containers/gpu/
- NVIDIA NVML deprecated API list: https://docs.nvidia.com/deploy/nvml-api/deprecated.html
- NVIDIA AIPerf GPU telemetry documentation for `nvidia-ml-py`: https://docs.nvidia.com/aiperf/tutorials/metrics-analysis/gpu-telemetry-with-ai-perf
- PyPI `pynvml` deprecation notice: https://pypi.org/project/pynvml/

## Issues Found
- The post described the Python approach as `nvidia-smi` based and installed the deprecated `pynvml` PyPI package. I changed the section to refer to NVML directly and install `nvidia-ml-py`, which still imports as `pynvml`.
- The `collection_interval_seconds` constructor argument was stored but not used by the `PeriodicExportingMetricReader`. I changed `export_interval_millis` to derive from `self.interval`.
- The examples used `nvmlDeviceGetTemperature`, which NVIDIA now marks deprecated. I changed the calls to `nvmlDeviceGetTemperatureV`.
- The Collector section used an `nvml` receiver and metric names that are not present in the current OpenTelemetry Collector receiver list. I replaced that configuration with a Prometheus receiver scraping NVIDIA DCGM exporter.
- The Docker run command gave GPU access to the Collector instead of the GPU metrics exporter. I changed it to run DCGM exporter with `--gpus all`, then run the Collector on the same host network to scrape port `9400`.
- The Kubernetes Prometheus receiver used `replacement: "$1:9400"`. Because Collector config performs environment substitution on dollar signs inside Prometheus receiver config, I changed it to `replacement: "$$1:9400"`.

## Review Notes
- The Python examples are syntactically valid. They are illustrative snippets and still assume surrounding application objects such as `model` exist.
- The DCGM exporter image tag shown matches NVIDIA's documented example, but production deployments should pin a version appropriate for the installed driver and CUDA stack.
