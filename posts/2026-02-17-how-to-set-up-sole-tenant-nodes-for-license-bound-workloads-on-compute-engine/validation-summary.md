# Validation Summary: How to Set Up Sole-Tenant Nodes for License-Bound Workloads on Compute Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Sole-tenant nodes, node templates, and node groups
- gcloud CLI
- Terraform Google provider
- BYOL licensing for Windows Server, SQL Server, and Oracle workloads
- Cloud Monitoring and committed use discounts

## Sources Consulted
- Google Cloud SDK reference: `gcloud compute sole-tenancy node-templates create` - https://cloud.google.com/sdk/gcloud/reference/compute/sole-tenancy/node-templates/create
- Google Cloud documentation: Create sole-tenant node groups - https://cloud.google.com/compute/docs/nodes/sole-tenancy-node-groups
- Google Cloud documentation: Provision VMs on sole-tenant nodes - https://cloud.google.com/compute/docs/nodes/provisioning-sole-tenant-vms
- Google Cloud SDK reference: `gcloud compute instances create` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud documentation: Bringing your own licenses - https://cloud.google.com/compute/docs/nodes/bringing-your-own-licenses
- Google Cloud documentation: Microsoft Licensing on Google Cloud - https://cloud.google.com/compute/docs/instances/windows/ms-licensing
- Google Cloud documentation: Microsoft licensing on Google Cloud FAQ - https://cloud.google.com/compute/docs/instances/windows/ms-licensing-faq
- Google Cloud Compute Engine REST reference: NodeGroup resource - https://cloud.google.com/compute/docs/reference/rest/v1/nodeGroups
- Terraform Registry: `google_compute_node_template` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_node_template
- Terraform Registry: `google_compute_node_group` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_node_group
- Terraform Registry: `google_compute_instance` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post described `--server-binding` as a maintenance policy and said it ensures VMs stay on the same physical server. Updated this to call it a server binding policy and to state that `restart-node-on-minimal-servers` restarts nodes on the same physical server when possible, with possible VM outages during maintenance.
- The Windows Server BYOL section incorrectly attributed Windows Server BYOL to Microsoft License Mobility. Updated it to state that Windows Server is not covered by License Mobility, eligibility depends on Microsoft agreement terms, and BYOL Windows Server uses imported custom images instead of Google Cloud prebuilt Windows images.
- The SQL Server BYOL section implied SQL Server works the same way as Windows Server. Updated it to explain that SQL Server with Software Assurance is typically handled through Microsoft License Mobility and might not require sole-tenant nodes unless the operating system or license terms require dedicated hardware.

## Review Notes
The gcloud commands, node affinity file format, Terraform resource names, Terraform block names, autoscaling policy fields, node group maintenance policy value, and node group describe/list commands were consistent with current official documentation. The post still necessarily simplifies vendor licensing; readers should verify their own license agreements before using BYOL in production.
