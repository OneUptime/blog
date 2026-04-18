# Validation Summary: How to Troubleshoot PVC Binding Issues in Portainer - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Kubernetes (PersistentVolumeClaim, PersistentVolume, StorageClass)
- Portainer (Kubernetes environment UI)
- kubectl CLI
- Rancher local-path-provisioner
- Dynamic provisioners (AWS EBS, GCE PD, local-path)

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass documentation (VolumeBindingMode): https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rancher local-path-provisioner repo: https://github.com/rancher/local-path-provisioner
- Portainer Kubernetes Volumes documentation: https://docs.portainer.io/user/kubernetes/volumes
- kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
1. **Incorrect provisioner name in example output.** The post listed `rancher.io/local` as the provisioner for the `standard` StorageClass. The correct provisioner name from Rancher's local-path-provisioner is `rancher.io/local-path`. Updated the example output accordingly.
2. **Incomplete `kubectl get storageclass` columns.** The example output showed only three columns (NAME, PROVISIONER, RECLAIMPOLICY), but the actual default output includes six: NAME, PROVISIONER, RECLAIMPOLICY, VOLUMEBINDINGMODE, ALLOWVOLUMEEXPANSION, AGE. Expanded the example to show the full column set so readers recognize real output.
3. **Missing `--type=merge` on the claimRef patch.** The command `kubectl patch pv <pv-name> -p '{"spec":{"claimRef": null}}'` relies on the default strategic merge patch, which does not reliably delete the `claimRef` field. Added `--type=merge` to make the null-removal behavior explicit and reliable, matching the approach recommended in community docs for reserving/reusing Released PVs.

## Review Notes
- The `kubectl describe pvc` guidance, the WaitForFirstConsumer explanation, the Portainer UI path (Kubernetes > Volumes), and the `app=local-path-provisioner` label selector are all accurate against official documentation.
- As an alternative to patching, `kubectl edit pv <pv-name>` and manually removing the `claimRef` block is the method officially called out by the Kubernetes docs ("Reserving a PersistentVolume"); the patch approach used in the post is a common pragmatic alternative and remains valid with the `--type=merge` fix applied.
- The post does not specify a Kubernetes or Portainer version. Commands shown are stable across recent Kubernetes versions (1.24+) and Portainer 2.x.
