# Validation Summary: How to Use Ansible to Configure GRUB Boot Loader

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- GNU GRUB / GRUB2
- Linux kernel command-line parameters
- Debian/Ubuntu bootloader tooling
- Red Hat Enterprise Linux bootloader tooling
- Jinja templating in Ansible expressions

## Sources Consulted
- GNU GRUB Manual 2.14, Simple configuration: https://www.gnu.org/software/grub/manual/grub/html_node/Simple-configuration
- GNU GRUB Manual 2.14, Configuration: https://www.gnu.org/software/grub/manual/grub/html_node/Configuration.html
- GNU GRUB Manual 2.14, password_pbkdf2 and GRUB authentication sections: https://www.gnu.org/software/grub/manual/grub/grub.html
- Red Hat Enterprise Linux 9 documentation, configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 7 documentation, protecting GRUB 2 with a password: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-working_with_the_grub_2_boot_loader
- Ansible documentation, ansible.builtin.command: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation, ansible.builtin.slurp: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible documentation, ansible.builtin.lineinfile: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation, ansible.builtin.regex_findall: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/regex_findall_filter.html
- Jinja template designer documentation, assignments and namespace behavior: https://jinja.palletsprojects.com/en/3.1.x/templates/
- Linux kernel documentation, kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- systemd kernel command-line documentation: https://www.freedesktop.org/software/systemd/man/latest/kernel-command-line.html
- Local command help/man pages for update-grub, grub-mkconfig, and grub-mkpasswd-pbkdf2.

## Issues Found
- The introduction said GRUB is the first thing that runs during boot. I changed this to say firmware loads GRUB early, because BIOS/UEFI firmware runs before GRUB.
- The GRUB config path was listed only as `/boot/grub/grub.cfg`. I updated it to include the common RHEL path `/boot/grub2/grub.cfg`.
- The `GRUB_CMDLINE_LINUX` parser used `regex_search(..., '\1') | first | default('')`, which can fail when the setting is absent. I changed it to `regex_findall(...) | first | default('')`.
- The Jinja loop that removed existing kernel parameter keys reassigned a variable inside a loop, which does not persist outside the loop in Jinja. I changed it to use a namespace object and anchored matching.
- RHEL kernel command-line regeneration examples did not account for current RHEL BLS behavior. I added `--update-bls-cmdline` where the examples regenerate GRUB after command-line changes.
- The Kubernetes profile used `systemd.unified_cgroup_hierarchy=1`, which is deprecated in current systemd documentation. I removed it from the active parameter list.
- The Kubernetes profile described `cgroup.memory=nokmem` as reserving memory. I corrected it to describe disabling cgroup v1 kernel memory accounting and left it commented as an older-kernel option.
- The GRUB password hash task used a shell pipeline with an interpolated password. I changed it to `ansible.builtin.command` with `stdin` and extracted the hash with a regex.
- The RHEL GRUB password example manually wrote `/etc/grub.d/01_users`, while Red Hat documents `grub2-setpassword` as the standard approach. I changed the RHEL task to use `grub2-setpassword`.
- The Debian `--unrestricted` edit used `lineinfile` in a way that could only update one matching line and could add duplicate flags. I changed it to an idempotent `replace` task that updates all matching menuentry lines without duplicating `--unrestricted`.
- Several file-editing tasks lacked `backup: true` even though the safety section implied backups. I added `backup: true` where Ansible supports it and adjusted the safety wording.
- The default-kernel example set `GRUB_SAVEDEFAULT=true` without `GRUB_DEFAULT=saved`, which GNU GRUB documents as the useful pairing. I removed that task from the pinned-kernel example.
- The boot process diagram used GRUB legacy-style stage names. I changed it to GRUB EFI binary/boot image and core image/modules terminology.

## Review Notes
The examples remain intentionally distribution-focused and should still be tested on a non-critical host before fleet rollout, especially because GRUB menu entry names and generated config paths can vary by distribution, release, firmware mode, and packaging.
