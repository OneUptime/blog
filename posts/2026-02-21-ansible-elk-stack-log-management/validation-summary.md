# Validation Summary: How to Use Ansible with ELK Stack for Log Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Elastic Stack / ELK Stack
- Elasticsearch
- Logstash
- Kibana
- Filebeat
- Debian/Ubuntu APT package management
- UFW

## Sources Consulted
- Ansible `ansible.builtin.apt_key` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.deb822_repository` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `community.general.ufw` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Elastic Elasticsearch Debian package installation documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/deb.html
- Elastic Filebeat input configuration documentation: https://www.elastic.co/guide/en/beats/filebeat/current/configuration-filebeat-options.html
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat Logstash output documentation: https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Elastic Filebeat module configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuration-filebeat-modules
- Elastic Logstash Beats input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Logstash package installation documentation: https://www.elastic.co/guide/en/beats/libbeat/current/logstash-installation.html
- Elastic Kibana Debian package installation documentation: https://www.elastic.co/guide/en/kibana/current/deb.html

## Issues Found
- Replaced `ansible.builtin.apt_key` plus plain `apt_repository` usage with `ansible.builtin.deb822_repository`, because Ansible documents `apt_key` as legacy/deprecated on modern Debian systems and Elastic documents repositories with `signed-by` key handling.
- Added Elastic APT repository setup and apt cache refresh tasks to the Filebeat, Logstash, and Kibana roles. The original playbook installed these packages on separate host groups but only configured the Elastic repository in the Elasticsearch role.
- Updated Filebeat from the deprecated `log` input to the current `filestream` input and added a stable input `id`, matching Elastic's Filebeat guidance.
- Quoted templated Filebeat field and path values to avoid invalid YAML when variables contain special characters.
- Made the Filebeat module enabling task idempotent with `creates` instead of forcing `changed_when: true` on every run.
- Added the missing Logstash pipeline template that listens for Beats traffic on port 5044 and sends events to Elasticsearch, because Filebeat's Logstash output requires a matching Logstash pipeline.
- Configured the Logstash Elasticsearch output with username, password, and CA certificate variables so it can work with Elastic Stack 8.x secured Elasticsearch deployments.
- Corrected generic wording that referred to "this module" even though the post is about an ELK deployment approach, not a single Ansible module.
- Changed the SSH service handler to use `ssh` by default, with an override variable, because the examples otherwise target Debian/Ubuntu-style systems where the service name is commonly `ssh`.

## Review Notes
- The Elastic examples intentionally stay on the 8.x repository used by the post. Elastic 9.x is current, but Elastic 8.x remains a valid major-version target when deployments are pinned to that line.
- The Logstash pipeline still expects the user to provide `elasticsearch_url`, `elasticsearch_username`, `elasticsearch_password`, and `elasticsearch_ca_cert` variables.
- The UFW example requires the `community.general` collection and the target host's `ufw` package.
