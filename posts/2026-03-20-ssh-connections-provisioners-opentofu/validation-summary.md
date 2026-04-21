# Validation Summary: How to Configure SSH Connections for Provisioners in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu provisioners
- OpenTofu `connection` blocks
- SSH authentication
- SSH bastion hosts
- Terraform/OpenTofu AWS provider resources
- Terraform/OpenTofu TLS provider resources

## Sources Consulted
- OpenTofu Provisioner Connection Settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu `file` function: https://opentofu.org/docs/language/functions/file/
- OpenTofu `pathexpand` function: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- HashiCorp TLS provider `tls_private_key` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/docs/resources/private_key.md
- HashiCorp AWS provider `aws_key_pair` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/key_pair.html.markdown
- HashiCorp AWS provider `aws_instance` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown

## Issues Found
- The basic SSH example used `file("~/.ssh/my-ec2-key.pem")`. OpenTofu provides `pathexpand` for paths beginning with `~`, and its docs specifically recommend it for transient values such as SSH keys in `connection` and `provisioner` blocks. Changed the example to `file(pathexpand("~/.ssh/my-ec2-key.pem"))`.
- The private-key variable example marked the variable only as `sensitive`. OpenTofu's `sensitive` flag suppresses CLI output but does not itself prevent state storage, while current OpenTofu supports `ephemeral` variables in connection blocks. Added `ephemeral = true` and adjusted the comment to say the key is supplied securely.
- The post described `agent = true` as SSH agent forwarding. OpenTofu documents `agent` as using `ssh-agent` for authentication, not forwarding the agent into the remote host. Renamed the section to "SSH Agent Authentication" and updated the description metadata from "agent forwarding" to "SSH agents."
- The dynamically generated key section said the private key "never touches disk" and the conclusion called generated key pairs the most secure approach. The TLS provider documentation says `tls_private_key` stores the private key in state and is not recommended for production deployments. Replaced those claims with a warning that the generated private key is stored in OpenTofu state and that state must be protected.

## Review Notes
Provisioners are technically supported, but OpenTofu's official documentation recommends using them as a last resort. The examples remain illustrative and still use placeholder AMI/key values that must be adapted for a real AWS account and region.
