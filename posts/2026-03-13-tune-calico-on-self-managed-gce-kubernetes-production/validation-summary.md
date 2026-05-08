# Validation Summary: Tune Calico on Self-Managed GCE Kubernetes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source v3.x
- Kubernetes networking
- Google Compute Engine
- Google Cloud VPC routes and firewall rules
- Calico IPPool and FelixConfiguration resources
- Calico MTU configuration

## Sources Consulted
- Google Cloud VPC routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud static routes and next-hop instance considerations: https://cloud.google.com/vpc/docs/static-routes
- Google Cloud route creation CLI reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud VPC MTU documentation: https://cloud.google.com/vpc/docs/mtu
- Google Cloud jumbo frame MTU guide: https://cloud.google.com/vpc/docs/configure-jumbo-frame-mtu-vpc
- Google Cloud firewall rule CLI reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Calico GCE public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico system requirements and ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

## Issues Found
- The post described pod CIDRs as being "advertised" into the GCE VPC route table. Static GCE routes are configured routes rather than BGP advertisements, so the wording was changed to "routing pod CIDRs directly through the GCE VPC routing table."
- The prerequisites omitted the Google Cloud requirement that VM next-hop instances need IP forwarding enabled. Added the `--can-ip-forward` prerequisite and noted that route quotas must fit the number of pod CIDR or Calico IPAM block routes.
- The MTU section assumed jumbo-frame MTU was generally available and set Calico to `8846` with a VXLAN-sized safety margin even though the guide configures no overlay. Updated the text to use the actual VPC/NIC path MTU and only subtract overhead when encapsulation is enabled.
- The command `calicoctl patch felixconfiguration default --patch='{"spec": {"vethMTU": 8846}}'` was invalid for current Calico because workload veth MTU is not configured through a `vethMTU` FelixConfiguration field. Replaced it with the supported operator `Installation.spec.calicoNetwork.mtu` patch and manifest-based `calico-config` path.
- The manifest-based `calico-config` example used the `calico-system` namespace. Current Calico manifest installs place this ConfigMap in `kube-system`, so the namespace was corrected.
- The Felix tuning example set `routeSource: WorkloadIPs`, which is not GCE-specific and can change route programming semantics away from the Calico IPAM default. Removed it from the example.
- The best-practice note to run `calicoctl node status` after MTU changes to verify tunnels was misleading for a no-overlay configuration. Replaced it with guidance to restart Calico node pods after manifest-based MTU changes and recreate workloads so new pod interfaces receive the updated MTU.

## Review Notes
The GCE custom-route approach is technically plausible for self-managed clusters when node IP forwarding, routes, firewall rules, and route quotas are handled correctly. Calico's official GCE guidance also documents IP-in-IP as a common self-managed deployment path and notes that GCE cloud routes are commonly managed through Kubernetes cloud-provider integration, so future revisions could add caveats about operational automation and route scale.
