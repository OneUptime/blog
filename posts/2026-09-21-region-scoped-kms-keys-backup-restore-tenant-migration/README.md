# How to Use Region-Scoped KMS Keys Without Breaking Backup Restore or Tenant Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, AWS KMS, AWS RDS, Encrypted Backups, Data Migration

Description: Map regional encryption-key dependencies, verify restore-role access, and plan re-encryption so backups and tenant migrations remain recoverable.

---

A database snapshot and its encryption key form a recovery dependency. Moving one without planning the other can produce a backup that exists but cannot be restored.

With AWS KMS, begin by recording full key ARNs, accounts, and regions. An alias is a useful name, but it is not a complete historical record of which key protects an artifact. Keep the key identity returned by the service with each backup record.

## Distinguish regional keys from data-location controls

Single-region keys are regional resources. Multi-region keys are related regional keys that can share key material and identifiers, but they still have independent policies and other properties. AWS explains this distinction in [how multi-region keys work](https://docs.aws.amazon.com/kms/latest/developerguide/mrk-how-it-works.html).

Neither option alone prevents an authorized application from reading plaintext and sending it elsewhere. Enforce data placement and egress separately. If the key material itself must remain within a location set, review replication permissions and the selected key type as part of that requirement.

Inspect the actual key:

```bash
aws kms describe-key \
  --region eu-west-2 \
  --key-id arn:aws:kms:eu-west-2:123456789012:key/REPLACE_WITH_KEY_ID \
  --query 'KeyMetadata.{Arn:Arn,State:KeyState,Manager:KeyManager,MultiRegion:MultiRegion,Configuration:MultiRegionConfiguration}' \
  --output json
```

The [DescribeKey reference](https://docs.aws.amazon.com/cli/latest/reference/kms/describe-key.html) defines these fields. Save the result with a timestamp. Also review the key policy, relevant IAM policies, grants, and any service-specific requirements; the metadata response does not establish that a restore principal is authorized.

## Build the dependency map

Use one row per independently encrypted artifact:

| Artifact | Required key identity | Principal to test |
| --- | --- | --- |
| Live database | Database service's reported KMS key | Application/service integration |
| Original snapshot | Snapshot's reported KMS key | Backup-copy role |
| Copied snapshot | Destination snapshot's reported key | Restore role |
| Database export | Export object's encryption key | Import role |
| Historical backup | Key retained for its entire usable lifetime | Recovery-account role |

Include destination keys before approving a migration. For cross-account operations, account policies and key policies must both permit the intended operation where required.

Test through the actual service workflow. A successful direct `kms:Decrypt` operation does not prove that RDS can copy or restore a snapshot under the service's encryption context and grants.

## Use the service's supported key-change procedure

RDS DB instances illustrate why generic key advice is insufficient. AWS states that an encrypted instance's KMS key cannot be changed in place. An encrypted snapshot can be copied under a different key and the copy restored into a new instance. Same-region encrypted read replicas have additional key constraints. See [RDS encryption behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html).

A same-region snapshot-copy example is:

```bash
aws rds copy-db-snapshot \
  --region eu-west-2 \
  --source-db-snapshot-identifier orders-before-migration \
  --target-db-snapshot-identifier orders-new-key \
  --kms-key-id arn:aws:kms:eu-west-2:123456789012:key/REPLACE_WITH_DESTINATION_KEY_ID

aws rds wait db-snapshot-available \
  --region eu-west-2 \
  --db-snapshot-identifier orders-new-key
```

Review the [copy-db-snapshot command](https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html) for your source type and account arrangement. This operation copies an entire database snapshot; it does not isolate one tenant from a shared database.

For a single-tenant migration out of a shared store, use an application-aware export or replication process that selects exactly that tenant, preserves dependencies, and encrypts every intermediate file in the approved location. Keep migration logs free of exported row content.

## Prove cutover and rollback

Restore the destination artifact into an isolated environment with the intended recovery role. Confirm the destination key, data completeness, schema, credentials, and application behavior. Then rehearse cutover with a write fence or a replication catch-up point appropriate to the migration method.

Record how writes after cutover will be reconciled before allowing rollback. Restoring the original snapshot later does not recover new writes made to the destination. Define which system is authoritative at each phase.

Retain the old key while any required backup, export, or rollback path depends on it. AWS documents the irreversible effects of [KMS key deletion](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html). Key rotation, changing an alias target, disabling a key, and deleting a key are different operations; none should be treated as an implicit migration of old backups.

Close the migration only after an independent restore succeeds from the retained recovery set. The decisive result is recoverable data under the intended regional key and permissions, with the old dependency removed only when its retention obligations have ended.
