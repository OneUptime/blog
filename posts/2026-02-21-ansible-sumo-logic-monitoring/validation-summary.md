# Validation Summary: How to Use Ansible with Sumo Logic for Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Sumo Logic Installed Collector
- Sumo Logic source JSON configuration
- Linux service management
- UFW firewall configuration
- Cron scheduling

## Sources Consulted
- Sumo Logic Docs: Install a Collector on Linux - https://www.sumologic.com/help/docs/send-data/installed-collectors/linux/
- Sumo Logic Docs: Download a Collector from a Static URL - https://www.sumologic.com/help/docs/send-data/installed-collectors/collector-installation-reference/download-collector-from-static-url/
- Sumo Logic Docs: Parameters for the Command Line Installer - https://www.sumologic.com/help/docs/send-data/installed-collectors/collector-installation-reference/parameters-command-line-installer/
- Sumo Logic Docs: Use JSON to Configure Sources - https://www.sumologic.com/help/docs/send-data/use-json-configure-sources/
- Sumo Logic Docs: Local Configuration File Management for New Collectors and Sources - https://www.sumologic.com/help/docs/send-data/use-json-configure-sources/local-configuration-file-management/new-collectors-and-sources/
- Sumo Logic Docs: JSON Parameters for Installed Sources - https://www.sumologic.com/help/docs/send-data/use-json-configure-sources/json-parameters-installed-sources/
- Ansible Documentation: ansible.builtin.cron module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible Documentation: ansible.builtin.uri module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Documentation: ansible.builtin.hostname module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible Documentation: community.general.timezone module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible Documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The Sumo Logic collector download URL used the older `collectors.sumologic.com` host. Updated it to the preferred `download-collector.sumologic.com` Linux x86_64 static URL documented by Sumo Logic.
- The source JSON file was deployed after the installer command referenced it with `-VsyncSources`. Moved source configuration deployment before installation and added a task to create `/etc/sumo`, because Sumo Logic expects the JSON file to exist before first Collector startup/registration.
- The source configuration snippet was labeled as JSON even though it contains Jinja variables for an Ansible template. Changed the fence to `jinja` so the snippet is not presented as literal JSON.
- The deployment task notified an undefined `restart sumo collector` handler. Removed the notification because Sumo Logic `syncSources` continuously watches and synchronizes the configured source JSON.
- The provisioning workflow used `ansible.builtin.timezone`, which is not part of current `ansible.builtin`. Changed it to `community.general.timezone`.
- The UFW tasks assumed the target host had the `ufw` package installed. Added `ufw` to the package installation list.

## Review Notes
The Sumo Logic Installed Collector remains valid, but Sumo Logic documentation now presents its OpenTelemetry Collector distribution as the recommended next-generation collector for many new deployments. The post is still technically relevant because the Installed Collector and JSON source configuration remain documented and supported.
