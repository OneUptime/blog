# Validation Summary: How to Access VM Console in Harvester - Access

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- KubeVirt
- `virtctl`
- `kubectl`
- cloud-init
- qemu guest agent
- VNC
- SSH

## Sources Consulted
- Harvester documentation, "Access to the Virtual Machine": https://docs.harvesterhci.io/v1.5/vm/access-to-the-vm/
- Harvester documentation, "Harvester Overview": https://docs.harvesterhci.io/v1.7/
- KubeVirt user guide, "Download and Install the virtctl Command Line Interface": https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- KubeVirt user guide, "Accessing Virtual Machines": https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt user guide, "Guest Agent information": https://kubevirt.io/user-guide/user_workloads/guest_agent_information/
- KubeVirt user guide, "NUMA" (used for a current manifest example showing `autoattachSerialConsole`): https://kubevirt.io/user-guide/compute/numa/
- KubeVirt API reference, `v1.Devices.autoattachSerialConsole`: https://kubevirt.io/api-reference/v1.7.1/definitions.html
- Official `virtctl` v1.8.2 CLI help output (`help`, `console --help`, `vnc --help`, `ssh --help`, `guestosinfo --help`, `fslist --help`, `userlist --help`), binary from: https://github.com/kubevirt/kubevirt/releases/tag/v1.8.2

## Issues Found
- The introduction implied `virtctl` was a Harvester-native third console type. I corrected this to distinguish Harvester UI access from KubeVirt CLI access, which is how the official docs describe it.
- The `virtctl vnc` example used `--vnc-display`, which is not a current `virtctl` flag. I replaced it with the documented `--proxy-only` and `--port` workflow.
- The serial-console VM manifest used a `devices.serial` block that does not match the current KubeVirt VM schema. I replaced it with `devices.autoattachSerialConsole: true`, which is the documented field.
- The `kubectl port-forward` method targeted port `5900` on the `virt-launcher` pod. I replaced it with `virtctl vnc --proxy-only --port 5900`, which is the documented way to expose the VNC session to an external VNC client.
- The troubleshooting example started the VM by patching `spec.running`. I replaced that with `virtctl start`, which is the documented VM start path and avoids `running` versus `runStrategy` ambiguity.
- The guest-agent section was technically inaccurate. It referenced `kubectl exec` even though no `kubectl exec` was used, implied `virtctl ssh` depends on the guest agent, and used `virtctl fsinfo`, which is not a current command. I retitled the section, clarified the SSH requirement, and changed `fsinfo` to `fslist`.
- The GRUB/cloud-init example is distro-specific because it uses `update-grub`. I scoped that subsection to Debian/Ubuntu-style guests so the command set is correctly framed.
- The conclusion described `virtctl console` as useful for scripted automation. I corrected that to headless access and troubleshooting.

## Review Notes
- The post’s approach of matching the downloaded `virtctl` version to the cluster’s KubeVirt version is sound and should be preserved.
- `virtctl guestosinfo`, `fslist`, and `userlist` depend on the qemu guest agent being installed and running inside the guest.
- `virtctl console` connects to the serial console; full boot output depends on the guest OS being configured to emit console output on `ttyS0`.
