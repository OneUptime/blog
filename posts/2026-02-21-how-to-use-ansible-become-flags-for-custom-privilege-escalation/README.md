# How to Use Ansible become_flags for Custom Privilege Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Privilege Escalation, sudo, DevOps, Security

Description: Use become_flags in Ansible to pass custom options to sudo, su, and other privilege escalation methods

---

The `become_flags` directive in Ansible lets you pass additional command-line options to your privilege escalation method (sudo, su, doas, etc.). While the basic `become` settings cover most scenarios, there are times when you need to fine-tune how privilege escalation works. Maybe you need a login shell for environment variables, or you need to set a specific group, or you want sudo to preserve the calling user's environment.

This guide covers the most useful `become_flags` options and when to use them.

## What become_flags Does

When Ansible escalates privileges, it constructs a command like this:

```bash
# Default sudo command Ansible generates:
sudo -H -S -n -u root /bin/bash -c 'the_actual_command'
```

The `become_flags` directive lets you add to or modify these flags. Whatever you put in `become_flags` gets inserted into the escalation command.

## Login Shell with become_flags

One of the most common uses of `become_flags` is to request a login shell. A login shell reads the target user's profile files (.bash_profile, .profile, etc.), which sets up environment variables like PATH, JAVA_HOME, and others.

```yaml
# playbooks/login-shell.yml
# Use become_flags to get a login shell for proper environment setup
---
- name: Tasks requiring login shell environment
  hosts: all
  become: true
  become_user: appuser
  become_flags: '-i'

  tasks:
    - name: Show environment with login shell
      ansible.builtin.command: env
      register: env_output

    - name: Check PATH includes user-specific directories
      ansible.builtin.command: echo $PATH
      register: path_output

    - name: Display results
      ansible.builtin.debug:
        msg: "PATH: {{ path_output.stdout }}"
```

The `-i` flag tells sudo to simulate an initial login, which means it runs the target user's shell as a login shell. This is crucial when the target user has environment variables set in their profile that your tasks depend on.

## Preserving Environment Variables

Sometimes you need the escalated process to keep certain environment variables from the calling user.

```yaml
# playbooks/preserve-env.yml
# Preserve environment variables through sudo escalation
---
- name: Tasks that need calling user's environment
  hosts: all
  become: true
  become_flags: '-E'

  tasks:
    - name: Use HTTP proxy from calling user's environment
      ansible.builtin.apt:
        name: nginx
        state: present
      environment:
        http_proxy: "{{ lookup('env', 'http_proxy') }}"
        https_proxy: "{{ lookup('env', 'https_proxy') }}"
```

The `-E` flag (or `--preserve-env`) tells sudo to keep the calling user's environment variables. This is useful when your target hosts are behind a proxy and the proxy settings are configured in the connecting user's environment.

For preserving only specific variables:

```yaml
# Preserve only specific environment variables
- name: Run with specific env vars preserved
  ansible.builtin.command: make install
  become: true
  become_flags: '--preserve-env=PATH,HOME,LANG'
```

## Setting Groups with become_flags

You can use become_flags to set the group context for the escalated process.

```yaml
# playbooks/set-group.yml
# Run tasks with a specific primary group
---
- name: Tasks with specific group context
  hosts: all

  tasks:
    - name: Create shared files with correct group ownership
      ansible.builtin.copy:
        content: "shared configuration data"
        dest: /opt/shared/config.txt
        mode: '0664'
      become: true
      become_user: appuser
      become_flags: '-g developers'
```

## become_flags with su

When using `su` as the become_method, the flags are different from sudo.

```yaml
# playbooks/su-flags.yml
# Use su-specific flags for privilege escalation
---
- name: Tasks using su with flags
  hosts: legacy_servers
  become: true
  become_method: su

  tasks:
    - name: Run as root with login shell (su -)
      ansible.builtin.command: whoami
      become_flags: '-'

    - name: Run as root preserving environment
      ansible.builtin.command: env
      become_flags: '-m'

    - name: Run a specific shell
      ansible.builtin.command: whoami
      become_flags: '-s /bin/bash'
```

The `-` flag for su creates a login shell (equivalent to `su - root`). The `-m` flag preserves the calling user's environment.

## become_flags at Different Levels

Like other become directives, you can set `become_flags` at the play level, task level, or in configuration.

```ini
# ansible.cfg
[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_flags = -H -S -n
```

```yaml
# playbooks/multi-level-flags.yml
# become_flags at play and task levels
---
- name: Play-level become_flags
  hosts: all
  become: true
  become_flags: '-H'

  tasks:
    - name: This inherits play-level flags (-H)
      ansible.builtin.command: whoami

    - name: This overrides with task-level flags (-i)
      ansible.builtin.command: env
      become_flags: '-i'

    - name: Back to play-level flags (-H)
      ansible.builtin.command: whoami
```

## Practical Example: Java Application Deployment

Java applications often need JAVA_HOME and other environment variables that are set in the application user's profile. Without a login shell, these variables are missing.

```yaml
# playbooks/java-deploy.yml
# Deploy a Java application that needs the appuser's environment
---
- name: Deploy Java application
  hosts: app_servers
  become: true

  tasks:
    - name: Stop the application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Deploy new JAR file
      ansible.builtin.copy:
        src: "files/myapp-{{ version }}.jar"
        dest: /opt/myapp/myapp.jar
        owner: appuser
        group: appuser
        mode: '0644'

    - name: Run database migration as appuser with login shell
      ansible.builtin.command: /opt/myapp/bin/migrate.sh
      become_user: appuser
      become_flags: '-i'

    - name: Start the application
      ansible.builtin.systemd:
        name: myapp
        state: started

    - name: Verify application health
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health_check
      until: health_check.status == 200
```

The `become_flags: '-i'` on the migration task ensures that JAVA_HOME, CLASSPATH, and other environment variables from appuser's profile are available.

## Practical Example: Running Commands with Specific Security Context

On SELinux-enabled systems, you might need to run commands in a specific security context.

```yaml
# playbooks/selinux-context.yml
# Run commands with SELinux type transition
---
- name: SELinux-aware tasks
  hosts: rhel_servers
  become: true

  tasks:
    - name: Run command in specific SELinux context
      ansible.builtin.command: /opt/restricted/run.sh
      become_flags: '-r system_r -t unconfined_t'
```

## Combining Multiple Flags

You can pass multiple flags at once.

```yaml
# playbooks/combined-flags.yml
# Multiple sudo flags for specific scenarios
---
- name: Tasks with combined flags
  hosts: all

  tasks:
    - name: Login shell that preserves HOME and sets group
      ansible.builtin.command: /opt/app/setup.sh
      become: true
      become_user: appuser
      become_flags: '-i -H -g appgroup'

    - name: Non-interactive sudo with specific PATH
      ansible.builtin.command: /opt/scripts/deploy.sh
      become: true
      become_flags: '--preserve-env=PATH -H -S'
```

## Inventory-Level become_flags

Set become_flags per host or group in your inventory.

```ini
# inventory/hosts.ini
[java_servers]
java1 ansible_host=192.168.1.40
java2 ansible_host=192.168.1.41

[java_servers:vars]
ansible_become=true
ansible_become_flags=-i
ansible_become_user=appuser

[standard_servers]
std1 ansible_host=192.168.1.10

[standard_servers:vars]
ansible_become=true
ansible_become_flags=-H -S -n
```

## Common become_flags Reference

Here is a quick reference for the most useful flags.

```yaml
# sudo flags
become_flags: '-i'                    # Login shell (reads target user profile)
become_flags: '-H'                    # Set HOME to target user's home directory
become_flags: '-S'                    # Read password from stdin
become_flags: '-n'                    # Non-interactive (never prompt)
become_flags: '-E'                    # Preserve calling user's environment
become_flags: '-g groupname'          # Run with specified primary group
become_flags: '--preserve-env=VAR'    # Preserve specific environment variables

# su flags
become_flags: '-'                     # Login shell
become_flags: '-m'                    # Preserve environment
become_flags: '-s /bin/bash'          # Use specific shell

# doas flags
become_flags: '-s'                    # Execute shell
become_flags: '-n'                    # Non-interactive
```

## Troubleshooting become_flags

```bash
# See exactly what command Ansible generates with your flags
ansible all -m command -a "whoami" --become --become-flags="-i" -vvvv

# The verbose output will show something like:
# EXEC sudo -i -H -S -n -u root /bin/bash -c 'whoami'
```

Common issues:

- Using `-i` (login shell) can change the working directory to the target user's home, which may break relative paths in your tasks
- The `-E` flag only works if the sudoers policy allows environment preservation (the `env_reset` and `env_keep` settings in sudoers)
- Some flags conflict with each other or with Ansible's default flags

The `become_flags` directive gives you precise control over privilege escalation behavior. Most of the time you will not need it, but when you do, it solves problems that cannot be addressed any other way.
