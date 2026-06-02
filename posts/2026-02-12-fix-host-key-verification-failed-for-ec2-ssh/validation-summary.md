# Validation Summary: How to Fix 'Host Key Verification Failed' for EC2 SSH

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenSSH client and `known_hosts`
- AWS EC2 Linux instances
- AWS CLI
- Ansible configuration
- Terraform SSH provisioner connections

## Sources Consulted
- OpenBSD `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenBSD `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- AWS EC2 general connection prerequisites and instance fingerprint guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs-general.html
- AWS EC2 Linux SSH client connection guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html
- Ansible configuration settings, `HOST_KEY_CHECKING`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- HashiCorp Terraform provisioner connection block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform `file` function reference: https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Terraform `pathexpand` function reference: https://developer.hashicorp.com/terraform/language/functions/pathexpand

## Issues Found
- The AWS CLI console-output example used `grep -A1 "fingerprint"`, which would miss the documented uppercase `SSH HOST KEY FINGERPRINTS` marker and would not show the full fingerprint block. Changed it to query the `Output` field and grep for `SSH HOST KEY FINGERPRINTS` with enough following lines.
- The deploy script stored `~/.ssh/deploy-key.pem` in a quoted shell variable. Quoted tilde paths in variable values are not shell-expanded when passed to `ssh -i`. Changed it to `$HOME/.ssh/deploy-key.pem`.
- The Terraform snippet described `agent = false` as skipping host key checking. Terraform documents `agent` as controlling ssh-agent authentication, while SSH host key verification is controlled by `host_key`, and Terraform does not validate SSH host keys by default. Updated the comment and added a short correction after the snippet.
- The Terraform snippet used `file("~/.ssh/my-key.pem")`. Updated it to `file(pathexpand("~/.ssh/my-key.pem"))` so the home-directory path is expanded explicitly.

## Review Notes
The OpenSSH examples for `ssh-keygen -R`, `StrictHostKeyChecking no`, `StrictHostKeyChecking accept-new`, `UserKnownHostsFile /dev/null`, `LogLevel ERROR`, and `HashKnownHosts no` are technically valid. The recommendation to disable host key checking for automation is operationally common but carries a real security trade-off; the post already warns about that trade-off.
