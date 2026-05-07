# Validation Summary: How to Set Up AWX/Ansible Tower for Network Automation Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWX
- AWX Operator
- Kubernetes
- Ansible network automation
- Cisco IOS
- AWX REST API
- `curl`
- `jq`

## Sources Consulted
- AWX Operator basic install docs: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator admin user account configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/admin-user-account-configuration.html
- AWX credentials guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX workflow templates guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflow_templates.html
- AWX workflows guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflows.html
- AWX schedules guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/scheduling.html
- AWX API authentication guide: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/authentication.html
- AWX browsable API guide: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/browseable.html
- AWX inventories guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- Ansible Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- AWX GitHub repository overview: https://github.com/ansible/awx
- Red Hat Ansible Automation Platform 2.2 release notes: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.2/pdf/red_hat_ansible_automation_platform_release_notes/Red_Hat_Ansible_Automation_Platform-2.2-Red_Hat_Ansible_Automation_Platform_Release_Notes-en-US.pdf

## Issues Found
- The installation section was outdated. Current AWX installs are documented through the AWX Operator on Kubernetes, not the old `installer/install.yml` flow used by legacy AWX releases. I replaced the legacy clone/install commands with an operator-based example and corrected admin password retrieval.
- The host variable examples used `key=value` syntax inside AWX variable fields. AWX variable fields accept YAML or JSON. I changed the host variable examples to valid YAML.
- The inventory example used `ansible_connection: network_cli` with a `Network` credential. Current AWX docs specify that `network_cli`, `httpapi`, and `netconf` connections should use a `Machine` credential. I changed the credential type and mapped enable mode to the machine credential’s privilege escalation fields.
- The network inventory example used the short `network_cli` plugin name. I updated it to `ansible.netcommon.network_cli` to match current Ansible documentation.
- The API example implied a default `admin:password` login and used `http://`. I changed it to a placeholder password and `https://` endpoints so it no longer suggests a hard-coded default password.

## Review Notes
- Basic authentication is still supported by the AWX API, but the AWX API docs recommend OAuth 2 token authentication for programmatic integrations such as CI/CD pipelines.
- Red Hat product documentation now uses the name `automation controller` rather than `Ansible Tower`. The post title still uses the legacy term for discoverability, but the body text was corrected to avoid describing AWX as "the open-source Ansible Tower."
