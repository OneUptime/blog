# Validation Summary: How to Deploy a Spring Boot Application as a systemd Service on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service units
- systemctl and journalctl
- Spring Boot executable JAR deployment
- Spring Boot application.properties
- Spring Boot graceful shutdown
- Spring Boot Actuator health endpoint
- OpenJDK 17

## Sources Consulted
- Spring Boot documentation: Installing Spring Boot Applications as a systemd service: https://docs.spring.io/spring-boot/how-to/deployment/installing.html
- Spring Boot documentation: Graceful Shutdown: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot documentation: Logging: https://docs.spring.io/spring-boot/reference/features/logging.html
- Spring Boot documentation: Externalized Configuration: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot Actuator documentation: Endpoints and Health endpoint: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Red Hat Enterprise Linux 9 documentation: Managing systemd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Local systemd manual pages for systemctl, journalctl, and systemd.service

## Issues Found
- The original health check section suggested using the Spring Boot Actuator health endpoint with systemd watchdog by setting `Type=notify` and `WatchdogSec=60`. This was incomplete and would not work for a standard Spring Boot application because systemd requires `READY=1` and periodic `WATCHDOG=1` notifications through `sd_notify` or an equivalent mechanism. I changed the section to say that Actuator health should be used with external monitoring or a separate watchdog helper, and that `Type=notify`/`WatchdogSec` should only be used when the application or wrapper sends the required systemd notifications.

## Review Notes
- The main `Type=simple` unit file is technically valid. Spring Boot's current documentation shows `Type=exec` for its example systemd unit, but `Type=simple` remains a valid systemd service type for a foreground `java -jar` process.
- `SuccessExitStatus=143` is common in Spring Boot service examples. systemd already treats `SIGTERM` as a clean termination for non-oneshot services, but the setting is still accepted and harmless.
