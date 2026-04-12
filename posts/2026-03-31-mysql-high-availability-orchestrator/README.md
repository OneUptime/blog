# How to Set Up MySQL High Availability with Orchestrator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Orchestrator, High Availability, Failover, Replication

Description: Deploy Orchestrator to automatically discover MySQL replication topology, detect primary failures, and perform automated failover with minimal downtime.

---

## What Is Orchestrator

Orchestrator is an open-source MySQL topology manager and visual dashboard. It continuously discovers your replication topology, tracks GTID positions, and can automatically promote a replica when the primary becomes unreachable. Unlike MHA, Orchestrator runs as a persistent daemon and supports complex multi-layer topologies.

## Installing Orchestrator

Download and install the binary on the Orchestrator server:

```bash
wget https://github.com/openark/orchestrator/releases/download/v3.2.6/orchestrator-3.2.6-linux-amd64.tar.gz
tar xzf orchestrator-3.2.6-linux-amd64.tar.gz
sudo mv orchestrator /usr/local/bin/
sudo mv orchestrator-cli /usr/local/bin/
```

## Configuration

Create `/etc/orchestrator/orchestrator.conf.json`:

```json
{
  "Debug": false,
  "MySQLTopologyUser": "orchestrator",
  "MySQLTopologyPassword": "orch_secret",
  "MySQLOrchestratorHost": "127.0.0.1",
  "MySQLOrchestratorPort": 3306,
  "MySQLOrchestratorDatabase": "orchestrator",
  "MySQLOrchestratorUser": "orchestrator",
  "MySQLOrchestratorPassword": "orch_secret",
  "RecoveryPeriodBlockSeconds": 60,
  "RecoverMasterClusterFilters": ["*"],
  "FailureDetectionPeriodBlockMinutes": 1,
  "DiscoveryByShowSlaveHosts": true,
  "DetachLostReplicasAfterMasterFailover": true
}
```

Create the Orchestrator MySQL user on all MySQL servers:

```sql
CREATE USER 'orchestrator'@'%' IDENTIFIED BY 'orch_secret';
GRANT SUPER, PROCESS, REPLICATION SLAVE, REPLICATION CLIENT, RELOAD ON *.* TO 'orchestrator'@'%';
GRANT SELECT ON mysql.slave_master_info TO 'orchestrator'@'%';
FLUSH PRIVILEGES;
```

## Discovering Your Topology

Start Orchestrator and seed it with your primary's address:

```bash
orchestrator --config=/etc/orchestrator/orchestrator.conf.json \
  --debug http &

orchestrator-cli -c discover -i primary.db.local:3306
```

Orchestrator walks the replica chain automatically from the seed host.

## Viewing Topology

Open the web UI at `http://<orchestrator-host>:3000/web/clusters` to see a visual map of your topology. From the CLI:

```bash
orchestrator-cli -c topology -i primary.db.local:3306
```

## Manual Failover

Trigger a graceful primary takeover (when the current primary is still alive):

```bash
orchestrator-cli -c graceful-master-takeover \
  -i primary.db.local:3306 \
  -d replica1.db.local:3306
```

For a hard failover when the primary is gone:

```bash
orchestrator-cli -c recover \
  -i primary.db.local:3306
```

## Automatic Failover Hooks

Orchestrator calls hook scripts at key points in the failover process. Register them in the configuration to move virtual IPs or update DNS:

```json
{
  "OnFailureDetectionProcesses": [
    "echo 'Failure detected for {failedHost}' >> /var/log/orchestrator/hooks.log"
  ],
  "PostMasterFailoverProcesses": [
    "/usr/local/bin/move-vip.sh {successorHost} {successorPort}"
  ]
}
```

## Summary

Orchestrator provides persistent MySQL topology discovery, a visual dashboard, and automated failover using GTID-based promotion. It is more operationally robust than MHA for complex topologies and supports multi-datacenter deployments. Deploy it with hook scripts to update virtual IPs or DNS records so applications reconnect to the new primary automatically after a failover event.
