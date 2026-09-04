# How to Sign CloudStack API Requests Correctly When Parameters Contain URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, API, REST API, HTTP, Security, Troubleshooting

Description: Implement and verify CloudStack HMAC-SHA1 request signing without corrupting nested URLs, literal plus signs, spaces, percent escapes, parameter order, or transmitted values.

---

CloudStack API signing becomes deceptively difficult when a parameter value is itself a URL. The inner URL can contain `?`, `&`, `=`, `+`, `%`, spaces, and a signed token. Those characters belong to one parameter value, but they also have meanings in the outer form-encoded CloudStack request.

The safe approach is to keep logical parameters as structured values until the last moment, generate the CloudStack canonical string exactly once, and independently encode the transmitted request. Never concatenate an inner URL into the outer query string by hand.

## Understand the Two Encodings

Consider this logical parameter:

```text
url=https://images.example.net/base.qcow2?token=a+b&mirror=west coast
```

The inner ampersand is part of `url`; it is not a new CloudStack parameter. The literal plus in `a+b` must not turn into a space. When this value is encoded for the outer request:

- `?` becomes `%3F`;
- `=` becomes `%3D`;
- the inner `&` becomes `%26`;
- the literal `+` becomes `%2B`; and
- the space becomes `%20` for CloudStack canonicalization.

If the inner URL already contains a percent escape such as `%2F`, its percent character is data at the outer layer and is encoded as `%25`. Decoding the outer form once reconstructs the original inner URL.

## Follow CloudStack's Canonicalization Rules

The official CloudStack developer guide defines this signing sequence:

1. Exclude the `signature` field from the command string.
2. URL-encode each parameter value, using `%20` rather than `+` for a space.
3. Lowercase parameter names and the entire canonical command string.
4. Sort field-value pairs alphabetically by field name.
5. Compute HMAC-SHA1 over the canonical UTF-8 bytes with the user's secret key.
6. Base64-encode the digest.
7. URL-encode the Base64 signature when transmitting it.

Parameter names are case-insensitive at the API, while parameter values are case-sensitive in the actual request. The canonical string is lowercased for signing, but the transmitted values must retain their original case. Do not replace the outgoing template UUID, URL path, token, or display name with its canonical lowercase representation.

HMAC-SHA1 here is the authentication algorithm required by the CloudStack query API protocol. It does not encrypt the request. Use HTTPS with normal certificate and hostname verification.

## A Python 3 Signer That Preserves URLs

The following standalone client builds one canonical representation, signs it, and sends a separately encoded form body. It takes credentials from environment variables so they do not appear in source or shell history.

```python
#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import sys
from urllib.parse import quote, quote_plus, urlencode

import requests


def cloudstack_encode_for_signature(value):
    """Encode one logical value using CloudStack's signing rules."""
    return quote_plus(str(value), safe="").replace("+", "%20")


def canonical_string(params):
    """Return the lowercase, field-sorted string covered by the HMAC."""
    pairs = []
    for key in sorted(params, key=lambda item: item.lower()):
        if key.lower() == "signature":
            continue
        encoded = cloudstack_encode_for_signature(params[key])
        pairs.append(f"{key.lower()}={encoded.lower()}")
    return "&".join(pairs)


def sign(params, secret_key):
    canonical = canonical_string(params)
    digest = hmac.new(
        secret_key.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    return base64.b64encode(digest).decode("ascii")


def call_api(endpoint, api_key, secret_key, command, **arguments):
    if not endpoint.startswith("https://"):
        raise ValueError("Refusing to send API credentials without HTTPS")

    params = {
        "command": command,
        "response": "json",
        "apikey": api_key,
        **{key: str(value) for key, value in arguments.items()},
    }
    params["signature"] = sign(params, secret_key)

    # quote_via=quote sends spaces as %20 and literal plus signs as %2B.
    body = urlencode(params, quote_via=quote, safe="")
    response = requests.post(
        endpoint,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=(5, 60),
    )
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    result = call_api(
        endpoint=os.environ["CLOUDSTACK_API_URL"],
        api_key=os.environ["CLOUDSTACK_API_KEY"],
        secret_key=os.environ["CLOUDSTACK_SECRET_KEY"],
        command="registerTemplate",
        name="signed-url-test",
        displaytext="signed URL test",
        format="QCOW2",
        hypervisor="KVM",
        ostypeid=sys.argv[1],
        zoneid=sys.argv[2],
        url=(
            "https://images.example.net/base.qcow2"
            "?token=a+b&mirror=west%20coast"
        ),
    )
    print(json.dumps(result, indent=2))
```

Run it with a virtual environment and a trusted HTTPS endpoint:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install requests

export CLOUDSTACK_API_URL=https://cloud.example.net/client/api
export CLOUDSTACK_API_KEY=REDACTED_API_KEY
read -r -s CLOUDSTACK_SECRET_KEY
export CLOUDSTACK_SECRET_KEY
python cs_call.py OS_TYPE_UUID ZONE_UUID
unset CLOUDSTACK_SECRET_KEY
```

For an internal certificate authority, add its CA bundle to the `requests.post` call with `verify="/path/to/ca.pem"`, or configure `REQUESTS_CA_BUNDLE=/path/to/ca.pem`. Do not use `verify=False` or disable TLS verification for diagnostics.

## Unit-Test the Difficult Characters

Test canonicalization before contacting CloudStack. This check proves that a nested `&` stays inside the value, a literal plus becomes `%2b` in the lowercased canonical string, and the space becomes `%20`:

```python
params = {
    "command": "registerTemplate",
    "response": "json",
    "apikey": "ExampleKey",
    "url": "https://images.example.net/base.qcow2?token=a+b&mirror=west coast",
}

canonical = canonical_string(params)

assert canonical.count("&") == 3
assert (
    "url=https%3a%2f%2fimages.example.net%2fbase.qcow2"
    "%3ftoken%3da%2bb%26mirror%3dwest%20coast"
) in canonical
assert "+" not in canonical
assert canonical.split("&") == sorted(canonical.split("&"))
print(hashlib.sha256(canonical.encode()).hexdigest())
```

The `count` assertion reflects four outer parameters. There are three separators between them; the inner ampersand is encoded as `%26` and does not add a separator.

Do not print the full canonical string in production. It contains the API key and can contain short-lived secrets embedded in URLs. A hash of the canonical string is usually enough to compare two implementations safely, provided both parties build it from the same test values.

## Do Not Parse an Already Encoded Query by Splitting on Ampersands

This is unsafe:

```python
# Wrong: the inner URL's ampersand becomes an outer field separator.
raw = "command=registerTemplate&url=" + template_url
parts = raw.split("&")
```

It can turn `mirror=west` into an unintended CloudStack field, sign different bytes from those transmitted, or truncate a signed download token.

Also avoid signing a fully assembled URL after a library has normalized it. URL libraries may:

- reorder fields;
- convert spaces between `+` and `%20`;
- decode and re-encode percent escapes;
- remove an empty value;
- normalize Unicode; or
- use a different hex-letter case.

Build signing input from the logical dictionary, not from a proxy log or copied browser URL.

## Common Signature Failure Modes

| Symptom | Likely cause | Correction |
| --- | --- | --- |
| Only URL-bearing requests fail | Inner `&`, `+`, `%`, or `=` was not outer-encoded | Keep the URL as one logical value and use a form encoder |
| Values with spaces fail | Canonical string used `+` | Replace signing-time `+` with `%20` |
| Signature differs intermittently | Parameter iteration order is unstable | Sort by lowercase field name before HMAC |
| Mixed-case token stops working | Canonical values were sent instead of original values | Lowercase only signing input; preserve transmitted values |
| HMAC matches locally but server rejects it | Signature itself was not URL-encoded or body changed in transit | Encode the Base64 signature as an outer value and inspect proxy behavior |
| ASCII works but Unicode fails | Implementations disagree on text encoding or normalization | Use UTF-8 and preserve one normalized logical value end to end |
| Request works over HTTP only | TLS trust is misconfigured, unrelated to signing | Install the CA chain and keep hostname verification enabled |

## Diagnose Without Leaking Keys

Capture the following from client and server-side diagnostics:

- HTTP status and CloudStack error code/text;
- command name;
- sorted list of parameter names, without values;
- SHA-256 of the canonical string;
- SHA-256 of the transmitted body;
- client clock and request time; and
- a request or correlation ID if the proxy supplies one.

On the management server, search the request time and caller without logging the secret key or a signed template URL:

```bash
sudo journalctl -u cloudstack-management \
  --since '2026-09-04 10:00:00' \
  --until '2026-09-04 10:05:00' --no-pager
```

Redact `apikey`, `signature`, session keys, and query tokens before sharing logs. The CloudStack secret key must never be transmitted as a request parameter; it is only the local HMAC key.

## Verify with a Read-Only Call First

Before registering a template or changing infrastructure, use the same signer for a small read-only request:

```python
result = call_api(
    endpoint=os.environ["CLOUDSTACK_API_URL"],
    api_key=os.environ["CLOUDSTACK_API_KEY"],
    secret_key=os.environ["CLOUDSTACK_SECRET_KEY"],
    command="listZones",
    listall="false",
)
print(json.dumps(result, indent=2))
```

Then add a benign URL-bearing request in a test account or zone. Compare canonical hashes if a known-good client such as CloudMonkey succeeds with the same logical values.

## Rotate and Roll Back Safely

If a signer exposed credentials or URL tokens in debug output, treat them as compromised. Remove the logs from their distribution channel, rotate the affected CloudStack keys and source-URL token, and audit recent API events.

When replacing a production signer:

1. Keep the old client available but stop new mutating automation.
2. Validate the new signer with read-only calls and a disposable resource.
3. Compare responses and canonical hashes from fixed test vectors.
4. Move one workflow at a time.
5. On unexplained authentication failures, pause mutations and return to the known-good client while retaining logs.

Do not implement a fallback that sends an unsigned request, retries over HTTP, disables certificate validation, or places the secret key in the URL.

## Conclusion

Correct CloudStack signing requires separating logical values, canonical signing bytes, and transmitted form bytes. Encode a nested URL as one value, use `%20` for signing-time spaces, sort and lowercase the canonical string, retain original case in the request, and protect the result with verified HTTPS. Fixed test vectors and redacted canonical hashes make failures diagnosable without exposing credentials.

## Official Documentation

- [Apache CloudStack: Programmer Guide and Signing API Requests](https://docs.cloudstack.apache.org/en/latest/developersguide/dev.html)
- [Apache CloudStack: Provisioning and Authentication API](https://docs.cloudstack.apache.org/en/latest/adminguide/api.html)
- [Apache CloudStack: API Documentation](https://cloudstack.apache.org/api/)
- [Python: urllib.parse URL Parsing and Encoding](https://docs.python.org/3/library/urllib.parse.html)
- [Python: hmac Keyed-Hashing for Message Authentication](https://docs.python.org/3/library/hmac.html)
