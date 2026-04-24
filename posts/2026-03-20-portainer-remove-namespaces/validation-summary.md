# Validation Summary: How to Remove Namespaces in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- `jq`
- PersistentVolumeClaims (PVCs) and PersistentVolumes (PVs)
- Kubernetes RBAC

## Sources Consulted
- Portainer Docs: Remove a namespace - https://docs.portainer.io/sts/user/kubernetes/namespaces/remove
- Portainer Docs: Kubernetes roles and bindings - https://docs.portainer.io/2.21/advanced/kubernetes-roles-and-bindings
- Kubernetes Docs: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Docs: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Docs: `kubectl wait` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Docs: `kubectl patch` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Docs: `kubectl replace` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_replace/
- Kubernetes Docs: kubectl usage conventions - https://kubernetes.io/docs/reference/kubectl/conventions/
- Kubernetes Docs: Finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Blog: Using Finalizers to Control Deletion - https://kubernetes.io/blog/2021/05/14/using-finalizers-to-control-deletion/
- Kubernetes Docs: Admission controllers (`PodNodeSelector`) - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Docs: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Docs: Change the reclaim policy of a PersistentVolume - https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/

## Issues Found
- The post described `kubectl get all` and `kubectl get all -o yaml` as if they were comprehensive namespace inventory and backup commands. Kubernetes documents `kubectl api-resources` as the way to discover the complete resource set, so I corrected the wording and expanded the backup example to include `configmap`, `ingress`, and `pvc` explicitly.
- The PVC backup example was not functional: it wrote the tarball to `/backup/data.tar.gz` without mounting a `/backup` volume, so the archive would be lost when the pod exited. I replaced it with a working pattern that creates a temporary pod, waits for readiness, streams a tar archive to a local file, and deletes the pod afterward.
- The Portainer UI steps used an inaccurate click path. Current Portainer docs document namespace deletion as selecting the namespace checkbox and clicking `Remove`, so I updated the instructions to match the official UI flow.
- The stuck-namespace section recommended directly patching `/spec/finalizers` on the namespace. Official Kubernetes guidance for forcing namespace deletion uses the namespace `finalize` subresource, so I replaced that method with `finalize` endpoint examples instead.
- The “find resources with finalizers” example used `kubectl get all`, which misses many namespaced resources and CRDs. I replaced it with a loop over `kubectl api-resources --verbs=list --namespaced -o name` so the check aligns with Kubernetes resource discovery.
- The cluster-scoped cleanup example assumed a hard-coded ClusterRoleBinding name that is not supported by Portainer’s RBAC documentation. I replaced it with a query that finds ClusterRoleBindings referencing subjects from the target namespace, then deletes only reviewed bindings.
- The production decommissioning step used `scheduler.alpha.kubernetes.io/node-selector` as a generic way to block new deployments. Kubernetes documents that annotation under the optional `PodNodeSelector` admission controller, which is disabled by default, so I replaced it with neutral guidance to use a change freeze or admission policy that actually exists in the target cluster.

## Review Notes
- Portainer’s current namespace-removal docs also note that Portainer can prompt for force deletion if a namespace is stuck in `Terminating`; the manual `kubectl` remediation in the post remains useful for deeper troubleshooting.
- Persistent volume data retention still depends on the PV reclaim policy. Kubernetes documents that dynamically provisioned PVs typically inherit a default reclaim policy of `Delete`, while `Retain` leaves the PV and data for manual cleanup or recovery.
- Commands were validated against official documentation rather than executed in this workspace. No Kubernetes cluster context was provided, and `kubectl` is not installed locally here.
