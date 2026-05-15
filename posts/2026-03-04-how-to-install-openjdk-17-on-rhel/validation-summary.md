# Validation Summary: How to Install OpenJDK 17 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat build of OpenJDK 17
- Java JDK and JRE
- dnf/yum package management
- alternatives
- JVM runtime options

## Sources Consulted
- Red Hat Documentation: Installing and using Red Hat build of OpenJDK 17 on RHEL - https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html-single/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing_and_using_red_hat_build_of_openjdk_17_on_rhel
- Red Hat Documentation: Configuring Red Hat build of OpenJDK 17 on RHEL - https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html-single/configuring_red_hat_build_of_openjdk_17_on_rhel/index
- Red Hat Documentation: Software management tools in Red Hat Enterprise Linux 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/con_software-management-tools-in-red-hat-enterprise-linux-9_managing-software-with-the-dnf-tool
- Oracle Java SE 17 documentation: The java Command - https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html

## Issues Found
- The scripted `alternatives --set java` example used a hard-coded package-version path (`/usr/lib/jvm/java-17-openjdk-17.0.10.0.7-2.el9.x86_64/bin/java`). That path is version-, architecture-, and RHEL-release-specific and may not exist on current systems. Changed it to derive the installed Java 17 alternative from the `java-17-openjdk` family before calling `alternatives --set`, matching Red Hat's documented non-interactive approach.

## Review Notes
- Red Hat's OpenJDK 17 documentation primarily shows `yum`, but using `dnf` is appropriate on modern RHEL because `dnf` is the package manager used by current RHEL releases and supports the same package names shown in the post.
- The `JAVA_HOME=/usr/lib/jvm/java-17-openjdk` value is valid for package-managed installations; Red Hat documents this symlink as controlled by `alternatives`.
- The JVM options shown are valid Java 17 options. `-XX:+UseG1GC` is already the default in Java 17, but including it explicitly is not technically incorrect.
