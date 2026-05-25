# Validation Summary: How to Configure VMware vSphere Provider in Terraform

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- VMware vSphere
- VMware vCenter Server
- vSphere Terraform provider
- vSphere virtual machines, tags, distributed virtual switches, storage policies, and content libraries

## Sources Consulted
- VMware vSphere Terraform provider overview: https://registry.terraform.io/providers/vmware/vsphere/latest/docs
- vSphere virtual machine resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/virtual_machine
- vSphere virtual machine data source documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/data-sources/virtual_machine
- vSphere compute cluster data source documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/data-sources/compute_cluster
- vSphere host data source documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/data-sources/host
- vSphere distributed virtual switch resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/distributed_virtual_switch
- vSphere tag category resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/tag_category
- vSphere content library resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/content_library
- vSphere content library item resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/content_library_item
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements

## Issues Found
- Updated the provider source from `hashicorp/vsphere` to the current `vmware/vsphere` namespace and updated the version constraint to the current 2.x line.
- Corrected the prerequisite wording. The provider can work with ESXi in limited cases, but this guide's cloning, tagging, distributed switch, and content library examples require vCenter Server.
- Updated VM clone examples to inherit `scsi_type`, firmware, network adapter type, and a disk size that is at least as large as the template disk, matching provider requirements for template cloning.
- Added the missing `vsphere_host` data source used by the distributed virtual switch example.
- Corrected `vsphere_content_library.storage_backing` from a list to the datastore managed object ID string expected by the provider.
- Made the storage policy VM example self-contained by adding required VM arguments and showing disk-level storage policy assignment.

## Review Notes
The examples are still illustrative and use placeholder inventory names, IP addresses, credentials, and template names that must be changed for a real vSphere environment. The latest `vmware/vsphere` provider documentation lists support for vSphere 8.x and 9.x, so older vSphere installations may require pinning an older provider version.
