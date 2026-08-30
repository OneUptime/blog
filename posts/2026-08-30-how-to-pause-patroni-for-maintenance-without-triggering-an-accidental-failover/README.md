# How to Pause Patroni for Maintenance Without Triggering an Accidental Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Maintenance, High Availability, Failover, Database Cluster

Description: Put a Patroni cluster into maintenance mode, verify every member has observed the pause, perform controlled work, and resume safely.

---

Patroni pause mode disables automatic failover and largely detaches Patroni from changing PostgreSQL state while retaining cluster information in the distributed configuration store. Use it for unusual work—major-version upgrades, corruption recovery, or maintenance that intentionally starts and stops PostgreSQL outside Patroni's normal assumptions.

Pause is a cluster-wide dynamic state, not a local daemon switch. The safe entry command is:

```bash
patronictl -c /etc/patroni/patroni.yml pause prod-ha --wait
```

`--wait` matters: the command does not return successfully until all Patroni members known to the cluster have recognized the paused state. An unreachable member therefore prevents successful completion; without that confirmation, maintenance can begin while one member still follows normal HA behavior.

## Decide whether pause is actually needed

For routine rolling restarts, parameter changes, and healthy primary movement, prefer Patroni's native `restart`, `reload`, and `switchover` operations. They preserve the HA state machine and candidate checks.

Pause is appropriate when the procedure intentionally violates normal assumptions, such as manually starting a database, keeping a stopped primary stopped, or temporarily creating a topology Patroni would otherwise correct. It is not a generic "make maintenance safe" button.

Choose the availability plan before pausing:

- If applications must remain writable while maintaining the current primary host, first perform a healthy Patroni switchover to another eligible replica and verify traffic.
- If the cluster will be unavailable, drain clients and publish a maintenance window before pausing.
- If more than one PostgreSQL primary may exist during the work, establish fencing and an isolated client network. Paused Patroni warns about parallel primaries but deliberately does not demote the primary without the leader lock.

## Run preflight checks

Capture state before changing it:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

Confirm:

- exactly one current leader and one writable PostgreSQL node;
- all expected replicas are present, with understood receive/replay lag;
- DCS quorum and Patroni REST connectivity are healthy;
- backups and the rollback procedure are current;
- no scheduled restart or switchover will collide with the window; and
- HAProxy or another router can be drained independently.

If the work is local to a replica and Patroni's supported commands can perform it, exclude that node from read routing and promotion rather than pausing the whole cluster.

## Enter and verify maintenance mode

Pause and wait:

```bash
patronictl -c /etc/patroni/patroni.yml pause prod-ha --wait
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

The dynamic configuration should show `pause: true`, and member state should indicate the pause has been observed. Keep the command output with the maintenance record.

Patroni's documented paused behavior is deliberately limited rather than completely inert:

- Members continue updating their DCS member keys with current information.
- The primary holding the leader lock continues updating it.
- If that node is manually demoted, Patroni releases the lock rather than promoting it back.
- If no leader lock exists, a running primary can acquire it; replicas are not automatically promoted when no primary exists.
- Patroni does not start a stopped PostgreSQL instance, and stopping Patroni does not stop its PostgreSQL instance.
- Manual unscheduled restart, reinitialize, and failover/switchover operations remain possible, with documented restrictions.
- Scheduled actions are not performed.

Therefore, pause prevents ordinary automatic failover but does not protect against an administrator manually issuing a failover or starting a second writer. Limit REST and `patronictl` access throughout the window.

## Perform maintenance with explicit ownership

Record who controls each PostgreSQL process. If the maintenance tool starts or stops PostgreSQL directly, do not simultaneously ask Patroni to operate on that member.

For a controlled outage:

1. Stop new application traffic at the proxy or pooler.
2. Drain or terminate remaining sessions according to the published deadline.
3. Pause with `--wait` and verify every member.
4. Execute the documented database procedure, preserving data directories and configuration ownership.
5. Start PostgreSQL only where the procedure requires it.
6. Verify roles directly with `pg_is_in_recovery()` before exposing any route.

During a long window, continue monitoring the DCS and Patroni. A pause flag stored in a lost or restored DCS must not be assumed from an old terminal. Recheck live state before every phase transition.

## Prove one writer before resuming

On every reachable database member, run through a direct administrative connection:

```sql
SELECT inet_server_addr(),
       pg_is_in_recovery(),
       current_setting('transaction_read_only');
```

There must be exactly one intended writable primary. Confirm every replica follows that primary on the correct timeline and replication is progressing. Check `patronictl list`, PostgreSQL logs, Patroni logs, and proxy backend state.

If maintenance created parallel primaries, do not simply resume and hope Patroni repairs them. Fence client access, choose the authoritative timeline, preserve any divergent data needed for reconciliation, and rebuild or rewind the other node according to a reviewed recovery plan.

## Resume and watch the first HA loops

Take the cluster out of maintenance mode and wait for acknowledgement:

```bash
patronictl -c /etc/patroni/patroni.yml resume prod-ha --wait
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

The configuration should no longer show an active pause. Watch several Patroni HA loop iterations. Confirm the leader lock remains stable, replicas keep streaming, no unexpected restart or reinitialize starts, and the proxy sees exactly one write backend.

Restore traffic gradually and run a read/write smoke test through the public endpoint. Do not leave the cluster paused after the ticket closes; paused automatic failover is an availability risk that should alert continuously.

## Handle a member that cannot acknowledge pause

If `pause --wait` cannot complete, do not proceed as though the unreachable node were paused. Determine whether it is down, partitioned, or merely missing REST access. Fence its PostgreSQL and client paths if the maintenance could create a second writer. Only then either restore it so it observes the cluster flag or continue under an explicitly approved degraded procedure.

Similarly, resume is incomplete until every expected member has observed the change. A member returning later will read dynamic state from the DCS, but it should not surprise an unmonitored production cluster.

## Official Documentation

- [Patroni pause/resume mode](https://patroni.readthedocs.io/en/latest/pause.html)
- [Patroni `pause` and `resume` commands](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni installation and upgrade guidance](https://patroni.readthedocs.io/en/latest/installation.html)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)

## Conclusion

Pause Patroni only for maintenance that must step outside its normal HA state machine. Use `pause --wait`, verify every member, fence any unreachable or manually promoted node, and prove exactly one writer before `resume --wait`. Pause disables automatic recovery by design, so treat the whole interval as a controlled operational exception with active monitoring and clear ownership.
