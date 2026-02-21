# How to Configure Proxy Settings in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Proxy, Networking, SSH, DevOps

Description: Learn how to configure proxy settings in your Ansible inventory for hosts behind firewalls, bastion servers, and corporate proxies.

---

If you work in an enterprise environment, chances are good that at least some of your managed hosts sit behind a proxy or bastion host. Getting Ansible to talk to those machines requires some specific inventory configuration. In this post, I will walk through the different proxy scenarios you might encounter and show you exactly how to set them up in your Ansible inventory files.

## Why Proxy Settings Matter in Ansible

Ansible connects to remote hosts over SSH by default. When a target machine is not directly reachable from your control node, you need a way to route that SSH connection through an intermediary. This is common in setups where:

- Production servers live in a private subnet with no public IP addresses
- A bastion host (jump box) acts as the single point of entry
- Corporate HTTP/HTTPS proxies control outbound internet access
- Network segmentation requires traffic to hop through multiple layers

Without proper proxy configuration, Ansible simply cannot reach those hosts and your playbooks will time out.

## Configuring SSH Proxy (Jump Host) in Inventory

The most common proxy scenario is using a bastion or jump host. Ansible supports this through the `ansible_ssh_common_args` variable, which lets you pass extra arguments to the underlying SSH command.

Here is a basic INI inventory with a jump host configured:

```ini
# inventory/hosts.ini
# Bastion host that serves as the entry point
[bastion]
jump01.example.com ansible_user=admin

# Web servers in a private subnet, reachable only through the bastion
[webservers]
web01 ansible_host=10.0.1.10 ansible_user=deploy
web02 ansible_host=10.0.1.11 ansible_user=deploy
web03 ansible_host=10.0.1.12 ansible_user=deploy

[webservers:vars]
# Route SSH through the bastion using the ProxyJump directive
ansible_ssh_common_args=-o ProxyJump=admin@jump01.example.com
```

The `ProxyJump` directive (introduced in OpenSSH 7.3) tells SSH to first connect to the bastion, then hop from there to the target host. For older SSH versions, you can use the `ProxyCommand` approach instead:

```ini
[webservers:vars]
# For older SSH versions, use ProxyCommand with netcat
ansible_ssh_common_args=-o ProxyCommand="ssh -W %h:%p admin@jump01.example.com"
```

## YAML Inventory with Proxy Settings

If you prefer YAML inventory format, here is the equivalent configuration:

```yaml
# inventory/hosts.yml
all:
  children:
    bastion:
      hosts:
        jump01.example.com:
          ansible_user: admin
    webservers:
      hosts:
        web01:
          ansible_host: 10.0.1.10
        web02:
          ansible_host: 10.0.1.11
        web03:
          ansible_host: 10.0.1.12
      vars:
        ansible_user: deploy
        # SSH proxy jump configuration for all webservers
        ansible_ssh_common_args: "-o ProxyJump=admin@jump01.example.com"
```

## Multi-Hop Proxy Chains

Sometimes you need to hop through more than one proxy. Perhaps you go through a VPN gateway, then a bastion, then finally reach the target. The `ProxyJump` directive supports chaining multiple hops with commas:

```ini
# inventory/multi-hop.ini
[database_servers]
db01 ansible_host=10.10.5.20
db02 ansible_host=10.10.5.21

[database_servers:vars]
ansible_user=dbadmin
# Chain through two jump hosts: first gateway, then bastion
ansible_ssh_common_args=-o ProxyJump=ops@gateway.example.com,admin@bastion.internal.example.com
```

With this setup, the SSH connection flows like this:

```mermaid
graph LR
    A[Control Node] --> B[gateway.example.com]
    B --> C[bastion.internal.example.com]
    C --> D[db01 / db02]
```

## Configuring HTTP Proxy for Module Downloads

Some Ansible modules need to download packages or files from the internet. If your target hosts only have internet access through an HTTP proxy, you need to pass proxy environment variables:

```yaml
# inventory/hosts.yml
all:
  children:
    app_servers:
      hosts:
        app01:
          ansible_host: 10.0.2.50
        app02:
          ansible_host: 10.0.2.51
      vars:
        ansible_user: deploy
        # HTTP proxy settings for modules that need internet access
        http_proxy: "http://proxy.corp.example.com:8080"
        https_proxy: "http://proxy.corp.example.com:8080"
        no_proxy: "localhost,127.0.0.1,10.0.0.0/8,.example.com"
```

Then in your playbooks, reference these variables in the `environment` block:

```yaml
# playbook.yml
- hosts: app_servers
  tasks:
    - name: Install packages through corporate proxy
      ansible.builtin.apt:
        name: nginx
        state: present
      environment:
        http_proxy: "{{ http_proxy }}"
        https_proxy: "{{ https_proxy }}"
        no_proxy: "{{ no_proxy }}"
```

## Per-Host Proxy Overrides

Not every host in a group needs the same proxy settings. You can override group-level variables at the host level:

```ini
# inventory/hosts.ini
[app_servers]
# This host uses the default proxy from group vars
app01 ansible_host=10.0.2.50

# This host has direct internet access, no proxy needed
app02 ansible_host=10.0.2.51 http_proxy="" https_proxy=""

# This host uses a different proxy
app03 ansible_host=10.0.2.52 http_proxy=http://alt-proxy.example.com:3128

[app_servers:vars]
ansible_user=deploy
http_proxy=http://proxy.corp.example.com:8080
https_proxy=http://proxy.corp.example.com:8080
```

## Using host_vars and group_vars Directories

For larger inventories, putting proxy settings inline gets messy. The cleaner approach is using the `host_vars` and `group_vars` directory structure:

```
inventory/
  hosts.ini
  group_vars/
    all.yml
    webservers.yml
    database_servers.yml
  host_vars/
    app03.yml
```

Here is what the group-level proxy config looks like:

```yaml
# inventory/group_vars/webservers.yml
# SSH proxy for all web servers behind the bastion
ansible_ssh_common_args: "-o ProxyJump=admin@jump01.example.com"

# HTTP proxy for package installations
http_proxy: "http://proxy.corp.example.com:8080"
https_proxy: "http://proxy.corp.example.com:8080"
no_proxy: "localhost,127.0.0.1,10.0.0.0/8"
```

And a host-specific override:

```yaml
# inventory/host_vars/app03.yml
# This host uses a regional proxy instead of the default
http_proxy: "http://eu-proxy.corp.example.com:8080"
https_proxy: "http://eu-proxy.corp.example.com:8080"
```

## SOCKS Proxy Configuration

If your environment uses a SOCKS proxy instead of HTTP, you can configure that through SSH as well:

```ini
[secured_hosts]
secure01 ansible_host=10.99.1.10
secure02 ansible_host=10.99.1.11

[secured_hosts:vars]
ansible_user=secops
# Route SSH connections through a SOCKS5 proxy
ansible_ssh_common_args=-o ProxyCommand="nc -X 5 -x socks-proxy.example.com:1080 %h %p"
```

## Testing Your Proxy Configuration

Before running a full playbook, verify that Ansible can reach all hosts through the proxy:

```bash
# Test connectivity through proxy settings defined in inventory
ansible -i inventory/hosts.ini webservers -m ping

# Show verbose SSH connection details to debug proxy issues
ansible -i inventory/hosts.ini webservers -m ping -vvvv
```

The `-vvvv` flag is your best friend when troubleshooting proxy connections. It shows the exact SSH command being executed, including all proxy arguments.

## Putting It All Together

Here is a complete inventory that combines SSH jump hosts with HTTP proxy settings across multiple environments:

```yaml
# inventory/production.yml
all:
  vars:
    # Default HTTP proxy for all production hosts
    http_proxy: "http://proxy.corp.example.com:8080"
    https_proxy: "http://proxy.corp.example.com:8080"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8"
  children:
    bastion:
      hosts:
        jump01.example.com:
          ansible_user: admin
    frontend:
      hosts:
        web01:
          ansible_host: 10.0.1.10
        web02:
          ansible_host: 10.0.1.11
      vars:
        ansible_user: webadmin
        ansible_ssh_common_args: "-o ProxyJump=admin@jump01.example.com"
    backend:
      hosts:
        api01:
          ansible_host: 10.0.2.20
        api02:
          ansible_host: 10.0.2.21
      vars:
        ansible_user: apiadmin
        ansible_ssh_common_args: "-o ProxyJump=admin@jump01.example.com"
    database:
      hosts:
        db01:
          ansible_host: 10.0.3.30
      vars:
        ansible_user: dbadmin
        # Database tier goes through an extra jump host
        ansible_ssh_common_args: "-o ProxyJump=admin@jump01.example.com,secops@db-bastion.internal"
```

Getting proxy settings right in your Ansible inventory saves a lot of headaches down the road. The key takeaway is that SSH-level proxies (bastion/jump hosts) go in `ansible_ssh_common_args`, while HTTP proxies for module-level internet access go in custom variables that you reference through the `environment` directive in your playbooks. Start with simple single-hop configurations and work your way up to multi-hop chains as your network topology demands.
