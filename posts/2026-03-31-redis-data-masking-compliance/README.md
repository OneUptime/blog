# How to Implement Redis Data Masking for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Masking, Compliance, PII, Security

Description: Learn how to mask sensitive data before storing it in Redis, protecting PII and confidential fields from exposure in logs, monitoring tools, and unauthorized access.

---

Data masking ensures that sensitive fields like email addresses, phone numbers, and payment card numbers are obfuscated before they are stored or displayed. When Redis stores session data or user objects, masking prevents sensitive data from appearing in Redis CLI output, slow logs, monitoring dashboards, and unauthorized reads.

## Why Mask Data in Redis?

Storing raw PII in Redis creates several risks:
- Redis slow logs expose key names and values
- `MONITOR` command shows all commands in real time
- Keyspace notifications can leak data
- Anyone with Redis access can `GET` any key

## Strategy 1: Mask Before Storage

The most reliable approach: never store sensitive data unmasked.

```python
import re
import hashlib

def mask_email(email: str) -> str:
    """Mask email: u***@example.com"""
    local, domain = email.split('@')
    masked_local = local[0] + '***' if len(local) > 1 else '***'
    return f"{masked_local}@{domain}"

def mask_phone(phone: str) -> str:
    """Keep last 4 digits: ***-***-4321"""
    digits = re.sub(r'\D', '', phone)
    return f"***-***-{digits[-4:]}"

def mask_card(card_number: str) -> str:
    """PCI-compliant masking: ****-****-****-4321"""
    digits = re.sub(r'\D', '', card_number)
    return f"****-****-****-{digits[-4:]}"

def pseudonymize(value: str, salt: str = "app-secret") -> str:
    """One-way pseudonymization for lookups."""
    return hashlib.sha256(f"{salt}:{value}".encode()).hexdigest()[:16]
```

Store masked data in Redis:

```python
import redis
import json

r = redis.Redis(host='localhost', decode_responses=True)

def store_user_session(session_id: str, user: dict) -> None:
    safe_data = {
        "user_id": user["id"],
        "email_masked": mask_email(user["email"]),
        "phone_masked": mask_phone(user["phone"]),
        "name": user["name"],  # Assumed non-sensitive
        "role": user["role"],
    }
    r.set(f"session:{session_id}", json.dumps(safe_data), ex=3600)
```

## Strategy 2: Application-Level Encryption

For fields that need to be retrieved in full by authorized services, use field-level encryption:

```python
from cryptography.fernet import Fernet
import os

class RedisEncryption:
    def __init__(self, key: bytes):
        self.fernet = Fernet(key)

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self.fernet.decrypt(encrypted.encode()).decode()

# Generate key and store in secrets manager (not in code)
# key = Fernet.generate_key()

enc = RedisEncryption(key=os.getenv("REDIS_ENCRYPTION_KEY").encode())

# Store encrypted
r.hset("user:profile:123", mapping={
    "name": "Alice Smith",
    "email": enc.encrypt("alice@example.com"),
    "phone": enc.encrypt("+1-555-123-4567"),
})

# Retrieve and decrypt
profile = r.hgetall("user:profile:123")
email = enc.decrypt(profile["email"])
```

## Strategy 3: Tokenization

Replace sensitive values with opaque tokens that map to the real data in a secure store:

```python
import uuid

def tokenize_and_store(value: str, r: redis.Redis, ttl: int = 3600) -> str:
    """Store value mapped to a token. Return token."""
    token = str(uuid.uuid4())
    # Store mapping in Redis with TTL
    r.set(f"token:{token}", value, ex=ttl)
    return token

def detokenize(token: str, r: redis.Redis) -> str | None:
    """Retrieve original value from token."""
    return r.get(f"token:{token}")

# In your session handler:
card_token = tokenize_and_store("4111111111111111", r, ttl=1800)
session_data = {
    "user_id": 123,
    "card_token": card_token  # Store only the token
}
```

## Verifying No Raw PII Is Stored

Run a compliance scan on Redis keys:

```python
import re
import redis

EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
CARD_PATTERN = re.compile(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b')

r = redis.Redis(host='localhost', decode_responses=True)

violations = []
for key in r.scan_iter("session:*"):
    value = r.get(key)
    if value and EMAIL_PATTERN.search(value):
        violations.append(f"Potential raw email in key: {key}")
    if value and CARD_PATTERN.search(value):
        violations.append(f"Potential card number in key: {key}")

for v in violations:
    print(f"VIOLATION: {v}")
```

## Summary

Redis data masking for compliance should happen at the application layer before data reaches Redis. Use masking for display purposes, encryption when full retrieval is needed by authorized parties, and tokenization when you need opaque references. Combine these with regular compliance scans to detect any raw PII stored by oversight.
