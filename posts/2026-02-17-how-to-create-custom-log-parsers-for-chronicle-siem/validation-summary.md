# Validation Summary: How to Create Custom Log Parsers for Chronicle SIEM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Security Operations / Chronicle SIEM
- Configuration-based normalizer parser syntax
- Unified Data Model (UDM)
- Grok parsing
- JSON log parsing
- Google SecOps Chronicle API
- UDM Search / YARA-L search syntax

## Sources Consulted
- Google Security Operations parser syntax reference: https://docs.cloud.google.com/chronicle/docs/reference/parser-syntax
- Google Security Operations overview of log parsing: https://docs.cloud.google.com/chronicle/docs/event-processing/parsing-overview
- Google Security Operations parser tips and troubleshooting: https://docs.cloud.google.com/chronicle/docs/event-processing/parser-tips-troubleshooting
- Google Security Operations UDM usage guide: https://docs.cloud.google.com/chronicle/docs/unified-data-model/udm-usage
- Google Security Operations UDM field list: https://docs.cloud.google.com/chronicle/docs/reference/udm-field-list
- Google Security Operations UDM Search documentation: https://docs.cloud.google.com/chronicle/docs/investigation/udm-search
- Google Security Operations Chronicle API parser resource: https://docs.cloud.google.com/chronicle/docs/reference/rest/v1alpha/projects.locations.instances.logTypes.parsers
- Google Security Operations Chronicle API runParser method: https://docs.cloud.google.com/chronicle/docs/reference/rest/v1alpha/projects.locations.instances.logTypes/runParser

## Issues Found
- The parser examples used Logstash-style `date` options (`source` and `formats`) instead of the Google SecOps CBN `match` syntax. Updated both examples to use `date { match => [...] }`, with `target` and `on_error` where appropriate.
- The snippets mapped repeated fields and numeric fields with `replace`, which is only valid for string values. Updated IP and email mappings to use `merge`, and converted ports and byte counts before assigning them to numeric UDM fields.
- The snippets wrote `security_result.action` directly as if `security_result` were a scalar field. Updated the examples to create an intermediate `security_result` object and merge it into `event.idm.read_only_udm.security_result`, matching Google SecOps parser guidance for repeated security result fields.
- The examples omitted the final `@output` merge, so they would not emit normalized UDM events. Added the required `mutate { merge => { "@output" => "event" } }` block to both parser examples.
- The drop examples used empty `drop {}` blocks. Updated them to include tags.
- The parser API example used `https://backstory.googleapis.com/v2/parsers` with `log_type`, `config`, and `state` fields. Updated it to the current Chronicle API parser create endpoint shape under `projects/{project}/locations/{location}/instances/{instance}/logTypes/{logType}/parsers`, using the `cbn` base64 parser configuration field.
- The UDM search example included a timestamp function expression that is not shown in the current UDM Search examples and is better handled through the UI time range. Simplified the query to a valid product-name filter.

## Review Notes
The post is technically relevant and the revised examples align with current Google SecOps CBN parser documentation. The UI navigation text may vary between Google SecOps console releases, but the core parser syntax, UDM mappings, and API example have been corrected against official documentation.
