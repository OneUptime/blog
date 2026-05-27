# Validation Summary: How to Use Ansible to Manage Disk Partitions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- `community.general.parted`
- `community.general.filesystem`
- `ansible.posix.mount`
- Linux block device tools: `lsblk`, `fdisk`, `parted`, `sfdisk`
- GPT and MBR partition tables
- LVM partition flags

## Sources Consulted
- Ansible `community.general.parted` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/parted_module.html
- Ansible `community.general.filesystem` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Linux `lsblk(8)` manual page: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Linux `sfdisk(8)` manual page: https://man7.org/linux/man-pages/man8/sfdisk.8.html
- GNU Parted manual: https://www.gnu.org/software/parted/manual/parted.pdf

## Issues Found
- The multi-partition and LVM examples used separate `community.general.parted` tasks with `state: present` and `label: gpt` but no `number`. The current module requires `number` for `state: present`, so those tasks would fail validation before creating the disk label. I removed the label-only tasks and set `label: gpt` on the partition-creation tasks instead.
- Several read-only `ansible.builtin.command` and `ansible.builtin.shell` probes registered variables that later tasks use. In Ansible check mode, command and shell tasks without `creates` or `removes` are skipped, which can leave those registered variables unavailable. I added `check_mode: false` to the read-only probe tasks so the post's `--check` guidance works as described without changing target state.
- The discovery example described its shell test as finding disks with "no partition table", but the command checks whether a disk has child partitions. I changed the task name and debug message to say "disks with no partitions".

## Review Notes
The examples use `/dev/sdb1`-style partition paths, which are correct for the shown `/dev/sdb` examples. NVMe and MMC devices usually use a `p` separator, such as `/dev/nvme0n1p1`; a future improvement could show a reusable variable for partition path construction across device families.
