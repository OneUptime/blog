# Validation Summary: How to Use Ansible to Install and Configure Datadog Agent

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Datadog Agent
- Datadog APM
- Datadog log collection
- Datadog integrations for Nginx, PostgreSQL, and HTTP checks
- Datadog Cloud Network Monitoring / Network Performance Monitoring
- Debian/Ubuntu APT repositories

## Sources Consulted
- Datadog Linux Agent documentation: https://docs.datadoghq.com/agent/supported_platforms/linux/
- Datadog Agent configuration files documentation: https://docs.datadoghq.com/agent/configuration/agent-configuration-files/
- Datadog Agent configuration template: https://raw.githubusercontent.com/DataDog/datadog-agent/main/pkg/config/config_template.yaml
- Datadog log collection documentation: https://docs.datadoghq.com/logs/log_collection/
- Datadog Agent commands documentation: https://docs.datadoghq.com/agent/configuration/agent-commands/
- Datadog Nginx integration documentation: https://docs.datadoghq.com/integrations/nginx/
- Datadog PostgreSQL integration documentation: https://docs.datadoghq.com/integrations/postgres/
- Datadog HTTP check integration documentation: https://docs.datadoghq.com/integrations/http_check/
- Datadog Cloud Network Monitoring setup documentation: https://docs.datadoghq.com/network_monitoring/cloud_network_monitoring/setup/
- Ansible `apt_key` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `deb822_repository` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html

## Issues Found
- The install tasks used `apt_key`, which Ansible documents as relying on the deprecated `apt-key` utility. They also configured the repository with `signed-by=/usr/share/keyrings/datadog-archive-keyring.gpg` without creating that keyring file. Replaced the key and repository setup with `ansible.builtin.deb822_repository` using Datadog's current public key URL, and added `python3-debian`, which the module requires.
- Log source configuration files were copied into `/etc/datadog-agent/conf.d/{{ item.name }}.d/conf.yaml` without ensuring the per-source directory existed. Added a task to create each log source directory first.
- Integration configuration templates wrote to `/etc/datadog-agent/conf.d/<integration>.d/conf.yaml` without explicitly creating those directories. Added a task to create the integration directories before templating.
- The Agent configuration template set `apm_config.apm_dd_url` to a generated Datadog intake URL. That setting is for overriding the APM intake endpoint, commonly for proxy/custom intake cases; the Agent can derive the correct intake from `site`. Removed the forced override.
- Network Performance Monitoring was shown under `datadog.yaml` as `network_config`. Datadog documents Cloud Network Monitoring host setup in `/etc/datadog-agent/system-probe.yaml`. Added a `system-probe.yaml.j2` template and corresponding deployment task.
- The PostgreSQL integration template emitted usernames, passwords, and database names as unquoted YAML scalars. Updated those fields to use Jinja's `quote` filter to avoid malformed YAML when values contain special characters.
- The ad-hoc command for checking an integration ran the check as root. Datadog documents running checks as the `dd-agent` user, so the command now uses Ansible privilege escalation with `--become-user dd-agent`.

## Review Notes
The post now uses current Ansible repository management guidance and Datadog's documented Agent file locations. The custom role remains Ubuntu/Debian-specific; supporting other Linux families would require separate package repository and service-management tasks.
