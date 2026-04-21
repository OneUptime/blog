# Validation Summary: How to Deploy TensorFlow Serving via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TensorFlow Serving
- Portainer
- Docker
- Docker Compose
- NVIDIA GPU container support
- Prometheus
- Bash

## Sources Consulted
- TensorFlow Serving with Docker: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving configuration: https://www.tensorflow.org/tfx/serving/serving_config
- TensorFlow Serving RESTful API: https://www.tensorflow.org/tfx/serving/api_rest
- Docker CLI `docker run` GPU support: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose GPU support: https://docs.docker.com/compose/how-tos/gpu-support/
- Portainer stack creation documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docker configs documentation: https://docs.portainer.io/user/docker/configs
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Docker Compose example used a placeholder image, generic container name, port `8080`, and application settings that would not deploy TensorFlow Serving. Replaced them with `tensorflow/serving:latest`, TensorFlow Serving ports `8501` and `8500`, `MODEL_NAME`, and a read-only SavedModel mount.
- The GPU validation command used a CUDA tag that is easy to mistype and was not needed for the check. Replaced it with Docker's documented `docker run --rm --gpus all ubuntu nvidia-smi` pattern.
- The health check and verification commands referenced a generic `/health` endpoint and web UI. TensorFlow Serving exposes model status and inference REST APIs instead, so verification now uses `/v1/models/my_model` and documents the REST and gRPC ports.
- The configuration section described Portainer Configs as generally available and showed unrelated application/database YAML. Replaced it with TensorFlow Serving ModelServer protobuf configuration and noted that Portainer Configs is only available in Docker Swarm environments.
- Persistent storage used an unrelated `app-data` volume. Replaced it with a host bind mount for SavedModel exports and noted that TensorFlow Serving expects versioned model directories.
- Prometheus scraping targeted `ml-app:8080` at `/metrics`. TensorFlow Serving requires a monitoring config file and exposes Prometheus metrics on the configured HTTP path, so the snippet now uses `/monitoring/prometheus/metrics` on `tensorflow-serving:8501`.
- The backup script archived the old generic named volume and left variables unquoted. Updated it to back up the TensorFlow Serving model directory and quote paths safely.

## Review Notes
Docker is not installed in this workspace, so `docker compose config` could not be run. YAML snippets were checked with PyYAML and Bash snippets passed `bash -n`. The post still assumes the reader supplies a valid TensorFlow SavedModel under the configured versioned model directory.
