# Validation Summary: How to Switch Between Multiple Java Versions with alternatives on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat build of OpenJDK
- Java and javac
- dnf/yum package management
- alternatives command
- JAVA_HOME environment variable

## Sources Consulted
- Red Hat Documentation: Installing Red Hat build of OpenJDK 21 on RHEL, including installing multiple major versions and switching with `update-alternatives --config 'java'`: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html/installing_and_using_red_hat_build_of_openjdk_21_on_rhel/installing-openjdk-on-rhel_openjdk
- Red Hat Documentation: Interactively selecting a system-wide Red Hat build of OpenJDK version on RHEL, including `alternatives --config java`, separate `javac` configuration, and alternatives master behavior: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html/configuring_red_hat_build_of_openjdk_21_on_rhel/interactively-selecting-systemwide-openjdk-version-on-rhel
- Red Hat Documentation: Configuring Red Hat build of OpenJDK 21 on RHEL, including non-interactive alternatives selection and application-specific `JAVA_HOME`: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html-single/configuring_red_hat_build_of_openjdk_21_on_rhel/configuring_red_hat_build_of_openjdk_21_on_rhel
- Local CLI reference for `update-alternatives --help` syntax. The review environment was not RHEL and did not include `dnf` or the RHEL `alternatives` command, so RHEL-specific commands were verified against Red Hat documentation.

## Issues Found
- The post was a generic service template and did not explain Java alternatives on RHEL. Replaced placeholder package, service, firewall, logging, and performance-tuning commands with RHEL OpenJDK installation and alternatives commands.
- The original dependency guidance installed `epel-release` and "Development Tools", which are not required for Red Hat build of OpenJDK packages from RHEL repositories. Replaced this with a repository availability check and explicit OpenJDK package installation.
- The original package examples used `<package-name>`, which was not actionable. Replaced it with versioned OpenJDK development packages such as `java-21-openjdk-devel`, `java-17-openjdk-devel`, and `java-11-openjdk-devel`.
- The original configuration steps referenced `/etc/<service>/config.conf`, `systemctl`, `journalctl`, and firewall service rules, which do not apply to switching Java versions. Replaced them with `alternatives --config java`, `alternatives --config javac`, version verification, and `JAVA_HOME` guidance.
- The original troubleshooting section described service startup, SELinux file context, and port conflict issues, none of which are relevant to Java alternatives. Replaced them with alternatives selection, missing `javac`, and application `JAVA_HOME`/`PATH` checks.

## Review Notes
The revised post focuses on system-wide Java selection with RHEL package-managed OpenJDK installations. Red Hat documents `java` and `javac` alternatives as separate selections, so both are covered. The exact OpenJDK versions available depend on the RHEL major version and enabled repositories.
