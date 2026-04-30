# Validation Summary: How to Configure VM Access Credentials in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes Secrets
- cloud-init
- qemu-guest-agent
- SSH
- YAML
- `kubectl`

## Sources Consulted
- Harvester VM access docs: https://docs.harvesterhci.io/v1.7/vm/access-to-the-vm/
- Harvester VM creation docs: https://docs.harvesterhci.io/v1.7/vm/index/
- Harvester Windows VM creation docs: https://docs.harvesterhci.io/v1.7/vm/create-windows-vm/
- KubeVirt access docs: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt VM creation docs: https://kubevirt.io/user-guide/user_workloads/creating_vms/
- KubeVirt API schema: https://github.com/kubevirt/kubevirt/blob/main/staging/src/kubevirt.io/api/core/v1/schema.go
- KubeVirt access-credential implementation: https://github.com/kubevirt/kubevirt/blob/main/pkg/virt-launcher/virtwrap/access-credentials/access_credentials.go
- cloud-init SSH examples: https://cloudinit.readthedocs.io/en/stable/reference/yaml_examples/ssh.html
- cloud-init password examples: https://cloudinit.readthedocs.io/en/latest/reference/yaml_examples/set_passwords.html
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The credential matrix said password via cloud-init supports Windows. Harvester's Windows VM docs state Cloud Config is not applied to Windows-based VMs, so this was corrected to Linux-only.
- The Linux cloud-init SSH example used distro-specific `sshd` file edits and a `systemctl restart sshd` command that are not universally valid. This was replaced with the portable cloud-init setting `ssh_pwauth: false`.
- The dynamic SSH-key example listed `admin` in `qemuGuestAgent.users`, but that user was not created in the guest. Harvester requires the target user to already exist, so the nonexistent user was removed.
- The SSH-key Secret examples used an `authorized_keys` entry. KubeVirt documents Secret-backed SSH credentials as file/key entries, and the implementation accepts per-entry key data, so the example was aligned to `key1`, `key2`, and `key3`.
- The password Secret example was incorrect. `userPassword.qemuGuestAgent` does not take a `userPasswordFile` field; KubeVirt expects `qemuGuestAgent: {}` and reads usernames from Secret key names. The example was corrected so the Secret key is `Administrator` and the VM manifest uses the correct schema.
- The credential-rotation verification step used `virtctl guestosinfo`, which reports guest OS metadata and does not verify `authorized_keys` contents. This was replaced with an SSH command that checks the guest's `~/.ssh/authorized_keys` file directly.
- The Harvester UI steps referred to an `Advanced` tab generically. The wording was updated to match current Harvester docs, which describe cloud-init under the `Advanced Options` section.
- The Harvester UI cloud-init password example did not enable SSH password authentication. `ssh_pwauth: true` was added so the example matches the stated use case of password-based access.

## Review Notes
- KubeVirt's `qemuGuestAgent` propagation updates the contents of an already attached Secret without restarting the VM, but attaching a new Secret to a running VM still requires a restart.
- On SELinux-enforcing guests, dynamic SSH key management through `qemu-guest-agent` may require the `virt_qemu_ga_manage_ssh` boolean described in the KubeVirt docs. The post's examples use Ubuntu-style users, so the current snippets remain consistent with a non-SELinux guest.
- Ed25519 is a strong default for SSH keys, but some FIPS-constrained environments may require a different key type.
