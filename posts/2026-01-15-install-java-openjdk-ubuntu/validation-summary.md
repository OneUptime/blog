# Validation Summary: How to Install Java (OpenJDK) on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (20.04, 22.04, 24.04)
- OpenJDK (8, 11, 17, 21)
- Oracle JDK
- `apt` package manager (`default-jdk`, `openjdk-*-jdk`, `openjdk-*-jre`)
- `update-alternatives`
- JAVA_HOME / shell profile configuration (`~/.bashrc`, `/etc/profile.d`)
- SDKMAN (Temurin/Adoptium, GraalVM CE, Oracle distributions)
- Maven and Gradle
- Android development (Android Studio JDK)

## Sources Consulted
- OpenJDK / Java SE release history (LTS versions: 8, 11, 17, 21; Java 21 released September 2023) — https://www.oracle.com/java/technologies/java-se-support-roadmap/
- Ubuntu package archive — `openjdk-*-jdk`, `default-jdk` package names — https://packages.ubuntu.com/
- Debian/Ubuntu `update-alternatives` behavior and priority scheme for OpenJDK — `man update-alternatives`
- SDKMAN official documentation and install command — https://sdkman.io/install
- Oracle JDK downloads — https://www.oracle.com/java/technologies/downloads/
- Eclipse Temurin (Adoptium) — https://adoptium.net/

## Issues Found
No technical issues found.

## Review Notes
- The `update-alternatives --config java` sample output is realistic: priority values (2111 for java-21, 1711 for java-17, 1111 for java-11) match the version-derived priorities Debian/Ubuntu generate, and showing selection 0 (auto) alongside an identical manual entry for the highest-priority JDK is consistent with actual tool behavior.
- `default-jdk` resolves to different OpenJDK versions depending on the Ubuntu release (e.g., openjdk-11 on 22.04, openjdk-21 on 24.04). The post does not claim a specific mapping, so no correction is needed, but readers may notice the version differs by release.
- The `apt install gradle` package is typically outdated compared to the latest Gradle; the post already recommends the Gradle wrapper as the preferred alternative, which is the correct guidance.
- SDKMAN version identifiers (e.g., `21.0.1-tem`, `21.0.1-graalce`) are illustrative; exact available identifiers change over time and should be confirmed with `sdk list java`, which the post already instructs readers to run.
- All commands, the JAVA_HOME resolution via `readlink`, and the test Java program are syntactically correct and current.
