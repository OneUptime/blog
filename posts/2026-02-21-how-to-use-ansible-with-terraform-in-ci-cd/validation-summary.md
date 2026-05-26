# Validation Summary: How to Use Ansible with Terraform in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provisioners
- Ansible inventory and playbooks
- GitHub Actions
- GitLab CI/CD
- Bash
- Python
- AWS EC2 examples

## Sources Consulted
- Terraform CLI `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform provisioners documentation: https://docs.hashicorp.com/terraform/language/provisioners
- Ansible dynamic inventory developer documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions Python workflow documentation: https://docs.github.com/actions/language-and-framework-guides/using-python-with-github-actions
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/

## Issues Found
- The GitHub Actions example wrote `terraform output -json web_server_ips` directly to `$GITHUB_OUTPUT` and later parsed it with unquoted `echo $WEB_IPS`. GitHub documents single-line output syntax and a separate delimiter form for multiline values; Terraform JSON output is safest to treat as structured data and compact before storing as a single-line step output. Changed the workflow to pipe the output through `jq -c '.'`, quote `$GITHUB_OUTPUT`, and parse the value later with `printf '%s\n' "$WEB_IPS"` to avoid shell word splitting.

## Review Notes
- The examples are pattern-oriented and assume matching Terraform output names, SSH keys, cloud credentials, inventory directories, and Ansible playbooks exist in the repository using them.
- The `local-exec` warning is accurate for default creation-time provisioner failure behavior: Terraform marks the resource as tainted unless `on_failure = continue` is configured.
- The pinned versions in the examples are valid for the demonstrated commands, but teams should periodically refresh Terraform, Ansible, and GitHub Action versions for their own pipelines.
