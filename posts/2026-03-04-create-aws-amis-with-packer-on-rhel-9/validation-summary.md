# Validation Summary: How to Create AWS AMIs with Packer on RHEL

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Packer
- AWS Amazon Machine Images
- systemd
- journalctl
- rpm

## Sources Consulted
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- HashiCorp Packer AWS getting started build image tutorial: https://developer.hashicorp.com/packer/tutorials/aws-get-started/aws-get-started-build-image
- Red Hat Enterprise Linux 9 configuring basic system settings documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index

## Issues Found
- The post title and description promise a guide for creating AWS AMIs with Packer on RHEL 9, but the body contains only generic placeholder service-management instructions such as `/etc/<service>/config.conf` and `<service-name>`.
- The post does not include any Packer template, Amazon builder configuration, AWS credential requirements, source AMI selection, provisioner examples, or `packer init` / `packer build` workflow needed to create an AMI.
- Because the implementation content is unrelated to the stated topic and uses unresolved placeholders, the post is not technically relevant in its current form and should be removed or rewritten rather than marked validated.

## Review Notes
The opening claim that Packer can build custom AMIs is broadly accurate, but the post does not provide a technically usable Packer workflow to validate.
