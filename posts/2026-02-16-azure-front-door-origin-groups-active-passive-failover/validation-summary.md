# Validation Summary: How to Set Up Azure Front Door with Origin Groups for Active-Passive Failover

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure Front Door origin groups
- Azure Front Door health probes
- Azure CLI
- Azure Monitor diagnostic settings
- Kusto Query Language (KQL)
- Flask
- psycopg2

## Sources Consulted
- Microsoft Learn: Azure Front Door health probes - https://learn.microsoft.com/en-us/azure/frontdoor/health-probes
- Microsoft Learn: Azure Front Door origins and origin groups - https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Microsoft Learn: Azure Front Door traffic routing methods to origin - https://learn.microsoft.com/en-us/azure/frontdoor/routing-methods
- Microsoft Learn: Azure CLI `az afd origin-group` reference - https://learn.microsoft.com/en-us/cli/azure/afd/origin-group
- Microsoft Learn: Azure CLI `az afd origin` reference - https://learn.microsoft.com/en-us/cli/azure/afd/origin
- Microsoft Learn: Azure CLI `az afd route` reference - https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Configure Azure Front Door logs - https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-logs
- Microsoft Learn: Azure Front Door monitoring data reference - https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door-reference
- Microsoft Q&A example of FrontDoorHealthProbeLog fields - https://learn.microsoft.com/en-us/answers/questions/2108588/front-door-health-probe-dnstimeout
- Flask API documentation: routing and responses - https://flask.palletsprojects.com/
- psycopg2 documentation: connection parameters - https://www.psycopg.org/docs/module.html

## Issues Found
- The introduction implied active-passive failover eliminates data consistency problems. I changed this to say it reduces those problems when the data layer is designed for failover, because Front Door origin failover alone does not solve database replication or consistency.
- The priority explanation said traffic shifts when priority 1 "fails all health checks." I changed this to "is marked unhealthy" because Azure Front Door evaluates the last configured sample window and successful sample threshold, not an unlimited set of checks.
- The explanation of `--additional-latency-in-milliseconds` incorrectly described it as a way to avoid failover due to latency differences. I changed it to clarify that it affects selection among healthy origins at the same priority and does not control priority-based failover.
- The failover timing was stated as approximately 20-40 seconds. With a 10-second probe interval, sample size 4, and 2 successful samples required, an origin generally needs enough failed samples to fall below the threshold, so I changed this to roughly 30-40 seconds and noted that edge location traffic and previous samples affect timing.
- The curl example searched for `x-fd-healthprobe`, which is not a response header that identifies the serving origin. I changed the test to recommend a distinct origin-provided header such as `X-Origin-Region`.
- The health probe KQL used `healthProbeResult_s` and `httpStatusCode_d`. I changed the query to use fields commonly emitted for FrontDoorHealthProbeLog entries: `result_s`, `httpStatusCode_s`, `originName_s`, and `pop_s`.

## Review Notes
The Azure CLI commands use current `az afd` command groups and options for Azure Front Door Standard/Premium. The local environment did not have Azure CLI installed, so command verification was done against the official Microsoft Learn CLI reference instead of local `az --help` output.
