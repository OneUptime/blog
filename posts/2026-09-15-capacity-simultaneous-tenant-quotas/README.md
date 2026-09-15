# How to Model Capacity When Multiple Tenants Hit Their Quotas at Once

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Multi-Tenant, Resource Quota, Rate Limiting, Performance

Description: Model simultaneous tenant rate and burst entitlements across shared CPU and dependencies, and distinguish quota admission from guaranteed capacity.

---

Ten tenants each have a 100-request-per-second allowance. The shared service usually sees only 250 RPS, so a 600-RPS fleet appears comfortable. At the beginning of the business day, all ten tenants start a scheduled integration and the service receives 1,000 RPS without anyone exceeding their entitlement.

A tenant quota is a demand input. It becomes a capacity guarantee only when the shared system and its failure policy can support the allowed combination.

## Write down what each limit means

For each tenant and operation class, record the steady request rate, permitted burst, concurrent work limit, payload bounds, and expensive-operation limits. A daily allowance is not a rate limit: one million requests per day says little about the busiest second.

Also identify the enforcement point. AWS API Gateway, for example, describes its throttles and quotas as best-effort targets rather than guaranteed ceilings. Its token-bucket behavior permits bursts. Use measured enforcement behavior and backend protection when an absolute resource boundary matters. [API Gateway throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)

Kubernetes `ResourceQuota` constrains namespace resource consumption and admission. It does not create physical nodes or promise that every admitted Pod will be schedulable. A quota inventory must therefore be reconciled with actual shared supply. [Kubernetes resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

## Convert entitlements into resource demand

Use measured work per operation, not only raw RPS. Consider this invented ten-tenant portfolio:

| Tenant class | Tenants | Allowed RPS per tenant | CPU seconds per request | CPU cores at simultaneous steady limits |
| --- | ---: | ---: | ---: | ---: |
| Standard | 8 | 100 | 0.004 | 3.2 |
| Reporting | 2 | 100 | 0.020 | 4.0 |
| Total | 10 |  |  | 7.2 |

If unrelated background work consumes 0.8 cores and the tested CPU utilization ceiling is 65%, the CPU screening calculation is:

```text
required allocatable cores = (7.2 + 0.8) / 0.65 = 12.31
```

Round up to whole deployable units and apply the defined failure scenario. The 65% target is illustrative and must come from latency testing for this service. This calculation does not prove that database, memory, locks, or network capacity are sufficient.

Create one demand column per shared resource. If a reporting request holds a database connection for much longer than a standard request, equal RPS limits do not imply equal connection demand. Use bounded operation classes so a tenant cannot move its entire entitlement into an unbudgeted expensive endpoint.

## Evaluate bursts on their actual time scale

For an ideal full token bucket with refill rate `r` and capacity `b`, admitted requests over a duration `T` have the upper bound `r*T + b`. This is a mathematical model of that limiter, not a claim that every gateway strictly enforces it.

Suppose each of the ten tenants has a 200-request bucket. In the first second, the aggregate model allows up to 3,000 requests: 1,000 from refill and 2,000 from initially stored tokens. That demand is very different from a flat 1,000 RPS plateau.

Keep separate tests for sustained quota use and synchronized bucket release. Long-running work also needs a concurrency boundary: even a compliant arrival rate can accumulate a large in-flight population after service time rises.

## Make oversubscription explicit

Three policies produce different promises:

| Policy | Capacity implication |
| --- | --- |
| Every tenant may exercise its entitlement simultaneously | Provision and verify the joint limit, including required failures |
| Tenants share a global pool with explicit fair admission | Publish the shared limit and bounded rejection or queue behavior |
| Statistical oversubscription | Measure joint demand and own the risk when the assumed diversity disappears |

Do not infer independence merely because the historical peaks occurred at different times. Month-end accounting, outage recovery, batch schedules, cache expiration, and a new SDK can synchronize customers.

For statistical planning, retain aligned time series and compare actual joint peaks with the sum of entitlements. Sum demand in each timestamp first, then analyze its distribution. Summing each tenant's unrelated percentile does not yield a percentile of total demand.

## Enforce and test the chosen contract

Apply shared admission before allocating scarce work where possible. Combine tenant identity with operation cost, bounded queues, and concurrency limits. Include retry attempts in resource demand even if billing counts only successful business operations. Fair admission needs an explicit policy for small tenants while a large tenant saturates its allowance.

Test all tenants at steady limits, all burst buckets full, the expensive allowed request mix, one noisy tenant, and the required failure scenario. Observe useful completion rate and latency per tenant as well as aggregate utilization. Validate that rejected work did not already acquire the database connection or launch the expensive query.

A capacity decision is ready when it names the allowed joint demand, demonstrates how each shared bottleneck accommodates or rejects it, and states what happens when tenants arrive together. The quota numbers alone cannot provide that evidence.
