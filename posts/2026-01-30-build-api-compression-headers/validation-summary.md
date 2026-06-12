# Validation Summary: How to Build API Compression Headers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP compression negotiation
- Accept-Encoding, Content-Encoding, and Vary headers
- Node.js zlib
- Express middleware
- Python Flask responses
- Python gzip, zlib, and optional Brotli compression
- Go net/http middleware
- Go compress/gzip and compress/flate
- curl-based HTTP header testing

## Sources Consulted
- RFC 9110: HTTP Semantics, including Accept-Encoding, Content-Encoding, and Vary semantics: https://www.rfc-editor.org/rfc/rfc9110
- Node.js zlib documentation: https://nodejs.org/api/zlib.html
- Node.js HTTP ServerResponse documentation: https://nodejs.org/api/http.html
- Express API documentation, including res.vary: https://expressjs.com/en/api.html
- Flask API documentation for response objects and headers: https://flask.palletsprojects.com/en/stable/api/
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go compress/gzip package documentation: https://pkg.go.dev/compress/gzip
- Go compress/flate package documentation: https://pkg.go.dev/compress/flate
- curl command-line help available in the local environment

## Issues Found
- The JavaScript `selectEncoding('gzip, br')` example claimed Brotli would be selected, but the original implementation iterated client order and would return gzip when q-values tied. Updated the JavaScript selector to choose the highest q-value and use server preference as the tiebreaker.
- The middleware selectors in JavaScript, Python, and Go did not consistently apply server preference on equal q-values. Updated them to use the same highest-quality, server-preference selection model.
- The Accept-Encoding parsers only matched `;q=` exactly and did not normalize encoding names in every language. Updated the parsers to handle optional whitespace around q parameters and lowercase encoding tokens.
- The Node.js middleware overwrote any existing `Vary` header with `Accept-Encoding`. Added `appendVary` so existing Vary values are preserved.
- The Flask example overwrote any existing `Vary` header. Added `append_vary` so existing Vary values are preserved.
- The Express streaming example set `Content-Encoding: identity`, but the middleware still buffered `res.write` output until `res.end`. Updated the middleware to pass through responses that already set `Content-Encoding`.
- The Go snippet imported `sync` but did not use it, which would prevent compilation. Removed the unused import.
- The Go response writer made the compression decision in `WriteHeader`, so handlers that called `WriteHeader` before writing the body would not be compressed based on final body size. Updated it to record the status code, buffer the body, and send headers during `Close`.
- The Go Vary handling replaced existing `Vary` values. Added `addVary` to append `Accept-Encoding` only when absent.
- The "Missing Vary Header" example used `res.setHeader('Vary', 'Accept-Encoding')`, which can replace existing Vary values. Updated it to use Express `res.vary('Accept-Encoding')`.

## Review Notes
JavaScript code blocks were checked with `node --check`, and the Python code block was checked with `python3 -m py_compile`. The local environment does not include the Go toolchain, so the Go snippet could not be compiled here; it was reviewed against the official Go package documentation instead.
