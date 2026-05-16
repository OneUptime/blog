# Validation Summary: How to Upgrade Talos Linux to a Newer Version

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- Sidero Labs Image Factory and imager

## Sources Consulted
- Sidero Labs Talos v1.12 upgrade guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Sidero Labs Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos v1.7 upgrade guide: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Sidero Labs Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Sidero Labs Talos boot assets guide: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Sidero Labs Talos disaster recovery guide: https://docs.siderolabs.com/talos/v1.12/advanced/disaster-recovery
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post said Talos versions are tied to specific Kubernetes versions. I changed this to say Talos releases support specific Kubernetes version ranges and that Talos OS upgrades do not upgrade Kubernetes by default, matching the official Talos upgrade guide.
- The post used `kubectl version --short`, which is no longer listed in the current official kubectl command reference. I changed it to `kubectl version`.
- The machine configuration backup command saved the Talos resource wrapper instead of the machine configuration spec. I changed it to fetch `machineconfig v1alpha1` and extract `.spec`, matching Sidero's disaster recovery guidance.
- The upgrade sequence omitted the cordon/drain and final uncordon behavior. I updated the sequence to match the official Talos upgrade process.
- The `--preserve` explanation said it preserves configuration and ephemeral data. I clarified that older Talos releases expose `--preserve` to preserve the EPHEMERAL partition, and changed the example to `--preserve=true`.
- The custom installer image section used `docker push` without loading or tagging the generated installer archive. I changed it to `crane push /tmp/out/metal-amd64-installer.tar ...`, which matches Sidero's documented imager workflow.
- The staged upgrade section incorrectly described `--stage` as preparing an upgrade without rebooting immediately. I corrected it to explain that Talos stages the upgrade, reboots, applies the upgrade early in boot, and reboots again.

## Review Notes
The examples still use Talos v1.7.0 as the target image because the post is written around that concrete version, but v1.7 is old. Future revisions should either use the current Talos release in all examples or replace version strings with explicit placeholders such as `<target-version>` to avoid stale commands.
