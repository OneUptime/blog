# How to Calculate DORA Deployment Rework Rate from Deployment, Incident, and Hotfix Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DORA, DevOps, Incident Management, Software Delivery, SQLite

Description: Calculate deployment rework rate from linked production events, with explicit counting rules, a worked example, and SQL that avoids duplicate hotfix counts.

A production incident can require several deployments to repair. Counting the incident once hides that extra deployment activity; counting every webhook exaggerates it. Deployment rework rate needs a deployment registry and an explicit record of why each remedial deployment happened.

## Separate Rework from Failure

DORA defines deployment rework rate as the proportion of deployments that were unplanned and happened because of a production incident. Change fail rate, often called change failure rate, measures deployments requiring immediate intervention after deployment. These are different numerators. [DORA's metric definitions](https://dora.dev/guides/dora-metrics/).

```text
Rework rate (%) = 100 × unplanned incident-response deployments
                       / all deployments in the same population
```

If deployment A breaks checkout and deployments B and C repair it, A contributes to change failure rate; B and C contribute to deployment rework rate. B could contribute to both if it also introduces a failure requiring intervention.

The metric counts deployments, not engineer hours, changed lines, incidents, or hotfix tickets. DORA added it in 2024 to examine rework more directly alongside change failure rate. [DORA's metric history](https://dora.dev/insights/dora-metrics-history/).

## Agree on the Counting Contract

The following is an implementation policy for this example, rather than a universal DORA event specification:

- Measure one service in production. Count each distinct release that actually changes its production runtime, including configuration releases and redeployments used for rollback.
- Keep releases that later prove faulty. A green pipeline does not establish application health, and filtering to healthy releases would change the denominator.
- Exclude builds, staging releases, webhook retries, and pipeline attempts that never change production. Normalize progressive rollout steps into one logical deployment ID.
- Record whether work was unplanned because of an incident. A hotfix label is supporting evidence, not sufficient classification. Scheduled maintenance and planned backlog fixes do not qualify merely because they fix bugs.
- Count a rollback as a separate deployment when it redeploys an artifact under this contract. A manual recovery action that creates no deployment adds nothing to either deployment count.

DORA recommends applying its metrics to individual applications or services; preserve that scope when joining incident records. [DORA guidance on context](https://dora.dev/guides/dora-metrics/).

## Normalize the Three Event Streams

Use deployment events to establish identities and timestamps. Use incident events to establish production impact. Use hotfix events to connect the repair to both its actual deployment ID and the incident that prompted it. A hotfix request that never deploys contributes nothing.

A compact warehouse model is:

```text
deployments(
  deployment_id PRIMARY KEY NOT NULL, service, environment, deployed_at,
  unplanned, rework_review_complete
)
incidents(incident_id PRIMARY KEY NOT NULL, environment)
incident_deployment_links(
  incident_id, deployment_id, relationship, confirmed
)
```

For the SQLite query below, IDs and names are `TEXT`; flags are non-null integers constrained to `0` or `1`. Declare text primary keys `NOT NULL` explicitly; SQLite otherwise permits null keys. [SQLite primary-key constraints](https://www.sqlite.org/lang_createtable.html#the_primary_key). Keep `rework_review_complete = 0` until the classification is known; a provisional `unplanned = 0` must not imply a completed review. Store timestamps uniformly as UTC text in `YYYY-MM-DDTHH:MM:SSZ` format, so these range comparisons remain chronological. SQLite supports date/time storage as text. [SQLite date/time documentation](https://www.sqlite.org/lang_datefunc.html).

Use `relationship = 'remediates'` for repairs, separate from a relationship recording which deployment caused a failure. Confirm links from the change request, responder timeline, or incident review; time proximity alone is insufficient. Retain evidence URLs and reviewer timestamps alongside the compact model. If OneUptime holds your incident record, its incident ID can supply the incident-side key in this warehouse mapping.

Deduplicate deployment delivery notifications on `deployment_id`. Multiple confirmed incident links are allowed: a deployment still counts once. Do not require the incident to have a known causal deployment before recognizing its unplanned repair.

## Choose the Window by Deployment Time

Use the half-open interval `[2026-11-01T00:00:00Z, 2026-11-08T00:00:00Z)` for this example. Both numerator and denominator use each deployment's timestamp, not the incident's creation or closure timestamp.

An October incident repaired on November 1 contributes rework in November. A November 7 incident repaired on November 8 contributes the repair to the next window. Do not restrict incident lookup to incidents opened inside the deployment window.

Keep a separate publication timestamp. Late incident reviews can revise an earlier deployment's classification; rerun affected periods and identify revised results. Any delay before finalizing a reporting period is your reporting policy, not a DORA-prescribed attribution window.

## Work Through Six Deployments

Suppose these are all checkout production deployments in the selected week, with classification complete:

| Deployment | Date | Reason | Rework? |
| --- | --- | --- | --- |
| D1 | November 1 | Unplanned repair for October incident I0 | Yes |
| D2 | November 2 | Planned feature; causes incident I1 | No |
| D3 | November 2 | First unplanned hotfix for I1 | Yes |
| D4 | November 3 | Second unplanned hotfix for I1 | Yes |
| D5 | November 5 | Planned backlog cleanup | No |
| D6 | November 7 | Planned dependency upgrade | No |

Rework rate is **3 / 6 = 50%**. Assuming D2 alone required immediate intervention, change failure rate is **1 / 6 = 16.67%**. I0's causal deployment occurred in October, so it is outside this week's failure numerator and denominator.

## Calculate Without Multiplying Rows

This SQLite query assumes the normalized tables above. `EXISTS` produces one classification per deployment even when several incident links match. `FILTER` counts only qualifying rows. [SQLite expressions](https://www.sqlite.org/lang_expr.html#the_exists_operator), [aggregate functions](https://www.sqlite.org/lang_aggfunc.html).

```sql
WITH cohort AS (
  SELECT d.*,
    d.unplanned = 1 AND EXISTS (
      SELECT 1
      FROM incident_deployment_links AS l
      JOIN incidents AS i ON i.incident_id = l.incident_id
      WHERE l.deployment_id = d.deployment_id
        AND l.relationship = 'remediates'
        AND l.confirmed = 1
        AND i.environment = 'production'
    ) AS is_rework
  FROM deployments AS d
  WHERE d.service = 'checkout'
    AND d.environment = 'production'
    AND d.deployed_at >= '2026-11-01T00:00:00Z'
    AND d.deployed_at <  '2026-11-08T00:00:00Z'
), counts AS (
  SELECT
    COUNT(*) AS total_deployments,
    COUNT(*) FILTER (
      WHERE rework_review_complete = 1 AND is_rework
    ) AS rework_deployments,
    COUNT(*) FILTER (
      WHERE rework_review_complete = 0
    ) AS pending_classifications
  FROM cohort
)
SELECT *,
  CASE WHEN pending_classifications = 0 THEN
    ROUND(100.0 * rework_deployments
          / NULLIF(total_deployments, 0), 2)
  END AS rework_rate_pct
FROM counts;
```

The example returns `6, 3, 0, 50.0`. Empty windows return a null percentage; incomplete classifications also leave it null while exposing the pending count. This deliberately prevents missing evidence from appearing as zero rework.

Review the deployment list behind a changing rate. More small repair deployments can increase the percentage even when recovery improves. Read it alongside change failure rate and recovery time, then investigate repeated incident causes and incomplete fixes. Keep the raw counts visible so a small denominator does not turn one additional hotfix into an unexplained trend.
