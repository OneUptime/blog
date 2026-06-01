# Validation Summary: How to Output Stream Analytics Results to Power BI for Real-Time Dashboards

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Stream Analytics
- Power BI real-time streaming semantic models
- Power BI dashboards and reports
- Microsoft Entra ID authentication
- Managed identity
- Azure Resource Manager output configuration
- Stream Analytics Query Language

## Sources Consulted
- Microsoft Learn: Power BI output from Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/power-bi-output
- Microsoft Learn: Use managed identity to authenticate your Azure Stream Analytics job to Power BI - https://learn.microsoft.com/en-us/azure/stream-analytics/powerbi-output-managed-identity
- Microsoft Learn: Real-time streaming in Power BI - https://learn.microsoft.com/en-us/power-bi/connect-data/service-real-time-streaming
- Microsoft Learn: Power BI REST APIs push semantic model limitations - https://learn.microsoft.com/en-us/power-bi/developer/embedded/push-datasets-limitations
- Microsoft Learn: Azure Stream Analytics Query Language Reference - https://learn.microsoft.com/en-us/stream-analytics-query/stream-analytics-query-language-reference
- Microsoft Learn: COUNT - Stream Analytics Query - https://learn.microsoft.com/en-us/stream-analytics-query/count-azure-stream-analytics
- Microsoft Learn: Reference Data JOIN - Stream Analytics Query - https://learn.microsoft.com/en-us/stream-analytics-query/reference-data-join-azure-stream-analytics
- Microsoft Learn: System.Timestamp() - Stream Analytics Query - https://learn.microsoft.com/en-us/stream-analytics-query/system-timestamp-stream-analytics

## Issues Found
- The post did not mention Microsoft's announced retirement of real-time streaming in Power BI and the Stream Analytics Power BI output connector. Added a caveat that, beginning October 31, 2027, new Stream Analytics jobs with the connector cannot be created and existing connector jobs are stopped, with Fabric Real-Time Intelligence as the recommended long-term path.
- The post described Stream Analytics as using push datasets by default. Microsoft documents that Azure Stream Analytics creates Power BI output with `defaultMode` set to `pushStreaming`, combining push and streaming behavior with FIFO retention. Updated the explanation.
- The managed identity JSON snippet was labeled as JSON but contained a comment, and it included fields not present in the documented ARM output example. Removed the JSON comment and aligned the output datasource properties with Microsoft's documented structure.
- The joined Stream Analytics query selected unqualified fields from inputs that share names. Qualified the selected fields and aggregate inputs with aliases to avoid ambiguity.
- The Power BI limits were outdated or inaccurate. Replaced the listed limits with current documented limits: 1 million rows added per hour per push semantic model, 200,000 rows stored per table for FIFO retention, 75 columns per push semantic model table, and the 15 KB streaming tile payload limit.
- The token-expiration section stated a fixed 90-day renewal period. Updated it to match current Stream Analytics documentation: renewal may be required when the token expires, when the password changes, or every two weeks when Microsoft Entra multifactor authentication is configured.
- Updated "Azure AD" references to the current "Microsoft Entra ID" terminology.

## Review Notes
The post remains technically relevant as a tutorial, but the Power BI real-time streaming retirement date makes this approach unsuitable for new long-term architectures unless the expected lifetime is before October 31, 2027. Future revisions should consider a Fabric Real-Time Intelligence alternative.
