# Validation Summary: How to Verify Pod Networking with Calico in nftables Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes NetworkPolicy
- nftables
- iptables legacy tools
- kubectl
- calicoctl

## Sources Consulted
- Calico nftables data plane guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico source for nftables table creation and table names: https://github.com/projectcalico/calico/blob/v3.32.0/felix/dataplane/linux/int_dataplane.go
- Calico source for nftables base chains: https://github.com/projectcalico/calico/blob/v3.32.0/felix/nftables/table.go
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Local `nft --help` output for `nft list` command syntax.

## Issues Found
- The post used `iptablesBackend: nft` as the primary verification for Calico nftables mode. I changed this to check `nftablesMode` and, for operator installations, `linuxDataplane: Nftables`, because `iptablesBackend: NFT` refers to the iptables-nft compatibility backend rather than Calico's nftables dataplane.
- The expected nftables table names were incorrect. I changed `calico-filter`, `calico-nat`, `calico-mangle`, and `calico-raw` to Calico's actual nftables root table names, `table ip calico` and `table arp calico-arp`, with an IPv6 note for `table ip6 calico`.
- The rule inspection commands referenced non-existent split nftables tables. I changed them to inspect `nft list table ip calico` and described the relevant filter and NAT chains within that table.
- The legacy iptables conflict check only inspected the default filter table via `iptables-legacy -L`. I changed it to `iptables-legacy-save | grep -c "cali-"` so the check covers legacy Calico chains across all legacy iptables tables.
- The pod connectivity and policy tests could race pod startup. I added `kubectl wait --for=condition=Ready` commands before executing traffic tests.

## Review Notes
The post is technically relevant and salvageable. The corrected instructions assume a current Calico nftables dataplane deployment where kube-proxy is also in nftables mode, as required by Calico documentation.
