# Find Orphaned RDS Snapshots After Blue/Green Changes and Restores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Backup, Cost Optimization

Description: Inventory manual RDS snapshots by stable source identity, then review retention, sharing, and restore dependencies before approving cleanup.

After several blue/green deployments and restore drills, a database account can contain snapshots whose names no longer match anything in production. Some are forgotten copies. Others are the only approved recovery point for a retired system.

The first task is to distinguish those cases. “Source instance no longer exists” is a useful inventory signal, not a deletion policy. Build a report that retains uncertainty and connects each snapshot to its owner, purpose, and recovery obligations.

This walkthrough covers manual **RDS DB instance snapshots**, with AWS CLI 2.38.1 and Python 3.11 examples. Aurora cluster snapshots and backups managed through a vault require separate inventory paths. Every cloud command shown is read-only; the local report does not delete or change snapshots.

## Understand what the lifecycle leaves behind

RDS retains manual snapshots and a chosen final snapshot when an instance is deleted. Their continued presence can therefore be intentional. [Deleting an RDS instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html).

Blue/green operations add another source of confusion. After switchover, previous blue instances remain, and resource naming changes can make a name-based inventory misleading. Deleting the deployment object is not the same as cleaning up every database resource associated with the exercise. [Switchover behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-switching.html), [deployment deletion behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-deleting.html).

Similarly, a restore creates another database instance with its own lifecycle. A snapshot made before or after that drill may be associated with a short-lived instance rather than the current production identifier.

Use the immutable `DbiResourceId` to compare source identity where it is available. Keep the human-readable name for investigation, but do not make it the join key. AWS documents this resource ID as Region-unique and immutable. [Instance identity fields](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html).

## Capture a complete, scoped inventory

Choose one approved account and Region. Confirm the profile's identity through your normal account-verification procedure. Use a new local directory so the current run does not silently overwrite earlier evidence.

```bash
set -e
umask 077
mkdir snapshot-review-unique

aws rds describe-db-instances \
  --profile inventory-readonly --region us-east-1 \
  --output json --no-cli-pager \
  > snapshot-review-unique/instances.json

aws rds describe-db-snapshots \
  --profile inventory-readonly --region us-east-1 \
  --snapshot-type manual \
  --output json --no-cli-pager \
  > snapshot-review-unique/snapshots.json
```

Replace the profile, Region, and directory name. Both calls preserve the CLI's automatic pagination. Do not add `--no-paginate` or a limiting `--max-items` to an inventory you intend to treat as complete. Save the account, Region, capture time, and command exit status alongside the files. [Instance inventory](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html), [snapshot inventory](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html).

A failed or unauthorized collection is an incomplete inventory, not evidence that the account contains no instances. Run each additional account and Region as a separate scoped collection.

## Classify lineage without making deletion decisions

Save this script as `classify_snapshots.py` beside your inventory directory and run it with Python 3.11. It reads the captured files and prints a JSON review report.

```python
import json
from pathlib import Path

root = Path("snapshot-review-unique")
instances = json.loads((root / "instances.json").read_text())["DBInstances"]
snapshots = json.loads((root / "snapshots.json").read_text())["DBSnapshots"]

if any(not item.get("DbiResourceId") for item in instances):
    raise ValueError("Instance inventory lacks stable IDs; investigate first")
active_ids = {item["DbiResourceId"] for item in instances}

report = []
for snapshot in snapshots:
    source_id = snapshot.get("DbiResourceId")
    if snapshot.get("SnapshotType") != "manual":
        state = "outside-manual-scope"
    elif snapshot.get("SourceDBSnapshotIdentifier"):
        state = "copied-snapshot-review-lineage"
    elif not source_id:
        state = "unknown-source-identity"
    elif source_id in active_ids:
        state = "source-present"
    else:
        state = "source-not-in-this-inventory"

    report.append({
        "snapshot": snapshot["DBSnapshotArn"],
        "source_resource_id": source_id,
        "source_name": snapshot.get("DBInstanceIdentifier"),
        "created": snapshot.get("SnapshotCreateTime"),
        "status": snapshot.get("Status"),
        "review_state": state,
    })

print(json.dumps(report, indent=2))
```

The output deliberately has no `delete` field. A source missing from this account-and-Region inventory may have been retired, copied from elsewhere, or omitted by a collection mistake. Copied snapshots receive their own review state because local source matching alone cannot establish their lineage.

The snapshot API exposes the source resource ID and, where present, source snapshot information. It also distinguishes the copy's creation time from `OriginalSnapshotCreateTime`. Do not reset a retention decision merely because an old recovery point was recently copied. [Snapshot response fields](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshots.html).

## Enrich the report with ownership and dependencies

For each candidate, gather its owner, application, environment, change or restore-drill reference, retention decision, and latest successful restore evidence. Tags are useful metadata, but their presence and propagation depend on your workflow. Check the snapshot's actual tags instead of assuming they match the current instance. [RDS tagging](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html).

Inspect one snapshot using its full ARN:

```bash
aws rds list-tags-for-resource \
  --profile inventory-readonly --region us-east-1 \
  --resource-name arn:aws:rds:us-east-1:123456789012:snapshot:review-example \
  --no-cli-pager
```

Replace the example ARN with one from the report. This reads tags without modifying them. [Tag inspection reference](https://docs.aws.amazon.com/cli/latest/reference/rds/list-tags-for-resource.html).

Check sharing separately:

```bash
aws rds describe-db-snapshot-attributes \
  --profile inventory-readonly --region us-east-1 \
  --db-snapshot-identifier review-example \
  --no-cli-pager
```

The `restore` attribute lists accounts authorized to copy or restore a manual snapshot. A value of `all` indicates public sharing. Sharing permission does not prove active use, but it identifies another dependency to investigate before cleanup. [Snapshot attributes reference](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-snapshot-attributes.html).

An owner may rely on the snapshot for an upgrade fallback, a contractual retention requirement, or a recovery exercise in another account. Resolve that dependency explicitly. Missing tags mean ownership is unknown, not that no owner exists.

## Turn candidates into reviewed actions

| Inventory finding | Appropriate next step |
|---|---|
| Source exists under a different name | Update lineage records; do not classify by the old name alone |
| Source retired, retention still active | Retain with an explicit owner and review date |
| Copied snapshot with unclear origin | Trace copy records and destination recovery requirements |
| Shared snapshot | Confirm consumers and their independently retained copies |
| Retention expired and replacement recovery verified | Prepare a specific cleanup proposal for the resource owner |
| No owner or incomplete collection | Investigate; keep the result unresolved |

Do not estimate savings by adding each snapshot's allocated database size. That field is not a measurement of uniquely billable snapshot bytes. Use the provider's billing evidence and the account's actual backup usage to assess the effect of a proposed cleanup.

Before any approved deletion, refresh the snapshot's state, tags, sharing, and retention record. An inventory can become stale between collection and action. Keep the approved resource identities and results in the change record instead of running a broad name-prefix deletion loop.

## Prevent the next pileup

Make a restore drill or blue/green change record include its snapshots, immutable source IDs, owner, and planned review date. Close the lifecycle only when retained artifacts have a reason and disposable ones have completed the normal cleanup process.

Re-run the read-only report after cleanup and compare it with the previous inventory. Track unresolved ownership as well as object count. A smaller list is useful only when the remaining recovery obligations are still covered and the removed artifacts were no longer needed.
