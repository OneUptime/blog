# How to Keep Network Device Passwords, Enable Secrets, and SSH Keys Out of Automation Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Ansible, Python, Security

Description: Prevent network credentials and sensitive configurations from leaking through task output, SSH transcripts, debug logging, exceptions, and CI artifacts.

Encrypting an inventory protects stored credentials, but a running automation job still has to use them. That creates several possible disclosure paths: module results, transport debug output, echoed commands, full configuration backups, exception messages, and CI artifacts.

Treat logging as an explicit output interface. Publish a small set of operational facts and keep sensitive command data out of the general log path from the beginning.

## Inventory the places data can escape

Follow one credential from retrieval to connection setup, privilege escalation, command execution, and cleanup. Then follow a device configuration through backups, diffs, and job artifacts.

The second path matters because sensitive configuration is not limited to the password used for SSH. A running configuration can contain local user hashes, SNMP communities, routing authentication keys, API tokens, and certificate material. Masking the login password alone does not make that output safe.

Separate three destinations: normal progress logs, restricted diagnostic evidence, and recoverable configuration backups. Give each its own access and retention policy. Ordinary users may need to know a job failed without needing its complete session transcript.

## Suppress sensitive Ansible task output

Use `no_log: true` on tasks that process or return secrets. Disable diff output for secret-bearing configuration tasks as an additional guard. The following example assumes the secret manager or encrypted inventory provides `vault_local_admin_hash` for the target's supported type-9 password format:

```yaml
- name: Configure the approved local recovery account
  cisco.ios.ios_config:
    lines:
      - "username recovery privilege 15 secret 9 {{ vault_local_admin_hash }}"
  no_log: true
  diff: false
  register: account_change

- name: Report a safe status
  ansible.builtin.debug:
    msg:
      operation: local_recovery_account
      changed: "{{ account_change.changed }}"
```

Cisco documents type `9` as an existing scrypt secret; confirm support on the target release rather than supplying plaintext after that selector. [Cisco username command reference](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-t2.html)

Use the second task only after the first succeeded. Do not add a later `debug: var=account_change`; registration does not make all its fields safe for display. Also keep secrets out of task names and loop labels.

Ansible documents that `no_log` protects sensitive task output but does not cover debugging output. Treat production debugging as a separate, restricted operation. [Ansible logging guidance](https://docs.ansible.com/projects/ansible/latest/reference_appendices/logging.html)

For production playbooks, use nonsecret change summaries instead of publishing configuration diffs. If reviewers need the full diff, render it in an access-controlled review system with appropriate retention.

## Check connection logging independently

The `network_cli` connection plugin has its own command-and-response logging setting. It is disabled by default, but inventory, environment variables, or configuration can enable it. An example baseline is:

```ini
[defaults]
display_args_to_stdout = false

[persistent_connection]
log_messages = false
```

Also inspect `ANSIBLE_PERSISTENT_LOG_MESSAGES` and `ansible_persistent_log_messages` in the actual runner configuration. Ansible's documentation explicitly warns that persistent connection logging can expose sensitive information. Do not assume a task-level setting governs every transport logger. [Network CLI connection reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html)

Check custom callback plugins and external logging integrations too. If a plugin receives a data structure containing secrets, it becomes part of the logging boundary and needs its own review.

## Keep Netmiko sessions quiet by default

Netmiko supports session logging, and `session_log_record_writes=False` does not mean a transcript is harmless. Reads can contain command echo and entire configurations. Leave `session_log` unset for ordinary jobs, and avoid library debug logging in a shared stream. [Netmiko connection API](https://ktbyers.github.io/netmiko/docs/netmiko/base_connection.html)

This example reads credentials injected into the runner process and reports only safe metadata. Environment injection is an example integration method; it is not protection from a compromised runner or process owner.

```python
import logging
import os
from netmiko import ConnectHandler

log = logging.getLogger("network.audit")


def read_version():
    try:
        with ConnectHandler(
            device_type="cisco_ios",
            host=os.environ["NETWORK_HOST"],
            username=os.environ["NETWORK_USER"],
            password=os.environ["NETWORK_PASSWORD"],
            secret=os.environ["NETWORK_ENABLE_SECRET"],
            ssh_strict=True,
            system_host_keys=True,
            session_log=None,
        ) as connection:
            connection.enable()
            output = connection.send_command("show version", read_timeout=30)
            if not output.strip():
                raise RuntimeError("Empty response")
    except Exception as exc:
        # Exception type only: messages and tracebacks may include raw data.
        log.error("operation=read_version outcome=failed error_type=%s",
                  type(exc).__name__)
        raise SystemExit(1) from None
    log.info("operation=read_version outcome=succeeded")
```

Provision trusted SSH host keys before this code runs. For key authentication, pass a protected key file or use a scoped agent; never print the private key to prove the job can read it. Avoid agent forwarding unless the workflow specifically requires it.

## Eliminate shell and artifact leaks

Disable shell tracing around secret retrieval and use the CI platform's supported secret injection mechanism. Avoid placing passwords directly in command-line arguments, where process inspection can reveal them. Do not dump the environment or connection dictionary during troubleshooting.

Keep private keys and temporary configuration files outside artifact globs. Create necessary temporary files with restrictive permissions, and remove them on both success and failure. Cleanup limits persistence; it cannot retract values already uploaded to a logging service.

Prefer short-lived credentials scoped to the required devices and operations. Rotation reduces the lifetime of an exposed value, while least privilege limits what it can do. Neither replaces keeping the value out of logs.

## Verify the boundary with sentinel secrets

Test the full runner using synthetic credentials that are safe to disclose and easy to recognize. Exercise success, authentication failure, enable failure, command rejection, timeout, parser failure, and cleanup failure. Search all produced logs and artifacts for the sentinels and for private-key delimiters.

Include values returned by the simulated device, not just the credentials supplied by the controller. A library may mask known passwords while leaving an unrelated secret from command output untouched.

When temporary diagnostics are necessary, collect the narrowest evidence, restrict who can access it, and expire it promptly. Preserve enough nonsecret metadata to diagnose the normal path—device ID, command category, latency, and error classification—so detailed transcripts remain an exception rather than the everyday debugging method.
