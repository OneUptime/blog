# Why Can Python `requests.get()` Hang Forever? Adding Safe Session Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Python Requests, HTTP, Session, Timeout, Reliability

Description: Explain why Requests has no default timeout and build a Session that applies safe connect and read limits while allowing explicit per-call overrides.

---

Python Requests does not time out a request unless the caller supplies `timeout`. A call such as this can therefore wait for minutes or longer when a peer stops making progress:

```python
import requests

response = requests.get("https://api.example.com/v1/catalog")
```

The operating system and network may eventually end a failed connection, but that is not a useful application deadline. A blocked worker can hold memory, a thread, a job lease, or an incoming request open while the caller has no predictable completion time.

The direct fix is to pass a timeout on every call:

```python
response = requests.get(
    "https://api.example.com/v1/catalog",
    timeout=(3.05, 15),
)
```

For a codebase with many call sites, a small `Session` subclass provides a safer default without preventing endpoint-specific values.

## Build a Session with a Default Timeout

Requests does not document a `Session.timeout` configuration attribute. Setting one does not cause `Session.get()` to use it. Instead, override `request()`, which is the common path used by the Session convenience methods:

```python
from typing import TypeAlias

import requests

TimeoutValue: TypeAlias = float | tuple[float, float]


class TimeoutSession(requests.Session):
    def __init__(
        self,
        default_timeout: TimeoutValue = (3.05, 15),
    ) -> None:
        super().__init__()
        self.default_timeout = default_timeout

    def request(self, method: str, url: str, **kwargs):
        kwargs.setdefault("timeout", self.default_timeout)
        return super().request(method, url, **kwargs)
```

Use one Session for a related group of calls and close it when finished:

```python
with TimeoutSession(default_timeout=(3.05, 20)) as session:
    catalog = session.get(
        "https://api.example.com/v1/catalog",
    )
    catalog.raise_for_status()

    report = session.get(
        "https://api.example.com/v1/slow-report",
        timeout=(5, 60),
    )
    report.raise_for_status()
```

`setdefault()` applies the Session policy only when the caller omitted `timeout`. The report request overrides both values.

An explicit `timeout=None` also remains an override and disables the Requests timeout for that call. That escape hatch should be rare and reviewed, but preserving it makes the class behavior honest and predictable.

For Python versions before 3.10, replace the union syntax with `Union[float, Tuple[float, float]]`, or omit the annotation.

## Why Use a Session?

A Requests Session persists cookies and selected configuration, and it uses urllib3 connection pooling. Reusing connections can avoid repeated TCP and TLS setup for calls to the same host.

The timeout policy and pooling are independent:

- the default timeout prevents an omitted argument from becoming an unbounded wait;
- the Session pool improves connection reuse;
- neither automatically makes failed operations safe to retry.

Closing the Session releases its adapters and pooled resources. A process-wide Session can be reasonable if its lifecycle and concurrency model are understood, but a new Session per individual request defeats most connection reuse.

## Know What the Default Actually Bounds

With `(3.05, 15)`:

- the first value bounds each connection attempt to an address;
- the second bounds inactivity while reading response data;
- neither is a total wall-clock deadline.

Requests documents that a read timeout is the wait between bytes, not the maximum duration of a complete response download. It also notes that a hostname with multiple addresses can result in multiple sequential connection attempts, each with its own connect timeout.

Redirects and configured retries can add more work. If an incoming HTTP request has two seconds remaining, a downstream default of 15 seconds is not safe merely because it is finite. Clamp the downstream policy to the caller's remaining budget or use a client architecture that propagates cancellation and deadlines.

## Direct `send()` Calls Need Special Care

The override above applies to `session.request()` and methods such as `get()`, `post()`, and `put()` that call it. It does not intercept code that prepares a request and invokes `session.send()` directly:

```python
from requests import Request

with TimeoutSession() as session:
    prepared = session.prepare_request(
        Request("GET", "https://api.example.com/v1/catalog")
    )
    response = session.send(prepared, timeout=(3.05, 15))
```

Pass `timeout` explicitly in that lower-level flow. This is one reason to expose a small application client instead of allowing arbitrary Session access throughout a large codebase.

## Retries Are a Separate Decision

Requests does not retry failed connections by default. Its documented adapter example uses urllib3 `Retry`, but adding it changes the total latency and traffic sent during an incident.

If retries are appropriate, configure them deliberately:

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

session = TimeoutSession(default_timeout=(3.05, 15))
retry = Retry(
    total=2,
    connect=2,
    read=0,
    status=2,
    allowed_methods={"GET", "HEAD", "OPTIONS"},
    status_forcelist={429, 502, 503, 504},
    backoff_factor=0.2,
    respect_retry_after_header=True,
)
adapter = HTTPAdapter(max_retries=retry)
session.mount("https://", adapter)
```

This example permits a small number of retries for selected idempotent methods and disables automatic read retries. It is still only a starting point. Check the upstream API contract, the meaning of each status, and whether another layer already retries.

The `total` value in urllib3 is a retry count limit, not the total elapsed-time budget. Timeout values, backoff, and the initial attempt all contribute to elapsed time.

## Test That the Policy Reaches the Adapter

A lightweight adapter can verify both the default and an override without making a network call:

```python
import requests
from requests.adapters import BaseAdapter


class RecordingAdapter(BaseAdapter):
    def __init__(self) -> None:
        self.seen_timeout = None

    def send(self, request, **kwargs):
        self.seen_timeout = kwargs["timeout"]
        response = requests.Response()
        response.status_code = 204
        response.request = request
        return response

    def close(self) -> None:
        pass


def test_default_and_override() -> None:
    adapter = RecordingAdapter()

    with TimeoutSession(default_timeout=(2, 8)) as session:
        session.mount("https://", adapter)
        session.get("https://example.test/default")
        assert adapter.seen_timeout == (2, 8)

        session.get("https://example.test/override", timeout=(1, 3))
        assert adapter.seen_timeout == (1, 3)
```

Also test the behavior of `timeout=None` if the application permits it.

## Operational Checklist

- Route outbound calls through the defaulted Session or a narrower application client.
- Permit overrides only where an endpoint has measured, different behavior.
- Record connect and read timeout exceptions separately.
- Include attempt count and elapsed time in telemetry.
- Close streamed responses so pooled connections are returned.
- Audit low-level `send()` calls that bypass the `request()` override.
- Account for adapter, proxy, service-mesh, and application retries together.
- Never assume a finite Requests timeout is the same as an end-to-end deadline.

The main reliability improvement is not the exact numeric default. It is making an omitted timeout impossible along the normal call path, while keeping exceptions explicit and observable.

## Official Documentation

- [Requests Quickstart timeouts](https://requests.readthedocs.io/en/stable/user/quickstart/#timeouts)
- [Requests advanced timeout behavior](https://requests.readthedocs.io/en/stable/user/advanced/#timeouts)
- [Requests Session objects](https://requests.readthedocs.io/en/stable/user/advanced/#session-objects)
- [Requests prepared-request flow](https://requests.readthedocs.io/en/stable/user/advanced/#prepared-requests)
- [Requests transport adapters and retries](https://requests.readthedocs.io/en/stable/user/advanced/#transport-adapters)
- [urllib3 Retry API](https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry)
