# How to Debug become Failures in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Privilege Escalation, Troubleshooting

Description: Step-by-step guide to diagnosing and fixing Ansible become failures including timeout errors, permission denied, and missing sudo access.

---

Become failures in Ansible are some of the most frustrating errors to debug because the error messages are often vague and the actual cause can be anything from a misconfigured sudoers file to a network timeout reaching an LDAP server. I have spent more hours than I care to admit chasing these issues across different environments, so here is everything I know about systematically debugging them.

## Common become Error Messages

Before diving into debugging, let us catalog the errors you are most likely to see. Knowing what each one means saves a lot of guesswork.

**"Missing sudo password"** means Ansible tried to use sudo without a password, but the sudoers file requires one for that user.

**"Timeout waiting for privilege escalation password prompt"** means the sudo command did not produce the expected password prompt before the timeout expired.

**"Incorrect sudo password"** is self-explanatory, but can also appear when the become_pass variable is encrypted and the vault password was wrong.

**"Sorry, user deploy is not allowed to execute..."** means the sudoers policy does not allow the command Ansible is trying to run.

**"sudo: a terminal is required to read the password"** means requiretty is enabled in sudoers and Ansible is not allocating a TTY.

## Step 1: Increase Verbosity

The first thing to do when become fails is run the playbook with maximum verbosity. The `-vvvv` flag shows you exactly what Ansible is sending to the remote host.

```bash
# Run with maximum verbosity to see the become commands

ansible-playbook -i inventory.yml playbook.yml -vvvv 2>&1 | tee ansible-debug.log
```

Look for lines containing "BECOME" or "sudo" in the output. You will see the exact sudo command Ansible constructs:

```text
<target_host> ESTABLISH SSH CONNECTION FOR USER: deploy
<target_host> SSH: EXEC ssh -o ControlMaster=auto ... deploy@target_host
<target_host> EXEC /bin/sh -c 'sudo -H -S -n -u root /bin/sh -c ...'
```

## Step 2: Test become Manually

Isolate whether the problem is with Ansible or with sudo on the remote host. SSH into the target machine and try running sudo the same way Ansible does.

```bash
# SSH to the target host as the Ansible user
ssh deploy@target_host

# Try running sudo the way Ansible does
sudo -H -S -n -u root /bin/sh -c 'echo SUCCESS'

# If that fails, try without the -n flag (allows interactive prompt)
sudo -H -S -u root /bin/sh -c 'echo SUCCESS'

# Check what sudo permissions the user actually has
sudo -l
```

The `sudo -l` command is gold. It shows you exactly what the current user is allowed to do via sudo, including whether a password is required.

## Step 3: Check the become Configuration

Verify that your Ansible configuration is correct. Mismatched settings between ansible.cfg, inventory, and playbook variables are a common cause of failures.

Create a diagnostic playbook that dumps all become-related settings:

```yaml
---
# debug-become-config.yml - Show all become settings
- name: Debug become configuration
  hosts: all
  gather_facts: false
  tasks:
    - name: Show become-related variables
      ansible.builtin.debug:
        msg:
          ansible_become: "{{ ansible_become | default('not set') }}"
          ansible_become_method: "{{ ansible_become_method | default('not set') }}"
          ansible_become_user: "{{ ansible_become_user | default('not set') }}"
          ansible_become_pass: "{{ 'SET (hidden)' if ansible_become_pass is defined else 'not set' }}"
          ansible_user: "{{ ansible_user | default('not set') }}"

    - name: Test basic connectivity without become
      ansible.builtin.ping:

    - name: Test become escalation
      ansible.builtin.command: whoami
      become: true
      register: whoami_result

    - name: Show escalated user
      ansible.builtin.debug:
        msg: "Escalated to: {{ whoami_result.stdout }}"
```

## Step 4: Examine Remote Logs

The remote host's authentication logs contain valuable information about why sudo is failing. If Ansible cannot become on the affected host, run this check while connected as a privileged user or use another break-glass account.

```yaml
---
# check-auth-logs.yml - Read auth logs for sudo failures
- name: Check authentication logs
  hosts: problematic_host
  become: true
  tasks:
    - name: Read recent sudo entries from auth log (Debian/Ubuntu)
      ansible.builtin.shell: |
        grep -i sudo /var/log/auth.log | tail -30
      register: auth_log
      changed_when: false
      failed_when: false

    - name: Read recent sudo entries from secure log (RHEL/CentOS)
      ansible.builtin.shell: |
        grep -i sudo /var/log/secure | tail -30
      register: secure_log
      changed_when: false
      failed_when: false

    - name: Show Debian auth log entries
      ansible.builtin.debug:
        msg: "{{ auth_log.stdout_lines }}"
      when: auth_log.stdout_lines | length > 0

    - name: Show RHEL secure log entries
      ansible.builtin.debug:
        msg: "{{ secure_log.stdout_lines }}"
      when: secure_log.stdout_lines | length > 0
```

## Step 5: Debug Password Prompt Detection

Ansible's sudo become plugin sets its own sudo prompt with `sudo -p` when a become password is configured, then waits for that exact prompt before sending the password. If a PAM module or sudoers setting prevents sudo from using the prompt Ansible supplied, Ansible may time out while waiting for the privilege escalation prompt.

First verify that Ansible is actually receiving a become password:

```yaml
---
# check-become-password.yml - Verify that a become password is configured
- name: Check become password configuration
  hosts: custom_prompt_hosts
  become: true
  vars:
    ansible_become_pass: "{{ vault_sudo_password }}"
  tasks:
    - name: Test become with configured password
      ansible.builtin.command: whoami
      register: result

    - name: Show result
      ansible.builtin.debug:
        msg: "{{ result.stdout }}"
```

If sudo ignores the prompt Ansible passes with `-p`, configure sudoers so a standard prompt can be overridden:

```bash
# Allow sudo -p to override PAM or sudoers password prompts
Defaults:deploy passprompt_override
```

## Step 6: Debug Timeout Issues

If become works manually but times out through Ansible, the problem is usually network latency in the authentication chain (LDAP, RADIUS, etc.) or a slow PAM module.

```yaml
---
# test-timing.yml - Measure how long become takes
- name: Test become timing
  hosts: all
  gather_facts: false
  tasks:
    - name: Record start time
      ansible.builtin.command: date +%s
      register: start_time
      changed_when: false

    - name: Run a simple become command
      ansible.builtin.command: date
      become: true
      register: become_result

    - name: Record end time
      ansible.builtin.command: date +%s
      register: end_time
      changed_when: false

    - name: Calculate duration
      ansible.builtin.debug:
        msg: "become took approximately {{ (end_time.stdout | int) - (start_time.stdout | int) }} seconds"
```

If the timing shows delays, increase Ansible's connection timeout. For the SSH connection plugin this controls both SSH connection establishment and how long Ansible waits while reading from an established connection:

```bash
# Increase timeout for slow become operations
ANSIBLE_TIMEOUT=60 ansible-playbook -i inventory.yml playbook.yml -vvv
```

## Step 7: Debug become_method Issues

If you are not using sudo (maybe you use `su`, `pbrun`, `dzdo`, or `pfexec`), make sure the become method is configured correctly.

```yaml
---
# test-become-methods.yml - Test different become methods
- name: Test become with su
  hosts: su_hosts
  become: true
  become_method: su
  become_user: root
  vars:
    ansible_become_pass: "{{ vault_root_password }}"
  tasks:
    - name: Verify escalation via su
      ansible.builtin.command: id
      register: id_output

    - name: Show identity
      ansible.builtin.debug:
        msg: "{{ id_output.stdout }}"
```

## Step 8: Check for SSH and Connection Issues

Sometimes what looks like a become failure is actually an SSH problem. If the SSH connection drops during the become phase, the error message can be misleading.

```bash
# Test raw SSH connectivity without Ansible
ssh -v deploy@target_host 'sudo -n whoami'

# Test with Ansible's raw module (bypasses Python requirement)
ansible target_host -i inventory.yml -m raw -a "sudo whoami" -u deploy -vvv
```

## Building a Comprehensive Debug Playbook

Here is a playbook that runs through all the common checks in one go:

```yaml
---
# full-become-debug.yml - Comprehensive become diagnostics
- name: Full become diagnostic
  hosts: all
  gather_facts: false
  tasks:
    - name: Test basic SSH connectivity
      ansible.builtin.ping:

    - name: Check current user
      ansible.builtin.command: whoami
      register: current_user
      changed_when: false

    - name: Show current user
      ansible.builtin.debug:
        msg: "Connected as: {{ current_user.stdout }}"

    - name: Check sudo availability
      ansible.builtin.command: which sudo
      register: sudo_path
      changed_when: false
      failed_when: false

    - name: Show sudo path
      ansible.builtin.debug:
        msg: "sudo binary: {{ sudo_path.stdout | default('NOT FOUND') }}"

    - name: Check sudo permissions
      ansible.builtin.command: sudo -n -l
      register: sudo_list
      changed_when: false
      failed_when: false

    - name: Show sudo permissions
      ansible.builtin.debug:
        msg: "{{ sudo_list.stdout_lines }}"
      when: sudo_list.rc == 0

    - name: Show sudo error
      ansible.builtin.debug:
        msg: "sudo -l failed: {{ sudo_list.stderr }}"
      when: sudo_list.rc != 0

    - name: Test become escalation
      ansible.builtin.command: id
      become: true
      register: become_id
      ignore_errors: true

    - name: Show become result
      ansible.builtin.debug:
        msg: "{{ become_id.stdout | default('FAILED: ' + become_id.msg | default('unknown error')) }}"

    - name: Check for requiretty in sudoers
      ansible.builtin.shell: |
        sudo -n grep -q "requiretty" /etc/sudoers 2>/dev/null && echo "1" || echo "0"
      register: requiretty
      changed_when: false
      ignore_errors: true

    - name: Warn about requiretty
      ansible.builtin.debug:
        msg: "WARNING: requiretty is set in /etc/sudoers"
      when: requiretty.stdout | default('0') | int > 0
```

## Quick Reference Checklist

When become fails, go through this list in order:

1. Run with `-vvvv` and read the actual error
2. SSH to the host and run `sudo -l` as the Ansible user
3. Check `/var/log/secure` or `/var/log/auth.log` on the remote host
4. Verify `ansible_become_pass` is set if passwords are required
5. Look for `requiretty` in `/etc/sudoers`
6. Test with `ansible -m ping` first to rule out connection issues
7. Increase the timeout if authentication backends are slow
8. Check SELinux audit logs if on RHEL/CentOS

## Wrapping Up

Debugging become failures is largely a process of elimination. Start from the outside (can you SSH in at all?) and work your way inward (does sudo work? does Ansible detect the prompt? does the timeout expire?). The verbose output from `-vvvv` combined with the remote host's auth logs will tell you the story every time. Build yourself a diagnostic playbook like the one above and keep it in your toolkit. It will save you hours the next time a new server refuses to cooperate.
