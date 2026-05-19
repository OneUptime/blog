# Validation Summary: How to Install and Configure WildFly (JBoss) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu
- OpenJDK / Java
- WildFly / JBoss
- Jakarta EE
- systemd
- WildFly management CLI
- Elytron TLS configuration
- Undertow

## Sources Consulted
- WildFly 39 Getting Started Guide: https://docs.wildfly.org/39/Getting_Started_Guide.html
- WildFly 39.0.1 release announcement: https://www.wildfly.org/news/2026/02/12/WildFly-39-0-1-is-released/
- WildFly GitHub releases: https://github.com/wildfly/wildfly/releases
- WildFly 39 Admin Guide: https://docs.wildfly.org/39/Admin_Guide.html
- WildFly 39 Elytron Security Guide: https://docs.wildfly.org/39/WildFly_Elytron_Security.html
- WildFly Core systemd files: https://github.com/wildfly/wildfly-core/tree/32.0.0.Final/core-feature-pack/common/src/main/resources/content/bin/systemd

## Issues Found
- The post pinned WildFly `31.0.0.Final`, which is outdated. Updated the example to `39.0.1.Final`, the current final release found during review.
- The introduction said WildFly implements the "full Jakarta EE specification." Updated this to "Jakarta EE Platform" to match WildFly's official compatibility wording.
- The standalone configuration used `WILDFLY_OPTS` for JVM heap and GC options. Updated the example to use `JAVA_OPTS` for JVM options and `WILDFLY_OPTS` for WildFly server arguments.
- The systemd section used an older hand-written `launch.sh` and service file pattern. Updated it to use the current bundled `bin/systemd/generate_systemd_unit.sh`, generated `wildfly-standalone.service`, and `wildfly-standalone.conf` workflow.
- The HTTPS CLI example attempted to add an `https-listener` named `https`, which can fail because WildFly's default configuration already has that listener. Updated the example to create and store a PKCS12 keystore, create the Elytron key manager and SSL context, and write the SSL context onto the existing HTTPS listener.

## Review Notes
The guide is technically relevant and now aligns with current WildFly 39 documentation. The examples still use simple clear-text credentials for demonstration; a future hardening pass could replace those with Elytron credential store examples.
