# Validation Summary: Detect Infrastructure as Code Drift Before Disaster Recovery

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Infrastructure as code and configuration drift
- HashiCorp Terraform CLI, configuration, state, plans, imports, and dependency locking
- HCP Terraform health-assessment drift detection
- CI/CD control design and YAML
- Container images, Helm charts, modules, packages, and artifact pinning
- Cloud disaster recovery, clean-room rebuild testing, RTO, data restoration, quotas, and capacity
- NIST security-focused configuration management
- AWS Well-Architected disaster-recovery practices

## Sources Consulted

- [HashiCorp Terraform: `terraform init` command](https://developer.hashicorp.com/terraform/cli/commands/init)
- [HashiCorp Terraform: `terraform plan` command and refresh-only mode](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [HashiCorp Terraform: `terraform show` command](https://developer.hashicorp.com/terraform/cli/commands/show)
- [HashiCorp Terraform: `terraform refresh` command](https://developer.hashicorp.com/terraform/cli/commands/refresh)
- [HashiCorp Terraform: Manage resource drift](https://developer.hashicorp.com/terraform/tutorials/state/resource-drift)
- [HashiCorp Terraform: Purpose of Terraform state](https://developer.hashicorp.com/terraform/language/state/purpose)
- [HashiCorp Terraform: Use health assessments to detect infrastructure drift](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-detection)
- [HashiCorp Terraform: Import existing infrastructure resources](https://developer.hashicorp.com/terraform/cli/import)
- [HashiCorp Terraform: Dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [HashiCorp Terraform: `check` block reference](https://developer.hashicorp.com/terraform/language/block/check)
- [HashiCorp Terraform: Manage sensitive data](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Kubernetes: Container images, tags, and digests](https://kubernetes.io/docs/concepts/containers/images/)
- [AWS Well-Architected REL13-BP01: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Well-Architected REL13-BP03: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
- [AWS Well-Architected REL13-BP04: Manage configuration drift at the DR site or Region](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_config_drift.html)
- [AWS Well-Architected REL09-BP04: Perform periodic data recovery to verify backup integrity and processes](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html)
- [AWS Well-Architected REL01-BP02: Manage service quotas across accounts and Regions](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_manage_service_limits_limits_considered.html)
- [Amazon EC2: Troubleshoot instance launch issues](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html)
- [NIST SP 800-128: Guide for Security-Focused Configuration Management of Information Systems](https://csrc.nist.gov/pubs/sp/800/128/upd1/final)

## Issues Found

- **Overstated limitation of a clean plan:** The post said a clean plan cannot detect a missing bootstrap secret or exhausted quota. Declared data sources and validation checks can detect some such conditions. The text now makes the narrower, accurate claim that a clean plan against the established environment does not prove those prerequisites or sufficient quota will be available in the recovery environment.
- **Overbroad definition of drift:** The post said drift exists whenever configuration, state, and observed infrastructure differ. An intentional but unapplied configuration change is a difference without being drift. The text now states that only some differences among the three views are drift.
- **Incorrect unmanaged-dependency case:** The post classified an object present in Terraform state and remotely but omitted from configuration as unmanaged. Terraform still tracks that object and normally plans to destroy it when its resource block is removed. The case now correctly describes a production dependency omitted from both configuration and state.
- **HCP-specific behavior presented generically:** The statement that drift detection reports only attributes defined in configuration comes from HCP Terraform health-assessment documentation. It is now explicitly scoped to HCP Terraform health-assessment drift detection rather than all Terraform CLI refresh-only behavior.
- **Mutable image references:** The clean-room procedure said to pin image versions, but container tags, including version-looking tags, can move. It now requires digest-pinning container images, and the acceptance criterion was updated consistently.
- **Incomplete RTO and restore test:** Timing from recovery authorization can omit detection and decision time even though RTO runs from service interruption to restoration. The procedure now measures from the simulated interruption through acceptance, including detection and authorization. It also calls for a representative recovery point and production-like data volume so restore timing is meaningful.
- **Incomplete import guidance:** Importing into state alone is not sufficient to manage an object reproducibly. The reconciliation option now requires declaring the resource in configuration and importing it into state.

## Review Notes

- The Terraform commands and flags are valid. Terraform 0.15.4 is the correct introduction point for `-refresh-only`; the version is a historical minimum, not a recommendation to run the obsolete 0.15 release line.
- The documented `-detailed-exitcode` values are correct. Exit code `2` means any successful non-empty plan, including output-only changes, so the retained plan still needs classification as the post recommends.
- The warning about sensitive binary plan and JSON content is correct. Saved plans can contain sensitive values in cleartext, and `terraform show -json` exposes sensitive state values in plaintext.
- The YAML control matrix parses as valid YAML but is intentionally platform-neutral rather than a ready-to-run workflow for a specific CI provider.
- All references in the post resolve to the intended authoritative pages; the author URL redirects to the intended GitHub profile.
- Capacity checks are point-in-time evidence because physical cloud capacity can change. The scheduled checks and clean-room tests improve confidence but do not reserve disaster-time capacity.
- NIST SP 800-128 supports controlled, monitored configuration management. The specific owner-and-expiry policy for drift exceptions is an operational recommendation in the post, not a quoted NIST requirement.
