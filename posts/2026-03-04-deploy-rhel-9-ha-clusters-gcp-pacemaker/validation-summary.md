# Validation Summary: How to Deploy RHEL 9 HA Clusters on GCP with Pacemaker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Google Cloud Compute Engine
- gcloud CLI
- cloud-init
- Red Hat Subscription Manager
- Red Hat Insights
- SELinux
- firewalld

## Sources Consulted
- Red Hat documentation: Deploying RHEL 9 on Google Cloud: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_rhel_9_on_google_cloud/deploying_rhel_9_on_google_cloud
- Google Cloud SDK documentation: gcloud compute instances create: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud documentation: Create an instance from a public image: https://cloud.google.com/compute/docs/instances/create-vm-from-public-image
- Red Hat documentation: Registering the system and managing subscriptions in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings
- Red Hat Insights documentation: Client configuration guide for Red Hat Insights: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-client-configuring-insights-client
- Microsoft Learn: az vm create reference, checked because the original post included an Azure example: https://learn.microsoft.com/en-us/cli/azure/vm
- AWS CLI command reference: aws ec2 run-instances, checked because the original post included an AWS example: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html

## Issues Found
- The original title, tags, description, overview, and summary claimed the post deployed RHEL 9 HA clusters on GCP with Pacemaker, but the post did not include Pacemaker, cluster setup, fencing, quorum, HA resources, or failover configuration. I changed the post scope to deploying RHEL 9 instances on GCP so the technical claims match the implementation shown.
- The prerequisites and launch section mixed AWS, Azure, and GCP despite the post being GCP-specific. I removed the AWS and Azure examples and narrowed the prerequisites to Google Cloud and gcloud.
- The GCP launch command omitted an explicit zone. While gcloud can use a configured default zone, the official examples include `--zone`, so I added `--zone=us-central1-a` to make the command self-contained.
- Red Hat registration was presented as unconditional, but Google Cloud on-demand RHEL images include the Red Hat product cost and custom or BYOS images use existing subscriptions. I changed the registration step to apply to BYOS or custom images.
- The networking guidance still referred to AWS security groups and Azure NSGs. I changed it to Google Cloud firewall rules.

## Review Notes
The post is now technically accurate as a basic RHEL 9 on GCP instance deployment guide. It no longer covers HA clustering or Pacemaker; a future article with the original HA/Pacemaker title should include the Red Hat HA Add-On, Pacemaker/Corosync setup, GCP-specific fencing or resource agents, firewall requirements, and failover validation.
