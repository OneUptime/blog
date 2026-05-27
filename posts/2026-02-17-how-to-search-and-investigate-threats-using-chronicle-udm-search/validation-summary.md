# Validation Summary: How to Search and Investigate Threats Using Chronicle UDM Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Security Operations / Chronicle SIEM
- Chronicle UDM Search
- YARA-L 2.0 search syntax
- Unified Data Model fields
- Applied Threat Intelligence

## Sources Consulted
- Google Security Operations documentation: Search for events and alerts - https://docs.cloud.google.com/chronicle/docs/investigation/udm-search
- Google Security Operations documentation: Search best practices - https://docs.cloud.google.com/chronicle/docs/investigation/udm-search-best-practices
- Google Security Operations documentation: UDM field list - https://docs.cloud.google.com/chronicle/docs/reference/udm-field-list
- Google Security Operations documentation: YARA-L timestamp.current_seconds - https://cloud.google.com/chronicle/docs/detection/yara-l-2-0-functions/timestamp-current_seconds
- Google Security Operations documentation: YARA-L timestamp.as_unix_seconds - https://cloud.google.com/chronicle/docs/detection/yara-l-2-0-functions/timestamp-as_unix_seconds
- Google Security Operations documentation: Applied Threat Intelligence overview - https://docs.cloud.google.com/chronicle/docs/detection
- Google Security Operations documentation: Applied Threat Intelligence curated detections overview - https://docs.cloud.google.com/chronicle/docs/detection/ati-curated-detections

## Issues Found
- The relative time query used `timestamp_sub(now(), "24h")`, which is not the documented YARA-L 2.0 syntax for Search. Changed it to compare `metadata.event_timestamp.seconds` against `timestamp.current_seconds() - 86400`.
- The fixed time-window query used `timestamp("2026-02-17T10:00:00Z")`, but Search documentation recommends Unix epoch seconds or YARA-L timestamp conversion functions. Changed it to `timestamp.as_unix_seconds("2026-02-17 10:00:00")` and the corresponding 12:00 value.
- The threat-intelligence example queried `security_result.category_details = "THREAT_INTEL_MATCH"`, which is not a documented generic UDM value for Applied Threat Intelligence. Reworded the explanation and changed the query to search explicitly for known-bad IP, domain, or URL indicators.
- The aggregation section referred to a "statistics view" and "statistics panel." Current Google SecOps Search documentation describes this workflow as the Pivot Table. Updated the wording accordingly.

## Review Notes
The remaining UDM field paths and event-type examples are consistent with current Google Security Operations UDM Search documentation. Some examples depend on source parser mappings and whether a tenant has relevant logs, fields, and Applied Threat Intelligence licensing enabled.
