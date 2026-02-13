# How to Use AWS Application Migration Service (MGN)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MGN, Migration, Lift and Shift

Description: Complete guide to using AWS Application Migration Service (MGN) for lift-and-shift server migrations, covering agent installation, replication, testing, and cutover procedures.

---

AWS Application Migration Service (MGN) is the recommended tool for lift-and-shift migrations. It continuously replicates your source servers to AWS, and when you're ready, you cut over with minimal downtime. The whole process is straightforward, but there are details around networking, replication settings, and cutover timing that make the difference between a smooth migration and a stressful one.

This guide covers the end-to-end process of migrating servers using MGN.

## How MGN Works

MGN installs a lightweight agent on your source servers. The agent continuously replicates disk data to AWS using block-level replication. When you're ready to migrate, MGN launches EC2 instances from the replicated data.

```mermaid
sequenceDiagram
    participant Source as Source Server
    participant Agent as MGN Agent
    participant Staging as Staging Area (AWS)
    participant Target as Target EC2

    Agent->>Staging: Continuous block-level replication
    Note over Staging: EBS Snapshots
    Note over Source,Staging: Replication runs for days/weeks
    Agent->>Staging: Final sync
    Staging->>Target: Launch test instance
    Note over Target: Validate
    Staging->>Target: Launch cutover instance
    Note over Source: Decommission
```

## Prerequisites

Before starting, set up the MGN service in your target region.

```bash
# Initialize MGN in the target region
aws mgn initialize-service --region us-east-1
```

Create an IAM user or role for the replication agent.

```bash
# Create an IAM policy for the MGN agent
aws iam create-policy \
    --policy-name "MGNAgentPolicy" \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "mgn:SendAgentMetricsForMgn",
                    "mgn:SendAgentLogsForMgn",
                    "mgn:SendClientMetricsForMgn",
                    "mgn:SendClientLogsForMgn",
                    "mgn:RegisterAgentForMgn",
                    "mgn:UpdateAgentSourcePropertiesForMgn",
                    "mgn:UpdateAgentReplicationInfoForMgn",
                    "mgn:UpdateAgentConversionInfoForMgn",
                    "mgn:GetAgentInstallationAssetsForMgn",
                    "mgn:GetAgentCommandForMgn",
                    "mgn:GetAgentConfirmedResumeInfoForMgn",
                    "mgn:GetAgentRuntimeConfigurationForMgn",
                    "mgn:GetAgentReplicationInfoForMgn"
                ],
                "Resource": "*"
            }
        ]
    }'
```

## Installing the MGN Agent

### Linux

```bash
# Download and install the agent on the source server
wget -O ./aws-replication-installer-init https://aws-application-migration-service-us-east-1.s3.us-east-1.amazonaws.com/latest/linux/aws-replication-installer-init

chmod +x aws-replication-installer-init

sudo ./aws-replication-installer-init \
    --region us-east-1 \
    --aws-access-key-id AKIAIOSFODNN7EXAMPLE \
    --aws-secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Windows

```powershell
# Download the agent installer
Invoke-WebRequest -Uri "https://aws-application-migration-service-us-east-1.s3.us-east-1.amazonaws.com/latest/windows/AwsReplicationWindowsInstaller.exe" -OutFile "AwsReplicationWindowsInstaller.exe"

# Install the agent
.\AwsReplicationWindowsInstaller.exe `
    --region us-east-1 `
    --aws-access-key-id AKIAIOSFODNN7EXAMPLE `
    --aws-secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

After installation, the agent registers with MGN and starts initial replication. The source server appears in the MGN console within minutes.

## Monitoring Replication

Check replication status to know when the server is ready for testing or cutover.

```bash
# List all source servers
aws mgn describe-source-servers \
    --filters '{}'

# Get detailed replication status for a specific server
aws mgn describe-source-servers \
    --filters '{"sourceServerIDs": ["s-abc123"]}' \
    --query "items[0].{
        Name: sourceProperties.identificationHints.hostname,
        State: dataReplicationInfo.dataReplicationState,
        Lag: dataReplicationInfo.replicatedDisks[0].backloggedStorageBytes,
        LastSync: dataReplicationInfo.lastSnapshotDateTime
    }"
```

Replication states to watch for:

- **INITIATING**: Agent installed, replication starting
- **INITIAL_SYNC**: Full disk copy in progress (can take hours to days depending on disk size)
- **CONTINUOUS**: Real-time replication active, server is ready for testing
- **DISCONNECTED**: Agent lost connection - investigate

## Configuring Launch Settings

Before launching test or cutover instances, configure how the target EC2 instances should be set up.

```bash
# Update launch configuration
aws mgn update-launch-configuration \
    --source-server-id "s-abc123" \
    --name "payment-api-server" \
    --ec2-launch-template-id "lt-abc123" \
    --launch-disposition "STARTED" \
    --target-instance-type-right-sizing-method "BASIC" \
    --copy-private-ip false \
    --copy-tags true \
    --boot-mode "LEGACY_BIOS"
```

You can also configure the target using an EC2 Launch Template for more control.

```bash
# Create a launch template for the target instances
aws ec2 create-launch-template \
    --launch-template-name "mgn-payment-api" \
    --launch-template-data '{
        "InstanceType": "t3.large",
        "SecurityGroupIds": ["sg-abc123"],
        "SubnetId": "subnet-abc123",
        "TagSpecifications": [{
            "ResourceType": "instance",
            "Tags": [
                {"Key": "Name", "Value": "payment-api-migrated"},
                {"Key": "Environment", "Value": "production"},
                {"Key": "MigratedFrom", "Value": "on-premises"}
            ]
        }]
    }'
```

## Running a Test Launch

Always test before cutting over. The test launch creates an EC2 instance from the replicated data without affecting the source server or replication.

```bash
# Launch a test instance
aws mgn start-test \
    --source-server-ids '["s-abc123"]'
```

After the test instance launches, validate:

1. **Can you connect?** SSH or RDP into the instance
2. **Do services start?** Check that your application, database, and other services are running
3. **Is data correct?** Verify application data is intact
4. **Network connectivity?** Can the instance reach required endpoints (databases, APIs, etc.)?
5. **DNS resolution?** Does the instance resolve internal hostnames correctly?

```bash
# Check the test instance status
aws mgn describe-source-servers \
    --filters '{"sourceServerIDs": ["s-abc123"]}' \
    --query "items[0].lifeCycle.lastTest"
```

After testing, mark the test as complete.

```bash
# Mark test as successful and clean up test instances
aws mgn mark-as-archived \
    --source-server-id "s-abc123"
```

Wait - don't actually archive it. Instead, finalize the test to proceed to cutover readiness.

## Cutover

When you're satisfied with test results, perform the cutover. This is the actual migration.

```bash
# Start the cutover
aws mgn start-cutover \
    --source-server-ids '["s-abc123"]'
```

The cutover process:

1. MGN performs a final data sync to capture any changes since the last snapshot
2. Launches the target EC2 instance with the latest data
3. The instance starts and your application comes up
4. You update DNS, load balancers, or other routing to point to the new instance

```bash
# Check cutover status
aws mgn describe-source-servers \
    --filters '{"sourceServerIDs": ["s-abc123"]}' \
    --query "items[0].lifeCycle.lastCutover"
```

## Post-Cutover Steps

After cutover, verify everything works and then finalize.

```bash
# After successful validation, finalize the cutover
aws mgn finalize-cutover \
    --source-server-id "s-abc123"

# This disconnects the agent and stops replication
```

Keep the source server running for a rollback window (typically 1-2 weeks). If issues arise, you can fall back to the source.

## Bulk Migration

For migrating many servers, automate the process.

```python
# bulk_migrate.py - Automate migration for multiple servers
import boto3
import time

mgn = boto3.client('mgn', region_name='us-east-1')

def get_ready_servers():
    """Get all servers that are ready for cutover."""
    response = mgn.describe_source_servers(filters={})
    ready = []

    for server in response['items']:
        state = server['dataReplicationInfo']['dataReplicationState']
        hostname = server['sourceProperties']['identificationHints'].get('hostname', 'unknown')

        if state == 'CONTINUOUS':
            ready.append({
                'id': server['sourceServerID'],
                'hostname': hostname,
                'lag_bytes': sum(
                    d.get('backloggedStorageBytes', 0)
                    for d in server['dataReplicationInfo'].get('replicatedDisks', [])
                )
            })

    return ready

def migrate_batch(server_ids, dry_run=True):
    """Migrate a batch of servers."""
    if dry_run:
        print(f"DRY RUN: Would migrate {len(server_ids)} servers")
        for sid in server_ids:
            print(f"  - {sid}")
        return

    # Start test launch first
    print(f"Starting test for {len(server_ids)} servers...")
    mgn.start_test(sourceServerIDs=server_ids)

    # Wait for tests to complete (simplified - add proper polling)
    print("Waiting for tests to complete...")
    time.sleep(300)

    # After manual validation, proceed with cutover
    print("Tests complete. Review results before proceeding to cutover.")

# Get servers ready for migration
ready = get_ready_servers()
print(f"Found {len(ready)} servers ready for migration:")
for s in ready:
    lag_mb = s['lag_bytes'] / (1024 * 1024)
    print(f"  {s['hostname']} ({s['id']}) - Lag: {lag_mb:.1f} MB")

# Migrate in batches (dry run first)
batch = [s['id'] for s in ready[:5]]
migrate_batch(batch, dry_run=True)
```

## Networking Considerations

The most common post-migration issue is networking. Your migrated server might have different IP addresses, security groups, and routing than the source.

**IP address mapping**: If your applications use hardcoded IPs, update them before cutover.

**Security groups**: Ensure the target security groups allow the same traffic patterns as the source firewall rules.

**DNS updates**: Update DNS records to point to the new instance IPs.

```bash
# Update a Route 53 record to point to the migrated instance
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "payment-api.internal.example.com",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [{"Value": "10.0.1.50"}]
            }
        }]
    }'
```

## Wrapping Up

MGN makes lift-and-shift migrations about as painless as they can be. The continuous replication means your target is always close to the source, and the test-then-cutover workflow gives you confidence before committing. The key is to test thoroughly, validate networking, and keep a rollback plan.

For tracking migration progress across multiple servers and tools, see our guide on [using AWS Migration Hub](https://oneuptime.com/blog/post/2026-02-12-use-aws-migration-hub-for-application-migration/view). For database migrations, check out our guide on [AWS Database Migration Service](https://oneuptime.com/blog/post/2026-02-12-use-aws-database-migration-service-for-schema-conversion/view).
