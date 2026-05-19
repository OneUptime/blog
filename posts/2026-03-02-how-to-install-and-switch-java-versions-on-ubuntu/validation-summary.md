# Validation Summary: How to Install and Switch Java Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management with apt/dpkg
- OpenJDK packages
- Eclipse Adoptium Temurin packages
- Oracle JDK
- Debian alternatives system (`update-alternatives`)
- `JAVA_HOME` shell configuration
- direnv
- SDKMAN!

## Sources Consulted
- Ubuntu for Developers: Available Java versions: https://documentation.ubuntu.com/ubuntu-for-developers/reference/availability/java/
- Ubuntu manpage for `update-alternatives`: https://manpages.ubuntu.com/manpages/noble/man1/update-alternatives.1.html
- Eclipse Adoptium Temurin Linux package installation: https://adoptium.net/installation/linux/
- Oracle JDK 21 Linux installation documentation: https://docs.oracle.com/en/java/javase/21/install/installation-jdk-linux-platforms.html
- Linux Uprising Oracle Java PPA page: https://launchpad.net/~linuxuprising/+archive/ubuntu/java
- direnv installation documentation: https://direnv.net/docs/installation.html
- direnv shell hook documentation: https://direnv.net/docs/hook.html
- SDKMAN! usage documentation: https://sdkman.io/usage/

## Issues Found
- The Oracle JDK section used the third-party `ppa:linuxuprising/java` PPA and `oracle-java21-installer` / `oracle-java21-set-default` package names. The PPA documents Oracle Java 11 and 17, not Oracle JDK 21. Replaced this with Oracle's documented Debian-package installation flow using the JDK 21 `.deb` package and `dpkg`.
- The `JAVA_HOME` dynamic export was described as automatically updating when `update-alternatives` changes. In an existing shell, the exported value remains the value computed when the shell configuration was loaded. Clarified that it picks up changes when opening a new shell or sourcing the file again.
- The SDKMAN! section described `sdk use` as a global switch. SDKMAN! documents `sdk use` as applying to the current shell only; `sdk default` is the persistent default. Updated the comment accordingly.
- The closing paragraph called Java 21 a current LTS version. As of 2026, Java 25 is also an LTS release. Changed the wording to "supported LTS version (like Java 21 or 25)."

## Review Notes
The Ubuntu OpenJDK package examples are version-dependent, but Ubuntu's current Java availability documentation lists OpenJDK 8, 11, 17, 21, and 25 for Ubuntu 24.04 LTS. The SDKMAN! example version identifiers may need to be refreshed over time based on `sdk list java`, but the command syntax is correct.
