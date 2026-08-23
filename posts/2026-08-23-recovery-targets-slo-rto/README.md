# Setting Recovery Targets from SLOs and RTOs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, SLO, RTO, Error Budget, Business Continuity

Description: Derive recovery targets from customer SLOs, error-budget policy, and business RTOs instead of borrowing incomparable industry benchmarks.

---

An industry MTTR benchmark does not know your customer journey, traffic, legal obligations, fallback modes, or cost of downtime. Set recovery targets from two local constraints: the service reliability objective and the business continuity requirement. Then test whether architecture and response practices can meet them.

## Keep SLO and RTO Semantics Distinct

An SLO is a target for a measured service indicator over a period, such as 99.9 percent successful eligible requests in 30 days. Its error budget is the permitted gap from perfect performance under that definition.

NIST SP 800-34 defines recovery time objective as the maximum time a system resource can remain unavailable before unacceptable impact occurs to other resources or supported mission and business processes. It also explains that RTO normally needs to be shorter than maximum tolerable downtime because downstream recovery work may remain.

An RTO is therefore a planning constraint, not a historical average. An SLO is a reliability target, not automatically a per-incident deadline. A recovery target can be informed by both without calling them identical.

## Translate Error Budget into an Incident Constraint

For an availability SLO \(S\) over a period \(P\), a constant full outage at constant traffic would consume the whole nominal budget in:

\[
D_{budget}=(1-S)P
\]

For a 99.9 percent SLO over 30 days, that is 43.2 minutes. Allocating fraction \(q\) of the period budget to one full-impact incident gives:

\[
D_{target}=q(1-S)P
\]

If policy allocates at most 10 percent of the budget to one incident, the illustrative target is 4.32 minutes. This is not a universal recommendation. It assumes constant traffic, full SLO impact, and a simple time-based interpretation.

For partial impact with error ratio \(r\), a rough constant-rate constraint is:

\[
D_{target}=\frac{q(1-S)P}{r}
\]

Request-based services should calculate actual bad eligible events instead. Traffic varies, failures may affect only one SLI, and low-volume periods make time conversion misleading.

Google SRE defines burn rate relative to error-budget consumption. Multiwindow, multi-burn-rate alerts can provide early warning before the budget is exhausted; they do not by themselves establish the recovery target.

## Derive RTO from Business Impact

Run a business impact analysis with service owners, continuity staff, security, support, and product stakeholders. Identify:

- the mission or customer process supported;
- how harm grows with outage duration;
- contractual, regulatory, safety, and data-integrity limits;
- manual or degraded fallback and its capacity;
- dependencies and their recovery objectives;
- time needed after technical recovery to reconcile data or resume the process.

Set the resource RTO early enough that the supported process stays within its maximum tolerable downtime. A database may need a shorter RTO than the customer-facing process because applications, validation, backlog replay, and communications follow database recovery.

RTO must be scoped. `Payments RTO: 60 minutes` is incomplete if authorization can fail over in five minutes but settlement requires a day. Define capability, region, data state, minimum capacity, and validation condition.

## Reconcile the Constraints

Build a ladder rather than one MTTR target:

| Milestone | Example target | Source |
| --- | ---: | --- |
| Detect material SLO threat | 2 minutes | Alerting and error-budget policy |
| Stop irreversible harm | 5 minutes | Risk analysis |
| Restore minimum checkout capability | 15 minutes | Customer journey and fallback design |
| Restore full SLI | 30 minutes | SLO budget allocation |
| Restore redundancy | 4 hours | Resilience standard |
| Complete reconciliation | 8 hours | Business process MTD and RTO analysis |

Use the most constraining applicable requirement for each milestone. If the SLO budget implies 10 minutes but the architecture can recover only in two hours, changing the dashboard target does not close the gap. Fund failover, rollback, graceful degradation, or a revised service promise through governance.

## Test Feasibility with Scenarios

Model representative failure modes: bad deployment, zone loss, regional loss, corrupted data, identity provider failure, queue backlog, and third-party outage. For each, identify detection, decision, execution, validation, and backlog-clearance times. Dependencies must have objectives compatible with the service target.

Exercise the path. Measure achieved recovery in game days and production incidents, but keep exercises in a separate cohort. A paper RTO unsupported by restore tests and sufficient capacity is an aspiration.

For data recovery, pair RTO with recovery point objective. NIST distinguishes RPO as the point in time to which data must be recovered; a fast service restart with unacceptable data loss does not satisfy continuity needs.

## Report Target Attainment, Not Only Mean

An average below 30 minutes can coexist with several severe breaches. Publish:

- fraction of eligible incidents meeting each milestone target;
- median and tail recovery durations;
- user-minutes or SLO bad events;
- error-budget share by incident;
- open incidents and missing timestamps;
- tested versus untested failure modes.

Do not rank responders on target misses. Review whether detection, authority, automation, dependencies, capacity, and recovery procedures supported the requirement. Targets should drive design and investment.

Review targets when SLOs, architecture, traffic, fallback, or business impact changes. Version the target and annotate dashboards. Recomputing historical compliance under a new target can be useful, but distinguish it from what responders were accountable to at the time.

## Official Documentation

- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [NIST recovery time objective glossary](https://csrc.nist.gov/glossary/term/recovery_time_objective)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)

## Conclusion

Recovery targets should express the service and business harm you are trying to prevent. Use SLO error-budget policy for customer-facing reliability constraints, use RTO and maximum tolerable downtime for continuity planning, define staged milestones, and test real failure modes. A benchmark cannot replace that local analysis.
