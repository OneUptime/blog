# Validation Summary: How to Use Talos Linux with Omni SaaS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Sidero Omni SaaS
- omnictl
- talosctl
- Kubernetes
- Cluster templates
- Machine classes
- SideroLink / WireGuard
- Proxmox VM import

## Sources Consulted
- Sidero Omni documentation: Install and Configure Omnictl - https://docs.siderolabs.com/omni/getting-started/install-and-configure-omnictl
- Sidero Omni documentation: Machine Registration - https://docs.siderolabs.com/omni/infrastructure-and-extensions/machine-registration
- Sidero Omni documentation: Join machines to Omni - https://docs.siderolabs.com/omni/omni-cluster-setup/registering-machines/join-machines-to-omni
- Sidero Omni documentation: Create a Cluster - https://docs.siderolabs.com/omni/getting-started/create-a-cluster
- Sidero Omni documentation: Cluster Templates reference - https://docs.siderolabs.com/omni/reference/cluster-templates
- Sidero Omni documentation: Manage Omni Resources with omnictl - https://docs.siderolabs.com/omni/reference/manage-omni-resources-with-omnictl
- Sidero Omni documentation: Use Kubectl With Omni - https://docs.siderolabs.com/omni/getting-started/use-kubectl-with-omni
- Sidero Omni documentation: Upgrade Omni Clusters - https://docs.siderolabs.com/omni/cluster-management/upgrading-clusters
- Sidero Omni documentation: Set Initial Machine Labels - https://docs.siderolabs.com/omni/omni-cluster-setup/how-to-set-initial-machine-labels
- Sidero Omni documentation: Create a Machine Class - https://docs.siderolabs.com/omni/omni-cluster-setup/create-a-machine-class
- Sidero Omni documentation: Omni Firewall and Egress Requirements - https://docs.siderolabs.com/omni/omni-cluster-setup/omni-firewall-egress-requirement
- Current omnictl CLI help from the latest official Sidero Labs GitHub release.

## Issues Found
- The omnictl installation and login commands used an undocumented install URL and a non-current `omnictl auth login` flow. Updated the section to use the documented Homebrew package, `omniconfig.yaml` placement, and `omnictl get cluster` authentication trigger.
- The image download examples used account-specific Omni URLs that are not the documented current flow. Replaced them with `omnictl download` examples and described the generated SideroLink connection parameters.
- The Proxmox example imported a compressed `.raw.xz` image as `.raw`. Added an `xz -d` step before `qm importdisk`.
- The cluster creation template was not a valid Omni cluster template and used nonexistent `omnictl assign machine` commands. Replaced it with a multi-document `Cluster`, `ControlPlane`, and `Workers` template and the documented `omnictl cluster template validate/sync/status` commands.
- The kubeconfig and talosconfig examples relied on shell redirection instead of the documented local path and merge flags. Updated them to use explicit output paths with `--merge=false --force`.
- The cluster template example used unsupported `controlPlane` and `workers` fields inside the `Cluster` document and omitted the required Talos version. Replaced it with validated multi-document YAML using `machineClass`.
- The upgrade commands `omnictl upgrade talos` and `omnictl upgrade kubernetes` are not present in the current CLI. Replaced them with the documented template-managed version update workflow.
- The machine-label commands used a nonexistent `omnictl label machine` command. Replaced them with documented initial labels on generated media and a `MachineClasses.omni.sidero.dev` resource applied with `omnictl apply`.
- The troubleshooting section said only outbound HTTPS/443 was required. Updated it to include the Omni SaaS SideroLink UDP 51820 requirement.

## Review Notes
The current Omni documentation emphasizes UI-driven upgrades for many clusters and template synchronization for template-managed clusters. The post now shows the template-managed path. The cluster template snippets were validated locally with the latest `omnictl` parser after replacing placeholder machine IDs with UUID-shaped values.
