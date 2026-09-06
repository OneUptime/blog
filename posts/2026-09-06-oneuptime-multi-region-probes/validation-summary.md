# Validation Summary: How to Run OneUptime Probes in Multiple Regions and Avoid False Outage Alerts

## Status
validated

## Post Type
Technical deployment and monitoring guide.

## Technologies Covered
- OneUptime custom probes and monitor criteria
- Multi-region monitoring, probe agreement, and failure domains
- Docker containers, environment variables, restart policies, and image pinning
- DNS, outbound routing, NAT allowlists, HTTP checks, and TLS validation
- Probe connection notifications and incident response

## Sources Consulted
- [OneUptime custom probes](https://oneuptime.com/docs/en/probe/custom-probe): dashboard location, probe credentials, image, environment variables, and deployment examples.
- [OneUptime website monitors](https://oneuptime.com/docs/en/monitor/website-monitor): response criteria, latency checks, and TLS validation settings.
- [OneUptime 12.0.33 monitor model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/Monitor.ts): optional numeric minimumProbeAgreement field and documented default.
- [OneUptime 12.0.33 agreement implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorResource.ts): active-probe filtering, effective threshold, criterion grouping, winner selection, and status-change gating. Retrieved the official raw GitHub file because the browser could not render the GitHub blob page.
- [OneUptime current agreement implementation](https://github.com/OneUptime/oneuptime/blob/master/Common/Server/Utils/Monitor/MonitorResource.ts): compared the relevant logic with the cited release; the reviewed behavior is also present in the retrieved master source.
- [OneUptime 12.0.33 probe service](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/ProbeService.ts): connection-status notifications to probe owners, falling back to project owners.
- [Docker container run reference](https://docs.docker.com/reference/cli/docker/container/run/): --name, --restart unless-stopped, -e, -d, and image-reference syntax.
- [Docker bridge networking](https://docs.docker.com/engine/network/drivers/bridge/): default container networking and outbound masquerading.

## Issues Found
1. **Agreement was described as matching status.** The implementation groups evaluated results by criterion ID for the monitor step, with a separate group for no criterion matched. Different criteria that produce the same status do not pool their votes. Corrected the explanation, qualified the table, and specified that the two-path failure test must match the same outage criterion.
2. **Threshold one was described as allowing any individual failure to change status.** The implementation first chooses the largest matching group, then checks its size against the threshold. A single failure cannot override two matching healthy results. Corrected the paragraph to explain that threshold one can allow an uncorroborated winner, including a tie when no larger group exists.
3. **Recovery testing assumed the configured threshold always applies.** Changed the recovery test to use the effective threshold because disconnected probes can reduce it.
4. **Image pinning was ambiguous beside a floating release tag.** Clarified that readers must replace the example tag with a tested version or digest to achieve the stated pinning recommendation. The documented release image remains a valid deployment example.

## Review Notes
- Confirmed the unset threshold requires all enabled, connected monitor-probe assignments; disabled or disconnected assignments are excluded. The effective threshold is the smaller of the configured count and active-probe count. The post now explicitly scopes this implementation description to 12.0.33.
- Agreement evaluates stored per-probe results for a monitor step, rather than requiring simultaneous checks. A connected probe without a stored result is skipped in vote counting but remains in the active-probe denominator. The agreement helper itself does not apply a result-age cutoff, and treats zero active probes as agreement met if invoked; this is not evidence of healthy coverage.
- The majority examples are valid under the stated active-probe and matching-criterion assumptions. One offline probe leaves a three-probe, threshold-two setup requiring both remaining probes, so another disagreement can prevent transitions.
- Independent networks, DNS paths, and providers reduce correlated vantage-point failures. Majority availability cannot guarantee every region is healthy or establish the underlying cause. Stable health assertions and per-region observations remain appropriate.
- The Docker command is syntactically valid. The region credential variables must be populated, and the example OneUptime URL must be replaced with the reachable deployment URL. Default bridge networking can support outbound HTTP monitoring; the official Docker example uses host networking, which may be appropriate for targets requiring host-specific network access.
- Probe connection notifications exist, but delivery depends on owners and notification configuration. Incident notifications and recovery also depend on the configured monitor criteria and actions; agreement alone does not configure paging.
- The release tag is mutable and is not proof that a running image is version 12.0.33. No claim is made that 12.0.33 is the latest available release.
- Documentation links resolved; the versioned GitHub source paths were verified through their official raw equivalents. The author link is a plausible GitHub profile URL, and the example deployment hostname is a placeholder.
- Validation consisted of official documentation/source review and Bash syntax checking. No container was deployed, no credentials were used, and no live multi-region failure or notification tests were executed.
