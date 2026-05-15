# Validation Summary: How to Analyze Network Performance with ss, netstat, and nload on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- ss
- netstat
- net-tools
- nload
- EPEL
- ip
- awk
- tcpdump

## Sources Consulted
- Red Hat Enterprise Linux 7 Performance Tuning Guide, ss: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-performance_monitoring_tools-ss
- ss(8) Linux manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Red Hat Customer Portal, using EPEL on RHEL: https://access.redhat.com/solutions/3358
- Fedora Packages, nload package: https://packages.fedoraproject.org/pkgs/nload/nload/
- nload(1) manual page: https://manpages.debian.org/trixie/nload/nload.1.en.html
- Local command help output for `ss --help` and `netstat --help`

## Issues Found
- The nload install example said to install nload from EPEL but did not enable EPEL first. Added the EPEL release package install command and noted that the major version in the URL should match the RHEL major version.
- The nload usage comment said `nload` monitors all interfaces in real time. Adjusted it to "auto-detected interfaces" to match nload behavior and avoid implying that all interfaces are shown simultaneously without `-m`.
- The `ss -tn | awk '{print $5}' | sort | uniq -c | sort -rn | head -10` command was described as finding top connections by data transfer. The command counts remote endpoints, so the comment was corrected to say it finds top remote endpoints by connection count.

## Review Notes
The remaining `ss`, `netstat`, `nload`, and `ip -s link` examples are syntactically valid for current RHEL-style systems when the relevant packages are installed. `netstat` remains a legacy tool from `net-tools`; `ss` is the preferred modern replacement.
