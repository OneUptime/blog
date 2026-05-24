# Validation Summary: How to Fix Terraform SSH Connection Timeout in Provisioners

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (provisioners, connection block, AWS provider)
- AWS (EC2 instances, security groups, network ACLs, key pairs, subnets, bastion hosts)
- SSH (key authentication, ssh-agent, key formats)
- Cloud-init / user_data
- OpenSSH CLI (`ssh`, `ssh-keygen`, `ssh-add`)

## Sources Consulted
- Terraform provisioner `connection` block reference: https://developer.hashicorp.com/terraform/language/resources/provisioners/connection
- Terraform `remote-exec` provisioner: https://developer.hashicorp.com/terraform/language/resources/provisioners/remote-exec
- AWS provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_network_acl_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS provider `aws_key_pair`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- AWS EC2 default user docs (per-AMI default usernames): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs.html
- OpenSSH `ssh-keygen` man page (key format conversion with `-m PEM`)

## Issues Found
- **Section 8 title**: Changed "Fix 8: Agent Forwarding" to "Fix 8: SSH Agent Authentication". The original title was a terminology error — in SSH, "agent forwarding" specifically refers to forwarding the local agent socket to a remote host (typically with `ForwardAgent yes` or `ssh -A`). The Terraform `agent = true` connection attribute only configures the provisioner to authenticate using the local SSH agent, which is a different concept. The body text was already accurate ("Use the SSH agent for authentication"); only the heading needed correcting.

## Review Notes
- All Terraform `connection` block attributes used (`type`, `user`, `private_key`, `host`, `port`, `timeout`, `agent`, `bastion_host`, `bastion_user`, `bastion_private_key`) are valid per the Terraform documentation.
- The default SSH connection timeout of 5 minutes is correct.
- The AMI-to-default-user mapping is accurate for current official AMIs (Amazon Linux → `ec2-user`, Ubuntu → `ubuntu`, CentOS → `centos`, Debian → `admin`, RHEL → `ec2-user`, SUSE/SLES → `ec2-user`). Note: very old SUSE AMIs used `root`, but modern AWS Marketplace SUSE images use `ec2-user`.
- `aws_network_acl_rule` syntax and the reminder about ephemeral return ports (1024–65535) is correct.
- The `ssh-keygen -p -m PEM -f <key>` command for converting key formats is correct.
- The claim that "Terraform automatically disables strict host key checking for provisioner connections" is accurate — the SSH communicator does not verify host keys unless `host_key` is explicitly set.
- The example AMI ID `ami-0c55b159cbfafe1f0` is a well-known placeholder used in many Terraform tutorials; readers should substitute a current region-appropriate AMI.
- Worth noting for future updates: HashiCorp officially recommends avoiding provisioners and the post correctly mentions this in the "Alternatives" section.
