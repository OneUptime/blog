# How to Use Ansible with Vagrant for Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vagrant, Local Development, DevOps

Description: Set up reproducible local development environments using Vagrant boxes provisioned with Ansible playbooks and roles.

---

Vagrant creates and manages virtual machines for local development. Combined with Ansible as the provisioner, you get reproducible development environments that match production. Every developer on your team gets the same setup regardless of their host operating system.

This post shows how to use Ansible with Vagrant for local development environments.

## Why Vagrant + Ansible

Docker works for running individual services, but sometimes you need a full VM that mirrors your production OS. Vagrant gives you that VM, and Ansible configures it the same way you configure production servers.

```mermaid
graph LR
    A[Vagrantfile] --> B[Launch VM]
    B --> C[Ansible Provisioner]
    C --> D[Configured Dev Environment]
```

## Basic Vagrantfile with Ansible

```ruby
# Vagrantfile
# Local development environment provisioned with Ansible
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "dev-server"

  # Forward application port
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 5432, host: 5432

  # Private network for multi-VM setups
  config.vm.network "private_network", ip: "192.168.56.10"

  # VM resources
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
    vb.name = "dev-server"
  end

  # Sync project directory
  config.vm.synced_folder ".", "/vagrant", type: "nfs"

  # Ansible provisioner
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "ansible/playbooks/dev-setup.yml"
    ansible.extra_vars = {
      environment_name: "development",
      app_port: 8080
    }
  end
end
```

## Ansible Playbook for Vagrant

```yaml
# ansible/playbooks/dev-setup.yml
# Development environment provisioning
---
- name: Setup development environment
  hosts: all
  become: true

  roles:
    - common
    - postgresql
    - redis
    - nodejs

  tasks:
    - name: Create development database
      community.postgresql.postgresql_db:
        name: myapp_dev
        state: present
      become_user: postgres

    - name: Run database migrations
      ansible.builtin.command:
        cmd: npm run migrate
        chdir: /vagrant
      become: false
      changed_when: true

    - name: Seed development data
      ansible.builtin.command:
        cmd: npm run seed
        chdir: /vagrant
      become: false
      changed_when: true

    - name: Display access information
      ansible.builtin.debug:
        msg: |
          Development environment ready!
          App: http://localhost:8080
          Database: localhost:5432
```

## Multi-VM Development Environment

For microservice architectures, create multiple VMs:

```ruby
# Vagrantfile for multi-VM development
Vagrant.configure("2") do |config|
  # Web server VM
  config.vm.define "web" do |web|
    web.vm.box = "ubuntu/jammy64"
    web.vm.hostname = "dev-web"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.network "forwarded_port", guest: 80, host: 8080
    web.vm.provider "virtualbox" do |vb|
      vb.memory = "1024"
    end
  end

  # Database VM
  config.vm.define "db" do |db|
    db.vm.box = "ubuntu/jammy64"
    db.vm.hostname = "dev-db"
    db.vm.network "private_network", ip: "192.168.56.11"
    db.vm.provider "virtualbox" do |vb|
      vb.memory = "2048"
    end
  end

  # Provision all VMs with Ansible
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "ansible/playbooks/dev-site.yml"
    ansible.groups = {
      "webservers" => ["web"],
      "databases" => ["db"]
    }
  end
end
```

## Re-Provisioning

Update your environment without destroying it:

```bash
# Re-run Ansible provisioner only
vagrant provision

# Destroy and rebuild from scratch
vagrant destroy -f && vagrant up
```

## Developing Ansible Roles with Vagrant

Vagrant is perfect for testing Ansible roles before applying them to production:

```ruby
# Vagrantfile for role testing
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "tests/test.yml"
    ansible.verbose = "v"
  end
end
```

```yaml
# tests/test.yml
---
- name: Test my role
  hosts: all
  become: true
  roles:
    - role: ../
  post_tasks:
    - name: Verify role applied correctly
      ansible.builtin.service:
        name: nginx
        state: started
      register: svc
      failed_when: svc.status.ActiveState != 'active'
```

## Sharing Vagrant Boxes

Create a custom Vagrant box with your configuration baked in:

```yaml
# playbooks/build-vagrant-box.yml
# Build a pre-configured Vagrant box
---
- name: Configure base box
  hosts: all
  become: true
  roles:
    - common
    - development_tools
    - docker
  post_tasks:
    - name: Clean up for packaging
      ansible.builtin.shell: |
        apt-get clean
        dd if=/dev/zero of=/EMPTY bs=1M || true
        rm -f /EMPTY
        cat /dev/null > /var/log/wtmp
      changed_when: true
```

Then package it:

```bash
vagrant package --output myteam-dev-box.box
vagrant box add myteam/dev myteam-dev-box.box
```

## Key Takeaways

Vagrant with Ansible gives you production-like development environments on your laptop. Use the same Ansible roles for Vagrant that you use in production. Multi-VM Vagrantfiles simulate complex architectures locally. Re-provision without destroying for fast iteration. This approach eliminates environment inconsistencies across your development team.

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

