# How to Use Ansible to Configure NixOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, NixOS, Nix, Declarative Configuration, Linux

Description: Manage NixOS systems with Ansible by generating Nix configuration, triggering rebuilds, and handling the declarative configuration model.

---

NixOS is a Linux distribution built on the Nix package manager. It uses a declarative configuration model where the entire system is defined in `/etc/nixos/configuration.nix`. This is fundamentally different from imperative distributions where you install packages and modify config files individually. Managing NixOS with Ansible requires a different approach: instead of running apt or dnf, you modify the Nix configuration and trigger a system rebuild.

## The NixOS Challenge for Ansible

Traditional Ansible patterns do not work directly on NixOS:

- `ansible.builtin.package` does not work (Nix is not a supported package manager)
- Modifying config files directly gets overwritten on rebuild
- All system state is defined in `/etc/nixos/configuration.nix`
- Services are managed through Nix, not directly via systemctl

The solution: use Ansible to manage the Nix configuration file and trigger rebuilds.

## Inventory

```ini
[nixos]
nix-web01 ansible_host=10.0.14.10

[nixos:vars]
ansible_user=admin
ansible_python_interpreter=/run/current-system/sw/bin/python3
```

NixOS puts binaries in `/run/current-system/sw/bin/`.

## Configuration Playbook

```yaml
---
- name: Configure NixOS
  hosts: nixos
  become: true

  vars:
    nixos_hostname: "{{ inventory_hostname }}"
    nixos_timezone: "UTC"
    nixos_packages:
      - vim
      - htop
      - tmux
      - jq
      - git
      - curl
      - wget
      - python3

    nixos_services:
      openssh: true
      nginx: false

    nixos_firewall_allowed_tcp:
      - 22
      - 80
      - 443

  tasks:
    - name: Verify NixOS
      ansible.builtin.assert:
        that:
          - ansible_distribution == "NixOS"

    - name: Deploy NixOS configuration
      ansible.builtin.template:
        src: configuration.nix.j2
        dest: /etc/nixos/configuration.nix
        mode: '0644'
      register: nix_config

    - name: Rebuild NixOS if configuration changed
      ansible.builtin.command: nixos-rebuild switch
      when: nix_config.changed
      register: rebuild_result

    - name: Display rebuild output
      ansible.builtin.debug:
        msg: "{{ rebuild_result.stdout_lines | default([]) }}"
      when: rebuild_result.changed | default(false)
```

The Nix configuration template:

```nix
# configuration.nix.j2 - NixOS system configuration managed by Ansible
{ config, pkgs, ... }:

{
  # System settings
  networking.hostName = "{{ nixos_hostname }}";
  time.timeZone = "{{ nixos_timezone }}";

  # System packages
  environment.systemPackages = with pkgs; [
{% for pkg in nixos_packages %}
    {{ pkg }}
{% endfor %}
  ];

  # SSH service
{% if nixos_services.openssh %}
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = "no";
      PasswordAuthentication = false;
      MaxAuthTries = 3;
    };
  };
{% endif %}

{% if nixos_services.nginx | default(false) %}
  # Nginx web server
  services.nginx = {
    enable = true;
    virtualHosts."{{ nixos_hostname }}" = {
      root = "/var/www/html";
    };
  };
{% endif %}

  # Firewall
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ {{ nixos_firewall_allowed_tcp | join(' ') }} ];
  };

  # NTP
  services.chrony.enable = true;

  # Users
  users.users.admin = {
    isNormalUser = true;
    extraGroups = [ "wheel" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3... admin@myorg"
    ];
  };

  # Automatic garbage collection
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 30d";
  };

  # Auto-upgrades
  system.autoUpgrade = {
    enable = true;
    allowReboot = false;
  };

  system.stateVersion = "24.05";
}
```

## Managing Additional Configuration Modules

For more complex setups, use NixOS modules:

```yaml
    - name: Deploy custom NixOS module
      ansible.builtin.copy:
        content: |
          { config, pkgs, ... }:
          {
            services.myapp = {
              enable = true;
              port = 8080;
              dataDir = "/var/lib/myapp";
            };
          }
        dest: /etc/nixos/myapp.nix
        mode: '0644'

    - name: Include module in main configuration
      ansible.builtin.lineinfile:
        path: /etc/nixos/configuration.nix
        insertafter: '^{ config, pkgs'
        line: '  imports = [ ./myapp.nix ];'
      notify: rebuild nixos
```

## Summary

NixOS management with Ansible works at a higher level than traditional distributions. Instead of installing packages and configuring services imperatively, you template the Nix configuration file and trigger `nixos-rebuild switch`. This combines Ansible's orchestration capabilities with NixOS's declarative, reproducible system configuration. The result is a system that is both managed by Ansible and fully reproducible through Nix.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

