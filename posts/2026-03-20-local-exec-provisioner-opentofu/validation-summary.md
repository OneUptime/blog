# Validation Summary: How to Use the local-exec Provisioner in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu provisioners
- OpenTofu configuration language (HCL)
- AWS EC2
- AWS CLI
- Consul CLI
- Ansible
- PowerShell

## Sources Consulted
- OpenTofu `local-exec` provisioner docs: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu provisioners docs: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu references to named values (`path.module`, `self`): https://opentofu.org/docs/v1.11/language/expressions/references/
- AWS CLI `ec2 wait instance-status-ok` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/instance-status-ok.html
- Consul `services register` command reference: https://developer.hashicorp.com/consul/commands/services/register

## Issues Found
- The description said `local-exec` runs after a resource is "created or destroyed". Updated this to say it runs after creation, or before destruction when `when = destroy` is set, because destroy-time provisioners run before the resource is destroyed.
- The interpreter section said `local-exec` defaults specifically to `/bin/sh` on Unix and `cmd` on Windows. Updated this to match the official OpenTofu documentation, which states that sensible defaults are chosen based on the operating system.
- The `working_dir` example comment said `${path.module}` was relative to the OpenTofu root. Updated this to say it refers to the current module, which matches the documented meaning of `path.module`.

## Review Notes
- No remaining technical issues found after the corrections above.
- If a sensitive value is used in a provisioner configuration, OpenTofu suppresses provisioner log output in CLI output.
- The examples assume the machine running OpenTofu already has the required local tools installed, such as `python3`, `PowerShell`, `ansible-playbook`, `aws`, and `consul`.
