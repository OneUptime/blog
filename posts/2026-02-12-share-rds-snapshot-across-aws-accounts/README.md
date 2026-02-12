# How to Share an RDS Snapshot Across AWS Accounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Security, Multi-Account

Description: Step-by-step guide to sharing Amazon RDS snapshots between AWS accounts for database migration, disaster recovery, and multi-account architectures.

---

Most organizations running AWS at any reasonable scale end up with multiple accounts. You might have separate accounts for development, staging, and production. Or maybe you're splitting things up by team, business unit, or compliance boundary. Whatever the reason, there comes a time when you need to get a database from one account into another.

The cleanest way to do this is by sharing an RDS snapshot. It's a built-in AWS feature, it doesn't require any weird networking hacks, and it works across accounts within the same region. Let's dig into how it works and what gotchas to watch out for.

## How Snapshot Sharing Works

When you share an RDS snapshot, you're not actually moving data. You're granting another AWS account permission to see and restore from that snapshot. The snapshot stays in your account, but the target account can use it to create a new RDS instance.

There are a few rules:

- You can only share **manual** snapshots, not automated ones. If you want to share an automated snapshot, you'll need to copy it to a manual snapshot first.
- Sharing is region-specific. The target account can only access the shared snapshot in the same region where it exists.
- You can share with specific account IDs or make a snapshot public (don't do that for production data).
- Encrypted snapshots have additional requirements around KMS key sharing.

## Sharing an Unencrypted Snapshot via Console

This is the simplest scenario. In the AWS Console:

1. Go to **RDS** then **Snapshots**
2. Select the manual snapshot you want to share
3. Click **Actions** then **Share Snapshot**
4. Enter the AWS account ID you want to share with
5. Click **Save**

That's it. The other account can now see this snapshot in their RDS console under "Shared with Me."

## Sharing via the AWS CLI

The CLI approach is better for automation. Here's how to share a snapshot with another account:

```bash
# Share a manual RDS snapshot with another AWS account
aws rds modify-db-snapshot-attribute \
  --db-snapshot-identifier my-manual-snapshot \
  --attribute-name restore \
  --values-to-add 987654321098
```

The `--values-to-add` parameter takes the target AWS account ID. You can add multiple account IDs separated by spaces.

To verify the sharing is set up correctly:

```bash
# Check which accounts have access to the snapshot
aws rds describe-db-snapshot-attributes \
  --db-snapshot-identifier my-manual-snapshot
```

This returns something like:

```json
{
  "DBSnapshotAttributesResult": {
    "DBSnapshotIdentifier": "my-manual-snapshot",
    "DBSnapshotAttributes": [
      {
        "AttributeName": "restore",
        "AttributeValues": ["987654321098"]
      }
    ]
  }
}
```

## Converting an Automated Snapshot to Manual

Since you can't share automated snapshots directly, you'll need to copy them first:

```bash
# Copy an automated snapshot to create a manual snapshot that can be shared
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier rds:my-database-2026-02-12-04-30 \
  --target-db-snapshot-identifier my-database-manual-snapshot
```

Wait for the copy to finish, then share the manual snapshot as shown above.

## Restoring a Shared Snapshot in the Target Account

Once the snapshot has been shared, switch to the target account. The shared snapshot won't show up in the regular snapshots list - you need to look under "Shared with Me."

Using the CLI from the target account:

```bash
# List snapshots shared with this account
aws rds describe-db-snapshots \
  --include-shared \
  --snapshot-type shared
```

To restore it into a new RDS instance:

```bash
# Restore a shared snapshot into a new RDS instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-restored-database \
  --db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:my-manual-snapshot \
  --db-instance-class db.r6g.large \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name my-subnet-group
```

Note that you need to use the full snapshot ARN (from the source account) as the identifier. You'll also want to specify your own security groups and subnet group since the source account's settings won't apply.

## Sharing Encrypted Snapshots

This is where things get more involved. When an RDS instance is encrypted with KMS, the snapshot is too. Sharing an encrypted snapshot requires sharing the KMS key as well.

Step 1: Update the KMS key policy to allow the target account to use it.

```json
{
  "Sid": "AllowTargetAccountToUseKey",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::987654321098:root"
  },
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey",
    "kms:CreateGrant",
    "kms:RetireGrant"
  ],
  "Resource": "*"
}
```

Add this statement to the KMS key policy in the source account.

Step 2: Share the snapshot (same as before):

```bash
# Share the encrypted snapshot with the target account
aws rds modify-db-snapshot-attribute \
  --db-snapshot-identifier my-encrypted-snapshot \
  --attribute-name restore \
  --values-to-add 987654321098
```

Step 3: In the target account, copy the shared snapshot using a KMS key owned by the target account. This is a required extra step for encrypted snapshots:

```bash
# In the target account: copy the shared encrypted snapshot using a local KMS key
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:my-encrypted-snapshot \
  --target-db-snapshot-identifier my-local-encrypted-snapshot \
  --kms-key-id arn:aws:kms:us-east-1:987654321098:key/target-account-key-id
```

Step 4: Now restore from the local copy:

```bash
# Restore from the locally re-encrypted snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-restored-encrypted-db \
  --db-snapshot-identifier my-local-encrypted-snapshot \
  --db-instance-class db.r6g.large
```

## Important Limitation: Default KMS Keys

You **cannot** share snapshots encrypted with the default AWS-managed RDS KMS key (`aws/rds`). The default key's policy doesn't allow cross-account access and can't be modified.

If your snapshots are encrypted with the default key, you'll need to:

1. Create a customer-managed KMS key
2. Create a new RDS instance from the snapshot
3. Enable encryption with your customer-managed key
4. Take a new snapshot of that instance
5. Share that snapshot

It's annoying but there's no shortcut around it.

## Automating Cross-Account Snapshot Sharing

For teams that regularly need fresh copies of production data in development accounts, automation is essential. Here's a Lambda function that handles the sharing workflow:

```python
import boto3
import os

def lambda_handler(event, context):
    rds = boto3.client('rds')
    target_accounts = os.environ['TARGET_ACCOUNTS'].split(',')
    source_db = os.environ['SOURCE_DB_IDENTIFIER']

    # Find the latest automated snapshot for the database
    snapshots = rds.describe_db_snapshots(
        DBInstanceIdentifier=source_db,
        SnapshotType='automated'
    )['DBSnapshots']

    if not snapshots:
        print("No automated snapshots found")
        return

    # Sort by creation time and pick the most recent
    latest = sorted(snapshots, key=lambda s: s['SnapshotCreateTime'])[-1]
    manual_id = f"{source_db}-shared-{latest['SnapshotCreateTime'].strftime('%Y%m%d')}"

    # Copy to a manual snapshot
    rds.copy_db_snapshot(
        SourceDBSnapshotIdentifier=latest['DBSnapshotIdentifier'],
        TargetDBSnapshotIdentifier=manual_id
    )

    # Wait for copy to complete (in production, use a Step Function instead)
    waiter = rds.get_waiter('db_snapshot_available')
    waiter.wait(DBSnapshotIdentifier=manual_id)

    # Share with each target account
    for account_id in target_accounts:
        rds.modify_db_snapshot_attribute(
            DBSnapshotIdentifier=manual_id,
            AttributeName='restore',
            ValuesToAdd=[account_id.strip()]
        )
        print(f"Shared {manual_id} with account {account_id}")

    return manual_id
```

## Revoking Access

To stop sharing a snapshot with an account:

```bash
# Remove an account's access to a shared snapshot
aws rds modify-db-snapshot-attribute \
  --db-snapshot-identifier my-manual-snapshot \
  --attribute-name restore \
  --values-to-remove 987654321098
```

This doesn't affect any RDS instances already created from the snapshot - it just prevents future restores.

## Security Considerations

Be thoughtful about what you're sharing. Production database snapshots contain real data, which might include PII, credentials, or other sensitive information. Before sharing snapshots with development or testing accounts, consider whether the data needs to be sanitized first.

For monitoring your cross-account snapshot sharing setup, you can track snapshot events through CloudWatch and set up alerts when sharing permissions change. Check out our guide on [setting up CloudWatch alarms for RDS](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view) for more on that.

Snapshot sharing is a powerful feature that makes multi-account AWS architectures much more manageable. Once you understand the encryption constraints and automate the workflow, it becomes a reliable part of your database operations toolkit.
