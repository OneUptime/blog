# Validation Summary: How to Configure SSH Connections in OpenTofu Provisioners

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu provisioners
- OpenTofu `connection` blocks
- SSH authentication
- Bastion hosts
- OpenTofu `file` and `remote-exec` provisioners
- AWS EC2
- AWS Systems Manager Session Manager

## Sources Consulted
- OpenTofu Provisioner Connection Settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu remote-exec Provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu File Provisioner: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu `file` Function: https://opentofu.org/docs/language/functions/file/
- OpenTofu `pathexpand` Function: https://opentofu.org/docs/language/functions/pathexpand/
- AWS Systems Manager Session Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- Amazon EC2 AMI discovery documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html

## Issues Found
- SSH private key examples passed paths beginning with `~` directly to `file()`. OpenTofu documents `pathexpand()` as the function that expands a leading `~` to the current user's home directory and recommends it for transient uses such as locating SSH keys in `connection` and `provisioner` blocks. Updated the examples to use `file(pathexpand("~/.ssh/id_rsa"))` and `file(pathexpand(var.private_key_path))`.

## Review Notes
- OpenTofu documents provisioners as a last resort; the post's recommendation to consider AWS Systems Manager Session Manager for AWS workloads aligns with AWS documentation.
- SSH host key validation is disabled by default for OpenTofu SSH connections. A future hardening update could mention `host_key` for environments that need host verification.
- The sample EC2 AMI ID is illustrative and region-specific. A future update could use a variable or AMI data source for a more portable AWS example.
