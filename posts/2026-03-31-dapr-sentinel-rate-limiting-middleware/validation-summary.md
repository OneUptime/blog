# Validation Summary: How to Use Sentinel Middleware for Dapr Rate Limiting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar HTTP middleware pipeline)
- Alibaba Sentinel (traffic control / rate limiting library)
- Sentinel-golang (Go implementation used by Dapr)
- Dapr Resiliency CRD
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr Sentinel middleware reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-sentinel/
- Sentinel-golang flow rule source (core/flow/rule.go) on GitHub: https://github.com/alibaba/sentinel-golang
- Sentinel-golang circuit breaker rule source (core/circuitbreaker/rule.go) on GitHub
- Dapr middleware source (components-contrib/middleware/http/sentinel/) for HTTP status code verification
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### Issue 1: Incorrect `controlBehavior` values in flow rule explanation
- **What was wrong:** The post listed three `controlBehavior` values: `0` = Reject immediately, `1` = WarmUp, `2` = Wait. In Sentinel-golang, there are only two values: `0` = Reject and `1` = Throttling (queuing). "WarmUp" is a `tokenCalculateStrategy` value, not a `controlBehavior`. There is no value `2`.
- **What was changed:** Updated the `controlBehavior` line to: `0` = Reject immediately, `1` = Throttling (queuing).
- **Why:** The original values were factually incorrect per the Sentinel-golang source code (`core/flow/rule.go`).

### Issue 2: Incorrect circuit breaker `strategy` value and explanation
- **What was wrong:** The post stated `strategy: 0` is error ratio. In Sentinel-golang, strategy `0` is `SlowRequestRatio`, strategy `1` is `ErrorRatio`, and strategy `2` is `ErrorCount`. The YAML example used `"strategy": 0` while the explanation described error-ratio behavior.
- **What was changed:** Changed `"strategy": 0` to `"strategy": 1` in the YAML example, and updated the explanation to: "`strategy: 1` is error ratio (`0` = slow request ratio, `2` = error count)."
- **Why:** The strategy value did not match the described behavior. Since the text described error-ratio semantics, the correct fix was to change the strategy value to `1` and clarify all three valid values.

## Review Notes
- The Sentinel middleware component supports additional rule types beyond `flowRules` and `circuitBreakerRules`: `hotSpotParamRules`, `isolationRules`, and `systemRules`. The post focuses on the two most common rule types, which is reasonable for a tutorial.
- The `statIntervalInMs` field name in flowRules differs from `statIntervalMs` in circuitBreakerRules — this inconsistency is in the upstream Sentinel-golang library itself and the post correctly uses the right field name for each rule type.
- The HTTP 429 status code for rejected requests was verified correct against the Dapr Sentinel middleware source code.
- The `METHOD:/path` resource format was verified correct against the source code (`r.Method + ":" + r.URL.Path`).
- The httpPipeline Configuration and Resiliency CRD structures are correct.
