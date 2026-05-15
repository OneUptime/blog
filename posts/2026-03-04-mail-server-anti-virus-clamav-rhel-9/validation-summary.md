# Validation Summary: How to Set Up Mail Server Anti-Virus Scanning with ClamAV on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- EPEL
- ClamAV
- freshclam
- clamd
- clamav-milter
- Postfix milters
- systemd
- SELinux

## Sources Consulted
- ClamAV package installation documentation: https://docs.clamav.net/manual/Installing/Packages.html
- ClamAV configuration documentation: https://docs.clamav.net/manual/Usage/Configuration.html
- ClamAV system requirements documentation: https://docs.clamav.net/
- ClamAV Docker memory notes: https://docs.clamav.net/manual/Installing/Docker.html
- Fedora/EPEL ClamAV package metadata: https://packages.fedoraproject.org/pkgs/clamav/
- Fedora/EPEL clamd package metadata: https://packages.fedoraproject.org/pkgs/clamav/clamd/
- Fedora/EPEL clamav-freshclam package metadata: https://packages.fedoraproject.org/pkgs/clamav/clamav-freshclam/
- Fedora/EPEL clamav-milter package metadata: https://packages.fedoraproject.org/pkgs/clamav/clamav-milter/
- Fedora ClamAV packaging README/spec from src.fedoraproject.org: https://src.fedoraproject.org/rpms/clamav
- Postfix MILTER_README: https://www.postfix.org/MILTER_README.html
- clamav-milter.conf(5) manpage for ClamAV 1.4.3: https://manpages.debian.org/testing/clamav-milter/clamav-milter.conf.5.en.html
- Red Hat EPEL guidance for RHEL 9: https://www.redhat.com/it/blog/whats-epel-and-how-do-i-use-it

## Issues Found
- The EPEL enablement command used `dnf install epel-release`, which is not the full documented RHEL 9 flow. I changed it to enable CodeReady Builder with `subscription-manager` and install the EPEL release RPM from Fedora's official permalink.
- The prerequisites understated ClamAV resource requirements. I updated the RAM and disk guidance to match ClamAV's current minimum recommendations.
- The freshclam automatic-update comment called `clamav-freshclam` a timer. Fedora/EPEL provides a `clamav-freshclam.service`, so I corrected the wording.
- The milter socket path used `.sock`, while Fedora/EPEL documentation recommends `/run/clamav-milter/clamav-milter.socket`. I updated the ClamAV milter and Postfix snippets to use the same path.
- The Postfix integration did not account for Fedora/EPEL runtime directory permissions. I added `usermod -a -G clamilt postfix`, set `MilterSocketGroup clamilt`, and changed the Postfix action from reload to restart so group membership is applied.
- The monitoring example claimed to count infected messages in the last day but only counted all `FOUND` lines in the log. I changed the comment to accurately describe the command.
- The memory troubleshooting note gave a narrow 1-1.5 GB figure. I revised it to explain that ClamAV uses more than 1 GB for signatures and may use much more during database reloads.

## Review Notes
The tutorial is technically relevant and valid after the fixes. In production, administrators should still review local Postfix chroot settings, SELinux denials, and existing milter chains before applying the snippets unchanged.
