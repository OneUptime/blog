# Validation Summary: How to View and Filter ConfigMaps in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (Kubernetes environment management)
- Kubernetes ConfigMaps
- kubectl CLI
- jq (for JSON filtering)

## Sources Consulted
- Kubernetes official documentation — ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl reference — get, describe, delete: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Portainer documentation — Kubernetes ConfigMaps & Secrets: https://docs.portainer.io/user/kubernetes/applications/configurations

## Issues Found
- In the "Finding ConfigMaps Referenced by Deployments" section, the second command used `kubectl get pods` and output `.metadata.name`, which returns pod names — but the comment claimed it found "all deployments". The command also only inspects `envFrom`, not other ConfigMap reference forms. Updated the comment to accurately reflect what the command does: "Find all pods referencing a specific ConfigMap via envFrom".

## Review Notes
- The jq query for ConfigMap references only matches `envFrom`. ConfigMaps can also be referenced via `env.valueFrom.configMapKeyRef` and `volumes.configMap`. A more complete query would inspect those paths too, but the narrow scope is acceptable for the post's purpose.
- The `--field-selector=metadata.namespace!=kube-system` usage is correct; `metadata.namespace` is one of the few universally-supported field selectors.
- All other kubectl commands, flags, and JSONPath expressions verified as syntactically correct and current.
- Portainer UI labels ("ConfigMaps & Secrets" / "Configurations", "Show system resources") match current Portainer CE Kubernetes UI.
