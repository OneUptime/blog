# Validation Summary: How to Access VM Console in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- `virtctl`
- `kubectl virt`
- Kubernetes
- Linux serial console configuration
- VNC / `remote-viewer`

## Sources Consulted
- Harvester documentation: Access to the Virtual Machine - https://docs.harvesterhci.io/v1.7/vm/access-to-the-vm/
- Harvester documentation: Harvester Cloud Provider - https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester documentation: Hardware and Network Requirements - https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester documentation: VM Migration Network - https://docs.harvesterhci.io/v1.7/advanced/vm-migration-network/
- Harvester documentation: Troubleshooting Monitoring - https://docs.harvesterhci.io/v1.6/troubleshooting/monitoring/
- KubeVirt user guide: Accessing Virtual Machines - https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt user guide: Download and Install the virtctl Command Line Interface - https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- KubeVirt API reference: `v1.Devices` - https://kubevirt.io/api-reference/v1.6.0/definitions.html
- KubeVirt user guide: Virtual hardware - https://kubevirt.io/user-guide/compute/virtual_hardware/
- KubeVirt kubectl plugin repository - https://github.com/kubevirt/kubectl-virt-plugin
- Red Hat Customer Portal: How does one set up a serial terminal and/or console in Red Hat Enterprise Linux? - https://access.redhat.com/articles/3166931
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization (serial console procedure) - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_and_managing_virtualization/Red_Hat_Enterprise_Linux-9-Configuring_and_managing_virtualization-en-US.pdf
- Ubuntu Server documentation: modifying GRUB-backed kernel parameters - https://documentation.ubuntu.com/real-time/rt-conf/how-to/modify-kernel-boot-parameters/

## Issues Found
- The Harvester UI section stated that the browser console is always VNC. Harvester documents UI access through either VNC or the serial console, and headless images without VGA use the serial console. I updated the wording to reflect that behavior.
- The `kubectl virt` section actually used `virtctl` commands. I corrected the section title and clarified that `kubectl virt` is the krew plugin wrapper for `virtctl`.
- The `virtctl vnc` example implied a terminal-only VNC session. KubeVirt documents that `virtctl vnc` requires `remote-viewer`, or `--proxy-only` if you want only the local VNC proxy. I corrected the command descriptions and added the documented `--proxy-only` usage.
- The `virtctl` install snippet used a list-style JSONPath and a fixed Linux AMD64 download path. I updated it to query the named `kubevirt` resource in `harvester-system` and to use the documented architecture-aware download pattern.
- The Linux serial console instructions mixed RHEL-family and Ubuntu GRUB commands in one path, which would not work as written on Ubuntu. I split the examples into RHEL-family and Ubuntu/Debian variants and kept the serial getty step consistent.
- The SSH tunnel example forwarded the wrong port and did not point `virtctl` at a kubeconfig that matches the tunnel. Harvester documents the management node's local API on `127.0.0.1:6443`, so I updated the example to tunnel that endpoint and use the node's kubeconfig.
- The VM spec example used a nonexistent `serial` field under `spec.template.spec.domain.devices`. KubeVirt exposes serial console attachment through `autoattachSerialConsole`, so I corrected the YAML snippet.
- The troubleshooting section referenced a `virt-vnc` service, which is not a documented Harvester or KubeVirt control-plane component. I replaced that check with `virt-api` pod verification, which is the documented API component involved in console/VNC access.
- Two best-practice bullets made overly absolute claims about recovery paths and Windows access. I softened them so they remain technically accurate without overstating limitations.

## Review Notes
- As of April 30, 2026, Harvester v1.7 documents UI console access as VNC or serial depending on VM graphics configuration.
- As of April 30, 2026, KubeVirt still documents `virtctl vnc` as requiring `remote-viewer` unless `--proxy-only` is used.
- `autoattachSerialConsole` defaults to `true` in KubeVirt, but leaving it explicitly set in a manifest is still valid when the goal is to make console behavior obvious.
