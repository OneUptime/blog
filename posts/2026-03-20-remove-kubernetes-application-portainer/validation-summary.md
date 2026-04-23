# Validation Summary: How to Remove a Kubernetes Application in Portainer - Application

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- Kubernetes labels and selectors
- PersistentVolumeClaims (PVCs) and PersistentVolumes (PVs)

## Sources Consulted
- Portainer Applications overview: https://docs.portainer.io/user/kubernetes/applications
- Portainer Remove an application: https://docs.portainer.io/user/kubernetes/applications/remove
- Portainer Inspect an application: https://docs.portainer.io/user/kubernetes/applications/inspect
- Portainer Detach a volume from an application: https://docs.portainer.io/user/kubernetes/applications/detach-volume
- Portainer Remove a volume: https://docs.portainer.io/user/kubernetes/volumes/remove
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Garbage Collection: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The Portainer UI flow overstated the available delete path. The post said you could open an application and click a `Delete` button, but the official Portainer removal doc documents removing an application from the Applications list via checkbox plus `Remove`. I updated the steps to match the documented flow.
- The overview and deletion-behavior section overstated what gets removed. Deleting a workload does not automatically delete separate resources such as Services, ConfigMaps, Secrets, Ingresses, or PVCs. I revised the explanation to distinguish controller-managed dependents from separate Kubernetes resources.
- The label-based cleanup section incorrectly implied `kubectl delete all` would remove all application resources. In Kubernetes, `all` does not cover resources like ConfigMaps, Secrets, Ingresses, or PVCs. I replaced the example with explicit resource-type deletions.
- The PVC warning was too absolute. Deleting a PVC may also delete the backing storage, depending on the bound PV reclaim policy. I corrected the warning and note to reflect reclaim-policy-dependent behavior.
- The verification section used `kubectl get all` to check for “any leftover resources,” which would miss ConfigMaps, Secrets, and PVCs. I replaced it with explicit verification commands for workload/networking resources and configuration/storage resources.
- The manifest-directory example was tightened to use the recursive flag so the “directory of manifests” example is safer for nested manifest layouts.

## Review Notes
- Portainer documents generic application removal and volume removal separately; the edited post now avoids implying that removing an application automatically removes attached volumes.
- Portainer also distinguishes generic Kubernetes applications from Helm applications in its docs. The revised post avoids overgeneralizing behavior that depends on deployment method.
- `kubectl` was not installed in this workspace, so CLI validation was performed against the official Kubernetes documentation rather than local `kubectl --help` output.
