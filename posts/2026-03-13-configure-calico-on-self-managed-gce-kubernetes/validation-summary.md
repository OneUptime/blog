# Validation Summary: Configure Calico on Self-Managed GCE Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source / Tigera Operator
- Kubernetes and kubeadm
- Google Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud custom static routes
- VXLAN and non-encapsulated pod networking

## Sources Consulted
- Calico Open Source Google Compute Engine documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source default IP pool documentation: https://docs.tigera.io/calico/latest/networking/ipam/initial-ippool
- Calico Open Source Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Google Cloud VPC routes documentation: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud SDK `gcloud compute routes create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud Compute Engine instance update documentation: https://cloud.google.com/compute/docs/instances/update-instance-properties
- Google Cloud Compute Engine instances API reference: https://cloud.google.com/compute/docs/reference/rest/v1/instances/update
- Google Cloud SDK `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create

## Issues Found
- The introduction described non-encapsulated GCE routing as advertising pod CIDRs as GCE routes. GCE custom static routes are created in the VPC rather than advertised by Calico to GCE, so the wording was changed to "creating GCE routes for pod CIDRs."
- The VXLAN description did not mention the UDP 4789 requirement. Added that VXLAN works when UDP 4789 is allowed between nodes.
- The internal firewall example only allowed the VPC CIDR. For non-encapsulated pod traffic, packets can have pod CIDR source addresses, so the example now includes both `VPC_CIDR` and `POD_CIDR`.
- The IP forwarding section used AWS-style source/destination check wording and referred to BGP mode. Updated it to GCE IP forwarding and GCE route mode terminology.
- The post said IP forwarding can only be set at creation time. Current Google Cloud documentation lists `canIpForward` as an updatable instance property requiring a refresh, so the best-practice note was corrected while still recommending creation-time configuration for simplicity.
- The sample VM creation command did not specify the configured VPC network. Added `--network $NETWORK_NAME` so the example is consistent with the firewall and route configuration.
- The non-encapsulated route-mode comments implied that changing the operator `Installation` IP pool after install would apply. Calico documentation says Installation IP pool changes after installation are not applied, so the comments now distinguish new installs from existing operator-managed installs.

## Review Notes
- The local environment did not have the `gcloud` CLI installed, so Google Cloud CLI syntax was checked against the official SDK reference instead of local `--help`.
- The post uses Calico `v3.27.0` in the raw GitHub URL. The APIs used in the examples are still valid in current Calico documentation, but future maintenance could update the pinned version after testing the matching operator and custom resource manifests together.
