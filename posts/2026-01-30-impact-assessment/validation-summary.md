# Validation Summary: How to Build Impact Assessment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Incident management
- SRE incident response
- OpenTelemetry observability signals
- Mermaid flowcharts
- YAML runbook templates
- Status pages

## Sources Consulted
- OpenTelemetry Signals documentation: https://opentelemetry.io/docs/concepts/signals/
- OpenTelemetry specification overview: https://opentelemetry.io/docs/specs/otel/overview/
- Google SRE Incident Management Guide: https://sre.google/resources/practices-and-processes/incident-management-guide/
- Google SRE Book, Managing Incidents: https://sre.google/sre-book/managing-incidents/
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html
- Atlassian Statuspage impact/status documentation: https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Related OneUptime blog links were checked and returned HTTP 200.

## Issues Found
- The post said OpenTelemetry metrics "flow naturally from your traces." OpenTelemetry treats traces and metrics as separate telemetry signals, so this was changed to say that OpenTelemetry can collect traces and metrics separately and that they can be visualized and correlated in OneUptime.
- The impact formula adds `Scope / 2`, but the explanation called scope a "multiplier." This was changed to "adjustment" to match the actual formula.

## Review Notes
The incident impact scoring model is a reasonable organization-specific framework rather than a vendor or standards-defined severity scheme. The YAML runbook example is syntactically valid, and the Mermaid flowchart examples use valid flowchart/subgraph constructs.
