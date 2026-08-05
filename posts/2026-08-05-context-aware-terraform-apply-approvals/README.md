# Who Should Approve Terraform Apply?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, CI/CD, Change Management, Approvals, Infrastructure as Code, Governance

Description: Assign Terraform apply approvals by risk and operational context, present the exact evidence reviewers need, and automate gates that humans should not decide.

---

A manual Terraform gate is useful only when the approver can answer a question that automation cannot. A generic "someone clicked approve" checkpoint adds delay without proving that the plan is safe, intended, or recoverable.

The right approver depends on what the plan changes. A network route needs network context. A database replacement needs a data owner and an operator who understands recovery. A routine tag update may need no human approval after policy checks pass.

Design the gate around decisions, not job titles.

## Separate Four Different Responsibilities

Many approval processes become confused because one button represents several responsibilities:

1. **Code review** asks whether the Terraform configuration is maintainable and expresses the intended design.
2. **Policy evaluation** asks whether the plan complies with machine-testable security, cost, and platform rules.
3. **Change authorization** asks whether this exact change may happen to this environment now.
4. **Operational acceptance** asks whether impact, observation, and recovery are ready.

One person can hold more than one role for a low-risk environment, but the system should record which decision each check represents. A pull request approval of HCL is not automatically approval of a later, different execution plan.

## Start with the Exact Plan

The approval subject must be the non-speculative plan that apply will execute, not a screenshot, an old pull request comment, or a fresh plan generated after approval.

Produce and retain:

```bash
terraform plan -input=false -out=tfplan
terraform show -no-color tfplan > tfplan.txt
terraform show -json tfplan > tfplan.json
sha256sum tfplan
```

Saved plan files and their JSON representation can contain sensitive values. Store them as restricted, short-lived artifacts, never in version control or a broadly visible ticket. Render a redacted human view while keeping the runnable artifact protected.

The approval record should bind all of these values:

```yaml
environment: payments-production
workspace: payments-prod-eu
configuration_commit: 4d3c2b1f
plan_sha256: 9b6f31f0...
terraform_version: 1.x.y
created_at: 2026-08-05T09:20:00Z
expires_at: 2026-08-05T11:20:00Z
change_ticket: CHG-18472
```

If the configuration, input variables, provider lock file, state, target environment, or runnable plan changes, invalidate approval. Do not silently regenerate and apply.

## Classify the Plan by Consequence

Static labels such as "production always needs two approvals" are easy to administer but often send low-value decisions to senior reviewers while missing the specialist required for a risky change.

Classify using plan and environment evidence:

| Risk | Examples | Suggested decision |
|---|---|---|
| Low | additive non-production resource, metadata-only update, no privilege or network effect | automatic after tests and mandatory policy |
| Moderate | in-place production change, bounded capacity adjustment, reversible routing weight change | service owner or current operator |
| High | replacement, delete, public exposure, IAM expansion, shared network, stateful service change | domain owner plus operational approver |
| Critical | organization identity, key management, backup deletion, production data store destruction, broad outage potential | independent domain specialist and incident-capable change authority |

Do not infer safety only from Terraform's action symbols. An in-place IAM policy expansion can be more dangerous than recreating a disposable test instance. Add semantic classifiers for resource type, attributes, environment, data classification, dependency reach, and recovery time.

Keep the classifier version and its evidence in the run record. A human should see why a plan entered a risk tier and be able to reject a misclassification.

## Match Approvers to the Decision

Use an approver matrix rather than one permanent group:

```yaml
rules:
  - when: environment != "production" && destructive_changes == 0
    approvers: []
  - when: changes_only == ["capacity"]
    approvers: [service_owner_or_on_call]
  - when: touches == ["network-routing"]
    approvers: [network_owner, affected_service_owner]
  - when: destroys_stateful_resource == true
    approvers: [data_owner, incident_commander_capable_operator]
  - when: expands_privilege == true
    approvers: [security_or_identity_owner]
```

This is a governance model, not syntax for a particular CI product. Implement the rules in a reviewed policy service or deployment protection integration.

Good approvers have:

- access to the exact plan and supporting evidence;
- enough domain knowledge to identify indirect impact;
- authority to accept the remaining risk;
- no unresolved conflict of interest;
- time to monitor or a named handoff to the person who will;
- a tested recovery path and access to invoke it.

Avoid requiring a senior title when a current on-call engineer has better operational context. Avoid letting a requester self-approve a high-risk production change merely because they have administrator permission.

## Put Context in the Approval Packet

An approver should not have to reconstruct the change from five systems. Present one concise packet:

### Identity and Scope

- requester, code reviewers, and automation identity;
- environment, account, region, workspace, and state boundary;
- commit, plan digest, Terraform and provider versions;
- change window and approval expiration.

### Plan Summary

- create, update, replace, delete, read, import, and forget counts;
- exact addresses of destructive or replacement actions;
- before and after values for risk-relevant attributes;
- unknown values and provider-computed decisions;
- drift discovered during planning, separated from requested changes.

### Automated Evidence

- formatting, validation, module tests, and policy results;
- security and IAM analysis;
- cost estimate with known limitations;
- backup and restore evidence where data is at risk;
- dependency health and freeze status;
- confirmation that the reviewed plan artifact is the apply input.

### Operations

- expected user-visible impact;
- metrics and logs to watch;
- abort criteria and decision owner;
- rollback, roll-forward, or restoration procedure;
- estimated apply and recovery duration.

An approval comment should capture a reason or acknowledged risk, not only a Boolean. A rejection should be equally easy and must stop the run without exposing protected credentials.

## Automate Facts, Escalate Judgment

Humans are poor at repeatedly checking rules such as "all storage must be encrypted" or "no public ingress from `0.0.0.0/0`". Put deterministic rules into mandatory policy checks or run tasks.

Reserve human attention for questions such as:

- Is this planned outage acceptable during the current business event?
- Does the stated recovery method satisfy this dataset's actual RPO and RTO?
- Is a temporary privilege expansion justified by the incident?
- Are dependent teams ready for this routing migration?
- Does a technically valid deletion match the product's retirement decision?

In HCP Terraform, workspace permissions distinguish planning from applying. The Plan permission can queue and inspect plans, while Apply permission allows approval and apply. Use separate teams or custom roles so proposing a change does not automatically confer production authorization. Mandatory run tasks can evaluate external evidence before apply.

## Understand the CI Product's Semantics

GitHub Actions environments can require reviewers, prevent self-review, restrict deployment branches, delay jobs, and disallow administrator bypass. Environment secrets are not made available to a waiting job until a required reviewer approves it.

However, current GitHub documentation states that an environment can list up to six users or teams and only one listed reviewer needs to approve. Do not model "network and security must both approve" by simply listing both groups and assuming two approvals. Use separate protected stages, a custom deployment protection rule, or an external authorization service that enforces the required conjunction.

A minimal job binding apply to a protected environment looks like:

```yaml
jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Apply reviewed plan
        run: terraform apply -input=false tfplan
```

Configure required reviewers, self-review prevention, branch restrictions, and bypass behavior in the environment settings. The YAML alone does not define those protections.

GitLab protected environments likewise separate who may deploy and can require deployment approvals. Verify the exact behavior and subscription tier of your chosen platform instead of copying a generic gate.

## Make Approval Time-Bound

Infrastructure changes are context-sensitive. An approval made before another incident, state change, maintenance freeze, or dependency failure may no longer be valid.

Set an explicit expiry based on risk and rate of environmental change. At apply time, re-check:

- plan identity and digest;
- approval count and required roles;
- approver eligibility now, not only at click time;
- change window and freeze status;
- mandatory policies and external health gates;
- state freshness or platform stale-plan status;
- whether an emergency or conflicting run started.

Expiration should discard or re-plan, never auto-extend.

## Design a Separate Emergency Path

A break-glass path may reduce normal approval requirements when delay creates greater harm, but it should not disguise an ordinary expedited change. Require an incident identifier, narrow time-limited access, high-priority notification, complete audit data, and mandatory post-incident reconciliation.

Do not make the same people who can change approval policy the routine approvers of changes governed by that policy. Delegate policy override permission separately and review every use.

## Measure Whether Gates Help

Track outcomes, not approval volume:

- time waiting for approval by risk tier;
- percentage of plans rejected or changed after review;
- incidents caused by approved changes;
- approvals invalidated by stale context;
- emergency bypass frequency;
- plans where the required domain specialist was unavailable;
- low-risk plans eligible for automation;
- reviewer load and after-hours interruptions.

A gate that never changes a decision may be checking the wrong thing or providing poor evidence. A gate that blocks frequently for missing metadata should move those requirements earlier into CI.

## Approval Design Checklist

- Bind approval to one exact, protected plan artifact.
- Invalidate approval when any plan input or operational condition changes.
- Classify risk using semantic impact, not only action counts.
- Route to domain and operational context, not a generic seniority group.
- Prevent self-approval for high-risk changes.
- Automate deterministic policy and evidence checks.
- Verify whether the CI system requires one reviewer or all required roles.
- Expire approvals and re-check eligibility at apply time.
- Keep emergency authorization separate and auditable.
- Review metrics and remove gates that add no decision value.

## Official Documentation

- [Terraform plan command and saved plans](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform show command and sensitive JSON output](https://developer.hashicorp.com/terraform/cli/commands/show)
- [HCP Terraform workspace permissions](https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace)
- [HCP Terraform run tasks](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks)
- [GitHub Actions deployment environments and required reviewers](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Actions environment configuration](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitLab protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

## Conclusion

Terraform approval should connect an exact plan to the person best placed to judge its remaining risk. Let policy engines verify repeatable facts, route material decisions to domain and operational owners, and invalidate approval when context changes. The result is fewer ceremonial clicks and stronger evidence that the approved change is intended, timely, and recoverable.
