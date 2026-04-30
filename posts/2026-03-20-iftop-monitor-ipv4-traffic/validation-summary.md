# Validation Summary: How to Monitor IPv4 Network Traffic with iftop

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iftop`
- Linux networking
- libpcap/BPF capture filters
- `apt`
- `dnf`

## Sources Consulted
- `iftop` upstream source repository: https://code.blinkace.com/pdw/iftop
- `iftop` Fedora package overview: https://packages.fedoraproject.org/pkgs/iftop/iftop/index.html
- `iftop` Fedora EPEL 9 package page: https://packages.fedoraproject.org/pkgs/iftop/iftop/epel-9.html
- `epel-release` Fedora EPEL 9 package page: https://packages.fedoraproject.org/pkgs/epel-release/epel-release/epel-9.html
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Debian `iftop(8)` man page: https://manpages.debian.org/bookworm/iftop/iftop.8.en.html

## Issues Found
- The RHEL/CentOS install command used `yum install iftop` with no EPEL note. Current official package metadata shows `iftop` is provided in EPEL for EL9, and current Red Hat documentation uses `dnf` in RHEL 9. I changed the command to `dnf` and clarified that EPEL must already be enabled.
- The basic usage commands did not actually limit captures to IPv4 even though the post is specifically about IPv4 traffic. Upstream `iftop` currently defaults to capturing `ip or ip6`, so I added `-f 'ip'` to the IPv4-focused examples.
- The post said `-P` shows port numbers. Upstream option parsing shows `-P` only enables port display, while `-N` disables service-name resolution. I corrected the examples to use `-NP` and `-nNP` where numeric port output is intended.
- The interactive `t` key was described too narrowly. Upstream help text shows it cycles display modes rather than simply toggling TX/RX/both, so I updated that description.
- The bandwidth-sorting explanation was imprecise. Upstream defaults sort order to the 10-second average column, so I changed the note to say the highest 10-second average appears at the top.
- The text-report section described `-s` as “run for N seconds then exit.” Upstream usage text is more specific: in text mode, `-s` waits N seconds, prints one report, and exits. I updated the wording to match actual behavior.

## Review Notes
- The packaged Debian `iftop(8)` man page lags current upstream behavior in a few places, especially around interactive key descriptions and text-mode options. For the corrected command flags and key behavior, the upstream source and built-in usage text were the more reliable references.
