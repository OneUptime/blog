# Validation Summary: How to Understand KubeSpan Architecture in Talos Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- KubeSpan
- Talos discovery service
- WireGuard
- Kubernetes networking

## Sources Consulted
- Talos v1.12 KubeSpan documentation: https://docs.siderolabs.com/talos/v1.12/networking/kubespan
- Talos v1.12 Discovery Service documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Talos v1.12 MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos KubeSpan resource definitions on Go Packages: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/resources/kubespan
- Talos v1.12.1 KubeSpan controller source: https://github.com/siderolabs/talos/tree/v1.12.1/internal/app/machined/pkg/controllers/kubespan
- WireGuard protocol documentation: https://www.wireguard.com/protocol/

## Issues Found
- The discovery example used `talosctl get discoveredmembers`, which is not the documented current discovery inspection resource. Changed it to `talosctl get affiliates` and updated the sample output to match Talos discovery documentation.
- The post said the cluster ID is derived from cluster secrets. Talos documents it as a random value generated as part of the cluster secrets, so the wording was corrected.
- The discovery encryption explanation referred to keys derived from the cluster trust domain. Talos documents encrypted affiliate and endpoint data protected by cluster discovery secrets, so the wording was corrected.
- The KubeSpan identity command used the singular `kubespanidentity`. Talos documents the resource as `kubespanidentities`, so the command and output example were updated.
- The KubeSpan address description said it is derived from the WireGuard public key. Talos documents a unique IPv6 address in a cluster-specific ULA prefix, so the description was corrected.
- The controller section collapsed peer-spec, manager, and endpoint behavior into one flow. Updated it to reflect the documented/source-backed `PeerSpecController`, `ManagerController`, and endpoint harvesting behavior.
- The `advertiseKubernetesNetworks` section said KubeSpan adds service CIDR routes. Talos documents pod network advertisement and CNI bypass for pod-to-pod traffic, so this was tightened.
- The peer state machine included an `Establishing` state. Talos defines only `unknown`, `up`, and `down` for KubeSpan peer status, so the state description was corrected.
- The peer status commands used the singular `kubespanpeerstatus`. Talos documents `kubespanpeerstatuses`, so both commands were fixed.
- The peer timeout claim gave an unsupported "typically two minutes" value. Replaced it with the documented recent-handshake/down behavior and 30-second peer status update interval.
- Endpoint selection was attributed to the endpoint controller trying endpoints in strict order. Talos documentation describes cycling through available endpoints, and the endpoint controller harvests extra endpoints, so this was corrected.
- The endpoint filter example omitted IPv6 and used a less precise comment for the catch-all IPv4 rule. Updated the snippet to match the documented include/exclude filter style.
- The security model showed a certificate-based trust chain that is not how KubeSpan discovery and WireGuard peer setup are documented. Replaced it with a discovery-secrets to KubeSpan identity to WireGuard tunnel chain.

## Review Notes
The local environment did not have `talosctl` installed, so CLI behavior was verified against official Talos documentation and Talos resource definitions instead of local `--help` output. The performance figures for throughput and latency are general guidance rather than values guaranteed by Talos documentation.
