# How to Choose Monitoring Tools for an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Air-Gapped, Monitoring, Observability

Description: Compare monitoring tools for isolated networks by offline installation, licensing, local storage, alert delivery, and the work required to maintain them.

A monitoring product can have excellent dashboards and still be a poor choice for an isolated network. The problem may appear only when you replace a server, renew a license, install a plugin, or try to notify someone outside the facility.

Choose tools by the work they let your team complete without internet access. This guide provides a selection process and compares operational tradeoffs using Prometheus with Grafana, Zabbix, and OneUptime as examples. It is based on official documentation reviewed on 20 November 2026, not hands-on product testing or performance benchmarks.

## Start with Requirements That Can Reject a Candidate

Write down the decisions monitoring must support. A facility watching network equipment has different needs from a team diagnosing distributed application requests. Specify required signals, supported operating systems, retention, incident workflow, and the people who will maintain the installation.

Then establish requirements that cannot be traded for a higher feature score:

- A replacement machine must install from approved internal artifacts.
- Required features must work without public activation or recurring online entitlement checks.
- Telemetry, configuration, backups, and operator authentication must fit the permitted network boundary.
- An alert must reach an attended destination available inside that boundary.
- Security updates must arrive through the organization's approved transfer process.

Make each requirement concrete. Replace “supports offline use” with “a second administrator can install the selected release on an empty host using only the approved bundle and internal services.” Record failures as disqualifiers or explicit remediation work, not as small deductions in an average score.

## Compare Complete Deployments

Compare the components you would actually operate, including databases, exporters, plugins, and notification services. A dashboard alone is not equivalent to a complete monitoring platform.

| Candidate | Deployment to evaluate | Main selection question |
| --- | --- | --- |
| Prometheus with Grafana and Alertmanager | Metrics collection, local metrics storage, dashboards, alert routing, and required exporters | Does the flexibility justify maintaining separate components and their integrations? |
| Zabbix | Server, database, web frontend, and required agents or proxies | Can your team maintain the supported database and frontend dependencies for its chosen release? |
| OneUptime | Application services, PostgreSQL, ClickHouse, Valkey, probes, and chosen integrations | Does the integrated workflow justify the infrastructure and database operations it requires? |

These are evaluation starting points, not rankings. Zabbix publishes a [release-specific requirements matrix](https://www.zabbix.com/documentation/current/en/manual/installation/requirements); OneUptime describes its application and database components in its [air-gapped deployment overview](https://oneuptime.com/enterprise/air-gapped/). Freeze the version under evaluation because a moving “current” documentation page can describe different dependencies later.

## Evaluate Installation Beyond the Main Image

Request an artifact inventory for every candidate. It should name exact versions, CPU architectures, checksums or digests, source locations, and installation order. Include operating-system packages, database extensions, plugins, migration jobs, and any images used only during upgrades.

A useful comparison is the effort required to produce a repeatable bundle. OneUptime documents an air-gap workflow that exports the release's chart images and signed chart with checksums, then imports images into an internal registry. That provides a starting point; evaluate the surrounding cluster and infrastructure dependencies separately. See its [offline deployment instructions](https://oneuptime.com/enterprise/air-gapped/).

For Grafana, plugin acquisition deserves its own inventory. The official documentation supports [installation from a downloaded ZIP archive](https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/) for environments without internet access. A plugin listed in a configuration file is not evidence that its files are already available locally.

Have the evaluator install from an empty machine and a fresh browser profile. Record unexpected download attempts, missing dependencies, and manual repairs. Compare the number of undocumented interventions as well as elapsed time: an installation that works only because its author remembers an extra package is expensive to recover.

## Separate Software Licensing from Offline Entitlements

Attach the license files for the exact release and edition to the evaluation record. Avoid describing an entire ecosystem with one license label.

| Software scope | Published license information |
| --- | --- |
| Prometheus | Apache License 2.0, according to the [Prometheus FAQ](https://prometheus.io/docs/introduction/faq/) |
| Grafana's core open-source project | AGPLv3 following the change documented on [Grafana's licensing page](https://grafana.com/licensing/); check the selected distribution and plugins separately |
| Zabbix | AGPLv3 from version 7.0 onward; versions through 6.4 use GPLv2, according to the [Zabbix license page](https://www.zabbix.com/license) |
| OneUptime repository | Apache License 2.0 outside the stated exceptions; `ee/`, when present, has an Enterprise License, and third-party components retain their own licenses, per the [repository license](https://raw.githubusercontent.com/OneUptime/oneuptime/master/LICENSE) |

An entitlement is the permission a vendor grants your installation to use a paid feature, often represented by a license file or token. License identification does not establish that a commercial feature works offline. For any paid edition or plugin, request written answers covering activation, renewal, expiration, replacement hardware, and disaster recovery. Ask which features stop working when an entitlement expires and whether an offline renewal file can be transferred through the approved process.

Keep support subscriptions separate from runtime authorization in the comparison. Record both costs and procedures. Also assign review of modifications and redistribution to the organization's software licensing process rather than treating the absence of internet access as a licensing exemption.

## Compare Storage Operations, Not Just Retention Settings

List where each candidate stores telemetry, configuration, credentials, and backups. Identify which stores must recover together and which data can be recreated.

Prometheus includes a local time-series database, but its local storage is not clustered or replicated. Its documentation also excludes NFS from supported local-storage filesystems. If a proposal depends on shared NFS or transparent database failover, resolve that mismatch before scoring it. See the [Prometheus storage documentation](https://prometheus.io/docs/prometheus/latest/storage/).

For Zabbix, compare the database version your team already operates with the selected release's supported versions. For OneUptime, assign explicit owners for PostgreSQL, ClickHouse, and Valkey. A platform with one interface can still require several operational skill sets.

Give each shortlisted deployment the same representative workload and retention target. Measure stored growth, query latency during ingestion, backup duration, and restore duration. Require evidence that old data is actually removed and that ingestion remains usable as storage approaches its planned limit. Do not compare one vendor's compressed storage estimate with another candidate's raw input volume.

## Make Notification Delivery a Selection Criterion

Count usable notification paths rather than integration logos. A public messaging or paging API cannot be the only response mechanism in a network with no route to it.

Alertmanager supports a configured SMTP server and webhook receivers through its [notification configuration](https://prometheus.io/docs/alerting/latest/configuration/). Those mechanisms can target internal services, but the destination still needs credentials, certificate trust, availability, and an operator who watches it.

Ask every candidate to demonstrate the intended local route. If email is proposed, establish whether recipients can read the mailbox from their response location. An internal relay that queues mail for an unreachable external service does not meet the requirement.

Evaluate alert grouping, escalation, acknowledgment, and recovery messages separately. Delivery support does not automatically provide the incident workflow your team needs. Require a record of a test notification reaching the designated operator, plus a documented fallback when that destination fails. These are proposed acceptance checks, not results claimed for the products here.

## Price the Maintenance Work

Estimate annual cost as subscriptions plus infrastructure, artifact preparation, upgrade rehearsals, recovery exercises, and staff time. Include the delay between an upstream security release and approval to import it.

Inspect optional outbound behavior explicitly. Grafana documents controls for usage reporting, version checks, and plugin update checks in its [configuration reference](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/). Disabling these checks transfers update awareness to your maintenance process; it does not remove the need to track releases.

Ask the supplier or internal owner how support works without remote access. Define what diagnostic information can leave the environment, how it is sanitized, and who prepares it. Rehearse an upgrade and recovery before committing: database migrations may make restoring the previous executable alone insufficient.

## Make the Decision from Evidence

After mandatory requirements pass, score candidates from zero to five in five categories: installation repeatability, licensing administration, storage and recovery, notification workflow, and maintenance effort. Set weights before demonstrations; for example, assign 20, 15, 25, 20, and 20 percent respectively. Calculate each contribution as its weight multiplied by the score divided by five.

For every score, record an evidence reference and an owner. Treat an unverified claim as pending, not as a passing result. A documentation review can justify a shortlist; a completed rehearsal should justify production approval.

Select the deployment that meets your operational needs with work your team can sustain. Preserve the exact release inventory, unresolved limitations, recurring costs, and acceptance evidence with the decision. That record makes the next renewal or replacement review much more useful than repeating a feature comparison from scratch.
