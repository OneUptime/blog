# Validation Summary: How to Set Up SSH Keys for VMs in Harvester

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- cloud-init
- OpenSSH / `ssh-keygen`
- `kubectl`

## Sources Consulted
- Harvester docs: Access to the Virtual Machine — https://docs.harvesterhci.io/v1.5/vm/access-to-the-vm/
- Harvester docs: Edit a Virtual Machine — https://docs.harvesterhci.io/v1.5/vm/edit-vm
- Harvester API: Create a Namespaced Key Pair — https://docs.harvesterhci.io/v1.7/api/create-namespaced-key-pair/
- KubeVirt user guide: Accessing Virtual Machines — https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt user guide: Run Strategies — https://kubevirt.io/user-guide/compute/run_strategies/
- KubeVirt API reference: `CloudInitNoCloudSource` and `SSHPublicKeyAccessCredential*` definitions — https://kubevirt.io/api-reference/v1.7.1/definitions.html
- KubeVirt source: cloud-init secret resolution — https://github.com/kubevirt/kubevirt/blob/main/pkg/cloud-init/cloud-init.go
- KubeVirt source: access credential secret parsing — https://github.com/kubevirt/kubevirt/blob/main/pkg/virt-launcher/virtwrap/access-credentials/access_credentials.go
- KubeVirt source: `VirtualMachineSpec` deprecation of `running` — https://github.com/kubevirt/kubevirt/blob/main/staging/src/kubevirt.io/api/core/v1/types.go
- Kubernetes docs: Secrets — https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes docs: `kubectl patch` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The VM manifests used deprecated KubeVirt field `spec.running`. I changed them to `spec.runStrategy: Always`, which is the current non-deprecated equivalent.
- The manual cloud-init example incorrectly stated that Harvester automatically creates a Kubernetes `Secret` from a `KeyPair`. I corrected the comments to show that `cloudInitNoCloud.secretRef` points to a separate Secret containing cloud-init user-data.
- The `accessCredentials` section overstated runtime behavior by saying keys could be added to already-running VMs without restart. I corrected the text to distinguish initial attachment from later updates: the credential must be attached before boot or after a restart, while later Secret content updates are applied dynamically.
- The `kubectl patch secret` example for adding a new SSH key would have replaced the existing authorized key set with only the new key. I updated the command so it patches the Secret with the full desired key list.
- The SSH config example disabled host key verification with `StrictHostKeyChecking no`. I removed that line because it weakens SSH host authenticity checks.
- The Ed25519 comment described it as “more secure than RSA.” I changed that to a neutral recommendation because RSA 4096 remains a valid secure option and the original claim was too absolute.

## Review Notes
- Harvester documents that SSH keys selected on the VM `Basics` tab are injected through cloud-init on first boot. Changing those static SSH keys later does not retroactively update the guest unless cloud-init is rerun or reinstalled inside the VM.
- KubeVirt documents that qemu-guest-agent-based SSH key injection requires the guest agent to be installed in the guest. On some SELinux-enabled guest images, additional guest configuration may be needed for guest-agent-managed `authorized_keys`.
