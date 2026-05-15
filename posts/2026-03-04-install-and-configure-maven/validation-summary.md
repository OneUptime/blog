# Validation Summary: How to Install and Configure Maven on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- Apache Maven
- Red Hat build of OpenJDK
- Bash shell configuration

## Sources Consulted
- Apache Maven Installation: https://maven.apache.org/install.html
- Apache Maven Configuration: https://maven.apache.org/configure.html
- Apache Maven Settings Reference: https://maven.apache.org/settings.html
- Apache Maven Help Plugin effective-settings goal: https://maven.apache.org/plugins/maven-help-plugin/effective-settings-mojo.html
- Apache Maven Quickstart Archetype: https://maven.apache.org/archetypes/maven-archetype-quickstart/
- Apache Maven parallel builds guidance: https://cwiki.apache.org/confluence/display/MAVEN/Parallel+builds+in+Maven+3
- Red Hat documentation for installing RHEL content with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/installing-rhel-content
- Red Hat documentation for installing Red Hat build of OpenJDK 17 on RHEL: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing-openjdk-on-rhel_openjdk

## Issues Found
- The post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`. Replaced them with `sudo dnf install -y maven`, `rpm -qi maven`, and `mvn -v`, which match Maven and DNF documentation.
- The post installed `epel-release` and the `"Development Tools"` group as required dependencies. These are not required to install Maven from RHEL repositories, so the dependency step now installs `java-17-openjdk-devel`, which provides the JDK Maven needs.
- The post treated Maven as a systemd service with `<service>` placeholders, `systemctl`, `journalctl`, and firewall rules. Maven is a command-line build tool, not a daemon, so those commands were replaced with Maven configuration and verification commands.
- The post referenced a nonexistent generic service configuration file at `/etc/<service>/config.conf`. Replaced it with the documented Maven user settings file location, `~/.m2/settings.xml`.
- The verification section used an invalid `sudo <service> --test` command. Replaced it with `mvn -v`, `mvn help:effective-settings`, and a Maven quickstart archetype project build test using the documented archetype coordinates.
- The tuning section used service memory inspection commands that do not apply to Maven. Replaced them with `MAVEN_OPTS` and Maven's `-T` parallel build option, with a caution about plugin and project compatibility.
- Security and troubleshooting guidance was service-oriented and not applicable to Maven. Updated it to cover non-root Maven usage, settings file credentials, HTTPS repositories, Java validation, PATH checks, and dependency download issues.

## Review Notes
The post now covers a repository-based Maven installation on modern RHEL systems. For environments that require a specific upstream Maven version newer than the packaged RHEL version, a future revision could add a separate manual installation path from Apache Maven binary archives.
