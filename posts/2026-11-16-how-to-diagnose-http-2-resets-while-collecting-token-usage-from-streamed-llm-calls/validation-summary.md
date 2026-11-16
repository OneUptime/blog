# Validation Summary: How to Diagnose HTTP/2 Resets While Collecting Streamed LLM Token Usage

## Status
validated

## Post Type
Technical troubleshooting guide with a standalone Python example.

## Technologies Covered
- OpenAI Chat Completions and Responses APIs
- Streamed LLM token usage and server-sent events
- HTTP/2 stream resets and HTTP/1.1 transport comparisons
- Python and HTTPX
- Proxies, gateways, observability, and usage accounting

## Sources Consulted
- OpenAI Chat Completions streaming reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events — chunk schema, choice indices, usage-only chunks, and missing usage on interruption.
- OpenAI streaming guide: https://developers.openai.com/api/docs/guides/streaming-responses — typed Responses events.
- OpenAI Responses streaming reference: https://developers.openai.com/api/reference/resources/responses/streaming-events — lifecycle events and completed response information.
- OpenAI reasoning guide: https://developers.openai.com/api/docs/guides/reasoning — invisible reasoning tokens and usage beyond visible output.
- OpenAI Usage and Cost API cookbook: https://developers.openai.com/cookbook/examples/completions_usage_api — aggregate provider usage and cost reporting.
- RFC 9113, sections 6.4 and 7: https://www.rfc-editor.org/rfc/rfc9113.html — stream termination and HTTP/2 error code meanings.
- HTTPX HTTP/2 guide: https://www.python-httpx.org/http2/ — explicit enablement, optional dependencies, protocol negotiation, and response.http_version.
- Python built-in types reference: https://docs.python.org/3/library/stdtypes.html — dictionary access, truth testing, lists, and string joining.
- NGINX proxy module reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout — upstream read timeouts and proxy buffering behavior.
- Author profile: https://github.com/nawazdhandala — verified the linked profile resolves.

## Issues Found
1. The introduction described investigating why the connection ended after an HTTP/2 reset. RST_STREAM terminates an individual stream without necessarily terminating the connection. Changed “why the connection ended” to “why the stream ended.”
2. The example combined content from every choice into one string without stating its single-choice assumption. Chat Completions can return multiple indexed choices, which represent separate completions. Scoped the explanation to n=1 and stated that multiple choices require separate accumulation by choice index. The example code itself remains unchanged.

## Review Notes
- Executed the complete Python code block under Python 3.15.0. Both supplied assertions passed. Four additional checks passed for reconstructed text, finish reasons, empty input, and null content/usage.
- Confirmed that usage can follow a finish reason, empty choices must be accepted, and interruption may leave usage unknown. The sample dictionaries are deliberately minimal parser fixtures rather than complete API response objects.
- The function consumes decoded dictionaries; it does not implement SSE decoding or network exception handling. If its input iterator raises, that exception propagates. The surrounding adapter must preserve attempt state and record the termination category as described in the post.
- Responses lifecycle events use a different schema from Chat Completions chunks. The post correctly avoids applying the Chat Completions parser to Responses.
- HTTPX requires optional HTTP/2 dependencies as well as explicit enablement. Negotiated protocol must be inspected; enabling HTTP/2 alone is not proof it was used.
- Gateway-only failures and agreement across independent clients are diagnostic evidence, not conclusive attribution. The proposed comparison remains dependent on the actual endpoint and network path.
- Keeping missing usage nullable, retaining retries as separate attempts, and reconciling aggregate reporting are sound accounting practices. A reset does not establish whether work was billed; visible text alone cannot establish total provider usage.
- All links included in the post resolved to their intended resources. No terminal commands, configuration blocks, pinned dependency versions, or deprecated APIs occur in the example.
- No live provider requests, induced network resets, or billing reconciliation were performed. Validation covers documentation and local parser execution; reproducing an operational incident requires the affected environment.
