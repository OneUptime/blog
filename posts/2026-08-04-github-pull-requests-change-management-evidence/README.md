# Can GitHub Pull Requests Prove SOC 2 Change Management?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, GitHub, Change Management, Pull Requests, Audit Evidence, CI CD, Branch Protection

Description: Turn GitHub pull requests into defensible change-management evidence by proving enforcement, review, test status, merge identity, and production deployment.

---

A GitHub pull request can be strong evidence for a SOC 2 change-management control. It can show the proposed diff, author, reviewer decisions, status checks, conversation, commits, and merge event. It does not, by itself, prove that every production change used the workflow or that the reviewed commit is the code that reached production.

Auditors test the control management actually describes. If the control promises authorized review and successful testing before production deployment, the evidence chain must connect repository rules, the pull request, the exact commit, and the deployment. A screenshot of an approved pull request proves only the visible facts at capture.

## Write a Control GitHub Can Actually Support

Avoid vague wording such as `all code is peer reviewed`. Define the activity, scope, authority, timing, and exceptions. For example:

```text
For in-scope production repositories, changes to the default branch are merged
through a pull request after approval by an authorized reviewer. The most recent
reviewable push is approved by someone other than the person who made that push,
and designated checks reach the outcomes defined by the control. The released
commit is linked to the production deployment. Emergency changes use the
documented emergency process and receive retrospective review.
```

That wording is only appropriate if configuration and practice match it. GitHub supports several relevant options, including required reviews, code-owner review, stale-approval dismissal, required approval of the most recent reviewable push, required status checks, deployment requirements, merge queues, restrictions, and ruleset bypass controls. None is universally required by SOC 2.

Select settings from risk and service commitments, then state only what is consistently enforced.

## A Pull Request Proves Several Separate Attributes

For each sampled change, preserve evidence of:

| Attribute | Useful GitHub or delivery evidence |
| --- | --- |
| Change identity | Repository, pull-request number, head and merge commit SHAs |
| Request and rationale | Pull-request description, linked issue, change ticket |
| Author | GitHub identity mapped to workforce identity |
| Review | Submitted approval, reviewer identity, timestamp, reviewed commit state |
| Reviewer authority | Team membership, role, or CODEOWNERS applicability at the time |
| Separation | Author, last pusher, reviewer, and merger relationships |
| Testing | Required check names, conclusions, run IDs, and commit SHA |
| Merge | Protected target branch, merge timestamp, method, and actor |
| Deployment | Environment, deployment ID, deployed SHA, timestamp, result |
| Exception handling | Emergency or bypass authorization and follow-up review |

The green `Merged` label is not evidence for every row. Collect native API data and system records when practical so stable IDs and timestamps remain available.

## Prove the Rule Was Enforced

An approved pull request shows a review happened for that item. It does not show the branch required review. Preserve the historical rule configuration for the period:

- repository and ruleset inventory;
- target branch patterns;
- required approving-review count;
- code-owner requirement where used;
- stale-review or last-push approval settings;
- required status-check names;
- administrator or role bypass settings;
- force-push and deletion settings;
- rule changes and the actors who made them.

GitHub's documentation warns that a request-changes review is not necessarily blocking unless a relevant ruleset or branch-protection rule is configured. Administrators or authorized roles may also have bypass capabilities depending on configuration. Evidence must reflect the effective rules, not a team's assumption.

Configuration screens generally show current state. For a historical Type II period, use audit-log events, configuration exports, infrastructure-as-code history, or other versioned records to establish when settings changed.

Determine the effective configuration rather than preserving one rule in isolation. GitHub allows only one branch-protection rule to apply to a branch at a time, while multiple rulesets can apply and layer with branch protection. When layered rules define the same requirement differently, GitHub applies the most restrictive version. Preserve the target patterns, enforcement status, and bypass actors for every applicable rule source.

## Make Review Evidence Commit-Aware

A pull request can receive approval and then receive new commits. To establish that the final code was reviewed, management can use GitHub settings that dismiss stale approvals or require approval of the most recent reviewable push, together with evidence of the setting and review state.

For a sampled item, compare:

- commit state when the approval was submitted;
- commits added after approval;
- dismissal or reapproval events;
- head, test-merge, or merge-group SHA when checks ran;
- merge commit or squash SHA;
- deployed SHA.

Do not assume the last visible approval covered later changes. GitHub records review and timeline events that help reconstruct the sequence, but the organization's retention and extraction process must preserve them.

## Status Checks Need Meaning and Scope

A successful check named `test` is not self-explanatory. Maintain an inventory that defines:

- workflow and check name;
- repositories and branches where it is required;
- tests or scans performed;
- trigger conditions and path filters;
- who can modify the workflow;
- how secrets and runners are protected;
- how failures, reruns, and overrides work.

Preserve the check run ID, conclusion, timestamps, workflow revision, and the exact commit SHA evaluated for selected changes. A check that ran against an earlier commit or skipped relevant paths may not support the stated control attribute. With a merge queue, GitHub validates a temporary merge-group branch whose SHA differs from the pull-request head, so preserve the merge-group event and connect that temporary SHA to the pull request and resulting merge.

GitHub's merge semantics also need to match the control language. Required status checks may be satisfied by `successful`, `skipped`, or `neutral` results, and a skipped GitHub Actions job reports `Success`. A mergeable pull request therefore does not, by itself, prove that every named test executed and passed. Define which conclusions are acceptable, configure workflows so required validation cannot be bypassed through an unintended skip, and inspect the actual check conclusions for sampled changes.

If the control only requires designated checks, name or govern that set. Do not imply that every optional CI job must pass unless that is truly the design.

## Connect Merge to Production

Repository evidence ends at source control. A change-management control concerning production requires delivery evidence. Build a joinable chain:

```text
PR #842
  -> approved head SHA 9e31a2c
  -> merge or squash SHA b16c844
  -> build artifact digest sha256:...
  -> deployment ID prod-20260804-17
  -> production environment
  -> successful completion at 2026-08-04T14:22:51Z
```

The exact relationship depends on merge strategy and build system. Record image digests or signed artifact identifiers where a commit alone is insufficient. Include failed, rolled-back, automated, configuration-only, database, infrastructure, feature-flag, and emergency changes according to the defined scope.

A complete production-deployment population is usually a better sampling source than a pull-request search because it starts from what actually reached production.

## Establish Population Completeness

For each examination period, document:

- in-scope organizations, repositories, branches, environments, and services;
- source APIs or queries and required permissions;
- `[start, end)` timestamps and timezone;
- pagination handling and row counts;
- deleted, archived, transferred, and renamed repositories;
- direct pushes, UI edits, bots, deployment tools, and break-glass paths;
- reconciliation between deployments, commits, and pull requests;
- export date and evidence retention.

Do not let the control population be `pull requests we found`. Reconcile every in-scope production deployment to an approved workflow or documented exception. Investigate unmatched records rather than deleting them from the spreadsheet.

## Treat Bots and Bypass Paths Explicitly

Automation can author, approve, merge, or deploy changes. Decide which combinations are authorized and what independent validation exists. A bot approval is not equivalent to human technical review unless the control is intentionally designed that way and the underlying automated decision is understood and governed.

For bypass actors and emergency changes, preserve:

- approved eligibility for the bypass role;
- triggering incident or urgency;
- exact change and actor;
- tests completed before or after deployment;
- retrospective review and timing;
- removal of temporary access;
- periodic review of bypass events.

If the policy says emergencies are allowed but no population of them exists, the exception path is not auditable.

## Build Reproducible Evidence Packages

For each sample, create a small manifest without altering source records:

```text
repository: acme/payments-api
pull_request: 842
author: github-user-17 -> workforce ID E1042
reviewer: github-user-31 -> workforce ID E0871
approved_at: 2026-07-29T10:14:02Z
approved_head_sha: 9e31a2c...
required_checks: unit, integration, security
merge_sha: b16c844...
deployment_id: prod-20260804-17
deployed_artifact: sha256:...
exception: none
```

Retain the underlying API responses, logs, workflow records, identity mapping, and extraction parameters. A generated manifest improves readability but should not replace authoritative evidence.

The service auditor determines whether management's information is sufficient and may test its completeness and accuracy. A compliance platform's GitHub integration does not remove that responsibility.

## Official Documentation

- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: About pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- [GitHub Docs: About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Docs: Status checks and check conclusions](https://docs.github.com/en/pull-requests/reference/status-checks)
- [GitHub Docs: Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [GitHub Docs: REST API endpoints for pull-request reviews](https://docs.github.com/en/rest/pulls/reviews)
- [GitHub Docs: Audit log events for an organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/audit-log-events-for-your-organization)
- [GitHub Docs: Reviewing the audit log for an organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)
- [AICPA and CIMA: FAQs on software tools in SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)

## Conclusion

GitHub pull requests can prove who proposed, reviewed, tested, and merged a specific change when the repository rules and event history support those facts. To prove change management, add historical enforcement evidence, complete production populations, identity mapping, bypass handling, and an exact link from reviewed commit to deployed artifact.
