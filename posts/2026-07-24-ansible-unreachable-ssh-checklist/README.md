# SSH Works Manually, but Ansible Says UNREACHABLE: A Troubleshooting Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, Automation, Inventory

Description: Trace Ansible UNREACHABLE errors by reproducing its exact SSH identity, inventory, host-key, bastion, and transport settings.

---

A successful `ssh server` command does not prove that Ansible is making the same connection. Your shell may use a host alias, user, key from `ssh-agent`, jump host, port, and configuration stanza that differ from Ansible's effective inventory.

`UNREACHABLE` means Ansible's connection layer could not establish a usable session. It differs from a module result marked `FAILED`, which normally means transport succeeded and the task itself failed. Diagnose the transport before changing playbook logic.

## 1. Confirm the Exact Inventory Target

List the hosts selected by the play:

```bash
ansible-playbook -i inventories/production site.yml --list-hosts
ansible-inventory -i inventories/production --graph
ansible-inventory -i inventories/production --host web-01
```

Pay attention to these connection variables:

```yaml
all:
  children:
    web:
      hosts:
        web-01:
          ansible_host: 192.0.2.41
          ansible_user: deploy
          ansible_port: 22
          ansible_ssh_private_key_file: /secure/keys/production_ed25519
```

`inventory_hostname` is the inventory alias. `ansible_host` is the address Ansible contacts. A manual connection to `web-01` can resolve through `~/.ssh/config`, while Ansible may be contacting a stale IP from inventory.

Check for overlapping inventory sources and variable precedence. A host variable, group variable, or dynamic inventory value can change the effective connection. Ordinary command-line options such as `-u` and `--private-key` override configuration settings, but they do not override connection variables from inventory or playbooks.

## 2. Reproduce Ansible's Connection Explicitly

Use the values shown by `ansible-inventory`, without relying on your convenient SSH alias:

```bash
ssh -vvv \
  -p 22 \
  -i /secure/keys/production_ed25519 \
  deploy@192.0.2.41
```

Run this from the Ansible controller or execution environment, not from an unrelated laptop. In AWX, CI, or a container, your local SSH agent and files may not exist at all.

If the manual command fails, fix routing, DNS, firewall rules, authentication, or server-side SSH policy before returning to Ansible.

## 3. Ask Ansible for Its SSH Command

Start with a single host and high verbosity:

```bash
ansible web-01 \
  -i inventories/production \
  -m ansible.builtin.ping \
  -vvvv
```

Connection debugging commonly requires `-vvvv`. Inspect:

- destination address and port
- remote username
- selected private key
- SSH options and configuration file
- proxy or jump-host arguments
- host-key error
- authentication methods attempted
- timeout, DNS, or connection-refused messages

`ansible.builtin.ping` is not ICMP ping. It logs in, finds a usable Python interpreter, executes a small module, and expects `pong`. A network ICMP response does not prove any of those steps.

## 4. Test Transport Without Python

Most POSIX Ansible modules need Python on the managed node. The `raw` action does not:

```bash
ansible web-01 \
  -i inventories/production \
  -m ansible.builtin.raw \
  -a 'id && command -v python3 || true' \
  -vvvv
```

Interpret the result:

- If `raw` is also unreachable, continue debugging SSH transport.
- If `raw` succeeds but `ping` fails, inspect Python discovery and managed-node prerequisites.
- If both succeed but the play fails, inspect task, become, or environment behavior.

This separation prevents an interpreter error from being mistaken for an SSH failure.

## 5. Verify User and Key Selection

Ansible normally connects with the controller's current username unless another remote user is configured. Set it explicitly when environments differ:

```yaml
ansible_user: deploy
```

For keys, prefer an agent where practical or set an explicit file:

```yaml
ansible_ssh_private_key_file: /secure/keys/production_ed25519
```

To force these values for one diagnostic run without editing inventory, pass them as extra variables, which override inventory variables:

```bash
ansible web-01 \
  -i inventories/production \
  -m ansible.builtin.ping \
  -e 'ansible_user=deploy' \
  -e 'ansible_ssh_private_key_file=/secure/keys/production_ed25519'
```

The default OpenSSH connection plugin cannot open an interactive prompt to decrypt a protected private key during a task. Load the key into `ssh-agent` before the run, or provide credentials through the automation platform's supported credential mechanism.

Check key-file permissions and ensure the controller process can read the file. On the server, inspect `authorized_keys`, its ownership and permissions, account expiration, allowed users, and SSH daemon logs.

## 6. Resolve Host-Key Problems Safely

Typical errors include:

- `Host key verification failed`
- an interactive authenticity prompt that automation cannot answer
- `REMOTE HOST IDENTIFICATION HAS CHANGED`

Populate `known_hosts` through a trusted process and verify the fingerprint out of band:

```bash
ssh-keygen -F 192.0.2.41
ssh-keygen -R 192.0.2.41
ssh deploy@192.0.2.41
```

Remove an old key only after confirming that the host was legitimately rebuilt or readdressed. Disabling host-key checking globally makes automation vulnerable to connecting to an impersonated system and should not be the default troubleshooting “fix.”

In ephemeral environments, manage a dedicated known-hosts file and distribute trusted keys as part of controller setup.

## 7. Match Bastion and Proxy Configuration

If manual SSH uses `ProxyJump` or `ProxyCommand`, ensure Ansible receives the same path. Ansible's native SSH plugin reads OpenSSH configuration, but the `Host` pattern must match the hostname or address passed to `ssh`. With the `ansible_host` value above, include that address and any manual alias that should share the settings:

```sshconfig
Host web-01 192.0.2.41
  User deploy
  ProxyJump bastion.example.com
  IdentityFile /secure/keys/production_ed25519
```

Inventory can also add SSH options:

```yaml
web:
  vars:
    ansible_ssh_common_args: >-
      -o ProxyJump=deploy@bastion.example.com
```

`ansible_ssh_common_args` is appended to SSH, SCP, and SFTP commands for the host or group. Quote YAML carefully and verify the final invocation with `-vvvv`.

Confirm that the controller can reach the bastion, the bastion can reach the target, and both host keys and credentials are available in the actual runtime.

## 8. Check Address Families, Ports, and Network Policy

An alias may prefer a working IPv4 address while inventory supplies an unavailable IPv6 address, or the reverse. Compare:

```bash
getent ahosts web-01.example.com
ssh -G web-01.example.com | sed -n '1,80p'
```

Test the configured TCP port from the controller:

```bash
nc -vz 192.0.2.41 22
```

A timeout generally suggests routing, firewall, security-group, network-policy, or silent packet filtering. `Connection refused` usually means the address is reachable but nothing accepts connections on that port. DNS errors point to the controller's resolver or an incorrect host value.

For cloud hosts, confirm that dynamic inventory has refreshed and that the selected address is reachable from the controller network.

## 9. Inspect SSH Multiplexing and Stale Connections

Ansible uses native OpenSSH by default and can benefit from ControlPersist. A stale control socket can retain a route or identity after a host changes. The verbose output shows the control path and SSH arguments.

As a diagnostic, take the equivalent direct SSH command and disable only multiplexing. For the example connection:

```bash
ssh -vvv \
  -o ControlMaster=no \
  -o ControlPath=none \
  -p 22 \
  -i /secure/keys/production_ed25519 \
  deploy@192.0.2.41
```

If that works, inspect `ssh_args`, control-path permissions, path length, and stale socket lifecycle on the controller. Do not permanently discard connection reuse without measuring the performance cost.

## 10. Separate SSH Login from Privilege Escalation

`remote_user` or `ansible_user` chooses the SSH login account. `become_user` chooses the identity used after login:

```yaml
- name: Configure web hosts
  hosts: web
  remote_user: deploy
  become: true
  become_user: root
```

A sudo failure is normally a task failure rather than SSH unreachable, but prompts and timeouts can look confusing. First prove an unprivileged raw command works, then test escalation:

```bash
ansible web-01 -i inventories/production \
  -m ansible.builtin.raw -a 'id'

ansible web-01 -i inventories/production \
  -b -m ansible.builtin.command -a 'id'
```

Use `--ask-become-pass` when the sudo policy requires a password and interactive execution is acceptable.

## 11. Retry Hosts Intentionally

When a host becomes unreachable, Ansible removes it from the active host list for the run. `ignore_unreachable` can allow later attempts, and `meta: clear_host_errors` can reactivate previously unreachable hosts:

```yaml
- name: Wait for newly created hosts
  ansible.builtin.wait_for_connection:
    timeout: 300

- name: Reactivate hosts after an external recovery step
  ansible.builtin.meta: clear_host_errors
```

These controls do not repair a broken connection. Use them for expected transitions, such as a reboot or newly provisioned instance, after the underlying readiness condition has been addressed.

## A Compact Triage Order

Work from controller outward:

1. Confirm inventory selection and effective variables.
2. Reproduce the exact address, user, port, and key with `ssh -vvv`.
3. Run one Ansible host with `-vvvv`.
4. Test `raw` to separate SSH from Python.
5. Verify agent, key access, host keys, and server logs.
6. Reproduce jump-host and proxy settings.
7. Check DNS, address family, routing, and port reachability.
8. Investigate multiplexing only if the simpler path works.
9. Test `become` separately after transport succeeds.

The decisive comparison is not “SSH versus Ansible.” It is your successful SSH invocation versus the exact SSH invocation Ansible constructs.

## Official Documentation

- [Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [How to build your inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [ansible.builtin.ssh connection plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)
- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [Error handling for unreachable hosts](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)

