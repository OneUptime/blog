# How to Run Network Automation Concurrently Without Overloading Devices or Hiding Partial Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Nornir, Ansible, Concurrency, Python

Description: Bound network automation concurrency across devices and sites while reporting every expected target, partial failure, and skipped host explicitly.

Parallel network automation can turn a thirty-minute collection into a short job. It can also exhaust an AAA service, open too many sessions through a jump host, or send a burst of expensive commands to a small branch network.

A safe concurrency design controls how much work starts and how results are accounted for. Fast execution is useful only when the job can still identify every target that failed, was skipped, or never ran.

## Budget More Than Worker Threads

Start with a modest global limit, then identify the shared bottlenecks:

- Device session limits and control-plane capacity.
- Authentication requests per second against TACACS+ or RADIUS.
- Jump-host connection capacity.
- Site WAN bandwidth and latency.
- Simultaneous changes within a redundancy or failure domain.

Eight workers means up to eight active tasks, not necessarily eight connections per second. Fast tasks can generate a much larger login rate. Persistent connections can also remain open after a worker finishes. Decide whether to reuse or close sessions deliberately.

For configuration changes, a redundancy pair may need a limit of one even when global capacity is much larger. For read-only collection, a larger batch may be acceptable after measuring the commands' actual cost.

## Configure a Bounded Nornir Runner

Nornir's [threaded runner](https://nornir.readthedocs.io/en/latest/api/nornir/plugins/runners/__init__.html) exposes `num_workers`. Its [execution model](https://nornir.readthedocs.io/en/latest/plugins/execution_model.html) keeps a host's subtasks within that host's task execution.

```yaml
# config.yaml
inventory:
  plugin: SimpleInventory
  options:
    host_file: inventory/hosts.yaml
    group_file: inventory/groups.yaml
    defaults_file: inventory/defaults.yaml
runner:
  plugin: threaded
  options:
    num_workers: 8
```

Use an inventory containing `site` data and a supported Netmiko platform for each host. Inject credentials through your established runtime configuration. The following example is restricted to `cisco_ios` devices and runs one site at a time:

```python
import json
from nornir import InitNornir
from nornir_netmiko.tasks import netmiko_send_command

nr = InitNornir(config_file="config.yaml")
expected = set(nr.inventory.hosts)
if not expected:
    raise SystemExit("No targets selected")
if any(h.platform != "cisco_ios" for h in nr.inventory.hosts.values()):
    raise SystemExit("This collector supports cisco_ios only")

sites = sorted({host["site"] for host in nr.inventory.hosts.values()})
report = {name: {"status": "not_run"} for name in expected}

try:
    for site in sites:
        scoped = nr.filter(site=site)
        try:
            results = scoped.run(
                task=netmiko_send_command,
                command_string="show version",
                read_timeout=45,
            )
            for name, result in results.items():
                if result.failed:
                    report[name] = {"status": "failed"}
                elif not isinstance(result[0].result, str) or not result[0].result.strip():
                    report[name] = {"status": "invalid_output"}
                else:
                    report[name] = {"status": "collected"}
        finally:
            scoped.close_connections()
finally:
    nr.close_connections()
    print(json.dumps(report, indent=2, sort_keys=True))

if any(item["status"] != "collected" for item in report.values()):
    raise SystemExit(1)
```

This is a simple conservative scheduling policy: at most eight host tasks within one site, then close that site's connections before continuing. It does not provide a requests-per-second limiter. Add a shared rate limiter around connection creation when the authentication service requires one.

The `collected` status means a nonempty response was received. Add platform-aware error and schema checks before promoting that response to a validated result. Avoid dumping raw exceptions or device output into a public report; keep detailed redacted diagnostics in a restricted artifact.

## Preserve the Expected Target Set

Initialize the report from the approved inventory, not from successful results. Otherwise, hosts that never execute disappear from the denominator and a partial job can look successful.

Nornir normally remembers failed hosts and excludes them from later tasks. Its [failure-handling documentation](https://nornir.readthedocs.io/en/latest/tutorial/failed_tasks.html) describes `failed_hosts`, `on_failed`, `on_good`, and explicit recovery. That behavior is useful for stopping subsequent mutations on a broken device, but it requires deliberate accounting in a multi-stage workflow.

Do not clear the failure set globally just to make every host appear in a later phase. A recovery step should verify which hosts are eligible, then reintroduce only those hosts. Keep the original failure and the recovery result in the audit trail.

## Apply Equivalent Controls in Ansible

For an Ansible change workflow, batch size and task concurrency are different controls:

```yaml
- name: Change approved branch switches in small batches
  hosts: branch_ios
  gather_facts: false
  serial: 4
  any_errors_fatal: true
  tasks:
    - name: Gather interface state before the change
      cisco.ios.ios_interfaces:
        state: gathered
      throttle: 2
```

`serial` limits the hosts progressing through a play batch. `throttle` limits a task's workers and is still constrained by other execution limits. Review the [Ansible strategy guide](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html) when combining those controls with forks or the free strategy.

A stop policy cannot undo tasks already in flight. For critical changes, begin with one canary, verify it, and only then admit a wider batch. Persist a clear distinction between failed targets and targets withheld because the failure budget was exceeded.

## Tune from Measurements

Measure total duration, connection latency, command latency, authentication errors, and device load at several small concurrency settings. Choose the lowest setting that meets the operational window with room for degraded conditions.

Test one offline device and one command rejection in each batch. Confirm the process exits unsuccessfully and the report still contains every approved target. The outcome should be an honest fleet result whose completeness is independent of how quickly its successful devices finished.
