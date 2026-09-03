# How to Baseline kube-hunter Results Across Multiple Clusters Without Duplicating Noise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Security, DevSecOps

Description: Build contextual kube-hunter fingerprints across clusters and vantage points while preserving raw evidence, surfacing changes, and expiring risk exceptions.

---

The same kube-hunter VID can appear on many nodes, from several scanner locations, and on every scheduled run. Sending every row as a new alert creates noise; collapsing everything by VID hides real spread. A useful baseline keeps three levels separate: immutable raw reports, normalized finding instances, and human-owned risk decisions.

## Freeze the Measurement Contract

Comparisons are valid only when their inputs mean the same thing. For each run record:

- immutable cluster ID, environment, region, and provider;
- scanner vantage point such as internet, corporate, Pod namespace, or control-plane network;
- explicit target inventory and DNS answers;
- kube-hunter image digest or source commit;
- exact arguments, passive/active mode, timeout, and worker settings;
- UTC timestamps and runner identity;
- relevant CNI, node, and cluster versions.

Do not merge an internet scan with an in-cluster scan. The upstream documentation explicitly describes those as different attacker perspectives.

## Preserve the Raw Report

Current kube-hunter JSON contains separate `nodes`, `services`, and `vulnerabilities` arrays. Store the complete original object in access-controlled object storage using a content hash. Reports can expose internal addresses, vulnerability evidence, and component details.

Validate the schema against the pinned revision before normalization. If the scanner fails, JSON is invalid, or expected targets were not attempted, mark the run `inconclusive`; never treat absence of rows as remediation.

## Create Stable Instance Keys

Build a normalized record for each vulnerability using fields that represent security identity:

~~~text
cluster_id
vantage_id
vid
canonical_component_or_location
target_identity
scanner_revision
first_seen
last_seen
status
raw_report_hash
~~~

The current reporter provides `vid`, `location`, `hunter`, severity, display name, description, evidence, and reference. It does not provide your organization’s cluster or vantage identifiers; the orchestration pipeline must attach those.

A reasonable primary fingerprint is:

~~~text
SHA256(cluster_id | vantage_id | vid | canonical_target)
~~~

Do not key only by VID: one fixed node should not close the finding on other nodes. Do not key by the entire evidence string: counts, ordering, IP formatting, or response text can change without changing the weakness. Keep scanner revision outside or alongside the logical key so upgrades can be analyzed rather than silently creating a new universe.

## Canonicalize Carefully

Map ephemeral node IPs to a durable target identity from cluster inventory, such as node pool plus node UID or a managed control-plane identifier. Preserve the original location. Sort arrays before diffing because concurrent discovery can change order.

Normalize only known volatile fields. For example, do not strip a port from a location when the port distinguishes kubelet from API exposure. Do not discard evidence broadly; calculate a separate `evidence_hash` after documented redaction and retain raw evidence in the protected report.

Services need their own keys, such as cluster, vantage, service name, canonical target, and port. A service becoming newly reachable is noteworthy even without a vulnerability, but it should not be mislabeled as an exploit.

## Model State Transitions

For each fingerprint, report:

- **new:** present now, absent from the last comparable successful run;
- **persistent:** present in both;
- **changed:** same logical instance but severity, hunter, or material evidence changed;
- **resolved candidate:** absent now after a complete comparable scan;
- **inconclusive:** target or scanner coverage failed;
- **reopened:** previously verified resolved, now present again.

Require two successful comparable absences or another explicit verification before marking high-risk items resolved if network scans are prone to transient loss. Keep “resolved candidate” from paging as new while still requiring closure evidence.

## Deduplicate Notifications, Not Risk

Aggregate notifications by owner and remediation action. Twenty nodes inheriting the same insecure node-pool template can generate one incident with an affected-target list. Keep every underlying instance so partial rollout remains visible.

Likewise, group the same VID across dev clusters only if the owner and root cause truly match. Production should retain its own SLA and evidence. The dashboard may show one group; the database must still answer “which cluster, which vantage, which targets?”

## Treat Exceptions as Expiring Data

An accepted baseline is not an exception. Store exceptions separately with fingerprint scope, owner, justification, compensating controls, ticket, approval, and expiration. An expired exception becomes actionable automatically. A scanner upgrade, cluster rebuild, widened network vantage, or severity change should trigger review.

Never suppress by display name alone. kube-hunter provides VIDs and Aqua references specifically suited to stable identification, but their implementation and severity still need review at the pinned revision.

## Roll Out the Baseline

Start with one cluster and two vantage points. Manually reconcile normalized rows against raw JSON and inventory. Then backfill other clusters without alerting until ownership is assigned. On the first live comparison, alert on new and changed actionable findings, coverage failures, and reopened items—not every persistent row.

Publish coverage alongside risk: targets expected, targets reached, reports valid, and last successful run. A quiet dashboard with 30% coverage is not a healthy baseline.

## Conclusion

Deduplicate kube-hunter notifications using a contextual fingerprint of cluster, vantage, VID, and canonical target. Preserve raw reports, track every affected instance, distinguish services from vulnerabilities, and model coverage failures explicitly. Group alerts by remediation while keeping exceptions narrow and expiring; this reduces noise without erasing exposure.

## Official References

- [kube-hunter scanning perspectives](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter base report fields](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter report collector](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/collector.py)
- [kube-hunter vulnerability types and severity mapping](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/types.py)
- [Kubernetes object names and UIDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

