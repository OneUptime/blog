# SecondaryNameNode Is Not a Standby: Build Real HDFS HA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, NameNode, High Availability, SecondaryNameNode

Description: Learn why a SecondaryNameNode only creates checkpoints, how that differs from a hot standby, and what a production HDFS HA design actually requires.

---

The name “SecondaryNameNode” has caused years of architectural mistakes. It is not a second server waiting to accept HDFS client traffic. It is a checkpointing process that periodically combines the active NameNode's `fsimage` and edit-log transactions into a newer image.

That checkpoint is valuable for metadata recovery and restart time, but it does not remove the active NameNode as a single point of service failure. Real availability requires the HDFS High Availability architecture: redundant NameNodes, shared edits, synchronized block locations, client failover, and fencing.

## What the SecondaryNameNode Actually Does

The NameNode persists namespace state in two main forms:

- `fsimage`, a checkpointed image of the namespace; and
- edit logs, the transactions applied after that checkpoint.

On a busy cluster, edit logs grow continuously. Replaying a very large history lengthens NameNode startup. The SecondaryNameNode periodically downloads the image and edits, merges them, and makes the resulting checkpoint available to the NameNode.

The checkpoint triggers are controlled by settings including:

- `dfs.namenode.checkpoint.period`, a maximum interval between checkpoints; and
- `dfs.namenode.checkpoint.txns`, a transaction-count trigger.

You can inspect the configured checkpoint host and outstanding edit count:

```bash
hdfs getconf -secondaryNameNodes
hdfs secondarynamenode -geteditsize
```

The official users guide notes that checkpointing needs memory on the same order as the NameNode because the namespace must be materialized during the merge. Treat the host as a real metadata component, not a tiny housekeeping VM.

Checkpoint freshness and checkpoint durability are separate concerns. Monitor the age and transaction lag of the latest successful checkpoint, retain NameNode and SecondaryNameNode logs, and store metadata backups according to the cluster's recovery plan. A process that is running but repeatedly failing to upload checkpoints provides false confidence.

Do not place both metadata roles on one failure domain and call the result redundant. A shared host, power source, filesystem, or administrative mistake can remove both copies. Conversely, copying only an `fsimage` without its matching identity and edit history is not a tested recovery procedure. Practice restoration on isolated infrastructure, verify namespace identity and transaction continuity, and document the maximum metadata loss the backup process can tolerate.

## What It Does Not Do

A SecondaryNameNode does not normally:

- expose the active NameNode's client RPC service;
- hold the authoritative active state;
- receive every DataNode heartbeat and block report as a failover peer;
- participate in automatic active election;
- fence an unreachable NameNode;
- provide a logical nameservice URI for transparent client failover; or
- transition itself to active when the NameNode crashes.

Its checkpoint can be part of a manual recovery procedure. That procedure still requires operator action, correct metadata directories, validation, and service interruption. The latest checkpoint may also lag transactions that had not yet been incorporated. Recovery capability is not the same as service continuity.

## What a Standby NameNode Adds

In HDFS HA, NameNodes are members of one logical nameservice. One is active and serves namespace mutations; one or more are standby. The standby is kept ready in two ways.

First, it tails the same edit stream. With the Quorum Journal Manager, the active writes edits to a majority of JournalNodes. Before promotion, a standby ensures it has consumed the required edits.

Second, DataNodes are configured with all NameNodes and send block-location information and heartbeats to each. This keeps the standby's block map current enough for a fast transition.

The standby also performs namespace checkpoints. The official QJM guide explicitly states that a SecondaryNameNode, CheckpointNode, or BackupNode should not be run for an HA nameservice; doing so is an error. The HA standby assumes the checkpointing role.

## The Minimum HA Data Path

A typical QJM configuration includes:

1. Two or more equivalent NameNode hosts for the nameservice.
2. An odd JournalNode quorum, commonly three, on independent failure domains.
3. A logical nameservice ID and distinct NameNode IDs.
4. RPC and HTTP addresses for each NameNode.
5. `dfs.namenode.shared.edits.dir` pointing to the JournalNode quorum.
6. A client failover proxy provider for the logical nameservice.
7. Fencing methods that make stale service impossible or harmless.
8. ZooKeeper and a ZKFC beside each NameNode when automatic failover is required.

A shortened shape looks like this:

```xml
<property>
  <name>dfs.nameservices</name>
  <value>prod</value>
</property>
<property>
  <name>dfs.ha.namenodes.prod</name>
  <value>nn1,nn2</value>
</property>
<property>
  <name>dfs.namenode.shared.edits.dir</name>
  <value>qjournal://jn1:8485;jn2:8485;jn3:8485/prod</value>
</property>
<property>
  <name>dfs.client.failover.proxy.provider.prod</name>
  <value>org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider</value>
</property>
```

This is illustrative, not a complete deployment. Address, fencing, security, local metadata, and automatic-failover settings are also required.

## Manual and Automatic Failover Are Different

HA can be configured with coordinated manual failover:

```bash
hdfs haadmin -getAllServiceState
hdfs haadmin -failover nn1 nn2
```

The `failover` operation tries to move the old active to standby, fences it if required, and only then promotes the target. Avoid routine use of `transitionToActive`: the official guide warns that direct transition commands do not perform fencing.

Automatic failover adds a ZooKeeper quorum and a ZKFailoverController on every NameNode host. ZKFC checks local NameNode health, maintains an ephemeral ZooKeeper session, participates in active election, and coordinates fencing and promotion.

HA without automatic failover removes the metadata-state gap but still leaves detection and operator response in the recovery-time objective. Decide explicitly which mode the service objective requires.

## Fencing Is Part of Correctness

Network partitions are harder than process crashes. An old active may be alive but unreachable from the failover controller. Promoting another NameNode without neutralizing the old one creates split-brain risk.

QJM permits only one writer to the JournalNodes, protecting edit-log correctness. The official guide still recommends fencing because a stale active might continue serving outdated reads until a write exposes that it lost journal authority.

Fencing can kill the old process, revoke its network or storage access, or use an infrastructure-specific mechanism. A useful fencer must be tested against the failures it claims to handle. An SSH fencer cannot protect a partition in which the fencing host also cannot reach the target.

## Migrating from a Single NameNode

Treat conversion as a controlled metadata change:

1. Verify recent, usable NameNode metadata backups and checkpoints.
2. Size the new NameNode equivalently and provision independent JournalNodes.
3. Define the logical nameservice and deploy identical resolved configuration to clients and daemons.
4. Initialize shared edits for the existing namespace as documented.
5. Bootstrap the unformatted standby with `hdfs namenode -bootstrapStandby`.
6. Configure and test fencing before enabling automatic promotion.
7. If using automatic failover, configure ZooKeeper, secure its ACLs, and initialize the HA znode once.
8. Verify both NameNode states, edit tailing, DataNode reporting, and logical-URI client access.
9. Perform planned and failure-mode tests during an approved window.
10. Retire the SecondaryNameNode only after the standby is checkpointing successfully.

Never independently format the standby for an existing nameservice. Formatting creates identity and metadata consequences; use the documented bootstrap flow.

## Test Availability, Not Just Daemons

A green process check is not an HA test. Validate:

- `hdfs haadmin -getAllServiceState` shows exactly one active;
- clients use `hdfs://prod`, not a physical NameNode URI;
- a write committed before failover remains visible afterward;
- applications retry through the failover proxy;
- the standby is applying edits and receiving block information;
- loss of one JournalNode still leaves a majority;
- loss of a JournalNode majority prevents unsafe edit commits;
- ZKFC and ZooKeeper failures alert independently; and
- fencing succeeds for a process hang and a realistic network partition.

Measure detection, fencing, promotion, and client-recovery times separately. That makes the actual recovery-time objective visible.

## Official Documentation

- [HDFS Users Guide: Secondary NameNode](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html#Secondary_NameNode)
- [HDFS HA with the Quorum Journal Manager](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithQJM.html)
- [HDFS Commands Guide: SecondaryNameNode and HA commands](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [HDFS Architecture: persistence of metadata](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html#The_Persistence_of_File_System_Metadata)

## Conclusion

The SecondaryNameNode limits edit-log growth by creating checkpoints; it is not a traffic-serving failover peer. Build HDFS availability around synchronized NameNodes, a JournalNode quorum, logical client failover, and effective fencing. Once those components are tested together, the standby supplies continuity while also taking over the checkpointing work the SecondaryNameNode used to perform.
