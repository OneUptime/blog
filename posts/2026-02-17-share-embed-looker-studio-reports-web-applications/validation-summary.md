# Validation Summary: How to Share and Embed Looker Studio Reports in Web Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud
- Looker Studio
- Looker Studio report sharing
- Looker Studio report embedding
- HTML iframe embedding
- JavaScript URL construction
- Content Security Policy
- BigQuery-backed Looker Studio reports

## Sources Consulted
- Google Cloud Looker Studio documentation: Embed a report, https://docs.cloud.google.com/looker/docs/studio/embed-a-report
- Google Cloud Looker Studio documentation: Ways to share your reports, https://docs.cloud.google.com/looker/docs/studio/ways-to-share-your-reports
- Google Cloud Looker Studio documentation: Schedule automatic report delivery, https://cloud.google.com/looker/docs/studio/schedule-automatic-report-delivery
- Google Cloud Looker Studio documentation: Download a Looker Studio report as PDF, https://docs.cloud.google.com/looker/docs/studio/download-a-looker-studio-report-as-pdf
- Google Cloud Looker Studio documentation: Export data from a chart, https://docs.cloud.google.com/looker/docs/studio/export-data-from-a-chart
- Google Cloud Looker Studio documentation: Data credentials, https://docs.cloud.google.com/looker/docs/studio/data-credentials-article
- Google Cloud Looker Studio documentation: Set up a Google Cloud service account for Looker Studio, https://cloud.google.com/looker/docs/studio/set-up-a-google-cloud-service-account-for-looker-studio
- Google Cloud Looker Studio documentation: Manage data freshness, https://docs.cloud.google.com/looker/docs/studio/manage-data-freshness
- Google Developers Looker Studio documentation: Overridable config parameters, https://developers.google.com/looker-studio/connector/data-source-parameters
- MDN Web Docs: Content-Security-Policy frame-src directive, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src

## Issues Found
- The scheduled delivery UI path and options were inaccurate. Current documentation uses "Share" > "Schedule delivery" and scheduled delivery sends a PDF attachment with preview behavior, not a general "PDF or inline images" file format choice. Updated the steps and description.
- The post said scheduled emails would fail silently if the owner lost data access. Official documentation describes delivery failures and warning/error surfaces in several cases, so the wording was changed to explain that schedules depend on successful PDF rendering and readers should check schedule errors and warning emails.
- The download instructions incorrectly described report download as "File" > "Download as" with PDF or CSV. Looker Studio report download is PDF via "Share" > "Download"; CSV export is available from individual charts through "Export data." Updated the section accordingly.
- The URL parameter section described arbitrary URL filters. Looker Studio URL `params` set allowed report/data-source parameters, which must be enabled for URL modification and used by the report. Updated headings, prose, examples, and JavaScript helper naming to reflect parameterized reports instead of arbitrary filters.
- The encoded example URL did not encode the colon in the JSON object. Updated it to a fully URL-encoded `params` value.
- The service account option was too broad. Looker Studio service account credentials are limited to BigQuery data sources and Google Workspace or Cloud Identity managed organizations. Updated that caveat and changed "row-level filtering" wording to "parameterized filtering."
- The authentication section implied that a SaaS application's own authentication could directly secure a Looker Studio iframe. Official embedding behavior for private reports relies on Google account access, so the section now clarifies that application authentication is separate from iframe access and that URL parameters are not a security boundary.
- The cost section overstated that every embedded view triggers BigQuery queries. Looker Studio can serve cached query results within the data freshness threshold, while new or expired queries can still incur BigQuery costs. Updated the wording to match the data freshness behavior.

## Review Notes
The iframe examples are syntactically valid HTML snippets, and the JavaScript helper uses standard `JSON.stringify` and `encodeURIComponent`. The article still correctly warns that URL parameters are not a security boundary; customer-facing data isolation should be enforced in the underlying data model, credentials, or separate reports rather than relying only on client-controlled URL values.
