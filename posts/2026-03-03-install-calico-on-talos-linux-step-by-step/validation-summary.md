# Validation Summary: How to Install Calico on Talos Linux Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl CLI)
- Project Calico (CNI plugin)
- Tigera Operator (Calico operator)
- Kubernetes (NetworkPolicy, kubectl)
- calicoctl (Calico CLI)
- Calico Installation CRD (operator.tigera.io/v1)
- Calico GlobalNetworkPolicy (projectcalico.org/v3)

## Sources Consulted
- [Sidero Labs Talos CLI reference (v1.6)](https://docs.siderolabs.com/talos/v1.6/reference/cli/)
- [Talos `apply-config` source on GitHub](https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/apply-config.go)
- [Talos Configuration Patches documentation](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching)
- [Calico v3.27 Installation API reference](https://archive-os-3-27.netlify.app/calico/3.27/reference/installation/api)
- [Calico v3.27 calicoctl overview](https://archive-os-3-27.netlify.app/calico/3.27/reference/calicoctl/overview)
- [calicoctl Homebrew formula](https://formulae.brew.sh/formula/calicoctl)
- [Tigera operator manifest for v3.27.0](https://github.com/projectcalico/calico/blob/v3.27.0/manifests/tigera-operator.yaml)
- [Configure calicoctl Kubernetes datastore docs](https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd)

## Issues Found

1. **Incorrect `talosctl apply-config` flag** — The post used `--patch` to apply a config patch to existing nodes. The canonical, documented flag for `talosctl apply-config` is `--config-patch` (short form `-p`). Changed all four `talosctl apply-config --nodes ... --patch @calico-talos-patch.yaml` lines in Step 1 to use `--config-patch`.

2. **Wrong Homebrew formula name** — The post instructed users to run `brew install calico` to install calicoctl on macOS. The actual Homebrew formula is named `calicoctl`, not `calico`. Updated the command to `brew install calicoctl`.

## Review Notes

- The `cluster.network.cni.name: none` value is correct for disabling Talos's built-in Flannel so a custom CNI can be installed.
- `flexVolumePath: /var/lib/kubelet/volumeplugins` is the correct, Talos-specific FlexVolume path required by Calico's Installation CRD.
- `nodeMetricsPort: 9091`, `linuxDataplane: Iptables`, and the IP pool fields (`blockSize: 26`, `encapsulation: VXLANCrossSubnet`, `natOutgoing: Enabled`, `nodeSelector: all()`) are all valid fields and values for `operator.tigera.io/v1` Installation in Calico v3.27.
- The `CALICO_DATASTORE_TYPE` and `CALICO_KUBECONFIG` environment variables are valid — calicoctl accepts both the bare names (`DATASTORE_TYPE`, `KUBECONFIG`) and a `CALICO_`-prefixed form, the latter being useful to avoid clashing with an existing `KUBECONFIG` already in the shell.
- The Tigera operator manifest URL `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml` is valid and resolves to the v3.27.0 release artifact.
- Calico v3.27 is the version referenced throughout the post; future readers should consider bumping to a newer Calico release (3.28+/3.29) for current production deployments, but everything documented here is accurate for v3.27.
- Kubernetes NetworkPolicy and GlobalNetworkPolicy examples are syntactically correct and use the right `apiVersion` (`networking.k8s.io/v1` and `projectcalico.org/v3` respectively).
