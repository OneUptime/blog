# Validation Summary: How to Diagnose Dropped k6 Iterations Before Declaring a Service at Capacity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana k6
- JavaScript
- Arrival-rate load testing
- Capacity planning and performance monitoring

## Sources Consulted
- [Grafana k6: Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/)
- [Grafana k6: Arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/)
- [Grafana k6: Constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)
- [Grafana k6: Built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/)
- [Grafana k6: Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [Grafana k6: Open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)

## Issues Found
- The illustrative JavaScript example referenced `http` and `sleep` without importing them. Added the official k6 imports so the snippet is executable as shown.
- The VU-demand example said that preallocating 100 VUs could not maintain a mean demand of 120 VUs. That was too absolute because a configured `maxVUs` greater than 100 can let k6 allocate more VUs dynamically. Changed the statement to say that limiting the executor to 100 VUs cannot maintain the workload.

## Review Notes
The executor-specific meanings of `dropped_iterations`, arrival-rate pacing behavior, VU-demand arithmetic, built-in metric definitions, and threshold expressions agree with the current Grafana k6 documentation. The post appropriately treats the VU calculation as an estimate rather than a guarantee and distinguishes iteration rate from HTTP request rate.
