# Validation Summary: How to Set Up etcd Advertised Subnets in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane networking
- Talos machine configuration

## Sources Consulted
- Talos Linux multihoming documentation: https://docs.siderolabs.com/talos/v1.12/networking/multihoming/
- Talos MachineConfig reference for `cluster.etcd.advertisedSubnets` and `cluster.etcd.listenSubnets`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos CLI reference for `talosctl patch machineconfig`, `talosctl etcd members`, `talosctl etcd status`, `talosctl service`, and `talosctl logs`: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos 1.2 release notes for etcd `advertisedSubnets` and `listenSubnets` behavior: https://www.talos.dev/v1.2/introduction/what-is-new/
- etcd tuning documentation for heartbeat/election sensitivity to latency: https://etcd.io/docs/v3.7/tuning/
- etcd failure mode documentation for leader election write behavior: https://etcd.io/docs/v3.5/op-guide/failures/

## Issues Found
- The post said Talos selects the etcd advertised address from the default route. Talos documentation says the default advertised IP is selected as the first routable address of the node, so the wording was corrected.
- The post described `advertisedSubnets` as controlling both peer communication and client traffic. The field controls the advertised etcd IP for peer communication; `listenSubnets` controls listening for peer and client connections and defaults to `advertisedSubnets` when unset. The description and dual-stack notes were adjusted.
- The existing-cluster commands used `talosctl apply-config --patch`, which is not the correct live-node patch workflow. They were changed to `talosctl patch machineconfig --patch @etcd-subnet-patch.yaml --mode no-reboot`.
- The post said `talosctl service etcd` shows the advertise address. The command reports service status, so the text now directs readers to use `talosctl etcd members` for advertised peer/client URLs.
- The post stated that changing the advertised subnet does not require a full reboot. Talos documentation notes that most etcd configuration changes are accepted on the fly but fully applied only after reboot, so the guidance now explains `--mode no-reboot` and the need for controlled rolling reboots when required.
- The multiple-subnet example implied strict first-match fallback behavior. The text was corrected to say Talos picks from node addresses matching the configured subnets.

## Review Notes
The post is technically relevant and the corrected configuration fields and commands match current Talos documentation. The local environment did not have `talosctl` installed, so CLI verification was performed against official Talos CLI documentation rather than local `--help` output.
