# How to Retry Network Configuration Safely for Frequently Offline Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Retry, Netmiko, Idempotency, Configuration Management

Description: Retry network changes safely by distinguishing unreachable devices from unknown write outcomes, reconciling fresh state, and bounding retries to approved intent.

An offline device is usually a scheduling problem. A connection that drops halfway through a configuration push is a state-reconciliation problem. Retrying both cases with the same command list can turn a temporary outage into a repeated or partially applied change.

Build retries around desired state and evidence. Before another mutation, determine whether the earlier attempt changed the device, whether the intended change is still approved, and whether the remaining work can be applied safely.

## Classify the Point of Failure

| Outcome | What is known | Next action |
|---|---|---|
| Connection fails before any mutation | This attempt sent no configuration | Retry connection within a bounded policy |
| Authentication or authorization fails | Access is not valid | Stop and correct access |
| Device rejects a command | Earlier commands may already have applied | Inspect state and correct the plan |
| Transport drops during a push | The write outcome is unknown | Reconnect read-only and reconcile |
| Push returns, post-check fails | Command delivery did not establish success | Investigate state or execute a tested recovery |

A timeout does not mean nothing happened. The device may have accepted the command before the response was lost. This is especially important for a sequence of CLI commands, which is not automatically an atomic transaction.

Netmiko's [`send_config_set` implementation](https://github.com/ktbyers/netmiko/blob/develop/netmiko/base_connection.py) processes configuration commands and can detect configured error patterns. That mechanism does not provide a general rollback transaction for every platform.

## Retry Connection Establishment Separately

A connection-only helper can use bounded backoff without replaying a write. This example assumes credentials and host-key verification are already present in the `device` dictionary:

```python
import random
import time
from netmiko import ConnectHandler
from netmiko.exceptions import NetmikoAuthenticationException, NetmikoTimeoutException


def connect_with_backoff(device, attempts=4):
    if attempts < 1:
        raise ValueError("attempts must be positive")
    for attempt in range(attempts):
        try:
            return ConnectHandler(**device)
        except NetmikoAuthenticationException:
            raise
        except NetmikoTimeoutException:
            if attempt == attempts - 1:
                raise
            delay = random.uniform(0, min(30, 2 ** attempt))
            time.sleep(delay)
```

This helper handles connection construction, which also runs platform-specific session preparation. Verify that the selected driver and options do not make persistent configuration changes during setup before treating these retries as mutation-free; keep `allow_auto_change` disabled. Do not wrap configuration submission in the same function. Review the actual error before treating every timeout as transient: a wrong port, stale address, or broken inventory will not improve with repeated attempts. Set connection and authentication timeouts so each attempt has a finite duration.

Netmiko's [exception definitions](https://ktbyers.github.io/netmiko/docs/netmiko/exceptions.html) distinguish authentication, connection, and read-related errors. Preserve the phase of execution in your job record rather than classifying only by exception text.

## Store an Immutable Change Request

A retry should refer to a specific approved revision, not “whatever is in Git now.” Record at least:

```json
{
  "change_id": "branch-ntp-2026-09-26",
  "device_id": "netbox:421",
  "intent_revision": "approved-content-digest",
  "status": "pending",
  "attempt": 0,
  "expires_at": "2026-09-26T23:00:00Z"
}
```

The digest and expiry are application-defined fields. Add the target address, device identity evidence, approval reference, expected preconditions, and maintenance window in a real system.

Write status transitions durably before mutation. If the worker crashes after recording `sending` but before recording success, resume in an unknown-outcome state. Treat that record as a request to observe the device, not permission to resend automatically.

Use a per-device lock across workers and jobs. An in-process mutex is insufficient when multiple controllers can operate on the same switch. Another job changing the baseline between read and write invalidates a plan derived from the earlier state.

## Reconcile from Fresh Observations

The following sequence is an architectural contract rather than a universal device API:

```text
acquire device lock
load approved intent and confirm it has not expired
connect and verify device identity
read current managed configuration
compare current state with approved intent
if already satisfied:
    verify operational postconditions
    record verified success
else:
    verify preconditions still permit the change
    build a new minimal plan from current state
    record sending status durably
    apply the plan once
    read configuration again and verify operational postconditions
    record verified success or unknown/failed outcome
release device lock
```

If the fresh state differs from both the old baseline and the desired result, investigate the intermediate state. It may reflect partial application, a human change, or another automation job. Do not overwrite it merely because a retry counter has not expired.

Idempotent desired-state operations make this process easier, but they do not remove the need to observe. Repeating “ensure this NTP server exists” is different from repeating a reload, an interface counter clear, or a file deletion.

## Use Native Transactions Where Supported

Some platforms and libraries support candidate configuration, commit confirmation, or rollback. NAPALM's [configuration tutorial](https://napalm.readthedocs.io/en/latest/tutorials/changing_the_config.html) describes candidate comparison, commit, rollback, and timed revert workflows; support varies by driver and platform.

Confirm those capabilities in the lab before relying on them. A confirmation deadline must leave enough time for reconnection and independent health checks. Confirm a pending commit only after verifying both configuration and the network behavior it was meant to preserve.

For a device without transactional support, divide a change into smaller independently verifiable operations and maintain a tested recovery plan. Avoid making a broad destructive replacement the fallback for an uncertain partial write.

## Schedule Long Outages Without Retry Storms

A remote site that is offline for hours should not occupy a worker sleeping indefinitely. Persist the next eligible attempt time, release the worker, and let a scheduler retry later with jitter. Enforce limits per device, per site, and across the fleet.

Expire changes when their maintenance window closes. When a device finally returns, revalidate approval and preconditions before touching it. Report overdue devices as unresolved rather than silently declaring fleet success.

Test failures before connection, after the first command, before post-check, and after a successful write but before the job records success. The last scenario is particularly valuable: a correct retry should recognize the desired state and finish verification without replaying the change.
