# Validation Summary: How to Measure API Capacity Under a Latency SLO with k6 Arrival-Rate Tests

## Status
validated

## Post Type
Technical guide with a runnable k6 load-test example

## Technologies Covered

- Grafana k6
- k6 JavaScript test scripts
- Constant-arrival-rate load testing
- Custom `Rate` and `Trend` metrics
- k6 thresholds and built-in HTTP metrics
- API capacity planning and latency SLO validation

## Sources Consulted

- [Grafana k6: Constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)
- [Grafana k6: API load testing](https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/)
- [Grafana k6: Arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/)
- [Grafana k6: Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/)
- [Grafana k6: Built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/)
- [Grafana k6: Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [Grafana k6: Options reference](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/)
- [Grafana k6: Graceful stop](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/)

## Issues Found
No technical issues found.

## Review Notes
The example correctly distinguishes iteration arrival rate from HTTP request rate, uses one request per iteration, and prevents redirects. Its executor fields, custom metrics, threshold expressions, environment-variable command, and VU sizing explanation agree with current k6 documentation. The wall-clock custom latency includes client-call overhead and connection establishment, while `http_req_duration` excludes initial connection setup as stated. The post also appropriately treats zero dropped iterations as necessary but not sufficient evidence that the intended workload reached the service. No k6 version is pinned, so future changes to the latest documentation may require revalidation.
