# How to Use Ansible to Configure APT Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, APT, Proxy, Ubuntu, Debian

Description: Learn how to configure APT proxy settings on Debian and Ubuntu systems using Ansible for environments behind corporate proxies or using local caching proxies.

---

In many enterprise environments, servers do not have direct internet access. They reach external repositories through an HTTP proxy, a caching proxy like apt-cacher-ng, or a local mirror. Configuring APT to use a proxy is one of those things that is easy to do manually on one server but becomes a real chore across dozens or hundreds of machines.

Ansible makes this straightforward. In this post, I will cover the different proxy configurations you might need and how to deploy them consistently.

## Why Use an APT Proxy?

There are several good reasons to route APT traffic through a proxy:

- **Corporate firewalls**: Servers cannot reach the internet directly and must use an HTTP proxy.
- **Bandwidth savings**: A caching proxy (like apt-cacher-ng) downloads each package once and serves it to all servers on the network.
- **Speed**: Local mirrors or caching proxies serve packages much faster than pulling from remote mirrors.
- **Security**: All outbound traffic goes through a controlled point where it can be logged and filtered.

## Configuring a Simple HTTP Proxy

The most basic configuration tells APT to use an HTTP proxy for all requests. This is done by creating a file in `/etc/apt/apt.conf.d/`.

```yaml
# Configure APT to use an HTTP proxy
- name: Configure APT HTTP proxy
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/90proxy
    content: |
      Acquire::http::Proxy "http://proxy.company.com:3128";
      Acquire::https::Proxy "http://proxy.company.com:3128";
    mode: '0644'
    owner: root
    group: root
```

This creates a configuration file that APT reads on every run. The number prefix (`90`) controls the order in which configuration files are loaded.

## Using a Template for Flexibility

For environments where proxy settings vary across hosts or data centers, use a Jinja2 template.

```yaml
# Configure APT proxy using a template with variables
- name: Configure APT proxy settings
  ansible.builtin.template:
    src: apt-proxy.conf.j2
    dest: /etc/apt/apt.conf.d/90proxy
    mode: '0644'
    owner: root
    group: root
  when: apt_proxy_host is defined
```

```jinja2
{# templates/apt-proxy.conf.j2 #}
{# APT proxy configuration managed by Ansible #}
{% if apt_proxy_host is defined %}
Acquire::http::Proxy "http://{{ apt_proxy_host }}:{{ apt_proxy_port | default(3128) }}";
Acquire::https::Proxy "http://{{ apt_proxy_host }}:{{ apt_proxy_port | default(3128) }}";
{% endif %}
{% if apt_proxy_username is defined %}
Acquire::http::Proxy::Username "{{ apt_proxy_username }}";
Acquire::http::Proxy::Password "{{ apt_proxy_password }}";
{% endif %}
{% if apt_proxy_exceptions is defined %}
{% for host in apt_proxy_exceptions %}
Acquire::http::Proxy::{{ host }} "DIRECT";
Acquire::https::Proxy::{{ host }} "DIRECT";
{% endfor %}
{% endif %}
```

The variables would be defined in your inventory or group variables.

```yaml
# group_vars/datacenter_east.yml
apt_proxy_host: "proxy-east.company.com"
apt_proxy_port: 3128
apt_proxy_exceptions:
  - "repo.internal.company.com"
  - "mirror.local.lan"
```

## Configuring apt-cacher-ng

apt-cacher-ng is a popular caching proxy specifically designed for Debian packages. The configuration on client machines is identical to a regular proxy.

```yaml
# Point APT to a local apt-cacher-ng instance
- name: Configure APT to use apt-cacher-ng
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/02proxy
    content: |
      Acquire::http::Proxy "http://{{ apt_cache_server }}:3142";
    mode: '0644'
  vars:
    apt_cache_server: "apt-cache.internal.company.com"
```

Note: apt-cacher-ng does not handle HTTPS repositories by default. You either need to configure passthrough for HTTPS sources or rewrite the source URLs to use HTTP through the proxy.

### Setting Up the apt-cacher-ng Server

You can also use Ansible to set up the apt-cacher-ng server itself.

```yaml
---
# playbook: setup-apt-cache-server.yml
# Install and configure apt-cacher-ng as a caching proxy
- hosts: apt_cache_servers
  become: true

  tasks:
    - name: Install apt-cacher-ng
      ansible.builtin.apt:
        name: apt-cacher-ng
        state: present

    - name: Configure apt-cacher-ng
      ansible.builtin.copy:
        dest: /etc/apt-cacher-ng/acng.conf
        content: |
          CacheDir: /var/cache/apt-cacher-ng
          LogDir: /var/log/apt-cacher-ng
          Port: 3142
          BindAddress: 0.0.0.0
          Remap-debrep: file:deb_mirror*.gz /debian ; file:backends_debian
          Remap-uburep: file:ubuntu_mirrors /ubuntu ; file:backends_ubuntu
          ReportPage: acng-report.html
          ExTreshold: 4
          PassThroughPattern: .*
          VerboseLog: 1
        mode: '0644'
      notify: restart apt-cacher-ng

    - name: Enable and start apt-cacher-ng
      ansible.builtin.systemd:
        name: apt-cacher-ng
        state: started
        enabled: true

  handlers:
    - name: restart apt-cacher-ng
      ansible.builtin.systemd:
        name: apt-cacher-ng
        state: restarted
```

## Proxy with Authentication

Some corporate proxies require authentication. Here is how to configure that.

```yaml
# Configure APT proxy with authentication
- name: Configure authenticated APT proxy
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/90proxy
    content: |
      Acquire::http::Proxy "http://{{ proxy_user }}:{{ proxy_pass }}@{{ proxy_host }}:{{ proxy_port }}";
      Acquire::https::Proxy "http://{{ proxy_user }}:{{ proxy_pass }}@{{ proxy_host }}:{{ proxy_port }}";
    mode: '0600'
    owner: root
    group: root
  no_log: true
```

Setting the file permissions to `0600` ensures only root can read the proxy credentials. The `no_log: true` prevents the credentials from appearing in Ansible output.

## Proxy Exceptions (Direct Access)

You might want certain repositories to bypass the proxy, for example, local mirrors.

```yaml
# Configure proxy with exceptions for local repositories
- name: Configure APT proxy with exceptions
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/90proxy
    content: |
      Acquire::http::Proxy "http://proxy.company.com:3128";
      Acquire::https::Proxy "http://proxy.company.com:3128";

      // Direct access for internal repositories
      Acquire::http::Proxy::repo.internal.company.com "DIRECT";
      Acquire::http::Proxy::mirror.local.lan "DIRECT";
    mode: '0644'
```

## Removing Proxy Configuration

If you need to remove the proxy configuration (for example, when migrating to a network with direct internet access), simply remove the file.

```yaml
# Remove APT proxy configuration
- name: Remove APT proxy settings
  ansible.builtin.file:
    path: /etc/apt/apt.conf.d/90proxy
    state: absent
```

## A Complete Role for APT Proxy Management

Here is a reusable role that handles all the proxy scenarios.

```yaml
# roles/apt_proxy/defaults/main.yml
apt_proxy_enabled: false
apt_proxy_host: ""
apt_proxy_port: 3128
apt_proxy_protocol: "http"
apt_proxy_username: ""
apt_proxy_password: ""
apt_proxy_direct_hosts: []
apt_proxy_config_file: /etc/apt/apt.conf.d/90proxy
```

```yaml
# roles/apt_proxy/tasks/main.yml
# Manage APT proxy configuration
- name: Configure APT proxy
  ansible.builtin.template:
    src: proxy.conf.j2
    dest: "{{ apt_proxy_config_file }}"
    mode: "{{ '0600' if apt_proxy_username else '0644' }}"
    owner: root
    group: root
  when: apt_proxy_enabled
  no_log: "{{ apt_proxy_username | length > 0 }}"

- name: Remove APT proxy configuration
  ansible.builtin.file:
    path: "{{ apt_proxy_config_file }}"
    state: absent
  when: not apt_proxy_enabled

- name: Update APT cache after proxy change
  ansible.builtin.apt:
    update_cache: true
  changed_when: false
```

```jinja2
{# roles/apt_proxy/templates/proxy.conf.j2 #}
{# APT proxy configuration - managed by Ansible #}
{% if apt_proxy_username %}
Acquire::http::Proxy "{{ apt_proxy_protocol }}://{{ apt_proxy_username }}:{{ apt_proxy_password }}@{{ apt_proxy_host }}:{{ apt_proxy_port }}";
Acquire::https::Proxy "{{ apt_proxy_protocol }}://{{ apt_proxy_username }}:{{ apt_proxy_password }}@{{ apt_proxy_host }}:{{ apt_proxy_port }}";
{% else %}
Acquire::http::Proxy "{{ apt_proxy_protocol }}://{{ apt_proxy_host }}:{{ apt_proxy_port }}";
Acquire::https::Proxy "{{ apt_proxy_protocol }}://{{ apt_proxy_host }}:{{ apt_proxy_port }}";
{% endif %}
{% for host in apt_proxy_direct_hosts %}
Acquire::http::Proxy::{{ host }} "DIRECT";
Acquire::https::Proxy::{{ host }} "DIRECT";
{% endfor %}
```

## Testing Proxy Configuration

After deploying the proxy configuration, verify it works.

```yaml
# Verify APT proxy configuration is working
- name: Update APT cache through proxy
  ansible.builtin.apt:
    update_cache: true
  register: apt_update

- name: Verify cache update succeeded
  ansible.builtin.assert:
    that:
      - apt_update is success
    fail_msg: "APT cache update failed - proxy configuration may be incorrect"
    success_msg: "APT proxy configuration is working correctly"
```

## Wrapping Up

Configuring APT proxy settings with Ansible is a fundamental task for any enterprise Linux environment. Whether you are using a corporate HTTP proxy, a caching proxy like apt-cacher-ng, or just need to bypass the proxy for certain hosts, the patterns shown here cover all the common scenarios. The key is to template the configuration for flexibility, protect credentials with proper file permissions and `no_log`, and verify the configuration works after deployment. With a reusable role, you can manage proxy settings across your entire fleet from a single set of variables.
