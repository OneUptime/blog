# Validation Summary: How to configure seccomp profiles for syscall filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Linux seccomp
- OCI seccomp profiles
- Docker seccomp profiles
- Pod Security Standards
- Prometheus/node_exporter

## Sources Consulted
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Docker seccomp documentation: https://docs.docker.com/engine/security/seccomp/
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The post described Kubernetes seccomp settings as seccomp "modes" and included "Disabled". Changed this to Kubernetes seccomp profile types and used the correct `Unconfined`, `RuntimeDefault`, and `Localhost` terminology.
- The post implied no filtering could be a runtime default. Clarified that `Unconfined` is the Kubernetes default unless kubelet seccomp defaulting is enabled.
- The audit profile snippet was labeled as YAML while containing JSON. Changed the code fence to JSON and moved the explanatory comment outside the snippet so the JSON remains valid.
- The `kubectl logs` command selected a container positionally. Updated it to the current explicit form, `kubectl logs pod-name -c container-name`.
- The syscall reference listed `send`, `recv`, and `wait`, which are commonly libc-level names or wrappers rather than the syscall names typically used in seccomp profiles on Linux. Updated these to `sendto`, `recvfrom`, `wait4`, and `waitid`.
- The web server profile was presented as sufficient for Nginx. Changed the claim to describe it as a starting point because real Nginx syscall needs vary by version, modules, TLS configuration, and base image.
- The monitoring section used a non-existent built-in node_exporter metric, `seccomp_violations_total`. Replaced the invalid ServiceMonitor and PrometheusRule examples with audit-log based monitoring commands and noted that Prometheus alerts require a custom exporter or log-derived metric.

## Review Notes
The Kubernetes seccomp API examples use current stable fields. Custom seccomp allow lists should still be generated and tested against the exact runtime, kernel, architecture, application version, and container image used in production.
