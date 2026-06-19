# Validation Summary: How to Handle Dates and Times in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python `datetime` standard library module
- Python `zoneinfo` standard library module
- Unix timestamps
- `python-dateutil` parser and `relativedelta`
- `pytz`

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `zoneinfo` documentation: https://docs.python.org/3/library/zoneinfo.html
- python-dateutil parser documentation: https://dateutil.readthedocs.io/en/stable/parser.html
- python-dateutil `relativedelta` documentation: https://dateutil.readthedocs.io/en/stable/relativedelta.html
- pytz documentation: https://pythonhosted.org/pytz/

## Issues Found
- The formatting example appended a literal `Z` suffix to `datetime.now()`, which creates a naive local datetime. Since `Z` denotes UTC, this was changed to format an aware UTC datetime created with `datetime.now(timezone.utc)`.
- The Unix timestamp example used a naive datetime for `timestamp()`, which makes Python interpret the value as local time. This was changed to an aware UTC datetime so the example is deterministic and matches the surrounding UTC timestamp discussion.
- The Unix timestamp example used `datetime.utcfromtimestamp()`, which is deprecated since Python 3.12. This was changed to `datetime.fromtimestamp(timestamp, timezone.utc)`, the current documented recommendation.
- The naive-to-aware example described `replace(tzinfo=...)` too broadly. The comment was clarified to say it should be used when the naive datetime already represents that local time, because `replace()` attaches timezone metadata rather than converting between time zones.

## Review Notes
All Python code blocks were executed successfully with Python 3.12.3 after the fixes. The post correctly presents `zoneinfo` as the standard-library option for Python 3.9+, while still showing `pytz` for legacy projects.
