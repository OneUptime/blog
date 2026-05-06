# Validation Summary: How to Use Cloud-Init Instead of Provisioners in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- cloud-init
- OpenTofu provisioners
- Linux shell scripting
- YAML cloud-config

## Sources Consulted
- OpenTofu `templatefile` documentation: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu provisioners documentation: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- cloud-init boot stages documentation: https://docs.cloud-init.io/en/latest/topics/boot.html
- cloud-init module reference: https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init CLI documentation: https://docs.cloud-init.io/en/latest/reference/cli.html

## Issues Found
- The introduction said cloud-init runs before any SSH connection is available. I corrected this to say it runs during first boot without requiring an SSH session from the OpenTofu host, which matches cloud-init boot-stage behavior more accurately.
- The `templatefile` example wrote to `/etc/myapp/config.json` without creating `/etc/myapp`, manually interpolated JSON in a way that could break escaping, and attempted to start a `myapp` systemd service that the example never defined. I added `mkdir -p /etc/myapp`, switched the JSON body to `jsonencode(...)`, and removed the invalid service commands.
- The cloud-config example wrote an Nginx config file without deferring it until after packages were installed. I added `defer: true` to match cloud-init’s documented pattern for files that depend on installed packages.
- The cloud-config example used `$UPTIME` in `final_message`, but cloud-init documents the variable as lowercase `$uptime`. I corrected the variable name.
- The comparison table overstated several behaviors, including network dependency, retry behavior, config-change behavior, drift detection, and security requirements. I rewrote those cells to align with OpenTofu provisioner behavior, AWS provider `user_data` semantics, and cloud-init’s documented behavior.

## Review Notes
- The examples remain AWS-centric even though the description mentions other cloud providers. The guidance is still broadly valid, but provider-specific `user_data` behavior can differ outside AWS.
- `cloud-init status --wait` can be useful when you need to block until first-boot configuration is complete, although the existing `cloud-init status` command shown in the post is still valid for checking current state.
