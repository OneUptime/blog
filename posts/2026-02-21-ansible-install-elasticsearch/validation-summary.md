# Validation Summary: How to Use Ansible to Install Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Elasticsearch
- Debian/Ubuntu package installation
- Elasticsearch security and TLS
- Linux sysctl and systemd tuning
- JVM heap configuration

## Sources Consulted
- Elastic Docs: Install Elasticsearch with a Debian package - https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html
- Elastic Docs: Important system configuration - https://www.elastic.co/guide/en/elasticsearch/reference/current/system-config.html
- Elastic Docs: Increase virtual memory - https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- Elastic Docs: JVM settings - https://www.elastic.co/guide/en/elasticsearch/reference/current/advanced-configuration.html
- Elastic Docs: Disable swapping - https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-configuration-memory.html
- Elastic Docs: Automatic security setup - https://www.elastic.co/docs/deploy-manage/security/self-auto-setup
- Elastic Docs: Set up transport TLS - https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Elastic Docs: elasticsearch-certutil - https://www.elastic.co/guide/en/elasticsearch/reference/current/certutil.html
- Elastic Docs: Security settings - https://www.elastic.co/guide/en/elasticsearch/reference/current/security-settings.html
- Ansible documentation: ansible.builtin.deb822_repository - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible documentation: ansible.builtin.apt_key - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible documentation: ansible.posix.sysctl - https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The post claimed Ubuntu and RHEL coverage, but only provided Debian/Ubuntu APT installation steps. Changed the description and prerequisites to scope the tutorial to Ubuntu/Debian systems.
- The prerequisites listed Ansible 2.9+, but the examples use fully qualified collection names and now use `ansible.builtin.deb822_repository`, which is available in ansible-core 2.15+. Updated the prerequisite and added the `ansible.posix` collection requirement.
- The APT repository example used `ansible.builtin.apt_key`, which relies on deprecated apt-key behavior. Replaced it with `ansible.builtin.deb822_repository` and added `python3-debian`, which that module requires on the managed host.
- The inventory declared `es_version=8.12`, but the playbook never used it. Removed the unused variable to avoid implying a pinned package version.
- The `vm.max_map_count` recommendation used `262144`, while current Elastic docs recommend `1048576` when the current value is lower and note that package installs usually configure it automatically. Updated the tuning playbook and pitfall text.
- The heap guidance said to stay under 31GB. Current Elastic docs describe 26GB as safe on most systems and 30GB as possible on some systems. Updated the prose and JVM comment.
- The transport TLS config omitted `xpack.security.transport.ssl.client_authentication: required`, which Elastic includes in the transport TLS setup. Added it to the template.
- The security playbook generated `transport.p12` only on the first node even though every node was configured to read it. Added tasks to create the cert directory, fetch the generated transport certificate, and copy it to every node.
- The post implied automatic security output/password handling during package installation. For Debian/RPM installs, Elastic documents that the `elastic` password is not output because Elasticsearch runs under systemd; the password must be reset separately. Updated the wording and the debug task label.
- The verification playbook used `https://` and `validate_certs: false`, but the tutorial only configures transport TLS and explicitly configured security/discovery settings cause automatic HTTP TLS setup to be skipped. Changed verification to `http://` for consistency with the shown configuration.

## Review Notes
The playbooks are still intentionally introductory. For production use, consider adding HTTP TLS, firewall rules, idempotent password management with Ansible Vault or an external secret manager, and logic to avoid keeping `cluster.initial_master_nodes` after the first successful cluster bootstrap.
