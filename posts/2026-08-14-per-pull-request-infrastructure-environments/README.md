# Build Self-Cleaning Infrastructure Environments for Every Pull Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Preview Environments, Infrastructure as Code, Terraform, GitHub Action, CI/CD, Resource Cleanup

Description: Create isolated pull-request environments with stable identity, serialized state, trusted credentials, expiry leases, and cleanup that survives canceled workflows.

---

A per-pull-request infrastructure environment is a reconciliation problem, not just a workflow that runs `terraform apply`. Pull requests receive new commits, workflows are canceled or rerun, branches are renamed, forks may be untrusted, and close events can arrive after a runner or provider failure.

Give the environment a stable identity based on repository and pull-request number. Serialize every state mutation, record an expiry lease, and run teardown from trusted default-branch code. A scheduled reconciler must remove expired environments even when the close workflow never finishes.

## Define the Lifecycle as Desired State

Model a small state machine:

```text
pull request opened or updated
  -> desired environment exists at current approved commit

pull request closed
  -> desired environment is absent

lease expired without renewal
  -> desired environment is absent
```

The controller may be GitHub Actions, another CI system, or a platform service. The important property is idempotence: replaying an event converges to the same desired state instead of creating another environment.

Use a stable identifier such as `repository-id/pr-number`. Do not key ownership only by branch name because branches can be renamed, reused, or deleted before teardown. Include the deployment attempt and commit as metadata, not as the long-lived environment identity.

## Allocate State, Names, and Ownership Together

Derive one backend key and name prefix from the stable environment identity:

```text
state key: previews/example-service/pr-184/terraform.tfstate
name:      example-service-pr-184
hostname:  pr-184.preview.example.net
```

Sanitize all user-controlled strings and keep them out of backend path traversal. Use provider-valid tags or labels for repository, pull-request number, current commit, owner, and managed-by metadata. Store values such as the environment URL and ISO 8601 expiry in annotations or the ownership record when label syntax is too restrictive.

The state key belongs to the preview for its entire life. All updates and destroy operations use it. Different pull requests never share a Terraform workspace, working directory, mutable namespace, database schema, queue, or DNS record.

When the selected backend supports it, Terraform state locking protects one state from concurrent writers, but CI must still serialize planning and applying. A lock timeout is not a workflow scheduler, and force-unlocking an active run can allow multiple writers and corrupt state.

## Serialize Updates Without Applying Stale Commits

GitHub Actions concurrency groups can limit a repository to one running and one pending job in a group, and `cancel-in-progress` can cancel a running job. Cancellation is useful for cheap plan-only work, but terminating a Terraform apply can leave partially created resources.

Use a concurrency group per preview and avoid canceling a mutating apply in progress:

```yaml
concurrency:
  group: preview-${{ github.repository_id }}-${{ github.event.pull_request.number }}
  cancel-in-progress: false
```

GitHub does not guarantee execution order within a concurrency group. Immediately before apply, query the pull request through trusted workflow logic and verify that the intended commit is still the approved head and the pull request remains open. A queued stale run should exit and let a newer reconciliation proceed.

An even stronger design sends events to a controller that stores only the latest desired commit per preview. Workers reconcile that desired record under a lease. CI event delivery then becomes a trigger rather than an ordered command log.

Never have two jobs run `apply` and `destroy` against the same state concurrently. Close processing should acquire the same per-preview reconciliation lock as updates.

## Separate Untrusted Code From Privileged Deployment

Pull requests from forks do not normally receive repository secrets. Do not bypass that boundary by executing untrusted code in a privileged `pull_request_target` workflow.

Choose an explicit trust model:

- deploy previews only for branches in the repository;
- require maintainer approval tied to the exact fork head SHA before that commit can enter a trusted build, and invalidate approval when the head changes;
- build an immutable reviewed artifact in an unprivileged workflow, then let a trusted workflow deploy that exact digest;
- restrict Terraform changes to additional review before credentials are issued.

Terraform modules and providers run with the privileges of the Terraform process. A policy scanner helps, but it cannot make arbitrary untrusted configuration safe to execute with cloud credentials.

Use OIDC or the cloud's workload identity federation to obtain short-lived credentials. Restrict the trust policy by repository and a protected GitHub environment for pull-request jobs, or by repository and branch for trusted non-pull-request jobs. Grant access only to the dedicated preview account or project. Preview CI must not have a production role.

## Build a Small, Representative Environment

A preview should prove the pull request's behavior without cloning every production dependency. Decide what is shared and what is isolated:

- shared immutable base network or cluster, with per-preview namespaces and quotas;
- dedicated application resources, identities, routes, DNS name, and test data;
- stub or sandbox integrations for payments, email, and external side effects;
- a small database or schema with synthetic data and a migration policy;
- production-like TLS, ingress, and workload identity when those paths matter.

Sharing a Kubernetes cluster does not make namespaces a complete security boundary. Apply ResourceQuota, NetworkPolicy backed by a network plugin that enforces it, service-account permissions, admission policy, and restrictions on cluster-scoped objects according to the threat model.

Use small resource shapes and limit concurrent previews. Some managed services have long create and delete times; consider a shared sandbox fixture only when its mutable state can be partitioned safely.

## Reconcile on Open, Update, and Close

The create or update workflow should:

1. authorize the pull request and resolve the exact approved commit;
2. acquire the per-preview reconciliation lock or lease that serializes the entire run;
3. keep that reconciliation lock or lease renewed during long operations;
4. initialize with pinned Terraform and providers;
5. create and save a non-speculative plan against the existing preview state using backend locking;
6. apply that saved plan only if the commit is still current and policy passes;
7. run a bounded smoke test from the right network and identity;
8. after successful reconciliation, renew the environment's hard expiry;
9. publish a sanitized URL and status, and release the reconciliation lock in a cleanup path while keeping the ownership record.

The close workflow should use teardown orchestration from the protected default branch, not scripts from the branch that is being deleted, and retain or reconstruct trusted Terraform and provider configuration compatible with the preview state. It should acquire the same reconciliation lock, re-read the pull request's desired state, proceed only if it remains closed, run state-aware destroy, remove DNS and external records, verify deletion, and mark the ownership record closed.

Do not trust a pull-request comment as the only ownership record. Comments can fail while infrastructure exists, and they can outlive or be edited independently from state.

## Make Expiry an Independent Backstop

A close event is not guaranteed to complete. CI may be unavailable, the cloud API may throttle, the runner may lose network access, or a retention setting may block deletion.

Every preview expiry record needs:

- stable preview ID;
- state location;
- current commit and run URL;
- owner and repository;
- last successful renewal;
- hard expiry and optional grace period;
- cleanup status and last error.

Run a scheduled reconciler from trusted, independently credentialed code. It inventories expired records, acquires the same per-preview reconciliation lock, re-checks expiry after locking, retries normal Terraform destroy with the preserved state and trusted compatible Terraform and provider configuration, then performs service-specific cleanup only when ownership is unambiguous. Start in report-only mode and protect the shared baseline explicitly.

Pull requests that remain open for weeks should renew expiry only after successful reconciliation, not simply set an infinite expiry. Enforce a maximum lifetime or require periodic owner confirmation for costly previews.

## Handle Data and Migrations Deliberately

Never copy unredacted production data into a preview. Use synthetic fixtures or an approved anonymized dataset with its own retention controls.

Database migration previews need clear semantics:

- a per-preview database gives strong isolation but costs more;
- a schema per preview requires migration tooling and identities that cannot escape their schema;
- a shared mutable database can make tests order-dependent and should be avoided for destructive migrations.

Apply migration compatibility rules if application versions can overlap during deployment. Teardown must remove snapshots, backups, secrets, replicas, and external database users, not only the main database resource.

## Publish Useful Outputs Without Leaking State

Report the preview URL, commit, expiry, smoke-test result, and owner. Do not post saved plan files, plan JSON, state, credentials, internal addresses, or unrestricted logs to a public pull request. Terraform's saved plans and machine-readable output can contain sensitive values in plaintext.

Protect the URL appropriately. A preview that contains proprietary code or test data should require authentication even if it is temporary. Rate limits and web-application security controls still apply.

Keep status updates idempotent by editing one bot-owned check or comment rather than adding a new comment for every commit. The backend ownership record, including expiry, remains authoritative if publishing fails.

## Control Cost and Quota

Apply and, where required, activate cost-allocation tags before relying on them for reports. Track spend by preview ID and repository, enforce concurrency and maximum age, and alert on abnormal cost or resource count. A budget alert is useful but is not an immediate teardown mechanism.

Reserve capacity for deletion. If previews consume every address, interface, or cluster slot, cleanup and replacement can fail. Admission should reject a new preview before the account reaches the recovery reserve.

Measure create, update, smoke, and destroy duration; active and expired preview counts; cleanup error age; quota headroom; and cost per preview-day. These signals reveal when the platform needs pooling, faster fixtures, or a stricter admission policy.

## Official Documentation

- [GitHub Actions deployments, environments, and concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions pull request events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)
- [Terraform state locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform backend configuration](https://developer.hashicorp.com/terraform/language/backend)
- [Terraform sensitive data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [AWS guidance for tagging and cost tracking](https://docs.aws.amazon.com/solutions/tagging-on-aws/)

## Conclusion

A pull-request environment needs a stable identity and a reconciler, not a collection of best-effort workflow steps. Isolate state and mutable resources, serialize changes, deploy only trusted commits with short-lived credentials, and destroy from protected code. Expiry leases and a scheduled state-aware cleanup process make the environment self-cleaning even when CI cancellation or close handling fails.
