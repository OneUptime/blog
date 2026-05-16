# Validation Summary: How to Use KubeSpan for Hybrid Cloud Clusters on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- KubeSpan
- WireGuard
- Kubernetes scheduling, node labels, node affinity, and DaemonSets
- AWS EC2 security groups
- Google Cloud VPC firewall rules
- Bash and jq

## Sources Consulted
- Talos Linux KubeSpan guide: https://www.talos.dev/latest/talos-guides/network/kubespan/
- Talos Linux machine configuration reference for `machine.network.kubespan`: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux `KubeSpanEndpointsConfig` reference: https://www.talos.dev/v1.10/reference/configuration/network/kubespanendpointsconfig/
- Talos Linux CLI reference for `talosctl gen config`, `apply-config`, and patch flags: https://www.talos.dev/latest/reference/cli/
- Talos Linux network connectivity ports: https://www.talos.dev/v1.10/learn-more/talos-network-connectivity/
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Google Cloud SDK `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Kubernetes node affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The architecture section said etcd replication flows between sites even though the example topology places all control plane nodes on-premises. Updated the wording to clarify that etcd replication uses KubeSpan only if control plane nodes span sites.
- The NAT example implied endpoint filters could advertise a NAT public IP by themselves. Added the Talos `KubeSpanEndpointsConfig` document with `extraAnnouncedEndpoints` for explicitly announcing an external NAT endpoint.
- The AWS security group commands used `--source`, which is not a valid AWS CLI flag for CIDR-based ingress rules. Changed it to `--cidr`.
- The KubeSpan status command used the singular resource name. Updated examples to the official `kubespanpeerstatuses` resource name.
- The `kubectl get nodes` example used a specific Kubernetes `v1.29.0` version, which is stale for a 2026 guide. Replaced it with a generic `v1.x.x` example version.
- The `allowDownPeerBypass` explanation overstated that it ensures same-site communication. Updated it to match Talos behavior: traffic can bypass KubeSpan when a peer connection is down, so it should be used only where direct connectivity is acceptable.

## Review Notes
The KubeSpan settings, Talos config patch usage, AWS/GCP disk examples, GCP firewall command, Kubernetes node affinity, and DaemonSet examples are otherwise consistent with the referenced official documentation. The guide enables `advertiseKubernetesNetworks`; future revisions should mention that Talos documentation cautions against enabling it with CNIs such as Calico and Cilium that allocate pod IPs outside Kubernetes-visible pod CIDRs.
