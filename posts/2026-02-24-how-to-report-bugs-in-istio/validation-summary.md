# Validation Summary: How to Report Bugs in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- kubectl
- GitHub CLI
- Envoy proxy diagnostics

## Sources Consulted
- Istio Reporting Bugs documentation: https://istio.io/latest/docs/releases/bugs/
- Istio Security Vulnerabilities documentation: https://istio.io/latest/docs/releases/security-vulnerabilities/
- Istio Supported Releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- GitHub Docs for attaching files: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files
- GitHub CLI issue list help output from the local `gh` installation

## Issues Found
- The Istio support-window statement was imprecise. Changed it to the official policy that minor releases are supported until six weeks after the N+2 minor release is published.
- The `istioctl bug-report` archive name and extension were incorrect. Changed the examples from `bug-report-*.tar.gz` to the documented `bug-report.tgz`.
- The reproduction steps used `kubectl exec deploy/sleep` without creating a `sleep` workload. Added a small curl client deployment so the steps can be followed from scratch.
- The VirtualService example had only a header-matched route, so a request without the header would correctly miss the route instead of demonstrating a bug. Added an explicit default route and adjusted the expected behavior text.
- The sample actual behavior mentioned `"no healthy upstream"` while the log snippet showed `route_not_found`. Changed the description to match the Envoy access log details.

## Review Notes
The core troubleshooting workflow is accurate: `istioctl analyze --all-namespaces`, `istioctl bug-report`, `istioctl proxy-status`, `istioctl proxy-config all`, Istio security vulnerability reporting by private email, and GitHub's 25MB non-image attachment limit all match the checked references. `kubectl` was not installed in the local environment, so Kubernetes command validation was done against official Kubernetes documentation rather than local help output.
