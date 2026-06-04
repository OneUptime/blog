# Validation Summary: How to Use Init Containers for License Validation Before Application Startup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes init containers, Deployments, DaemonSets, Secrets, ConfigMaps, emptyDir volumes, Downward API environment variables, and lifecycle hooks
- Alpine Linux container images and packages
- POSIX shell scripting
- OpenSSL signature verification
- Python 3 and the requests library
- Prometheus Operator PrometheusRule resources and PromQL alert expressions

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes container environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Downward API environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- OpenSSL dgst documentation: https://docs.openssl.org/master/man1/openssl-dgst/
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The offline license validator used Bash process substitution with `/bin/sh`, which would fail in the Alpine shell. Replaced it with a temporary signature file and POSIX-compatible shell commands.
- The Alpine examples used `alpine:3.18`, which is end-of-support as of May 9, 2025. Updated the examples to `alpine:3.23`.
- The offline validator depended on `openssl` and GNU-style `date` behavior that are not guaranteed in the base Alpine image. Added `apk add --no-cache coreutils openssl` before running the script.
- The hardware validator depended on `nproc` from coreutils. Added `apk add --no-cache coreutils` before running the script.
- The `preStop` hook in the online validation example referenced `LICENSE_SERVER`, `LICENSE_KEY`, and `POD_NAME`, but those variables were only defined for the init container. Added the same environment variables to the application container because lifecycle exec hooks run inside that container.
- The `LicenseExpiringSoon` alert expression also matched already expired licenses. Added a positive-days condition so expired licenses are handled by the separate `LicenseExpired` alert.

## Review Notes
- The YAML snippets were parsed successfully after the fixes.
- The embedded shell scripts pass `sh -n`, and the embedded Python scripts parse successfully with Python `ast`.
- `promtool` was not available locally, so PromQL was reviewed against the official Prometheus documentation rather than validated with the CLI.
