# Validation Summary: How to Configure Cloud-Init for VMs in Harvester

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- KubeVirt `VirtualMachine` and `cloudInitNoCloud`
- Kubernetes `Secret`
- cloud-init user-data and network-config
- Ubuntu package management with `apt`
- Docker Engine on Ubuntu
- systemd and QEMU guest agent
- Netplan-style cloud-init network config v2

## Sources Consulted
- Harvester Create a Virtual Machine: https://docs.harvesterhci.io/v1.5/vm/index/
- Harvester VM troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/vm/
- KubeVirt Startup Scripts user guide: https://kubevirt.io/user-guide/user_workloads/startup_scripts/
- KubeVirt API Reference: https://kubevirt.io/api-reference/
- cloud-init NoCloud datasource: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- cloud-init user-data formats: https://docs.cloud-init.io/topics/format.html
- cloud-init users and groups examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/user_groups.html
- cloud-init write_files examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- cloud-init network config v2: https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html
- cloud-init re-run guide: https://docs.cloud-init.io/en/latest/howto/rerun_cloud_init.html
- cloud-init CLI reference: https://docs.cloud-init.io/en/latest/reference/cli.html
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
- The introduction described Harvester cloud-init delivery as a virtual CD-ROM. Harvester and KubeVirt document this as an attached ephemeral disk, so I corrected the wording.
- The post said cloud-init accepts only two data types. For NoCloud in this Harvester workflow the post uses user-data and network-data, but cloud-init supports additional configuration types, so I narrowed the claim to this workflow.
- The first user-data example placed comments before `#cloud-config`, even though cloud-init identifies the format from that header. I moved `#cloud-config` to the first line of the snippet.
- The `ubuntu` user examples set fields such as `gecos`, `shell`, and extra groups that are not reliably applied when modifying an existing user. I removed those fields and kept the settings cloud-init documents as valid for existing users, such as `sudo` and `ssh_authorized_keys`.
- The basic example used `ufw` commands without ensuring the package was present. I added `ufw` to the package list.
- The VM manifest used the older `running: true` field. I updated it to `runStrategy: Always`, which matches current Harvester and KubeVirt guidance.
- The `write_files` example wrote an `app:app`-owned file without creating the `app` user and without deferring the write until that user exists. I added a system user and `defer: true`.
- The Docker example used an outdated repository and keyring pattern. I updated it to the current Docker Ubuntu repository setup and package list.
- The debug section used `cloud-init clean --reboot`; I aligned it with current cloud-init guidance by using `cloud-init clean --logs --reboot`.
- The conclusion described the result as immutable VMs. Cloud-init provides repeatable first-boot provisioning, not immutable VMs, so I corrected that claim.

## Review Notes
- The networking examples are valid as examples, but interface names such as `enp1s0` and `enp2s0` must match the actual guest OS interface names.
- The package and user examples assume an Ubuntu or Debian-style cloud image because they rely on `apt`, `systemd`, and the `ubuntu` user convention.
- Harvester cloud-init initialization still runs only on first boot unless the guest's cloud-init state is cleaned and the VM is rebooted.
