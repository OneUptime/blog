# Validation Summary: How to Use the local-exec Provisioner in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provisioners
- Terraform `local-exec`
- Terraform HCL
- AWS CLI / Amazon EKS
- Ansible
- Cloudflare DNS API
- Slack incoming webhooks
- Shell commands

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform resource block and provisioner argument reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform strings and heredoc documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- AWS CLI `eks update-kubeconfig` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Cloudflare DNS records API documentation: https://developers.cloudflare.com/api/resources/dns/subresources/records/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks

## Issues Found
- The post described `local-exec` as the most commonly used and safest provisioner. Terraform's official documentation recommends provisioners only as a last resort, so this was changed to explain that `local-exec` is useful for Terraform-host integration tasks when there is no better Terraform-native or platform-native option.
- The dynamic inventory example wrote worker IPs from each instance provisioner, then used a dependent `null_resource` to overwrite the inventory file header after the workers were created. This would erase the generated worker entries. The example now writes the full inventory from a single `null_resource` after worker IPs are available.
- The error handling section stated that any failed provisioner taints the resource. Terraform only taints resources for failed creation-time provisioners. The wording now distinguishes creation-time tainting from general provisioner failure.
- The `on_failure = continue` explanation implied only warning behavior. It now matches Terraform's documented behavior: Terraform ignores the provisioner error and continues the operation; for creation-time provisioners, this avoids tainting.
- The summary called `local-exec` the "workhorse" and "ideal" for several tasks. This was softened to align with Terraform's recommendation to prefer Terraform-native approaches where available.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
- Several examples interpolate Terraform values directly into shell commands. This is common in tutorials, but Terraform's current documentation warns that interpolating untrusted external values into commands can create shell injection risks. The post already recommends environment variables for values that may contain special characters or secrets.
