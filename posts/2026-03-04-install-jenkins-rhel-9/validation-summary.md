# Validation Summary: How to Install Jenkins on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins
- OpenJDK
- systemd
- firewalld
- dnf/yum RPM package management

## Sources Consulted
- Jenkins Linux installation guide: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Java Support Policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins LTS changelog: https://www.jenkins.io/changelog-stable/
- Jenkins Managing systemd services: https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins repository signing key announcement: https://www.jenkins.io/blog/2025/12/23/repository-signing-keys-changing/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Jenkins RPM stable repository file: https://pkg.jenkins.io/rpm-stable/jenkins.repo

## Issues Found
- The post installed OpenJDK 17, but current Jenkins LTS 2.555.1 and later require Java 21 or Java 25. Changed the prerequisite to OpenJDK 21 and used the package set shown in Jenkins' current RPM installation guidance.
- The post used the older `redhat-stable` repository URL. Jenkins now uses the unified `rpm-stable` repository for Red Hat and openSUSE RPM packages and advises users to update older repository configurations. Changed the repository URL to `https://pkg.jenkins.io/rpm-stable/jenkins.repo`.
- The post imported the 2023 Jenkins signing key. Jenkins LTS 2.541.1 and later use the 2026 Linux repository signing key. Changed the import command to `https://pkg.jenkins.io/rpm-stable/jenkins.io-2026.key`.
- The memory override replaced `JAVA_OPTS` without preserving the standard headless Java option shown in Jenkins' systemd examples. Updated the example to include `-Djava.awt.headless=true` alongside the heap settings.

## Review Notes
The firewall, initial admin password, service status, port override, and journal log commands are technically valid. The firewall examples use direct port rules; Jenkins' official guide shows a named firewalld service approach, but direct `--add-port` and `--remove-port` usage is supported by firewalld.
