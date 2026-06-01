# Validation Summary: How to Automate Azure VM Image Building with Packer and Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Packer
- Terraform
- Azure Compute Gallery
- Azure CLI
- Azure Linux virtual machines
- Azure Monitor Agent
- GitHub Actions
- Docker installation on Ubuntu

## Sources Consulted
- HashiCorp Packer Azure ARM builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/azure/latest/components/builder/arm
- HashiCorp Packer plugin installation documentation: https://developer.hashicorp.com/packer/docs/plugins/install
- HashiCorp Packer plugins command reference: https://developer.hashicorp.com/packer/docs/commands/plugins
- Terraform `azurerm_shared_image_version` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/shared_image_version
- Terraform `azurerm_virtual_machine_extension` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- Microsoft Azure CLI `az sig image-definition` documentation: https://learn.microsoft.com/en-us/cli/azure/sig/image-definition
- Microsoft Azure CLI `az sig image-version` documentation: https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Azure Compute Gallery documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/shared-image-galleries
- Microsoft Azure Linux VM Agent documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux
- Microsoft Azure Monitor VM monitoring documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vm-enable-monitoring
- Microsoft Azure VM image CLI documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/cli-ps-findimage
- Docker Engine installation documentation for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- HashiCorp setup-packer GitHub Action documentation: https://github.com/hashicorp/setup-packer

## Issues Found
- The Packer source image used `22_04-lts` while the Azure Compute Gallery image definition was created with `--hyper-v-generation V2`. Updated the source image SKU to `22_04-lts-gen2` so the source image generation matches the gallery definition.
- The Packer gallery destination used `replication_regions`, which HashiCorp documents as superseded by `target_region`. Replaced it with `target_region` blocks and per-region replica counts.
- The post attempted to install Azure Monitor Agent from `https://aka.ms/InstallAzureMonitorAgentLinux`, which did not resolve to a valid installer and is not the documented Azure VM installation path. Changed the image build to install only monitoring prerequisites and added Terraform deployment of the `AzureMonitorLinuxAgent` VM extension.
- The Linux deprovisioning step did not follow the Packer Azure builder's recommended shell provisioner pattern and removed `/tmp` before Packer cleanup. Updated it to run `waagent -force -deprovision+user` through Packer's recommended `execute_command` pattern and set `skip_clean = true`.
- The Terraform example hard-coded image version `1.0.0` while the CI pipeline passed `image_version`. Added an `image_version` variable and used it in the image lookup and tags.
- The GitHub Actions date version used zero-padded month/day segments. Changed it to a non-padded `Major.Minor.Patch` style date version and updated the date-based example accordingly.
- The smoke-test example used `image_version=test`, but Azure Compute Gallery image versions must use a numeric `Major.Minor.Patch` format. Changed the test version to `0.0.1`.
- The smoke-test SSH command referenced `$VM_IP` without defining it. Added an Azure CLI command to retrieve the test VM public IP.

## Review Notes
The examples are now technically consistent with current official docs. The snippets still assume that surrounding Terraform variables such as `subnet_id`, `admin_username`, and `ssh_public_key` are defined elsewhere, which is reasonable for a focused blog example.
