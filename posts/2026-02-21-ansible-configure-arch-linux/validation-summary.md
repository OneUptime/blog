# Validation Summary: How to Use Ansible to Configure Arch Linux

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and inventory
- Arch Linux
- pacman package management
- Arch User Repository (AUR)
- systemd services
- chrony
- OpenSSH
- nftables
- Linux sysctl

## Sources Consulted
- Ansible `community.general.pacman` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/pacman_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.raw` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/raw_module.html
- ArchWiki pacman documentation: https://wiki.archlinux.org/title/Pacman
- ArchWiki system maintenance / partial upgrades guidance: https://wiki.archlinux.org/title/System_maintenance#Partial_upgrades_are_unsupported
- ArchWiki locale documentation: https://wiki.archlinux.org/title/Locale
- ArchWiki Arch User Repository documentation: https://wiki.archlinux.org/title/Arch_User_Repository
- ArchWiki makepkg documentation: https://wiki.archlinux.org/title/Makepkg
- ArchWiki nftables documentation: https://wiki.archlinux.org/title/Nftables

## Issues Found
- The bootstrap command used `pacman -Sy --noconfirm python`, which syncs package databases without performing a full upgrade and can lead to unsupported partial-upgrade states on Arch. Changed it to `pacman -Syu --needed --noconfirm python`.
- The locale task ran `locale-gen` without first ensuring `en_US.UTF-8 UTF-8` was uncommented in `/etc/locale.gen`. Added a `lineinfile` task to enable the locale before generating it.
- The pacman configuration regexes only matched commented defaults, so already-uncommented settings such as `ParallelDownloads = 3` could be duplicated instead of replaced. Updated the regexes to match both commented and uncommented forms.
- The post stated that AUR support requires a helper. Arch supports manual AUR builds with `makepkg` and `pacman -U`; helpers are convenience tools. Reworded the claims to say helpers are commonly used.
- The examples used `ansible.builtin.systemd`, which currently redirects to `ansible.builtin.systemd_service`. Updated service tasks and handlers to the current FQCN.

## Review Notes
The `yay-bin` installation snippet is a pragmatic automation example, but AUR packages still require trust review of PKGBUILD and install files before use. For stricter production workflows, building AUR packages in a clean chroot or internal package repository would be safer than building directly on target hosts.
