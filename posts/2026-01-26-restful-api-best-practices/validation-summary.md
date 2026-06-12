# Validation Summary: How to Design RESTful APIs Following Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- REST API design
- HTTP methods and status codes
- Flask
- Python
- SQLAlchemy query patterns
- JSON APIs
- API pagination, filtering, sorting, versioning, and error handling
- HATEOAS-style hypermedia links

## Sources Consulted
- RFC 9110: HTTP Semantics - https://datatracker.ietf.org/doc/html/rfc9110
- RFC 5789: PATCH Method for HTTP - https://datatracker.ietf.org/doc/rfc5789/
- Flask API documentation - https://flask.palletsprojects.com/en/stable/api/
- Python datetime documentation - https://docs.python.org/3/library/datetime.html
- SQLAlchemy ordering documentation - https://docs.sqlalchemy.org/14/tutorial/data_select.html

## Issues Found
- The post described PATCH as idempotent without qualification. RFC 5789 defines PATCH as neither safe nor idempotent by default, though a PATCH request can be designed to be idempotent. I updated the comment to clarify that the shown field-replacement implementation is idempotent when repeated with the same values, and changed the code so `updated_at` is only modified when a field value actually changes.
- Several Flask snippets called `request.get_json()` and then used membership tests or `.get()` without handling `None`. I changed these to `request.get_json() or {}` where needed so malformed or missing JSON bodies do not cause unintended `TypeError` or `AttributeError` paths in the example code.
- Several examples used `datetime.utcnow()`, which is deprecated in Python 3.12. I changed these to `datetime.now(timezone.utc)` and updated the imports.
- The error-handling snippet used `request` without importing it. I added the missing Flask import.
- The URL versioning snippet used `jsonify` without importing it. I added the missing Flask import.
- The response envelope snippet referenced `Response` and `app` without defining them. I added the missing import and `app = Flask(__name__)`.
- The sorting example whitelisted filters but not sort fields, allowing invalid field names to raise `AttributeError`. I added an allowed sort-field set and a 400 error response for unsupported fields.
- The numeric range filter example skipped valid zero values because it tested the truthiness of `request.args.get(..., type=float)`. I changed the checks to `is not None`.
- The status code table used the older/common label "Unprocessable Entity" for 422. RFC 9110 uses "Unprocessable Content", so I updated the table label.

## Review Notes
- The examples still use placeholder functions and models such as `db`, `User`, `Product`, `find_user`, and `email_exists`; this is acceptable for a conceptual guide, but readers would need to supply those pieces in a complete application.
- The Python fenced code blocks were syntax-checked with `python3` after edits.
