# How to Remove Shared Failure Domains from Internal and External Monitors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, High Availability, Reliability, SRE

Description: Separate monitoring execution, dependencies and notification paths so an infrastructure failure cannot silence every observer at once.

Two monitors are not independent just because one is called internal and the other external. They can share a cloud account, recursive DNS resolver, identity provider, NAT gateway, secret store or paging integration. A failure in any shared dependency can disable both at exactly the time they are needed.

The useful design question is specific: after this dependency fails, which observer can still detect the customer symptom, decide that it matters and notify a reachable responder? Draw that complete path for each major failure scenario.

## Inventory the dependencies behind each check

Build a small matrix before adding another probe location:

| Dependency | Internal observer | External observer | Independent escape path |
| --- | --- | --- | --- |
| Runtime | Production Kubernetes | Same cloud account | Separate account or provider |
| DNS | Cluster resolver | Corporate resolver | Independently operated resolver |
| Credentials | Shared secret store | Same secret store | Bounded offline test credential |
| Rule evaluation | Central metrics backend | Same backend | Separate deadline observer |
| Notification | Primary paging provider | Same provider | Tested alternate destination |

These are example failure domains, not a mandate to use a particular topology. Different regions within one account can help with a regional outage while leaving account suspension, global IAM changes or shared configuration mistakes unresolved.

Include control-plane dependencies as well as runtime dependencies. A monitor that keeps running during an identity outage can still be operationally unusable if responders cannot sign in to inspect or modify it.

## Distinguish customer paths from diagnostic paths

An internal health check can localize an application failure before traffic reaches it. An external transaction tests DNS, TLS, routing and the public entry point that customers actually use. Both are valuable, but they answer different questions.

For a Blackbox Exporter, define the expected response deliberately:

```yaml
modules:
  public_health:
    prober: http
    timeout: 5s
    http:
      method: GET
      valid_status_codes: [200]
      fail_if_not_ssl: true
      follow_redirects: false
```

This example checks HTTPS availability without accepting an unexpected redirect as success. It does not prove that an authenticated business transaction works. The [Blackbox Exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md) documents the HTTP probe options.

Choose whether a probe should use customer DNS or a diagnostic direct-origin path. Keep those checks separately named. A direct-origin check can help diagnose CDN failure but should not replace the public path in a customer-availability view.

## Separate the decision and notification machinery

Running probes in two places is insufficient if both results go to the same unavailable rule evaluator. Keep an independent observer that can notice missing renewals from the production monitoring system. It should have its own clock, state and notification capability.

Likewise, a second Alertmanager replica in the same cluster does not protect against the cluster disappearing. [Alertmanager high availability](https://prometheus.io/docs/alerting/latest/high_availability/) reduces instance-level notification risk, while deployment placement and external dependencies determine broader survivability.

Send Prometheus alerts to all configured Alertmanager replicas as recommended for the HA arrangement. Do not assume the gossip layer replicates every incoming alert as a substitute for delivering alerts to each member. Test partitions and expect that avoiding missed notifications may allow duplicates.

## Keep shared automation from becoming a shared outage

Independent instances can still receive the same bad configuration simultaneously. Roll monitoring configuration through a canary or staged deployment. Keep a known working recovery configuration and document which credentials are needed to restore it.

Avoid depending on production Git hosting, SSO and secret distribution simultaneously for emergency access. Choose an organization-approved recovery method and exercise it. The objective is a working operational path, not an ever-growing collection of unmanaged credentials.

## Test the matrix one failure at a time

A useful exercise disables one shared dependency in a controlled environment and follows the entire detection path. Examples include unavailable DNS, an expired probe credential, a broken route to the metrics backend and a blocked paging endpoint.

Record which observer remained healthy, what symptom it saw, which notification arrived and how long it took. A failure detected only after someone opened a dashboard does not demonstrate independent alerting.

Also test false independence: both probes can fail because they share a test account, while ordinary users remain healthy. Retain enough internal and external evidence to distinguish monitor failure from service failure. Google's [distributed-system monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/) provides the underlying distinction between symptoms and diagnostic causes.

## Conclusion

Remove shared failure domains across the full observation-to-notification path. Probe location is only one part of that path. Independent execution, credentials, decision state and reachable notification routes give you a defensible answer to which monitor will survive the next common dependency failure.
