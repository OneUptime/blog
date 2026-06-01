# Validation Summary: How to Ingest Custom JSON Logs into Azure Log Analytics Using the HTTP Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Log Analytics
- Azure Monitor HTTP Data Collector API
- Azure Monitor Logs Ingestion API
- REST API authentication with HMAC-SHA256
- Python requests
- Bash, curl, OpenSSL, base64
- C# HttpClient
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Send log data to Azure Monitor by using the HTTP Data Collector API (deprecated) - https://learn.microsoft.com/en-us/previous-versions/azure/azure-monitor/logs/data-collector-api
- Microsoft Learn: Migrate from the HTTP Data Collector API to the Log Ingestion API - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/custom-logs-migrate
- Microsoft Learn: Logs Ingestion API in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/custom-logs-overview
- Microsoft Learn: Data collection rules in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection
- Microsoft Learn: Azure Monitor service limits - https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/service-limits
- RFC 9110 HTTP Semantics, status code 429 - https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- The Python example used `len(body)` for `Content-Length` in the signature. This can be wrong for non-ASCII JSON because the API signs the byte length. Changed it to `len(body.encode("utf-8"))`.
- The Python example used `datetime.datetime.utcnow()`, which is deprecated in current Python. Changed it to `datetime.datetime.now(datetime.timezone.utc)`.
- The Bash example used `${#BODY}` for content length, which counts shell characters rather than bytes in some locales. Changed it to `printf '%s' "$BODY" | wc -c`.
- The Bash example built `STRING_TO_SIGN` with `\n` inside double quotes, which produces literal backslash-n sequences in Bash. Changed it to `printf -v` so the signed string contains real newline characters.
- The C# example signed `application/json` but `StringContent(jsonBody, Encoding.UTF8, "application/json")` sends a content type with a charset parameter. Set `request.Content.Headers.ContentType` to exactly `application/json` so the header matches the signed value.
- The C# example omitted standard namespaces used by the snippet. Added the missing `System`, `System.Net.Http`, and `System.Threading.Tasks` imports.
- The field suffix list omitted the documented `_g` suffix for GUID values. Added it to the suffix list.
- The schema management section said a later number sent to a string field would be stored as a string. Microsoft documents that if a mismatched value cannot be converted to the existing type, Azure Monitor creates a new property with the relevant suffix. Updated the explanation.
- The limits section described 500 custom fields per table as the maximum. Microsoft documents a recommended maximum of 50 fields for a given type and a 500-column table limit, so the wording was corrected.
- The rate limit wording described throttling as workspace-level. Microsoft documents 429 responses for high request volume from the account, so the wording was made less specific.
- The post described the HTTP Data Collector API as supported but legacy without the current support-end date. Updated the wording to say support continues until September 14, 2026, based on Microsoft migration guidance.

## Review Notes
The article remains technically valid as a legacy API tutorial. For new integrations, the Microsoft guidance is to use the Logs Ingestion API with Data Collection Rules because it uses Microsoft Entra authentication, supports transformations, and has different ingestion limits from the HTTP Data Collector API.
