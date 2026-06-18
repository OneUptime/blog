# Validation Summary: How to Collect Docker Container Logs and Enrich Them with Container Name

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- File Log receiver
- Docker Observer extension
- Receiver Creator receiver
- Transform, Attributes, and Batch processors
- Docker JSON file logging
- Docker Engine API and Docker SDK for Python

## Sources Consulted
- OpenTelemetry Collector Contrib File Log receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib container parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector Contrib Docker Observer documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/observer/dockerobserver/README.md
- OpenTelemetry Collector Contrib Receiver Creator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/receivercreator/README.md
- OpenTelemetry Collector Contrib Resource Detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector exporter component documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker bind mount documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker daemon socket security documentation: https://docs.docker.com/engine/security/protect-access/
- Docker SDK for Python container documentation: https://docker-py.readthedocs.io/en/stable/containers.html

## Issues Found
- The post claimed `docker_observer` or the resource detection processor could enrich arbitrary file log records with the source container name, image, and labels. The Docker detector in resource detection identifies the Collector's Docker environment, while `docker_observer` is used with receiver creator endpoint discovery. Replaced the main example with a validated `receiver_creator` plus `docker_observer` configuration that starts one `file_log` receiver per discovered Docker container and maps Docker endpoint metadata into resource attributes.
- The main configuration used deprecated component type names and a manual JSON/regex parsing chain. Updated the example to the current `file_log` component type and the supported `container` parser for Docker JSON log lines.
- The main configuration used the deprecated `otlp` exporter alias. Updated it to the current `otlp_grpc` exporter component name.
- The post said the filelog `container` parser can resolve container metadata. The official container parser parses Docker, CRI-O, and containerd log formats and Kubernetes file-path metadata, but it does not query Docker for container names or labels. Clarified that Docker API metadata requires the Docker observer pattern or a separate lookup.
- The text referenced `k8s_tagger`, which is not the current Collector component name and is not relevant for non-Kubernetes Docker metadata lookup. Removed that reference and kept the non-Kubernetes Docker API script as an external lookup example.
- The Docker run command mounted the Collector config at `/etc/otelcol/config.yaml`, but the contrib image defaults to `/etc/otelcol-contrib/config.yaml`. Updated the mount path and made the config mount read-only.
- The post said mounting `/var/run/docker.sock` with `:ro` ensures the Collector cannot modify anything. Corrected this security claim: `:ro` makes the socket file mount read-only, but access to the Docker API remains sensitive and is not made read-only by the bind mount flag.
- The caching section implied `docker_observer.cache_sync_interval` caches per-log-line lookups. Clarified that the observer resyncs its observed container list and avoids per-log-line Docker API lookups.

## Review Notes
- Validated the primary Collector configuration locally with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- The Docker observer can expose Docker labels to receiver creator expressions, but labels must be mapped explicitly in Collector configuration; the example maps a common Docker Compose service label and falls back to the container name.
