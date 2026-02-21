# How to Use Ansible to Manage F5 BIG-IP Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, F5, BIG-IP, Load Balancing, Application Delivery

Description: Automate F5 BIG-IP load balancer configuration with Ansible, covering virtual servers, pools, nodes, health monitors, iRules, and SSL profiles.

---

F5 BIG-IP is one of the most widely deployed application delivery controllers in enterprise data centers. It handles load balancing, SSL offloading, WAF, and dozens of other traffic management functions. Managing it through the GUI works for one or two changes, but when you need to deploy application configurations consistently across multiple BIG-IP pairs, Ansible is the way to go.

The F5 Ansible collection provides modules for nearly every BIG-IP object. This post covers the most common management tasks: setting up pools, virtual servers, health monitors, SSL profiles, and iRules.

## Setting Up the F5 Collection

Install the F5 collection and its dependencies.

```bash
# Install the F5 Ansible collection
ansible-galaxy collection install f5networks.f5_modules

# Install the required Python SDK
pip install f5-sdk
pip install bigsuds
```

## Inventory Configuration

F5 BIG-IP uses the httpapi connection type for API-based management.

```yaml
# inventory/f5_devices.yml - F5 BIG-IP inventory
---
all:
  children:
    f5_loadbalancers:
      hosts:
        bigip-01:
          ansible_host: 10.1.1.50
        bigip-02:
          ansible_host: 10.1.1.51
      vars:
        ansible_connection: httpapi
        ansible_network_os: f5networks.f5_bigip.bigip
        ansible_user: admin
        ansible_httpapi_password: "{{ vault_f5_password }}"
        ansible_httpapi_use_ssl: true
        ansible_httpapi_validate_certs: false
        ansible_httpapi_port: 443
```

Alternatively, many teams use the older provider-based connection method which is still widely documented.

```yaml
# group_vars/f5_loadbalancers.yml - Provider-based F5 connection
---
f5_provider:
  server: "{{ ansible_host }}"
  user: admin
  password: "{{ vault_f5_password }}"
  validate_certs: false
```

## Creating Nodes

Nodes represent the actual server IP addresses that the BIG-IP sends traffic to.

```yaml
# create_nodes.yml - Define backend server nodes on BIG-IP
---
- name: Configure BIG-IP nodes
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

    web_servers:
      - name: web-server-01
        address: 10.20.1.10
      - name: web-server-02
        address: 10.20.1.11
      - name: web-server-03
        address: 10.20.1.12
      - name: web-server-04
        address: 10.20.1.13

  tasks:
    - name: Create nodes for web servers
      f5networks.f5_modules.bigip_node:
        provider: "{{ f5_provider }}"
        name: "{{ item.name }}"
        host: "{{ item.address }}"
        state: present
      loop: "{{ web_servers }}"
```

## Creating Health Monitors

Health monitors check whether backend servers are actually able to serve traffic.

```yaml
# create_monitors.yml - Configure health monitors for different services
---
- name: Configure BIG-IP health monitors
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

  tasks:
    # HTTP health monitor that checks a specific URL
    - name: Create HTTP health monitor
      f5networks.f5_modules.bigip_monitor_http:
        provider: "{{ f5_provider }}"
        name: http_monitor_app1
        send: "GET /health HTTP/1.1\\r\\nHost: app1.example.com\\r\\n\\r\\n"
        receive: "200 OK"
        interval: 10
        timeout: 31
        state: present

    # HTTPS health monitor
    - name: Create HTTPS health monitor
      f5networks.f5_modules.bigip_monitor_https:
        provider: "{{ f5_provider }}"
        name: https_monitor_app1
        send: "GET /health HTTP/1.1\\r\\nHost: app1.example.com\\r\\n\\r\\n"
        receive: "healthy"
        interval: 15
        timeout: 46
        ssl_profile: /Common/serverssl
        state: present

    # TCP health monitor for database connections
    - name: Create TCP health monitor
      f5networks.f5_modules.bigip_monitor_tcp:
        provider: "{{ f5_provider }}"
        name: tcp_monitor_db
        interval: 10
        timeout: 31
        state: present
```

## Creating Pools

Pools are groups of nodes that receive traffic for a specific service.

```yaml
# create_pools.yml - Configure server pools with load balancing
---
- name: Configure BIG-IP pools
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

  tasks:
    # Create the pool with a load balancing method
    - name: Create web application pool
      f5networks.f5_modules.bigip_pool:
        provider: "{{ f5_provider }}"
        name: pool_web_app1
        lb_method: round-robin
        monitors:
          - http_monitor_app1
        monitor_type: and_list
        slow_ramp_time: 120
        state: present

    # Add members (nodes) to the pool
    - name: Add members to web pool
      f5networks.f5_modules.bigip_pool_member:
        provider: "{{ f5_provider }}"
        pool: pool_web_app1
        name: "{{ item.name }}"
        host: "{{ item.address }}"
        port: 80
        state: present
      loop:
        - { name: "web-server-01", address: "10.20.1.10" }
        - { name: "web-server-02", address: "10.20.1.11" }
        - { name: "web-server-03", address: "10.20.1.12" }
        - { name: "web-server-04", address: "10.20.1.13" }

    # Create HTTPS pool with different settings
    - name: Create HTTPS pool
      f5networks.f5_modules.bigip_pool:
        provider: "{{ f5_provider }}"
        name: pool_https_app1
        lb_method: least-connections-member
        monitors:
          - https_monitor_app1
        state: present
```

## Creating Virtual Servers

Virtual servers are the front-end listeners that accept client connections.

```yaml
# create_virtual_servers.yml - Configure virtual servers for application delivery
---
- name: Configure BIG-IP virtual servers
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

  tasks:
    # HTTP virtual server with redirect to HTTPS
    - name: Create HTTP virtual server (redirect)
      f5networks.f5_modules.bigip_virtual_server:
        provider: "{{ f5_provider }}"
        name: vs_http_app1
        destination: 10.1.100.10
        port: 80
        pool: pool_web_app1
        snat: automap
        irules:
          - /Common/_sys_https_redirect
        profiles:
          - http
          - tcp
        state: present

    # HTTPS virtual server with SSL offloading
    - name: Create HTTPS virtual server
      f5networks.f5_modules.bigip_virtual_server:
        provider: "{{ f5_provider }}"
        name: vs_https_app1
        destination: 10.1.100.10
        port: 443
        pool: pool_https_app1
        snat: automap
        profiles:
          - name: http
          - name: tcp
          - name: clientssl_app1
            context: client-side
          - name: serverssl
            context: server-side
        state: present

    # TCP virtual server for non-HTTP services
    - name: Create TCP virtual server for database
      f5networks.f5_modules.bigip_virtual_server:
        provider: "{{ f5_provider }}"
        name: vs_tcp_database
        destination: 10.1.100.20
        port: 5432
        pool: pool_database
        snat: automap
        profiles:
          - tcp
        state: present
```

## Managing SSL Certificates and Profiles

SSL management is a major part of BIG-IP operations.

```yaml
# manage_ssl.yml - Upload certificates and create SSL profiles
---
- name: Manage SSL on BIG-IP
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

  tasks:
    # Upload SSL certificate
    - name: Upload SSL certificate
      f5networks.f5_modules.bigip_ssl_certificate:
        provider: "{{ f5_provider }}"
        name: app1_cert
        content: "{{ lookup('file', 'certs/app1.example.com.crt') }}"
        state: present

    # Upload SSL private key
    - name: Upload SSL key
      f5networks.f5_modules.bigip_ssl_key:
        provider: "{{ f5_provider }}"
        name: app1_key
        content: "{{ lookup('file', 'certs/app1.example.com.key') }}"
        state: present
      no_log: true

    # Create client SSL profile
    - name: Create client SSL profile
      f5networks.f5_modules.bigip_profile_client_ssl:
        provider: "{{ f5_provider }}"
        name: clientssl_app1
        cert_key_chain:
          - cert: app1_cert
            key: app1_key
        parent: clientssl
        ciphers: "DEFAULT:!DHE:!EDH:!3DES"
        options:
          - no-tlsv1
          - no-tlsv1.1
        state: present
```

## Managing Pool Members (Maintenance Mode)

Gracefully remove servers from pools for maintenance.

```yaml
# maintenance_mode.yml - Drain and disable pool members for maintenance
---
- name: Put server in maintenance mode
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false
    maintenance_server: web-server-03
    maintenance_port: 80

  tasks:
    # Disable the pool member (stops new connections, drains existing)
    - name: Disable pool member for maintenance
      f5networks.f5_modules.bigip_pool_member:
        provider: "{{ f5_provider }}"
        pool: pool_web_app1
        name: "{{ maintenance_server }}"
        port: "{{ maintenance_port }}"
        state: forced_offline

    # Wait for active connections to drain
    - name: Wait for connections to drain
      f5networks.f5_modules.bigip_command:
        provider: "{{ f5_provider }}"
        commands:
          - "show ltm pool pool_web_app1 members {{ maintenance_server }}:{{ maintenance_port }}"
      register: member_status
      until: "'current-connections 0' in member_status.stdout[0]"
      retries: 30
      delay: 10

    - name: Server is drained
      ansible.builtin.debug:
        msg: "{{ maintenance_server }} has been drained and is ready for maintenance"
```

Re-enable after maintenance.

```yaml
# enable_member.yml - Re-enable a pool member after maintenance
---
- name: Re-enable server after maintenance
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

  tasks:
    - name: Enable pool member
      f5networks.f5_modules.bigip_pool_member:
        provider: "{{ f5_provider }}"
        pool: pool_web_app1
        name: web-server-03
        port: 80
        state: present

    # Verify the member is receiving connections
    - name: Check pool member status
      f5networks.f5_modules.bigip_command:
        provider: "{{ f5_provider }}"
        commands:
          - show ltm pool pool_web_app1 members
      register: pool_status

    - name: Display pool status
      ansible.builtin.debug:
        var: pool_status.stdout_lines[0]
```

## Complete Application Deployment

Here is a full playbook that deploys an entire application configuration on BIG-IP.

```yaml
# deploy_application.yml - Full application deployment on BIG-IP
---
- name: Deploy application on BIG-IP
  hosts: f5_loadbalancers
  gather_facts: false
  connection: local

  vars:
    f5_provider:
      server: "{{ ansible_host }}"
      user: admin
      password: "{{ vault_f5_password }}"
      validate_certs: false

    app:
      name: myapp
      vip: 10.1.100.50
      http_port: 80
      https_port: 443
      pool_method: least-connections-member
      health_check_path: /api/health
      servers:
        - { name: "myapp-01", address: "10.20.5.10", port: 8080 }
        - { name: "myapp-02", address: "10.20.5.11", port: 8080 }
        - { name: "myapp-03", address: "10.20.5.12", port: 8080 }

  tasks:
    # Step 1: Create nodes
    - name: Create application server nodes
      f5networks.f5_modules.bigip_node:
        provider: "{{ f5_provider }}"
        name: "{{ item.name }}"
        host: "{{ item.address }}"
        state: present
      loop: "{{ app.servers }}"

    # Step 2: Create health monitor
    - name: Create health monitor
      f5networks.f5_modules.bigip_monitor_http:
        provider: "{{ f5_provider }}"
        name: "monitor_{{ app.name }}"
        send: "GET {{ app.health_check_path }} HTTP/1.1\\r\\nHost: {{ app.name }}.example.com\\r\\n\\r\\n"
        receive: "200 OK"
        interval: 10
        timeout: 31
        state: present

    # Step 3: Create pool
    - name: Create server pool
      f5networks.f5_modules.bigip_pool:
        provider: "{{ f5_provider }}"
        name: "pool_{{ app.name }}"
        lb_method: "{{ app.pool_method }}"
        monitors:
          - "monitor_{{ app.name }}"
        state: present

    # Step 4: Add pool members
    - name: Add pool members
      f5networks.f5_modules.bigip_pool_member:
        provider: "{{ f5_provider }}"
        pool: "pool_{{ app.name }}"
        name: "{{ item.name }}"
        host: "{{ item.address }}"
        port: "{{ item.port }}"
        state: present
      loop: "{{ app.servers }}"

    # Step 5: Create virtual server
    - name: Create HTTPS virtual server
      f5networks.f5_modules.bigip_virtual_server:
        provider: "{{ f5_provider }}"
        name: "vs_{{ app.name }}"
        destination: "{{ app.vip }}"
        port: "{{ app.https_port }}"
        pool: "pool_{{ app.name }}"
        snat: automap
        profiles:
          - http
          - tcp
          - name: clientssl
            context: client-side
        state: present

    # Step 6: Save the configuration
    - name: Save BIG-IP configuration
      f5networks.f5_modules.bigip_config:
        provider: "{{ f5_provider }}"
        save: true

    - name: Report deployment complete
      ansible.builtin.debug:
        msg: "Application {{ app.name }} deployed on VIP {{ app.vip }}:{{ app.https_port }}"
```

F5 BIG-IP automation with Ansible turns what used to be a GUI-click-heavy process into repeatable, version-controlled infrastructure code. Application deployments become consistent. SSL certificate rotations become scheduled jobs. Maintenance windows become predictable. And when you need to set up the same application on a DR BIG-IP pair, it is a playbook run instead of a manual recreation.
