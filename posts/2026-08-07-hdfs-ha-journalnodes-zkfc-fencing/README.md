# How JournalNodes, ZKFC, and Fencing Stop HDFS Split Brain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, High Availability, ZooKeeper, Split Brain

Description: Understand the separate roles of JournalNodes, ZKFC, ZooKeeper, and fencing in HDFS HA, then test failover without creating two effective active NameNodes.

---

HDFS High Availability is not made safe by simply running two NameNode processes. The hard problem is proving that a newly promoted NameNode has current namespace state and that the previous active can no longer act as an authority.

Quorum Journal Manager, ZooKeeper Failover Controllers, and fencing solve different parts of that proof. Treating any one of them as a substitute for the others creates a fragile design.

## The Failure HDFS Must Prevent

Assume `nn1` is active and `nn2` is standby. A network partition isolates `nn1` from the coordination network, but the JVM remains alive. From `nn2`'s side, this looks similar to a crashed server.

If `nn2` becomes active while `nn1` continues to accept work, the namespace can diverge or clients can observe stale state. This is split brain: two processes behave as though they have authority over one logical service.

A safe failover needs three properties:

1. the candidate has consumed committed edits;
2. only one NameNode can commit new edits; and
3. the old active cannot continue providing an unsafe service to clients.

## JournalNodes Establish Edit-Log Authority

With QJM, the active NameNode writes edit-log transactions to a quorum of JournalNodes. A typical deployment uses three JournalNodes; a majority of two is needed to continue. In general, an odd quorum of `N` tolerates at most `(N - 1) / 2` failures.

The shared-edits URI identifies the quorum and nameservice journal:

```xml
<property>
  <name>dfs.namenode.shared.edits.dir</name>
  <value>qjournal://jn1:8485;jn2:8485;jn3:8485/prod</value>
</property>
```

JournalNodes enforce a single writer. On failover, the new active takes over the writer role using a newer epoch, and the quorum prevents the former active from continuing to append edits. Before promotion, the standby ensures it has read the required journaled edits.

This is the metadata-safety core. ZooKeeper does not store the HDFS namespace or edit log, and ZKFC does not replicate it.

## DataNodes Keep the Standby's Block Map Warm

The persisted namespace maps files to blocks, but block-to-DataNode locations are rebuilt from DataNode reports. In HA, DataNodes know all NameNodes and send heartbeats and block information to each.

That matters because a standby with current edits but no current block map would still need a long inventory phase before serving effectively. Monitor DataNode communication to both NameNodes and alert on a standby whose block state drifts.

## ZooKeeper Provides Failure Coordination and Election

Automatic failover adds a ZooKeeper quorum. ZooKeeper holds a small amount of coordination state, including an ephemeral lock associated with the active election. It does not carry file metadata.

If the ZKFC session belonging to the active side expires, its ephemeral lock disappears. Another healthy contender can acquire the lock and begin coordinated failover. A ZooKeeper quorum is essential: without a majority, it should not make a new election decision.

Use independent failure domains and secure ZooKeeper authentication and ACLs. Anyone able to alter HA coordination state may be able to disrupt availability or provoke failover behavior.

## ZKFC Connects Health, Election, and Transition

Each NameNode host runs its own ZKFailoverController. It:

- periodically checks the health of its local NameNode;
- holds a ZooKeeper session while operating;
- holds the active election lock when its NameNode is active;
- competes for election when no healthy peer holds the lock; and
- coordinates fencing and local transition when it wins.

Enable automatic failover in `hdfs-site.xml`:

```xml
<property>
  <name>dfs.ha.automatic-failover.enabled</name>
  <value>true</value>
</property>
```

Identify the ZooKeeper quorum in `core-site.xml`:

```xml
<property>
  <name>ha.zookeeper.quorum</name>
  <value>zk1:2181,zk2:2181,zk3:2181</value>
</property>
```

Initialize the nameservice's ZooKeeper state once as part of deployment:

```bash
hdfs zkfc -formatZK
```

This is an initialization action, not a routine restart command. Use the non-interactive and force options only with a clear understanding of existing HA state.

Monitor ZKFC as its own daemon. If a standby-side ZKFC dies, that NameNode cannot participate in automatic failover until ZKFC is restored. If the active-side ZKFC dies long enough for its ZooKeeper session to expire, the election lock disappears and another ZKFC may initiate failover and fence the still-running active.

## Fencing Neutralizes the Old Active

Journal fencing prevents the old NameNode from committing edits, but the official QJM guide still recommends fencing. A stale active could continue serving outdated reads until it attempts a journal write and shuts itself down.

`dfs.ha.fencing.methods` defines ordered fencing mechanisms. Built-in choices include `sshfence`, shell, and PowerShell on Windows. A shell method can integrate infrastructure controls such as power management, firewall isolation, or storage revocation.

```xml
<property>
  <name>dfs.ha.fencing.methods</name>
  <value>sshfence
shell(/opt/hdfs/bin/fence-host.sh $target_host)</value>
</property>
<property>
  <name>dfs.ha.fencing.ssh.private-key-files</name>
  <value>/home/hdfs/.ssh/id_rsa</value>
</property>
```

`sshfence` requires passwordless SSH using the configured private key. The methods are tried in order until one returns success. A successful return must mean the target is truly neutralized. A script that exits zero after merely submitting an asynchronous power-off request is not a reliable fence.

Design fencing around failure independence:

- SSH is ineffective when the same network partition blocks SSH.
- A management-controller fence needs separate credentials and network reachability.
- A network fence must cover every client-facing interface.
- A process kill does not help if an external supervisor immediately restarts the old process into an unsafe configuration.

Test timeouts. The built-in shell fencer does not add its own timeout, so the script must bound every network call.

## Why Direct State Transitions Are Risky

These commands exist:

```bash
hdfs haadmin -transitionToStandby nn1
hdfs haadmin -transitionToActive nn2
```

They do not perform fencing. With automatic failover enabled, Hadoop rejects these direct transitions unless the dangerous `--forcemanual` override is supplied. The official guide says they should rarely be used. Prefer the coordinated operation:

```bash
hdfs haadmin -failover nn1 nn2
```

With automatic failover disabled, HAAdmin first tries a graceful demotion. If that fails, it runs configured fencing and promotes the target only after fencing succeeds. With automatic failover enabled, the same command asks the target ZKFC to coordinate a graceful failover. In either mode, use the coordinated operation rather than forcing direct state transitions.

## Failure Behavior by Component

| Failure | Expected safe behavior |
| --- | --- |
| One of three JournalNodes fails | Active can still commit to a majority; repair promptly |
| JournalNode majority is lost | New namespace edits must stop rather than split the journal |
| One ZooKeeper server fails | Election continues if ZooKeeper retains a majority |
| ZooKeeper majority is lost | Existing HDFS service can continue, but no automatic failover occurs |
| Active NameNode crashes | Its ZK session expires; healthy peer can win election and promote |
| Active is network-partitioned | Election plus fencing must neutralize stale service before promotion |
| Active-side ZKFC dies | After its ZooKeeper session expires, another ZKFC may initiate failover and fence the still-running active |
| Standby-side ZKFC dies | That NameNode cannot participate in automatic failover until its ZKFC is restored |
| Standby stops tailing edits | Do not promote it until health and synchronization are restored |

## Validate the Configuration Before a Crisis

Check states and health:

```bash
hdfs haadmin -getAllServiceState
hdfs haadmin -checkHealth nn1
hdfs haadmin -checkHealth nn2
```

As of Hadoop 3.5.0, the official guide notes that `-checkHealth` is not yet implemented beyond returning failure when the NameNode is completely down. Do not treat a zero exit code as a comprehensive health check.

Then perform controlled tests in a non-production environment and an approved production exercise:

1. Planned failover with both nodes reachable.
2. Active JVM termination.
3. Active host power loss.
4. Isolation of the active's client network while management fencing remains available.
5. Loss of one JournalNode.
6. Loss of ZooKeeper majority, verifying that existing HDFS runs but does not auto-promote.
7. Recovery of every component without accidentally creating two active states.

During each test, run a client through the logical nameservice URI, commit known data before failover, and verify it afterward. Record health-detection, session-expiry, fencing, promotion, and client-retry durations separately.

## Monitor the Safety Invariants

Alert on more than process uptime:

- exactly one NameNode is active;
- every standby is tailing edits within an acceptable lag;
- a majority of JournalNodes is healthy and durable storage has headroom;
- each NameNode receives DataNode block information;
- every ZKFC is running and connected;
- ZooKeeper has quorum and expected ACLs;
- the last fencing test succeeded within its timeout; and
- clients resolve the logical nameservice instead of pinning physical NameNodes.

An HA design is only as strong as the least-tested transition between components.

## Official Documentation

- [HDFS HA with the Quorum Journal Manager](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithQJM.html)
- [HDFS Commands Guide: `haadmin` and `zkfc`](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache ZooKeeper documentation](https://zookeeper.apache.org/doc/current/)

## Conclusion

JournalNodes make edit-log leadership exclusive, ZooKeeper makes election decisions through a quorum, ZKFC turns health and election into a transition, and fencing neutralizes stale service. None is redundant with the others. Configure, secure, monitor, and failure-test all four so an HDFS failover proves one authority rather than merely starting another process.
