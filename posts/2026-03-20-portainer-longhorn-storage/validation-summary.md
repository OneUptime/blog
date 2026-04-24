# Validation Summary: How to Deploy Longhorn Storage and Manage via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Portainer
- Kubernetes
- Helm
- Kubernetes StorageClass
- Kubernetes StatefulSet
- Kubernetes PersistentVolumeClaim
- Kubernetes Ingress
- AWS S3 backup target configuration

## Sources Consulted
- Longhorn installation requirements and preflight checks: https://longhorn.io/docs/latest/deploy/install/
- Longhorn Helm installation: https://longhorn.io/docs/1.10.0/deploy/install/install-with-helm/
- Longhorn latest documentation index: https://longhorn.io/docs/latest/
- Longhorn release status and latest stable version: https://github.com/longhorn/longhorn/releases
- Longhorn customizing default settings with Helm and kubectl: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn storage class parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn UI access and ingress guidance: https://longhorn.io/docs/latest/deploy/accessing-the-ui/
- Longhorn NGINX ingress example: https://longhorn.io/docs/1.9.1/deploy/accessing-the-ui/longhorn-ingress/
- Longhorn snapshot creation via CRD: https://longhorn.io/docs/1.10.1/snapshots-and-backups/setup-a-snapshot/
- Longhorn backup target configuration: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Portainer Kubernetes applications: https://docs.portainer.io/user/kubernetes/applications
- Portainer create application from manifest: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer Kubernetes volumes: https://docs.portainer.io/2.33-lts/user/kubernetes/volumes
- Portainer inspect a Kubernetes volume: https://docs.portainer.io/2.27/user/kubernetes/volumes/inspect
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume and PVC expansion documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post pinned Longhorn to `1.6.0`, which is outdated as of April 24, 2026. I updated the install and preflight references to `1.11.1`, the current latest stable release shown in the official Longhorn releases page.
- The prerequisite check used `scripts/environment_check.sh` from `v1.6.0`. That script path is no longer valid for the current release line, so I replaced it with the supported `longhornctl check preflight` workflow from the official installation docs.
- The prerequisites were incomplete for a guide that also covers backups. Longhorn’s docs state that backup support requires NFSv4 client packages on each node, so I added the NFS client requirement and matching install commands.
- The RHEL-family `open-iscsi` install example was incomplete relative to Longhorn’s current docs. I updated it to the documented `iscsi-initiator-utils` installation flow and added the initiator name configuration.
- The ingress example referenced a basic-auth secret that was never created and used a secret name that did not match Longhorn’s documented ingress example. I added the auth file and secret creation commands and corrected the secret reference.
- The StatefulSet manifest was missing the governing headless Service required for stable network identity. I added the `Service` resource in the same manifest so the example is complete.
- The snapshot example used a direct HTTP API call that is not the current documented workflow for this use case. I replaced it with the official Longhorn `Snapshot` CRD example pattern.
- The backup target example used a settings-based manifest without creating the referenced credentials secret and did not reflect current Longhorn backup target configuration guidance. I replaced it with an explicit S3 secret example plus a Helm-based backup target update using the chart’s documented `defaultBackupStore` values.
- The Portainer volume-management steps were too UI-path-specific and did not match Portainer’s current docs closely enough. I updated them to the documented `Volumes` view and the `Increase size` action.
- The PVC expansion command did not specify a namespace. I made it explicit with `-n default` to match the example workload.

## Review Notes
- `kubectl` was not installed in the review workspace, so I could not run `kubectl apply --dry-run=client`. The updated YAML snippets were syntax-checked locally with Python and PyYAML instead.
- Longhorn releases move quickly. If this post is republished later, verify the latest chart and CLI version again before publishing.
