# Validation Summary: How to Deploy Dapr with Google Cloud Deployment Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deployment Manager (GCP-native IaC)
- Google Kubernetes Engine (GKE)
- Dapr (Distributed Application Runtime) v1.13.0
- Helm (Kubernetes package manager)
- Python (Deployment Manager templates)
- gcloud CLI

## Sources Consulted
- Google Cloud Deployment Manager documentation (resource types, configuration format, template languages)
- GKE REST API reference for `container.v1.cluster` resource type and property structure
- Dapr Helm chart v1.13.6 `values.yaml` (verified `global.mtls.enabled`, `dapr_operator.replicaCount`, `dapr_sentry.replicaCount`)
- Dapr Helm chart repository URL: https://dapr.github.io/helm-charts/
- Kubernetes official kubectl installation docs: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Helm official installation docs: https://helm.sh/docs/intro/install/
- gcloud CLI reference for `deployment-manager deployments` commands

## Issues Found

1. **Incorrect description of Deployment Manager configuration formats (line 13)**
   - **What was wrong:** The text stated Deployment Manager supports "YAML, JSON, or Python Jinja2 templates." JSON is not a supported configuration format for Deployment Manager (only YAML). Additionally, "Python Jinja2" conflated two separate template languages — Python and Jinja2 are distinct template types.
   - **What was changed:** Corrected to "YAML configurations with Python or Jinja2 templates."
   - **Why:** Deployment Manager configurations must be YAML files. Templates can be written in either Python or Jinja2, but these are two separate options, not one combined format.

2. **Invalid package installation in startup script (lines 125-129)**
   - **What was wrong:** The startup script used `apt-get install -y kubectl helm` to install kubectl and Helm. Neither `kubectl` nor `helm` is available in standard apt repositories without first adding custom package sources.
   - **What was changed:** Replaced with the official installation methods — `kubectl` is downloaded directly from the Kubernetes release server, and Helm is installed via the official `get-helm-3` script.
   - **Why:** The original commands would fail on any standard Debian/Ubuntu system since these packages require custom repositories or direct binary downloads.

## Review Notes
- The startup script concept (running Helm from a GCE node startup script) is architecturally questionable — node startup scripts run on every node and are designed for node-level configuration, not cluster-level deployments like Helm installs. A CI/CD pipeline or a separate management VM would be more appropriate. However, the post presents this as a conceptual snippet, so no change was made.
- Dapr version 1.13.0 is valid but not the latest release. The post doesn't claim it's the latest, so this is fine.
- The `global.mtls.enabled=true` Helm value is technically redundant since mTLS is enabled by default in Dapr 1.13, but explicitly setting it is a reasonable practice for clarity.
