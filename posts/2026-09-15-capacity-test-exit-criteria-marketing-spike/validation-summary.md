# Validation Summary: How to Define Capacity Test Exit Criteria Before a Marketing Traffic Spike

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana k6
- JavaScript
- Load and capacity testing
- Service-level objectives (SLOs)
- Google Site Reliability Engineering launch practices

## Sources Consulted
- [Grafana k6: Constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)
- [Grafana k6: Arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/)
- [Grafana k6: Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [Grafana k6: Built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/)
- [Grafana k6: Tags and groups](https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/)
- [Grafana k6: HTTP requests](https://grafana.com/docs/k6/latest/using-k6/http-requests/)
- [Grafana k6: Functional testing](https://grafana.com/docs/k6/latest/examples/functional-testing/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Google SRE Book: Launch Coordination Checklist](https://sre.google/sre-book/launch-checklist/)

## Issues Found
No technical issues found.

## Review Notes
The numerical capacity, latency, error-rate, recovery, and VU values are explicitly identified as illustrative and must be calibrated for the tested system. The k6 example correctly uses a threshold to turn failed checks into a failed test outcome, scopes metrics with the built-in `scenario` tag, disables redirects so each iteration issues one request, and gates dropped iterations to preserve the offered-load claim. No version-specific or deprecated APIs are used.
