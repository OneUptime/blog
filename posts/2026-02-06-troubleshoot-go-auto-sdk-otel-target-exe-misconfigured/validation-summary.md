# Validation Summary: How to Troubleshoot Go Auto SDK Instrumentation Not Activating Because

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Go auto-instrumentation
- OpenTelemetry Operator
- eBPF
- Kubernetes Deployments and Pods
- Dockerfiles
- Linux process inspection with `/proc`

## Sources Consulted
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Go Automatic Instrumentation getting started guide: https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/main/docs/getting-started.md
- OpenTelemetry Go auto package documentation: https://pkg.go.dev/go.opentelemetry.io/auto
- Kubernetes process namespace sharing documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace
- Docker Hub `otel/autoinstrumentation-go` tags: https://hub.docker.com/r/otel/autoinstrumentation-go/tags

## Issues Found
- The post said a mismatched `OTEL_GO_AUTO_TARGET_EXE` makes the agent "silently does nothing." I changed this to say the agent cannot attach to the intended process, which is more accurate and avoids implying there are never logs or operator events.
- The post described exact `/proc/<pid>/exe` matching and exact example log messages that are not guaranteed by the official docs. I changed this to the documented executable-path behavior and more general log guidance.
- The manual Kubernetes example placed `shareProcessNamespace: true` under the sidecar container. Kubernetes documents this as a Pod spec field, so I moved it to the same level as `containers`.
- The post recommended only adding `SYS_PTRACE` with `privileged: false`. Current OpenTelemetry Go auto-instrumentation docs require the sidecar to run as root with `privileged: true`, and the Operator injects that security context. I updated the security context examples and checklist accordingly.
- The Operator example omitted the Go auto-instrumentation feature gate caveat. I added a short comment noting that Go auto-instrumentation must be enabled in the Operator feature gates.
- The manual sidecar image used `otel/autoinstrumentation-go:v0.18.0`. I updated it to `v0.24.0`, the current tag found during review.

## Review Notes
The core troubleshooting advice is sound: `OTEL_GO_AUTO_TARGET_EXE` must identify the Go executable to instrument, and checking the running executable path through `/proc` is a practical debugging step. The Kubernetes `kubectl exec` examples may need container selection with `-c` in multi-container pods, depending on the target pod layout.
