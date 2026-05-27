# Validation Summary: How to Use Ansible with New Relic for APM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- New Relic Infrastructure agent
- New Relic APM
- New Relic Python agent
- New Relic Java agent
- APT repositories and package installation
- UFW firewall management
- YAML and INI configuration

## Sources Consulted
- New Relic: Install the infrastructure agent for Linux - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/linux-installation/package-manager-install/
- New Relic: Configure the infrastructure agent using Ansible - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/config-management-tools/configure-ansible/
- New Relic: Configure the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/configure-infrastructure-agent/
- New Relic: Infrastructure agent configuration settings - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/
- New Relic: Python agent configuration - https://docs.newrelic.com/docs/python/python-agent-configuration/
- New Relic: Python agent admin script advanced usage - https://docs.newrelic.com/docs/apm/agents/python-agent/installation/python-agent-admin-script-advanced-usage/
- New Relic: Initialize Python agent API - https://docs.newrelic.com/docs/apm/agents/python-agent/python-agent-api/initialize-python-agent-api/
- New Relic: Java agent configuration file - https://docs.newrelic.com/docs/apm/agents/java-agent/configuration/java-agent-configuration-config-file/
- New Relic: Include the Java agent with a JVM argument - https://docs.newrelic.com/docs/apm/agents/java-agent/additional-installation/include-java-agent-jvm-argument/
- Ansible: ansible.builtin.apt_key module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible: ansible.builtin.get_url module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible: ansible.builtin.apt_repository module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible: community.general.ini_file module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ini_file_module.html
- Ansible: community.general.timezone module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The infrastructure install example used `ansible.builtin.apt_key`. Ansible documents that this module relies on the deprecated `apt-key` command and is kept for backward compatibility. Replaced it with a keyring file downloaded via `ansible.builtin.get_url` and referenced from the APT repository with `signed-by`.
- The Python APM configuration example used `lineinfile` against an INI file. New Relic's generated `newrelic.ini` can contain multiple `app_name` entries and a commented `log_file`, so the task could edit the wrong line or append `log_file` in the wrong section. Replaced it with `community.general.ini_file` targeting the `newrelic` section.
- The Python APM section installed and configured the agent but did not state that the application must load it. Added a short note to start the app with `newrelic-admin run-program` and `NEW_RELIC_CONFIG_FILE`, or initialize the agent from application code.
- The Java APM section installed and configured the agent but did not state that the JVM must include the agent jar. Added a short note to include `-javaagent:{{ app_dir }}/newrelic/newrelic.jar` in the application JVM options or service definition.
- The infrastructure provisioning workflow used `ansible.builtin.timezone`, which is not the current fully qualified module path. Updated it to `community.general.timezone`.

## Review Notes
- The post uses `community.general` modules (`ini_file`, `timezone`, and `ufw`), so playbooks that run with `ansible-core` only will need the `community.general` collection installed.
- The `log.forward: true` setting forwards the infrastructure agent's own logs. Forwarding application logs requires separate files under the infrastructure agent logging configuration directory.
