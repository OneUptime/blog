# Validation Summary: OpenTofu vs Ansible: Choosing the Right Infrastructure Tool

## Status
validated

## Post Type
Comparison/Guide

## Technologies Covered
- OpenTofu (Terraform fork)
- Ansible
- HCL (HashiCorp Configuration Language)
- YAML
- AWS (aws_instance, S3, VPC, EKS examples)
- ansible-playbook CLI

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- Terraform/OpenTofu provisioners (`local-exec`, `self` references): https://opentofu.org/docs/language/resources/provisioners/local-exec/
- Ansible documentation (modules, playbooks): https://docs.ansible.com/ansible/latest/
- Ansible apt module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- ansible-playbook CLI flags: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- AWS provider for Terraform/OpenTofu (aws_instance resource arguments)

## Issues Found
- **"agent-based or SSH-based configuration" in Best Practices section**: The original text suggested Ansible is used for "agent-based or SSH-based" configuration. Ansible is agentless by design — it connects to managed nodes via SSH (Linux/Unix) or WinRM (Windows). Calling it "agent-based" contradicts the table earlier in the post which correctly states Ansible is "Agentless: Yes (SSH)". Changed to "SSH-based or WinRM-based configuration" to be accurate.

## Review Notes
- The HCL examples are syntactically correct, including the `count` argument, module composition, and `local-exec` provisioner with `self.public_ip` (valid inside provisioner blocks).
- The Ansible inline inventory pattern `-i 'HOST,'` (trailing comma) is the documented way to pass an ad-hoc host list to `ansible-playbook`.
- The `<<-EOF` heredoc and `${self.public_ip}` / `${var.ssh_key_path}` interpolations follow HCL2 semantics correctly.
- The "Rollback: State-based" cell for OpenTofu is a fair simplification — OpenTofu has no built-in rollback command, but reverting state/config to re-apply prior infrastructure is the standard approach.
- The table characterization "Idempotency: Module-dependent" for Ansible is accurate: while most core modules are idempotent, `command`/`shell` are not unless guarded with `creates`/`removes`/`changed_when`.
- The example `module "eks"` references `module.vpc.vpc_id` — this assumes the VPC module exposes a `vpc_id` output, which is convention but not guaranteed; readers cloning the snippet should ensure their module exports it.
