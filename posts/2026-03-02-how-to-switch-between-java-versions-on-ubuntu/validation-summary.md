# Validation Summary: How to Switch Between Java Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt package manager)
- OpenJDK (versions 11, 17, 21)
- Debian `update-alternatives` system
- Bash shell scripting and environment variables
- SDKMAN (SDK version manager)
- Apache Maven (compiler plugin properties, mvnw wrapper)
- Gradle (`gradle.properties`, `org.gradle.java.home`)

## Sources Consulted
- Ubuntu/Debian `update-alternatives(1)` man page — https://manpages.ubuntu.com/manpages/jammy/en/man1/update-alternatives.1.html
- Ubuntu package listings for openjdk-11-jdk, openjdk-17-jdk, openjdk-21-jdk — https://packages.ubuntu.com/
- SDKMAN official documentation — https://sdkman.io/usage
- SDKMAN installation page — https://sdkman.io/install
- Apache Maven Compiler Plugin documentation — https://maven.apache.org/plugins/maven-compiler-plugin/
- Gradle documentation on `org.gradle.java.home` — https://docs.gradle.org/current/userguide/build_environment.html
- OpenJDK release information — https://openjdk.org/

## Issues Found
No technical issues found.

All technical content was verified against official documentation:

- **Package names**: `openjdk-11-jdk`, `openjdk-17-jdk`, and `openjdk-21-jdk` are the correct apt package names available across recent Ubuntu LTS releases.
- **Install paths**: `/usr/lib/jvm/java-{version}-openjdk-amd64/` matches the actual layout used by the OpenJDK Ubuntu packages on amd64.
- **`update-alternatives` syntax**: `--list`, `--config`, and `--set` are all valid subcommands and were used correctly.
- **Interactive menu format**: The example output ("There are 3 choices" with 4 displayed lines — auto mode + 3 specific versions) matches actual `update-alternatives --config` behavior.
- **Priority values** (1111, 1711, 2111) align with the priorities that Ubuntu's OpenJDK packages register by default (roughly major-version × 100 + 11).
- **Bash function and script syntax**: Both the `use-java` shell function and the `switch-java.sh` script are syntactically correct.
- **SDKMAN**: The install URL `https://get.sdkman.io` is correct, and the `sdk list/install/use/default/current` commands are all valid.
- **Maven properties**: `maven.compiler.source`, `maven.compiler.target`, and `maven.compiler.release` are all valid Maven Compiler Plugin properties.
- **Gradle property**: `org.gradle.java.home` is a valid Gradle setting for selecting the JDK.
- **Verification commands**: `which java`, `readlink -f $(which java)`, and the PATH inspection with `tr ':' '\n'` are all correct techniques.

## Review Notes
- The use of `sudo` with `update-alternatives --list` is unnecessary (the `--list` subcommand is read-only and does not require root), but it is harmless and not technically incorrect.
- The SDKMAN `-open` suffix refers to vanilla OpenJDK builds from jdk.java.net. These builds receive limited maintenance for newer Java versions, so the `-tem` (Eclipse Temurin) distribution is generally more reliable for current versions — but both forms still work and the specific version strings shown (`21.0.2-open`, `17.0.9-open`) are real published versions.
- The note that `unset JAVA_HOME` does not revert `PATH` is accurate and a helpful warning.
- The post correctly notes that `java` and `javac` are managed as separate alternatives — a common source of confusion that's well worth calling out.
