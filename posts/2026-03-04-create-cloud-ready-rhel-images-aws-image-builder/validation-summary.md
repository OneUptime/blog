# Validation Summary: How to Create Cloud-Ready RHEL Images for AWS Using Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder / osbuild-composer
- composer-cli
- AWS AMI imports
- AWS CLI
- cloud-init
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Creating and uploading AWS AMI images": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deploying_rhel_8_on_amazon_web_services/creating-and-uploading-aws-ami-images_cloud-content-aws
- Red Hat Enterprise Linux 9 documentation, "Composing a customized RHEL system image": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/composing_a_customized_rhel_system_image/uploading-and-qcow2-image-on-openstack_creating-cloud-images-with-composer
- Red Hat Enterprise Linux 10 documentation, "Preparing and uploading AMI images to AWS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_and_managing_rhel_on_amazon_web_services/preparing-and-uploading-ami-images-to-aws
- Image Builder blueprint reference: https://osbuild.org/docs/user-guide/blueprint-reference/
- AWS CLI Command Reference, ec2 import-image: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-image.html
- AWS CLI installation documentation: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

## Issues Found
- The direct upload command passed an empty image key (`""`) to `composer-cli compose start`. Red Hat documentation shows the syntax as `composer-cli compose start blueprint-name image-type image-key configuration-file.toml`, so the command was changed to pass `rhel-webserver-image`.
- The manual upload example referred to a downloaded file named `<compose-uuid>-image.raw`. RHEL Image Builder AMI output uses an AMI disk image file, commonly named `<compose-uuid>-disk.ami`, so the S3 upload command and S3 key were corrected.
- The AWS `import-image` example did not specify licensing. AWS strongly recommends setting `--license-type` or `--usage-operation`; the example now uses `--license-type BYOL` for an imported RHEL image.
- The AWS `import-image` disk container used `Format=raw`. AWS documents the valid value as `RAW`, so the example was updated to `Format=RAW`.
- The manual import path did not mention the required `vmimport` IAM role. A short prerequisite note was added before the import command.

## Review Notes
The blueprint syntax for packages, systemd service enablement, and kernel command-line customization matches documented Image Builder blueprint fields. The AMI image type and `composer-cli compose image <compose-uuid>` flow are valid for RHEL Image Builder, although RHEL 10 documentation also shows newer `image-builder` CLI workflows.
