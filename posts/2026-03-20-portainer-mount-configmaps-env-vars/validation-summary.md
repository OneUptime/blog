# Validation Summary: How to Mount ConfigMaps as Environment Variables in Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- Kubernetes Deployments and Pod manifests
- `kubectl`

## Sources Consulted
- Portainer Docs, "Add a new application using a form": https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Docs, "Add a ConfigMap": https://docs.portainer.io/sts/user/kubernetes/configurations/add
- Portainer Docs, "Add a new application using code": https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Kubernetes Docs, "Define Environment Variables for a Container": https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Docs, "Configure a Pod to Use a ConfigMap": https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Docs, "Updating Configuration via a ConfigMap": https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes Docs, "kubectl rollout restart": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes API Reference, container `envFrom` behavior and precedence: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/

## Issues Found
- The Portainer form workflow was inaccurate. The post originally described adding an environment variable and choosing `ConfigMap` as a source. Current Portainer documentation shows a dedicated `ConfigMaps` section in the application form, where selecting a ConfigMap exposes all of its keys as environment variables by default. I updated Step 2 to match the documented Portainer workflow and noted that the `Override` option changes entries to filesystem mounts.
- The post used "mount" terminology for environment-variable injection. In Kubernetes, using ConfigMap data via `env` or `envFrom` is not a filesystem mount. I corrected the title, headings, and affected sentences to use "use" or "inject" instead.
- The restart guidance was too narrow. The post said pods with `envFrom` must restart after a ConfigMap update. Kubernetes documents that environment variables sourced from ConfigMaps do not update dynamically in running Pods, whether they come from `envFrom` or `env.valueFrom.configMapKeyRef`. I updated Step 9 accordingly.

## Review Notes
- Portainer's current documentation describes form-based ConfigMap usage as whole-ConfigMap exposure. Selective key mapping and custom environment variable names are correctly handled in the post through Kubernetes manifest examples rather than the Portainer form.
- The Kubernetes examples in the post use current, supported API fields such as `envFrom`, `configMapKeyRef`, `optional`, `prefix`, and `kubectl rollout restart`.
