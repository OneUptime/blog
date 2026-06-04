# Validation Summary: How to Use kubectl set Commands to Update Deployments Without Editing YAML

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Deployments
- ConfigMaps
- Secrets
- RBAC role bindings
- Kubernetes rolling updates and rollbacks

## Sources Consulted
- Kubernetes official kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes official kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes official kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes official kubectl set selector reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_selector/
- Kubernetes official kubectl set serviceaccount reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_serviceaccount/
- Kubernetes official kubectl set subject reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_subject/
- Kubernetes official Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes official rolling update task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes official kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes official kubectl patch task: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes official well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- Replaced the `kubectl set image ... --record` example because `--record` is deprecated. The post now uses the `kubernetes.io/change-cause` annotation and notes the deprecation.
- Changed the change-cause example to annotate before updating the image so the new Deployment revision can receive the intended change-cause text.
- Corrected the claim that multiple `kubectl set` commands in a script are atomic. The post now describes them as repeatable operations and recommends a single patch when atomicity is required.
- Fixed the Secret-specific-key example. `kubectl set env` supports `--from=secret/...` with `--keys=...`; it does not support the shown `--from=secret/name:key` alias syntax for renaming keys.
- Adjusted the Secret wording to say secret references are injected without putting secret values in command history.
- Corrected the multi-container resource example. `kubectl set resources` uses one `--containers` selection for the requested resource values; repeated `-c` flags with different limits for different containers is not the documented syntax.
- Changed RBAC subject comments from "add" to "update" because `kubectl set subject` updates the subjects on role bindings and cluster role bindings.
- Narrowed rollback wording to Deployment revisions created by Pod template changes. Kubernetes rollbacks restore the Pod template part of earlier Deployment revisions, not every possible resource change.
- Replaced the JSON patch example that appended to `/env/-`, which fails when the container has no existing `env` array, with a strategic merge patch keyed by container name.

## Review Notes
The local workspace does not have `kubectl` installed, so command verification was performed against the official Kubernetes generated kubectl reference and Kubernetes task documentation.
