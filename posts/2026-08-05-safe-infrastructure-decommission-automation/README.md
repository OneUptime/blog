# Safe Infrastructure Decommission Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Automation, Terraform, Decommissioning, Backup, Cost Optimization, Reliability

Description: Automate decommissioning only after proving recoverability, removing live dependencies, reviewing exact destroy actions, and verifying residual cost and access.

---

Provisioning automation proves that an object can be created. Decommission automation must prove much more: the object is no longer serving traffic, its data can be recovered for the required period, every dependency has moved, deletion is authorized, and no chargeable or privileged residue remains.

`terraform destroy` is the final mutation, not the decommission process.

A production-quality workflow is a state machine with evidence-backed gates:

```text
CANDIDATE -> QUARANTINED -> DRAINED -> RECOVERY_PROVED
          -> DEPENDENCIES_REMOVED -> DESTROY_PLANNED -> DESTROYED
          -> RESIDUE_VERIFIED -> CLOSED
```

Each transition should be resumable and auditable. A failed gate leaves the resource in a known state rather than skipping forward.

## Establish the Retirement Decision

Before technical work, record:

- immutable resource, service, account, and state identifiers;
- business and technical owners;
- reason for retirement;
- last known production use;
- data classification and retention obligations;
- required recovery point objective and recovery time objective;
- rollback deadline;
- affected customers and dependent teams;
- cost center and expected savings;
- approvers for data deletion and infrastructure destruction.

Do not infer abandonment solely from low CPU, missing tags, or an expired project date. Cold standby systems, monthly jobs, disaster recovery components, audit stores, and rarely used administration paths can all look idle.

Require an owner to attest that the capability is retired, or use a documented orphan-resource escalation process when no owner remains.

## Quarantine Before Destroying

Create a reversible observation period:

- stop new deployments to the target;
- remove it from normal scheduling or traffic gradually;
- deny new data writes where the application supports read-only mode;
- keep monitoring and audit collection running;
- mark it as decommissioning in inventory and service catalogs;
- block unrelated Terraform applies to the affected state if they would obscure evidence.

The quarantine length should cover the longest relevant usage cycle. A service called only by a month-end process needs a different window from a stateless preview environment.

Use a canary removal where possible. Set one endpoint's routing weight to zero, disable one consumer credential, or detach one replica, then observe error budgets and dependency signals before removing the whole system.

## Prove the Backup Can Restore

A snapshot identifier proves only that a backup object exists. It does not prove that it contains the expected data, is decryptable, has the required permissions, can restore into an available engine version, or meets RTO.

Collect a recovery evidence bundle:

```yaml
backup_id: snapshot-2026-08-05-0910
source_resource_id: database/orders-prod
completed_at: 2026-08-05T09:18:24Z
encrypted: true
retention_until: 2027-08-05T00:00:00Z
restore_test:
  run_id: restore-drill-8841
  completed_at: 2026-08-05T10:02:11Z
  duration_minutes: 31
  integrity_checks: passed
  application_read_test: passed
encryption_key_owner: security-platform
```

Restore into an isolated environment, run engine and application-level integrity checks, and record measured recovery time. Verify that keys, identities, network access, engine versions, and restore capacity will remain available throughout retention.

HashiCorp's disaster recovery guidance recommends encrypted, geographically distributed backups and regular restore testing against RPO and RTO. Treat those as ongoing prerequisites, not a checkbox created moments before deletion.

For data whose policy requires destruction rather than retention, obtain the data owner's explicit decision and verify deletion across snapshots, replicas, exports, caches, and third-party copies according to the governing policy.

## Build a Dependency Map from Multiple Sources

`terraform graph` shows dependencies represented in the current Terraform configuration. It cannot discover a manually configured client, a DNS lookup, an IAM principal in another account, a query consumer, or a script that knows a resource ID.

Use several evidence sources:

```bash
terraform state list
terraform graph -type=plan > dependency-plan.dot
terraform output -json > outputs.json
```

Because `terraform output -json` reveals sensitive output values in plain text, protect or sanitize `outputs.json`.

Then add:

- cloud flow and control-plane audit logs;
- load balancer, gateway, and DNS query data;
- service catalog and CMDB relationships;
- secret, certificate, and identity usage;
- queue producers and consumers;
- database connection and query telemetry;
- cross-state outputs and configuration-store readers;
- backup, replication, monitoring, and security integrations;
- billing and commitment reports.

For each dependency, record its replacement or removal evidence. "No traffic in 24 hours" is weak if the dependent job runs weekly. State the observation window and known blind spots.

## Drain in Dependency Order

Remove producers and entry points before the resource they call. A typical application sequence is:

1. stop new provisioning and writes;
2. move or disable traffic;
3. drain queues and in-flight work;
4. stop scheduled producers;
5. revoke consumer credentials;
6. remove service discovery and DNS after cache lifetimes are considered;
7. detach replicas and integrations;
8. destroy the core compute or data resource;
9. remove monitoring, identities, network rules, and residual storage.

Deletion dependencies may run in the opposite order from creation. Review finalizers, retention locks, and provider-specific deletion protection before the window.

In Kubernetes, finalizers keep an object in a terminating state until responsible controllers finish cleanup and remove their keys. Do not strip finalizers automatically to make a deadline. A stuck finalizer is evidence that cleanup is incomplete or its controller is unavailable.

## Keep Terraform Protections Until the Decision Gate

`prevent_destroy = true` makes Terraform reject a plan that would destroy the associated object while the resource block and rule remain in configuration:

```hcl
resource "aws_db_instance" "orders" {
  identifier                  = "orders-production"
  allocated_storage           = 100
  engine                      = "postgres"
  instance_class              = "db.m7g.large"
  username                    = "dbadmin"
  manage_master_user_password = true
  storage_encrypted            = true
  publicly_accessible          = false
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "orders-production-final"

  lifecycle {
    prevent_destroy = true
  }
}
```

HashiCorp documents an important limitation: removing the resource configuration also removes the `prevent_destroy` rule, so Terraform can then plan destruction. Use a reviewed, explicit change to remove `prevent_destroy` and set the provider's `deletion_protection` to `false` only after backup, dependency, and authorization gates pass.

Do not make the automation edit protection and destroy in one opaque step. Use two auditable phases:

1. a readiness change that records evidence and deliberately removes both protections;
2. a destroy change that produces an exact plan for approval.

With Terraform v1.7 or later, if ownership is being handed to another tool or team rather than the object being destroyed, use a `removed` block with `destroy = false` instead of a delete:

```hcl
removed {
  from = aws_db_instance.orders

  lifecycle {
    destroy = false
  }
}
```

That removes Terraform's binding but leaves the real object. It is not decommissioning and must include a new accountable owner.

## Create and Review an Exact Destroy Plan

For a complete disposable configuration, create a saved destroy plan:

```bash
terraform plan -destroy -input=false -out=destroy.tfplan
terraform show -no-color destroy.tfplan > destroy.txt
terraform show -json destroy.tfplan > destroy.json
```

Inspect every address, replacement, read, and unknown value. Saved plan files can contain sensitive data in cleartext, and `terraform show -json` can expose sensitive values in plain text, so restrict and expire the plan and rendered artifacts.

Apply the reviewed plan with:

```bash
terraform apply -input=false destroy.tfplan
```

`terraform destroy` is a convenience alias for destroy-mode apply, but the destroy command itself does not accept a saved plan argument. The saved `plan -destroy` plus `apply` workflow preserves the reviewed action set.

Avoid routine targeted destruction. A target can omit relationships outside the selected subgraph and should be reserved for exceptional, understood situations. Prefer changing configuration so the full plan describes the intended retirement.

Require stronger authorization for:

- stateful or regulated resources;
- organization identity and keys;
- shared networks and DNS zones;
- backup, archive, or audit stores;
- resources with deletion protection being disabled;
- plans containing unexpected creates or replacements during retirement.

## Handle Partial Destruction

Cloud deletion is asynchronous and can fail after some resources disappear. Persist action status and provider request identifiers. If apply fails:

1. stop newer mutations to the state;
2. retain complete logs and the saved plan securely;
3. inspect Terraform state and the real control plane, and resolve ambiguous operations;
4. fix the cause, such as a live dependency or retention lock;
5. create a fresh saved destroy plan, not a normal plan that can propose recreating deleted objects, to reconcile what remains;
6. review and apply the new plan.

Do not rerun ad hoc delete commands until an ambiguous timeout is resolved. A delete may have succeeded even when its response was lost.

## Verify Residual Cost and Access

Terraform can remove only what its state and providers manage. After apply, search for residue by service, account, tag, owner, and billing dimension:

- unattached disks, snapshots, images, and object versions;
- reserved public IP addresses and network gateways;
- load balancers, DNS records, certificates, and private endpoints;
- backup vault copies and cross-region replicas;
- log archives and monitoring workspaces;
- service accounts, roles, policies, keys, and secrets;
- queues, topics, webhooks, and scheduled jobs;
- support plans, marketplace subscriptions, reservations, savings commitments, and licenses;
- data transfer or minimum-retention charges.

Verify security posture too. An orphaned identity or trust policy can be more serious than an orphaned disk.

Billing data is delayed, so closure may need a pending-cost-verification state. Record an expected cost baseline and recheck after the provider's reporting window. Do not delete retained backups merely to make the immediate bill reach zero.

## Close with Negative Evidence

A complete closeout proves:

- expected endpoints no longer resolve or accept traffic;
- retired credentials cannot authenticate;
- the old resource IDs are absent or in their documented retained state;
- remaining Terraform configurations have no unexplained plan;
- monitoring and catalog entries were retired or redirected;
- retained backups still have owners, keys, expiry, and restore procedures;
- cost reports match expected residual retention charges;
- rollback has expired or responsibility transferred to restoration.

Keep the decommission record longer than ordinary deployment logs when legal, audit, or data-retention decisions depend on it.

## Official Documentation

- [HashiCorp infrastructure decommissioning guidance](https://developer.hashicorp.com/well-architected-framework/optimize-systems/lifecycle-management/decommission-infrastructure)
- [Terraform destroy command](https://developer.hashicorp.com/terraform/cli/commands/destroy)
- [Destroy a Terraform-managed resource](https://developer.hashicorp.com/terraform/language/resources/destroy)
- [Terraform lifecycle and prevent_destroy](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform removed blocks](https://developer.hashicorp.com/terraform/language/block/removed)
- [HashiCorp disaster recovery and restore testing](https://developer.hashicorp.com/well-architected-framework/design-resilient-systems/principles/disaster-recovery)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [AWS provider DB instance resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)

## Conclusion

Safe decommissioning is a proof pipeline. Quarantine first, demonstrate a usable recovery copy, remove every live dependency, review one exact destroy plan, and then search for financial and security residue. Automation should make missing evidence block deletion and make partial progress resumable. That is how a destroy operation becomes a controlled retirement rather than an irreversible guess.
