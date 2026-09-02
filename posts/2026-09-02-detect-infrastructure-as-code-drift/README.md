# Why Does Infrastructure as Code Fail to Rebuild Production? Detecting Drift Before a Disaster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure as Code, Disaster Recovery, DevOps, Cloud

Description: Detect configuration drift and hidden rebuild dependencies before infrastructure as code is needed during a disaster.

---

Infrastructure as code (IaC) can reproduce only what it declares and can still access. Production often accumulates manual changes, imported resources, provider defaults, data created outside the stack, and dependencies that no longer exist. A normal deployment succeeding against an established environment does not prove a clean-region rebuild.

HashiCorp defines drift as changes to infrastructure outside the Terraform workflow. A refresh-aware plan can expose differences for managed attributes, but even a perfectly clean plan against the established environment does not prove that an unmanaged certificate or bootstrap secret will be available, or that the recovery region has sufficient quota.

## Understand the Three Different Views

For a Terraform-style workflow, compare:

1. **Configuration:** the desired resources and attributes in version control;
2. **State:** the tool's recorded mapping to remote objects;
3. **Observed infrastructure:** what provider APIs return now.

These views can differ for several reasons, only some of which are drift:

- configuration and state agree, remote object differs: out-of-band drift;
- configuration and remote object agree, state differs: state-management problem;
- configuration and state omit a remote object that production depends on: unmanaged dependency;
- all three agree for managed objects, clean rebuild fails: external prerequisite, nondeterminism, or unavailable artifact.

Do not collapse all four into “Terraform drift.”

## Why a Clean Rebuild Fails

Inventory failure classes deliberately:

### Unmanaged resources

Hand-created DNS records, certificates, firewall rules, service accounts, database parameters, dashboards, and peering connections may be required by production but absent from code.

### Mutable or missing artifacts

An image tag moved, a package repository dropped a version, a Helm chart disappeared, a base image became unsupported, or a bootstrap script downloads “latest.”

### Hidden provider and platform defaults

Critical attributes omitted from configuration may inherit a changing default. HashiCorp notes that HCP Terraform health-assessment drift detection reports changes only to resource attributes defined in configuration; explicitly declare operationally critical settings.

### Credentials and trust

The state backend, secret manager, certificate authority, source repository, artifact registry, or cloud organization may be unavailable from the recovery site. Circular bootstrap dependencies are common: IaC needs a runner whose network and identity IaC was expected to create.

### Quota, capacity, and naming constraints

The target region may lack quota or physical capacity. Global names may still belong to the failed environment. CIDR ranges may collide with restored networks.

### Stateful services

IaC creates an empty database or bucket correctly, but no orchestration selects and restores the required recovery point.

### Imperative history

Production reached its current state through schema migrations, one-time jobs, operator commands, or ordered upgrades that a declaration does not encode.

## Run Read-Only Drift Detection

With Terraform 0.15.4 or later:

~~~bash
terraform init -input=false
terraform plan -refresh-only -detailed-exitcode -out=drift.tfplan
terraform show -json drift.tfplan > drift.json
~~~

A refresh-only plan proposes updates to Terraform's recorded state so it matches remote objects; it does not propose changing remote objects. With `-detailed-exitcode`, Terraform returns `0` for an empty diff, `1` for an error, and `2` for a successful non-empty diff. CI wrappers must preserve `2` as the drift signal rather than treating it as a generic command failure, and should run `terraform show` only after a plan was created successfully.

Review the output. Do not automatically apply a refresh-only result simply to make an alert disappear, because that records observed changes without deciding whether configuration should accept or reverse them.

Also run a normal speculative plan to see what the declared configuration would change. Protect both the binary plan and JSON output because state and provider values can contain sensitive data.

Other IaC tools need equivalent read-only comparisons. The important properties are current provider reads, no mutation, retained evidence, and an owner who can classify differences.

## Detect What State Cannot See

Build an independent dependency inventory from:

- runtime connection telemetry and DNS query logs;
- cloud resource graph and configuration inventory;
- load balancer targets and firewall flows;
- certificate and secret references;
- service catalog dependencies;
- deployment and incident history;
- restore and startup logs.

Compare that inventory with resources and data sources declared in code. Every critical runtime dependency should be one of:

- created by the recovery stack;
- restored by a named data-recovery step;
- consumed as a declared external prerequisite with owner and recovery objective;
- explicitly optional in the documented degraded mode.

## Make a Clean-Room Rebuild the Strong Test

On a schedule and after material platform changes:

1. create a new isolated account, project, subscription, or region boundary;
2. start with only documented bootstrap identity and state access;
3. pin IaC CLI, provider, module, chart, and package versions, and pin container images by digest;
4. run the recovery stack without borrowing production resources;
5. restore a representative recovery point and production-like data volume through the runbook;
6. start the application and execute synthetic business transactions;
7. measure time from the simulated service interruption through acceptance, including detection and authorization;
8. destroy exact test-run resources and retain evidence.

This finds missing declarations and circular prerequisites that a plan against production cannot.

## Add Continuous Controls

Use several complementary gates:

~~~yaml
pull_request:
  - format_and_static_checks
  - provider_lock_verification
  - speculative_plan
scheduled:
  - refresh_aware_drift_plan
  - unmanaged_resource_inventory_diff
  - certificate_and_secret_expiry_check
  - quota_and_capacity_check
quarterly_or_on_material_change:
  - isolated_clean_room_rebuild
  - data_restore
  - business_acceptance_test
~~~

Pin dependencies but also rehearse planned upgrades; indefinitely pinned artifacts can become unavailable or insecure. Archive critical images and modules in a controlled registry where licensing and vendor guidance permit.

NIST SP 800-128 describes security-focused configuration management as part of managing system risk. Treat drift exceptions as time-bounded changes with an owner, reason, approval, and reconciliation deadline.

## Safe Reconciliation

For each difference, choose deliberately:

- **revert remote change** by applying reviewed configuration;
- **accept change** by updating configuration and then reconciling state;
- **import existing resource** by declaring it in configuration and importing it into state;
- **declare external prerequisite** with monitoring and recovery ownership;
- **remove obsolete dependency** after runtime validation.

Never bulk-import or auto-apply an unexplained plan during an incident. A normal plan can include destructive replacement, and provider credentials scoped to the wrong account can produce misleading observations.

## Acceptance Criteria

The recovery IaC is credible when:

- scheduled read-only comparisons have no unowned drift;
- critical runtime dependencies map to code, restore steps, or explicit prerequisites;
- IaC CLI, provider, module, chart, and package versions are pinned, container images are digest-pinned, and all are retrievable;
- state, secrets, certificates, repositories, and bootstrap runners are recoverable independently;
- target-region quota, address space, names, and capacity are checked;
- a clean-room build plus data restore completes inside RTO;
- a business transaction passes without undocumented manual changes;
- every exception has an owner and expiry.

IaC is a powerful recovery mechanism, but only a clean build demonstrates reproducibility. Drift detection is the early warning; isolated reconstruction is the proof.

## Official References

- [HashiCorp Terraform: Manage resource drift](https://developer.hashicorp.com/terraform/tutorials/state/resource-drift)
- [HashiCorp Terraform: plan command and refresh-only mode](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [HashiCorp Terraform: Use health assessments to detect drift](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-detection)
- [NIST SP 800-128: Guide for Security-Focused Configuration Management](https://csrc.nist.gov/pubs/sp/800/128/upd1/final)
- [AWS Well-Architected Framework: Manage configuration drift at the recovery site](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_config_drift.html)
