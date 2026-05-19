# Validation Summary: How to Install OpenJDK on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenJDK (Java 8, 11, 17, 21, 25)
- Ubuntu Server (apt package management)
- Eclipse Temurin / Adoptium repository
- `update-alternatives` for managing Java defaults
- JVM tuning flags (`-Xms`, `-Xmx`, `-XX:MaxRAMPercentage`, `-XX:+UseG1GC`)
- `JAVA_HOME` and `JAVA_TOOL_OPTIONS` environment variables

## Sources Consulted
- [OpenJDK Project — JDK 25](https://openjdk.org/projects/jdk/25/)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- [Java version history (Wikipedia)](https://en.wikipedia.org/wiki/Java_version_history)
- [Adoptium / Eclipse Temurin installation docs](https://adoptium.net/installation/linux/)
- [Ubuntu packages: openjdk-25](https://launchpad.net/ubuntu/+source/openjdk-25)
- Arch Linux `java-openjdk11(1)` manual page (for verifying JVM option configuration mechanisms)

## Issues Found

1. **Outdated LTS claim**: The post listed Java 21 as the "Current LTS". As of the validation date (May 2026), Java 25 LTS (released 16 September 2025) is the current LTS, and Java 21 is the previous LTS. Updated the version list and the recommended default for new projects, and added `openjdk-25-jdk` to the example install commands.

2. **Incorrect claim about system-wide JVM options file**: The post stated that system-wide JVM options "go in `/etc/java-21-openjdk/jvm.cfg`". The `jvm.cfg` file (located under `$JAVA_HOME/lib/jvm.cfg`) is used to declare which JVM variants are available (e.g., server/client) and is not a mechanism for setting default JVM memory/GC flags. The canonical portable mechanism is the `JAVA_TOOL_OPTIONS` environment variable. Rewrote the sentence to remove the incorrect file reference while keeping the `JAVA_TOOL_OPTIONS` example.

## Review Notes
- The Adoptium repository setup (GPG key URL, `signed-by` keyring, repository line using `VERSION_CODENAME`) matches Adoptium's official installation instructions.
- `openjdk-25-jdk` is available in current Ubuntu releases (24.04 LTS and newer); for older Ubuntu releases (e.g., 22.04), users may need the `universe` component enabled or to rely on the Adoptium repository.
- The `update-alternatives --config java` sample output is plausible (Ubuntu uses priority numbers like 1111/1711/2111 for OpenJDK 11/17/21); the entry "0 ... auto mode" duplicating the highest-priority manual entry is the documented behavior of `update-alternatives`.
- `-XX:MaxRAMPercentage` is correctly noted as suitable for containerized workloads; it has been available since JDK 10 and is fully supported on the LTS versions discussed.
- `G1GC` (`-XX:+UseG1GC`) is the default collector since Java 9, so the example flag is harmless but redundant on modern JVMs — kept as-is since it is illustrative.
- The `/etc/apt/keyrings/` directory used for the Adoptium key exists by default on modern Ubuntu LTS releases; on much older systems users may need to create it (`sudo install -d -m 0755 /etc/apt/keyrings`). Not flagged as an error since the post targets modern Ubuntu Server.
