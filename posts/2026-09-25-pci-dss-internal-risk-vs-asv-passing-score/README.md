# How to Separate PCI DSS Internal Risk Rankings from ASV Passing Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Vulnerability Management, Security

Description: Keep environmental vulnerability rankings distinct from ASV scan scoring, preserve both dispositions, and coordinate remediation without overriding external passing criteria.

---

A vulnerability can have an internal environmental ranking and an ASV scan disposition at the same time. They answer different questions. The first guides the entity's vulnerability-management decisions; the second determines the outcome of an external scan under the ASV program.

Do not build a dashboard that overwrites both with one editable “severity” field. That makes it easy for a legitimate internal analysis to appear to change a passing-scan rule it does not control.

## Model the two decisions separately

[PCI SSC FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/) explains that an entity can consider external rankings in the context of its environment when assigning risk under Requirement 6.3.1. Internal scan findings are one input into that process. High-risk and critical internal vulnerabilities must be resolved; lower-ranked findings are addressed according to the applicable targeted risk analysis.

External ASV scans follow a separate program. [FAQ 1152](https://www.pcisecuritystandards.org/faqs/1152/) describes passing characteristics including no vulnerabilities with CVSS scores of 4.0 or higher and no automatically failing conditions. Use the current ASV Program Guide for detailed scoring, exceptions, disputes, and reporting rules; the [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) is the authoritative publication point.

An internal downgrade is not an approved ASV dispute and does not change the ASV report. Equally, an ASV pass does not certify the whole environment's compliance.

## Preserve the source evidence

Keep distinct fields in the vulnerability record:

```text
finding_id
asset_id
scanner_observation_and_timestamp
external_score_and_score_version
internal_risk_rank
internal_rationale_and_reviewer
asv_report_id
asv_disposition
asv_dispute_reference
remediation_change
verification_evidence
```

Preserve the original score and detection evidence even when an internal reviewer changes the environmental ranking. Record the scoring system and version to avoid comparing values from different scales as though they were identical.

Keep separate asset observations for different endpoints. A service that is isolated on one host may be exposed through a public proxy on another. The same CVE does not imply the same exposure or remediation state everywhere.

## Write a defensible internal analysis

Consider reachable functionality, exploit prerequisites, affected versions, account-data exposure, existing controls, and current exploitation information. Link factual evidence such as vendor advisories, package backport records, configuration exports, and network reachability tests.

Distinguish three outcomes: the detection is wrong; the vulnerability exists but has a different environmental risk; or the vulnerability is real and needs remediation. A statement that a server is “internal only” establishes none of these by itself.

Give the decision an owner and reconsideration triggers. Internet exposure, a control failure, or a newly available exploit can change the ranking without changing the underlying vulnerability identifier.

For example, an internal team may rank a finding medium after verifying restricted reachability. If an external ASV report still identifies an applicable failing condition, retain that status until the ASV's process establishes a different disposition or remediation is verified.

## Route external disagreements through the ASV

Submit the exact affected endpoint, finding identifier, software and configuration evidence, reproduction details, and the reason for disputing the result. Distinguish a false positive from an environment-specific scoring claim or a proposed compensating control.

Ask the ASV to evaluate the evidence under its program obligations. Do not edit a downloaded report, suppress a finding locally, or mark it resolved merely because an internal committee accepted the risk.

Keep the ASV's response and any revised report linked to the record. If the dispute is rejected, preserve the remediation owner and deadline. A pending dispute is still pending, and a customer assertion is not an ASV disposition.

## Coordinate remediation without merging the rules

One engineering change may satisfy both tracks: upgrade the vulnerable package, remove the unused service, or correct the configuration. Plan the change once, but verify its outcome using the required internal and external processes.

Track patch deadlines separately from scan scheduling. Requirement 6.3.3 requires critical patches within one month of release, while other applicable updates follow appropriate risk-based timeframes, as clarified in [FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/). Waiting for the next scheduled scan does not reset the release date.

For internal closure, retain the ranking, fix, affected population, and rescan evidence. For external closure, obtain the appropriate ASV result. Where new findings arise during rescanning, preserve the sequence showing treatment of the earlier findings and ownership of the new ones.

## Report two understandable outcomes

Show internal high/critical backlog, lower-ranked treatment status, scan coverage gaps, and ASV passing status separately. Label a risk-accepted internal item honestly and avoid making it appear to be a clean external scan.

[FAQ 1234](https://www.pcisecuritystandards.org/faqs/1234/) emphasizes that an ASV report only addresses its scanning purpose; other requirements still need assessment. A useful executive view therefore explains both the remaining technical exposure and the state of required evidence, with links back to the actual decisions.
