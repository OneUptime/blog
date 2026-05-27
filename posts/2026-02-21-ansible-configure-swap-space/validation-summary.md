# Validation Summary: How to Use Ansible to Configure Swap Space

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and modules
- Linux swap files and swap partitions
- Linux kernel VM sysctl settings
- util-linux swap commands (`swapon`, `swapoff`, `mkswap`, `blkid`)
- Kubernetes node swap behavior

## Sources Consulted
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `community.general.parted` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/parted_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Linux kernel `/proc/sys/vm` documentation: https://docs.kernel.org/6.15/admin-guide/sysctl/vm.html
- Linux `swapon(8)` manual page: https://man7.org/linux/man-pages/man8/swapon.8.html
- Kubernetes swap memory management documentation: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Local util-linux command help for `swapon`, `swapoff`, `mkswap`, `blkid`, and GNU coreutils `dd --help`

## Issues Found
- The post said swap files work on most modern kernels "4.0+". This was too broad and missed filesystem-specific restrictions. Updated the statement to note regular Linux filesystem support and copy-on-write filesystem requirements such as Btrfs.
- The post described `vm.swappiness` as ranging from 0 to 100. Current Linux kernel documentation describes the range as 0 to 200. Updated the explanation and the meaning of values at and above 100.
- The swap partition playbook split GPT table creation into a `community.general.parted` task without a partition number, then created the partition separately. Adjusted it to create the GPT-labeled partition in one task and use a 1MiB start offset.
- The swap partition playbook only enabled the partition when `blkid` failed, so an existing formatted but inactive swap partition would not be activated. Added an active swap check and enabled the partition when it is not active.
- The multiple-swap playbook suppressed all `swapon` failures, hiding missing or invalid swap devices. Updated `failed_when` so "already active" is tolerated but real failures are reported.
- The resize playbook referenced `current_size_mb` in later task conditions even when the swap file did not exist. Added `current_swap_file.stat.exists` to those conditions.
- The Kubernetes section stated that Kubernetes requires swap to be disabled. Current Kubernetes documentation says Linux nodes default to kubelet failure with swap enabled unless configured for swap support. Updated the wording to describe that default behavior accurately.

## Review Notes
The YAML snippets parse successfully. Some operational choices remain environment-dependent, such as using a whole dedicated disk for swap and choosing swap sizes or swappiness values by role.
