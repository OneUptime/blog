# Validation Summary: How to Use Sidecar Containers for Application Health Monitoring and Reporting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Deployments, Pods, ConfigMaps, probes, and sidecar container patterns
- Prometheus Python and Go client libraries
- Python health check scripts using requests, psycopg2, and redis-py
- Go health check service using database/sql, lib/pq, go-redis, and promhttp
- Datadog metrics API
- Alpine Linux container images and POSIX shell scripting

## Sources Consulted
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Pod API reference for ConfigMap volume defaultMode: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Prometheus Python client documentation: https://prometheus.github.io/client_python/
- Prometheus Go client promhttp package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Redis Go client documentation: https://redis.io/docs/latest/develop/clients/go/
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Datadog metrics API documentation: https://docs.datadoghq.com/api/latest/metrics/
- Go release history and support policy: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Alpine curl package listing: https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/curl
- curl write-out documentation: https://curl.se/docs/manpage.html

## Issues Found
- The post described Kubernetes probes as limited to HTTP, TCP, and command execution. Kubernetes also supports gRPC probes, so the wording was updated to include gRPC.
- The Go example imported `encoding/json` and `fmt` without using them, which would prevent the program from compiling. Those imports were removed.
- The Go example used the older `github.com/go-redis/redis/v8` import path. It was updated to the current `github.com/redis/go-redis/v9` module and matching `go get` command.
- The Go sidecar image used `golang:1.21-alpine`, but Go 1.21 is no longer within the Go project's supported release window as of June 3, 2026. It was updated to `golang:1.26-alpine`.
- The Go sidecar command ran `cd /app` without creating that directory. It now creates and uses `/tmp/health-checker` before initializing the module.
- The Datadog reporter used `alpine:3.18`, which is past Alpine's published support window. It was updated to `alpine:3.23`.
- The Datadog reporter used `curl` in a base Alpine image without installing it. The container command now installs `curl` with `apk add --no-cache curl` before running the script.
- The Datadog reporter used Bash here-string syntax (`<<<`) while running under `/bin/sh` on Alpine. The script now captures curl's `%{http_code}` output directly with POSIX-compatible command substitution.

## Review Notes
- The Kubernetes manifests use the broad sidecar pattern with regular co-located containers. Kubernetes also has native sidecar containers using `initContainers` with `restartPolicy: Always`; the existing examples remain valid for the general sidecar pattern, but a future revision could mention the native lifecycle option.
- The sample containers install dependencies at startup for demonstration purposes. For production, these sidecars should usually be built as version-pinned images instead.
- Python snippets passed local syntax checks. The Go snippet was compiled successfully with `go test /config/health-checker.go` inside the local `golang:1.26-alpine` Docker image.
