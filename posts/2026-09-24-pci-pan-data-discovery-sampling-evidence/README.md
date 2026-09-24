# How to Prove That Your Systems Do Not Store PAN with Data-Discovery Sampling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Data Security, Compliance

Description: Build defensible PAN-discovery evidence with a complete storage inventory, tested detectors, representative sampling, explicit blind spots, and incident handling.

---

A data-discovery scan cannot prove that PAN has never existed anywhere in a system. It can support a narrower, useful conclusion: specified locations were examined with a known method, coverage and limitations were documented, and unexpected findings were investigated.

That distinction matters when an architecture is intended to keep card numbers out of application storage. PCI DSS scope confirmation includes identifying account-data locations and considering data outside the expected CDE. Discovery should test the architecture's claims rather than manufacture certainty from a zero-result dashboard. [PCI DSS v4.0.1, 12.5.2](https://www.pcisecuritystandards.org/document_library/)

## Define the claim and the storage population

Write the intended assertion before selecting tools. For example: “Our order application stores provider tokens and limited display data; raw PAN should not persist in its databases, queues, logs, or support exports.”

Then enumerate locations where data could persist: primary databases, replicas, search indexes, object storage, queue dead letters, telemetry buffers, crash dumps, exports, temporary files, backups, and restored test environments. Include managed services and different accounts or regions.

Record location owners, formats, access methods, retention periods, and discovery capability. “No access” is a coverage gap. An encrypted object that the scanner cannot inspect is not a verified negative result.

## Test the detector before trusting its results

Use approved synthetic test values that the selected detector is documented to recognize in an isolated test dataset. Some detectors deliberately exclude reserved payment test numbers, so confirm the expected behavior before using them as positive controls. [Microsoft Purview credit card detector](https://learn.microsoft.com/en-us/purview/sit-defn-credit-card-number) Exercise the actual formats your systems produce: JSON fields, delimiters, line wrapping, compressed archives, structured database columns, and supported document formats. Verify that the detector recognizes the expected cases and avoids logging the full matched values.

A digit pattern and Luhn checksum can identify candidates, but they are neither complete proof of PAN nor a complete detector. Some ordinary identifiers pass a checksum. Data can be encoded, split, embedded in images, or stored in a format the tool does not parse. Record supported formats and known blind spots.

Measure parser failures, skipped objects, permission errors, and truncation limits. A discovery job that quietly skips large objects or unsupported compression formats overstates coverage.

## Use sampling for triage without overstating it

Prefer complete examination where practical. When the population is too large for an initial pass, divide it into meaningful strata: service, storage type, data age, deployment version, source channel, and region. Select records from every relevant variant and expand around higher-risk sources such as error payloads or manual exports.

Do not treat the newest 100 rows as representative of a year of operations. A leak introduced and fixed months ago can survive in archives even when current writes are clean.

PCI SSC allows assessors to use representative samples when performing assessment testing. That is an assessor methodology choice, not permission to implement required protections only on sampled systems or a guarantee that a discovery sample proves universal absence. [PCI SSC FAQ 1569](https://www.pcisecuritystandards.org/faqs/1569/)

Record the selection method, population size, sample size, variants represented, and omitted areas. Avoid a statistical confidence claim unless the selection and assumptions actually support it. Risk-based convenience sampling is not equivalent to a random sample from a well-defined population.

## Preserve evidence without duplicating PAN

A discovery result should contain protected object references, detector version, scan time, counts, masked indicators where needed, and reviewer decisions. Restrict access to raw findings and avoid exporting matched values into general-purpose tickets.

Use a manifest such as:

```yaml
claim: raw-pan-not-expected-in-order-storage
population_snapshot: storage-inventory-2026-09
method: approved-discovery-profile-v3
coverage:
  complete: [primary-orders, active-log-index]
  sampled: [historical-support-exports]
  blocked: [legacy-encrypted-archive]
follow_up: archive-access-and-expanded-export-review
```

This example deliberately exposes incomplete coverage. It is more useful than marking the entire environment “PAN free.”

## Treat unexpected findings as incidents

Requirement 12.10.7 requires response procedures when stored PAN is found somewhere unexpected. Determine whether sensitive authentication data accompanies it, identify the source and path, decide appropriate disposition, and correct the process gap. [PCI DSS v4.0.1, 12.10.7](https://www.pcisecuritystandards.org/document_library/)

Expand the investigation to related services, time periods, and copies. Coordinate evidence preservation before deletion. Fix the producer or ingestion path before rerunning discovery, or the leak will recur while cleanup is underway.

## Repeat around changes and challenge the conclusion

Run discovery on a schedule suited to the environment and after changes that can alter data handling. Review new log fields, provider migrations, export features, debugging modes, and restored backups. Keep the scope-confirmation process connected to these results.

A defensible conclusion states what was examined, what was found, what remains uncertain, and what actions followed. Discovery supports a claim about the observed environment; architectural controls, disciplined data handling, and continuing verification keep that claim credible over time.
