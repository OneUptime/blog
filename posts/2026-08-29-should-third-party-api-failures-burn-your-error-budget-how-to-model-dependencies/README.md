# Should Third-Party API Failures Burn Your Error Budget? How to Model Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Error Budget, Dependencies, Third-Party APIs, Reliability, SRE

Description: Count failed user outcomes regardless of fault while using separate dependency signals to assign remediation and architectural risk.

---

If a payment provider fails and your customer cannot check out, the checkout SLI should classify the journey as bad, consuming the checkout SLO's error budget. The user experienced a failed promise; the provider's ownership does not make the checkout usable.

That does not mean every provider error should be classified as bad by every service SLI. Separate **compliance**, which follows the user outcome, from **attribution**, which explains why it happened and who should act.

## Use Two Layers of Measurement

### User-Outcome SLI

Measure at the boundary where the product promise is fulfilled:

```text
good checkout journeys / eligible checkout journeys
```

If a hard dependency prevents completion within the promised deadline, the event is bad whether the cause is application code, a cloud service, a bank API, DNS, or a network path. Excluding external causes turns the SLI into a measure of blame rather than reliability.

### Dependency and Component SLIs

Record separate diagnostic outcomes:

```text
provider calls by dependency, operation, result, and failure class
fallback activations and outcomes
dependency latency
journey failures attributed to each cause
```

These signals answer which risk to mitigate, support supplier escalation, and prevent a provider incident from being mistaken for an application regression. They should not rewrite the top-level event after the fact.

## Classify the Dependency

For every third party, identify:

- **Hard dependency:** the journey cannot succeed without it.
- **Soft dependency:** stale data, cached state, deferred work, or a reduced feature can preserve the promised outcome.
- **Optional enhancement:** failure removes a nonessential feature but not the defined outcome.
- **Control-plane dependency:** needed for change or recovery but not every request.

Only impact that breaks the defined outcome burns that outcome's budget. A recommendation API outage should not count as bad in the product-view SLI if the page intentionally falls back to a valid view without recommendations. It may count as bad in a separate recommendation-quality SLI and consume that SLO's error budget.

## Model Risk Before Production

For independent hard dependencies used in sequence, a rough theoretical ceiling is:

```text
A_journey = A_application x A_dependency1 x A_dependency2 ...
```

Two independent, truly redundant choices that both can satisfy the same outcome have theoretical availability:

```text
A_redundant = 1 - (1 - A_primary) x (1 - A_fallback)
```

These formulas are design estimates, not substitutes for end-to-end SLI measurements. Independence often fails because providers share regions, networks, credentials, DNS, data, quotas, or your failover code. Public SLAs also have definitions and exclusions that differ from your user promise. Measure the end-to-end journey and test failover.

Build a budget allocation for planning:

| Risk source | Estimated share | Mitigation |
|---|---:|---|
| Application changes | 35% | canaries and automated rollback |
| Payment provider | 30% | second provider or queued completion |
| Data store | 20% | tested failover |
| Unknown | 15% | instrumentation reserve |

The shares are forecasts, not exemptions. If one source repeatedly exceeds its allocation, change the architecture, supplier, feature behavior, or achievable SLO.

## Decide Eligibility Before an Incident

Document these cases:

- Provider failure prevents an eligible journey: **bad**.
- Your circuit breaker rejects while the provider is unhealthy: **bad** if the promised journey still fails; the breaker limits damage but does not create success.
- Fallback returns an outcome users consider acceptable: **good** for the main SLI, with a degraded-mode metric.
- Provider rejects an invalid user request: usually **ineligible** or a correctly handled response, depending on the product definition.
- Provider throttling causes an eligible journey within your promised supported load to fail or miss its deadline: **bad**.
- Traffic exceeds a published customer quota: usually **ineligible**, provided the quota is enforced and visible consistently.
- Async work succeeds within the promised deadline after a transient provider error: **good** for the logical journey; attempts remain diagnostic.

Do not introduce a “third-party exclusion” during an outage. Retroactive exclusions make budgets incomparable and reward weak dependency design.

## Let Attribution Change the Response, Not the Truth

An error budget policy can specify different actions by cause. An internal bad release may trigger a deployment freeze; a provider incident may trigger supplier escalation, failover work, or a procurement review. Both still consume the user-facing budget.

Track provider SLA claims separately. A service credit can offset cost, but it cannot restore customer outcomes or your error budget.

## References

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs and user journeys](https://sre.google/workbook/implementing-slos/)
- [AWS Well-Architected Reliability Pillar: Availability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [AWS: Availability with dependencies](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-dependencies.html)

## Conclusion

Third-party failures burn a user-facing error budget when they break the user-facing promise. Preserve separate cause metrics so the right team can act, but do not let ownership erase impact.
