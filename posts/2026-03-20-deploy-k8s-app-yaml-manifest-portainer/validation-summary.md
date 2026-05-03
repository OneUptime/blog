# Validation Summary: How to Deploy a Kubernetes Application via YAML Manifest in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes environment management)
- Kubernetes (ConfigMap, Deployment, Service resources)
- YAML manifests / multi-document YAML
- kubectl (in-browser shell, `kubectl apply` heredoc)
- Git repository–based manifest deployment

## Sources Consulted
- Kubernetes API reference — ConfigMap (v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#configmap-v1-core
- Kubernetes API reference — Deployment (apps/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#deployment-v1-apps
- Kubernetes API reference — Service (v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#service-v1-core
- Kubernetes Deployment strategies (RollingUpdate, maxSurge, maxUnavailable): https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- Kubernetes Configure Pod with ConfigMap (envFrom / configMapRef): https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Probes (readinessProbe with httpGet): https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Resource requests/limits: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Portainer Kubernetes documentation — Deploy from manifest / Advanced deployment: https://docs.portainer.io/user/kubernetes/applications/add
- Portainer Kubernetes documentation — kubectl shell: https://docs.portainer.io/user/kubernetes/applications/console
- kubectl reference — `kubectl apply -f -` (stdin) and heredoc usage: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
No technical issues found.

The YAML manifest is well-formed and uses current, non-deprecated API versions:
- `ConfigMap` → `v1` (correct)
- `Deployment` → `apps/v1` (correct; `extensions/v1beta1` was removed in 1.16)
- `Service` → `v1` (correct)

The Deployment's `strategy.rollingUpdate` (`maxSurge: 1`, `maxUnavailable: 0`), `envFrom.configMapRef`, `resources.requests`/`limits`, and `readinessProbe.httpGet` blocks are all syntactically and semantically correct.

The kubectl heredoc (`kubectl apply -f - <<EOF ... EOF`) is a standard, working pattern for applying inline manifests from a shell.

Portainer UI navigation matches current docs: Kubernetes environment → Applications → Add application → Advanced deployment, with Web editor or Git repository sources, and a built-in kubectl shell. The note that menu labels may differ slightly between Portainer versions is appropriately hedged.

## Review Notes
- Step 4 ("Toggle to **Web editor** mode") is accurate for current Portainer versions where the source selector includes Web editor / Git repository / URL / Custom template tabs.
- The `nginx:alpine` image reference is a valid public image tag, suitable for a quick test pod.
- Resource values (`100m`/`128Mi` requests, `500m`/`512Mi` limits) are reasonable example values.
- No version pinning is given for Portainer itself; the post hedges with "depending on Portainer version", which is appropriate since the Kubernetes UI has shifted between Portainer 2.x releases.
