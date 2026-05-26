# Validation Summary: How to Use Ansible to Install and Configure Filebeat

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Filebeat
- Elastic APT repositories
- Elasticsearch
- Logstash
- Kibana
- ELK Stack log shipping

## Sources Consulted
- Elastic Filebeat quick start and module setup documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Elastic Filebeat command reference: https://www.elastic.co/docs/reference/beats/filebeat/command-line-options
- Elastic Filebeat multiline configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/multiline-examples
- Elastic Filebeat module configuration documentation: https://www.elastic.co/guide/en/beats/filebeat/current/configuration-filebeat-modules.html
- Elastic Filebeat ingest pipeline loading documentation: https://www.elastic.co/docs/reference/beats/filebeat/load-ingest-pipelines
- Elastic Filebeat output configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-output
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html

## Issues Found
- The default variable `filebeat_version: "8.11"` was used directly in the Elastic APT repository URL. Elastic's APT repository paths are major-version paths such as `9.x`, not exact minor versions like `8.11`. Changed the variable to `filebeat_repository_version: "9.x"` and updated the repository URL accordingly.
- The installation tasks used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` utility. Replaced the separate `apt_key` and `apt_repository` tasks with `ansible.builtin.deb822_repository`, using Elastic's signing key through `signed_by`, and added installation of the module's `python3-debian` dependency.
- The "Set up Filebeat index templates and dashboards" task only ran `filebeat setup --index-management`, which does not load dashboards. Added `--dashboards`.
- When Filebeat modules send through Logstash, module ingest pipelines need to be loaded manually against Elasticsearch. Added `--pipelines`, `--modules {{ filebeat_modules | join(',') }}`, and `--force-enable-module-filesets` to the setup command.

## Review Notes
- The Filebeat `filestream` multiline parser structure shown in the template matches current Filebeat documentation.
- The `filebeat test config`, `filebeat test output`, and `filebeat modules enable` commands are valid current Filebeat commands.
- The post is Debian/Ubuntu-focused because it uses APT tasks. A future expansion could mention RPM-based systems separately.
