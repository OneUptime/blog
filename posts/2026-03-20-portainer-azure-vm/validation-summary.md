# Validation Summary: How to Deploy Portainer on Azure Virtual Machines - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure CLI
- Azure Network Security Groups (NSGs)
- Azure Public IP and Azure-managed DNS labels
- Azure Bastion
- Docker Engine on Ubuntu
- Portainer Community Edition

## Sources Consulted
- Microsoft Learn Azure CLI VM reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-lts
- Microsoft Learn Azure CLI NSG rule reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn Azure CLI public IP reference: https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Microsoft Learn Azure Bastion CLI deployment guide: https://learn.microsoft.com/en-us/azure/bastion/create-host-cli
- Microsoft Learn Azure VM auto-shutdown guide: https://learn.microsoft.com/en-us/azure/virtual-machines/auto-shutdown-vm
- Microsoft Learn Azure public IP addresses overview: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Portainer official install docs for CE on Docker/Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker official Ubuntu install docs: https://docs.docker.com/engine/install/ubuntu/
- Microsoft Azure Linux VM pricing page: https://azure.microsoft.com/en-us/pricing/details/virtual-machines/linux/
- Microsoft Azure Retail Prices API: https://prices.azure.com/api/retail/prices

## Issues Found
- The VM creation command used an inline comment after a trailing `\`, which breaks Bash line continuation. I moved the sizing note into the preceding comment and kept the command syntactically valid.
- `az vm create` opens SSH by default for Linux when it creates a new NSG. That conflicted with the later Bastion hardening flow, so I added `--nsg-rule NONE` and kept explicit NSG rule creation in Step 2.
- The NSG commands used `--destination-port-range` and omitted the direction. I updated them to the documented `--destination-port-ranges` form and made the rules explicitly inbound.
- The post opened TCP/9000 for “initial setup or redirect”, but the Portainer container command did not publish port `9000`, and current Portainer docs treat `9000` as legacy HTTP only. I removed that rule.
- The Docker install command ran the convenience script without `sudo`, which would fail for the non-root `azureuser`. I changed it to the documented root-required flow.
- The Portainer container used `portainer/portainer-ce:latest`, while current Portainer install docs use the `lts` tag. I updated the image reference.
- The DNS example implied the Azure DNS name alone was enough, but Portainer in this guide listens on `9443`. I corrected the access URL to include `https://` and `:9443`.
- The Bastion step was incomplete: it omitted the required `AzureBastionSubnet`, the separate Standard public IP for Bastion, and the action needed to stop exposing SSH publicly afterward. I added the missing commands and removed the SSH NSG rule after Bastion setup.
- The auto-shutdown command had another inline comment after a trailing `\`, which breaks the command. I fixed the syntax and kept the documented `hhmm` UTC format.
- The pricing table lacked scope and had a slightly stale `B2ms` estimate. I clarified that the figures are approximate East US Linux compute prices and updated `Standard_B2ms` to `~$61`.

## Review Notes
- Docker’s convenience script is still valid, but Docker documents it as best suited to testing and development; repository-based installation is a better long-term production choice.
- Portainer serves the UI on `9443` with a self-signed certificate by default unless you configure your own certificate.
- Portainer port `8000` remains in the container run command because it is part of Portainer’s documented install command; it is only needed for Edge compute features and is not opened in the NSG by this post.
- `newgrp docker` opens a new shell; reconnecting to the VM is an alternative if group membership does not refresh as expected in the current session.
