# Validation Summary: How to Configure Graylog for IPv6 Log Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Graylog
- IPv6
- Syslog
- GELF
- Graylog REST API
- Python
- MongoDB
- OpenSearch / Elasticsearch

## Sources Consulted
- Graylog server configuration settings reference: https://go2docs.graylog.org/current/setting_up_graylog/server_configuration_settings_reference.htm
- Graylog inputs documentation: https://go2docs.graylog.org/current/getting_in_log_data/inputs.htm
- Graylog extractors documentation: https://go2docs.graylog.org/current/making_sense_of_your_log_data/extractors.htm
- Graylog streams documentation: https://go2docs.graylog.org/current/making_sense_of_your_log_data/streams.html
- Graylog alerts documentation: https://go2docs.graylog.org/current/interacting_with_your_log_data/alerts.html
- Graylog event definitions documentation: https://go2docs.graylog.org/current/interacting_with_your_log_data/event_definitions.html
- Graylog GELF format documentation: https://go2docs.graylog.org/current/getting_in_log_data/gelf_format.html
- Graylog REST API access token documentation: https://go2docs.graylog.org/current/setting_up_graylog/rest_api_access_tokens.htm
- Graylog REST API use cases: https://go2docs.graylog.org/current/setting_up_graylog/rest_api_use_cases.htm
- Graylog 7.0 upgrade notes: https://go2docs.graylog.org/current/upgrading_graylog/upgrade_to_graylog_7.0.htm
- Graylog source, `InputsResource`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/rest/resources/system/inputs/InputsResource.java
- Graylog source, `CreateExtractorRequest`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/rest/models/system/inputs/extractors/requests/CreateExtractorRequest.java
- Graylog source, `RegexExtractor`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/inputs/extractors/RegexExtractor.java
- Graylog source, `StreamResource`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/rest/resources/streams/StreamResource.java
- Graylog source, `CreateStreamRequest`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/rest/resources/streams/requests/CreateStreamRequest.java
- Graylog source, `StreamServiceImpl`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/streams/StreamServiceImpl.java
- Graylog source, `StreamRuleType`: https://github.com/Graylog2/graylog2-server/blob/master/graylog2-server/src/main/java/org/graylog2/plugin/streams/StreamRuleType.java
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- MongoDB connection string documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The REST API examples omitted the required `X-Requested-By` header for non-GET requests. I added it to the Graylog `POST` examples because Graylog’s current API documentation requires it.
- The REST API examples used `admin:admin` as credentials. I replaced that with an access-token placeholder because Graylog’s official API guidance recommends tokens instead of clear-text username/password usage.
- The extractor API payload used `type` instead of the current `extractor_type` field and omitted the required `cursor_strategy`. I corrected the request body to match Graylog’s current extractor request model.
- The IPv6 extractor regex was too permissive and also failed to match valid compressed forms such as `::1`. I replaced it with a stricter pattern that handles standard compressed and uncompressed IPv6 text forms more accurately.
- The stream creation example used the old pre-Graylog-7 request body shape. I updated it to the current `CreateEntityRequest` wrapper with an `entity` object and added the required `index_set_id`.
- The stream rule example used rule type `5`, which is Graylog’s field-presence rule, but the text described it like a substring match and supplied a meaningless `":"` value. I corrected the rule to check for presence of the `src_ipv6` field.
- Newly created streams are paused by default in current Graylog. I added the follow-up `resume` call so the example results in an active stream.
- The alerting section described legacy stream alert conditions. I updated it to Graylog’s current event-definition workflow under `Alerts > Event Definitions` with a filter-and-aggregation threshold.

## Review Notes
- Graylog 7.0 deprecates Elasticsearch as a search backend, although it is not yet removed. The post’s storage reference is still broadly accurate today, but OpenSearch/Data Node is the forward-looking path.
- Graylog’s current streams documentation notes that stream rules will become a legacy feature in a future release. The examples remain valid now, but future Graylog guidance may favor pipelines and event definitions more heavily.
- A live Graylog instance was not available in this environment, so the review was validated against current official documentation and Graylog’s published source/API models rather than by executing the API calls end-to-end.
