# How to Introduce Keyed PAN Hashing While Handling Legacy Hashes Under PCI DSS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Cryptography, Data Security

Description: Introduce keyed hashing of the entire PAN, distinguish legacy hashes from active hashing processes, and plan migration, key management, and lookup retirement.

---

A keyed PAN-hashing migration has two separate problems: changing how new values are produced, and deciding what to do with records that were hashed before the new requirement became effective. Mixing those problems often leads to an unnecessary attempt to recover PAN from an intentionally irreversible value.

Start with a dated inventory of hashing processes and stored formats. Include batch imports, retry workers, reconciliation jobs, backups, and disaster-recovery deployments as well as the primary payment service.

## Separate legacy records from current processing

[PCI SSC FAQ 1573](https://www.pcisecuritystandards.org/faqs/1573/) says the keyed-hashing requirement does not apply retrospectively to previously hashed PANs. It also says that after 31 March 2025, every hashing process used to render PAN unreadable must meet the keyed cryptographic hashing requirements.

That date has passed. An old database table is not authorization to keep producing new unkeyed PAN hashes. Record when each legacy population was created and how you know the old producer stopped. If a post-cutover matching job still calculates an unkeyed PAN hash, include that process in the assessment rather than assuming “read-only migration” makes its cryptography irrelevant.

Keep retention and correlation controls for legacy records. The FAQ does not turn historic hashes into harmless data or authorize indefinite retention.

## Define a versioned format

Requirement 3.5.1.1 calls for keyed cryptographic hashing of the entire PAN with associated key management under Requirements 3.6 and 3.7. The [PCI SSC glossary](https://www.pcisecuritystandards.org/glossary/) includes HMAC among appropriate constructions, with an effective strength of at least 128 bits.

A record format might contain:

```json
{
  "format": "pan-hmac-sha256-v1",
  "key_id": "pan-match-2026-01",
  "digest": "hex-encoded-output",
  "created_at": "2026-09-25T09:00:00Z"
}
```

The key identifier is metadata, not the secret. Keep the secret under a managed key lifecycle with restricted use, protected distribution or a cryptographic service interface, rotation procedures, and compromise response. A constant embedded in application source is not an adequate key-management design.

Define one canonical PAN representation before hashing. Preserve every digit, including any leading zero, and reject unexpected input. Never convert PAN to an integer. If one producer hashes spaces and another removes them, identical accounts can receive different identifiers.

## Keep the cryptographic example narrow

This example demonstrates Python's HMAC interface using a synthetic value and an ephemeral test key:

```python
import hmac
import secrets


def pan_digest(pan: str, key: bytes) -> str:
    if not pan.isascii() or not pan.isdecimal():
        raise ValueError("Expected ASCII digits")
    if not 8 <= len(pan) <= 19:
        raise ValueError("Unexpected PAN length")
    return hmac.digest(key, pan.encode("ascii"), "sha256").hex()


test_key = secrets.token_bytes(32)
test_pan = "4111111111111111"  # Synthetic test data only.
assert pan_digest(test_pan, test_key) == pan_digest(test_pan, test_key)
assert pan_digest(test_pan, test_key) != pan_digest(test_pan, secrets.token_bytes(32))
```

The [Python HMAC documentation](https://docs.python.org/3/library/hmac.html) defines the API. This demonstration does not provide production key storage, PAN validation, access controls, or a compliant cryptographic boundary. Production input validation must match the accepted payment data and integration requirements.

## Choose a migration path based on available data

Where an authorized system still legitimately holds the original PAN, a controlled migration can compute the new digest from that PAN. Keep the operation inside its approved data boundary, restrict the job identity, and suppress payload logging. Compare record counts and business matches with synthetic and authorized test cases.

Where only the old hash exists, the original PAN cannot be recovered by a legitimate one-way transformation. Applying HMAC to the old digest creates a keyed value of that digest; it is not the specified keyed hash of the entire PAN. Document that distinction explicitly.

Possible business designs include retaining an identified legacy population until its approved deletion date, obtaining new values during a legitimate future transaction, or replacing matching with a processor-provided reference. Review the chosen design and any ongoing legacy lookup with the assessment owner.

## Plan rotation before enabling writes

Deterministic digests change when the key changes. Decide whether matching spans multiple authorized key versions, whether records can be rederived, and when old matching keys can be retired. Do not destroy a key while a required reconciliation process still depends on it, and do not keep old keys without an owner and lifecycle decision.

Hashing is also not an automatic scope exemption. [FAQ 1089](https://www.pcisecuritystandards.org/faqs/1089/) distinguishes the in-scope hashing process and environment from appropriately separated environments receiving its results. Document the actual architecture, permissions, and separation.

Verify the cutover by inspecting newly produced records, replay and restore paths, rejected old-format writes, key-use logs, and retention deletions. Preserve evidence of what changed and when so a future restore cannot silently resurrect the obsolete producer.
