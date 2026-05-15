# Validation Summary: How to Configure Network Services for the RHCSA Exam on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux networking
- NetworkManager and nmcli
- hostnamectl
- firewalld and firewall-cmd
- DNS troubleshooting tools
- Linux connectivity testing commands

## Sources Consulted
- Red Hat EX200 RHCSA exam objectives: https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam
- Red Hat Enterprise Linux 9 networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat hostnamectl documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_networking/changing-a-hostname-using-hostnamectl
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld open port or service guide: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- Local command help for nmcli and hostnamectl

## Issues Found
No technical issues found.

## Review Notes
The examples assume that the NetworkManager connection profile is named after the interface, such as `ens192`; on real systems, users should confirm the profile name with `nmcli connection show` before modifying it. The DNS examples using `dig` and `nslookup` are valid, but those tools may require the appropriate DNS utilities package on minimal RHEL installations.
