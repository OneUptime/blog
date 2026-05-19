# Validation Summary: How to Disable IPv6 on Ubuntu When Not Needed

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux IPv6 networking
- sysctl and sysctl.d
- GRUB kernel command-line parameters
- Netplan YAML configuration
- OpenSSH server configuration
- iproute2 commands (`ip`, `ss`)

## Sources Consulted
- Linux kernel IPv6 documentation: https://docs.kernel.org/networking/ipv6.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan tutorial for disabling automatic IPv6 configuration: https://netplan.readthedocs.io/en/stable/netplan-tutorial/
- Ubuntu kernel boot parameter guidance: https://wiki.ubuntu.com/Kernel/KernelBootParameters
- Ubuntu `grub-mkconfig` man page: https://manpages.ubuntu.com/manpages/jammy/man8/grub-mkconfig.8.html
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `sysctl.d(5)` manual: https://www.man7.org/linux/man-pages/man5/sysctl.d.5.html
- IANA IPv6 Address Space registry: https://www.iana.org/assignments/ipv6-address-space
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry
- OpenSSH `sshd_config(5)` manual checked locally with `man sshd_config`
- Local CLI help/version output for `ip`, `ss`, `sysctl`, and `netplan`

## Issues Found
- The address classification example described `2xxx::` and `fc00::` together as global IPv6 addresses. Updated it to use global unicast `2000::/3` and unique local `fc00::/7`, matching IANA IPv6 registries.
- The GRUB section said `ipv6.disable=1` prevents IPv6 from loading at all. Updated the wording because the Linux kernel documentation describes this as disabling IPv6 functionality, not necessarily preventing the module from loading.
- Several `ss` examples used `grep ':::'`, which misses current `ss` output that commonly displays wildcard IPv6 listeners as `[::]:port`. Updated the grep patterns to match both `[::]` and `:::` formats.
- The SSH listener check used `ss -tuln | grep sshd`, but process names are not shown unless `ss` is run with `-p`. Updated the command to `sudo ss -tulnp`.
- The DNS verification comment implied AAAA resolution should fail. Updated it to state that DNS can still return AAAA records even though the local host will not use IPv6 connectivity.
- The revert instructions removed the sysctl.d file and ran `sysctl --system`, but removing a sysctl file does not reset already-applied runtime values. Updated the commands to explicitly set the IPv6 disable sysctls back to `0`.

## Review Notes
The Netplan snippet uses valid keys (`dhcp6`, `accept-ra`, and `link-local`). For future improvement, the guide could mention that `/etc/netplan/00-installer-config.yaml` is only an example filename and that systems may use files such as `50-cloud-init.yaml` instead.
