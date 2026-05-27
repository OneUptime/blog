# Validation Summary: How to Use Ansible to Manage GRUB Password Protection

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and built-in modules
- GNU GRUB / GRUB 2 authentication
- PBKDF2 GRUB password hashes
- Red Hat, Debian, Ubuntu GRUB configuration paths
- UEFI and legacy BIOS boot modes

## Sources Consulted
- GNU GRUB Manual 2.14, Authentication and authorisation: https://www.gnu.org/software/grub/manual/grub/html_node/Authentication-and-authorisation.html
- GNU GRUB Manual 2.14, menuentry command: https://www.gnu.org/software/grub/manual/grub/html_node/menuentry.html
- GNU GRUB Manual, grub-mkpasswd-pbkdf2 usage: https://www.gnu.org/software/grub/manual/grub/html_node/Invoking-grub_002dmkpasswd_002dpbkdf2.html
- Red Hat Enterprise Linux documentation, Working with the GRUB 2 boot loader: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-working_with_the_grub_2_boot_loader
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.stat module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Local command help for `grub-mkpasswd-pbkdf2` and `update-grub`

## Issues Found
- The original examples used `grub2-mkpasswd-pbkdf2` for all distributions. Debian and Ubuntu commonly provide `grub-mkpasswd-pbkdf2`, so the examples now choose the command by OS family.
- Password-generation tasks embedded the plaintext password in the shell command. They now pass it through the Ansible `stdin` parameter with `no_log: true`.
- The first playbook notified a Red Hat-only handler name, so Debian hosts would not run `update-grub`. The handlers now use a shared `listen` target.
- The UEFI/BIOS section implied Debian/Ubuntu use `/boot/efi/EFI/ubuntu/grub.cfg` as the generated config path. It now uses `/boot/grub/grub.cfg` for Debian-family systems and keeps the Red Hat UEFI path distinction.
- The Debian-family multiboot example did not mark generated menu entries as unrestricted, which would make normal boots require a GRUB password. The restriction task now applies to both OS families.
- The verification `grep -c` task could fail the play when no password was found. It now allows the count to be zero for reporting.
- The audit playbook did not check Debian's `/boot/grub/grub.cfg`. It now includes that path.
- The audit remediation task set `/etc/grub.d/01_users` to `0600`, contradicting the later requirement that GRUB scripts be executable. It now keeps GRUB config permissions separate from the executable `01_users` script.
- The rotation and emergency removal examples rebuilt GRUB only on Red Hat systems. They now also run `update-grub` on Debian-family systems.
- Introductory security and compliance wording was too absolute. It now accounts for firmware running before GRUB and uses less overbroad compliance language.

## Review Notes
- Red Hat documentation recommends `grub2-setpassword` on modern RHEL releases, which writes a `user.cfg` file consumed by the distribution's GRUB scripts. The post's explicit `/etc/grub.d/01_users` approach can still generate valid GRUB authentication directives, but future updates could mention `grub2-setpassword` as the Red Hat-native method.
