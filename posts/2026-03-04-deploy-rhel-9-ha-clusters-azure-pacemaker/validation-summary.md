# Validation Summary: How to Deploy RHEL HA Clusters on Azure with Pacemaker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Microsoft Azure Virtual Machines
- Azure CLI
- Pacemaker
- Red Hat High Availability Add-On
- cloud-init
- Azure fence agent
- Red Hat Insights

## Sources Consulted
- Microsoft Learn: Set up Pacemaker on Red Hat Enterprise Linux in Azure, https://learn.microsoft.com/en-us/azure/sap/workloads/high-availability-guide-rhel-pacemaker
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure, https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Azure CLI `az vm` command reference, https://learn.microsoft.com/en-us/cli/azure/vm
- Red Hat Documentation: Deploying RHEL 9 on Microsoft Azure, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_rhel_9_on_microsoft_azure/index
- cloud-init documentation: All cloud config examples, https://docs.cloud-init.io/en/latest/topics/examples.html
- Red Hat Insights documentation: insights-client command options, https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights_with_fedramp/assembly-insights-cli-options

## Issues Found
- The post title promised RHEL HA clusters on Azure with Pacemaker, but the body described generic single-instance deployment across AWS, Azure, and GCP. I replaced the AWS and GCP examples with Azure RHEL HA VM deployment guidance.
- The prerequisites incorrectly referenced AWS/GCP accounts and CLI tools. I changed them to Azure, RHEL HA entitlement, Azure CLI, and SSH prerequisites.
- The Azure image example used `RedHat:RHEL:9:latest`, which does not match Microsoft's documented RHEL 9 image naming pattern and did not account for HA images. I added `az vm image list --publisher RedHat --offer RHEL-HA --all --output table` and a placeholder RHEL-HA SKU selected from the official image list.
- The post did not install or configure Pacemaker, PCS, Azure fence agents, or cluster services. I added the verified RHEL HA repository, package installation, `pcsd`, `pcs host auth`, `pcs cluster setup`, cluster enable/start, STONITH, and Azure fence agent commands.
- The registration command implied all Azure RHEL images should use `subscription-manager register --auto-attach`. I clarified that registration and HA repository enablement apply to BYOS or custom images.
- The monitoring example ran `insights-client` without a specific action. I replaced it with `pcs status` for cluster status and `insights-client --checkin`, which is a documented lightweight Insights check-in option.

## Review Notes
The article is now technically aligned with the stated Azure Pacemaker topic, but a production-ready deployment still needs workload-specific load balancer rules, health probe ports, DNS/name resolution, and a precise Azure role assignment procedure for the managed identity or service principal used by the fence agent.
