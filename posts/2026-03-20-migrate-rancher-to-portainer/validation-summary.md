# Validation Summary: How to Migrate from Rancher to Portainer

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer (Kubernetes management)
- Rancher (Kubernetes management)
- Kubernetes (kubectl)
- Helm (chart management)
- Docker
- Python (small inline script for parsing JSON)

## Sources Consulted
- Portainer Kubernetes Helm chart repository: https://github.com/portainer/k8s
- Portainer Helm chart deployment template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/deployment.yaml
- Portainer Helm chart `_helpers.tpl` (verifying `app.kubernetes.io/name` selector resolves to chart name `portainer`)
- Rancher cleanup script: https://github.com/rancher/rancher-cleanup (verifying cattle-system, cattle-global-data, cattle-impersonation-system are valid Rancher namespaces)
- Rancher cleanup.sh source (confirming the explicitly listed cattle namespaces)
- Rancher Manager docs on Projects and Namespaces (https://ranchermanager.docs.rancher.com/)

## Issues Found
No technical issues found.

Verified:
- Portainer Helm repo URL `https://portainer.github.io/k8s/` is correct.
- Helm chart name `portainer/portainer` is correct.
- `--set service.type=LoadBalancer` is a valid override (default is NodePort).
- The pod selector `app.kubernetes.io/name=portainer` matches the chart's `selectorLabels` template (which resolves to the chart name `portainer` by default).
- The Rancher CRD `projects.management.cattle.io` and the namespace annotation `field.cattle.io/projectId` are correct.
- `helm uninstall rancher -n cattle-system` is the correct uninstall command.
- The cattle namespaces listed (`cattle-system`, `cattle-global-data`, `cattle-impersonation-system`) are confirmed in the official rancher-cleanup script.
- `kubectl` flags (`-A`, `-o yaml`, `-o json`) and `helm list -A -o json` are valid.
- The Python f-string snippet for parsing namespace JSON is syntactically correct.

## Review Notes
- The comment "Uninstall Rancher (run on the Rancher host, not the managed cluster)" is slightly imprecise wording — Rancher itself runs on a Kubernetes cluster (the "local" cluster), not a single host. The intent (use the Rancher cluster's kubeconfig, not a downstream managed cluster's) is clear from context, so no change was made.
- For thorough cleanup, the official `rancher-cleanup` job (https://github.com/rancher/rancher-cleanup) handles many more namespaces and resources (cattle-fleet-system, cattle-resources-system, project namespaces matching `p-*`, cluster namespaces matching `c-*`, tool namespaces, etc.). The post's manual steps cover the most common namespaces but readers with monitoring, logging, fleet, or other Rancher-installed tools may need additional cleanup.
- UI navigation paths for Portainer (e.g., "Kubernetes > Helm Charts", "Settings > Teams") are described at a high level and may shift slightly between Portainer 2.x minor versions, but the general flow is accurate.
