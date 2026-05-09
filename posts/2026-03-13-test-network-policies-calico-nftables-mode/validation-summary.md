# Validation Summary: How to Test Network Policies with Calico in nftables Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes NetworkPolicy
- Kubernetes Pods and Services
- kubectl
- BusyBox wget
- Linux nftables

## Sources Consulted
- Calico nftables data plane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico FelixConfiguration documentation for `nftablesMode`: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico source code for nftables table setup: https://github.com/projectcalico/calico/blob/master/felix/dataplane/linux/int_dataplane.go
- Calico source code for nftables logical table layers: https://github.com/projectcalico/calico/blob/master/felix/nftables/table_layer.go
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- nftables wiki quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- Local BusyBox `wget --help` output for supported timeout flags.

## Issues Found
- BusyBox `wget` does not support the GNU-style `--timeout=5` option in the tested BusyBox help output. Changed all examples to use BusyBox's supported `-T 5` timeout option.
- The BusyBox client Pods used `kubectl run ... -- sleep 3600`, which passes arguments to the image entrypoint rather than overriding the command. Changed both client commands to `--command -- sleep 3600`.
- The workload setup read the server Pod IP immediately after creating Pods, which can race before the Pods are Ready. Added `kubectl wait --for=condition=Ready` commands for the server and client Pods.
- The prerequisites listed `calicoctl`, but the tutorial does not use it. Removed that unnecessary requirement.
- The NetworkPolicy example told readers to run `kubectl apply -f nft-policies.yaml` without first creating that file. Changed the YAML block into a heredoc that writes `nft-policies.yaml`.
- The nftables inspection command used `nft list table ip calico-filter`, but current Calico nftables mode creates an IPv4 root table named `calico` and uses logical layers such as `filter` under that table. Changed the command to `nft list table ip calico`.
- The atomic update step claimed the user could verify atomicity with a single connectivity test. Adjusted the wording to say the test verifies that the new rule takes effect after Calico applies the nftables transaction.

## Review Notes
The policy examples are syntactically valid Kubernetes `networking.k8s.io/v1` NetworkPolicy resources. The ingress behavior described is consistent with Kubernetes' additive NetworkPolicy model: Pods are non-isolated by default, an empty ingress policy isolates selected Pods, and additional policies add allowed sources.
