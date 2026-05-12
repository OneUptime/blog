# Validation Summary: How to Roll Out Crypto Authentication for Calico Node Traffic Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 FelixConfiguration)
- Kubernetes
- WireGuard
- BGP control plane
- `calicoctl` / `kubectl` / `wg` CLI tools

## Sources Consulted
- [Calico Felix configuration reference](https://docs.tigera.io/calico/latest/reference/resources/felixconfig)
- [Calico: Encrypt in-cluster pod traffic](https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic)
- [projectcalico/calico felix config_params.go (source of truth for field names and defaults)](https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go)
- [Tigera blog: Introducing WireGuard Encryption with Calico](https://www.tigera.io/blog/introducing-wireguard-encryption-with-calico/)
- `wg(8)` man page for valid `wg show` subcommands

## Issues Found
1. **Incorrect FelixConfiguration field name `wireguardInterfaceMTU`.** Calico's FelixConfiguration uses `wireguardMTU` (and `wireguardMTUV6` for IPv6). There is no `wireguardInterfaceMTU` field — the closest similarly-named field is `wireguardInterfaceName`. Fixed by renaming the field to `wireguardMTU` in the YAML snippet.
2. **Incorrect WireGuard interface name `calico.wireguard`.** The default Calico WireGuard interface name is `wireguard.cali` for IPv4 (with `wg-v6.cali` for IPv6), per the Felix `config_params.go` defaults. Fixed the `wg show calico.wireguard peers` command to use `wg show wireguard.cali peers`.

## Review Notes
- The "Calico v3.26+" prerequisite is conservative. WireGuard data-plane encryption shipped in Calico v3.14, host-to-host encryption (`wireguardHostEncryptionEnabled`) followed later. The author's v3.26+ floor is safe but stricter than strictly necessary; left as-is since it is not technically incorrect.
- Linux kernel 5.6+ is correct as the in-tree WireGuard merge version. Older kernels can also work via the `wireguard-dkms` backport, but stating 5.6+ is accurate and the simplest correct guidance.
- The annotation `projectcalico.org/WireguardPublicKey` on the Node object is correct; Calico publishes the per-node public key there.
- The `wg show <interface> peers` subcommand is a valid `wg(8)` form.
- Minor grammatical awkwardness in the introduction ("This guide covers roll out crypto authentication...") was left untouched since the task limits fixes to technical errors only.
