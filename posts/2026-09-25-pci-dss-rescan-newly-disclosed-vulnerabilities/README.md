# How to Document New Vulnerabilities Found During PCI DSS Rescans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Vulnerability Scanning, Compliance

Description: Document scan-remediate-rescan evidence when new vulnerabilities appear, preserving asset coverage, original finding closure, and current remediation obligations.

---

You remediate every finding in a scan, run the rescan, and discover a newly published vulnerability. Deleting the original report loses the proof that the first set was fixed. Treating the new finding as somebody else's problem loses the ongoing vulnerability-management obligation.

PCI SSC FAQ 1152 explicitly addresses this situation. A collection of scan results can establish coverage and remediation when new vulnerabilities prevent one report from being clean. The collection must show complete required scanning and follow-through; it does not excuse missed scans, incomplete coverage, or old findings carried forward without remediation. [PCI SSC FAQ 1152](https://www.pcisecuritystandards.org/faqs/1152/)

## Preserve the scan cycle and finding identity

Assign an identifier to the scanning period and retain every original scan and rescan. For each observation, record stable asset identity, affected component, finding identifier, vulnerability identifier where available, and the scanner's supporting evidence.

Do not use IP address alone as the asset key. An address may move between cloud instances, and a replacement host may inherit the same vulnerability from an old image. Conversely, one vulnerability identifier may affect several independently patched products on the same host.

Use a timeline that keeps original and new findings distinct:

| Date | Observation | Required evidence |
|---|---|---|
| 2 September | Scan S1 finds issue A on hosts 1–20 | Scope, complete scan, risk ranking |
| 8 September | Fix deployed to hosts 1–20 | Change and actual deployment population |
| 9 September | Rescan S2 verifies A resolved; issue B appears | Verification of A and new record for B |
| 12 September | B remediated where applicable | Change and subsequent verification |

These dates illustrate recordkeeping. They do not define a grace period or a universal remediation deadline.

## Show that the original issue was resolved

A finding disappearing from a report is only useful when the rescan could still inspect the affected component. Compare target coverage, authentication status, enabled checks, application route, and relevant versions between the scans.

For example, if issue A affected a library inside the application container, an OS-only rescan cannot establish closure. If the scanner lost credentials on ten hosts, the remaining ten do not prove fleet-wide remediation. Record failed inspections as gaps and repeat them.

Link the fix to the deployed component, including any restart, image rollout, or firmware activation needed for the correction to take effect. Retain evidence for standby and disaster-recovery systems when they are in the scan population.

## Establish why the new observation is new

Record separate dates for public disclosure, vendor patch release, scanner detection availability, first observation in your environment, and risk review. These dates answer different questions.

A finding newly visible to your scanner is not necessarily a newly disclosed vulnerability. It may reflect restored credentials, expanded coverage, an old vulnerable package added by a deployment, or a revised detection signature. Document that distinction instead of automatically labeling every new report entry a new vulnerability.

Keep the advisory and scanner evidence that support the classification. If an earlier plugin missed a long-standing issue, route the current exposure into remediation and investigate the detection gap.

## Apply the correct treatment rules

Internal findings follow the entity's documented risk-ranking process. High-risk and critical vulnerabilities must be resolved; lower-ranked findings are addressed under the applicable targeted risk analysis. Security-update timing is a separate obligation: critical patches are due within one month of release, and other applicable patches follow risk-appropriate timeframes. [PCI SSC FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/)

Do not reset a release-based deadline to the rescan date. Likewise, a statement that a fix is planned does not establish that a previously required correction occurred.

For external ASV scans, the ASV Program Guide's passing criteria and reporting process apply. Provide the linked scan history to the ASV and retain its final report and disposition. An internal risk downgrade or a locally assembled spreadsheet cannot modify the ASV report. [PCI DSS v4.0.1, 11.3.2 and ASV Program Guide](https://www.pcisecuritystandards.org/document_library/)

## Assemble an evidence index, not a replacement report

Create an index pointing to the source records:

```text
Period -> in-scope asset inventory -> initial scan
Finding A -> corrective change -> rescan showing resolution
Finding B -> first observation -> ranking -> owner -> treatment -> verification
Coverage gaps -> recovery action -> completed inspection
```

Include an unresolved-findings view so the evidence does not conceal work still in progress. Preserve the original reports and their integrity; annotate an index rather than editing scanner output.

Have a reviewer trace several findings from detection to verification and reconcile the entire asset population. The resulting package should explain both what was fixed during the period and how the organization is handling current exposure. That is more informative than a green screenshot detached from the scans that produced it.
