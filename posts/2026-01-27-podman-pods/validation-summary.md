# Validation Summary: How to Use Podman Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman pods
- Linux namespaces
- Podman networking
- Kubernetes Pod YAML
- OpenTelemetry Collector
- OneUptime telemetry ingestion

## Sources Consulted
- Podman `pod create` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman `kube generate` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- Podman `kube play` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman networking documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-network.1.html
- Podman `pod logs` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-logs.1.html
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- stress-ng container image documentation: https://github.com/alexei-led/stress-ng

## Issues Found
- The post described the infra container as mandatory for every pod. Updated this to say Podman creates an infra container by default, because `--infra=false` and `--share none` can change that behavior.
- The post described pod lifecycle as "atomic deployment." Reworded this to shared lifecycle commands because Podman can start, stop, restart, and remove containers at pod scope, but containers can still be created, started, and fail individually.
- Resource limit comments implied an absolute pod-wide pool that containers cannot override. Updated the wording to match Podman documentation: limits are set on the pod cgroup parent, and containers can also specify limits when joining a pod.
- The namespace inspection example checked `SandboxKey` on a regular container. Changed it to inspect the infra container, which owns the shared network namespace.
- The Node.js fullstack example attempted `npm install && npm start` in a bare `node:20-alpine` image without an application. Replaced it with an application image placeholder.
- The Envoy ambassador example implied traffic would automatically flow through Envoy with no configuration. Added a mounted Envoy config placeholder and corrected the comment.
- The Kubernetes export examples used the older `podman generate kube` form. Updated them to the current documented `podman kube generate` command.
- The post claimed generated YAML is fully compatible and directly applicable to any Kubernetes cluster. Reworded this to note that generated YAML uses Kubernetes API fields but host-specific settings such as `hostPort` should be reviewed before cluster use.
- The import examples used `podman play kube`. Updated them to `podman kube play`, while retaining behavior described by the official documentation.
- The networking section said pods use CNI by default. Updated this for modern Podman, where Netavark is the default network backend and CNI is legacy/older-installation behavior.
- The pod-to-pod example configured the frontend before starting a backend and used a bare `node:alpine` image that would not run an application. Reordered the example and used explicit backend/frontend application commands/placeholders.
- The health check example used `curl` and `/health` in `nginx:alpine`, which is not reliable for the stock image. Changed it to a BusyBox `wget` probe against `/`.
- The memory swap example set `--memory-swap` equal to `--memory`, but Podman documents that `--memory-swap` must be larger than `--memory` unless using special values. Changed it from `4g` to `6g`.
- The `stress-ng` examples used `stress-ng` as if it were an image name. Replaced it with a container image reference and command.
- The OneUptime OTLP endpoint used `https://otlp.oneuptime.com` and nonstandard environment variable names. Updated it to the documented `https://oneuptime.com/otlp` endpoint and `x-oneuptime-token` header environment variable.
- The security example used `--cap-drop` on `podman pod create`, which is not a pod-create option. Moved `--cap-drop ALL` to the container `podman run` command.

## Review Notes
Podman was not installed in the local execution environment, so command verification was performed against official Podman documentation rather than local `podman --help` output. Several examples still use placeholder application images such as `my-node-app:latest`, `my-frontend-app:latest`, and `my-instrumented-app:latest`; these are acceptable as pattern examples but require real images/configuration in a working environment.
