# Validation Summary: Troubleshoot Calico on Self-Managed GCE Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Google Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud VPC routes
- Google Cloud CLI (`gcloud`)
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Kubernetes requirements and network permissions: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Google Cloud firewall rules overview and protocol syntax: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud routes overview and next-hop instance requirements: https://cloud.google.com/vpc/docs/routes
- Google Cloud `gcloud compute routes create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud VM IP forwarding documentation: https://cloud.google.com/vpc/docs/using-routes#canipforward

## Issues Found
- The firewall example used `protocol:4` for IPIP. Google Cloud firewall `--allow` expects protocol names, protocol numbers, or protocol-plus-port syntax; IPIP should be specified as `ipip` or protocol number `4`. Updated the example to use `ipip`.
- The firewall example allowed Typha on `udp:5473`, but Calico Typha uses TCP port 5473. Updated the example to `tcp:5473`.
- The introduction implied GCE has no source/destination forwarding concern. Google Cloud does not use the AWS source/destination check model, but GCE instances that forward packets for other source addresses need IP forwarding enabled. Updated the wording to mention IP forwarding.
- The route-based networking example omitted the need for IP forwarding on next-hop instances. Added a note before the route command.
- The route example populated a `NODE_NETWORK` variable from the first node address, which is order-dependent and was unused. Removed it.
- The IPPool example disabled `natOutgoing` with the explanation that routes handle routing. GCE pod CIDR routes handle pod routing, but egress outside Calico IP pools still commonly needs NAT unless external networks have return routes to pod CIDRs. Updated the example to keep `natOutgoing: true` and clarified when it should be changed.

## Review Notes
- The `kubectl` commands are syntactically valid for a troubleshooting workflow, but namespace and label names can vary depending on whether Calico was installed by manifests, Helm, or the Tigera operator.
- `calicoctl node status` is useful for BGP-mode clusters. In VXLAN-only deployments it will not show BGP peers because BGP is not used.
- The stated GCE route quota is reasonable as a default-planning warning, but quotas can vary by project and can change over time, so operators should confirm current limits in their Google Cloud quota page.
