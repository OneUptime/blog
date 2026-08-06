# Validation Summary: Idempotent Infrastructure Automation After Partial Failure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Infrastructure reconciliation and idempotent API design
- Amazon EC2 client-token idempotency
- Google Cloud Storage retry preconditions
- Terraform CLI, state, imports, remote backends, and state locking
- Terraform Plugin Framework resource lifecycle and diagnostics
- PostgreSQL operation-ledger schema
- JSON and YAML checkpoint examples
- Conditional writes, retries, leased locks, and fencing tokens

## Sources Consulted
- [Amazon EC2 API idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html)
- [AWS Well-Architected Framework: Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [RFC 9110: HTTP Semantics, Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110: HTTP Semantics, Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [Terraform apply errors and partial-state behavior](https://developer.hashicorp.com/terraform/tutorials/cli/apply#errors-during-apply)
- [Terraform state and one-to-one object bindings](https://developer.hashicorp.com/terraform/language/state)
- [Terraform import command reference](https://developer.hashicorp.com/terraform/cli/commands/import)
- [Terraform plan command reference](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform state locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform Plugin Framework create behavior](https://developer.hashicorp.com/terraform/plugin/framework/resources/create)
- [Terraform Plugin Framework errors and state persistence](https://developer.hashicorp.com/terraform/plugin/framework/diagnostics#how-errors-affect-state)
- [PostgreSQL `CREATE TABLE` reference](https://www.postgresql.org/docs/current/sql-createtable.html)
- [Martin Kleppmann: How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)

## Issues Found
- The operation-ledger section implied that a conditional status transition alone prevents a previously active worker from resuming after a timeout. It now states the narrower guarantee: compare-and-set transitions prevent two workers from committing the same transition, while stale-worker exclusion requires fencing.
- The restartable-step section said a replacement worker always observes and never sends another create request. Some APIs provide idempotent replay but no lookup by client token, so the text now permits resending the identical create request with the persisted token when the API explicitly documents that retry as safe.
- The locking section said fencing tokens prevent stale workers without stating the enforcement requirement. It now requires monotonically increasing tokens and validation of the token on every protected write and checkpoint update; a leased lock or token that downstream resources do not check cannot fence a resumed worker.

## Review Notes
- Both JSON examples parse successfully, and the YAML example preserves the quoted version and CIDR as strings.
- The PostgreSQL table definition executed successfully on PostgreSQL 14.17 and uses current `jsonb` and `timestamptz` types.
- The Terraform guidance is current. `-refresh-only`, `-replace`, and `-target` remain supported; HashiCorp documents `-target` for exceptional circumstances only. The Plugin Framework documentation also notes that a Create response containing an error marks the resource as tainted for recreation on the next plan.
- All links in the post resolve to the intended official documentation. The Google Cloud URL currently redirects to the corresponding `docs.cloud.google.com` page.
