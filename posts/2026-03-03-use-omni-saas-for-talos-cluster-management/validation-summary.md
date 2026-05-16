# Validation Summary: How to Use Omni SaaS for Talos Cluster Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Sidero Omni SaaS
- Talos Linux
- Kubernetes
- omnictl
- talosctl
- SideroLink / WireGuard
- Omni cluster templates

## Sources Consulted
- Sidero Omni documentation: https://docs.siderolabs.com/omni/getting-started/install-and-configure-omnictl
- Sidero Omni machine registration documentation: https://docs.siderolabs.com/omni/infrastructure-and-extensions/machine-registration
- Sidero Omni create cluster documentation: https://docs.siderolabs.com/omni/getting-started/create-a-cluster
- Sidero Omni cluster templates reference: https://docs.siderolabs.com/omni/reference/cluster-templates
- Sidero Omni omnictl CLI reference: https://docs.siderolabs.com/omni/reference/cli
- Sidero Omni upgrade documentation: https://docs.siderolabs.com/omni/cluster-management/upgrading-clusters
- Sidero Omni wipe machine documentation: https://docs.siderolabs.com/omni/cluster-management/wipe-a-machine
- Sidero Omni etcd backup documentation: https://docs.siderolabs.com/omni/cluster-management/etcd-backups
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/latest/reference/cli

## Issues Found
- The install and authentication flow used an unsupported `curl https://omni.siderolabs.com/install | sh` installer and `omnictl auth login`. Replaced it with the documented Homebrew install, `omnictl config merge`, and browser-triggered authentication through `omnictl get`.
- The installation media examples used non-existent `omnictl download installation-media --format ...` commands. Replaced them with documented `omnictl download <image name>` examples.
- The existing-node registration example used `omnictl get joinconfig` and `talosctl apply-config --config-patch-control-plane`, which do not match the current docs. Replaced them with `omnictl jointoken machine-config` and `talosctl patch machineconfig`.
- The Docker registration example used a non-existent `omnictl cluster template create --provider docker` command. Replaced it with the documented Talos QEMU Omni endpoint flow.
- CLI cluster creation, scaling, and configuration examples used unsupported `omnictl cluster create`, `omnictl cluster scale`, and `omnictl machineconfig patch` commands. Replaced them with multi-document cluster templates and `omnictl cluster template validate/sync/status`.
- The cluster template schema used incorrect fields such as `controlPlane.machineCount` and `workers.machineCount`. Replaced them with documented `kind: ControlPlane`, `kind: Workers`, `machines`, and `machineClass.size` documents.
- Upgrade examples used unsupported `omnictl cluster upgrade` and `omnictl cluster kubernetes-upgrade` commands. Replaced them with template version updates and `omnictl cluster status`.
- Kubeconfig and service-account examples were incomplete. Updated them to include the documented `--service-account` and required `--user` flag.
- Monitoring examples used unsupported `omnictl talosctl` and event commands. Replaced them with documented resource queries, `omnictl talosconfig`, and `omnictl machine-logs`.
- Machine lifecycle examples used unsupported `omnictl machine reboot/wipe/remove/label` commands. Replaced them with documented template removal, machine lock/unlock, and label inspection examples.
- Access control examples used unsupported `omnictl user invite/remove` commands and informal role names. Replaced them with documented `user create`, `user set-role`, `user list`, and `user delete` commands.
- Backup examples used a direct `talosctl etcd snapshot` through a non-existent Omni talosctl wrapper. Replaced them with the documented `EtcdManualBackups.omni.sidero.dev` resource flow and backup status checks.

## Review Notes
Omni's current CLI documentation emphasizes cluster templates for declarative cluster creation and ongoing management. Future edits should avoid inventing imperative `omnictl cluster create/scale/upgrade` workflows unless the official CLI reference adds those commands.
