# Validation Summary: How to Set Up a Compute Engine VM as a NAT Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPC
- Google Compute Engine
- Google Cloud routes and firewall rules
- Cloud NAT
- Linux IP forwarding
- iptables and netfilter-persistent
- Identity-Aware Proxy TCP forwarding
- Cloud Monitoring

## Sources Consulted
- Google Cloud SDK reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud documentation for Linux startup scripts: https://cloud.google.com/compute/docs/instances/startup-scripts/linux
- Google Cloud VPC routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud documentation for using static routes: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud SDK reference for `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud documentation for setting up Public NAT: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Linux iptables man pages: https://manpages.ubuntu.com/manpages/bionic/man8/iptables.8.html
- Linux iptables extensions man pages: https://manpages.ubuntu.com/manpages/jammy/man8/iptables-extensions.8.html

## Issues Found
- The failover explanation said traffic automatically fails over when the primary NAT gateway "goes down" because a lower-priority route takes effect. Google Cloud only disregards static routes with next-hop VM instances when the next-hop VM is stopped or deleted; it does not health-check the VM's NAT configuration. Updated the wording to distinguish VM stopped/deleted failover from broken NAT configuration or internet connectivity.
- The monitoring example appended a `LOG` rule after the existing `MASQUERADE` rule in the NAT `POSTROUTING` chain and described it as logging all NAT translations. Updated it to insert a `FORWARD` chain logging rule for outbound forwarded traffic, which matches the stated goal of tracking traffic through the NAT gateway.

## Review Notes
The `gcloud` CLI was not installed in the workspace, so CLI syntax was verified against the official Google Cloud SDK reference instead of local `--help` output. The tutorial remains a VM-based educational pattern; for production, the post correctly recommends managed Cloud NAT for automatic scaling and high availability.
