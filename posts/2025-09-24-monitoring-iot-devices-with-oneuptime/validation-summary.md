# Validation Summary: Monitoring IoT Devices with OneUptime: Keep Your Connected Devices in Check

## Status
validated

## Post Type
Tutorial / Guide (product-focused how-to with code examples)

## Technologies Covered
- OneUptime Incoming Request (heartbeat) Monitors
- HTTP heartbeat signaling (GET/POST)
- Python (`requests`) and MicroPython (`urequests`)
- Arduino / ESP32 / ESP8266 (`WiFi.h`, `HTTPClient.h`)
- JSON telemetry payloads
- Mermaid diagrams

## Sources Consulted
- OneUptime Incoming Request Monitor docs (in-repo): `oneuptime/App/FeatureSet/Docs/Content/en/monitor/incoming-request-monitor.md` — heartbeat URL format, GET/POST support, and the full list of available monitoring criteria
- OneUptime Probe incoming-request ingress route: `oneuptime/Probe/API/IncomingRequestIngress.ts` (`router.get`/`router.post` on `/heartbeat/:secretkey`) and `oneuptime/Probe/Config.ts`
- MicroPython `urequests` library docs (network HTTP module, `.get()`, `.status_code`, `.close()`)
- Arduino ESP32 `HTTPClient` / `WiFi` library reference (`http.begin`, `http.GET`, `http.end`, `WiFi.status()` / `WL_CONNECTED`)
- Python `requests` library docs (`requests.post(..., json=...)`)

## Issues Found
- **Incorrect monitor criteria (Step 2).** The post originally listed monitor criteria as:
  - `Incoming request received within last 5 minutes`
  - `Request method: GET or POST`
  - `Response status: 200 OK`

  OneUptime's incoming request monitors do **not** offer "Request method" or "Response status" as criteria. Per the official docs, the available check types are: Incoming Request (filters: *Received In Minutes* / *Not Received In Minutes*), Request Body, Request Header, and Request Header Value. The "Response status" line is especially misleading because the device sends the request and OneUptime responds — there is no device-side response status to evaluate.

  **Fix:** Replaced the criteria block with an accurate example using `Check On: Incoming Request`, `Filter Type: Not Received In Minutes`, `Value: 5`, and added a sentence clarifying that both GET and POST heartbeats are accepted and that Request Body / Request Header criteria are also available. This aligns the post with the documented criteria options while preserving the author's style.

## Review Notes
- The heartbeat URL format used throughout (`https://oneuptime.com/heartbeat/<secret-key>`) is correct and matches both the docs and the probe ingress route. GET and POST are both genuinely supported.
- All code examples are syntactically valid and use current APIs:
  - MicroPython `urequests` (`.get()`, `.status_code`, `.close()`) and the note to swap to `requests` on full Python is correct.
  - The Arduino ESP32 sketch (`WiFi.h` + `HTTPClient.h`, `http.begin`/`http.GET`/`http.end`) is valid; `const int INTERVAL = 300000` fits within `int` range. The `ESP8266WiFi.h` note for ESP8266 is accurate.
  - The Python `requests.post(url, json=payload, headers=...)` example is correct.
- The standardized JSON payload example (and the inline battery/location payload) uses `//` comments, which is not valid JSON. This is a common documentation/illustrative convention and was left as-is since it is clearly explanatory rather than copy-paste config; it is not a technical error in context.
- The device-category intervals, fleet/IIoT/smart-building breakdowns, and cascading alert tables are illustrative recommendations, not verifiable product behavior, and are reasonable.
- Integrations referenced (Slack, OneUptime On-Call, ServiceNow/Jira, status pages, workflows) are all real OneUptime capabilities or standard third-party tools; no inaccuracies.
