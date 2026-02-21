# How to Use Ansible to Configure Amazon Linux 2023

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Amazon Linux, AWS, Linux, Server Configuration

Description: Configure Amazon Linux 2023 EC2 instances with Ansible covering dnf, SELinux, AWS integration, and cloud-optimized system tuning.

---

Amazon Linux 2023 (AL2023) is Amazon's latest Linux distribution for EC2 and other AWS services. It is based on Fedora (not CentOS like AL2 was) and uses dnf as its package manager. AL2023 introduces deterministic updates through versioned repositories and has SELinux enabled in permissive mode by default. This guide covers Ansible automation specific to AL2023.

## Key Differences from Amazon Linux 2

AL2023 brings significant changes:

- Based on Fedora instead of CentOS/RHEL
- Uses dnf instead of yum
- SELinux is present (permissive by default)
- Deterministic updates with versioned repositories
- No EPEL (Amazon provides its own equivalent packages)
- Python 3.9+ included
- systemd-resolved for DNS

## Inventory

```ini
# inventory/hosts
[al2023]
web-ec2-01 ansible_host=10.0.1.10
web-ec2-02 ansible_host=10.0.1.11

[al2023:vars]
ansible_user=ec2-user
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_private_key_file=~/.ssh/aws-key.pem
```

## Configuration Playbook

```yaml
---
# configure_amazon_linux_2023.yml
- name: Configure Amazon Linux 2023
  hosts: al2023
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify Amazon Linux 2023
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Amazon"
          - ansible_distribution_major_version == "2023"
        fail_msg: "This playbook is for Amazon Linux 2023"

    - name: Update all packages
      ansible.builtin.dnf:
        name: '*'
        state: latest

    - name: Install essential packages
      ansible.builtin.dnf:
        name:
          - vim-enhanced
          - htop
          - tmux
          - jq
          - unzip
          - git
          - curl
          - wget
          - bind-utils
          - net-tools
          - tcpdump
          - sysstat
          - chrony
          - rsyslog
          - tar
          - lsof
          - bash-completion
          - python3-pip
          - amazon-cloudwatch-agent
          - aws-cli-2
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Set hostname from EC2 tag
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
```

## Deterministic Updates

AL2023 uses versioned repositories. You can lock to a specific version for consistency:

```yaml
    - name: Check current repository version
      ansible.builtin.command: dnf check-release-update
      register: release_update
      changed_when: false
      failed_when: false

    - name: Display available updates
      ansible.builtin.debug:
        msg: "{{ release_update.stdout_lines }}"
      when: release_update.stdout != ""

    # To lock to a specific version:
    # dnf releasever --set 2023.3.20240312
```

## SELinux Configuration

AL2023 ships with SELinux in permissive mode. For production, switch to enforcing:

```yaml
    - name: Set SELinux to enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing
      register: selinux_result

    - name: Reboot if SELinux state changed
      ansible.builtin.reboot:
        msg: "Rebooting for SELinux enforcement"
        reboot_timeout: 300
      when: selinux_result.reboot_required | default(false)
```

## AWS Integration

AL2023 comes with AWS tools pre-installed. Configure them:

```yaml
    - name: Configure CloudWatch agent
      ansible.builtin.copy:
        content: |
          {
            "agent": {
              "metrics_collection_interval": 60,
              "run_as_user": "root"
            },
            "metrics": {
              "append_dimensions": {
                "InstanceId": "${aws:InstanceId}",
                "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
              },
              "metrics_collected": {
                "mem": {
                  "measurement": ["mem_used_percent"]
                },
                "disk": {
                  "measurement": ["used_percent"],
                  "resources": ["*"]
                }
              }
            },
            "logs": {
              "logs_collected": {
                "files": {
                  "collect_list": [
                    {
                      "file_path": "/var/log/messages",
                      "log_group_name": "/ec2/{{ inventory_hostname }}/messages"
                    },
                    {
                      "file_path": "/var/log/secure",
                      "log_group_name": "/ec2/{{ inventory_hostname }}/secure"
                    }
                  ]
                }
              }
            }
          }
        dest: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
        mode: '0644'
      notify: restart cloudwatch agent

    - name: Enable CloudWatch agent
      ansible.builtin.systemd:
        name: amazon-cloudwatch-agent
        enabled: true
        state: started

    - name: Configure SSM agent
      ansible.builtin.systemd:
        name: amazon-ssm-agent
        enabled: true
        state: started
```

## Network and Firewall

AL2023 does not include firewalld by default. Use nftables or iptables:

```yaml
    - name: Install and configure firewalld
      block:
        - name: Install firewalld
          ansible.builtin.dnf:
            name: firewalld
            state: present

        - name: Start firewalld
          ansible.builtin.systemd:
            name: firewalld
            enabled: true
            state: started

        - name: Allow SSH
          ansible.posix.firewalld:
            service: ssh
            permanent: true
            state: enabled
            immediate: true

        - name: Allow HTTP/HTTPS
          ansible.posix.firewalld:
            service: "{{ item }}"
            permanent: true
            state: enabled
            immediate: true
          loop:
            - http
            - https
```

## System Tuning for EC2

```yaml
    - name: Tune sysctl for EC2 workloads
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.tcp_max_syn_backlog', value: '65535' }
        - { key: 'net.core.netdev_max_backlog', value: '65535' }
        - { key: 'net.ipv4.tcp_fin_timeout', value: '15' }
        - { key: 'net.ipv4.tcp_tw_reuse', value: '1' }
        - { key: 'vm.swappiness', value: '10' }
        - { key: 'fs.file-max', value: '2097152' }

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
      notify: restart sshd
```

## Handlers

```yaml
  handlers:
    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: restart cloudwatch agent
      ansible.builtin.command: >
        /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl
        -a fetch-config -m ec2
        -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

## Summary

Amazon Linux 2023 brings modern Fedora-based foundations to the AWS ecosystem. Key Ansible considerations: use dnf (not yum), configure SELinux for enforcing mode, leverage AWS-native tools (CloudWatch agent, SSM agent, AWS CLI v2), and handle deterministic versioned repositories for update management. No EPEL is needed since Amazon provides equivalent packages. This playbook provides the base configuration optimized for EC2 workloads.
