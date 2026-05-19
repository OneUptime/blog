# Validation Summary: How to Install and Configure Tomcat on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenJDK / Java
- Apache Tomcat 10.1
- systemd
- nginx
- logrotate
- UFW

## Sources Consulted
- Apache Tomcat 10 downloads: https://tomcat.apache.org/download-10
- Apache Tomcat version matrix: https://tomcat.apache.org/whichversion.html
- Apache Tomcat 10.1 setup documentation: https://tomcat.apache.org/tomcat-10.1-doc/setup.html
- Apache Tomcat 10.1 Manager App HOW-TO: https://tomcat.apache.org/tomcat-10.1-doc/manager-howto.html
- Apache Tomcat 10.1 HTTP Connector reference: https://tomcat.apache.org/tomcat-10.1-doc/config/http.html
- Apache Tomcat 10.1 Valve reference: https://tomcat.apache.org/tomcat-10.1-doc/config/valve.html
- Apache Tomcat 10.1 AJP Connector reference: https://tomcat.apache.org/tomcat-10.1-doc/config/ajp.html
- Local Ubuntu command help for useradd, groupadd, systemctl, and logrotate.

## Issues Found
- The sample Tomcat version was outdated. Updated `TOMCAT_VERSION` from `10.1.20` to `10.1.55`, the latest Tomcat 10.1 release listed by Apache at validation time.
- The checksum example calculated a local SHA512 hash but did not show how to verify it against Apache's published checksum file. Added download of the `.sha512` file and changed the command to `sha512sum -c`.
- The `/opt/tomcat/conf/*` permission command could remove execute permission from subdirectories such as `conf/Catalina`, making traversal fail. Replaced it with separate `find` commands for files and directories.
- The `source /etc/environment` command does not export `JAVA_HOME` for child processes in the current shell. Replaced it with an explicit `export JAVA_HOME=...` while keeping the persistent `/etc/environment` entry.
- The logrotate snippet omitted `catalina.out` and used `systemctl reload tomcat`, but the shown systemd unit does not define `ExecReload`. Added `catalina.out` and changed the rotation method to `copytruncate`.

## Review Notes
- Tomcat 10.1 targets Jakarta EE 10 APIs and requires Java 11 or later; Java 21 is a valid choice.
- Tomcat Manager access and role examples are technically valid, but production deployments should keep Manager access tightly restricted and avoid granting script/JMX roles to browser users.
