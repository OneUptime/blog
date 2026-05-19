# Validation Summary: How to Set JAVA_HOME Environment Variable on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (system configuration)
- OpenJDK / Java (JDK 11, 17, 21)
- Eclipse Temurin (Adoptium) JDK
- systemd (unit files, EnvironmentFile)
- PAM (`pam_env`, `/etc/environment`)
- Bash shell initialization (`.bashrc`, `.profile`, `/etc/profile.d/`)
- `update-alternatives`
- cron

## Sources Consulted
- Oracle Java 21 `java` command specification: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- Adoptium Linux installation docs: https://adoptium.net/installation/linux/
- Ubuntu manpage — `update-alternatives(1)`: https://manpages.ubuntu.com/manpages/noble/en/man1/update-alternatives.1.html
- Ubuntu manpage — `pam_env(8)`: https://manpages.ubuntu.com/manpages/noble/en/man8/pam_env.8.html
- Ubuntu manpage — `pam_env.conf(5)`: https://manpages.ubuntu.com/manpages/noble/en/man5/pam_env.conf.5.html
- systemd `systemd.exec(5)` documentation for `Environment=` and `EnvironmentFile=` directives

## Issues Found
1. **Incorrect Java flag — `-XshowSettings:property`**: The post used `java -XshowSettings:property -version` in the verification section. The correct category name per Oracle's official Java command reference is `properties` (plural). Valid `-XshowSettings:` values are `all`, `locale`, `properties`, `vm`, and `system`. Fixed by changing `property` to `properties`.

2. **Incorrect Temurin installation path**: The post stated that installing Temurin places the JDK at `/usr/lib/jvm/temurin-21-amd64`. The actual path used by the Adoptium APT package `temurin-21-jdk` on Ubuntu is `/usr/lib/jvm/temurin-21-jdk-amd64` (with the `-jdk-` segment). Fixed the `ls` output comment and the example path accordingly.

## Review Notes
- The `-XshowSettings:all` variant (used earlier in the post) is correct and unchanged — only the `property`/`properties` instance needed correction.
- Minor caveat not corrected (out of scope of factual errors): `source /etc/environment` will set the variables as shell variables in the current bash session (sufficient for `echo $JAVA_HOME`), but does not actually export them to child processes, since `/etc/environment` lacks `export` statements. The post's example still works as written for the demonstration.
- The `update-alternatives --query java | grep "^Value:"` approach is correct on Ubuntu's OpenJDK packaging because the alternative target points at `/usr/lib/jvm/<dist>/bin/java`; if Ubuntu ever switches the alternative target to a wrapper script in `/usr/bin`, the `dirname $(dirname ...)` trick would break, but this is currently accurate.
- The `pam_env` note in the post correctly captures that systemd-started services do not inherit `/etc/environment` — this is an important and often overlooked pitfall.
- Examples use modern LTS versions (Java 11, 17, 21), which remain current as of 2026.
