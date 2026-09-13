# Reject Idempotency Key Reuse with a Different Payload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, API Design, Python, JSON, Security

Description: Build versioned request fingerprints that detect changed business inputs without confusing JSON formatting, retries, or distinct operations with duplicates.

---

A client creates a transfer with key `transfer-91`, then accidentally retries that key with a different amount. Replaying the first result would hide the client bug. Executing the second request would violate the key's meaning. The server should recognize that the key has already been associated with different input and reject the reuse.

A request fingerprint provides that comparison. It records what the operation meant when the key was first claimed. The key identifies the intended operation; the fingerprint checks that subsequent requests still describe it.

## Hash a defined input model

Raw request bytes distinguish these two bodies:

```json
{"amount_minor":1250,"currency":"USD","destination":"acct_7"}
```

```json
{ "destination": "acct_7", "currency": "USD", "amount_minor": 1250 }
```

For an ordinary JSON API, that distinction is probably unwanted. Parse and validate the request first, then construct a deterministic representation of the fields that control the effect.

For this transfer endpoint, define these rules explicitly:

- `amount_minor` is an integer, not a float, string, or boolean.
- `currency` is exactly an accepted uppercase currency code.
- `destination` is the validated destination identifier.
- Unknown members are rejected rather than silently excluded.
- Tenant and logical operation are included from trusted server context.
- Trace IDs, authorization tokens, and retry counters are excluded.

This is a proposed application contract. Other endpoints may accept equivalent currency casing or apply defaults. If they do, fingerprint the validated result of those rules and keep those rules stable for the retry window.

## Reject ambiguous JSON before computing a digest

Python's decoder accepts repeated member names by default and keeps the final value. Its decoder also has configurable handling for nonstandard numeric constants. The [Python JSON documentation](https://docs.python.org/3/library/json.html) describes both behaviors.

An API should not let a gateway, validator, and fingerprint implementation disagree about which value a repeated field means. Here is a deliberately narrow, executable implementation for the transfer model:

```python
import hashlib
import json

def unique_members(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON member: {key}')
        result[key] = value
    return result

def reject_constant(value):
    raise ValueError(f'nonstandard JSON constant: {value}')

def fingerprint(raw_body: bytes, tenant_id: str) -> str:
    body = json.loads(
        raw_body,
        object_pairs_hook=unique_members,
        parse_constant=reject_constant,
    )
    expected = {'amount_minor', 'currency', 'destination'}
    if not isinstance(body, dict) or set(body) != expected:
        raise ValueError('unexpected or missing fields')
    amount = body['amount_minor']
    if type(amount) is not int or not 0 < amount <= 10**12:
        raise ValueError('invalid amount_minor')
    currency = body['currency']
    if not isinstance(currency, str) or currency not in {'USD', 'GBP', 'EUR'}:
        raise ValueError('unsupported currency')
    destination = body['destination']
    if not isinstance(destination, str) or not destination.startswith('acct_'):
        raise ValueError('invalid destination')
    if not 6 <= len(destination) <= 128 or not destination.isascii():
        raise ValueError('invalid destination')

    envelope = {
        'fingerprint_version': 1,
        'operation': 'transfers.create',
        'tenant_id': tenant_id,
        'input': body,
    }
    canonical = json.dumps(
        envelope, sort_keys=True, separators=(',', ':'),
        ensure_ascii=True, allow_nan=False,
    ).encode('ascii')
    return hashlib.sha256(canonical).hexdigest()
```

Authenticate the tenant separately, enforce body-size limits before parsing, and verify that the caller may transfer to the destination. A fingerprint is neither authorization nor a signature. The standard library's [SHA-256 interface](https://docs.python.org/3/library/hashlib.html) produces the digest; it does not define business equivalence.

## Do not label sorted JSON as universal canonical JSON

This implementation defines a specific representation for one restricted input schema. It does not implement the JSON Canonicalization Scheme. [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) specifies additional rules, including number serialization and property ordering, that matter across languages.

If several languages must independently compute the same fingerprint, use a reviewed implementation of the same canonicalization standard or share test vectors for an explicitly restricted format. Treat decimal money values carefully. Integer minor units or validated decimal strings avoid accidental binary floating-point equivalence decisions.

Arrays normally preserve order. Missing and `null` values are not automatically interchangeable. Unicode normalization is also a business decision: two visually similar identifiers must not be merged merely because a hashing helper considers that convenient.

## Compare only after establishing scoped ownership

Persist the fingerprint version and digest beside the unique tuple `(tenant_id, operation, key)`. The first transaction claims that tuple and stores its digest atomically with the business result.

When the claim conflicts, read the existing digest and compare before returning any saved body. If the values differ, return a stable error such as:

```json
{
  "code": "idempotency_payload_mismatch",
  "message": "This key was already used with different operation inputs."
}
```

Do not overwrite the original digest. It is evidence of the request that won the claim. Do not reveal the original amount or destination in a mismatch response; diagnostic detail should remain within the caller's current authorization.

If the first operation is still executing, wait or report pending according to the endpoint contract. A fingerprint match does not itself grant permission to start another execution.

## Version the comparison through deployments

Suppose version 2 introduces a `fee_mode` default. A retry from yesterday must still be compared with the meaning accepted yesterday. Store `fingerprint_version` and retain the corresponding parser and normalization logic while those records remain replayable.

Changing a hash algorithm or serializer without recording its version can turn every retry into a false mismatch. Conversely, dropping a field from the representation can accept requests that should differ. Make migration cases part of the deployment review.

## Test semantic differences deliberately

Verify equal digests for member reordering and whitespace changes. Verify different digests for changes to amount, destination, tenant, and currency. Ensure repeated members, booleans as amounts, floats, unsupported members, and nonstandard constants are rejected.

Use two distinct keys with the same valid payload as a separate test. They represent two operations unless an independent business invariant forbids the second. Never replace client operation keys with payload digests merely to improve a duplicate metric.

## Conclusion

A useful fingerprint is a versioned definition of business input, followed by deterministic encoding and hashing. Preserve the original comparison data, reject unsafe reuse, and keep identity separate from equality. That makes a retry predictable without collapsing legitimate repeated operations.

## Official Documentation

- [Python JSON encoder and decoder](https://docs.python.org/3/library/json.html)
- [Python hashlib](https://docs.python.org/3/library/hashlib.html)
- [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
