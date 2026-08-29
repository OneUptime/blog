# Should Planned Maintenance Count Against an SLO? A Decision Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Error Budget, Maintenance, Availability, SRE, SLA

Description: Decide maintenance eligibility from the user promise and prevent planned work from becoming a retroactive reliability exemption.

---

For an always-on user-facing service, planned maintenance normally counts against the SLO. Users lose the outcome whether an interruption was scheduled or accidental. Planning changes who knew and how the team responds; it does not make the service available.

Excluding maintenance can be legitimate when the service promise explicitly excludes that time. The decision must be made before the work, reflected explicitly in the SLI eligibility rules and compliance calculation, and visible to users and operators.

## Begin with the Service Promise

Use these questions in order:

1. **Would an eligible user be unable to complete the promised outcome?** If no, the maintenance does not affect that SLO.
2. **Is continuous availability part of the product expectation?** If yes, count the impact.
3. **Are supported hours or maintenance windows explicitly part of the contract?** If yes, time outside them can be ineligible.
4. **Can the system preserve the outcome through redundancy, read-only mode, queues, or graceful degradation?** Count actual outcomes rather than the maintenance label.
5. **Which decision will the error budget drive?** A maintenance exclusion that removes the incentive to build safe upgrades is usually counterproductive.

AWS's reliability guidance uses a strict availability interpretation that includes scheduled and unscheduled interruptions. Google SRE describes planned Chubby outages precisely because users had learned to rely on higher availability than the stated objective. Both examples reinforce that planned work is part of reliability engineering, not automatically outside it.

## Apply the Framework by Service Type

### Always-On SaaS or API

Count unavailable or too-slow eligible requests. A status-page announcement may reduce surprise, but it does not fulfill the request. Spend budget on the maintenance just as you would on a risky deployment, and use that cost to justify rolling upgrades, failover, or a safer data migration.

### Explicit Supported Hours

An internal reporting system might promise availability only from 07:00 to 19:00 Europe/London on business days. Work outside that schedule is ineligible if the hours are documented, accepted by users, and consistently implemented. Keep a separate readiness check so maintenance that overruns into supported hours is immediately counted.

### External SLA with Exclusions

An SLA may exclude advance-notice maintenance for credits. Keep the contractual calculation for compliance, but consider a stricter internal SLO that includes all user impact. A legal exclusion and an engineering reliability target serve different decisions.

### Degraded but Usable Service

Do not exclude the entire period. If read traffic remains good while writes are unavailable, let the read SLO record good events and the write SLO record bad events. If queued writes complete within their promised deadline, their logical outcomes can still be good.

## Define Exclusions as Data

If exclusions are part of the promise, store a versioned policy with:

- scope: services, operations, regions, and tenants;
- exact start and end, including time zone;
- maximum duration and notice period;
- approver and reason;
- recurrence rule, if any;
- behavior for an overrun;
- which SLOs and alerts are affected.

Tooling such as CloudWatch and Grafana SLO can represent exclusion or maintenance windows, but the product feature does not decide whether an exclusion is honest. Preserve source telemetry during the window and report both included and excluded impact. Never delete source samples or stop scraping to manufacture an exclusion; unexplained missing source telemetry is unknown, not evidence of maintenance.

## Budget Maintenance Before Approval

For a time-based 99.9% objective over 30 days, the total downtime allowance is 43.2 minutes:

```text
30 days x 24 hours x 60 minutes x (1 - 0.999) = 43.2 minutes
```

A planned 30-minute outage would spend about 69% of that budget. That calculation gives approvers a meaningful choice: accept the spend, redesign the procedure, postpone until risk is lower, or change the published service expectation. For a request-based SLO, forecast impacted eligible requests instead of converting time directly into failures.

## Prevent Policy Abuse

- Do not create or extend an exclusion after errors begin.
- Do not label an incident “maintenance” because it followed a change window.
- Do not pause burn alerts without an independent alert for overrun and unexpected scope.
- Do not use a broad global window when only one operation is affected.
- Review total excluded time alongside error-budget reports; a compliant SLO with growing exclusions is a warning.
- Version the definition when eligibility changes so historical comparisons remain interpretable.

## A Practical Default

Use this policy unless stakeholders deliberately choose another:

> Planned maintenance counts against internal user-facing SLOs. A predeclared exclusion is allowed only when it is part of the supported-hours promise or an independently governed contractual calculation. Raw impact remains visible, and any overrun counts immediately.

This keeps the primary SLO aligned with user experience while preserving legitimate business schedules.

## References

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [AWS Well-Architected Reliability Pillar: Availability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [Amazon CloudWatch SLOs: Time window exclusions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html)
- [Grafana SLO maintenance windows](https://grafana.com/docs/grafana-cloud/observe-and-act/alert-and-measure-reliability/slo/maintenance-windows/)

## Conclusion

Count planned maintenance whenever it breaks an always-on promise. Exclude time only through a prospective, explicit, reviewable service definition—and keep the raw user impact visible even when a contract calculates compliance differently.
