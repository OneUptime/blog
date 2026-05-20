# Validation Summary: How to Clean Up After ArgoCD Application Deletion

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- PersistentVolumes and PersistentVolumeClaims
- StatefulSets
- AppProject orphaned resource monitoring
- cert-manager and ExternalDNS cleanup considerations

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Annotations and Labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Delete StatefulSet task: https://kubernetes.io/docs/tasks/run-application/delete-stateful-set/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The post stated that StatefulSet PVCs are not automatically deleted. Updated this to clarify that PVCs are retained by default unless `.spec.persistentVolumeClaimRetentionPolicy` is configured to delete them.
- The PV reclaim-policy command filtered by namespace but only printed the claim name, so the namespace filter would not work reliably. Added `CLAIM_NAMESPACE:.spec.claimRef.namespace` to the output.
- The ConfigMap cleanup examples used a broad `grep -v kube-root-ca` filter and the complete script deleted all ConfigMaps, including `kube-root-ca.crt`. Updated the cleanup commands to preserve `configmap/kube-root-ca.crt`.
- The ServiceAccount cleanup examples used a broad `grep -v default` filter. Updated them to match only the default ServiceAccount.
- Several `xargs kubectl delete` examples could invoke `kubectl delete` with no resource arguments when no matching resources existed. Updated those pipelines to use `xargs -I {}`.
- The Argo CD tracking metadata cleanup referenced `argocd.argoproj.io/managed-by`, which is not listed as an Argo CD resource tracking annotation. Replaced it with the documented `argocd.argoproj.io/installation-id` annotation.
- The complete cleanup script did not delete non-service-account-token Secrets despite the post describing stale Secrets as part of cleanup. Added a matching Secret cleanup command.

## Review Notes
kubectl was not installed in the local environment, so command validation was performed against official Kubernetes and Argo CD documentation rather than local `kubectl --help` output. The post remains a general cleanup guide; operators should still tailor resource kinds and labels to their cluster conventions before running destructive cleanup commands.
