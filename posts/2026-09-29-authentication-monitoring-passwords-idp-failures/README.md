# How to Monitor Authentication Without Confusing Bad Passwords with Identity-Provider Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Authentication, OAuth, Alerting

Description: Classify login outcomes by flow and failure boundary so invalid credentials, configuration regressions and identity-provider outages trigger appropriate responses.

A rise in failed logins can mean mistyped passwords, an expired client secret, a bot campaign or an unavailable identity provider. A single “authentication failure rate” mixes these situations and sends responders toward the wrong system.

Monitor the user journey and the dependency exchange separately. A user-visible failure tells you impact. The dependency result tells you which boundary may be responsible. Neither should be inferred from an HTTP status code alone.

## Define bounded outcomes at each boundary

Use an application-owned counter with a documented outcome taxonomy:

```text
auth_attempts_total{flow="interactive",outcome="success",provider="primary"} 2400
auth_attempts_total{flow="interactive",outcome="credential_rejected",provider="primary"} 42
auth_attempts_total{flow="interactive",outcome="dependency_error",provider="primary"} 7
auth_attempts_total{flow="interactive",outcome="configuration_error",provider="primary"} 0
```

These are custom metric names and example values. Initialize the known combinations so zero is observable. Keep labels bounded: flow, provider, region and a small outcome enum are useful; email address, username, token, raw error description and session identifier are unsuitable metric labels.

Record request attempts to token, discovery and key endpoints independently from complete user journeys. Retries can produce several dependency attempts for one login, so do not use their count as the login denominator.

## Interpret protocol errors in context

OAuth's [`invalid_grant`](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2) covers several invalid, expired or revoked grant conditions. It is not a universal synonym for a bad password. A refresh-token failure after revocation may be expected, while a sudden failure of newly issued authorization codes after a deployment can indicate redirect or client configuration trouble.

Likewise, `invalid_client` points at client authentication, which can involve a rotated secret or wrong authentication method. Transport timeouts, TLS failures, connection errors and provider server errors belong in dependency diagnostics. Preserve the protocol error class in a restricted structured log when necessary, while mapping metrics to a bounded category.

A classification table should be specific to each supported flow. Interactive login, token refresh, service credentials and passkey verification do not share identical normal failure patterns.

## Alert on dependency failures without counting denials

One dependency-focused query is:

```promql
sum by (provider, region) (
  rate(auth_dependency_requests_total{outcome="error"}[5m])
)
/
sum by (provider, region) (
  rate(auth_dependency_requests_total[5m])
)
```

Compare it with an agreed threshold and minimum request count. The counter's documented `error` category should include provider inability to complete a valid exchange, not ordinary credential denials. Maintain a separate configuration-error alert because a broken client can fail every request while the provider itself is healthy.

Use complete-journey success metrics for customer-facing impact. If valid and invalid credentials cannot be distinguished safely, describe the metric as observed login outcomes rather than claiming an SLO for all valid users. A denominator that includes attack traffic can greatly distort that claim.

## Add a synthetic valid journey

A controlled test identity can detect an outage during low traffic. Exercise the same redirect, token exchange and application-session creation path that users need. A successful discovery-document fetch only proves that document was available; it does not prove login works.

Give the canary minimal privileges and isolate its data. Store credentials through the normal secret-management mechanism. Design the test around the organization's MFA and authentication policy, and identify which paths it cannot cover. An API-token check does not validate an interactive MFA flow.

Alert separately on canary execution failures, credential expiry and actual authentication failure. Otherwise a broken test account becomes an apparent provider outage. Google SRE's [monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/) distinguishes internal diagnostic signals from externally observed symptoms.

## Keep abuse signals visible

A surge in rejected credentials may require security investigation even when availability is healthy. Route it through a separate policy using safe aggregation such as provider, region or known client application. Do not suppress these events just because they are excluded from the dependency availability alert.

Protect logs as carefully as metrics. Redact authorization codes, tokens, cookies and passwords before export. Correlate a failed journey with a nonsecret request identifier rather than embedding credentials in an alert notification.

## Test the classification

Exercise an incorrect password, an expired refresh token, a bad client secret, a blocked outbound connection, a provider timeout and an application-session write failure. Verify which counters change and which team receives the resulting notification. Include retries so one failed journey cannot silently inflate both numerator and denominator.

## Conclusion

Authentication monitoring works when outcome categories describe the actual flow and failure boundary. Keep expected denials, client configuration, provider availability and customer journey success separate, then use a valid synthetic journey to cover quiet periods without obscuring real-user or abuse signals.
