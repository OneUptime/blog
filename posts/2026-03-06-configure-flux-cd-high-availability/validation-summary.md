# Validation Summary: How to Configure Flux CD for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments
- Kubernetes leader election Leases
- Kustomize patches
- PodDisruptionBudget
- Pod topology spread constraints
- PersistentVolumeClaim
- PrometheusRule

## Sources Consulted
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux bootstrap customization guide: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux controller options for source-controller: https://fluxcd.io/flux/components/source/options/
- Flux controller options for kustomize-controller: https://fluxcd.io/flux/components/kustomize/options/
- Flux controller options for helm-controller: https://fluxcd.io/flux/components/helm/options/
- Flux controller options for notification-controller and image controllers: https://fluxcd.io/flux/components/notification/options/ and https://fluxcd.io/flux/components/image/options/
- Flux vertical scaling guide, including source-controller persistent artifact storage: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux sharding and horizontal scaling guide: https://fluxcd.io/flux/installation/configuration/sharding/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes PersistentVolume access modes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The initial Kustomize patch replaced the controllers' full `args` lists with only logging and leader-election flags. This would remove required Flux controller arguments such as source-controller storage settings. I changed it to scale Deployments separately and append the leader-election flag without replacing all args.
- The initial anti-affinity example used `$(CONTROLLER_NAME)`, which is not a valid Kustomize variable in that context and would not match controller pod labels. I removed the invalid generic anti-affinity from the all-controller patch and kept a per-controller topology spread pattern with explicit `app` labels.
- The HA scaling patch did not include the optional image automation controllers that the bootstrap command installs. I updated the controller name regex and PodDisruptionBudget examples to include `image-reflector-controller` and `image-automation-controller`.
- The leader-election section configured only source, kustomize, and helm controllers while the rest of the post also scaled notification-controller. I added notification-controller to the leader-election example.
- The persistent storage section used a single `ReadWriteOnce` PVC while also recommending replicas spread across nodes. Kubernetes documents `ReadWriteOnce` as mountable read-write by a single node, so this conflicts with cross-node HA. I changed the HA example to `ReadWriteMany` and added the caveat to use `ReadWriteOnce` only for a single source-controller replica or leave the default `emptyDir`.
- The source-controller PVC patch used a strategic merge that could leave conflicting volume source fields on the existing volume. I changed it to a JSON patch that replaces the existing volume and volumeMount, matching the Flux documentation pattern.
- The failure simulation command selected all running source-controller pods by label, so it could delete both replicas. I changed it to resolve one pod name first and delete only that pod.
- The statement that HA "ensures" an instance is always running was too absolute. I adjusted it to account for available schedulable cluster capacity.

## Review Notes
The revised examples still assume Flux-generated manifests use the standard controller labels such as `app: source-controller`. Resource values remain illustrative and should be tuned with production metrics. PrometheusRule examples require Prometheus Operator CRDs and kube-state-metrics/controller metrics to be scraped.
