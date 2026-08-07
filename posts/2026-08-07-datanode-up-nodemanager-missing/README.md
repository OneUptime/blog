# DataNode Up, NodeManager Missing: HDFS and YARN Membership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, YARN, NodeManager, Troubleshooting

Description: Diagnose a worker visible to HDFS but missing from YARN by tracing independent daemons, control planes, host admission, health, identity, and registration.

---

A worker can be a healthy HDFS DataNode and have no usable YARN NodeManager. The two daemons register with different control planes, use different configuration, report different resources and health, and have independent admission rules. HDFS membership is not evidence that YARN registration succeeded.

Avoid restarting every Hadoop service or editing a shared `workers` file first. Define exactly what “missing” means in the ResourceManager, then trace the NodeManager from process startup through registration and health reporting.

## Two Daemons, Two Membership Protocols

On a typical worker:

```text
DataNode ---- heartbeats and block reports ----> NameNode
NodeManager ---- registration and heartbeats --> ResourceManager
```

The DataNode stores HDFS replicas and reports block-pool state. The NodeManager launches YARN containers, advertises memory and vCores, checks its local and log directories, and reports health. Either service can be stopped, misconfigured, rejected, or network-isolated while the other continues normally.

Even their identities differ. A DataNode has an HDFS identity associated with its storage state and transfer address. YARN identifies a NodeManager with a `NodeId`, normally a host and NodeManager port. Do not join the two inventories by an assumed short hostname without checking canonical names, addresses, and ports.

## Confirm the Symptom in Both Control Planes

Capture HDFS membership:

```bash
hdfs dfsadmin -report -live
hdfs dfsadmin -report -dead
```

Then list all YARN node states, not only running nodes:

```bash
yarn node -list -all
```

The official command guide says `yarn node -list` lists running nodes; `-all` includes other states. A node shown as `UNHEALTHY`, `DECOMMISSIONED`, `LOST`, or another non-running state is not truly missing. Its state narrows the investigation.

Use the exact NodeId returned by the list command:

```bash
yarn node -status worker17.example.com:45454
```

Do not guess the port. The reference default for `yarn.nodemanager.address` uses port `0`, allowing an available port to be selected. Deployments often set a fixed port, but the ResourceManager's NodeId is authoritative.

Record the ResourceManager UI, cluster ID, active RM in an HA deployment, command configuration, and timestamp. A client pointed at the wrong YARN cluster can report a “missing” NodeManager even while the correct ResourceManager sees it.

## Verify That the NodeManager Is Actually Running

On the worker, inspect the service manager and Java process using your deployment's unit name:

```bash
systemctl status hadoop-yarn-nodemanager
jps -l
```

Package names vary, and `jps` shows only JVMs visible to the invoking user. Confirm the PID, start time, service account, exit status, restart loop, and current logs. A healthy DataNode proves only that a different Java process is alive.

If the NodeManager exits during startup, find its first fatal error. Common categories include:

- invalid or unreadable configuration;
- local or log directory permissions;
- keytab, principal, or credential failures in secure mode;
- container-executor ownership or permission errors;
- cgroup setup failures;
- advertised memory or vCores below scheduler minimums;
- port conflicts; and
- an unrecoverable state-store or auxiliary-service problem.

Do not repeatedly restart before retaining the original startup log; rapid restarts can rotate away the most useful exception.

## Confirm the NodeManager Loaded the Intended YARN Configuration

Hadoop daemons can start from different installations, symlinks, environment files, containers, or configuration directories. Compare the running NodeManager with a known-good peer:

```bash
yarn envvars
ps -fp "$(pgrep -f 'NodeManager' | head -1)"
```

Inspect the service unit and environment for `HADOOP_CONF_DIR`, `YARN_CONF_DIR`, Java home, distribution version, and command-line overrides without printing secrets. Compare checksums of non-secret `core-site.xml` and `yarn-site.xml` through your configuration-management tooling.

At minimum, verify:

- ResourceManager hostname and `yarn.resourcemanager.resource-tracker.address`;
- all RM IDs and addresses in an HA deployment;
- `yarn.nodemanager.hostname`, address, bind host, and web address;
- `yarn.nodemanager.local-dirs` and `yarn.nodemanager.log-dirs`;
- advertised memory and vCores; and
- security, container-executor, cgroup, and auxiliary-service settings.

A DataNode may have correct `core-site.xml` and `hdfs-site.xml` while the NodeManager has stale `yarn-site.xml`. “Same Hadoop host” does not guarantee “same configuration source.”

## Trace Registration to the ResourceManager

The NodeManager registers and heartbeats to the ResourceManager's resource-tracker service. From the worker, resolve the configured RM host and test the configured network path using approved tools. Check both forward and reverse DNS if Kerberos or hostname validation depends on canonical names.

Look in the NodeManager log for a sequence like:

1. configuration and local services initialized;
2. ResourceManager address resolved;
3. authentication completed;
4. registration request sent;
5. RM response accepted; and
6. regular heartbeats started.

Then correlate the same timestamp in the ResourceManager log. A timeout points toward routing, firewall, DNS, or an unavailable RM address. An authentication error points toward principals, keytabs, clocks, tokens, or service names. An explicit rejection usually identifies an admission or resource-capability rule.

In ResourceManager HA, check the state through the supported admin command:

```bash
yarn rmadmin -getAllServiceState
```

Do not force an HA transition merely to recover one worker. Fix the NodeManager's HA address set or connectivity to the active service.

## Check YARN's Own Include and Exclude Files

YARN host admission is independent of HDFS decommission state. The current reference properties are:

```xml
<property>
  <name>yarn.resourcemanager.nodes.include-path</name>
  <value>/etc/hadoop/conf/yarn.include</value>
</property>
<property>
  <name>yarn.resourcemanager.nodes.exclude-path</name>
  <value>/etc/hadoop/conf/yarn.exclude</value>
</property>
```

Inspect the effective files on the ResourceManager. Check short names versus fully qualified names, whitespace, old IP addresses, case, and configuration-management drift. If an include path is in use, a newly built host must be present. If the host remains in the exclude file, YARN can decommission it even while HDFS accepts the DataNode.

After a reviewed file change, reload ResourceManager host information:

```bash
yarn rmadmin -refreshNodes
```

The command also supports graceful decommissioning options; use those for intentional removal rather than treating refresh as an indiscriminate repair command.

The top-level Hadoop `workers` file is different. The official cluster setup guide explains that it is used by helper scripts to run commands on multiple hosts. It is not a Java configuration file and does not define live HDFS or YARN membership. Adding a hostname there may cause a future start script to launch a NodeManager, but it cannot make a failed registration healthy.

## Distinguish Missing from Unhealthy

The NodeManager health service checks directories configured by:

```text
yarn.nodemanager.local-dirs
yarn.nodemanager.log-dirs
```

The official NodeManager guide says checks include permissions, free space, and read-only filesystem state. A failed disk can be removed from use while the node remains healthy; when too many configured disks fail, the NodeManager reports the node unhealthy and the ResourceManager stops assigning new containers.

Inspect every configured directory and its underlying mount:

```bash
findmnt
df -h /data/yarn/local /data/yarn/log
df -i /data/yarn/local /data/yarn/log
namei -l /data/yarn/local
```

Check NodeManager health details with `yarn node -status` and its web interface. The current reference defaults run the disk check every two minutes, require at least 25% of local and log disks to remain healthy, and mark a disk bad at 90% utilization. Local overrides may differ.

An external health script can also mark the node unhealthy. The NodeManager documentation notes a non-obvious rule: script output beginning with `ERROR` marks failure, while a nonzero exit code alone is not considered failure. Inspect the configured script, its output, execution permissions, and timeout.

Health failure explains a node that is present but unschedulable. A node absent from `-list -all` generally failed before registration, contacted a different RM, was removed from retained state, or is being queried through the wrong client configuration.

## Check Resource Capability Rejection

Compare these NodeManager settings with scheduler limits:

```text
yarn.nodemanager.resource.memory-mb
yarn.nodemanager.resource.cpu-vcores
yarn.scheduler.minimum-allocation-mb
yarn.scheduler.minimum-allocation-vcores
```

The current YARN reference states that the ResourceManager shuts down a NodeManager configured with less memory or fewer vCores than the scheduler minimum. This often appears after an administrator raises the global minimum without updating a smaller worker class.

Also inspect malformed custom resources, node resource profiles, and incompatible version/config changes. The ResourceManager log should record why registration was rejected. Do not inflate the worker's advertised capability beyond safe physical headroom merely to pass the minimum; either correct the scheduler boundary or remove that hardware class intentionally.

## Resolve Hostname and Interface Mismatches

Multi-homed hosts frequently register the two daemons under different names. Compare:

- the DataNode name shown by `dfsadmin -report`;
- the NodeManager hostname and NodeId in logs;
- `hostname -f` and forward/reverse DNS;
- bind addresses versus advertised addresses;
- `/etc/hosts`, search domains, and IPv4/IPv6 selection; and
- certificates or Kerberos principals tied to `_HOST`.

Binding to `0.0.0.0` controls listening and is not a useful advertised identity. The current YARN configuration has a separate optional `yarn.nodemanager.bind-host` for binding RPC and web servers while their public addresses remain based on the configured hostname and ports.

Use a canonical, resolvable name consistently. Before changing identity, consider recovery state, running containers, log aggregation, monitoring labels, firewall rules, and duplicate old NodeIds at the ResourceManager.

## A Fast Diagnostic Decision Tree

Use this sequence:

1. `hdfs dfsadmin -report -live` proves only the DataNode's HDFS membership.
2. `yarn node -list -all` determines whether the NodeManager is running, unhealthy, lost, or truly absent.
3. If present, inspect exact `yarn node -status <NodeId>` health and resource data.
4. If absent, verify the NodeManager process and preserve its earliest startup error.
5. Compare its actual configuration source and RM resource-tracker addresses with a good peer.
6. Correlate NodeManager and ResourceManager registration logs.
7. Check YARN include/exclude state, then use `refreshNodes` only after a reviewed correction.
8. Check local/log directory health, security, hostname identity, and advertised resources.
9. Restart or re-register through the deployment's normal procedure and verify the new NodeId.

Finally, run a small canary application and confirm the ResourceManager assigns a container to the recovered node. Registration alone does not prove localization, container launch, local disk, cgroups, and log handling all work.

## Official Documentation

- [YARN Architecture](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YARN.html)
- [YARN NodeManager](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [HDFS Architecture](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Hadoop Cluster Setup](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/ClusterSetup.html)

## Conclusion

A live DataNode and a missing NodeManager are consistent because HDFS and YARN maintain separate membership. Ask the ResourceManager for every node state, verify the NodeManager process and configuration source, trace registration to the correct RM, and check YARN-specific admission, health, identity, and resource rules. Once it registers, prove container launch with a canary rather than assuming HDFS health covers the compute plane.
