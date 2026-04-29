# Validation Summary: How to Install K3s on Raspberry Pi 4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi 4
- Raspberry Pi OS Lite (64-bit)
- kubectl
- Linux cgroups
- PersistentVolumeClaims (PVCs)

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Token CLI: https://docs.k3s.io/cli/token
- Raspberry Pi getting started / Imager customisation: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Raspberry Pi configuration documentation: https://www.raspberrypi.com/documentation/computers/configuration.html
- Raspberry Pi OS Bullseye update removing the default `pi` user: https://www.raspberrypi.com/news/raspberry-pi-bullseye-update-april-2022/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Persistent Volumes and PVCs: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post assumed a default `pi` user account for SSH and GPU-group membership, but modern Raspberry Pi OS requires creating a user during imaging or first boot. Updated the setup steps to explicitly create a user and changed the example commands to use `k3sadmin`.
- The cgroup instructions used the older `/boot/cmdline.txt` path and included `cgroup_enable=cpuset`, which is not part of the current K3s Raspberry Pi requirement. Updated the instructions to use `/boot/firmware/cmdline.txt`, aligned the appended parameters with current K3s documentation, and added a note for older Debian 11 / Raspberry Pi OS releases.
- The additional-node install example relied on `INSTALL_K3S_EXEC` being set before `sudo`, which is brittle when invoking the installer through `sudo`. Updated the command to `sudo sh -s - agent`, which explicitly installs the agent role while keeping the config-file-based flow intact.
- The sample Pi-hole deployment referenced a `PersistentVolumeClaim` named `pihole-data` without stating that the claim must already exist. Added a comment to make that dependency explicit.

## Review Notes
- The guide is technically valid for a single-server K3s cluster with additional agent nodes. Readers who want multiple server nodes for control-plane high availability should follow the K3s HA documentation instead of treating the agent-join step as an HA server procedure.
- The Pi-hole manifest is still an illustrative deployment example and assumes surrounding storage and service exposure are handled separately.
