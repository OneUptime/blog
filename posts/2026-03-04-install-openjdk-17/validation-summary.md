# Validation Summary: How to Install OpenJDK 17 on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat build of OpenJDK 17
- DNF/YUM package installation
- Java and javac command-line tools
- Linux shell environment variables
- alternatives/update-alternatives

## Sources Consulted
- Red Hat Documentation: Installing and using Red Hat build of OpenJDK 17 on RHEL - https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html-single/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing_and_using_red_hat_build_of_openjdk_17_on_rhel
- Red Hat Documentation: Configuring Red Hat build of OpenJDK 17 on RHEL - https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html-single/configuring_red_hat_build_of_openjdk_17_on_rhel/index
- Red Hat Documentation: RHEL 9 considerations, Red Hat build of OpenJDK - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_compilers-and-development-tools_considerations-in-adopting-rhel-9
- Red Hat Customer Portal: Red Hat Enterprise Linux Application Streams Life Cycle - https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- Red Hat Documentation: RHEL 9 Package manifest - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index

## Issues Found
- The verification step ran `javac -version` unconditionally, but `javac` is provided by the JDK package (`java-17-openjdk-devel`), not by the runtime-only package (`java-17-openjdk`). I changed the step to verify `java -version` first and only verify `javac -version` if the JDK package was installed.
- The expected `java -version` output used a fixed-looking `2024-xx-xx` release date placeholder. Because OpenJDK 17 receives ongoing updates, I changed it to a generic `20xx-xx-xx` placeholder to avoid implying a stale release date.

## Review Notes
The package names, installation commands, `JAVA_HOME` path, alternatives command usage, and simple Java program are technically correct for RHEL 9 with Red Hat build of OpenJDK 17. Red Hat documentation commonly shows `yum` for these package operations, and `dnf` is also correct on RHEL 9.
