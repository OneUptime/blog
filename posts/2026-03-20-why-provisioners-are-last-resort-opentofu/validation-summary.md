# Validation Summary: How to Understand Why Provisioners Are a Last Resort in OpenTofu

## Status
validated

## Post Type
Guide / Best Practice

## Technologies Covered
- OpenTofu (Terraform fork)
- AWS provider (aws_instance, aws_ami, aws_route53_record)
- Cloud-init / EC2 user_data
- Packer
- Ansible, Chef, Puppet, AWS Systems Manager (mentioned)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- OpenTofu Provisioners Syntax documentation: https://opentofu.org/docs/language/resources/provisioners/syntax/
- AWS provider documentation for `aws_instance`, `aws_ami` data source, and `aws_route53_record`

## Issues Found
No technical issues found.

- The claim that OpenTofu's documentation explicitly calls provisioners "a last resort" is accurate.
- The description of creation-time provisioners running exactly once is correct.
- The tainting behavior on provisioner failure (resource marked tainted, destroyed/recreated on next apply) matches the official documentation.
- The HCL code examples (`aws_instance` with `user_data` heredoc, `aws_ami` data source with `most_recent`/`owners`/`filter`, `aws_route53_record` with `zone_id`/`name`/`type`/`ttl`/`records`) are all syntactically correct and use current, non-deprecated attributes.
- The Mermaid diagram is valid syntax.

## Review Notes
- The claim in section 3 ("Provisioners require network connectivity to the target resource") is most accurate for `remote-exec` and `file` provisioners; `local-exec` provisioners run on the machine executing OpenTofu and don't need connectivity to the target. The context of the post implies remote provisioners, so this is a reasonable simplification rather than an error.
- In newer OpenTofu/Terraform versions, the `tofu taint` CLI command is deprecated in favor of `-replace` on apply, but the underlying state concept of a "tainted" resource as described in the post still applies for provisioner failures.
- The post could benefit from a brief mention of `cloudinit_config` data source for composing multi-part cloud-init configs, but this is an enhancement, not a correction.
