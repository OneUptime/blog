# Validation Summary: How to Configure Red Hat Hybrid Cloud Console Cloud Integrations for AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Hybrid Cloud Console
- Red Hat cloud integrations
- Amazon Web Services
- AWS IAM
- RHEL management bundle
- Cost management
- Red Hat Insights images

## Sources Consulted
- Red Hat Hybrid Cloud Console documentation: Configuring cloud integrations for Red Hat services - https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest/html-single/configuring_cloud_integrations_for_red_hat_services/configuring_cloud_integrations_for_red_hat_services
- Red Hat Insights for RHEL documentation: Configuring integrations to launch RHEL images - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/deploying_and_managing_rhel_systems_in_hybrid_clouds/assembly_configuring-sources-for-launching-rhel-images_host-management-services
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services (AWS) - https://access.redhat.com/solutions/15356
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Google Cloud SDK documentation: gcloud compute instances create - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create

## Issues Found
- The post title and description claimed to configure AWS cloud integrations in Red Hat Hybrid Cloud Console, but the body described generic RHEL VM deployment across AWS, Azure, and GCP. Replaced the generic deployment flow with the Red Hat-documented AWS cloud integration wizard flow.
- The AWS example used `ami-rhel9-xxxxx`, which is not a valid EC2 AMI ID format and would not launch an instance. Removed the instance-launch example because launching an EC2 instance is not the Hybrid Cloud Console cloud integration workflow.
- The Azure example used `RedHat:RHEL:9:latest`, but Microsoft documents the RHEL 9 marketplace SKU as `9-lvm-gen2` for standard RHEL 9 images. Removed the Azure content because the post is specifically about AWS integrations.
- The prerequisite list incorrectly included Azure and GCP tooling for an AWS Hybrid Cloud Console integration. Replaced it with Red Hat account permissions, AWS account access, IAM permission requirements, and AWS access key requirements for the recommended account authorization method.
- The cloud-init, subscription-manager, Insights client, security group, and monitoring sections described VM configuration after launch, not AWS cloud integration setup. Replaced those sections with account authorization, manual configuration, review, verification, and integration management steps from Red Hat documentation.

## Review Notes
The post now covers the console-based integration workflow and does not include CLI commands. Future improvements could add screenshots or separate service-specific details for Cost Management, RHEL management bundle, and Red Hat Insights images, but those additions were outside the requested correction scope.
