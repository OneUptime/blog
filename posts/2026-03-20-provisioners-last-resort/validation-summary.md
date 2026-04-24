# Validation Summary: Provisioners as a Last Resort in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu provisioners (`local-exec`, `remote-exec`, `file`)
- `terraform_data`
- AWS EC2 `user_data`
- cloud-init
- HashiCorp Packer
- Helm provider
- Ansible

## Sources Consulted
- OpenTofu provisioners overview: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data`: https://opentofu.org/docs/language/resources/tf-data/
- Packer provisioners overview: https://developer.hashicorp.com/packer/docs/provisioners
- cloud-init boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- cloud-init user-data formats: https://docs.cloud-init.io/en/latest/explanation/format/index.html
- Helm provider docs overview: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider v6 upgrade guide (`user_data` clear text note): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Ansible host list inventory plugin: https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/host_list_inventory.html
- Ansible `ansible-playbook` CLI docs: https://docs.ansible.com/ansible/2.9/cli/ansible-playbook.html

## Issues Found
- The idempotency example used a standalone `provisioner` block, which is not valid OpenTofu syntax, and used `mkdir /app`, which can fail on the first run because `/app` typically requires elevated permissions. I changed it to a valid `terraform_data` + `local-exec` example that still demonstrates non-idempotent behavior.
- The “hidden state” explanation was too loose. I updated it to match the docs more precisely: creation-time provisioners run only during resource creation, not updates, so script changes are not re-run unless the resource is replaced.
- The cloud-init comment claimed the approach was “idempotent,” which is too broad. cloud-init/user-data runs during boot, but idempotency depends on the specific modules or script content. I changed the comment to describe the boot-time and SSH-avoidance benefits instead.
- The configuration-management example used `null_resource`, while current OpenTofu guidance recommends `terraform_data` for provisioners not tied to another managed resource. I replaced the example accordingly and kept the Ansible single-host inventory syntax correct.
- The defensive `remote-exec` example used `curl` for verification without ensuring `curl` was installed. I changed the verification step to `systemctl is-active --quiet nginx` and aligned the error-handling line with the OpenTofu docs’ `set -o errexit` guidance.

## Review Notes
- Destroy-time provisioners are technically valid, but OpenTofu documents important caveats: they do not run with `create_before_destroy = true`, they must still exist in configuration at destroy time, and they should be safe to rerun if a destroy apply fails.
- The `local-exec` Ansible example assumes the machine running OpenTofu has Ansible installed and network reachability to the target instance.
- AWS provider v6 stores `user_data` in clear text, so future examples should avoid putting secrets there.
