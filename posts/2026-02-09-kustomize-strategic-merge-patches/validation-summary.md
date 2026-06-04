# Validation Summary: How to use Kustomize strategic merge patches for selective updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- Strategic merge patches
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Update API Objects in Place Using kubectl patch, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl reference: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl apply, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kustomize reference: patches, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes API reference: StatefulSet, https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes concepts: StatefulSets, https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post used the deprecated `patchesStrategicMerge` field in Kustomization examples. Updated the examples to use the current `patches` field with `path` entries, which Kustomize documents as supporting strategic merge patches.
- The explanation said strategic merge is the default patching strategy used by `kubectl apply` and Kustomize. Reworded this to the narrower, documented claim that `kubectl patch` defaults to strategic merge and Kustomize can apply strategic merge patches through `patches`.
- The resources patch explanation said the entire `resources` block is replaced. Corrected this to say the specified requests and limits are updated, because strategic merge patches merge maps and patch nested fields rather than replacing the whole container.
- The metadata example set `deployment.kubernetes.io/revision`, which is a controller-managed Deployment annotation and is misleading as user-provided desired metadata. Replaced it with a Prometheus path annotation.
- The StatefulSet section claimed `volumeClaimTemplates` merge by name. Corrected this: the Kubernetes API reference does not mark `volumeClaimTemplates` as a merge-by-name list, and live StatefulSets restrict updates to many spec fields.
- The validation command combined `kubectl get -f -` with a specific resource argument. Replaced it with a client-side dry-run render command that is valid for reviewing the generated resources.

## Review Notes
Local `kustomize` and `kubectl` binaries were not installed in the workspace, so CLI behavior was verified against official command references rather than local command output.
