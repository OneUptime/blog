# Validation Summary: How to Use Ansible to Deploy a Java Spring Boot Application

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Ansible playbooks, roles, modules, handlers, inventory, and Vault
- Java / OpenJDK 17 runtime deployment
- Spring Boot executable JAR deployment
- Spring Boot external configuration, profiles, Actuator, and graceful shutdown
- systemd service units
- Nginx reverse proxy configuration
- Gradle Spring Boot `bootJar` builds

## Sources Consulted
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/6/user_guide/vault.html
- Spring Boot externalized configuration documentation: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot Actuator endpoint documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot Gradle plugin documentation: https://docs.spring.io/spring-boot/gradle-plugin/index.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The playbook templated a new systemd unit and notified a daemon reload, but then immediately tried to enable and start the service before handlers run. This can fail on first deployment because systemd has not reloaded the new unit file yet. Added `daemon_reload: yes` to the enable/start task so the unit is available immediately.
- The versioned deployment cleanup snippet claimed to keep the last 5 JAR versions, but the loop removed every matched JAR whenever more than 5 were found. Changed the loop to delete only the older entries before the newest five: `{{ (old_jars.files | sort(attribute='mtime') | list)[:-5] }}`.

## Review Notes
- The examples are otherwise consistent with current Ansible module behavior, Spring Boot configuration properties, Actuator endpoint exposure, Gradle `bootJar` usage, Nginx reverse proxy syntax, and systemd service options.
- `StandardOutput=append:` and `StandardError=append:` are valid systemd syntax in current systemd releases, but older distributions with systemd versions before this option was introduced may need journald logging or another logging approach.
