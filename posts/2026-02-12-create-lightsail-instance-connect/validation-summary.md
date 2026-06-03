# Validation Summary: How to Create a Lightsail Instance and Connect to It

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lightsail
- AWS CLI
- SSH
- Linux server setup
- cloud-init / Lightsail launch scripts

## Sources Consulted
- AWS CLI Command Reference: create-instances - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-instances.html
- AWS CLI Command Reference: get-blueprints - https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-blueprints.html
- AWS CLI Command Reference: get-bundles - https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-bundles.html
- AWS CLI Command Reference: download-default-key-pair - https://docs.aws.amazon.com/cli/latest/reference/lightsail/download-default-key-pair.html
- AWS CLI Command Reference: create-key-pair - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-key-pair.html
- AWS CLI Command Reference: import-key-pair - https://docs.aws.amazon.com/cli/latest/reference/lightsail/import-key-pair.html
- AWS CLI Command Reference: create-instance-snapshot - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-instance-snapshot.html
- AWS CLI Command Reference: create-instances-from-snapshot - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-instances-from-snapshot.html
- AWS CLI Command Reference: get-instance-port-states - https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-instance-port-states.html
- Amazon Lightsail User Guide: Lightsail instance bundles - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- Amazon Lightsail User Guide: Connect to Linux or Unix instances with SSH - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-ssh-using-terminal.html
- Amazon Lightsail User Guide: Manage SSH key pairs and connect to instances - https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-ssh-in-amazon-lightsail.html
- Amazon Lightsail User Guide: Configure Linux/Unix instances with launch scripts - https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-configure-server-additional-data-shell-script.html
- Amazon Lightsail User Guide: Blueprints packaged by Bitnami - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-bitnami-blueprints.html

## Issues Found
- The bundle query labeled `transferPerMonthInGb` as `Transfer_TB`. AWS returns this field in GB, so the output label was changed to `Transfer_GB`.
- The bundle filter checked only `supportedPlatforms[0]`. This would miss a Linux bundle if the platform array order changed, so it was changed to a `contains(supportedPlatforms, LINUX_UNIX)` query.
- The post described `small_3_0` as the $5/month 1 GB plan. Current AWS examples list `small_3_0` as the Small 2 GB bundle and `micro_3_0` as the Micro 1 GB bundle. The example instance creation commands now use `micro_3_0`, and the price/vCPU wording now tells readers to check current `get-bundles` output.
- The `import-key-pair` example did not remove newline wrapping from the base64 output and did not mention AWS CLI's documented `ssh-rsa` public key requirement. The command now strips newlines and the comment calls out `ssh-rsa`.
- The default username list said WordPress/LAMP/Node.js varies. AWS Lightsail SSH documentation identifies Bitnami instances with the `bitnami` user, so the list was updated accordingly.

## Review Notes
- The AWS CLI was not installed in the local workspace, so command validation was performed against the current official AWS CLI v2 command reference and Amazon Lightsail user guide.
- Lightsail prices, bundle CPU counts, available blueprints, and default networking options are version- and region-sensitive. The post now avoids hard-coding a stale price for the Micro 1GB bundle and points readers to `get-bundles` for current values.
- AWS notes that Bitnami-packaged Lightsail blueprints stopped receiving newer versions on May 19, 2026, and some will be deprecated for new instance creation on November 19, 2026 or May 19, 2027. The post remains valid on June 3, 2026, but future updates should revisit Bitnami blueprint availability.
