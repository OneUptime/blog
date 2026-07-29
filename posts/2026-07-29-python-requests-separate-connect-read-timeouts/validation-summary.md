# Validation Summary: How to Set Separate Connect and Read Timeouts in Python Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Requests
- urllib3
- HTTP and HTTPS
- Connection and read timeouts
- Streaming responses
- Exception handling and retry safety

## Sources Consulted
- [Requests 2.34.2 advanced timeout documentation](https://requests.readthedocs.io/en/stable/user/advanced/#timeouts)
- [Requests 2.34.2 Quickstart timeout behavior](https://requests.readthedocs.io/en/stable/user/quickstart/#timeouts)
- [Requests 2.34.2 exception API](https://requests.readthedocs.io/en/stable/api/#exceptions)
- [Requests 2.34.2 streaming and keep-alive documentation](https://requests.readthedocs.io/en/stable/user/advanced/#body-content-workflow)
- [urllib3 2.7.0 Timeout API](https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Timeout)
- [Requests 2.34.2 `Response.iter_content` source](https://github.com/psf/requests/blob/v2.34.2/src/requests/models.py)
- [Requests 2.34.2 `HTTPAdapter.send` source](https://github.com/psf/requests/blob/v2.34.2/src/requests/adapters.py)
- [urllib3 2.7.0 connection-pool source](https://github.com/urllib3/urllib3/blob/2.7.0/src/urllib3/connectionpool.py)

## Issues Found
- The timeout-selection guidance incorrectly included DNS resolution among the work bounded by the connect timeout. Updated it to treat DNS separately because urllib3 documents that Python's DNS resolver does not obey the socket timeout.

## Review Notes
- The tuple order, per-address connect behavior, read-inactivity semantics, lack of a total wall-clock deadline, exception hierarchy, retry-safety guidance, and streamed-response cleanup pattern are correct for Requests 2.34.2 and urllib3 2.7.0.
- With `stream=True`, a read timeout that occurs later while iterating `Response.iter_content()` is wrapped by Requests 2.34.2 as `requests.exceptions.ConnectionError`, rather than `ReadTimeout`. The post does not make a contrary claim, but this is a useful caveat if a future revision adds exception handling around streamed body iteration.
- The `api.example.com` endpoints and the standalone `url` name are illustrative placeholders and must be replaced or defined before running those snippets against a real service.
