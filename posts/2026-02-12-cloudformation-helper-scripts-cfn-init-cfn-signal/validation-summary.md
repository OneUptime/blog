# Validation Summary: How to Use CloudFormation Helper Scripts (cfn-init, cfn-signal)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation helper scripts: cfn-init, cfn-signal, cfn-get-metadata, cfn-hup
- AWS::CloudFormation::Init metadata
- EC2 UserData
- Amazon Linux 2023
- systemd
- Bash
- Apache HTTP Server, PHP, MariaDB

## Sources Consulted
- AWS CloudFormation helper scripts reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-helper-scripts-reference.html
- AWS CloudFormation cfn-init reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-init.html
- AWS CloudFormation cfn-signal reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-signal.html
- AWS CloudFormation cfn-hup reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-hup.html
- AWS CloudFormation AWS::CloudFormation::Init reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-init.html
- AWS CloudFormation CreationPolicy reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html
- Amazon Linux 2023 LAMP tutorial: https://docs.aws.amazon.com/linux/al2023/ug/ec2-lamp-amazon-linux-2023.html
- Amazon Linux 2023 package list: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html

## Issues Found
- The main AL2023 example installed a `mysql` package. Amazon Linux 2023 documentation uses MariaDB for the LAMP stack and lists `mariadb105-server` as the installable MariaDB server package, so the package was changed to `mariadb105-server`.
- The main AL2023 example managed services under `sysvinit`. AWS documents systemd support for Amazon Linux 2 and above with current `aws-cfn-bootstrap`, so the example was changed to use `systemd`, include a `cfn-hup` systemd unit file, and reload systemd before starting services.
- The main `UserData` script used `#!/bin/bash -xe` and then called `cfn-signal -e $?`. With `set -e`, a failed `cfn-init` can terminate the script before `cfn-signal` runs, so the script now captures the `cfn-init` exit code and signals it explicitly.
- The health-check example had the same `set -e` failure-signal problem. It now captures the `cfn-init` exit code, sends a failure signal immediately if initialization fails, and exits with that code.

## Review Notes
- The post is technically relevant and the overall explanation matches AWS documentation: helper scripts are explicitly invoked from templates, `cfn-init` reads `AWS::CloudFormation::Init`, `cfn-signal` works with `CreationPolicy`, and `cfn-hup` watches metadata updates.
- The Ubuntu/Debian helper-script installation command uses AWS's documented tarball URL, but AWS also notes that Ubuntu installations need a `cfn-hup` init script symlink if `cfn-hup` will be managed as a service.
