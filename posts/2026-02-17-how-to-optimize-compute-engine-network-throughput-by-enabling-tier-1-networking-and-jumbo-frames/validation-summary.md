# Validation Summary: How to Optimize Compute Engine Network Throughput by Enabling Tier 1 Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Per VM Tier_1 networking performance
- gVNIC
- Google Cloud VPC MTU and jumbo frames
- Linux network interface configuration
- Linux TCP sysctl tuning
- iperf3
- Google Cloud CLI
- Cloud Monitoring metrics
- Compute Engine compact placement policies

## Sources Consulted
- Google Cloud Compute Engine: Configure per VM Tier_1 networking performance: https://docs.cloud.google.com/compute/docs/networking/configure-vm-with-high-bandwidth-configuration
- Google Cloud Compute Engine: Network bandwidth: https://docs.cloud.google.com/compute/docs/network-bandwidth
- Google Cloud Compute Engine: General-purpose machine family: https://docs.cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud Compute Engine: Compute-optimized machine family: https://docs.cloud.google.com/compute/docs/compute-optimized-machines
- Google Cloud VPC: Maximum transmission unit: https://docs.cloud.google.com/vpc/docs/mtu
- Google Cloud VPC: Change the MTU setting of a VPC network: https://docs.cloud.google.com/vpc/docs/change-mtu-vpc-network
- Google Cloud Compute Engine: Reduce latency by using compact placement policies: https://docs.cloud.google.com/compute/docs/instances/use-compact-placement-policies
- Google Cloud Compute Engine: TCP optimization for network performance and resiliency: https://docs.cloud.google.com/compute/docs/networking/tcp-optimization-for-network-performance-in-gcp-and-hybrid
- Google Cloud Monitoring metrics list for Compute Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring filters: https://docs.cloud.google.com/monitoring/api/v3/filters

## Issues Found
- The post stated that Tier_1 networking was available only on select machine types with 46 or more vCPUs and capped it at 100 Gbps. Updated the explanation and table because current Compute Engine documentation lists supported families and sizes below 46 vCPUs, and C3/C3D/C4/C4D/Z3 can reach 200 Gbps with Tier_1.
- The machine type check command implied that `gcloud compute machine-types describe` shows network bandwidth. Updated the text and format fields to describe vCPU count instead, with the bandwidth comparison left to the machine family tables.
- The instance and instance template examples omitted `nic-type=GVNIC`. Added it because Tier_1 networking for VM instances requires gVNIC, and official examples include the gVNIC network interface type.
- The post said existing instances cannot change networking tier. Updated this to explain that existing gVNIC-backed instances can be updated by exporting, editing, and applying the instance configuration with a restart; VirtIO-backed instances need to be recreated with gVNIC.
- The VPC MTU guidance did not mention the documented requirement to stop VMs before changing network MTU. Updated the note and clarified that public Linux images receive the VPC MTU from DHCP on startup.
- The multi-NIC example omitted `nic-type=GVNIC`. Added it for consistency with Tier_1 requirements.
- The compact placement policy example used a C3 VM without the additional documented beta/max-distance path and omitted the maintenance policy flag required by the create example. Changed the example to use an N2 machine type with the documented compact placement command path, `--collocation=collocated`, and `--maintenance-policy=MIGRATE`.
- The Cloud Monitoring filter did not include `resource.type="gce_instance"`. Added it to match Cloud Monitoring filter examples for per-instance Compute Engine metrics.
- The BBR recommendation was too broad. Changed it to a workload-dependent recommendation that should be tested before broad rollout.

## Review Notes
The sysctl values are plausible example tuning values, but optimal TCP buffer sizes should be calculated from the bandwidth-delay product for the actual path and workload. The `ens4` interface name is common on Google Cloud Linux VMs, but users should verify the interface name on their image before applying OS-level MTU commands.
