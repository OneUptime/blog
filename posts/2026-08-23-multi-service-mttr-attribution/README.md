# MTTR Attribution for Multi-Service Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Multi-Service Incidents, Attribution, SRE, Incident Analytics

Description: Model one shared incident and multiple service-impact windows so organization totals, service exposure, and customer harm are not double-counted.

---

A database outage can degrade checkout, account management, and fulfillment at different times. Copying the parent incident's full duration into every service makes three outages from one shared event. Assigning it only to the database hides the customer-facing recovery work. Solve this by separating the incident episode, service exposure, and customer-impact population.

## Use Three Linked Layers

### Incident episode

The canonical response record holds shared command, cause, detection, and final restoration context. It is counted once in an organization-wide incident cohort.

### Service impact windows

Each affected service has its own scoped SLI intervals:

```text
incident_id, service_id, impact_started_at, restored_at,
impact_measure, evidence_uri, relationship
```

### Product or user impact

Customer journeys may traverse several services. Build non-overlapping bad-event or affected-user sets for the product SLI instead of summing service-level estimates.

These layers support different questions without forcing one attribution rule on all of them.

## Define Three Reporting Views

1. **Organization incident view:** one duration per canonical episode. Use this for response-system recovery and incident frequency.
2. **Service exposure view:** one duration per affected service window. Use this to find service-specific detection and restoration constraints. Counts are non-additive across services.
3. **Customer-impact view:** union SLI-bad events or affected user intervals across the product population. Use this for SLO and impact reporting.

Label each dashboard. `Service incidents` that duplicates a shared episode across services cannot be summed to get organization incident count.

## Worked Example

A shared identity dependency fails at 10:00:

| Service | Impact interval | Duration |
| --- | --- | ---: |
| Login | 10:00-10:40 | 40 min |
| Checkout | 10:05-10:25 | 20 min |
| Support portal | 10:10-10:50 | 40 min |

The parent episode span is 50 minutes. Service exposure totals 100 service-minutes, which is a valid workload or architecture measure, not elapsed outage time. The union of service impact intervals is 50 minutes, but customer user-minutes require deduplicating people who attempted both login and checkout.

An organization report should count one episode. A service report should show each service's own duration. A product SLO should derive bad eligible events from the product's SLI.

## Avoid Equal Splits

Dividing a 50-minute incident equally among three services creates arbitrary 16.7-minute values that no service experienced. Similarly, splitting by the number of teams on the call confuses response labor with customer impact.

Allocate quantitative impact using observable units:

- unique affected users per time segment;
- failed eligible requests;
- delayed orders or jobs;
- consumed SLO error budget;
- responder-hours for operational load.

For shared events, allocations within one metric must sum to the known total. If evidence cannot support a split, report `shared or unattributed` rather than inventing precision.

## Represent Causality and Ownership Separately

Use relationships such as:

```text
affected_service
initiating_service
shared_dependency
incident_command_owner
remediation_owner
```

The service whose SLI failed, the component that initiated the failure, and the team coordinating the incident can all differ. `Primary service` is too overloaded unless its semantics are stated.

Choose one primary attribution only where an exclusive grouped total is required, and keep the full relationship graph. Do not use primary attribution to remove other services from exposure analysis.

## Merge Overlapping Windows Correctly

For an organization impact span, union intervals rather than summing them. Sort by start, extend the current interval while the next start is at or before its end, and emit a new interval only after a gap. Run the operation in UTC.

For SLO bad events, deduplicate at the eligible-event level when possible. An authentication failure that causes checkout failure should count according to the product SLI definition, not once for every internal service that emitted an error.

For user-minute estimates, maintain population sets or allocation fractions per time bucket whose total is at most one for each user. Summing dashboard estimates after aggregation cannot reliably recover overlap.

## Link Shared and Local Recovery Actions

The dependency may recover at 10:30 while one service needs cache refresh until 10:50. Record both shared mitigation and service restoration. The parent incident should not close its customer-impact clock at dependency recovery if a scoped service SLI remains failed.

Conversely, a service may restore through fallback before the dependency returns. Its exposure ends when its own restoration condition holds; the parent episode remains active for other services.

Store action-to-service links so postmortems can distinguish shared fixes from local resilience. This points investment toward fallbacks, isolation, retry behavior, and dependency objectives.

## Aggregate Without Invalid Arithmetic

Never sum service means or average service p90 values. Query underlying service-incident observations for the desired scope. For an organization incident statistic, query one row per parent episode. For a service-exposure statistic, query one row per service window and explicitly accept that a shared episode appears multiple times.

Show:

- unique parent episode count;
- service exposure row count;
- total service-minutes;
- product user-minutes or bad events;
- shared-dependency count;
- unallocated impact;
- sample size and tail durations by view.

Google SRE's SLO guidance recommends consistent SLI numerators and denominators, and its alerting guidance notes tradeoffs when combining services. Build product groupings around related user behavior and shared failure domains rather than organizational convenience.

## Official Documentation

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)
- [OneUptime declaring incidents and affected resources](https://oneuptime.com/docs/en/incidents/declaring-incidents)

## Conclusion

Multi-service attribution needs separate parent episodes, service impact windows, and product impact sets. Count the parent once, expose every affected service, union overlapping intervals, and allocate only with observable non-overlapping units. This preserves architectural learning without multiplying one outage into several organization incidents.
