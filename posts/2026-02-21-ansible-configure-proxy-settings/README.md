# How to Use Ansible to Configure Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Proxy, Networking, DevOps, Linux

Description: Learn how to configure HTTP, HTTPS, and system-wide proxy settings on Linux servers using Ansible for environments behind corporate proxies.

---

Many corporate and enterprise environments route outbound traffic through HTTP proxies. Whether it is for security compliance, content filtering, or bandwidth management, you need every server configured to use the proxy correctly. This includes system-wide environment variables, package manager settings, Docker configurations, and application-specific proxy settings. Ansible lets you push all of these configurations consistently across your fleet.

## Prerequisites

- Ansible 2.9+ on your control node
- Linux target hosts with root or sudo access
- Your proxy server address and port
- Knowledge of which domains should bypass the proxy (no_proxy list)

## Defining Proxy Variables

Start by defining your proxy settings in group_vars so they are available to all playbooks:

```yaml
# group_vars/all.yml - Proxy configuration variables
proxy_host: proxy.example.com
proxy_port: 3128
proxy_url: "http://{{ proxy_host }}:{{ proxy_port }}"
https_proxy_url: "http://{{ proxy_host }}:{{ proxy_port }}"
no_proxy_list:
  - localhost
  - 127.0.0.1
  - 10.0.0.0/8
  - 172.16.0.0/12
  - 192.168.0.0/16
  - .example.com
  - .internal
no_proxy: "{{ no_proxy_list | join(',') }}"

# If your proxy requires authentication
proxy_user: proxyuser
proxy_pass: "{{ vault_proxy_pass }}"
proxy_auth_url: "http://{{ proxy_user }}:{{ proxy_pass }}@{{ proxy_host }}:{{ proxy_port }}"
```

## System-Wide Environment Variables

The most fundamental proxy configuration is setting environment variables. Most Linux tools and applications respect `http_proxy`, `https_proxy`, and `no_proxy`:

```yaml
# system_proxy.yml - Configure system-wide proxy environment variables
---
- name: Configure system-wide proxy settings
  hosts: all
  become: true
  tasks:
    - name: Set proxy environment variables in /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "^{{ item.key }}="
        line: '{{ item.key }}="{{ item.value }}"'
        create: true
        mode: '0644'
      loop:
        - { key: 'http_proxy', value: '{{ proxy_url }}' }
        - { key: 'https_proxy', value: '{{ https_proxy_url }}' }
        - { key: 'no_proxy', value: '{{ no_proxy }}' }
        - { key: 'HTTP_PROXY', value: '{{ proxy_url }}' }
        - { key: 'HTTPS_PROXY', value: '{{ https_proxy_url }}' }
        - { key: 'NO_PROXY', value: '{{ no_proxy }}' }

    - name: Create proxy profile script for all shells
      ansible.builtin.template:
        src: templates/proxy.sh.j2
        dest: /etc/profile.d/proxy.sh
        owner: root
        group: root
        mode: '0644'
```

The profile.d script template:

```jinja2
# templates/proxy.sh.j2 - Proxy environment for login shells
# Managed by Ansible - do not edit manually
export http_proxy="{{ proxy_url }}"
export https_proxy="{{ https_proxy_url }}"
export no_proxy="{{ no_proxy }}"
export HTTP_PROXY="{{ proxy_url }}"
export HTTPS_PROXY="{{ https_proxy_url }}"
export NO_PROXY="{{ no_proxy }}"
```

## APT Proxy Configuration (Debian/Ubuntu)

APT has its own proxy configuration that is separate from environment variables:

```yaml
# apt_proxy.yml - Configure proxy for APT package manager
---
- name: Configure APT proxy
  hosts: debian_servers
  become: true
  tasks:
    - name: Configure APT to use proxy
      ansible.builtin.template:
        src: templates/apt-proxy.conf.j2
        dest: /etc/apt/apt.conf.d/95proxy
        owner: root
        group: root
        mode: '0644'

    - name: Test APT with proxy
      ansible.builtin.apt:
        update_cache: true
      environment:
        http_proxy: "{{ proxy_url }}"
        https_proxy: "{{ https_proxy_url }}"
```

```jinja2
# templates/apt-proxy.conf.j2 - APT proxy configuration
# Managed by Ansible
Acquire::http::Proxy "{{ proxy_url }}";
Acquire::https::Proxy "{{ https_proxy_url }}";
```

## YUM/DNF Proxy Configuration (RHEL/CentOS)

```yaml
# yum_proxy.yml - Configure proxy for YUM/DNF
---
- name: Configure YUM proxy
  hosts: rhel_servers
  become: true
  tasks:
    - name: Set proxy in yum.conf
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy='
        line: "proxy={{ proxy_url }}"
        insertafter: '^\[main\]'

    - name: Set proxy username if authentication required
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy_username='
        line: "proxy_username={{ proxy_user }}"
        insertafter: '^proxy='
      when: proxy_user is defined

    - name: Set proxy password if authentication required
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy_password='
        line: "proxy_password={{ proxy_pass }}"
        insertafter: '^proxy_username='
      when: proxy_pass is defined
```

## Docker Proxy Configuration

Docker needs proxy settings in multiple places: the daemon configuration for image pulls and the systemd service for the Docker daemon itself:

```yaml
# docker_proxy.yml - Configure proxy for Docker
---
- name: Configure Docker proxy
  hosts: docker_hosts
  become: true
  tasks:
    - name: Create Docker systemd override directory
      ansible.builtin.file:
        path: /etc/systemd/system/docker.service.d
        state: directory
        mode: '0755'

    - name: Configure Docker daemon proxy
      ansible.builtin.template:
        src: templates/docker-proxy.conf.j2
        dest: /etc/systemd/system/docker.service.d/http-proxy.conf
        owner: root
        group: root
        mode: '0644'
      notify:
        - Reload systemd
        - Restart Docker

    - name: Configure Docker client proxy for all users
      ansible.builtin.template:
        src: templates/docker-config.json.j2
        dest: /etc/docker/daemon.json
        owner: root
        group: root
        mode: '0644'
      notify: Restart Docker

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: Restart Docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

```jinja2
# templates/docker-proxy.conf.j2 - Docker systemd proxy override
[Service]
Environment="HTTP_PROXY={{ proxy_url }}"
Environment="HTTPS_PROXY={{ https_proxy_url }}"
Environment="NO_PROXY={{ no_proxy }}"
```

## Git Proxy Configuration

Git needs its own proxy setting for cloning repositories over HTTP:

```yaml
# git_proxy.yml - Configure proxy for Git
---
- name: Configure Git proxy
  hosts: all
  become: true
  tasks:
    - name: Set global Git HTTP proxy
      community.general.git_config:
        name: http.proxy
        value: "{{ proxy_url }}"
        scope: system

    - name: Set global Git HTTPS proxy
      community.general.git_config:
        name: https.proxy
        value: "{{ https_proxy_url }}"
        scope: system

    - name: Exclude internal domains from Git proxy
      community.general.git_config:
        name: "http.https://gitlab.internal/.proxy"
        value: ""
        scope: system
```

## pip and Python Proxy

Python applications and pip also need proxy settings:

```yaml
# pip_proxy.yml - Configure proxy for pip
---
- name: Configure pip proxy
  hosts: all
  become: true
  tasks:
    - name: Create pip config directory
      ansible.builtin.file:
        path: /etc/pip.conf.d
        state: directory
        mode: '0755'

    - name: Configure pip proxy globally
      ansible.builtin.copy:
        dest: /etc/pip.conf
        content: |
          [global]
          proxy = {{ proxy_url }}
          trusted-host = pypi.org
                         pypi.python.org
                         files.pythonhosted.org
        owner: root
        group: root
        mode: '0644'
```

## Ansible Itself Through a Proxy

When Ansible itself needs to go through a proxy (for example, when downloading roles from Galaxy or fetching URLs), configure the environment:

```yaml
# ansible_proxy.yml - Use proxy within Ansible tasks
---
- name: Tasks that need proxy access
  hosts: all
  become: true
  environment:
    http_proxy: "{{ proxy_url }}"
    https_proxy: "{{ https_proxy_url }}"
    no_proxy: "{{ no_proxy }}"
  tasks:
    - name: Download file through proxy
      ansible.builtin.get_url:
        url: https://example.com/package.tar.gz
        dest: /tmp/package.tar.gz
        mode: '0644'

    - name: Install package from internet
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
```

## Complete Proxy Configuration Role

Tying everything together into a single comprehensive playbook:

```yaml
# full_proxy_setup.yml - Complete proxy configuration for all components
---
- name: Configure all proxy settings
  hosts: all
  become: true
  tasks:
    - name: System-wide proxy environment
      ansible.builtin.template:
        src: templates/proxy.sh.j2
        dest: /etc/profile.d/proxy.sh
        mode: '0644'

    - name: Configure APT proxy
      ansible.builtin.template:
        src: templates/apt-proxy.conf.j2
        dest: /etc/apt/apt.conf.d/95proxy
        mode: '0644'
      when: ansible_os_family == "Debian"

    - name: Configure YUM proxy
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy='
        line: "proxy={{ proxy_url }}"
      when: ansible_os_family == "RedHat"

    - name: Configure wget proxy
      ansible.builtin.template:
        src: templates/wgetrc.j2
        dest: /etc/wgetrc
        mode: '0644'

    - name: Configure curl proxy
      ansible.builtin.copy:
        dest: /etc/curlrc
        content: |
          proxy = "{{ proxy_url }}"
          noproxy = "{{ no_proxy }}"
        mode: '0644'
```

## Proxy Configuration Architecture

```mermaid
graph TD
    A[Ansible Control Node] --> B[Target Servers]
    B --> C[/etc/environment]
    B --> D[/etc/profile.d/proxy.sh]
    B --> E[Package Manager Config]
    B --> F[Docker Proxy Config]
    B --> G[Git Proxy Config]
    B --> H[pip Proxy Config]
    C --> I[All Processes]
    D --> J[Login Shells]
    E --> K[apt / yum]
    F --> L[Docker Daemon]
    G --> M[Git Operations]
    H --> N[Python Packages]
    I --> O[Corporate Proxy]
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O
```

## Removing Proxy Settings

When servers move out of a proxied environment, you need to clean up:

```yaml
# remove_proxy.yml - Remove all proxy configurations
---
- name: Remove proxy settings
  hosts: migrated_servers
  become: true
  tasks:
    - name: Remove proxy profile script
      ansible.builtin.file:
        path: /etc/profile.d/proxy.sh
        state: absent

    - name: Remove proxy lines from /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "{{ item }}"
        state: absent
      loop:
        - '^http_proxy='
        - '^https_proxy='
        - '^no_proxy='
        - '^HTTP_PROXY='
        - '^HTTPS_PROXY='
        - '^NO_PROXY='
```

Proxy configuration is one of those things that touches many different components on a Linux system. Each tool has its own way of reading proxy settings, and missing even one leads to mysterious "connection timed out" errors. With Ansible, you can ensure every component on every server is configured correctly in a single playbook run.
