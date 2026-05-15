# Validation Summary: How to Create Custom RHEL AMIs for AWS Using Image Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Image Builder / osbuild-composer
- `composer-cli`
- AWS CLI
- Amazon EC2 AMIs
- VM Import/Export
- Amazon S3
- TOML blueprint configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation: Preparing and uploading cloud images by using RHEL image builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image
- Image Builder blueprint reference: https://osbuild.org/docs/user-guide/blueprint-reference/
- `composer-cli compose image` command reference: https://www.mankier.com/1/composer-cli-compose-image
- AWS CLI `ec2 import-image` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-image.html
- AWS VM Import/Export user guide: Import your VM as an image: https://docs.aws.amazon.com/vm-import/latest/userguide/import-vm-image.html
- AWS CLI `ec2 run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `ec2 create-tags` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-tags.html

## Issues Found
- The filesystem customization used `size`, but current RHEL Image Builder blueprint examples and reference documentation use `minsize` for `[[customizations.filesystem]]`. Changed all filesystem entries to `minsize`.
- The blueprint set `hostname = ""`. Red Hat documents `customizations.hostname` as optional and says the default hostname is used if it is not set. Removed the empty hostname assignment to avoid baking an invalid or unintended hostname into the image.
- The download and upload commands assumed a default output filename of `<compose-uuid>-image.raw`. Changed the `composer-cli compose image` command to use `--filename golden-image.raw`, then upload that explicit filename to S3.
- The AWS import example used `"Format": "raw"`, while the AWS CLI `import-image` reference lists `RAW` as the valid disk container value. Updated the value to `RAW`.
- The import command did not capture the import task ID, and later commands queried all completed import tasks. Updated the example to store `IMPORT_TASK_ID` and use `--import-task-ids "$IMPORT_TASK_ID"` when checking status and retrieving the AMI ID.

## Review Notes
The post assumes AWS VM Import/Export prerequisites are already in place, including a writable S3 bucket and the required `vmimport` IAM role. The commands are valid in that context, but a future revision could add a short prerequisite note before the upload section.
