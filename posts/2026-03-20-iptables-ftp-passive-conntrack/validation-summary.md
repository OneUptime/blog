# Validation Summary: How to Use ip_conntrack_ftp for Passive FTP Through iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux netfilter connection tracking
- iptables
- FTP passive mode
- `nf_conntrack_ftp`
- Linux kernel module loading
- `sysctl`

## Sources Consulted
- Linux kernel documentation: Netfilter Conntrack Sysfs variables — https://www.kernel.org/doc/html/v5.14/networking/nf_conntrack-sysctl.html
- `iptables-extensions(8)` manual page — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `conntrack(8)` manual page — https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- conntrack-tools user manual — https://conntrack-tools.netfilter.org/manual.html
- Debian `modules(5)` man page for `/etc/modules` — https://manpages.debian.org/bullseye/kmod/modules.5.en.html
- systemd `modules-load.d(5)` documentation — https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Local verification: `modinfo nf_conntrack_ftp`, `modinfo ip_conntrack_ftp`, `iptables -j CT -h`, `iptables -m conntrack -h`

## Issues Found
- The main firewall example relied only on loading `nf_conntrack_ftp` plus `ESTABLISHED,RELATED`, which is incomplete on modern kernels where `net.netfilter.nf_conntrack_helper` defaults to `0`. I added an explicit raw-table `CT --helper ftp` rule and updated the conclusion to reflect current behavior.
- The post used legacy `-m state --state ...` matches in examples. I replaced them with `-m conntrack --ctstate ...`, which is the current interface documented by `iptables-extensions(8)`.
- The post described helper-created expectations as if they were visible in the main conntrack table and showed a `[EXPECTED]` line there. I corrected the explanation and replaced the verification and troubleshooting commands with expectation-table `conntrack` commands.
- The `cat > /etc/modules-load.d/... << 'EOF'` persistence example would fail for non-root shells because the redirection happens before `sudo`. I replaced it with a `sudo tee`-based command.
- The non-standard-port section did not account for explicit helper assignment on modern kernels. I added the raw-table `CT --helper ftp` rule for port `2121` and kept the module `ports=2121` example as the automatic-assignment variant.

## Review Notes
- `modprobe ip_conntrack_ftp` is still valid as a legacy alias for `nf_conntrack_ftp`; local `modinfo` output confirmed the alias on the review system.
- The verification commands that use `conntrack` assume `conntrack-tools` is installed; the post now states that where relevant.
- The post is technically focused on locally filtered IPv4 FTP traffic. FTP through NAT can additionally require `nf_nat_ftp`, but NAT configuration is outside the scope of this article.
