# Validation Summary: How to Connect Talos Nodes to Sidero Omni

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Sidero Omni
- Talos Linux
- `omnictl` CLI
- `talosctl` CLI
- SideroLink (WireGuard-based management VPN)
- Kubernetes
- Cluster Templates / MachineClass resources

## Sources Consulted
- omnictl CLI reference — https://docs.siderolabs.com/omni/reference/cli
- Install and Configure omnictl — https://docs.siderolabs.com/omni/getting-started/install-and-configure-omnictl
- Join machines to Omni — https://docs.siderolabs.com/omni/omni-cluster-setup/registering-machines/join-machines-to-omni
- Modify Kernel Arguments — https://docs.siderolabs.com/omni/infrastructure-and-extensions/modify-kernel-arguments
- Machine Registration — https://docs.siderolabs.com/omni/infrastructure-and-extensions/machine-registration
- Create a Machine Class — https://docs.siderolabs.com/omni/omni-cluster-setup/create-a-machine-class
- omni-docs on GitHub — https://github.com/siderolabs/omni-docs
- omnictl GitHub releases — https://github.com/siderolabs/omni/releases
- Manage Omni Resources with omnictl — https://docs.siderolabs.com/omni/reference/manage-omni-resources-with-omnictl

## Issues Found

The original post contained a large number of fabricated commands and CLI invocations that do not exist in `omnictl`. Each issue below was corrected against the official docs.

1. **Install script (`curl -sL https://omni.siderolabs.com/install | sh`)** — no such hosted installer exists. Replaced with the documented installation methods: `brew install siderolabs/tap/sidero-tools`, or downloading the platform-specific `omnictl-*` binary from the GitHub releases page.
2. **`omnictl auth login --url ...`** — this subcommand does not exist. Omnictl authenticates via browser the first time you run any command. Replaced with the documented flow: `omnictl config merge ./omniconfig.yaml` followed by `omnictl config contexts`.
3. **`omnictl get jointoken`** — wrong resource path. The correct top-level command is `omnictl jointoken` with subcommands `list`, `create`, `machine-config`, `kernel-args`, etc. Updated to `omnictl jointoken list` / `omnictl jointoken create` / `omnictl jointoken machine-config`.
4. **`omnictl machineconfig generate --omni-url ...`** — this command does not exist. The actual command to generate a join snippet is `omnictl jointoken machine-config` (optionally with `--join-token <id>`).
5. **`siderolink.api=https://your-omni-instance.siderolabs.com:8099`** — wrong protocol and port. Per the official kernel-args documentation, the URL scheme is `grpc://` (not `https://`), it must include a `?jointoken=<token>` query parameter, and the documented gRPC port is 8090. Corrected the example block accordingly.
6. **Applying SideroLink kernel args via `machine.install.extraKernelArgs` patch with `--mode no-reboot`** — `extraKernelArgs` only take effect on reinstall/upgrade, so `no-reboot` would not activate them. The recommended path for an already-running node is to apply the `siderolink` machine-config snippet emitted by `omnictl jointoken machine-config`. Rewrote this section to use that snippet, and added the documented caveat that machine-config-only joins are lost on a `talosctl reset` whereas kernel-args joins persist.
7. **`omnictl image-url`** — no such command. Removed and replaced with the actual `omnictl download` workflow (including the `--pxe` flag for PXE assets).
8. **`omnictl download --format ami --region us-east-1` etc.** — `omnictl download` does not take `--format` or `--region`. Its real flags are `--arch`, `--talos-version`, `--extensions`, `--output`, `--pxe`, and the image type is the first positional argument (matching an entry from the Omni "Download Installation Media" page, e.g. `iso`, `"Amazon AWS"`, `"Google Cloud"`, `"Azure"`). Rewrote the cloud-images block to reflect the actual interface.
9. **`omnictl cluster create <name>`** — no such command. Clusters are created declaratively via `omnictl cluster template sync -f <file>`. Replaced with a representative cluster-template YAML plus the documented `validate` / `sync` / `cluster status` flow.
10. **`omnictl cluster scale --control-planes N --workers N --machine-class ...`** — no such command. Scaling is done by editing the cluster template (the `size:` field on `ControlPlane` / `Workers`) and re-running `omnictl cluster template sync`. Replaced.
11. **`omnictl machineclass create <name> --label k=v ...`** — no such subcommand. Machine classes are YAML resources of type `MachineClasses.omni.sidero.dev`, applied with `omnictl apply -f`. Replaced with a real MachineClass YAML and `omnictl apply`.
12. **`omnictl machine label <id> --label ...`** — no such subcommand. Labels are added/removed through the Omni UI (Machines view) or via patches. Rewrote the "Configuring Machine Labels" section to reflect this, while keeping the valid `omnictl get machines -l <selector>` example (corrected flag from `--label` to `-l`).
13. **Troubleshooting commands `talosctl read /proc/net/dev` / `talosctl read /etc/resolv.conf`** — `/proc/net/dev` doesn't help diagnose SideroLink, and `/etc/resolv.conf` isn't the canonical inspection path on Talos. Replaced with `talosctl get links`, `talosctl get addresses`, and `talosctl get resolvers`, which are the documented resources for these checks.
14. **"UDP 8099: SideroLink (WireGuard) tunnel"** — the Omni docs state that the WireGuard port is assigned per account, not a fixed value. Reworded both the troubleshooting bullet and the security-considerations port table to call out that this value is per-account and visible in the Omni UI.
15. **Terraform `omni_machine` resource example** — there is no official Omni Terraform provider exposing this resource (only WIP community providers). Replaced the Terraform snippet in "Automating Node Registration" with the actually-supported IaC path: cluster templates / MachineClass YAML applied via `omnictl`.

## Review Notes

- The Talos 1.5+ prerequisite is left as-is. SideroLink/Omni in their current form work with recent Talos releases, and 1.5 is a reasonable conservative floor; pinning a more exact lower bound was not strongly supported by the docs I checked.
- Port 8090 is shown in the example `siderolink.api` URL because that is the port used in the official kernel-args example in the Omni docs. The exact port can differ for self-hosted Omni deployments and SaaS — readers running a custom install should substitute the one configured for their instance.
- The cluster-template YAML and MachineClass YAML examples are minimal-but-valid illustrations of the template grammar; production templates typically add `patches`, more granular `matchlabels` expressions, and Kubernetes manifest references. That is out of scope for an introductory connection guide.
- The "PXE Boot Flow" block is descriptive prose rather than runnable code, so it was left untouched.
