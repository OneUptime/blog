# Validation Summary: How to Initialize Dapr on a Kubernetes Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm 3
- kubectl
- Dapr CLI
- Redis (as example state store component)

## Sources Consulted
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Kubernetes production guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Kubernetes upgrade docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr getting started (Kubernetes install redirect): https://docs.dapr.io/getting-started/install-dapr-kubernetes/

## Issues Found
1. **Dashboard incorrectly listed as a default component**: The mermaid diagram, `dapr status -k` expected output, and summary all listed the Dapr Dashboard as one of the components installed by `dapr init -k`. As of Dapr 1.13+, the dashboard is no longer included in the default installation and must be installed separately via `helm install dapr-dashboard dapr/dapr-dashboard`. Removed dashboard from the diagram and status output, updated the summary from "five" to "four" control plane components, and added a note in the dashboard section about separate installation.

2. **Incorrect code fence language for CLI output**: The expected output block for `dapr init -k` used a `yaml` code fence, but the content is plain text CLI output. Changed to `text`.

## Review Notes
- The Dapr Scheduler service was introduced in Dapr 1.14 and is a core control plane component in current versions, but the official Dapr documentation does not yet consistently list it in the "verify installation" pod output sections. The blog post omits it, which aligns with the current state of the official docs.
- The Helm chart version `--version=1.14` (without patch version) should work as Helm resolves to the latest matching version, but production users may want to pin to a specific patch version like `1.14.0`.
- The URL `https://docs.dapr.io/getting-started/install-dapr-kubernetes/` referenced in the CLI output is valid but redirects to the main Kubernetes deploy page.
- All sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/app-protocol`, `dapr.io/log-level`, `dapr.io/config`, `dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`) were verified as correct.
- The Component CRD apiVersion `dapr.io/v1alpha1` and schema are confirmed correct.
- The `dapr upgrade -k --runtime-version` flag is confirmed correct.
- The Helm chart repo URL `https://dapr.github.io/helm-charts/` is confirmed correct.
