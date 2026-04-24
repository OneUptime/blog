# Validation Summary: How to Deploy a Kubernetes Application via YAML Manifest in Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes YAML manifests
- Deployments
- Services
- ConfigMaps
- PersistentVolumeClaims
- Secrets
- `kubectl`

## Sources Consulted
- Portainer Documentation, "Add a new application using code": https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer Documentation, "Create an application from a Manifest": https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer Documentation, "Edit an application": https://docs.portainer.io/user/kubernetes/applications/edit
- Kubernetes Documentation, "Deployments": https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Documentation, "Service": https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Documentation, "ConfigMaps": https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Documentation, "Secrets": https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Documentation, "Persistent Volumes": https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Documentation, "Configure a Security Context for a Pod or Container": https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Documentation, "`kubectl apply`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Documentation, "`kubectl rollout undo`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/

## Issues Found
1. The Portainer navigation path was outdated. I changed `Applications → Add application` / `YAML` / `Advanced deployment → Deploy from YAML` to the current documented flow: `Applications → Create from code`, then `Manifest`, then the appropriate `Deploy from` option.
2. The URL-based deployment instructions were inaccurate. I changed Step 8 from an in-editor "Load from URL" action to Portainer's documented `Deploy from → URL` workflow.
3. The update flow was too loose for current Portainer behavior. I changed it to `Edit this application`, updated the action button text to `Update application`, and clarified that direct YAML-tab editing is a Portainer Business Edition feature.
4. The post made unsupported editor-behavior claims. I changed references to a "YAML editor with syntax highlighting" and "Portainer highlights issues" to the documented `Web editor` wording.
5. The deployment comment `maxUnavailable: 0    # Zero-downtime deployments` overstated what Kubernetes guarantees. I changed it to a narrower description that matches Deployment rolling-update behavior.
6. The deployment example referenced supporting resources without saying they must exist first. I updated the prerequisites to clarify that referenced Secrets, ConfigMaps, PVCs, and image pull secrets must already exist unless included in the same manifest.
7. The multi-manifest ConfigMap example did not contain the `config.json` key referenced by the Deployment's `configMapKeyRef` and ConfigMap volume. I added that key so the examples are internally consistent.
8. The `LoadBalancer` Service example lacked the normal environment caveat. I added a note that it requires a supported cloud/provider or load balancer integration.

## Review Notes
- The Kubernetes manifests are syntactically valid after the fixes.
- The `kubectl rollout history` / `undo` commands are correct for Deployments.
- The `LoadBalancer` example is valid Kubernetes configuration, but whether it becomes externally reachable depends on the cluster environment.
