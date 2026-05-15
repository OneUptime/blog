# Validation Summary: How to Configure Jenkins with Java 17 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins
- Java 17 / OpenJDK 17
- systemd
- alternatives
- Maven
- Jenkins Declarative Pipeline

## Sources Consulted
- Jenkins Java Support Policy: https://www.jenkins.io/doc/book/platform-information/support-policy-java/
- Jenkins Upgrade to Java 17 guide: https://www.jenkins.io/doc/book/platform-information/upgrade-java-to-17/
- Jenkins Linux installation guide for Red Hat Enterprise Linux and derivatives: https://www.jenkins.io/doc/book/installing/linux/
- Jenkins Managing systemd services: https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins Pipeline Syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Red Hat build of OpenJDK 17 configuration guide for RHEL: https://docs.redhat.com/en-us/documentation/red_hat_build_of_openjdk/17/pdf/configuring_red_hat_build_of_openjdk_17_on_rhel/Red_Hat_build_of_OpenJDK-17-Configuring_Red_Hat_build_of_OpenJDK_17_on_RHEL-en-US.pdf
- RHEL 9 considerations for OpenJDK 17: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_compilers-and-development-tools_considerations-in-adopting-rhel-9

## Issues Found
- The post described Java 17 as the recommended LTS version for Jenkins on RHEL. Jenkins' current support policy says newer Jenkins releases may require Java 21 or newer, while Java 17 remains supported only for specific Jenkins release lines. Updated the introduction and closing paragraph to make the version support caveat explicit.
- The `alternatives --set` examples used versioned wildcard paths. Replaced them with Red Hat's documented `alternatives --display ... | grep "family java-17-openjdk"` approach so the commands select the registered Java 17 alternative instead of relying on fragile shell glob expansion.
- The post said `systemctl status jenkins` verifies Jenkins is using Java 17. Updated that wording and added a `/proc/<MainPID>/exe` check to verify the Java executable used by the running Jenkins process.

## Review Notes
The Jenkins Pipeline `tools` block, Maven setup, systemd override format, OpenJDK 17 package names, and Jenkins tool configuration steps are consistent with the consulted documentation. For newest Jenkins deployments as of 2026-05-15, Java 21 should generally be considered before Java 17 because the latest Jenkins release lines require Java 21 or newer.
