# How to Set Separate Connect and Read Timeouts in Python Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Python Requests, HTTP, Timeout, Reliability

Description: Configure distinct connection and response-read limits in Python Requests, then handle each failure without mistaking either value for a total deadline.

---

Python Requests accepts a two-item `timeout` tuple when establishing a connection should have a different limit from waiting for response data:

```python
import requests

response = requests.get(
    "https://api.example.com/v1/orders",
    timeout=(3.05, 20),
)
response.raise_for_status()
```

The tuple order is `(connect timeout, read timeout)`. In this example, Requests allows up to 3.05 seconds for a connection attempt and up to 20 seconds of read inactivity after the request has been sent.

Those are two different failure boundaries. They are not a 23.05-second deadline for the whole operation.

## What Each Timeout Controls

The connect timeout limits how long Requests waits for the underlying socket connection to a remote address. For HTTPS, connection setup also includes the work needed to establish a usable secure connection through the Requests and urllib3 transport stack.

The read timeout begins after the connection is established and the request is sent. Requests documents it as the interval the client waits between bytes from the server, not the maximum duration of the complete download.

That distinction matters for a response that streams one small chunk every few seconds. It can run much longer than the configured read timeout without failing, provided no individual read is inactive for longer than that value.

If a single number is supplied, Requests applies it to both phases:

```python
response = requests.get(url, timeout=10)
```

This is equivalent in intent to `timeout=(10, 10)`, but a tuple makes the operational policy explicit.

## Why the Values Usually Differ

A connection normally either succeeds quickly or indicates a network-path problem. A response may legitimately take longer because the server must query a database, call another service, or begin producing a large result.

A useful starting shape is therefore a shorter connect timeout and a longer read timeout:

```python
DEFAULT_TIMEOUT = (3.05, 15)

def fetch_customer(customer_id: str) -> dict:
    response = requests.get(
        f"https://api.example.com/v1/customers/{customer_id}",
        timeout=DEFAULT_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()
```

The numbers are examples, not universal recommendations. Select them from measured connection latency, the endpoint latency distribution, the caller's own deadline, and the cost of holding a worker while waiting.

Requests notes that a connect timeout applies to each connection attempt for an IP address. If a hostname resolves to multiple addresses and attempts are made sequentially, elapsed connection time can be a multiple of the configured value. Redirects and retries can also add attempts.

## Handle Connect and Read Failures Separately

Requests exposes specific exceptions beneath the common `Timeout` base class:

```python
import requests

try:
    response = requests.get(
        "https://api.example.com/v1/orders/123",
        timeout=(3.05, 15),
    )
    response.raise_for_status()
except requests.exceptions.ConnectTimeout:
    # No usable connection was established within the configured interval.
    raise
except requests.exceptions.ReadTimeout:
    # The outcome may be unknown if the server had already received the request.
    raise
except requests.exceptions.Timeout:
    # Retains compatibility with other timeout subclasses.
    raise
```

The distinction is especially important for writes. A connection timeout generally means the client did not establish the connection for that attempt. A read timeout can happen after the server accepted and committed a request but before its response reached the client. Do not automatically repeat a non-idempotent write solely because it raised `ReadTimeout`.

Use an idempotency key, a stable operation identifier, or a status lookup before retrying a state-changing request with an unknown result.

## Streaming Responses Still Need Read Timeouts

With `stream=True`, Requests returns after response headers arrive and reads the body as your code iterates it. The configured read timeout still governs socket-read inactivity:

```python
import requests

with requests.get(
    "https://api.example.com/v1/export",
    timeout=(3.05, 30),
    stream=True,
) as response:
    response.raise_for_status()
    with open("export.ndjson", "wb") as output:
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if chunk:
                output.write(chunk)
```

Always consume or close a streamed response. Requests can return a connection to the Session pool only after the body is consumed or the response is closed.

The 30-second value above is still an inactivity limit, not a maximum export duration. If the product requires the entire export to finish within five minutes, that is a separate application-level deadline.

## A Timeout Is Not an HTTP Error Check

Timeout handling and HTTP status handling solve different problems:

- `timeout` bounds selected waits in the transport.
- `response.raise_for_status()` turns unsuccessful HTTP status codes into `HTTPError`.
- Neither validates the response schema or business result.

A server can respond with `503 Service Unavailable` well inside the timeout. Conversely, a healthy server can exceed a timeout that is too aggressive. Record the exception class, elapsed duration, endpoint, attempt number, and remaining caller budget so these cases are distinguishable.

## Common Mistakes

### Reversing the tuple

`timeout=(3, 20)` means connect for up to 3 seconds and wait up to 20 seconds between response bytes. It does not mean read first and connect second.

### Passing `None`

Requests documents `timeout=None` as waiting without a Requests timeout. It is also the default when the argument is omitted. Production callers should make an intentional choice rather than inheriting an unbounded wait.

### Treating the tuple as a total

Neither item is a wall-clock limit for the complete request. Address iteration, redirects, retries, and a continuously progressing download can all make elapsed time longer.

### Adding retries without revisiting the budget

Three attempts can consume roughly three phase timeouts plus backoff. Set a maximum attempt count and ensure all attempts fit inside the caller's end-to-end deadline.

### Using the same values for every endpoint

A health check, an interactive lookup, and a multi-gigabyte export have different useful waiting periods. Centralize defaults, but permit deliberate endpoint-specific overrides.

## A Practical Selection Process

Start with measurements rather than folklore:

1. Measure connection setup and response latency separately where your telemetry allows it.
2. Choose a connect limit that covers normal DNS, routing, proxy, TCP, and TLS variation without occupying workers through a broken path for too long.
3. Choose a read-inactivity limit that covers the endpoint's expected first-byte and inter-byte behavior.
4. Keep enough caller budget for parsing, fallback behavior, and any permitted retry.
5. Load test the policy during slow responses and partial network failures.
6. Alert on timeout rate and latency distributions, not on individual timeout events alone.

The safest configuration is explicit, observable, and tied to a larger request deadline. The tuple is the mechanism; the reliability policy comes from how its two values fit the rest of the call path.

## Official Documentation

- [Requests advanced timeout documentation](https://requests.readthedocs.io/en/stable/user/advanced/#timeouts)
- [Requests Quickstart timeout behavior](https://requests.readthedocs.io/en/stable/user/quickstart/#timeouts)
- [Requests exception API](https://requests.readthedocs.io/en/stable/api/#exceptions)
- [Requests streaming and keep-alive behavior](https://requests.readthedocs.io/en/stable/user/advanced/#body-content-workflow)
