# Validation Summary: How to Install Longhorn on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Linux package management (`apt`, `yum`)
- Kubernetes `StorageClass`
- Kubernetes `PersistentVolumeClaim`

## Sources Consulted
- Longhorn archived quick installation docs for 1.7.3: https://longhorn.io/docs/archives/1.7.3/deploy/install/
- Longhorn archived `kubectl` installation docs for 1.7.3: https://longhorn.io/docs/archives/1.7.3/deploy/install/install-with-kubectl/
- Longhorn archived UI access docs for 1.7.3: https://longhorn.io/docs/archives/1.7.3/deploy/accessing-the-ui/
- Longhorn archived best practices for 1.7.3: https://raw.githubusercontent.com/longhorn/website/master/content/docs/archives/1.7.3/best-practices.md
- Longhorn archived volume creation docs for 1.7.3: https://raw.githubusercontent.com/longhorn/website/master/content/docs/archives/1.7.3/nodes-and-volumes/volumes/create-volumes.md
- Longhorn 1.7.3 deployment manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.7.3/deploy/longhorn.yaml
- Longhorn 1.7.3 installation source docs: https://raw.githubusercontent.com/longhorn/website/master/content/docs/archives/1.7.3/deploy/install/_index.md
- Longhorn 1.7.3 `kubectl` install source docs: https://raw.githubusercontent.com/longhorn/website/master/content/docs/archives/1.7.3/deploy/install/install-with-kubectl.md
- Longhorn 1.7.3 UI access source docs: https://raw.githubusercontent.com/longhorn/website/master/content/docs/archives/1.7.3/deploy/accessing-the-ui/_index.md
- CNCF Longhorn project page: https://www.cncf.io/projects/longhorn/

## Issues Found
- The prerequisites section was incomplete and partly incorrect. I corrected it to match the archived 1.7.3 docs by adding the `iscsid` requirement, the NFSv4 requirement for RWX, filesystem support requirements (`ext4` or `XFS`), mount propagation, and the official minimum recommended hardware of 3 nodes with 4 vCPU and 4 GiB RAM per node.
- The post used the deprecated `environment_check.sh` flow as the primary prerequisite check. I replaced it with the official `longhornctl check preflight` workflow that Longhorn introduced in the 1.7 line.
- The package installation commands were incomplete for the documented prerequisites. I updated the Debian/Ubuntu and RHEL/CentOS examples to include the packages and `iscsid` setup documented for Longhorn 1.7.x, including the `iscsi-initiator-utils` setup required by the RHEL-family instructions.
- The installation manifest URL was pinned to `v1.7.0`. I updated it to `v1.7.3`, the latest archived patch release in the 1.7 series, so the guide points to the maintained 1.7.x documentation and manifest.
- The verification section understated the expected pod set. I expanded it to include `longhorn-ui`, `longhorn-csi-plugin`, and the CSI sidecar pods shown in the official installation docs.
- The default `StorageClass` section implied that `longhorn` is not default by default. I corrected that because the official `v1.7.3` manifest already marks the `longhorn` `StorageClass` as default.
- The instruction to "remove" the default annotation from another `StorageClass` did not match the command shown, which actually sets the annotation to `false`. I corrected the wording and clarified that `local-path` is only an example name.
- The monitoring section referred to a generic CLI, but the commands shown are `kubectl` commands. I corrected the wording.

## Review Notes
As of 2026-04-30, this post is accurate as a Longhorn 1.7.x installation guide, but it is version-specific rather than a latest-version guide. The current latest Longhorn docs are for 1.11.1, which require Kubernetes 1.25 or later, so a future refresh should either retitle the post as a 1.7.x guide or update it to the current release line.
