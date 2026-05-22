# Validation Summary: How to Use Terraform with Puppet for Configuration

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Terraform
- AWS EC2 and security groups
- Puppet Server
- Puppet agent
- Puppet external facts
- Puppet certificate authority and autosigning
- Puppet Bolt
- Bash and cloud-init user data

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform meta-arguments documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- HashiCorp AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Puppet Core policy-based autosigning documentation: https://help.puppet.com/core/current/Content/PuppetCore/ssl_policy_based_autosigning.htm
- Puppet Core Apt repository setup documentation: https://help.puppet.com/core/current/Content/PuppetCore/enable_the_puppet_platform_apt.htm
- Puppet Core built-in variables and trusted facts documentation: https://help.puppet.com/core/current/Content/PuppetCore/lang_facts_builtin_variables.htm
- Puppet Core external facts documentation: https://help.puppet.com/osp/current/Content/PuppetCore/external_facts.htm
- Puppet Core `puppet agent` man page: https://help.puppet.com/core/current/Content/PuppetCore/Markdown/agent.htm
- Puppet Core certificate authority and SSL documentation: https://help.puppet.com/core/current/Content/PuppetCore/ssl_certificates.htm
- Puppet Server CA commands documentation: https://help.puppet.com/core/current/Content/PuppetCore/puppet_server_ca_cli.htm
- PuppetDB node deactivation documentation: https://help.puppet.com/pdb/8/topics/maintain_and_tune.htm
- Puppet Bolt command reference: https://help.puppet.com/bolt/current/topics/bolt_command_reference.htm

## Issues Found
- The `puppet_role` variable claimed the role was assigned via trusted facts, but the bootstrap script writes a JSON external fact under `/etc/puppetlabs/facter/facts.d`. Updated the description to say "external fact" because Puppet trusted facts come from certificate data, not ordinary external facts.
- The autosigning section said the policy was based on trusted facts and the sample script commented that it validated CSR extensions, but the code only parses the CSR and checks the certname pattern. Updated the surrounding text and comment to match the implementation.
- The autosign configuration command used `--section master`. Current Puppet documentation uses the `[server]` section for Puppet Server and CA autosign settings. Updated it to `--section server`.
- The reusable module used `puppet cert clean`, which has been removed in Puppet 6 and later. Replaced it with `puppetserver ca clean --certname`, matching current Puppet Server CA tooling.

## Review Notes
- The Terraform snippets are illustrative and omit some surrounding declarations such as AMI data sources and input variables for VPC, subnet, keys, and counts. That is acceptable for a guide, but a future version could make this clearer.
- The use of Terraform provisioners and `null_resource` is technically valid, but HashiCorp recommends using provisioners sparingly because Terraform cannot fully model their side effects.
- The Puppet Core Apt repository documentation now describes authenticated Puppet Core repositories; environments using public Puppet repositories or Puppet Enterprise repositories may need to adjust repository setup details.
