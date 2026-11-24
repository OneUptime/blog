# Validation summary

Reviewed on 25 November 2026.

## Source and editorial review

Checked the Google SRE example postmortem, the improved postmortem in the workbook, and official AWS FIS stop-condition documentation. The article separates observed conditions from causal hypotheses, recognizes skilled responder adaptation, and does not assume experiment cancellation restores state.

The report-service example is fictional. The exercise explicitly requires isolated staging resources, bounded workload, meaningful measurements, pass and stop criteria, and recovery verification. It is described as proposed work, not an executed test.

Mermaid structure passed checks for six declared nodes and five edges with valid references. The 1280x720 social image was generated, opened, and visually reviewed; its two-line title fits.

## Limits

No live service, incident data, fault-injection tool or operational safeguard was tested. Diagram validation was structural, without browser rendering. No executable configuration is presented because the example requires application-specific workload and recovery tooling.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
