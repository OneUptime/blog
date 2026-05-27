# Validation Summary: Set Up a Compute Engine Instance with Multiple Network Interfaces Across VPCs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud VPC networks and subnets
- Compute Engine multiple network interfaces
- Google Cloud CLI
- Linux policy routing
- Linux IP forwarding
- iptables
- Cloud Monitoring
- VPC Flow Logs

## Sources Consulted
- Google Cloud Compute Engine: Create VMs with multiple network interfaces: https://docs.cloud.google.com/compute/docs/instances/create-instance-multiple-nics
- Google Cloud VPC: Multiple network interfaces concepts: https://docs.cloud.google.com/vpc/docs/multiple-interfaces-concepts
- Google Cloud VPC: Create VMs with multiple network interfaces: https://docs.cloud.google.com/vpc/docs/create-use-multiple-interfaces
- Google Cloud VPC: Configure routing for an additional network interface: https://docs.cloud.google.com/vpc/docs/configure-routing-additional-interface
- Google Cloud VPC: Routes overview: https://docs.cloud.google.com/vpc/docs/routes
- Google Cloud VPC: Use routes and enable IP forwarding: https://docs.cloud.google.com/vpc/docs/using-routes
- Google Cloud SDK: gcloud compute instances create: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK: gcloud compute ssh: https://cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud Monitoring metrics list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring networking metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring: Retrieve time-series data: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics

## Issues Found
- The post stated that each network interface must connect to a different VPC and that two interfaces cannot be in the same VPC. Google Cloud now documents limited same-VPC multi-NIC support as a preview feature, so I narrowed the statement to the cross-VPC setup and noted the preview caveat.
- The post said a VM can have up to 8 network interfaces. Current Google Cloud documentation lists up to 10 vNICs for most machine types and up to 16 total interfaces when Dynamic NICs are included, so I updated the text and limits table.
- The routing section assumed the gateway is usually the first IP in the subnet. Google Cloud documents retrieving the interface gateway from the metadata server, so I changed the examples to query metadata.
- The policy routing example used a subnet route in the custom table. Google Cloud's documented example adds a default route plus a route to the gateway with a source hint, so I updated the route commands accordingly.
- The post implied SSH through the management interface would work before policy routing was configured. Because replies for `nic1` can otherwise leave through `nic0`, I added a note that initial shell access must use a temporary path such as serial console, startup script, or another route that does not depend on unconfigured `nic1`.
- The monitoring section used `compute.googleapis.com/instance/network/received_bytes_count` for per-interface monitoring. That metric is VM-level; I changed the example to use the `networking.googleapis.com/vm_flow/ingress_bytes_count` metric with the `local_network_interface` label.
- The monitoring example used `gcloud monitoring time-series list`, which is not available in the current stable Google Cloud CLI documentation. I replaced it with a documented Cloud Monitoring API `timeSeries.list` request using `curl`.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI syntax was checked against official Google Cloud SDK documentation rather than local `gcloud --help` output.
