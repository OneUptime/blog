# Validation Summary: Build Self-Cleaning Infrastructure Environments for Every Pull Request

## Status
validated

## Post Type
Technical architecture and implementation guide

## Technologies Covered
- GitHub Actions pull-request workflows and concurrency groups
- GitHub Actions OIDC, environments, and fork security
- Terraform backends, state locking, planning, applying, and destroy workflows
- Kubernetes namespaces, quotas, network policies, RBAC, and admission policy
- Preview-environment leases, reconciliation, and resource cleanup
- Database isolation and migration strategies
- Cloud resource tagging, cost allocation, quotas, and budgets

## Sources Consulted
- [GitHub Actions: Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#github-context)
- [GitHub Actions events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)
- [GitHub Actions: Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [GitHub Actions: Approving workflow runs from forks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions workflow cancellation reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation)
- [Terraform state locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform backend configuration](https://developer.hashicorp.com/terraform/language/backend)
- [Terraform: Running in automation](https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform)
- [Terraform `plan` command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform `apply` command](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [Terraform providers within modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [HCP Terraform security model](https://developer.hashicorp.com/terraform/cloud-docs/architectural-details/security-model)
- [Terraform sensitive-data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Kubernetes labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- [Kubernetes Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [PostgreSQL database roles and isolation overview](https://www.postgresql.org/docs/current/manage-ag-overview.html)
- [PostgreSQL schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [AWS: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS guidance for tagging and cost tracking](https://docs.aws.amazon.com/solutions/tagging-on-aws/)

## Issues Found
- Some metadata was described as suitable for either tags or labels, but Kubernetes label values cannot contain full URLs or typical ISO 8601 timestamps. The text now directs readers to provider-valid tags or labels and to annotations or the ownership record for values that exceed label syntax.
- The force-unlock warning referred to corrupting ownership. It now states the documented risk: force-unlocking an active operation can permit multiple writers and corrupt Terraform state.
- Maintainer approval for a fork was described as a label without binding it to a commit. The trust-model guidance now ties approval to the exact fork head SHA and invalidates it when the head changes.
- The OIDC guidance could imply that the default branch subject applies to pull-request jobs. It now distinguishes protected-environment subjects for pull-request jobs from branch subjects for trusted non-pull-request jobs.
- The Kubernetes security guidance omitted that NetworkPolicy has no effect without a network plugin that enforces it. That requirement is now explicit.
- The workflow steps conflated Terraform's automatic, command-scoped backend lock with the longer-lived reconciliation lease and with the environment's expiry record. The revised steps distinguish those mechanisms, keep the reconciliation lease renewed during long work, and renew hard expiry only after success.
- The plan and apply steps did not require applying the same plan that passed policy. They now save a non-speculative plan and apply that exact saved plan after revalidating the approved commit; the output guidance also treats saved plans as sensitive artifacts.
- Close and expiry cleanup could act on stale desired state after waiting for a lock. Both paths now use the same reconciliation lock and re-check the relevant pull-request state or expiry before destroying resources.
- Preserved Terraform state alone is insufficient for a reliable destroy if the required provider configuration is no longer available. Teardown now explicitly retains or reconstructs trusted, compatible Terraform and provider configuration.
- The statement that a shared mutable database necessarily makes tests order-dependent was too categorical. It now says that shared mutable state can cause that behavior.
- AWS user-defined tags do not appear in cost reports merely because they are attached to resources; they must also be activated as cost-allocation tags. The cost guidance now accounts for platform-specific activation.

## Review Notes
The GitHub Actions concurrency snippet is valid for pull-request events: `github.repository_id` is documented, the pull-request number is present in the event payload, and the default concurrency queue allows one running and one pending run while replacing an older pending run. GitHub does not guarantee dispatch ordering, so the post's desired-state rechecks remain necessary.

Terraform CLI selection must be pinned by CI and constrained with `required_version`; provider repeatability depends on committing `.terraform.lock.hcl`. Terraform's dependency lock file does not lock remote module versions, so fully reproducible builds should use exact registry module versions or immutable VCS references. No deprecated commands or configuration fields were found, and every external link in the post returned HTTP 200 and resolved to the intended official page.
