# Validation Summary: How to Install GraalVM Native Image on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- GraalVM
- GraalVM Native Image
- Java
- Linux package management with DNF
- Red Hat Subscription Management
- firewalld

## Sources Consulted
- GraalVM Native Image reference manual: https://www.graalvm.org/latest/reference-manual/native-image/
- GraalVM installation on Linux platforms: https://www.graalvm.org/dev/getting-started/linux/
- Red Hat Enterprise Linux 9 Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Customer Portal, enabling and disabling repositories with Subscription Management: https://access.redhat.com/solutions/265523

## Issues Found
- The original post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`, which would not install or verify GraalVM Native Image. Replaced them with the GraalVM Native Image Linux prerequisites: `gcc`, `glibc-devel`, `zlib-devel`, and `libstdc++-static`.
- The original post incorrectly described GraalVM Native Image as a system service with `/etc/<service>/config.conf`, `systemctl`, `journalctl`, and service firewall commands. GraalVM Native Image is a command-line build tool, not a daemon. Replaced those sections with GraalVM archive installation, `JAVA_HOME`/`PATH` setup, and `native-image --version` verification.
- The original firewall section implied a firewall rule was required for installation. No firewall rule is needed to install GraalVM or compile local native images, so the post now states that firewall rules apply only to applications built with Native Image that listen on network ports.
- The original performance tuning section used service process commands that do not apply to Native Image installation. Replaced it with a small Java program and `native-image HelloWorld` build test, matching the official GraalVM documentation.
- The original troubleshooting and security guidance was service-oriented and not specific to GraalVM Native Image. Updated it to cover `PATH`, missing compiler/header packages, CodeReady Linux Builder availability for `libstdc++-static`, and reachability metadata for dynamic Java features.

## Review Notes
The guide now uses GraalVM JDK 25 because the current GraalVM documentation lists GraalVM 25 as the latest release. Users on ARM64 RHEL systems should set `GRAAL_ARCH=aarch64` instead of `x64`.
