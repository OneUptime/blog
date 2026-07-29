# Validation Summary: Why Can Python `requests.get()` Hang Forever? Adding Safe Session Defaults

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Python type annotations
- Requests
- urllib3
- HTTP connection pooling
- Connect and read timeouts
- HTTP retries

## Sources Consulted
- Requests Quickstart timeout documentation: https://requests.readthedocs.io/en/stable/user/quickstart/#timeouts
- Requests advanced timeout documentation: https://requests.readthedocs.io/en/stable/user/advanced/#timeouts
- Requests Session documentation: https://requests.readthedocs.io/en/stable/user/advanced/#session-objects
- Requests prepared-request documentation: https://requests.readthedocs.io/en/stable/user/advanced/#prepared-requests
- Requests streaming and connection-release documentation: https://requests.readthedocs.io/en/stable/user/advanced/#body-content-workflow
- Requests transport adapter and retry documentation: https://requests.readthedocs.io/en/stable/user/advanced/#transport-adapters
- Requests developer interface: https://requests.readthedocs.io/en/stable/api/
- Requests `Response.iter_content()` source: https://requests.readthedocs.io/en/stable/_modules/requests/models/#Response.iter_content
- urllib3 `Retry` API: https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry
- Python `typing.TypeAlias` documentation: https://docs.python.org/3/library/typing.html#typing.TypeAlias
- Python 3.10 union type documentation: https://docs.python.org/3.10/library/stdtypes.html#types-union

## Issues Found
- The main example used `typing.TypeAlias`, which is deprecated in Python 3.12 and later. The pre-3.10 compatibility note also suggested replacing only the union syntax even though `typing.TypeAlias` itself was not added until Python 3.10. Removed the deprecated marker from the example and clarified that pre-3.10 code must import and use `Tuple` and `Union`.
- The retry explanation implied that all configured retries were limited to `allowed_methods`. urllib3 applies the method allowlist to status retries, while connection errors are classified before the request is sent and can be retried independently of that allowlist. Updated the explanation to distinguish status retries, connection-error retries, and disabled read retries.
- The operational checklist described connect and read timeout exceptions as if they can always be classified by exception type. Requests converts a timeout encountered while consuming a response body into `requests.exceptions.ConnectionError`. Updated the checklist to recommend recording phase details where possible and to call out this exception behavior.

## Review Notes
- Verified locally with Python 3.13.1, Requests 2.32.3, and urllib3 2.3.0 that the adapter receives the Session default, an explicit tuple override, and an explicit `None` override as described.
- Verified locally that assigning `session.timeout` does not supply a timeout to the adapter and that a direct `session.send()` call bypasses the `request()` override.
- Verified that the recording adapter test runs without network access and that the retry configuration is accepted by the current APIs.
- Verified with a local HTTP server that a timeout after response headers and partial body data surfaces as `requests.exceptions.ConnectionError`.
- The timeout values are per-connect-attempt and per-read-inactivity limits, not an end-to-end deadline; the post states this accurately.
- The external documentation links resolve to the intended official resources. The API hostnames in code examples are intentionally non-production example domains.
