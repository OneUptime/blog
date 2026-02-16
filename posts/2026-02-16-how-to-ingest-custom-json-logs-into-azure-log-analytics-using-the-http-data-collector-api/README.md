# How to Ingest Custom JSON Logs into Azure Log Analytics Using the HTTP Data Collector API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, HTTP Data Collector API, Custom Logs, Log Ingestion, REST API, Cloud Monitoring

Description: A practical guide to using the Azure Log Analytics HTTP Data Collector API to ingest custom JSON log data from any application or system.

---

Not everything that generates logs runs on an Azure VM with the Azure Monitor Agent installed. Maybe you have an on-premises application, a third-party service that sends webhooks, a batch processing system, or a serverless function on another cloud provider. The HTTP Data Collector API lets you push custom JSON data directly into a Log Analytics workspace over HTTPS from anywhere - no agent required.

This post covers how to use the API, including authentication, payload format, code examples in multiple languages, and common pitfalls to avoid.

## How the API Works

The HTTP Data Collector API accepts JSON payloads via HTTP POST. You send your data to a specific endpoint, and it lands in a custom table in your Log Analytics workspace. The table is automatically created if it does not exist, and the schema is inferred from the JSON fields in your first request.

The endpoint URL follows this pattern:

```
https://<workspace-id>.ods.opinsights.azure.com/api/logs?api-version=2016-04-01
```

Authentication uses the workspace ID and a shared key (primary or secondary) to generate an HMAC-SHA256 signature for each request.

## Prerequisites

You need:

- A Log Analytics workspace.
- The **Workspace ID** and **Primary Key** (found in the workspace settings under **Agents management**).
- An application or script that can make HTTPS POST requests.

## Building the Authorization Header

The trickiest part of using this API is constructing the authorization header. It requires an HMAC-SHA256 signature of specific request components.

The string to sign follows this format:

```
POST\n{content-length}\napplication/json\nx-ms-date:{date}\n/api/logs
```

Here is how to build it in Python.

```python
import hashlib
import hmac
import base64
import datetime
import json
import requests

# Configuration - replace with your workspace details
workspace_id = "<your-workspace-id>"
shared_key = "<your-primary-key>"
log_type = "MyApplicationLogs"  # This becomes the table name (with _CL suffix)

def build_signature(workspace_id, shared_key, date, content_length, method, content_type, resource):
    """Build the HMAC-SHA256 authorization signature for the API request."""
    x_headers = f"x-ms-date:{date}"
    string_to_hash = f"{method}\n{content_length}\n{content_type}\n{x_headers}\n{resource}"
    bytes_to_hash = string_to_hash.encode("utf-8")
    decoded_key = base64.b64decode(shared_key)
    encoded_hash = base64.b64encode(
        hmac.new(decoded_key, bytes_to_hash, digestmod=hashlib.sha256).digest()
    ).decode("utf-8")
    return f"SharedKey {workspace_id}:{encoded_hash}"

def post_data(workspace_id, shared_key, body, log_type):
    """Send log data to the Log Analytics HTTP Data Collector API."""
    method = "POST"
    content_type = "application/json"
    resource = "/api/logs"
    rfc1123date = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    content_length = len(body)

    signature = build_signature(
        workspace_id, shared_key, rfc1123date,
        content_length, method, content_type, resource
    )

    uri = f"https://{workspace_id}.ods.opinsights.azure.com{resource}?api-version=2016-04-01"

    headers = {
        "content-type": content_type,
        "Authorization": signature,
        "Log-Type": log_type,
        "x-ms-date": rfc1123date,
        "time-generated-field": "Timestamp"  # Optional: specify which field contains the event time
    }

    response = requests.post(uri, data=body, headers=headers)
    if response.status_code >= 200 and response.status_code <= 299:
        print(f"Accepted: {response.status_code}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    return response.status_code
```

## Sending Data - Python Example

Now use the function to send some log records.

```python
# Create sample log records as a JSON array
log_records = [
    {
        "Timestamp": "2026-02-16T14:30:00Z",
        "Level": "Error",
        "Service": "order-processor",
        "Message": "Failed to process order 12345: payment timeout",
        "OrderId": "12345",
        "DurationMs": 30000
    },
    {
        "Timestamp": "2026-02-16T14:30:05Z",
        "Level": "Warning",
        "Service": "order-processor",
        "Message": "Retry attempt 2 for order 12345",
        "OrderId": "12345",
        "DurationMs": 0
    }
]

# Convert to JSON string and send
body = json.dumps(log_records)
post_data(workspace_id, shared_key, body, log_type)
```

The data will appear in a table called `MyApplicationLogs_CL` in your workspace. The `_CL` suffix is automatically appended to custom log tables. Fields get a type suffix: `_s` for strings, `_d` for doubles, `_b` for booleans, `_t` for datetimes.

## Sending Data - Bash/curl Example

You can also use curl, though the signature calculation is more complex in bash.

```bash
#!/bin/bash
# Script to send custom logs to Log Analytics via the HTTP Data Collector API

WORKSPACE_ID="<your-workspace-id>"
SHARED_KEY="<your-primary-key>"
LOG_TYPE="MyApplicationLogs"

# The JSON payload
BODY='[{"Timestamp":"2026-02-16T14:30:00Z","Level":"Error","Message":"Test error message"}]'

# Calculate required values
CONTENT_LENGTH=${#BODY}
RFC1123DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")

# Build the string to sign
STRING_TO_SIGN="POST\n${CONTENT_LENGTH}\napplication/json\nx-ms-date:${RFC1123DATE}\n/api/logs"

# Calculate the HMAC-SHA256 signature
DECODED_KEY=$(echo -n "$SHARED_KEY" | base64 --decode | xxd -p -c 256)
SIGNATURE=$(printf '%s' "$STRING_TO_SIGN" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$DECODED_KEY" -binary | base64)

# Send the request
curl -s -X POST \
  "https://${WORKSPACE_ID}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01" \
  -H "Content-Type: application/json" \
  -H "Authorization: SharedKey ${WORKSPACE_ID}:${SIGNATURE}" \
  -H "Log-Type: ${LOG_TYPE}" \
  -H "x-ms-date: ${RFC1123DATE}" \
  -H "time-generated-field: Timestamp" \
  -d "$BODY"
```

## Sending Data - C# Example

```csharp
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;

// Helper class to send custom logs to Log Analytics
public class LogAnalyticsSender
{
    private readonly string _workspaceId;
    private readonly string _sharedKey;
    private readonly HttpClient _httpClient;

    public LogAnalyticsSender(string workspaceId, string sharedKey)
    {
        _workspaceId = workspaceId;
        _sharedKey = sharedKey;
        _httpClient = new HttpClient();
    }

    public async Task SendLogs(string logType, string jsonBody)
    {
        var dateString = DateTime.UtcNow.ToString("r");
        var contentLength = Encoding.UTF8.GetByteCount(jsonBody);

        // Build the signature
        var stringToHash = $"POST\n{contentLength}\napplication/json\nx-ms-date:{dateString}\n/api/logs";
        var encoding = new ASCIIEncoding();
        var keyBytes = Convert.FromBase64String(_sharedKey);
        var messageBytes = encoding.GetBytes(stringToHash);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = Convert.ToBase64String(hmac.ComputeHash(messageBytes));
        var authorization = $"SharedKey {_workspaceId}:{hash}";

        var uri = $"https://{_workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01";

        var request = new HttpRequestMessage(HttpMethod.Post, uri);
        request.Headers.Add("Accept", "application/json");
        request.Headers.Add("Log-Type", logType);
        request.Headers.Add("Authorization", authorization);
        request.Headers.Add("x-ms-date", dateString);
        request.Headers.Add("time-generated-field", "Timestamp");
        request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        Console.WriteLine($"Response: {response.StatusCode}");
    }
}
```

## Important Headers

- **Log-Type** (required): The name of the custom log table. The `_CL` suffix is added automatically.
- **time-generated-field** (optional but recommended): The name of the JSON field that contains the event timestamp. If not specified, the ingestion time is used as `TimeGenerated`.
- **x-ms-date** (required): The date and time of the request in RFC 1123 format.

## Schema Management

The first time you send data to a new log type, the API creates the table and infers the schema from your JSON fields. Subsequent sends can add new fields (the schema expands automatically), but you cannot remove fields or change their types.

If a field was initially inferred as a string and you later send a number in that field, the value will be stored as a string. Plan your schema carefully before the first send.

## Rate Limits and Payload Limits

- **Maximum payload size**: 30 MB per POST request.
- **Maximum field value size**: 32 KB for individual field values.
- **Maximum fields**: 500 custom fields per table.
- **Rate limit**: The API is throttled at the workspace level. If you send too much data too fast, you will get HTTP 429 (Too Many Requests) responses. Implement exponential backoff in your client.

For high-volume ingestion, batch your records into fewer, larger payloads rather than many small ones. A single POST with 1000 records is much more efficient than 1000 POSTs with 1 record each.

## The Newer Logs Ingestion API

Microsoft has released a newer API called the Logs Ingestion API that works with Data Collection Rules. It offers several advantages over the HTTP Data Collector API:

- Uses Azure AD authentication instead of shared keys.
- Supports ingestion-time transformations via DCR.
- Sends data to both custom and standard tables.
- Better rate limits and error handling.

If you are starting a new integration, consider using the Logs Ingestion API instead. The HTTP Data Collector API is still supported but is considered the legacy option.

## Querying Custom Log Data

Once your data is ingested, query it in Log Analytics.

```
// Query the custom log table
MyApplicationLogs_CL
| where TimeGenerated > ago(24h)
| where Level_s == "Error"
| summarize ErrorCount = count() by Service_s, bin(TimeGenerated, 1h)
| render timechart
```

Notice the `_s` suffix on string fields and `_d` on numeric fields. This is how the HTTP Data Collector API stores custom fields. The newer Logs Ingestion API does not add these suffixes.

## Error Handling Best Practices

When building a production integration, handle these error cases:

- **HTTP 200**: Success. Data accepted.
- **HTTP 400**: Bad request. Check your JSON format and field names.
- **HTTP 403**: Authentication failure. Verify your workspace ID and shared key.
- **HTTP 404**: Wrong endpoint URL. Double-check the workspace ID in the URL.
- **HTTP 429**: Rate limited. Implement exponential backoff and retry.
- **HTTP 500**: Server error. Retry with backoff.

Always log the response body on errors - it usually contains a helpful error message.

## Wrapping Up

The HTTP Data Collector API is the simplest way to get custom data into Log Analytics from any source that can make HTTP requests. The authentication setup is the hardest part - once you have the signature calculation working, everything else is straightforward. For new projects, consider the newer Logs Ingestion API with Data Collection Rules, which offers Azure AD authentication and ingestion-time transformations. Either way, the ability to push arbitrary JSON data into Log Analytics and then query it with KQL alongside your other monitoring data is incredibly useful for building unified observability across heterogeneous systems.
