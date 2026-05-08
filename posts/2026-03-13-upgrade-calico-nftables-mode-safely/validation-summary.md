# Validation Summary: How to Upgrade Calico in nftables Mode Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kube-proxy
- nftables
- calicoctl
- kubectl

## Sources Consulted
- Calico nftables data plane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico v3.32.0 Felix nftables source: https://github.com/projectcalico/calico/blob/v3.32.0/felix/nftables/table.go
- Calico v3.32.0 dataplane source: https://github.com/projectcalico/calico/blob/v3.32.0/felix/dataplane/linux/int_dataplane.go
- nftables atomic rule replacement documentation: https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement

## Issues Found
- The prerequisites did not mention that Calico nftables mode requires kube-proxy to run in nftables mode. Added the prerequisite and a pre-upgrade kube-proxy mode check.
- The post treated `FelixConfiguration.spec.iptablesBackend` as the nftables dataplane selector. That field selects the iptables backend, not Calico's nftables dataplane. Updated verification and remediation to use `Installation.spec.calicoNetwork.linuxDataplane: Nftables`.
- The Tigera Operator upgrade command applied only `tigera-operator.yaml` and used Calico v3.27.0. Official operator upgrade guidance applies the CRDs and the operator manifest with server-side apply and force conflicts. Updated the commands to use the current v3.32.0 manifests and include the CRD apply step.
- The nftables verification command checked `table ip calico-filter`, but current Calico nftables mode creates a single `calico` table for IPv4. Updated the command and explanatory text to check `table ip calico`.
- The policy test attempted to connect immediately after creating pods, which can fail before the pods are Ready. Added `kubectl wait` commands for the server and client pods.

## Review Notes
Local `kubectl` and `calicoctl` binaries were not installed in the review environment, so CLI syntax was checked against official documentation and available command help where possible. The post now reflects Calico 3.32-era nftables behavior; future Calico releases may still alter table layout or upgrade instructions.
