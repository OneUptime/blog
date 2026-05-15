# Validation Summary: How to Deploy a Spring Boot Application as a systemd Service on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Spring Boot
- systemd
- Java 17 / OpenJDK
- Bash
- curl
- Spring Boot Actuator

## Sources Consulted
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot logging documentation: https://docs.spring.io/spring-boot/reference/features/logging.html
- Spring Boot externalized configuration documentation: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot Actuator endpoint documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Red Hat OpenJDK 17 on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing-openjdk-on-rhel_openjdk
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemctl manual/help output: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- useradd manual/help output: https://man7.org/linux/man-pages/man8/useradd.8.html
- curl manual output: https://curl.se/docs/manpage.html

## Issues Found
- The graceful shutdown section said to "Enable it in your application." Current Spring Boot documentation says graceful shutdown is enabled by default for supported embedded web servers. Changed the wording to "Configure it explicitly in your application" so the snippet remains valid without implying that current Spring Boot requires the property to enable graceful shutdown.

## Review Notes
- The systemd service syntax, restart policy, logging directives, filesystem hardening directives, and `systemctl`/`journalctl` commands are valid.
- The `curl` health check is syntactically correct and targets Spring Boot Actuator's default health endpoint. In a minimal RHEL installation, `curl` and the Spring Boot Actuator dependency may need to be installed or included separately.
