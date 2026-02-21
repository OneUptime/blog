# How to Use Ansible to Configure System Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Proxy, Networking, Linux Configuration

Description: Configure system-wide proxy settings across your Linux servers using Ansible for consistent internet access in restricted networks.

---

In corporate environments, servers often do not have direct internet access. All outbound HTTP and HTTPS traffic must go through a proxy server. This is common in regulated industries, government networks, and organizations with strict security policies. Configuring proxy settings sounds simple, but Linux has proxy configuration spread across many different locations: environment variables, yum/apt configuration, Docker daemon settings, pip configuration, and more.

Ansible lets you handle all of these proxy configurations from a single playbook, ensuring every server and every tool that needs internet access knows how to reach the proxy.

## System-Wide Proxy Configuration

The most fundamental level is setting environment variables that most command-line tools respect:

```yaml
# configure-proxy.yml - Set system-wide proxy configuration
---
- name: Configure system-wide proxy settings
  hosts: all
  become: true

  vars:
    proxy_host: "proxy.corp.example.com"
    proxy_port: 8080
    proxy_url: "http://{{ proxy_host }}:{{ proxy_port }}"
    proxy_https_url: "http://{{ proxy_host }}:{{ proxy_port }}"
    no_proxy_list:
      - localhost
      - 127.0.0.1
      - "*.corp.example.com"
      - "10.0.0.0/8"
      - "172.16.0.0/12"
      - "192.168.0.0/16"
    no_proxy: "{{ no_proxy_list | join(',') }}"

  tasks:
    # Set environment variables in /etc/environment
    - name: Configure proxy in /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
        create: true
        mode: '0644'
      loop:
        - { key: "http_proxy", value: "{{ proxy_url }}" }
        - { key: "https_proxy", value: "{{ proxy_https_url }}" }
        - { key: "HTTP_PROXY", value: "{{ proxy_url }}" }
        - { key: "HTTPS_PROXY", value: "{{ proxy_https_url }}" }
        - { key: "no_proxy", value: "{{ no_proxy }}" }
        - { key: "NO_PROXY", value: "{{ no_proxy }}" }

    # Set proxy in /etc/profile.d for all login shells
    - name: Create proxy profile script
      ansible.builtin.copy:
        dest: /etc/profile.d/proxy.sh
        mode: '0644'
        content: |
          # System proxy settings - Managed by Ansible
          export http_proxy="{{ proxy_url }}"
          export https_proxy="{{ proxy_https_url }}"
          export HTTP_PROXY="{{ proxy_url }}"
          export HTTPS_PROXY="{{ proxy_https_url }}"
          export no_proxy="{{ no_proxy }}"
          export NO_PROXY="{{ no_proxy }}"

    # Also create a csh version for completeness
    - name: Create proxy profile for csh
      ansible.builtin.copy:
        dest: /etc/profile.d/proxy.csh
        mode: '0644'
        content: |
          # System proxy settings - Managed by Ansible
          setenv http_proxy "{{ proxy_url }}"
          setenv https_proxy "{{ proxy_https_url }}"
          setenv no_proxy "{{ no_proxy }}"
```

## Package Manager Proxy Configuration

Each package manager has its own proxy settings:

```yaml
# configure-pkg-proxy.yml - Set proxy for package managers
---
- name: Configure package manager proxy settings
  hosts: all
  become: true

  vars:
    proxy_url: "http://proxy.corp.example.com:8080"

  tasks:
    # Configure YUM/DNF proxy (RHEL/CentOS)
    - name: Configure YUM proxy
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy='
        line: "proxy={{ proxy_url }}"
        insertafter: '\[main\]'
      when: ansible_os_family == "RedHat"

    # Configure APT proxy (Debian/Ubuntu)
    - name: Configure APT proxy
      ansible.builtin.copy:
        dest: /etc/apt/apt.conf.d/99proxy
        mode: '0644'
        content: |
          Acquire::http::Proxy "{{ proxy_url }}";
          Acquire::https::Proxy "{{ proxy_url }}";
      when: ansible_os_family == "Debian"

    # Configure pip proxy
    - name: Create pip config directory
      ansible.builtin.file:
        path: /etc/pip.conf.d
        state: directory
        mode: '0755'
      failed_when: false

    - name: Configure pip proxy
      ansible.builtin.copy:
        dest: /etc/pip.conf
        mode: '0644'
        content: |
          [global]
          proxy = {{ proxy_url }}

    # Configure npm proxy (if npm is installed)
    - name: Check if npm is installed
      ansible.builtin.command:
        cmd: which npm
      register: npm_check
      changed_when: false
      failed_when: false

    - name: Configure npm proxy
      ansible.builtin.command:
        cmd: "npm config set proxy {{ proxy_url }} --global"
      when: npm_check.rc == 0
      changed_when: true

    - name: Configure npm https proxy
      ansible.builtin.command:
        cmd: "npm config set https-proxy {{ proxy_url }} --global"
      when: npm_check.rc == 0
      changed_when: true

    # Configure wget proxy
    - name: Configure wget proxy
      ansible.builtin.copy:
        dest: /etc/wgetrc
        mode: '0644'
        content: |
          # Proxy settings - Managed by Ansible
          http_proxy = {{ proxy_url }}
          https_proxy = {{ proxy_url }}
          use_proxy = on

    # Configure curl proxy
    - name: Configure curl proxy (system-wide)
      ansible.builtin.copy:
        dest: /etc/curlrc
        mode: '0644'
        content: |
          # Proxy settings - Managed by Ansible
          proxy="{{ proxy_url }}"
          noproxy="{{ no_proxy_list | join(',') }}"
```

## Docker Proxy Configuration

Docker needs proxy settings in two places: the daemon and the client:

```yaml
# docker-proxy.yml - Configure Docker proxy settings
---
- name: Configure Docker proxy
  hosts: docker_hosts
  become: true

  vars:
    proxy_url: "http://proxy.corp.example.com:8080"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12"

  tasks:
    # Configure Docker daemon proxy (for pulling images)
    - name: Create Docker systemd override directory
      ansible.builtin.file:
        path: /etc/systemd/system/docker.service.d
        state: directory
        mode: '0755'

    - name: Configure Docker daemon proxy
      ansible.builtin.copy:
        dest: /etc/systemd/system/docker.service.d/proxy.conf
        mode: '0644'
        content: |
          [Service]
          Environment="HTTP_PROXY={{ proxy_url }}"
          Environment="HTTPS_PROXY={{ proxy_url }}"
          Environment="NO_PROXY={{ no_proxy }}"
      notify:
        - reload systemd
        - restart docker

    # Configure Docker client proxy (for build commands)
    - name: Create Docker config directory for root
      ansible.builtin.file:
        path: /root/.docker
        state: directory
        mode: '0700'

    - name: Configure Docker client proxy
      ansible.builtin.copy:
        dest: /root/.docker/config.json
        mode: '0600'
        content: |
          {
            "proxies": {
              "default": {
                "httpProxy": "{{ proxy_url }}",
                "httpsProxy": "{{ proxy_url }}",
                "noProxy": "{{ no_proxy }}"
              }
            }
          }

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: restart docker
      ansible.builtin.systemd:
        name: docker
        state: restarted
```

## Proxy Configuration Architecture

```mermaid
flowchart TD
    A[Ansible Playbook] --> B[/etc/environment]
    A --> C[/etc/profile.d/proxy.sh]
    A --> D[Package Managers]
    A --> E[Docker]
    A --> F[Development Tools]
    D --> D1[yum.conf]
    D --> D2[apt.conf.d/99proxy]
    E --> E1[docker.service.d/proxy.conf]
    E --> E2[.docker/config.json]
    F --> F1[pip.conf]
    F --> F2[npm config]
    F --> F3[wgetrc]
    F --> F4[curlrc]
```

## Authenticated Proxy Configuration

Many corporate proxies require authentication:

```yaml
# proxy-auth.yml - Configure proxy with authentication
---
- name: Configure authenticated proxy
  hosts: all
  become: true

  vars:
    proxy_host: "proxy.corp.example.com"
    proxy_port: 8080
    proxy_user: "{{ vault_proxy_user }}"
    proxy_pass: "{{ vault_proxy_pass }}"
    proxy_url_auth: "http://{{ proxy_user }}:{{ proxy_pass }}@{{ proxy_host }}:{{ proxy_port }}"
    proxy_url_noauth: "http://{{ proxy_host }}:{{ proxy_port }}"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8"

  tasks:
    # For environment variables, use the authenticated URL
    - name: Set authenticated proxy in environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
        create: true
        mode: '0644'
      loop:
        - { key: "http_proxy", value: "{{ proxy_url_auth }}" }
        - { key: "https_proxy", value: "{{ proxy_url_auth }}" }
        - { key: "no_proxy", value: "{{ no_proxy }}" }
      no_log: true

    # For YUM, use username/password separately
    - name: Configure YUM with proxy auth
      ansible.builtin.blockinfile:
        path: /etc/yum.conf
        insertafter: '\[main\]'
        marker: "# {mark} PROXY CONFIG - ANSIBLE MANAGED"
        block: |
          proxy={{ proxy_url_noauth }}
          proxy_username={{ proxy_user }}
          proxy_password={{ proxy_pass }}
      when: ansible_os_family == "RedHat"
      no_log: true

    # For APT, embed credentials in the URL
    - name: Configure APT with proxy auth
      ansible.builtin.copy:
        dest: /etc/apt/apt.conf.d/99proxy
        mode: '0600'  # Stricter permissions because it contains credentials
        content: |
          Acquire::http::Proxy "{{ proxy_url_auth }}";
          Acquire::https::Proxy "{{ proxy_url_auth }}";
      when: ansible_os_family == "Debian"
      no_log: true
```

## Testing Proxy Connectivity

After configuration, verify everything works:

```yaml
# test-proxy.yml - Test proxy connectivity from all servers
---
- name: Test proxy connectivity
  hosts: all
  become: true

  vars:
    test_urls:
      - "https://www.google.com"
      - "https://registry.npmjs.org"
      - "https://pypi.org"
      - "https://dl.fedoraproject.org"

  tasks:
    # Test basic HTTP connectivity through proxy
    - name: Test proxy connectivity
      ansible.builtin.uri:
        url: "{{ item }}"
        method: GET
        status_code: 200
        timeout: 15
      loop: "{{ test_urls }}"
      register: proxy_test
      failed_when: false

    # Report results
    - name: Report proxy test results
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ 'OK' if item.status | default(0) == 200 else 'FAILED (' + (item.msg | default('unknown error')) + ')' }}"
      loop: "{{ proxy_test.results }}"
      loop_control:
        label: "{{ item.item }}"

    # Test package manager connectivity
    - name: Test YUM repo access
      ansible.builtin.command:
        cmd: "yum repolist --quiet"
      register: yum_test
      changed_when: false
      failed_when: false
      when: ansible_os_family == "RedHat"

    - name: Report YUM access
      ansible.builtin.debug:
        msg: "YUM repo access: {{ 'OK' if yum_test.rc == 0 else 'FAILED' }}"
      when: ansible_os_family == "RedHat"
```

## Removing Proxy Configuration

When servers move to a network with direct internet access, you need to cleanly remove all proxy settings:

```yaml
# remove-proxy.yml - Remove all proxy configuration
---
- name: Remove system proxy settings
  hosts: "{{ target_hosts }}"
  become: true

  tasks:
    # Remove environment variables
    - name: Remove proxy from /etc/environment
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "^(http_proxy|https_proxy|HTTP_PROXY|HTTPS_PROXY|no_proxy|NO_PROXY)="
        state: absent

    # Remove profile script
    - name: Remove proxy profile scripts
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /etc/profile.d/proxy.sh
        - /etc/profile.d/proxy.csh

    # Remove YUM proxy
    - name: Remove YUM proxy
      ansible.builtin.lineinfile:
        path: /etc/yum.conf
        regexp: '^proxy'
        state: absent
      when: ansible_os_family == "RedHat"

    # Remove APT proxy
    - name: Remove APT proxy
      ansible.builtin.file:
        path: /etc/apt/apt.conf.d/99proxy
        state: absent
      when: ansible_os_family == "Debian"

    # Remove Docker proxy
    - name: Remove Docker daemon proxy
      ansible.builtin.file:
        path: /etc/systemd/system/docker.service.d/proxy.conf
        state: absent
      notify:
        - reload systemd
        - restart docker

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: restart docker
      ansible.builtin.systemd:
        name: docker
        state: restarted
```

## Practical Tips

Proxy configuration lessons from enterprise environments:

1. Always set both lowercase and uppercase environment variables. Some tools read `http_proxy` while others read `HTTP_PROXY`. Set both to be safe.

2. The `no_proxy` list is critical. Without it, internal services try to route through the proxy, which fails because the proxy cannot reach your internal network. Include all RFC 1918 ranges and your internal domain names.

3. Be careful with proxy credentials in environment variables. They show up in `env` output and process listings. On multi-user systems, consider using proxy PAC files or WPAD instead of embedding credentials.

4. Docker needs proxy settings in two separate locations. The systemd override handles image pulls by the daemon, while the `config.json` handles commands inside `docker build`. Missing either one causes confusing failures.

5. Test every tool individually after configuration. I have seen setups where `curl` works through the proxy but `pip` does not because each tool reads proxy settings from different locations.

6. Use `no_log: true` on any task that handles proxy credentials. Ansible logs task output by default, and you do not want passwords showing up in CI/CD logs.

Proxy configuration is one of those tasks where completeness matters more than complexity. Miss one configuration file and something will not work. Ansible ensures you hit every location, every time, across every server.
