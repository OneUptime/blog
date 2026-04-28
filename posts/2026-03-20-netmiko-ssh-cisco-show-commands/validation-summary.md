# Validation Summary: How to Use Netmiko to SSH into a Cisco Router and Run Show Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Netmiko (Python library for SSH to network devices)
- Python 3
- Cisco IOS (cisco_ios device type)
- SSH
- concurrent.futures.ThreadPoolExecutor (parallel execution)
- PyYAML (inventory file parsing)

## Sources Consulted
- Netmiko `__init__.py` on GitHub (https://github.com/ktbyers/netmiko/blob/develop/netmiko/__init__.py) — confirmed `__version__` export, `NetmikoTimeoutException` and `NetmikoAuthenticationException` are top-level exports.
- Netmiko `base_connection.py` on GitHub (https://github.com/ktbyers/netmiko/blob/develop/netmiko/base_connection.py) — verified `__enter__`/`__exit__` context manager support, and the meaning of `conn_timeout`, `timeout`, `auth_timeout`, `banner_timeout`, `read_timeout_override`.
- Netmiko documentation for `ConnectHandler`, `send_command`, `enable`, `check_enable_mode`.

## Issues Found
- The comment on the `timeout: 30` parameter in Step 5 said "Read timeout in seconds." This is misleading: in Netmiko, `timeout` is an overloaded SSH/TCP-connect/read-loop timeout (default 100s), not a dedicated read timeout. The actual per-command read timeout is exposed via the `read_timeout` argument on `send_command()` (or `read_timeout_override` at the connection level). Updated the comment to "SSH operation timeout in seconds" and clarified `conn_timeout` as "TCP connection timeout" to match Netmiko's own terminology.

## Review Notes
- All Netmiko APIs used in the post are current as of Netmiko 4.6.x: `ConnectHandler`, `send_command`, `enable`, `check_enable_mode`, context-manager support via `with`, and the `NetmikoTimeoutException` / `NetmikoAuthenticationException` exceptions.
- The `cisco_ios` `device_type` is valid and remains the standard choice for Cisco IOS routers/switches.
- `show running-config` in Step 3 is correctly placed after `conn.enable()`, since it requires privileged mode on Cisco IOS.
- Step 4's `ThreadPoolExecutor` usage is correct; readers should be aware that Netmiko is largely network-IO bound, so threading provides real parallelism for SSH sessions despite the GIL.
- Hardcoded credentials (e.g. `'password': 'mypassword'`) are used purely as illustrative placeholders. In production, readers should source credentials from environment variables, a secrets manager, or SSH keys — but this is a stylistic/security recommendation, not a technical inaccuracy.
- The inventory YAML example in Step 6 is shown as a comment block; it is structurally valid and would parse correctly with `yaml.safe_load`.
