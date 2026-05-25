# Validation Summary: How to Configure Proxmox Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- bpg/proxmox Terraform provider
- Proxmox VE
- Proxmox API tokens
- Proxmox virtual machines
- Proxmox LXC containers
- Cloud-init
- Linux bridge networking

## Sources Consulted
- bpg/proxmox provider documentation: https://bpg.sh/docs/
- bpg/proxmox VM resource documentation: https://bpg.sh/docs/resources/virtual_environment_vm/
- bpg/proxmox container resource documentation: https://bpg.sh/docs/resources/virtual_environment_container/
- bpg/proxmox file resource documentation: https://bpg.sh/docs/resources/virtual_environment_file/
- bpg/proxmox download_file resource documentation: https://bpg.sh/docs/resources/download_file/
- bpg/proxmox Linux bridge resource documentation: https://bpg.sh/docs/resources/network_linux_bridge/
- bpg/proxmox nodes data source documentation: https://registry.terraform.io/providers/bpg/proxmox/latest/docs/data-sources/virtual_environment_nodes
- Proxmox VE API documentation: https://pve.proxmox.com/wiki/Proxmox_VE_API
- Proxmox VE User Management documentation: https://pve.proxmox.com/pve-docs-8/chapter-pveum.html
- Ubuntu 22.04.5 release image listing: https://releases.ubuntu.com/releases/22.04/
- Ubuntu cloud images: https://cloud-images.ubuntu.com/
- Proxmox container template index: https://download.proxmox.com/images/system/

## Issues Found
- The provider version constraint used `~> 0.46`, which is outdated relative to the current bpg/proxmox documentation. Updated it to `~> 0.106`.
- The cloned VM disk example set `file_id = ""`. The current VM resource documentation uses `file_id` for attaching/importing disk images; an empty string is not needed when resizing or defining the cloned disk. Removed the empty `file_id`.
- The ISO VM example used an old Ubuntu 22.04.3 ISO URL. Updated it to the current Ubuntu 22.04.5 server ISO URL.
- The ISO VM example said it would boot from the CD-ROM first, but `boot_order = ["scsi0", "ide2"]` booted the disk first and the `cdrom` block did not set the CD-ROM interface to `ide2`. Added `interface = "ide2"` and changed the boot order to `["ide2", "scsi0"]`.
- The cloud image example uploaded a cloud image as `content_type = "iso"` using `proxmox_virtual_environment_file`. Updated it to use the current `proxmox_download_file` resource with `content_type = "import"` and a `.qcow2` filename, which matches the current provider pattern for importable VM disk images.
- The networking example used `proxmox_virtual_environment_network_linux_bridge`. Updated it to the current documented `proxmox_network_linux_bridge` resource name.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was done by checking HCL snippets statically against the current official provider documentation and authoritative upstream URL listings.
