# Validation Summary: How to Implement Data Residency Compliance with OpenTelemetry Routing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry routing connector
- OpenTelemetry transform processor
- OpenTelemetry filter processor
- OpenTelemetry Python API and baggage
- GDPR and data residency concepts
- YAML Collector configuration
- Python

## Sources Consulted
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- European Commission GDPR international transfer rules: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-rules-apply-if-my-organisation-transfers-data-outside-eu_en
- European Data Protection Board international transfer FAQ: https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/can-i-transfer-personal-data_en

## Issues Found
- The GDPR description incorrectly implied that EU personal data must generally be processed and stored in the EU or in adequacy countries. Updated it to reflect that GDPR restricts transfers outside the EEA unless an adequacy decision, appropriate safeguards, or another valid transfer mechanism applies.
- The Python middleware used `os.getenv` without importing `os`. Added the import.
- The Python middleware created baggage with `set_baggage` but did not make the returned context current for downstream propagation. Updated the example to attach the context while handling the request and detach it afterward.
- The post said the code was setting a resource attribute, but it was setting span attributes. Corrected the wording.
- The routing connector rules matched `attributes[...]` in the default resource context, while the application examples set span attributes. Added `context: span` and used current `condition` syntax for routing rules.
- The global metadata stripping example used a negative lookahead regex in the attributes processor. Go regular expressions do not support lookahead, so the example was replaced with transform processor `keep_keys` calls.
- The PII stripping transform example used older unqualified OTTL paths in a `context: span` group. Updated it to current `span.attributes` paths and added `error_mode: ignore`.
- The default deny filter example used legacy filter processor configuration. Updated it to the current `trace_conditions` format.
- The default deny snippet included a transform step intended to log dropped spans after filtering, which would not work because matching telemetry is dropped by the filter processor. Removed that invalid logging snippet.

## Review Notes
- The Collector snippets are trace-focused examples. A production implementation that routes metrics and logs would need analogous metric and log pipelines and routing rules.
- The global metadata/index approach still requires legal review because even reduced metadata can sometimes be personal data depending on identifiers and context.
