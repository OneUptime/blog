# How to Monitor and Troubleshoot a Pacemaker Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Troubleshooting, Monitoring, Cluster, High Availability, Linux

Description: Learn how to monitor Pacemaker cluster health and troubleshoot common issues on RHEL.

---

Monitoring and troubleshooting a Pacemaker cluster on RHEL requires understanding cluster status, resource states, logs, and common failure modes. This guide covers the essential tools and techniques.

## Prerequisites

- A running RHEL Pacemaker cluster
- Root or sudo access

## Checking Cluster Status

The primary status command:

```bash
sudo pcs status
```

This shows:

- Node list (online/offline/standby)
- Resource status (started/stopped/failed)
- Fencing status
- Failed actions

Compact view:

```bash
sudo pcs status --brief
```

## Monitoring Node Health

Check node status:

```bash
sudo pcs status nodes
```

Check Corosync connectivity:

```bash
sudo pcs status corosync
```

View detailed node information:

```bash
sudo corosync-cfgtool -s
```

## Monitoring Resource Status

View all resources:

```bash
sudo pcs resource status
```

View detailed resource configuration:

```bash
sudo pcs resource config
```

Check resource failure counts:

```bash
sudo pcs resource failcount show
```

## Viewing Cluster Logs

Pacemaker logs:

```bash
sudo journalctl -u pacemaker --no-pager -n 100
```

Corosync logs:

```bash
sudo journalctl -u corosync --no-pager -n 100
```

Combined cluster log:

```bash
sudo tail -f /var/log/cluster/corosync.log
```

Real-time monitoring of all cluster events:

```bash
sudo pcs status --watch
```

## Troubleshooting Resource Failures

### Identify Failed Resources

```bash
sudo pcs status
```

Look for lines marked with "FAILED" or "Stopped".

### View Failure Details

```bash
sudo pcs resource failcount show --full
```

### View the Last Resource Action

```bash
sudo crm_mon -1 --show-detail
```

### Check Resource Agent Logs

```bash
sudo journalctl -u pacemaker --grep "resource-agent" --no-pager -n 50
```

### Clean Up Failed Resources

```bash
# Clean a specific resource
sudo pcs resource cleanup WebServer

# Clean all resources
sudo pcs resource cleanup
```

### Manually Test a Resource Agent

Run the resource agent directly to check for configuration issues:

```bash
sudo pcs resource debug-start WebServer
```

Stop the debug run:

```bash
sudo pcs resource debug-stop WebServer
```

## Troubleshooting Fencing Issues

Check fencing status:

```bash
sudo pcs stonith status
```

Test a fence device:

```bash
sudo pcs stonith fence node2 --off
```

Check fence history:

```bash
sudo stonith_admin --history node2
```

Verify fence device configuration:

```bash
sudo pcs stonith config
```

## Troubleshooting Communication Issues

Check Corosync ring status:

```bash
sudo corosync-cfgtool -s
```

If a ring shows errors, check network connectivity between nodes:

```bash
ping node2
```

Verify firewall rules:

```bash
sudo firewall-cmd --list-services | grep high-availability
```

## Troubleshooting Quorum Issues

Check quorum status:

```bash
sudo corosync-quorumtool
```

If quorum is lost, check which nodes are offline and why.

## Common Issues and Solutions

### Resource Stuck in "Starting" State

The resource agent is taking too long. Increase the timeout:

```bash
sudo pcs resource op add WebServer start timeout=120s
```

### Resource Keeps Failing Over

Check the migration threshold:

```bash
sudo pcs resource show WebServer
```

Increase the threshold or fix the underlying issue:

```bash
sudo pcs resource meta WebServer migration-threshold=5
```

### Nodes Flapping (Joining and Leaving)

Increase the Corosync token timeout:

```bash
sudo pcs cluster config update totem token=10000
```

### Split-Brain After Network Partition

This is prevented by proper fencing. Verify STONITH is enabled:

```bash
sudo pcs property show stonith-enabled
```

## Using crm_mon for Monitoring

Interactive monitoring display:

```bash
sudo crm_mon
```

Show failed actions:

```bash
sudo crm_mon -1 --show-detail --inactive
```

## Conclusion

Effective Pacemaker cluster management on RHEL requires regular monitoring with pcs status, prompt investigation of failed resources, and understanding of cluster logs. Use resource cleanup to clear failures, debug-start to test agents, and Corosync tools to verify communication health.
