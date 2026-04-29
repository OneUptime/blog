# Validation Summary: How to Upgrade K3s Using the Automated Upgrade Controller

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Rancher System Upgrade Controller
- `kubectl`
- Kubernetes Custom Resources (`Plan`)

## Sources Consulted
- K3s Automated Upgrades: https://docs.k3s.io/upgrades/automated
- K3s Manual Upgrades and release-channel guidance: https://docs.k3s.io/upgrades/manual
- K3s server-role documentation: https://docs.k3s.io/installation/server-roles
- Rancher System Upgrade Controller Plan API reference: https://github.com/rancher/system-upgrade-controller/blob/master/doc/plan.md
- Rancher System Upgrade Controller CRD manifest: https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml
- Rancher System Upgrade Controller deployment manifest: https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- K3s stable release channel endpoint: https://update.k3s.io/v1-release/channels/stable

## Issues Found
- The install command applied only `system-upgrade-controller.yaml`, but the current K3s documentation installs both `crd.yaml` and `system-upgrade-controller.yaml`. I updated the command so the `Plan` CRD is installed explicitly.
- The post pinned `version: v1.29.3+k3s1`, which is outdated as of the review date. I updated the examples to `v1.35.4+k3s1`, which the K3s stable channel resolved to on 2026-04-29, and added a note not to skip intermediate minor versions.
- The node-labeling section told readers to label both control-plane and worker nodes manually. Current K3s guidance already targets server nodes via the existing `node-role.kubernetes.io/control-plane=true` label and commonly targets agent nodes by selecting nodes where that label does not exist. I updated the section to verify labels instead of instructing redundant manual relabeling.
- The agent upgrade plan did not include the documented `prepare` step that makes agent upgrades wait for the server plan to complete. I added the `prepare` block with `k3s-server-upgrade`.
- The server plan comment implied the node would be cordoned before the upgrade and drained afterward, but `drain` happens before the upgrade and already implies cordoning. I corrected the explanation and removed the redundant `cordon: true` from the plans that already use `drain`.
- The troubleshooting note referred to `--force` and `--ignore-daemonsets` as if they were CLI flags inside the plan spec. I corrected this to the actual `drain` fields: `force: true` and `ignoreDaemonSets: true`.

## Review Notes
- For standard K3s server/agent clusters, the updated selectors are correct. Clusters that use split server roles such as dedicated `etcd`-only nodes may need additional plans or different selectors.
- The channel-based example remains technically correct and is the better long-term option when the goal is continuous automated upgrades without regularly updating a pinned version in the manifest.
