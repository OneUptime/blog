# Validation Summary: How to Create API Content Negotiation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP content negotiation
- Accept, Content-Type, Vary, and Content-Disposition headers
- Express.js and Node.js
- curl
- CSV, XML, and JSON response serialization
- Python Flask and Werkzeug
- Go net/http
- Vendor-specific media types

## Sources Consulted
- RFC 9110: HTTP Semantics - https://www.rfc-editor.org/rfc/rfc9110.html
- Express 5.x API Reference, response methods including `res.format()`, `res.type()`, `res.set()`, and `res.vary()` - https://expressjs.com/en/5x/api/
- Flask 3.1 API documentation - https://flask.palletsprojects.com/en/stable/api/
- Werkzeug 3.1 data structures documentation for `MIMEAccept.best_match()` - https://werkzeug.palletsprojects.com/en/stable/datastructures/
- Go `net/http` package documentation - https://pkg.go.dev/net/http
- Go `strconv` package documentation - https://pkg.go.dev/strconv
- Python `csv` module documentation - https://docs.python.org/3/library/csv.html
- Python `xml.sax.saxutils.escape()` documentation - https://docs.python.org/3/library/xml.sax.utils.html
- curl manual for `-H, --header` - https://curl.se/docs/manpage.html
- RFC 4180: Common Format and MIME Type for CSV Files - https://www.rfc-editor.org/rfc/rfc4180

## Issues Found
- The JavaScript CSV helper converted missing values with `item[header] || ''`, which incorrectly turns valid falsy values such as `0` or `false` into empty strings. Changed it to `item[header] ?? ''` so only `null` and `undefined` become empty fields.
- The custom Accept-header parser was described as "robust" even though it handles common cases only and does not implement every RFC negotiation detail. Changed the wording to "handles common Accept header patterns."
- The Express XML handler comment said it handled `text/xml`, but the shown `res.format()` map only registered `application/xml`. Updated the comment to match the code.
- The Flask XML serializer interpolated values without XML escaping. Added `xml.sax.saxutils.escape()` and converted values to strings before inserting them into XML.
- The Flask example used `best_match(..., default='application/json')`, which made unsupported Accept headers fall back to JSON instead of reaching the 406 branch. Changed it to default JSON only when the Accept header is missing; unsupported explicit Accept values now return 406.
- The Go `parseAccept` comment said the function returned media types in preference order, but the sample intentionally ignores q-values. Updated the comment to say it returns media types in header order and omits quality-value handling for simplicity.
- The Go CSV example converted integer IDs with `string(rune(u.ID + '0'))`, which only works for single-digit IDs and produces wrong output for larger IDs. Replaced it with `strconv.Itoa(u.ID)`.
- The best-practices section said every response must include `Content-Type`; 204/304 and other bodyless responses are exceptions. Scoped the statement to responses with a body.
- The charset example used `res.type()` with complete Content-Type header values. Replaced it with `res.set('Content-Type', ...)`, which directly sets the full header value including charset.
- The OPTIONS example used the `Accept` response header to advertise response formats, but `Accept` is the client request header used for response media negotiation. Reworked the snippet to keep supported types as documentation/metadata and avoid sending `Accept` as a response-format advertisement.

## Review Notes
- The simplified JavaScript Accept parser is suitable for demonstrating the core concept, but production code should prefer a maintained negotiation library or framework-provided negotiation behavior for full RFC edge cases such as media-range specificity, parameters, invalid q-values, and tie-breaking.
- The Go example now fixes the numeric conversion bug but still intentionally keeps Accept parsing simpler than the earlier JavaScript example.
