# How to Use Ansible to Configure AppArmor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AppArmor, Security, Ubuntu, Linux

Description: Manage AppArmor profiles and policies on Ubuntu and Debian servers using Ansible for mandatory access control enforcement.

---

AppArmor is the mandatory access control (MAC) system used by Ubuntu, Debian, and SUSE Linux distributions. While it serves a similar purpose to SELinux (restricting what processes can do), AppArmor uses a path-based approach that many administrators find more intuitive. Profiles define what files, network operations, and capabilities a program can access, and anything not explicitly allowed is denied.

Managing AppArmor profiles across multiple servers by hand is tedious and inconsistent. Ansible lets you deploy profiles, enforce modes, and handle exceptions uniformly. In this guide, I will show you how to manage AppArmor with Ansible, including deploying custom profiles, toggling between enforce and complain modes, and building profiles for your applications.

## AppArmor Concepts

```mermaid
graph TD
    A[AppArmor] --> B[Enforce Mode]
    A --> C[Complain Mode]
    A --> D[Disabled]
    B --> B1[Violations blocked and logged]
    C --> C1[Violations logged but allowed]
    D --> D1[No protection]
    A --> E[Profiles]
    E --> E1[/usr/sbin/nginx]
    E --> E2[/usr/sbin/mysqld]
    E --> E3[/opt/myapp/bin/app]
```

## Variables

```yaml
# group_vars/all.yml
# AppArmor overall state
apparmor_enabled: true

# Profiles to enforce (block violations)
apparmor_enforce_profiles:
  - /usr/sbin/nginx
  - /usr/sbin/mysqld
  - /usr/sbin/sshd

# Profiles to set to complain mode (log only)
apparmor_complain_profiles: []

# Profiles to disable
apparmor_disable_profiles: []

# Custom profiles to deploy
apparmor_custom_profiles:
  - name: myapp
    binary: /opt/myapp/bin/app
    profile: |
      #include <tunables/global>

      /opt/myapp/bin/app {
        #include <abstractions/base>
        #include <abstractions/nameservice>

        # Application binary
        /opt/myapp/bin/app mr,
        /opt/myapp/lib/** mr,

        # Configuration files
        /opt/myapp/config/** r,
        /etc/myapp/** r,

        # Data directory (read-write)
        /var/lib/myapp/** rw,
        /var/lib/myapp/ r,

        # Log files
        /var/log/myapp/** w,
        /var/log/myapp/ r,

        # Temp files
        /tmp/myapp-* rw,

        # Network access
        network inet stream,
        network inet dgram,

        # PID file
        /var/run/myapp.pid w,

        # Deny everything else by default
        deny /etc/shadow r,
        deny /etc/passwd w,
      }

  - name: nginx-custom
    binary: /usr/sbin/nginx
    profile: |
      #include <tunables/global>

      /usr/sbin/nginx {
        #include <abstractions/base>
        #include <abstractions/nameservice>
        #include <abstractions/openssl>

        # Binary
        /usr/sbin/nginx mr,
        /usr/lib/nginx/modules/** mr,

        # Configuration
        /etc/nginx/** r,
        /etc/ssl/** r,

        # Web content
        /var/www/** r,
        /usr/share/nginx/** r,

        # Custom web content paths
        /app/static/** r,
        /app/uploads/** r,

        # Logs
        /var/log/nginx/** w,
        /var/log/nginx/ r,

        # PID and temp
        /var/run/nginx.pid rw,
        /var/lib/nginx/** rw,

        # Network
        network inet stream,
        network inet6 stream,

        # Capabilities
        capability net_bind_service,
        capability setuid,
        capability setgid,
        capability dac_override,
      }
```

## AppArmor Role

```yaml
# roles/apparmor/tasks/main.yml
---
- name: Install AppArmor packages
  ansible.builtin.apt:
    name:
      - apparmor
      - apparmor-utils
      - apparmor-profiles
      - apparmor-profiles-extra
    state: present
    update_cache: yes

- name: Ensure AppArmor is enabled at boot
  ansible.builtin.service:
    name: apparmor
    state: started
    enabled: yes
  when: apparmor_enabled | bool

- name: Deploy custom AppArmor profiles
  ansible.builtin.copy:
    dest: "/etc/apparmor.d/{{ item.name }}"
    content: "{{ item.profile }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ apparmor_custom_profiles }}"
  notify: Reload AppArmor profiles

- name: Set profiles to enforce mode
  ansible.builtin.command:
    cmd: "aa-enforce {{ item }}"
  loop: "{{ apparmor_enforce_profiles }}"
  register: enforce_result
  changed_when: "'Setting' in enforce_result.stdout"
  ignore_errors: yes

- name: Set profiles to complain mode
  ansible.builtin.command:
    cmd: "aa-complain {{ item }}"
  loop: "{{ apparmor_complain_profiles | default([]) }}"
  register: complain_result
  changed_when: "'Setting' in complain_result.stdout"
  ignore_errors: yes

- name: Disable specified profiles
  ansible.builtin.command:
    cmd: "aa-disable {{ item }}"
  loop: "{{ apparmor_disable_profiles | default([]) }}"
  register: disable_result
  changed_when: "'Disabling' in disable_result.stdout"
  ignore_errors: yes
```

## Profile Generation

Generate an AppArmor profile for a running application by observing its behavior.

```yaml
# roles/apparmor/tasks/generate-profile.yml
---
- name: Set target application to complain mode
  ansible.builtin.command:
    cmd: "aa-complain {{ apparmor_target_binary }}"
  when: apparmor_target_binary is defined

- name: Wait for application to exercise its code paths
  ansible.builtin.pause:
    minutes: "{{ apparmor_observe_minutes | default(10) }}"
    prompt: "Application is in complain mode. Exercise all features, then press Enter."
  when: apparmor_target_binary is defined

- name: Generate profile from logs
  ansible.builtin.command:
    cmd: "aa-logprof"
  when: apparmor_target_binary is defined
  register: logprof_result

- name: Switch to enforce mode after profile is generated
  ansible.builtin.command:
    cmd: "aa-enforce {{ apparmor_target_binary }}"
  when:
    - apparmor_target_binary is defined
    - logprof_result is success
```

## Docker and Container Profiles

AppArmor integrates with Docker to provide container-level MAC.

```yaml
# roles/apparmor/tasks/docker-profiles.yml
---
- name: Deploy Docker container AppArmor profiles
  ansible.builtin.copy:
    dest: "/etc/apparmor.d/docker-{{ item.name }}"
    content: "{{ item.profile }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ apparmor_docker_profiles | default([]) }}"
  notify: Reload AppArmor profiles
```

Example Docker profile variable.

```yaml
# group_vars/docker-hosts.yml
apparmor_docker_profiles:
  - name: webapp
    profile: |
      #include <tunables/global>

      profile docker-webapp flags=(attach_disconnected,mediate_deleted) {
        #include <abstractions/base>
        #include <abstractions/nameservice>

        network inet stream,
        network inet6 stream,

        # Allow reading container filesystem
        / r,
        /** r,

        # Application can write to specific paths
        /app/data/** rw,
        /app/logs/** w,
        /tmp/** rw,

        # Deny sensitive host paths
        deny /proc/sys/** w,
        deny /sys/** w,

        # Capabilities
        capability net_bind_service,
        capability chown,
        capability setuid,
        capability setgid,
      }
```

## Handlers

```yaml
# roles/apparmor/handlers/main.yml
---
- name: Reload AppArmor profiles
  ansible.builtin.command:
    cmd: apparmor_parser -r /etc/apparmor.d/
  ignore_errors: yes

- name: Restart AppArmor
  ansible.builtin.service:
    name: apparmor
    state: restarted
```

## Verification

```yaml
# verify-apparmor.yml
---
- name: Verify AppArmor configuration
  hosts: all
  become: yes
  tasks:
    - name: Check AppArmor status
      ansible.builtin.command:
        cmd: aa-status
      register: aa_status
      changed_when: false

    - name: Display AppArmor status
      ansible.builtin.debug:
        msg: "{{ aa_status.stdout_lines }}"

    - name: Count enforced profiles
      ansible.builtin.shell:
        cmd: "aa-status --enforced"
      register: enforced_count
      changed_when: false

    - name: Count complain profiles
      ansible.builtin.shell:
        cmd: "aa-status --complaining"
      register: complain_count
      changed_when: false

    - name: Display profile counts
      ansible.builtin.debug:
        msg:
          - "Enforced profiles: {{ enforced_count.stdout }}"
          - "Complain profiles: {{ complain_count.stdout }}"

    - name: Check for recent AppArmor denials in logs
      ansible.builtin.shell:
        cmd: "dmesg | grep -i apparmor | tail -20"
      register: recent_denials
      changed_when: false
      ignore_errors: yes

    - name: Display recent denials
      ansible.builtin.debug:
        msg: "{{ recent_denials.stdout_lines | default(['No recent denials']) }}"
```

## Troubleshooting Playbook

```yaml
# troubleshoot-apparmor.yml
---
- name: Troubleshoot AppArmor issues
  hosts: "{{ target_host }}"
  become: yes
  tasks:
    - name: Get full AppArmor status
      ansible.builtin.command:
        cmd: aa-status --verbose
      register: aa_verbose
      changed_when: false

    - name: Display status
      ansible.builtin.debug:
        msg: "{{ aa_verbose.stdout_lines }}"

    - name: Show denials for a specific program
      ansible.builtin.shell:
        cmd: "journalctl -k | grep 'apparmor=\"DENIED\"' | grep '{{ target_program | default(\".\") }}' | tail -20"
      register: program_denials
      changed_when: false

    - name: Display program denials
      ansible.builtin.debug:
        msg: "{{ program_denials.stdout_lines }}"

    - name: Temporarily switch to complain mode for debugging
      ansible.builtin.command:
        cmd: "aa-complain {{ target_program }}"
      when: target_program is defined and switch_to_complain | default(false) | bool
```

## Running the Playbook

```bash
# Deploy AppArmor configuration
ansible-playbook -i inventory/hosts.ini site.yml

# Verify profiles
ansible-playbook -i inventory/hosts.ini verify-apparmor.yml

# Troubleshoot a specific program
ansible-playbook -i inventory/hosts.ini troubleshoot-apparmor.yml \
  -e "target_host=web-01 target_program=/usr/sbin/nginx"

# Generate profile for a new application
ansible-playbook -i inventory/hosts.ini site.yml \
  -e "apparmor_target_binary=/opt/newapp/bin/server apparmor_observe_minutes=15"
```

## Wrapping Up

AppArmor provides solid mandatory access control with a more approachable configuration model than SELinux. With Ansible managing your profiles, every server gets the same security policies, and new applications get profiles deployed as part of the standard provisioning process. The workflow for new applications is: start in complain mode, observe the application's behavior, refine the profile, and then switch to enforce mode. Ansible makes each of these steps repeatable and auditable, which is exactly what you need for security configuration management.
