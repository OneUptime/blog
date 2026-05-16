# Validation Summary: How to Manage Multiple Talos Clusters with Omni

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Sidero Omni
- omnictl CLI
- talosctl CLI
- Kubernetes
- kubectl
- Prometheus / Thanos
- Bash automation

## Sources Consulted
- Sidero Omni documentation: omnictl CLI reference, https://docs.siderolabs.com/omni/reference/cli
- Sidero Omni documentation: Cluster Templates reference, https://docs.siderolabs.com/omni/reference/cluster-templates
- Sidero Omni documentation: Manage Omni Resources with omnictl, https://docs.siderolabs.com/omni/reference/manage-omni-resources-with-omnictl
- Sidero Omni documentation: Set Initial Machine Labels, https://docs.siderolabs.com/omni/omni-cluster-setup/how-to-set-initial-machine-labels
- Sidero Omni documentation: Create a Machine Class, https://docs.siderolabs.com/omni/omni-cluster-setup/create-a-machine-class
- Sidero Omni documentation: Create a Patch for Cluster Machines, https://docs.siderolabs.com/omni/omni-cluster-setup/create-a-patch-for-cluster-machines
- Sidero Omni documentation: Cluster Template, https://docs.siderolabs.com/omni/omni-cluster-setup/cluster-template
- Sidero Omni documentation: Upgrading Clusters, https://docs.siderolabs.com/omni/cluster-management/upgrading-clusters
- Sidero Omni documentation: Manage Users in Omni, https://docs.siderolabs.com/omni/security-and-authentication/manage-user-in-omni
- Already-validated companion post: posts/2026-03-03-use-omni-for-talos-linux-upgrades

## Issues Found
- `omnictl machine label $MACHINE_ID --label ...` does not exist. Labels are baked into installation media at provisioning time. Replaced with `omnictl download iso --initial-labels ...` examples and a note that further label edits go through the dashboard or `omnictl apply` on the machine resource.
- `omnictl machineclass create cp-large --match-labels ...` does not exist. Machine classes are declarative resources. Replaced with `MachineClasses.omni.sidero.dev` YAML manifests applied via `omnictl apply -f`. Also corrected the field name to `spec.matchlabels` (lowercase, per docs).
- The cluster template YAML was malformed: it nested `controlPlane`, `workers`, and `patches` inside a single `Cluster` document and included a non-existent `machineClass.matchLabels` field. Rewrote the template as a multi-document YAML with separate `kind: Cluster`, `kind: ControlPlane`, and `kind: Workers` documents and corrected `machineClass` to use `name` and `size` only. Also added the required `talos.version` field under the `Cluster` document.
- `omnictl cluster template apply -f ...` does not exist. The correct subcommand is `omnictl cluster template sync --file ...`. Added `validate` and `diff` steps as documented best practice.
- `omnictl machineconfig patch <cluster> --patch @file` does not exist. There is no `machineconfig` subcommand. Replaced with the documented workflow of declaring the patch as a `file:` entry in the `Cluster` document's `patches` list and re-syncing the template.
- `omnictl cluster upgrade <cluster> --talos-version ...` and `omnictl cluster kubernetes-upgrade <cluster> --to ...` do not exist. Talos and Kubernetes upgrades are performed by editing the cluster template's `talos.version` / `kubernetes.version` and running `omnictl cluster template sync`. Replaced the manual upgrade snippets and the fleet-upgrade Bash script accordingly, and added `omnictl cluster kubernetes upgrade-pre-checks` (which is documented).
- `omnictl cluster status -o json` was used with a `jq '.phase'` polling loop. Replaced with `omnictl cluster template status --file <template>`, which is the documented "wait for ready" command.
- `omnictl user invite <email> --role <role>` does not exist. Replaced with `omnictl user create <email> --role <Role>` and corrected role names to PascalCase (`Admin`, `Operator`, `Reader`) to match the documented role set and other validated posts in this repo.
- `omnictl kubeconfig --cluster X > file.kubeconfig` is fragile because the command also writes/merges its own files. Replaced with the documented `omnictl kubeconfig --cluster X --force <local-path>` form, and updated the `use-context` examples to the Omni-generated context name `admin@<cluster>`.
- `omnictl talosctl --nodes $MACHINE_ID -- health` does not exist. There is no `omnictl talosctl` subcommand. Replaced with `omnictl talosconfig --cluster <cluster> --force <file>` followed by `talosctl --talosconfig <file> --nodes <ip> health` using the standalone `talosctl` binary.
- `omnictl cluster template export prod-us-east-1 > backup.yaml` uses incorrect argument shape. Replaced with `omnictl cluster template export --cluster prod-us-east-1 --output backup-prod-east.yaml` per the documented flags, and changed the follow-up to `omnictl cluster template sync --file ...`.
- Removed the speculative `omnictl get clusters -o table` output sample; the column set was not verifiable from docs. Kept a simpler `omnictl get clusters` example and added `omnictl get resourcedefinitions` for resource discovery.

## Review Notes
- The environment-specific kubelet/sysctls YAML snippets (staging-config.yaml, production-config.yaml) are presented as Talos config patches and are syntactically valid Talos machine config; they were left unchanged. They are meant to be referenced from the template's `patches:` list (as shown in the security patch example), not applied directly through a now-removed `omnictl machineconfig patch` command.
- The Prometheus / Thanos remote-write snippet is a standard kube-prometheus-stack values fragment and is technically correct.
- Specific version numbers (Talos v1.6.7 / v1.7.0, Kubernetes v1.29.2 / v1.30.0) are illustrative; readers should consult the current Omni-supported version compatibility matrix before upgrading.
- The fleet-upgrade Bash script uses `yq` for in-place YAML edits; readers will need `yq` v4+ installed.
