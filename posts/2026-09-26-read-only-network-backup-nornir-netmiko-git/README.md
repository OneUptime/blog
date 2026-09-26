# How to Build a Read-Only Network Configuration Backup Pipeline with Nornir, Netmiko, and Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Nornir, Netmiko, Git, Backup

Description: Build a read-only network backup pipeline that validates collected configurations, preserves failed-device snapshots, and commits complete collections to Git.

A configuration backup job has two responsibilities: retrieve trustworthy configuration and preserve its history. Treating any successful SSH session as a successful backup can replace yesterday's recoverable configuration with an authorization error or a truncated page of output.

This example targets a small Cisco IOS or IOS XE fleet. Nornir schedules collection, Netmiko handles the CLI, and a single controller process writes and commits the results. Extend the command and validation rules explicitly for each additional platform.

## Establish the Read-Only Boundary

Use a dedicated device account with authorization to read the full running configuration. Test its effective permissions on your device release and AAA policy; a low privilege number alone does not establish a reliable read-only backup role. The account must not be able to enter configuration mode, erase files, reload, or change startup configuration.

The collector never calls `enable()`, `send_config_set()`, or a save command. Some drivers adjust terminal width or pagination for the session; those operational terminal settings are distinct from persistent device configuration. Confirm they are allowed by your authorization policy.

Keep device credentials outside the repository. Configuration output itself can contain secrets, so use a private backup repository with appropriate access and retention. Do not print configurations into public CI logs.

## Define a Small Inventory

Install the libraries in a virtual environment and record tested versions in your dependency lock file:

```bash
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install nornir nornir-netmiko
```

Create `inventory/hosts.yaml`:

```yaml
branch-r1:
  hostname: 192.0.2.21
  platform: cisco_ios
branch-r2:
  hostname: 192.0.2.22
  platform: cisco_ios
```

Create `inventory/groups.yaml` and `inventory/defaults.yaml`, each containing `{}`. Use this `config.yaml`:

```yaml
inventory:
  plugin: SimpleInventory
  options:
    host_file: inventory/hosts.yaml
    group_file: inventory/groups.yaml
    defaults_file: inventory/defaults.yaml
runner:
  plugin: threaded
  options:
    num_workers: 5
```

Start with modest concurrency and measure device and AAA load. Nornir supports this inventory and runner configuration through [`InitNornir`](https://nornir.readthedocs.io/en/latest/tutorial/initializing_nornir.html).

## Collect First, Publish Second

The script below assumes the process runs in a dedicated backup Git checkout. Inject `NETWORK_USERNAME` and `NETWORK_PASSWORD` through your scheduler's credential facility. Prepopulate the controller account's SSH known-hosts file using fingerprints verified through a trusted channel.

```python
# backup.py
import os
import re
from pathlib import Path

from nornir import InitNornir
from nornir.core.task import Result
from nornir.core.inventory import ConnectionOptions
from nornir_netmiko.tasks import netmiko_send_command


def collect(task):
    if task.host.platform != "cisco_ios":
        raise ValueError("Unsupported backup platform")
    response = task.run(
        task=netmiko_send_command,
        command_string="show running-config",
        read_timeout=120,
    )
    config = response.result
    errors = ("% Invalid input", "% Authorization failed", "--More--")
    if not isinstance(config, str) or any(x in config for x in errors):
        raise ValueError("Configuration output failed validation")
    if not re.search(r"(?m)^hostname\s+\S+", config):
        raise ValueError("Missing hostname in configuration")
    if not re.search(r"(?m)^end[ \t]*\Z", config.rstrip()):
        raise ValueError("Missing configuration terminator")
    return Result(host=task.host, result=config.rstrip() + "\n")


nr = InitNornir(config_file="config.yaml")
for host in nr.inventory.hosts.values():
    host.username = os.environ["NETWORK_USERNAME"]
    host.password = os.environ["NETWORK_PASSWORD"]
    host.connection_options["netmiko"] = ConnectionOptions(
        extras={"ssh_strict": True, "system_host_keys": True}
    )

try:
    results = nr.run(task=collect)
finally:
    nr.close_connections()

if not results or results.failed:
    failed = sorted(results.failed_hosts) if results else ["empty inventory"]
    raise SystemExit("Backup incomplete: " + ", ".join(failed))

output = Path("configs")
output.mkdir(exist_ok=True)
for name, result in results.items():
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        raise ValueError("Unsafe inventory name")
    destination = output / f"{name}.cfg"
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(result[0].result, encoding="utf-8")
    temporary.replace(destination)
```

The hostname and terminator checks are a starting contract for this IOS fleet, not a universal proof of completeness. Add fixture tests from your actual releases, including permission-denied and truncated responses. Restrict accepted hostnames further if inventory identity must match the configured hostname.

The [`nornir-netmiko` task implementation](https://github.com/ktbyers/nornir_netmiko/blob/develop/nornir_netmiko/tasks/netmiko_send_command.py) forwards command arguments to Netmiko. Nornir's [failure handling](https://nornir.readthedocs.io/en/latest/tutorial/failed_tasks.html) exposes failed hosts separately from successful results.

## Commit from One Writer

Run only one backup job against this checkout at a time. Git index operations belong to the coordinator, never to concurrent device workers. This shell wrapper stops on incomplete collection and commits only the configuration directory:

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
python3 backup.py
git add -- configs
if ! git diff --cached --quiet -- configs; then
  git commit -m "Capture validated network configuration backups" -- configs
fi
```

Initialize and secure the checkout before scheduling this wrapper. Git's [`diff --quiet`](https://git-scm.com/docs/git-diff) provides the exit status used for the no-change decision. Publish to a protected remote only after local success, and monitor push failures separately.

This design keeps the prior snapshot when collection fails and reports a failed job. A fleet with frequent outages may instead publish successful devices individually, but then every run needs a manifest of expected, successful, failed, and stale devices. Never make a partial collection look like a complete recovery point.

Finally, perform a restoration exercise in a lab. Git history proves that bytes were retained; only a recovery test establishes whether those bytes are sufficient to reconstruct the device.
