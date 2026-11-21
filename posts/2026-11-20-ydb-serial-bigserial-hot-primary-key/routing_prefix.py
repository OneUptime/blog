import hashlib


def routing_prefix(request_key: str) -> int:
    if not request_key:
        raise ValueError('An immutable request key is required')
    digest = hashlib.sha256(request_key.encode('utf-8')).digest()
    return int.from_bytes(digest[:8], byteorder='big', signed=False)
