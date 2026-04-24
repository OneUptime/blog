# Validation Summary: How to Deploy Portainer on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure CLI
- Azure Network Security Groups
- Azure Managed Disks
- Azure Container Registry
- Docker Engine
- Portainer Community Edition
- Ubuntu Server 24.04 LTS

## Sources Consulted
- Microsoft Learn: `az vm` CLI reference https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-lts
- Microsoft Learn: `az network nsg rule` CLI reference https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-lts
- Microsoft Learn: `az vm disk` CLI reference https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest
- Microsoft Learn: Attach a data disk to a Linux VM https://learn.microsoft.com/en-us/azure/virtual-machines/linux/attach-disk-portal
- Microsoft Learn: Auto-shutdown a VM https://learn.microsoft.com/en-us/azure/virtual-machines/auto-shutdown-vm
- Microsoft Learn: `az acr credential` CLI reference https://learn.microsoft.com/en-us/cli/azure/acr/credential?view=azure-cli-lts
- Microsoft Learn: Authenticate with Azure Container Registry https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Create an Azure container registry by using the Azure portal https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal
- Docker Docs: Install Docker Engine on Ubuntu https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine https://docs.docker.com/engine/install/linux-postinstall
- Portainer Docs: Install Portainer CE with Docker on Linux https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: Add an Azure registry https://docs.portainer.io/sts/admin/registries/add/azure

## Issues Found
- The post treated Portainer port `9000` as a default inbound port. Portainer’s current Docker install guidance uses `9443` by default and treats `9000` as legacy HTTP. I changed the NSG rules and deployment example so `9443` is the default and `9000` is explicitly optional.
- The Docker install step used Docker’s convenience script. Docker’s official Ubuntu docs state that the convenience script is only recommended for testing and development environments. I replaced it with the supported `apt` repository installation flow.
- The managed disk instructions formatted the raw disk and persisted `/dev/sdc` directly in `/etc/fstab`. Azure’s Linux VM guidance recommends creating a partition and using the filesystem UUID in `fstab` to avoid device-name drift and boot issues. I updated the commands accordingly.
- The Portainer deployment used `portainer/portainer-ce:latest`. I changed this to the documented `portainer/portainer-ce:lts` tag to align with Portainer’s supported release-channel guidance.
- The ACR section assumed the login server would always be `yourregistryname.azurecr.io` and that `az acr credential show` would work immediately. ACR login servers can include a DNL hash, and admin credentials are only available when the admin user is enabled. I updated the post to fetch the real login server and enable the admin user before retrieving credentials.
- The auto-shutdown step omitted that Azure VM auto-shutdown uses UTC by default. I added that note to prevent scheduling mistakes.

## Review Notes
- Microsoft recommends Microsoft Entra identities or service principals for most ACR scenarios, and reserves the admin account mainly for limited cases and testing. The updated post keeps the admin-account flow because Portainer registry setup here is username/password based, but a service principal would be a stronger follow-up improvement for unattended production use.
- The post still assumes the VM uses the default NSG name created by `az vm create` (`portainer-vmNSG`). That is valid for the shown CLI flow, but custom networking choices in the portal can produce different resource names.
