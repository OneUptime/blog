# How to Use the community.zabbix Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Zabbix, Monitoring, Infrastructure Automation

Description: Automate Zabbix server configuration, host management, templates, and agent deployment using the community.zabbix Ansible collection.

---

Zabbix has been a staple of infrastructure monitoring for over two decades, and for good reason. It handles everything from basic ICMP checks to complex distributed monitoring setups. But configuring Zabbix at scale through the web interface is painful. The `community.zabbix` collection brings Zabbix management into your Ansible automation, letting you manage hosts, templates, user groups, media types, and even deploy the Zabbix agent itself.

## Installing the Collection

The collection needs the `zabbix-api` Python library to communicate with the Zabbix server.

```bash
# Install the collection
ansible-galaxy collection install community.zabbix

# Install the Python library for Zabbix API access
pip install zabbix-api
```

For newer Zabbix versions (6.0+), you might want to use the `zabbix_utils` library instead.

```bash
pip install zabbix_utils
```

## What the Collection Provides

The collection is one of the larger community collections, with modules and roles covering most Zabbix operations:

- **Modules**: `zabbix_host`, `zabbix_group`, `zabbix_template`, `zabbix_user`, `zabbix_user_role`, `zabbix_mediatype`, `zabbix_action`, `zabbix_maintenance`, `zabbix_proxy`, `zabbix_screen`, `zabbix_discovery_rule`, and more
- **Roles**: `zabbix_server`, `zabbix_agent`, `zabbix_proxy`, `zabbix_web`, `zabbix_javagateway` for deploying Zabbix components

## Setting Up Connection Defaults

Every API module needs to know how to reach your Zabbix server. Set these once in your group variables.

```yaml
# group_vars/all.yml - Zabbix API connection settings
zabbix_api_server_url: "https://zabbix.example.com"
zabbix_api_login_user: "Admin"
zabbix_api_login_pass: "{{ vault_zabbix_admin_password }}"
zabbix_api_validate_certs: true
zabbix_api_timeout: 30
```

## Deploying the Zabbix Agent with the Built-in Role

The collection includes a role for deploying the Zabbix agent to monitored hosts. This is one of the most valuable parts of the collection.

```yaml
# playbook-deploy-agent.yml - deploy Zabbix agent to all servers
- hosts: all
  become: yes
  roles:
    - role: community.zabbix.zabbix_agent
      vars:
        zabbix_agent_version: 6.4
        zabbix_agent_server: "zabbix-server.example.com"
        zabbix_agent_serveractive: "zabbix-server.example.com"
        zabbix_agent2: true  # use Zabbix Agent 2
        zabbix_agent_hostname: "{{ inventory_hostname }}"
        zabbix_agent_tlsconnect: psk
        zabbix_agent_tlsaccept: psk
        zabbix_agent_tlspskidentity: "PSK_{{ inventory_hostname }}"
        zabbix_agent_tlspskvalue: "{{ vault_zabbix_psk_key }}"
        zabbix_agent_userparameters:
          - name: custom.disk.discovery
            command: /usr/local/bin/disk_discovery.sh
          - name: custom.app.health
            command: /usr/local/bin/check_app_health.sh
```

## Managing Host Groups

Host groups organize your monitored hosts. Create them before adding hosts.

```yaml
# playbook-hostgroups.yml - create host groups matching your org structure
- hosts: localhost
  tasks:
    - name: Create host groups
      community.zabbix.zabbix_group:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        host_groups:
          - "Linux Servers"
          - "Web Servers"
          - "Database Servers"
          - "Application Servers"
          - "Production"
          - "Staging"
          - "Development"
          - "Network Devices"
        state: present
```

## Registering Hosts

After deploying the agent, register the host with the Zabbix server so it starts collecting data.

```yaml
# playbook-register-hosts.yml - register hosts with Zabbix server
- hosts: webservers
  tasks:
    - name: Register host in Zabbix
      community.zabbix.zabbix_host:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        host_name: "{{ inventory_hostname }}"
        visible_name: "{{ inventory_hostname_short }} ({{ env }})"
        description: "Managed by Ansible"
        host_groups:
          - "Linux Servers"
          - "Web Servers"
          - "{{ env | capitalize }}"
        link_templates:
          - "Linux by Zabbix agent"
          - "Nginx by Zabbix agent"
          - "Template App PHP-FPM"
        interfaces:
          - type: agent
            main: 1
            ip: "{{ ansible_default_ipv4.address }}"
            port: "10050"
            useip: 1
        tags:
          - tag: "environment"
            value: "{{ env }}"
          - tag: "role"
            value: "webserver"
          - tag: "team"
            value: "platform"
        inventory_mode: automatic
        status: enabled
        state: present
      delegate_to: localhost
```

## Importing Templates

You can import Zabbix templates from XML or YAML files, which is great for custom monitoring templates stored in version control.

```yaml
# playbook-templates.yml - import custom monitoring templates
- hosts: localhost
  tasks:
    - name: Import custom application template
      community.zabbix.zabbix_template:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        template_xml: "{{ lookup('file', 'templates/custom_app_template.xml') }}"
        state: present

    - name: Create a simple template from scratch
      community.zabbix.zabbix_template:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        template_name: "Custom - App Health Check"
        template_groups:
          - "Templates/Applications"
        link_templates:
          - "Linux by Zabbix agent"
        state: present
```

## Setting Up Maintenance Windows

Automate maintenance windows to suppress alerts during planned deployments.

```yaml
# playbook-maintenance.yml - create maintenance window during deployment
- hosts: localhost
  vars:
    maintenance_duration: 3600  # 1 hour in seconds
  tasks:
    - name: Create maintenance window for deployment
      community.zabbix.zabbix_maintenance:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        name: "Deployment - {{ ansible_date_time.date }}"
        description: "Scheduled deployment maintenance window"
        host_groups:
          - "Web Servers"
          - "Production"
        collect_data: true  # still collect data, just suppress alerts
        minutes: 60
        state: present
      register: maintenance_result

    # Run your deployment tasks here

    - name: Remove maintenance window after deployment
      community.zabbix.zabbix_maintenance:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        name: "Deployment - {{ ansible_date_time.date }}"
        state: absent
```

## Managing Users and Permissions

User management through Ansible ensures consistent access controls across Zabbix instances.

```yaml
# playbook-users.yml - configure Zabbix users and roles
- hosts: localhost
  tasks:
    - name: Create user groups with appropriate permissions
      community.zabbix.zabbix_usergroup:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        name: "{{ item.name }}"
        gui_access: "default"
        rights:
          - host_group: "{{ item.group }}"
            permission: "{{ item.permission }}"
        state: present
      loop:
        - name: "Developers-ReadOnly"
          group: "Production"
          permission: "read-only"
        - name: "SRE-FullAccess"
          group: "Production"
          permission: "read-write"

    - name: Create media type for custom notifications
      community.zabbix.zabbix_mediatype:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        name: "Custom Webhook"
        type: webhook
        webhook_script: |
          var params = JSON.parse(value);
          var req = new HttpRequest();
          req.addHeader('Content-Type: application/json');
          var payload = {
            text: params.Subject + '\n' + params.Message,
            channel: params.Channel
          };
          req.post(params.URL, JSON.stringify(payload));
        webhook_params:
          - name: URL
            value: "{{ vault_webhook_url }}"
          - name: Channel
            value: "#alerts"
          - name: Subject
            value: "{TRIGGER.NAME}"
          - name: Message
            value: "{EVENT.NAME} on {HOST.NAME}"
        state: present
```

## Configuring Discovery Rules

Auto-discover new hosts on your network and register them automatically.

```yaml
# playbook-discovery.yml - set up network discovery
- hosts: localhost
  tasks:
    - name: Create network discovery rule
      community.zabbix.zabbix_discovery_rule:
        server_url: "{{ zabbix_api_server_url }}"
        login_user: "{{ zabbix_api_login_user }}"
        login_password: "{{ zabbix_api_login_pass }}"
        name: "Discover LAN hosts"
        iprange: "10.0.1.1-254"
        dchecks:
          - type: Zabbix
            key: "system.hostname"
            ports: "10050"
            uniq: true
        delay: "1h"
        status: enabled
        state: present
```

## Production Tips

Here is what I have learned running this collection in production:

1. **Use delegate_to for API calls.** The Zabbix API modules run on the control node, not on the target hosts. Always use `delegate_to: localhost` when running host registration tasks on remote hosts.

2. **Batch your host registrations.** If you are registering hundreds of hosts, the API can get slow. Use `throttle: 5` to limit concurrent API calls.

3. **Template everything.** Build your Zabbix templates in a test environment first, export them as XML, then import them through Ansible. This gives you version-controlled monitoring definitions.

4. **PSK encryption is worth the effort.** Setting up PSK-encrypted agent communication takes extra configuration, but the collection handles all of it through the agent role variables.

5. **Combine with inventory plugins.** Use dynamic inventory from your cloud provider, then pipe those hosts through Zabbix registration playbooks for automatic monitoring setup.

The `community.zabbix` collection is comprehensive enough to manage every aspect of your Zabbix infrastructure from code, which is exactly what you want when monitoring hundreds or thousands of hosts.
