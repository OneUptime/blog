# Validation Summary: How to Develop and Test Talos Linux Locally

## Status
validated

## Post Type
Tutorial / Guide (practical workflows for local Talos development and testing)

## Technologies Covered
- Talos Linux
- talosctl CLI (cluster create/destroy/show, apply-config, patch, upgrade, logs, dmesg, processes, stats, read, list, dashboard, health, get extensions, get machineconfig)
- Docker (provisioner and local registry)
- QEMU / KVM
- Kubernetes / kubectl
- Talos Makefile build targets (installer, iso, talosctl, unit-tests, integration-test, e2e-docker / e2e-qemu)
- GitHub Actions (CI workflow example)
- Talos Image Factory (recommended path for system extensions)

## Sources Consulted
- Talos Docker local-platform docs — https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/local-platforms/docker/
- Talos QEMU local-platform docs — https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/local-platforms/qemu/
- talosctl CLI reference — https://docs.siderolabs.com/talos/v1.7/reference/cli/
- talosctl install guide — https://www.talos.dev/v1.7/talos-guides/install/talosctl/
- Talos Image Factory docs — https://www.talos.dev/v1.7/learn-more/image-factory/
- Talos configuration patches docs — https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- siderolabs/talos Makefile on GitHub — https://github.com/siderolabs/talos/blob/main/Makefile
- siderolabs/talos issue #9224 (deprecation of `.machine.install.extensions`) — https://github.com/siderolabs/talos/issues/9224

## Issues Found
1. **Provisioner list included VirtualBox and VMware.** `talosctl cluster create` only ships built-in `docker` and `qemu` provisioners. VirtualBox and VMware are supported as Talos *boot targets* via downloadable images, not as `--provisioner` options. Rewrote the "Local Development Options" section to list only Docker and QEMU and added a clarifying sentence about VirtualBox/VMware.
2. **Wrong kubeconfig path.** Post said `export KUBECONFIG=~/.talos/kubeconfig`. The official Docker local-platform guide states that `talosctl cluster create` merges the cluster into the user's default kubeconfig at `~/.kube/config` (and the talos client config goes to `~/.talos/config`). Removed the incorrect `export` lines in both the cluster-management section and the CI workflow example.
3. **Insecure `/dev/kvm` permissions advice.** Post recommended `sudo chmod 666 /dev/kvm`. The standard practice (and what the official QEMU guide implies via capability/group requirements) is to add the user to the `kvm` group with `sudo usermod -aG kvm "$USER"`. Updated the command and also removed `libvirt-daemon-system` (not required by the talosctl QEMU provisioner) and added `iptables`, which the official guide does require, plus a note about CNI plugins under `/opt/cni/bin`.
4. **Missing `sudo` for QEMU cluster create.** The official QEMU guide shows `sudo --preserve-env=HOME talosctl cluster create --provisioner qemu` because the provisioner needs to create tap devices and iptables rules. Added `sudo --preserve-env=HOME` to both QEMU `cluster create` invocations.
5. **Non-existent Makefile target `e2e-test`.** The Talos Makefile defines a pattern target `e2e-%` with concrete targets such as `e2e-docker` (and historically `e2e-qemu`), but no plain `e2e-test`. Updated the End-to-End Testing section to use `make e2e-docker` / `make e2e-qemu` and reworded the preceding text.
6. **Deprecated `.machine.install.extensions` workflow.** Workflow 3 created a patch with `machine.install.extensions` and applied it to a running node. That config field is deprecated; modern Talos installs extensions by baking them into the installer image (via the Talos `imager` or the Image Factory) and then upgrading the node to that installer. Rewrote Workflow 3 to describe the custom-installer/Image-Factory approach while keeping the same overall shape (build extension, push to local registry, create cluster, upgrade, verify with `talosctl get extensions`).

## Review Notes
- The `talosctl install` script URL `https://talos.dev/install` is current and matches the official install guide.
- `talosctl gen config <cluster> <endpoint>` syntax in Workflow 1 is correct; the example mixes a freshly generated config with an already-bootstrapped cluster, which is fine for illustrating the apply-config motion but may confuse readers who try to use the generated secrets on a cluster that was created with a different set.
- `talosctl patch machineconfig --patch @file` syntax is correct.
- `talosctl stats`, `talosctl processes`, `talosctl read`, `talosctl list`, `talosctl dmesg`, `talosctl logs`, `talosctl dashboard`, `talosctl health`, `talosctl get` all exist as used.
- The `ghcr.io/siderolabs/installer:v1.7.0` and `ghcr.io/siderolabs/kubelet:v1.29.0` image references are valid for the v1.7 era this post targets; readers on later Talos releases should bump the tags.
- The default Docker-provisioner CIDR is `10.5.0.0/24` so the first control-plane node at `10.5.0.2` referenced throughout the post is correct.
