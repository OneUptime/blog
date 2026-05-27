# Validation Summary: How to Use Ansible with Keycloak for SSO Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Keycloak
- Docker containers
- PostgreSQL JDBC configuration
- OpenID Connect
- Keycloak Admin REST API
- UFW
- cron

## Sources Consulted
- Keycloak container guide: https://www.keycloak.org/server/containers
- Keycloak configuration guide: https://www.keycloak.org/server/configuration
- Keycloak database configuration guide: https://www.keycloak.org/server/db
- Keycloak hostname configuration guide: https://www.keycloak.org/server/hostname
- Keycloak Admin REST API: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Ansible ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible community.docker.docker_container module: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.general.timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.hostname module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.cron module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The Keycloak Docker example used the older `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD` environment variables. Updated them to the current documented `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` variables.
- The Keycloak Docker example used `command: start` without the hostname and HTTP/TLS configuration required by current Keycloak production startup behavior. Added `KC_HOSTNAME` and `KC_HTTP_ENABLED: "true"` so the container can start with the HTTP endpoint used by the later Admin REST API examples.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current timezone module is `community.general.timezone`. Updated the module FQCN.

## Review Notes
- The Keycloak Admin REST API realm and client endpoints, OIDC token endpoint usage, JSON fields such as `realm`, `enabled`, `clientId`, `protocol`, `publicClient`, `redirectUris`, and `webOrigins`, and expected `201`/`409` responses were consistent with the official Admin REST API documentation.
- The generic Ansible examples use valid module parameters, but several are illustrative and assume platform-specific prerequisites such as UFW availability, a compatible SSH service name, a default IPv4 fact, and an existing `ansible` user for cron.
