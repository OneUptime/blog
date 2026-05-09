# Validation Summary: Troubleshoot Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Google Compute Engine
- Google Cloud VPC routes
- Google Cloud VPC firewall rules
- gcloud CLI
- VXLAN networking

## Sources Consulted
- Google Cloud VPC static routes: https://cloud.google.com/vpc/docs/static-routes
- Google Cloud VPC routes overview and route resource fields: https://cloud.google.com/vpc/docs/routes and https://cloud.google.com/compute/docs/reference/rest/v1/routes
- gcloud compute routes create reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud VPC quotas and limits: https://cloud.google.com/vpc/docs/quota
- Google Cloud VPC firewall rule documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud network tags documentation: https://cloud.google.com/vpc/docs/add-remove-network-tags
- Google Cloud instance property updates: https://cloud.google.com/compute/docs/instances/update-instance-properties
- gcloud compute instances export and update-from-file references: https://cloud.google.com/sdk/gcloud/reference/compute/instances/export and https://cloud.google.com/sdk/gcloud/reference/compute/instances/update-from-file
- Calico on Google Compute Engine: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/gce
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico system requirements and VXLAN port documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The route listing command formatted `nextHopInstanceZone`, which is not a Compute Engine route resource field. Changed the output to show `nextHopInstance`, which is the actual route field.
- The firewall rule inspection command included `targetResources`, which is not a VPC firewall rule field for the documented target-tag and target-service-account workflow. Removed it from the format expression.
- The `can-ip-forward` remediation said there is no direct in-place update for `canIpForward` on existing instances. Google Cloud now documents `canIpForward` as an updatable instance property requiring only a refresh action. Replaced the stop/recreate guidance with `instances export` and `instances update-from-file`.
- The route limit section said the custom static route limit was a default 250 per region. Google Cloud documents the quota as static routes per VPC network, from the perspective of all regions. Updated the wording and adjusted the route-count filter to match the network URL suffix.

## Review Notes
The VXLAN port, Calico IPPool `vxlanMode` values, `calicoctl ipam show --show-blocks`, GCE `--can-ip-forward` creation guidance, route creation syntax, and network tag based firewall examples were consistent with current official documentation. Switching encapsulation modes can disrupt existing connections, so future revisions could mention planning a maintenance window before changing an active IPPool.
