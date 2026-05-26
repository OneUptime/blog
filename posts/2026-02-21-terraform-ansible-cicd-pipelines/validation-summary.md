# Validation Summary: How to Integrate Terraform and Ansible in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Ansible and Ansible playbooks
- GitLab CI/CD
- GitHub Actions
- CI/CD artifacts
- Infrastructure as Code workflows

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp `setup-terraform` GitHub Action: https://github.com/hashicorp/setup-terraform
- GitHub `actions/checkout`: https://github.com/actions/checkout
- GitHub `actions/upload-artifact`: https://github.com/actions/upload-artifact
- GitHub `actions/download-artifact`: https://github.com/actions/download-artifact
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The GitHub Actions workflow used deprecated artifact actions, `actions/upload-artifact@v3` and `actions/download-artifact@v3`. Updated them to the current documented examples, `actions/upload-artifact@v7` and `actions/download-artifact@v8`, because GitHub's artifact action documentation marks v3 as deprecated for GitHub.com workflows.
- The GitHub Actions workflow ran Terraform commands without explicitly installing Terraform. Added `hashicorp/setup-terraform@v4`, which is the official HashiCorp action for installing Terraform CLI on GitHub Actions runners.
- The GitHub Actions workflow used `actions/checkout@v4`. Updated it to `actions/checkout@v6`, matching the current documented checkout action version.
- The GitHub Actions Ansible job ran `ansible-playbook` without installing Ansible. Added an `apt-get` install step for Ansible on `ubuntu-latest`.
- The playbook used `ansible.builtin.timezone`, but the documented timezone module is `community.general.timezone` and is not part of `ansible-core`. Updated the task to use `community.general.timezone`.

## Review Notes
- The Terraform `plan -out=tfplan`, `terraform apply -auto-approve tfplan`, and `terraform output -json` commands are valid. Note that Terraform's JSON output can include sensitive output values in plain text, so production pipelines should handle generated output files and artifacts carefully.
- The GitLab artifact flow is technically valid: GitLab jobs can pass artifacts to later jobs with `dependencies`. Production pipelines should also pin tool versions and install required Terraform providers, Ansible collections, and cloud credentials explicitly.
