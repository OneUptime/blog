# Validation Summary: How to Deploy a Kubernetes Application via Form in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes management UI)
- Kubernetes (Deployments, Services, StatefulSets, DaemonSets)
- Kubernetes networking (ClusterIP, NodePort, LoadBalancer)
- Kubernetes persistent storage (PVCs, StorageClasses)
- nginx container image

## Sources Consulted
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes/applications
- Kubernetes Deployment reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service reference: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Pod template / labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Docker Hub nginx image tags: https://hub.docker.com/_/nginx

## Issues Found
- The auto-generated Deployment YAML in the "Example: Deploying Nginx via Form" section was missing the `template.metadata.labels` block. A Kubernetes Deployment requires the pod template's labels to match `spec.selector.matchLabels`; without them the API server rejects the manifest with a "selector does not match template labels" error. Added `metadata.labels: { app: web-nginx }` under `template` so the manifest is valid and matches what Portainer would actually generate.

## Review Notes
- The Portainer UI labels and navigation flow (Applications → Add application) match current Portainer Business/Community Edition (2.x) behavior.
- Deployment type options listed (Replicated/Deployment, StatefulSet, DaemonSet) are accurate; Portainer also exposes "Global" which maps to DaemonSet — the post's wording is fine as a simplification.
- Service type list (None, ClusterIP, NodePort, LoadBalancer) matches Portainer's form options. ExternalName is not exposed via the form, which is consistent with Portainer's UI.
- The environment variable YAML snippet is correct.
- `nginx:1.25-alpine` is a valid published Docker Hub tag.
- Future-proofing note: Portainer's exact form labels evolve between releases; readers on much newer or older Portainer versions may see slightly different field names, but the underlying Kubernetes objects generated remain the same.
