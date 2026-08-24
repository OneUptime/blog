# Validation Summary: How to Test Multipart Upload Limits, Types, and Partial Failures

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- HTTP multipart form data
- Playwright Test and `APIRequestContext`
- TypeScript and Node.js `Buffer`, `FormData`, and `File` APIs
- HTTP/1.1, HTTP/2, and HTTP/3 request framing
- File-content validation and media-type detection
- Multipart upload atomicity, partial failure, storage cleanup, and security testing
- OpenAPI 3.2 multipart encoding

## Sources Consulted

- [RFC 7578: Returning Values from Forms: `multipart/form-data`](https://www.rfc-editor.org/rfc/rfc7578.html)
- [RFC 2046 Section 5.1.1: Common multipart syntax](https://www.rfc-editor.org/rfc/rfc2046.html#section-5.1.1)
- [RFC 9110 Section 15.5.14: 413 Content Too Large](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.14)
- [RFC 9110 Section 15.5.16: 415 Unsupported Media Type](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.16)
- [RFC 9112 Sections 6 and 7.1: HTTP/1.1 message framing and chunked transfer coding](https://www.rfc-editor.org/rfc/rfc9112.html#section-6)
- [RFC 9113 Section 8.1: HTTP/2 message framing](https://www.rfc-editor.org/rfc/rfc9113.html#section-8.1)
- [RFC 9114 Section 4.1: HTTP/3 message framing](https://www.rfc-editor.org/rfc/rfc9114.html#section-4.1)
- [RFC 4918 Sections 11.1 and 13: 207 Multi-Status semantics](https://www.rfc-editor.org/rfc/rfc4918.html#section-11.1)
- [Playwright `APIRequestContext` multipart option](https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-post)
- [Playwright client-side request serialization source](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/client/fetch.ts)
- [Playwright multipart serializer source](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/formData.ts)
- [Playwright server-side request serialization source](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/fetch.ts)
- [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements)
- [Node.js global `File` and `FormData` documentation](https://nodejs.org/api/globals.html)
- [OpenAPI Specification 3.2.0 multipart encoding](https://spec.openapis.org/oas/v3.2.0.html#encoding-multipart-media-types)

## Issues Found

- The `415 Unsupported Media Type` explanation could imply that the status applies independently to a file part. Clarified that 415 rejects the request and that an unsupported nested file part can be the reason the API rejects the multipart request.
- Repeated field names and their order were listed among protocol-negative cases even though RFC 7578 defines repeated names as valid and requires intermediaries not to reorder or coalesce them. Reworded the section as covering both malformed framing and parser edge cases, and identified the repeated-name case as an order-preservation test.
- The boundary-content test was ambiguous because an actual boundary delimiter cannot occur inside a conforming part. Clarified that the valid robustness case uses near-miss boundary-like bytes that are not delimiter lines.
- The parser guidance allowed unsupported part headers to be rejected according to application policy. RFC 7578 requires unsupported MIME part headers to be ignored, so the guidance now distinguishes safely ignored well-formed headers from malformed header syntax.
- The streaming guidance treated an omitted `Content-Length` as generically equivalent to chunked transfer. Made the behavior protocol-specific: HTTP/1.1 uses chunked transfer coding for an unknown-length request body, while HTTP/2 and HTTP/3 delimit content with frames.
- The streaming section did not state that Playwright's `APIRequestContext` materializes multipart file data, serializes the complete body, and sets `Content-Length`. Added a requirement to use a streaming-capable low-level client for chunked or genuinely streamed upload tests.
- The two RFC 9110 documentation links used fragments that do not exist. Replaced them with the stable section anchors for 413 and 415.

## Review Notes

- Both Playwright code forms are valid with the current API: `multipart` accepts a `FormData` object with repeated `File` entries and an object containing the `{ name, mimeType, buffer }` file-payload shape.
- `failOnStatusCode: false` is valid but redundant because Playwright returns responses for non-2xx/3xx status codes by default.
- The relative `/v1/uploads` URLs assume that Playwright's `baseURL` is configured.
- Playwright's high-level multipart serializer always supplies a file-part `Content-Type`, using the declared value, a filename-based inference, or `application/octet-stream`. A raw-body client is needed to test a genuinely omitted file-part `Content-Type` header.
- The post correctly treats 413, 415, upload size inclusivity, and partial-success response semantics as API-contract decisions rather than universal multipart behavior.
