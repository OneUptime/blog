# Validation Summary: How to Configure Fault Injection for Chaos Testing on Google Cloud Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud URL maps
- URL map route rules and header matching
- Fault injection policy for delay and abort faults
- Google Cloud CLI (`gcloud compute url-maps import`)
- Python automation with `subprocess` and `requests`

## Sources Consulted
- Google Cloud Compute Engine REST API reference for URL maps: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud Load Balancing traffic management overview for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/traffic-management-global
- Google Cloud Load Balancing guide for URL maps and validation/import workflow: https://docs.cloud.google.com/load-balancing/docs/url-map
- Google Cloud CLI reference for `gcloud compute url-maps import`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud regional external Application Load Balancer traffic management guide, including fault injection examples: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-reg-traffic-mgmt

## Issues Found
- The post described fault injection support for Google Cloud Application Load Balancer without noting that classic Application Load Balancers do not support `faultInjectionPolicy`. Added that caveat in the introduction and conclusion.
- The `gcloud compute url-maps import` examples used global backend service paths but omitted `--global`. Added `--global` to the shell examples and the Python automation command so the commands target the intended global URL map and avoid region prompting.
- The shell examples used `--source=-` for stdin. The official CLI documentation says to omit `--source` to read from standard input, so the examples now pipe the heredoc into `gcloud compute url-maps import app-url-map --global`.
- The abort status text said "any other HTTP status code." The URL map API constrains `abort.httpStatus` to 200 through 599, so the text now states that range.
- The automation script claimed to remove fault injection but always wrote a `faultInjectionPolicy` with zero percentages. Updated the script to omit `faultInjectionPolicy` when both percentages are zero, and changed cleanup to call `update_fault_config()` with defaults.
- The automation script used a zero-percent abort status of 200 in baseline and delay-only scenarios. Changed those scenario values to 503 so the example avoids implying that HTTP 200 is a useful abort status.
- The simple P99 calculation used the 100th sorted element for a 100-request sample. Adjusted the index calculation to select the nearest-rank 99th percentile without going out of bounds.

## Review Notes
The URL map field names and fault injection YAML structure match current Google Cloud documentation. The embedded Python example was checked for syntax, but the full script was not executed because it requires a configured Google Cloud project, a real URL map, and the Google Cloud CLI.
