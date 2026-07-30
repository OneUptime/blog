# Track Platform Coverage Without Hiding Shadow Tooling and Workarounds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Software Catalog, Shadow IT, Governance, Asset Inventory

Description: Build platform coverage from reconciled inventories and observed workflows so unsupported tools, exceptions, and manual paths remain visible.

---

Platform coverage is often calculated from the platform's own catalog:

```text
registered services using feature / registered services
```

That ratio can improve while the organization creates unregistered services, alternate pipelines, direct cloud resources, and manual workarounds. A platform cannot be its own denominator.

Build the population from authoritative inventories outside the platform, reconcile identities, and report unknown and alternative paths explicitly.

## Define What Is Being Covered

Coverage is capability-specific. A service may use the platform's catalog and observability integration while deploying through a custom pipeline.

For capability `c`:

```text
active coverage(c) =
  eligible active entities with observed conforming use of c
  / all eligible active entities
```

Define:

- **Entity:** service, repository, workload, environment, or team;
- **Active:** evidence of relevant activity in a stated window;
- **Eligible:** supported and subject to the capability;
- **Conforming use:** current configuration plus observed use where required; and
- **Window:** appropriate to the workflow's frequency.

Do not combine unlike capabilities into one percentage. Publish a matrix or a carefully defined set of capability-specific rates.

## Build a Reconciled Inventory

Use sources with independent evidence:

- source-control organizations and repositories;
- build and deployment systems;
- cloud asset inventories and billing;
- Kubernetes APIs and cluster inventories;
- identity and entitlement systems;
- DNS, gateways, and service discovery;
- package and container registries;
- observability backends;
- service-desk and change records; and
- the software catalog.

Microsoft's platform guidance treats inventories as essential for preventing technical sprawl. Backstage provides a centralized software catalog, but its documentation also distinguishes the catalog's human-oriented model from an exhaustive, real-time asset inventory. Use catalogs as an aggregation and ownership layer while retaining authoritative source links.

## Resolve Entities Before Calculating

One service can appear under different repository names, deployment names, cloud accounts, and cost tags. Create a stable internal `service_id` and an alias table:

```text
service_id
source_system
source_entity_id
valid_from
valid_to
match_method
match_confidence
```

Prefer immutable provider IDs over names and URLs. Automate deterministic matches from declared metadata, then queue ambiguous cases for owner review. Keep one-to-many relationships: a service may own several repositories and workloads.

Report reconciliation health:

```text
identity match rate =
  discovered active assets mapped to a service
  / discovered active assets
```

Unmatched assets are not excluded from coverage. They belong in an "unknown ownership or identity" bucket.

## Use Coverage States, Not a Boolean

Assign each eligible entity a state per capability:

| State | Meaning |
| --- | --- |
| Covered-active | Correct current configuration and recent observed use |
| Covered-dormant | Configured, but no eligible use observed in the window |
| Alternative-approved | A documented supported exception or alternate standard |
| Shadow | Another path or tool is observed without an approved exception |
| Manual | Work is fulfilled by a person or ticket |
| Failed coverage | Platform configuration exists but is broken or stale |
| Unknown | Evidence is insufficient or identity cannot be reconciled |

This prevents "registered" from being treated as "covered." It also avoids describing every alternative as wrongdoing. DORA recommends a supported baseline with a defined exception process because informed tool choice and standardization must be balanced.

## Detect Shadow Tooling

Look for evidence that contradicts the catalog:

- production deployment events from unknown CI identities;
- cloud resources without a platform journey or approved owner tag;
- workflow files referencing unapproved actions or runners;
- workloads shipping telemetry to an unregistered backend;
- repositories with active releases but no catalog entity;
- manually changed infrastructure drifting from declared state;
- recurring tickets for a supposedly self-service task; and
- SaaS expenditure without a mapped capability or owner.

Use this evidence to initiate discovery, not automatic punishment. Teams often create shadow paths because the supported platform lacks a requirement, has poor reliability, or makes the approved route too slow. A punitive response drives the evidence further underground.

## Make Manual Work Visible

Central teams often complete work through chat, spreadsheets, privileged shells, or "temporary" scripts. Instrument demand even if the fulfillment is not automated:

```text
workflow_id, capability, requester_team, service_id
requested_at, ready_at, channel, human_touches
outcome, workaround_reason
```

Reconcile service-desk categories with platform tasks, and periodically sample chat or on-call work through lightweight self-reporting. Do not collect message content when a category and duration are sufficient.

Report:

```text
manual fulfillment share =
  eligible successful completions involving provider-side manual work
  / all eligible successful completions
```

The manual share is often more actionable than static configuration coverage.

## Keep Exceptions Honest

Every exception should contain:

- capability and entity;
- owner;
- rationale;
- approving authority;
- created and expiry dates;
- compensating controls; and
- intended resolution.

Expired exceptions return to shadow or unknown until reviewed. Report approved alternatives separately rather than removing them from the population. Leadership then sees both platform reach and the true diversity it must support.

## Publish a Coverage Reconciliation

A useful report includes raw counts:

```text
Eligible active services                    420
Covered-active                              286  (68.1%)
Covered-dormant                              22  (5.2%)
Approved alternative                         38  (9.0%)
Shadow tool observed                          31  (7.4%)
Manual path                                   19  (4.5%)
Failed coverage                               11  (2.6%)
Unknown identity or evidence                  13  (3.1%)
```

Add movement between states. A stable 68% coverage rate can hide 20 new adoptions and 20 regressions. Track new shadow assets, resolved unknowns, expired exceptions, and services that left the supported path.

For a combined view, do not silently count approved alternatives as platform-covered. Show both:

```text
platform coverage = covered-active / eligible
governed-path coverage = (covered-active + approved alternative) / eligible
```

## Validate With Developers

Inventory data misses local scripts, copied credentials, informal approvals, and cognitive work. Ask a representative sample:

- How did you last complete this task?
- Where did you leave the supported path?
- Which manual coordination was required?
- What prevents migration?
- Which alternative should become a supported extension?

Compare answers with telemetry. Differences reveal instrumentation gaps and misunderstood workflows.

## Use Coverage to Improve the Product

Rank gaps by affected services, risk, and developer burden. A widespread safe alternative may deserve official integration. A manual path with high risk may need immediate automation. A small justified exception may simply need continued governance.

The goal is not to force every workload into one implementation. It is to know the real estate: what the platform serves, what accepted alternatives exist, where people work manually, and what remains unknown. Only that denominator makes platform coverage credible.

## Official Documentation

- [Microsoft Learn: Use inventories to manage assets](https://learn.microsoft.com/en-us/platform-engineering/about/discoverability)
- [Backstage: Software Catalog](https://backstage.io/docs/features/software-catalog/)
- [Backstage: Creating the Catalog Graph](https://backstage.io/docs/features/software-catalog/creating-the-catalog-graph/)
- [DORA: Empowering teams to choose tools](https://dora.dev/capabilities/teams-empowered-to-choose-tools/)
