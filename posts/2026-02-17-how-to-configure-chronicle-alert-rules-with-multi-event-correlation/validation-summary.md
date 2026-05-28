# Validation Summary: How to Configure Chronicle Alert Rules with Multi-Event Correlation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Security Operations / Chronicle SIEM
- YARA-L 2.0 detection rules
- Unified Data Model (UDM)
- Multi-event correlation and detection windows
- Reference lists and outcome aggregations

## Sources Consulted
- Google Security Operations YARA-L 2.0 syntax overview: https://docs.cloud.google.com/chronicle/docs/detection/yara-l-2-0-syntax
- Google Security Operations events section syntax: https://docs.cloud.google.com/chronicle/docs/yara-l/events-syntax
- Google Security Operations match section syntax: https://docs.cloud.google.com/chronicle/docs/yara-l/match-syntax
- Google Security Operations outcome section syntax: https://docs.cloud.google.com/chronicle/docs/yara-l/outcome-syntax
- Google Security Operations condition section syntax: https://docs.cloud.google.com/chronicle/docs/yara-l/condition-syntax
- Google Security Operations reference list syntax: https://docs.cloud.google.com/chronicle/docs/yara-l/reference-list-syntax
- Google Security Operations UDM field list: https://docs.cloud.google.com/chronicle/docs/reference/udm-field-list

## Issues Found
- The account takeover example described the login step as a "new device" or "new location" login, but the YARA-L rule only checks for a successful login after password reset and before MFA change. It does not compare the login IP or device against historical, known-good, or reference-list data. Updated the surrounding text, rule description, and inline comment to accurately describe the implemented detection logic.

## Review Notes
The YARA-L rule structure, `match` windows, event joins through placeholder variables, timestamp ordering comparisons, outcome aggregations such as `count_distinct`, `count`, and `array_distinct`, reference-list syntax, UDM event types, and `security_result.action` values used in the post are consistent with current Google Security Operations documentation.
