# Validation Summary: How to Use extractURLParameter() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- ClickHouse URL functions (`extractURLParameter`, `extractURLParameters`, `extractURLParameterNames`, `decodeURLComponent`, `path`)
- SQL

## Sources Consulted
- ClickHouse official URL functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse GitHub issue on extractURLParameter vs extractURLParameters behavior: https://github.com/ClickHouse/ClickHouse/issues/55038
- ClickHouse source for URL functions (`src/Functions/URL/extractURLParameter.cpp`)
- Tinybird reference articles on ClickHouse URL parameter extraction and decoding

## Issues Found

1. **Incorrect claim that `extractURLParameter()` automatically URL-decodes values.**
   - Per the official ClickHouse documentation and source, `extractURLParameter()` returns the raw (still percent-encoded) parameter value. Decoding requires wrapping the call with `decodeURLComponent()` (or `decodeURLFormComponent()` to additionally convert `+` to space).
   - **Fixed in three places:**
     - Opening paragraph: removed "returns its decoded value" and "handles percent-encoded values automatically"; added an explicit note that the value is not URL-decoded and that `decodeURLComponent()` / `decodeURLFormComponent()` should be used when decoding is needed.
     - "Percent-Encoded Value Decoding" section: wrapped the SQL example with `decodeURLComponent(extractURLParameter(...))` so the shown output (`hello world`, `café+menu`, `price:100$`) is actually produced. Updated the comment accordingly. The sample output already matches `decodeURLComponent` behavior (note that `+` is preserved, not converted to a space, which is correct for `decodeURLComponent`).
     - Summary section: removed "It decodes percent-encoded characters automatically" and added guidance to pair the function with `decodeURLComponent()` when decoding is required.

## Review Notes
- Case-sensitivity of the parameter name is correctly described — ClickHouse's implementation performs exact string matching against the query string.
- "First occurrence is returned when the parameter appears multiple times" and "empty string when absent" are both accurate per the docs.
- `path(url)` is a valid ClickHouse URL function and is used correctly in the Search Query Extraction and Detecting Missing Required Parameters examples.
- `toUInt32OrZero()` used around `extractURLParameter(url, 'page')` is a reasonable safe cast — it returns 0 on non-numeric input rather than raising an error.
- The related-functions mention at the end (`extractURLParameters()`, `extractURLParameterNames()`) is accurate; note that those two functions also return raw, undecoded values.
- If the user's data uses `+` to represent spaces in query strings (form-encoded URLs), `decodeURLFormComponent()` is the more correct wrapper than `decodeURLComponent()`. This is now mentioned in the opening paragraph.
