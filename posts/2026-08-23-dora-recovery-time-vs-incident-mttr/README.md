# DORA Failed Deployment Recovery Time vs Incident MTTR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DORA Metric, MTTR, Deployment Recovery, Change Failure, DevOps

Description: Keep DORA failed deployment recovery time distinct from broad incident MTTR and link production failures to changes with auditable evidence.

---

DORA's failed deployment recovery time and incident MTTR overlap only for incidents caused by a failed production deployment. DORA deliberately moved away from generic time-to-restore or MTTR language so its software-delivery measure focuses on deployment failures requiring immediate intervention. Infrastructure faults, dependency outages, and security events may belong in incident recovery metrics but not this DORA cohort.

## Define the Two Populations

Use separate fact tables or an explicit cohort field:

| Measure | Population | Typical question |
| --- | --- | --- |
| Failed deployment recovery time | Production changes or releases that degrade service and require immediate remediation | How quickly does the delivery system recover from failed changes? |
| Incident impact-to-restoration | Eligible production incidents under the incident policy | How long does customer-impacting service degradation last? |

One event can contribute to both. A bad application release that breaks checkout and is rolled back is a failed deployment and a customer-impact incident. A cloud provider network failure may be an incident but not a failed deployment by your team. A canary rejection caught before the production service degrades is useful guardrail evidence, but it is not a failed deployment recovery observation under DORA's service-degradation definition.

DORA defines the construct, but it does not impose one warehouse schema or universal pair of operational timestamps. Document your local start and end. For example, start at the first validated evidence of deployment-caused service degradation and end when the affected production capability is restored by rollback, hotfix, forward fix, configuration change, or another recovery action.

## Model Deployments, Failures, and Incidents Separately

Keep three entities:

```text
deployment(deployment_id, service_id, environment, started_at, completed_at,
           version, change_ids, outcome)
deployment_failure(failure_id, deployment_id, failure_observed_at,
                   service_degraded, intervention_required,
                   recovered_at, recovery_type)
incident(incident_id, impact_started_at, restored_at, primary_service_id)
```

Connect them with a many-to-many evidence table:

```text
incident_change_link(
  incident_id, deployment_id, relationship,
  evidence_type, evidence_uri, confidence,
  reviewed_by, reviewed_at
)
```

Relationships might be `caused_by`, `contributed_to`, `recovery_change`, or `coincidental`. A deployment inside a 30-minute lookback window is a candidate, not proof of causality.

## Establish Change Linkage with Evidence

Good evidence includes:

- the affected service and deployment target match;
- SLI degradation begins after rollout to the affected population;
- version, trace, log, or feature-flag dimensions isolate the new change;
- rollback or disabling the change produces recovery;
- the postmortem identifies the deployment as causal or contributing.

Retain an `unknown` state. Automatically declaring the nearest deployment causal inflates change failure rate and excludes non-change causes from incident learning.

Multiple changes can contribute to one incident, and one progressive deployment can create several impact windows. Designate a primary failed deployment for exclusive DORA counting only after review. Keep all contributors for diagnosis.

## Define Failure and Recovery Boundaries

A local measurement contract might state:

```text
Population: production deployments that degrade service and require remediation
Start: earliest validated signal of deployment-caused service degradation
End: affected production capability meets its recovery SLI for 10 minutes
Unit: elapsed minutes
Multiple incidents: one duration per failed deployment episode
Open failures: right-censored and excluded from simple completed mean
```

The end should represent recovered production capability, not ticket closure or permanent root-cause elimination. A rollback can end failed deployment recovery even though engineers later repair the forward version.

If a canary fails and automation rejects it before production service degrades, track it as a guardrail catch or canary rejection rather than a DORA failed deployment recovery. If the release does degrade service, an automated rollback is still remediation; lack of human action does not turn that failed deployment into a success.

## Worked Scenarios

### Bad release with customer impact

A release begins at 14:00, an SLO breach appears at 14:06, intervention is declared at 14:08, rollback completes at 14:17, and the SLI stabilizes at 14:22. Under a first-evidence-to-stable-recovery contract, failed deployment recovery is 16 minutes. Customer impact-to-restoration is also 16 minutes if impact began at 14:06.

### Dependency outage during deployment

A harmless release finishes at 09:00. A payment provider fails at 09:05 and service recovers at 09:50. Time proximity alone does not make this a failed deployment. It belongs in incident recovery and dependency analysis.

### Canary rejected before service degradation

A canary exposes a schema incompatibility at 11:03 before production traffic reaches it. Automation rejects the candidate at 11:04, and production service never degrades. Track the rejection time and guardrail effectiveness, but include it in neither failed deployment recovery time nor customer-impact MTTR.

## Compute Without Double Counting

Calculate one duration per qualifying failed-deployment episode:

```sql
SELECT
  date_trunc('month', failure_observed_at) AS month,
  COUNT(*) AS failed_deployments,
  AVG(EXTRACT(EPOCH FROM (recovered_at - failure_observed_at)))
    AS mean_recovery_seconds,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (recovered_at - failure_observed_at))
  ) AS median_recovery_seconds
FROM deployment_failures
WHERE environment = 'production'
  AND service_degraded
  AND intervention_required
  AND recovered_at IS NOT NULL
GROUP BY 1;
```

Pair it with deployment count and change fail rate. A faster recovery measure does not compensate for rapidly increasing failure frequency. Also retain sample size and tail percentiles.

## Keep Dashboards and Language Separate

Label panels `failed deployment recovery time` and `incident impact-to-restoration`, not two versions of MTTR. Show overlap count, unlinked incidents, unreviewed candidate links, and failed deployments without incident records. This reveals integration gaps and keeps the metrics honest.

Use the DORA metric to improve rollout safety, observability, rollback, and change design. Use broad incident recovery to improve detection, incident command, dependency resilience, and service architecture.

## Official Documentation

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA history of software delivery metrics](https://dora.dev/insights/dora-metrics-history/)
- [2023 DORA report](https://dora.dev/research/2023/dora-report/2023-dora-accelerate-state-of-devops-report.pdf)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google Cloud architecture: Deployment archetypes](https://cloud.google.com/architecture/deployment-archetypes)

## Conclusion

Failed deployment recovery time is a change-delivery metric with a narrower population than incident MTTR. Model deployments and incidents independently, link them with reviewed evidence, and state the failure and recovery events. Separate dashboards preserve what each measure is meant to improve.
