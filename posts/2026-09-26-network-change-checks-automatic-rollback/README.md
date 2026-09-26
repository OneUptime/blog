# How to Add Pre-Checks, Post-Checks, and Automatic Rollback to a Network Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Python, Networking, Configuration Management

Description: Design a network change transaction with explicit health assertions, device-side rollback timers, bounded verification, and recovery checks.

A successful configuration command proves that a device accepted input. It does not prove that traffic still flows. A reliable change combines a known baseline, a bounded deployment, specific health checks, and a recovery mechanism that survives loss of the automation runner.

Where supported, a device-side confirmed commit is the strongest starting point: the device reverts unless the controller confirms the change before its deadline. A Python timer that later reconnects to undo the change cannot provide the same guarantee if the management path has disappeared.

## Establish capability and ownership first

Select the exact driver, network operating system release, and configuration operation you will support. NAPALM exposes `commit_config(revert_in=...)`, `confirm_commit()`, `has_pending_commit()`, and rollback methods, but drivers do not all implement identical features. Check its support matrix and rehearse your release in a lab. Never catch an unsupported timer error and retry with an ordinary permanent commit. [NAPALM configuration tutorial](https://napalm.readthedocs.io/en/latest/tutorials/changing_the_config.html), [supported devices](https://napalm.readthedocs.io/en/latest/support/index.html)

A transaction must also own the configuration being changed. Serialize changes per device, account for human operators, and reject an existing pending commit. A rollback that restores a previous configuration can undo someone else's intervening change.

## Turn pre-checks into explicit assertions

Pre-checks should establish whether the network can safely absorb the operation. For a redundant uplink change, useful assertions include an expected alternate path, stable routing adjacency, reachable management, and no ongoing failover.

Avoid checks that pass when parsing returns nothing. If two BGP peers are expected, require those exact peers and then check their states. Testing that all returned peers are up also passes for an empty collection.

Capture a timestamped baseline and a restricted full configuration backup. Compare the currently observed configuration with the state used to approve the change. If the baseline differs, stop and regenerate the plan. An approval of yesterday's diff should not authorize today's different operation.

## Use a device-side deadline

The example below illustrates transaction sequencing for an already connected and locked device whose driver supports timed commits. The callback must raise on failure and must impose its own short network timeouts. The caller provides secure backup storage and service-specific checks; these are application functions, not NAPALM APIs.

```python
import time


def guarded_change(device, candidate, verify, save_backup):
    if device.has_pending_commit():
        raise RuntimeError("Another confirmed commit is pending")
    verify("before")
    save_backup(device.get_config(retrieve="running")["running"])

    attempted_load = False
    attempted_commit = False
    try:
        attempted_load = True
        device.load_merge_candidate(config=candidate)
        if not device.compare_config().strip():
            device.discard_config()
            return "unchanged"

        # Start the local verification budget before the commit RPC.
        started = time.monotonic()
        attempted_commit = True
        device.commit_config(revert_in=300)
        if not device.has_pending_commit():
            raise RuntimeError("Expected a pending confirmed commit")

        verify("after")
        if time.monotonic() - started > 180:
            raise RuntimeError("Too little confirmation time remains")
        if not device.has_pending_commit():
            raise RuntimeError("Confirmed-commit state changed unexpectedly")
        device.confirm_commit()
        return "confirmed; final verification still required"
    except Exception as original_error:
        if not attempted_commit and attempted_load:
            try:
                device.discard_config()
            except Exception as cleanup_error:
                raise original_error from cleanup_error
        # After any commit attempt, let the device's timer protect recovery.
        # A separate reconciliation step must determine the actual outcome.
        raise
```

This is deliberately conservative about exceptions after a write attempt. A timed-out commit or confirmation request may have succeeded on the device. The caller must reconnect and inspect state; it must not assume that an exception means nothing changed or that rollback is certain.

The 180-second local budget leaves room within a 300-second timer. Choose actual values from measured apply, convergence, probe, and confirmation latencies. A hung callback still needs a timeout even though the device timer exists, otherwise the controller can occupy a lock indefinitely.

## Design post-checks for the change

Verification should test the intended effect and the invariants that must survive it. Changing an access port's VLAN calls for the expected VLAN membership, endpoint connectivity, and retained uplink health. A successful management ping alone is insufficient.

Give routing protocols a bounded convergence allowance. Poll until the required stable state appears or the verification deadline expires. Distinguish transient convergence from permanent failure, and require several consecutive healthy observations when a single good sample would be misleading.

Use an independent observation point for user traffic. A device can ping a destination from its management interface while the production forwarding path remains broken. Record probe source, destination, routing context, and timestamps alongside the result.

## Reconcile failure before reporting recovery

If verification fails and the session remains usable, a tested driver may support immediate rollback of a pending confirmed commit. Otherwise, allow the device timer to expire. In either case, read the resulting configuration and rerun the baseline checks after the appropriate recovery interval.

A disappeared pending-commit flag is not enough: it can mean confirmation, timeout rollback, or intervention. Compare the actual configuration and operational state. If confirmation timed out and the new configuration is still active, escalate the uncertain outcome instead of assuming an automatic revert happened.

Keep three separate outcomes: change succeeded, change reverted and baseline recovered, or recovery remains unverified. Preserve the original failure even when cleanup succeeds.

## Roll out across devices in small groups

A device transaction is not a network-wide transaction. NETCONF's confirmed-commit capability and configuration locks provide device-level mechanisms; they do not make an arbitrary multi-device workflow atomic. Plan ordering and compensating recovery for the topology. [NETCONF RFC 6241](https://datatracker.ietf.org/doc/html/rfc6241)

Start with a canary, verify it, then advance through a bounded batch. Do not change both members of a redundant pair concurrently. Stop the remaining rollout when any device needs reconciliation, and retain a tested out-of-band recovery path for failures that the configuration timer cannot fix.
