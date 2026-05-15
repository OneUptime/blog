# Validation Summary: How to Use Kubernetes YAML with podman kube play on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- `podman kube play`
- Kubernetes YAML manifests
- Kubernetes Pods, Deployments, PersistentVolumeClaims, ConfigMaps, Secrets, DaemonSets, and Jobs
- Quadlet systemd `.kube` units

## Sources Consulted
- Podman `podman kube play` official documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman Quadlet `.kube` unit official documentation: https://docs.podman.io/en/latest/markdown/podman-kube.unit.5.html
- Red Hat Enterprise Linux 9 container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/assembly_starting-with-containers_building-running-and-managing-containers

## Issues Found
- The description claimed the post covers Service YAML. Current Podman documentation lists supported kinds as Pod, Deployment, PersistentVolumeClaim, ConfigMap, Secret, DaemonSet, and Job, not Service. Changed the description to "related YAML manifests."
- The multi-container UBI minimal example used `/bin/bash`. Changed it to `/bin/sh` for better portability with minimal images.
- The Deployment section said Podman creates separate pods for each replica. Current Podman documentation says the Deployment `replicas` field is supported syntactically, but the actual replica count is ignored and set to 1. Updated the explanation accordingly.
- The `--start` example described the option as detached mode. Official documentation defines `--start` as controlling whether Podman starts the pod after creating it. Updated the comment and used `--start=true`.
- The Quadlet example wrote to `~/.config/containers/systemd/webapp.kube` without ensuring that the directory exists. Added `mkdir -p ~/.config/containers/systemd`.
- The supported resources table listed Service as limited. Replaced Service with DaemonSet and Job to match the current official Podman supported-kind list.

## Review Notes
Podman supports only a subset of Kubernetes YAML and the exact support matrix can vary by Podman version shipped with a given RHEL minor release. The post now avoids the main incorrect claims, but future updates should keep the supported-kind table aligned with the Podman version targeted by the article.
