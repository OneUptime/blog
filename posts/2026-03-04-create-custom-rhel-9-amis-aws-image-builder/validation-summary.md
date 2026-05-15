# Validation Summary: How to Create Custom RHEL 9 AMIs for AWS Using Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL image builder
- AWS AMIs
- AWS CLI
- composer-cli
- Red Hat Subscription Manager
- Red Hat Insights
- SELinux
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Composing a customized RHEL system image: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/index
- Red Hat Enterprise Linux 9 documentation: Preparing and uploading AMI images to AWS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Creating system images with composer-cli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- AWS CLI Command Reference: ec2 run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Red Hat Enterprise Linux 9 documentation: Registering RHEL by using Subscription Manager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Insights client configuration guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-client-configuring-insights-client
- Red Hat Enterprise Linux 9 documentation: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post title and description promised custom RHEL 9 AMIs for AWS using Image Builder, but the body described generic marketplace launches for AWS, Azure, and GCP. I narrowed the prerequisites and examples to AWS and RHEL image builder.
- The AWS command used a placeholder AMI ID to launch an instance, which does not create a custom AMI. I replaced it with RHEL image builder blueprint and compose commands using the documented `ami` image type and AWS upload configuration.
- The Azure and GCP commands were outside the stated AWS AMI scope. I removed those examples from the workflow.
- The cloud-init example was technically plausible, but it did not describe Image Builder customization. I replaced it with supported RHEL image builder blueprint customizations for hostname, user, SSH key, groups, and packages.
- The networking guidance mentioned NSGs, which are Azure-specific and outside the AWS AMI topic. I changed it to AWS security groups and host firewall rules.
- The summary used lowercase product terms and implied a generic multi-cloud workflow. I corrected it to RHEL 9, AMIs, AWS, and image builder.

## Review Notes
The post now demonstrates the correct RHEL image builder flow at a high level, but it still omits several production details such as IAM role setup for VM import, S3 bucket policy requirements, AWS key rotation practices, and launching an EC2 instance from the uploaded AMI. Those are important follow-up details for a complete operational guide, but the remaining commands and configuration are technically consistent with the stated topic.
