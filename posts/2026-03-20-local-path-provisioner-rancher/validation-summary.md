# Validation Summary: How to Set Up Local Path Provisioner for Development in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Local Path Provisioner
- Rancher / K3s
- Kubernetes PersistentVolumeClaims and StorageClasses
- `kubectl`
- PostgreSQL container deployment

## Sources Consulted
- Rancher Local Path Provisioner official repository and README: https://github.com/rancher/local-path-provisioner
- K3s Volumes and Storage documentation: https://docs.k3s.io/add-ons/storage
- K3s packaged `local-storage.yaml` manifest: https://github.com/k3s-io/k3s/blob/main/manifests/local-storage.yaml
- K3s server CLI reference for `--default-local-storage-path`: https://docs.k3s.io/cli/server
- Kubernetes task docs for changing the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes StorageClass documentation, including `WaitForFirstConsumer`: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Docker Official Image documentation for `postgres`: https://hub.docker.com/_/postgres

## Issues Found
- The install command was pinned to `rancher/local-path-provisioner` `v0.0.26`, which is not the current stable manifest referenced by the upstream project. I updated it to `v0.0.35`.
- The verification command assumed the provisioner always runs in the `local-path-storage` namespace. That is true for the upstream manifest, but K3s packages the provisioner in `kube-system`. I changed the command to `kubectl get pods -A -l app=local-path-provisioner` so it works in both cases.
- The default StorageClass section implied that patching `local-path` to `true` was sufficient by itself. Kubernetes allows multiple default StorageClasses, and K3s already marks `local-path` as default. I updated the step to note the K3s default behavior and to unset the current default first when needed.
- The PVC test claimed the claim should bind immediately after creating only the PVC. The packaged `local-path` StorageClass uses `volumeBindingMode: WaitForFirstConsumer`, so binding is deferred until a consuming Pod exists. I added a Pod to the example and updated the expected result accordingly.
- The ConfigMap example embedded a `# Custom storage path` comment inside `config.json`, which made the JSON invalid. I removed the inline JSON comment and clarified the namespace difference between K3s and a manual upstream installation.
- The development deployment snippet was not a runnable Kubernetes manifest because it lacked `apiVersion`, `kind`, `metadata`, `selector`, `template`, and a required PostgreSQL initialization environment variable. I replaced it with a valid `Deployment` manifest and added `POSTGRES_PASSWORD` for the official `postgres:16` image.
- The introduction stated that the provisioner automatically creates `hostPath` PersistentVolumes. Upstream documentation states it can create either `hostPath` or `local` PersistentVolumes depending on configuration, and K3s defaults to `local`. I corrected that description.

## Review Notes
- The post is now technically accurate for both the upstream Local Path Provisioner manifest and the K3s-packaged addon, but readers should still re-check the pinned release URL over time because the recommended stable version can change.
- K3s exposes the storage location through the `--default-local-storage-path` server option, so K3s users may prefer changing that setting instead of editing the packaged ConfigMap directly.
