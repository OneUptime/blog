# Validation Summary: How to Monitor Bad Passwords and Identity-Provider Failures Separately

## Status
validated

## Post Type
Technical guide with Prometheus metric examples, a PromQL expression, and authentication monitoring implementation guidance.

## Technologies Covered
- OAuth 2.0 authorization codes, refresh tokens, and client authentication
- Identity providers and OpenID Connect discovery and key endpoints
- Prometheus counters, labels, and PromQL
- Authentication monitoring, synthetic journeys, MFA, and passkeys
- SRE alerting, security logging, and secret management

## Sources Consulted
- OAuth 2.0, RFC 6749, sections 4.1, 5.2, and 6: https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
- OAuth 2.0 Security Best Current Practice, RFC 9700: https://www.rfc-editor.org/rfc/rfc9700.html
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/
- Prometheus text exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus query functions, including rate: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators, aggregation, and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- OpenID Connect Discovery 1.0, provider metadata and configuration retrieval: https://openid.net/specs/openid-connect-discovery-1_0.html
- Google SRE, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains technical implementation details and qualifies for technical validation.
- RFC 6749 supports the distinction between invalid grants and client authentication failures. Redirect mismatches and grants issued to a different client can cause invalid_grant; this error does not universally identify an incorrect password. HTTP status alone cannot provide the proposed classification.
- The sample metric names, quoted labels, and numeric samples follow Prometheus text exposition syntax. They are explicitly illustrative custom metrics, not built-in authentication metrics. Bounded labels and initializing known series to zero follow instrumentation guidance.
- The PromQL expression is syntactically valid: rate is applied to each counter before aggregation, both sides retain provider and region, and division matches those label sets. It yields a dependency-error fraction over all recorded dependency attempts, not a complete-journey success rate. Ordinary denials remain in the denominator but are excluded from the error numerator by the documented taxonomy.
- As the post states, deployment requires an agreed threshold and minimum request count. The expression alone is not a complete alert rule. Zero traffic can produce NaN, and missing series can produce absent results; initialized series and separate synthetic monitoring address different aspects of these conditions.
- Counting dependency retries separately from complete journeys is correct. Application-session failures can affect customer outcomes even when identity-provider exchanges succeed. Transport failures identify a dependency boundary and do not, by themselves, prove that the provider is the root cause.
- OpenID Connect discovery returns metadata and endpoint locations. Retrieving that document does not exercise authentication, token exchange, or application-session creation. Synthetic coverage must reflect the actual flow and MFA policy, as the post explains.
- Separating security investigation from availability alerts, protecting credentials in logs, using nonsecret correlation identifiers, and restricting canary privileges are consistent with the consulted monitoring and OWASP guidance.
- The referenced RFC, SRE chapter, and author profile resolve to the intended resources. No version-specific APIs, terminal commands, or deployable configuration files are present. The post does not recommend the resource owner password credentials grant, which current OAuth security guidance prohibits.
- Validation consisted of documentation and static example review. No live identity provider, canary, or Prometheus runtime was exercised; the proposed fault-injection cases remain implementation acceptance checks.
