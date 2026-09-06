# Validation Summary: How to Create an Authenticated API Monitor in OneUptime

## Status
validated

## Post Type
Tutorial / configuration guide with JSON, HTTP header settings, and templated JavaScript expressions.

## Technologies Covered
- OneUptime 12.0.33 API monitors and monitor secrets
- HTTP/REST APIs, bearer authentication, and JSON
- TLS and mutual TLS client certificates
- JavaScript monitoring criteria and historical metric evaluation

## Sources Consulted
- [OneUptime API monitor documentation](https://oneuptime.com/docs/en/monitor/api-monitor): request options, JSON bodies, redirects, certificate validation, mTLS, and historical evaluation.
- [OneUptime monitor secrets documentation](https://oneuptime.com/docs/en/monitor/monitor-secrets): secret creation, explicit monitor access, reference syntax, and value visibility.
- [OneUptime JavaScript expression documentation](https://oneuptime.com/docs/en/monitor/javascript-expression): response variables, interpolation, and boolean expressions.
- [12.0.33 criteria evaluator](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorCriteriaEvaluator.ts): first-match ordering, All filter semantics, JSON parsing, JavaScript execution, and error handling.
- [12.0.33 VM API](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/VM/VMAPI.ts) and [VM runner](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/VM/VMRunner.ts): placeholder substitution and actual sandbox timeout.
- [12.0.33 historical evaluation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/Criteria/EvaluateOverTime.ts) and [API request criteria](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/Criteria/APIRequestCriteria.ts): metric-backed windows, coverage, and no-data handling.
- [12.0.33 monitor resource handling](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorResource.ts): default-status behavior when no criterion matches.
- [12.0.33 monitor step model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/Monitor/MonitorStep.ts): client certificate, key, passphrase, and retry settings.

## Issues Found
1. **Independent success checks could bypass JSON validation.** The original instructions introduced an Online status check followed by a JSON check without requiring both in the same criterion. API criteria use first-match-wins evaluation. Changed the instructions to require both filters in one Online criterion, replace broader Online rules, and place an explicit Offline catch-all afterward with alert or incident actions. This also handles failed expressions without relying on a potentially healthy default status.
2. **Incorrect version-specific timeout.** The documentation says one second, but the 12.0.33 evaluator supplies no timeout override and the VM runner defaults to 5,000 milliseconds. Corrected the post to five seconds and explained that execution errors and timeouts leave the filter unmatched.
3. **Historical evaluation scope and missing-data behavior were ambiguous.** The paragraph following the JavaScript examples could imply that expression results can be evaluated over time or that If No Data independently detects a stopped evaluator. Clarified that supported metric filters use historical windows, the shown expressions inspect the current response, and missing-data policy applies when an evaluation actually runs.

## Review Notes
- Checked the official repository’s local 12.0.33 tag, resolving to bccf2519397d334a40cda3c5c87a5d7e29f35ed5. Source at that tag takes precedence over the conflicting timeout statement in the unversioned documentation.
- Confirmed the linked documentation pages resolve to the intended resources. The example API hostname and token name are placeholders, not a live service or credential.
- The JSON sample is valid. JavaScript snippets use OneUptime template syntax and become JavaScript after substitution; they are not standalone JavaScript files. The expected healthy and unhealthy comparisons were checked locally.
- Request headers, JSON request bodies, secret access, strict TLS settings, optional mTLS, and bounded retry configuration are supported. Least-privilege credentials and controlled failure-mode tests are appropriate operational guidance.
- Historical All Values requires window coverage; Any Value can match a single recorded breach. A sustained transport-failure window does not automatically debounce the current-response JSON check or an unconditional Offline fallback.
- No live OneUptime deployment or authenticated endpoint was used. TLS failures, notification delivery, recovery, and secret visibility were reviewed against documentation/source, not exercised end to end. The post retains its staging verification instructions.
