# Validation Summary: How to Set Up Ray Cluster in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ray Core
- Ray Client
- Ray Data
- Ray Train
- Ray Serve
- Docker
- Docker Compose
- Python
- PyTorch
- NVIDIA GPU containers

## Sources Consulted
- Ray Client documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/cluster/running-applications/job-submission/ray-client.html
- Ray Serve `serve.run` API reference for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/serve/api/doc/ray.serve.run.html
- Ray Serve `serve.start` API reference for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/serve/api/doc/ray.serve.start.html
- Ray Serve config documentation for HTTP options: https://docs.ray.io/en/latest/serve/production-guide/config.html
- Ray Dashboard configuration documentation: https://docs.ray.io/en/latest/cluster/configure-manage-dashboard.html
- Ray object store and memory management documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/ray-core/scheduling/memory-management.html
- Ray large cluster best practices for `/dev/shm`: https://docs.ray.io/en/latest/cluster/vms/user-guides/large-cluster-best-practices.html
- Ray logging directory documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/ray-observability/user-guides/configure-logging.html
- Ray Data loading and saving documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/data/loading-data.html and https://docs.ray.io/en/releases-2.40.0/data/saving-data.html
- Ray Train `TorchTrainer` API documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/train/api/doc/ray.train.torch.TorchTrainer.html
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Ray Docker image documentation for Ray 2.40.0: https://docs.ray.io/en/releases-2.40.0/ray-overview/installation.html

## Issues Found
- The Ray Serve example passed `host` and `port` to `serve.run()`, but the `serve.run()` API does not accept those arguments. Updated the example to call `serve.start(http_options={"host": "0.0.0.0", "port": 8000})` before `serve.run(app)`.
- The Docker Compose example did not expose port `8000`, so the Ray Serve HTTP endpoint would not be reachable from the host. Added `8000:8000` to the head node ports.
- The Docker Compose example mounted the same named volume at `/tmp/ray` for all Ray containers. Ray uses `/tmp/ray` for per-node sessions, logs, and temporary files, so sharing it across containers can cause conflicts. Removed the shared `/tmp/ray` volume.
- The Compose snippet set `RAY_GRAFANA_HOST=http://grafana:3000` without defining a Grafana service. Removed the dangling environment variable from the runnable cluster example.
- The shared memory explanation said Docker's default 64 MB `/dev/shm` "will cause crashes." Ray documentation says insufficient `/dev/shm` can cause startup failures or make Ray use slower disk-backed storage. Updated the wording to be accurate.
- The Ray Data write example used a local path in a distributed cluster context. Added a comment clarifying that the output path should be shared storage mounted on every Ray node.

## Review Notes
- Ray Client examples are technically valid for interactive development, but Ray's documentation cautions that Ray Client may not work as expected for ML workloads such as Ray Train or Ray Tune. For long-running training jobs, Ray Jobs is usually the better production pattern.
- The top-level `version: "3.8"` key in the Compose example remains valid for many Compose users, but modern Compose Specification files do not require it.
