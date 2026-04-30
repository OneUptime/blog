# Validation Summary: How to Install Longhorn with kubectl

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Longhorn
- Kubernetes
- kubectl
- iSCSI (`open-iscsi` / `iscsi-initiator-utils`)
- PersistentVolumeClaims and StorageClasses

## Sources Consulted
- Longhorn Quick Installation: https://longhorn.io/docs/latest/deploy/install/
- Longhorn Install with Kubectl: https://longhorn.io/docs/latest/deploy/install/install-with-kubectl/
- Longhorn Customizing Default Settings: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn install `longhornctl`: https://longhorn.io/docs/latest/advanced-resources/longhornctl/install-longhornctl/
- Longhorn v1.11.1 deployment manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Longhorn v1.7.0 environment check script: https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/scripts/environment_check.sh
- Kubernetes: Change the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl` commands reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post pinned installation and manifest URLs to Longhorn `v1.7.0`, which is outdated relative to Longhorn's current official kubectl installation docs. I updated all manifest references to `v1.11.1`.
- The prerequisite `Kubernetes 1.21 or later` no longer matched the current installation requirements in Longhorn's official install guide. I updated it to `Kubernetes 1.25 or later`.
- The prerequisites section was missing current install requirements that materially affect successful installs. I added mount propagation and supported host filesystem requirements, and replaced the unsupported fixed `10 GiB` disk-space claim with workload-based sizing language.
- The RHEL/CentOS/Rocky Linux iSCSI setup was incomplete. I updated it to match Longhorn's documented flow by using `yum --setopt=tsflags=noscripts install -y iscsi-initiator-utils` and generating `/etc/iscsi/initiatorname.iscsi`.
- The environment-check step used the old `environment_check.sh` script from the `v1.7.0` branch. I replaced it with the current official `longhornctl check preflight` workflow.
- The StorageClass section implied that patching `longhorn` alone would always make it the cluster default. I clarified that the official deployment manifest already marks `longhorn` as default, and added the Kubernetes-documented step to remove the default annotation from the existing default StorageClass if Longhorn needs to be the only default.
- The conclusion incorrectly advised patching a Longhorn settings ConfigMap directly for runtime configuration. I replaced that with the supported `kubectl edit settings.longhorn.io <SETTING-NAME> -n longhorn-system` workflow.

## Review Notes
- The post is now aligned with Longhorn `v1.11.1`, which is the current stable version shown in the official docs as of 2026-04-30.
- The article now follows the current Longhorn recommendation to use `longhornctl` for preflight checks, but `longhornctl` must be installed locally before running that command.
- The example test workload validates `ReadWriteOnce` provisioning only. Longhorn's docs note additional NFSv4 client requirements for RWX workloads, which are outside the scope of this post.
