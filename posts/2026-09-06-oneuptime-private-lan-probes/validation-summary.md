# Validation Summary: How to Monitor Private LAN Services with OneUptime Probes

## Status
validated

## Post Type
Tutorial / deployment and troubleshooting guide.

## Technologies Covered
- OneUptime 12.0.33 custom probes and monitor configuration
- Docker containers, environment variables, restart policies, and host networking
- Private LAN routing, DNS, network policy, and HTTPS/TLS trust
- curl diagnostics

## Sources Consulted
- [OneUptime custom probes](https://oneuptime.com/docs/en/probe/custom-probe) — dashboard registration, credentials, image, Docker example, and instance URL.
- [OneUptime private network access, tagged 12.0.33 documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/self-hosted/private-network-access.md) — affected monitor type, probe-local configuration, bundled probes, and address restrictions. The live documentation URL returned a fetch error, so the official versioned source was consulted.
- [OneUptime 12.0.33 probe configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Config.ts) — exact environment variable and boolean parsing; scope of the setting.
- [OneUptime 12.0.33 Custom Code monitor implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Utils/Monitors/MonitorTypes/CustomCodeMonitor.ts) — passes the probe setting into the sandbox.
- [OneUptime 12.0.33 sandbox implementation](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/VM/VMRunner.ts) — request validation for sandbox HTTP calls.
- [OneUptime 12.0.33 registration](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Services/Register.ts) and [monitor fetching](https://github.com/OneUptime/oneuptime/blob/12.0.33/Probe/Jobs/Monitor/FetchList.ts) — outbound registration and work retrieval.
- [OneUptime 12.0.33 package metadata](https://github.com/OneUptime/oneuptime/blob/12.0.33/package.json) — confirms the specified version exists.
- [OneUptime API monitors](https://oneuptime.com/docs/en/monitor/api-monitor) — endpoint setup and status/body criteria.
- [Docker run reference](https://docs.docker.com/reference/cli/docker/container/run/) — environment flags, detached mode, naming, restart behavior, and automatic container removal.
- [Docker host networking](https://docs.docker.com/engine/network/drivers/host/) — namespace behavior and platform support.
- [Docker logs reference](https://docs.docker.com/reference/cli/docker/container/logs/) — `--tail=200`.
- [curl manual](https://curl.se/docs/manpage.html) and [official curl container repository](https://github.com/curl/curl-container) — `-fsS`, TLS verification, and the diagnostic image.

## Issues Found
1. **Incorrect scope of the private-network switch.** The post stated that it governed API, Website, External Status Page, and Custom JavaScript Code monitors. The 12.0.33 documentation and probe configuration identify only Custom JavaScript Code monitors as affected. Corrected the explanation, clarified that the flag is optional for the API example, and updated the conclusion. Scoped the forbidden-address statement to the affected monitor type and retained network policy as the control for other monitor destinations.
2. **Incorrect claim about bundled global probes.** The post said bundled probes ignore the setting and retain a strict public-target policy. The tagged documentation explicitly supports configuring the bundled probes, and the source reads the environment boolean without a project-ownership condition. Replaced that guarantee with the documented per-probe behavior and the guidance to leave the setting off on probes operated for others.
3. **Missing host-network platform prerequisite.** Added Linux Docker Engine or Docker Desktop 4.34+ with the feature enabled, as required by Docker's documentation.
4. **Diagnostic networking did not cover the alternative deployment.** The host-network curl example only matched the host-network probe deployment, although the post also allowed a dedicated Docker network. Clarified which deployment the example matches and instructed readers using a dedicated network to use it for diagnostics. Replaced the blanket same-namespace claim with network-configuration wording.

## Review Notes
- This is validation against official documentation and tagged source, plus shell syntax checks; no probe was deployed and no live LAN endpoint or dashboard session was available. Actual connectivity, probe assignment, timeline output, and TLS trust still require the deployment checks described in the post.
- Both Bash command blocks passed `bash -n`. The environment assignment syntax and Docker/curl flags are valid. The validation JSON was parsed and checked for the requested status and date.
- The review preserves the explicit 12.0.33 baseline. Moving `release` and `latest` tags do not guarantee that version; the post already recommends pinning a tested production probe image.
- The example domains are deployment placeholders and must be replaced with reachable instance and internal-service names. Documentation links identify the intended resources; the private-network page was verified through its official tagged source after the live fetch failed.
- A separate curl container has its own trust store and application configuration. A successful curl request supports network diagnosis but does not prove the probe's TLS trust or monitor criteria are configured correctly.
- Least-privilege routing, project membership, key handling, outbound communication, and independent-probe guidance remain appropriate. A namespace or Docker network alone does not enforce the stated restrictions; network policy must implement them.
