# Validation Summary: How to Build Grafana Text Panel Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana text visualization
- Grafana dashboard variables and global variables
- Grafana variable formatting options
- Grafana panel links and dashboard URL variables
- Markdown
- HTML and CSS in Grafana panels
- Mermaid diagrams

## Sources Consulted
- Grafana Text visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/text/
- Grafana Variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana Add variables / Global variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana Configure data links and actions documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/
- Grafana Manage dashboard links / Panel links documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/manage-dashboard-links/
- Grafana Dashboard URL variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard-url-variables/
- Grafana configuration documentation for `disable_sanitize_html`: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/

## Issues Found
- The post stated that Grafana text panels support only Markdown and HTML modes. Grafana currently documents Markdown, HTML, and Code modes, so the mode table was updated to include Code.
- Several examples used custom date formats containing `:` such as `HH:mm`. Grafana documents that custom date formats for `${__from:date:...}` and `${__to:date:...}` must not include the `:` character, so those examples were changed to colon-free formats like `HHmm`.
- The `${__from:date}` example output was shown as a plain date. Grafana documents that `${__from:date}` defaults to ISO 8601/RFC 3339, so the example output and description were corrected.
- The `${variable:queryparam}` example output omitted the `var-<name>` query parameter prefix. It was corrected to show `var-variable=a&var-variable=b&var-variable=c`.
- The HTML mode section implied full control over HTML. Grafana sanitizes HTML by default, and unsanitized script-capable HTML requires `disable_sanitize_html`, which is not available in Grafana Cloud. The wording was corrected.
- The "Using Data Links" section described configuring data links in a text panel. Text panels support panel links and content links; data links are for data-driven visualizations and fields. The section was changed to "Using Panel Links."
- Two HTML/CSS examples used JavaScript-style conditional expressions inside Grafana variable interpolation. Grafana variables interpolate values but do not evaluate JavaScript expressions in panel content. Those examples were replaced with technically valid static or variable-based content.
- The CSS class example used `.status-prod` while the article otherwise used `production` as the environment value. The class name was corrected to `.status-production`.

## Review Notes
The remaining external URLs in examples use placeholder domains or instance-relative Grafana paths and are plausible illustrative links. Some HTML examples use inline styles and `<style>` tags; behavior can vary depending on Grafana sanitization settings, so the post now includes the relevant sanitization caveat.
