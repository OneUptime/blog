# Validation Summary: How to Test IPv6 Compliance of Applications

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- IPv6 addressing and URI syntax
- curl
- Python ipaddress module
- Python regular expressions
- JSON log parsing
- PostgreSQL inet network type and network operators
- Flask request handling and JSON responses
- netcat
- Swaks SMTP testing

## Sources Consulted
- Python ipaddress module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- curl command-line documentation: https://curl.se/docs/manpage.html
- PostgreSQL network address type documentation: https://www.postgresql.org/docs/current/datatype-net-types.html
- PostgreSQL network address functions and operators: https://www.postgresql.org/docs/current/functions-net.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Swaks project documentation: https://www.jetmore.org/john/code/swaks/
- Local command help for OpenBSD netcat (`nc -h`) and local Python syntax/validation checks.

## Issues Found
- Several example IPv6 literals used descriptive words inside the address, such as `2001:db8::client`, `2001:db8::web`, `2001:db8::bad-actor`, and `2001:db8::smtp-server`. IPv6 address groups must be hexadecimal, so these values fail validation in Python's `ipaddress` module and would also be rejected by PostgreSQL `inet` input or network clients. Replaced them with valid documentation-prefix IPv6 literals: `2001:db8::10`, `2001:db8::20`, `2001:db8::25`, `2001:db8::80`, and `2001:db8::bad`.

## Review Notes
- The corrected `2001:db8::/32` addresses are valid for documentation examples but are reserved for documentation and are not globally routable. Real testing should use IPv6 addresses assigned in the test environment.
