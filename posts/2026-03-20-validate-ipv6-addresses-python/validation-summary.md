# Validation Summary: How to Validate IPv6 Addresses in Python

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Python 3 (`ipaddress` standard library module)
- `ipaddress.IPv6Address` and `ipaddress.IPv6Network`
- Pydantic v2 (`BaseModel`, `field_validator`, `ValidationError`)
- Flask (`request.get_json`, `jsonify`)
- WTForms (`Form`, `StringField`, `validators.DataRequired`, `validators.Length`, `validators.ValidationError`)

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291 (IP Version 6 Addressing Architecture)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation, `2001:db8::/32`)
- RFC 4193 (Unique Local IPv6 Unicast Addresses, `fc00::/7`)
- Pydantic v2 validators docs: https://docs.pydantic.dev/latest/concepts/validators/
- Flask `request.get_json()` docs: https://flask.palletsprojects.com/en/latest/api/#flask.Request.get_json
- WTForms validators docs: https://wtforms.readthedocs.io/en/stable/validators/
- Live verification against Python 3.12.3 for all `ipaddress` calls and `is_*` property results

## Issues Found
No technical issues found.

All code examples were executed against Python 3.12 and produced the expected results:
- Every `IPv6Address` test case in the basic validator section raises `ValueError` exactly where the post claims it will.
- Every CIDR test case in the `IPv6Network` section behaves as documented (including `/129` being rejected as an invalid prefix length and `2001:db8::/32` being strict-valid).
- The `is_loopback`, `is_link_local`, `is_private`, `is_multicast`, `is_unspecified`, and `is_global` properties return values consistent with the example.
- Pydantic v2 `field_validator` usage (with `@classmethod`) is correct.
- Flask `request.get_json()` and WTForms custom validator naming (`validate_<fieldname>`) are correct.
- The claim that the maximum IPv6 string length is 45 characters is accurate (IPv4-mapped uncompressed form: `0000:0000:0000:0000:0000:ffff:255.255.255.255` = 45 chars).

## Review Notes
- The `from typing import Annotated` import in the Pydantic example is unused. Not a technical error (it doesn't break anything), and the author may have intended it as a lead-in to annotated validators; left in place per the instruction to only fix technical errors.
- The "Validating Specific Address Types" section will report `2001:db8::1` as **not** a global unicast address. This is actually correct behavior — Python's `is_private` returns `True` for `2001:db8::/32` because it is the IANA documentation prefix (RFC 3849) and is not globally reachable. The example's output is technically correct; readers should be aware that test/documentation addresses fail the global-unicast check, which is the intended lesson.
- `validators.Length(min=2, max=45)` is a sensible bound: `"::"` is the shortest valid IPv6 (2 chars) and the longest IPv6 text form is 45 chars. If zone identifiers (e.g. `fe80::1%eth0`) need to be accepted, the max would need to be raised — worth a future note but outside the post's scope.
- Python's `is_private`/`is_global` semantics for IPv6 were refined in Python 3.12.4 (related to the iana-ipv6-special-registry alignment). The post's behavior assumptions are consistent with modern Python (3.12+).
