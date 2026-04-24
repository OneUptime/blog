# Validation Summary: How to Remove a Kubernetes Application in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Helm
- PersistentVolumeClaims and PersistentVolumes
- ConfigMaps, Secrets, Ingresses, and HorizontalPodAutoscalers

## Sources Consulted
- Portainer: Remove an application — https://docs.portainer.io/user/kubernetes/applications/remove
- Portainer: Inspect a Helm application — https://docs.portainer.io/user/kubernetes/applications/inspect-helm
- Portainer: Remove a volume — https://docs.portainer.io/user/kubernetes/volumes/remove
- Portainer: Add a new application using a form — https://docs.portainer.io/user/kubernetes/applications/add
- Portainer: ConfigMaps & Secrets — https://docs.portainer.io/user/kubernetes/configurations
- Kubernetes: `kubectl get` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes: `kubectl delete` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes: `kubectl patch` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes: Persistent Volumes — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes: Finalizers — https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Helm: `helm uninstall` reference — https://helm.sh/docs/helm/helm_uninstall/

## Issues Found
- The Portainer removal workflow was inaccurate. The post described opening an application detail page, clicking `Remove this application`, and choosing per-resource delete options. Current Portainer docs document removing Kubernetes applications from the `Applications` list by selecting the app, clicking `Remove`, and confirming the removal, without the checkbox-based resource selection shown in the post. I replaced Step 3 with the documented workflow.
- The sample `kubectl get all` output was internally inconsistent. It showed one Pod but a Deployment and ReplicaSet with three replicas. I corrected the sample output to a consistent single-replica example.
- The PVC cleanup section overstated the storage semantics. The reclaim policy belongs to the bound PersistentVolume, not the PVC itself, and Portainer volume removal requires the volume to be detached and unused. I corrected the warning text and the Portainer removal note.
- The YAML deletion explanation was too absolute. `kubectl delete -f` deletes the resources defined in the manifest being passed, not "exactly what the YAML created" in every lifecycle scenario. I corrected that wording.
- The Helm removal UI description was inaccurate. Current Portainer docs show Helm applications under `Applications`, with uninstall available from the Helm application details page. I updated that instruction.
- The verification step did not actually check several resource types it claimed to cover. `kubectl get all` does not include resources like PVCs, ConfigMaps, Secrets, Ingresses, or HPAs. I replaced that line with an explicit resource list.
- The finalizer inspection example depended on `jq`, which was not otherwise introduced or required by the guide. I replaced it with `kubectl` `jsonpath` output and added the missing caution that manual finalizer removal is a last resort.
- The introduction and conclusion slightly overstated what Portainer removes automatically. I narrowed both to match the documented behavior and the Kubernetes resource model.

## Review Notes
- The guide assumes related resources carry a label such as `app=my-app`. In real clusters, labels may differ or be missing, so operators may still need manual inspection for unlabeled resources.
- Manual finalizer removal remains a risky recovery action. The post now reflects that it should only be used after confirming the relevant controller cannot complete cleanup normally.
