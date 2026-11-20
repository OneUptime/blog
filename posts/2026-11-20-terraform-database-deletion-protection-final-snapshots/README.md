# Protect Cloud Databases from Accidental Terraform Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Cloud, Disaster Recovery

Description: Combine Terraform lifecycle checks, cloud deletion protection, and final backups while understanding what each safeguard cannot prevent.

A database can disappear during an infrastructure change that never mentions `terraform destroy`. A renamed resource, a removed module, or a replacement-triggering argument can produce a deletion in an ordinary plan. Protecting production therefore requires more than teaching people to avoid one command.

Use several safeguards with separate responsibilities: Terraform can reject a proposed destruction, the cloud service can reject a deletion request, and a backup can support recovery if deletion eventually proceeds. None of these replaces reviewing the exact plan.

The examples below were checked with **Terraform 1.11.4**, **AWS provider 6.25.0**, and **Google provider 7.10.0**. They focus on an RDS PostgreSQL DB instance and a Cloud SQL PostgreSQL instance, rather than assuming every database resource has identical arguments.

## Know which boundary each protection covers

| Safeguard | Intended protection | Important limit |
| --- | --- | --- |
| `lifecycle.prevent_destroy` | Reject a Terraform plan that destroys the configured resource | Removing the resource configuration also removes this lifecycle rule |
| Cloud service deletion protection | Reject deletion through the service API while enabled | An authorized identity can disable it first |
| Provider-side deletion guard | Stop that provider from deleting a protected resource | It may not protect console or direct API operations |
| Final snapshot or backup | Preserve a recovery artifact during an approved deletion | It does not keep the application online or prove restoration works |

Terraform explicitly documents that `prevent_destroy` must remain in the configuration. It is not a permanent lock attached to the database. See the [lifecycle reference](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle).

Treat changes disabling protection as security-sensitive configuration changes. A pipeline allowed to alter protection and delete the database can still carry out both operations. Separate review and access controls are what make that transition deliberate.

## Add RDS safeguards to the existing resource

For an existing `aws_db_instance`, merge these arguments into its resource body. This is a configuration fragment, not a standalone database definition. Preserve its networking, encryption, backups, engine, and other existing settings.

```hcl
deletion_protection       = true
skip_final_snapshot       = false
final_snapshot_identifier = "orders-prod-final-20261120"

lifecycle {
  prevent_destroy = true
}
```

Use a final snapshot identifier appropriate to your database and approved retirement event. It must be available when deletion occurs; a fixed name that already exists can cause the final-snapshot operation to fail. Do not interpret this example's date as a retention policy.

The pinned [AWS provider documentation](https://github.com/hashicorp/terraform-provider-aws/blob/v6.25.0/website/docs/r/db_instance.html.markdown) defines these fields and requires a final snapshot identifier when `skip_final_snapshot` is false. It also distinguishes read replicas, for which this final-snapshot argument must not be supplied when deleting the replica.

RDS service-side protection must be disabled before deletion is allowed. AWS describes that prerequisite and the available backup choices in [Deleting a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html). Keeping the service flag enabled matters even if someone removes the Terraform block or uses the console.

If your resource already has a `lifecycle` block, add the rule there rather than creating a duplicate block. Review the resulting plan before applying the protective change; an unrelated pending replacement should not be hidden inside a safety update.

## Distinguish Cloud SQL's two similarly named controls

Google provider 7.10.0 exposes both a Terraform-side flag and a service-side setting. At the resource level, keep:

```hcl
deletion_protection = true

lifecycle {
  prevent_destroy = true
}
```

Inside that resource's **existing `settings` block**, add:

```hcl
deletion_protection_enabled = true
```

Do not replace the existing settings block with this single line. The block still needs its other required and operational settings.

The top-level `deletion_protection` protects deletion through Terraform. `settings.deletion_protection_enabled` enables protection at the Cloud SQL API level. The distinction is explicit in the [Google provider 7.10.0 resource reference](https://github.com/hashicorp/terraform-provider-google/blob/v7.10.0/website/docs/r/sql_database_instance.html.markdown). A similarly named field is not evidence that both controls are already active.

Cloud SQL's own [deletion-protection documentation](https://docs.cloud.google.com/sql/docs/postgres/deletion-protection) describes the service feature. Verify its current value through the service as well as reviewing configuration. Configuration waiting in a pull request has not yet protected the running database.

Cloud SQL backup retention and final-backup configuration are separate from these guards. Select them using the settings supported by your pinned provider and backup mode; do not copy RDS's `skip_final_snapshot` argument into a Google resource.

## Test configuration without treating validation as deployment proof

In an isolated copy with the same provider constraints and no production backend, initialize providers and validate the configuration:

```bash
terraform init -backend=false -input=false
terraform validate
```

These commands download or select provider plugins and check configuration consistency. They do not create the database. Validation does not prove that a cloud API will accept the settings, that a snapshot name is available, or that a deletion would be blocked in your account. HashiCorp documents this scope in the [validate command reference](https://developer.hashicorp.com/terraform/cli/commands/validate).

For the real change, review a plan against the intended workspace and state using your normal controlled workflow. Check the database's resource address and remote identifier, not only its friendly name. Confirm there are no unexpected delete or replacement actions elsewhere in the module.

A useful disposable-environment rehearsal includes an attempted destructive plan blocked by `prevent_destroy`, then a separately controlled service-protection test. Do not discover the limits by experimenting against the production instance. Keep records of which layer blocked which action.

## Handle refactoring as an identity change

Moving a resource into a module or renaming its Terraform address does not necessarily mean you want a new physical database. Terraform provides `moved` blocks to describe supported address changes so the existing object remains associated with its new configuration location. See [module refactoring](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring).

When a refactor unexpectedly proposes replacement, stop and identify whether the change concerns the resource address, an immutable database attribute, or the wrong state. Disabling protection merely to get a clean apply can convert a state-management problem into a data-loss event.

Likewise, `create_before_destroy` does not migrate database contents or switch application traffic. A new empty instance is not a replacement for the old instance's data just because both resources satisfy the configuration.

## Keep recovery independent of prevention

A final snapshot is produced during deletion, so it cannot be the only backup you depend on. Maintain your normal backup schedule and rehearse restoration into an isolated environment. Account for encryption-key access, database users, networking, and application connection settings in that rehearsal.

For a planned retirement, first establish that no application still depends on the database, confirm the intended recovery artifact and retention, and review the exact protection changes separately. Disable safeguards only within that approved procedure. Afterward, confirm the backup exists and remains accessible to the recovery identity.

The purpose of layered protection is to make destructive intent explicit and recoverable. It should turn an unexpected delete into a reviewable failure, while leaving a documented path for legitimate retirement.
