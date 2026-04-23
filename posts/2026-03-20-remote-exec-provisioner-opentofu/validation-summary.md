# Validation Summary: How to Use the remote-exec Provisioner in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- `remote-exec` provisioner
- `file` provisioner
- SSH and WinRM provisioner connections
- AWS EC2 examples

## Sources Consulted
- OpenTofu `remote-exec` Provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu Provisioner Connection Settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu File Provisioner: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu `depends_on` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu References to Named Values: https://opentofu.org/docs/language/expressions/references/
- OpenTofu `local-exec` Provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/

## Issues Found
- The basic syntax example used `user = "ubuntu"` alongside a generic AMI placeholder. I added an inline note clarifying that `ubuntu` is the default SSH user for Ubuntu AMIs, because the login user depends on the selected image.
- The full EC2 bootstrap example would not work as written on a fresh Ubuntu instance because it tried to move `/tmp/app.conf` into `/etc/myapp/app.conf` without creating `/etc/myapp`, and then attempted to start a `myapp` systemd unit that the example never installed. I changed the commands to create the target directory, install the config file safely, and verify the Node.js runtime instead.
- The connection-failures section incorrectly suggested adding `depends_on` so security groups are created before SSH. OpenTofu already infers dependencies from direct references such as `vpc_security_group_ids = [aws_security_group.ssh.id]`, and `depends_on` is intended for hidden dependencies. I corrected the explanation, removed the redundant security group dependency from the example, and added the missing `private_key` setting so the connection block is complete.

## Review Notes
- OpenTofu documents that `inline` commands are concatenated into a script, so `on_failure` applies only to the final command unless the script explicitly enables fail-fast behavior. Adding `set -o errexit` as the first command would make future examples more robust.
- OpenTofu also documents that SSH host key validation is disabled by default for provisioner connections to newly created resources. The post is still technically correct without covering that detail, but it may be worth mentioning in a future revision for security-sensitive readers.
