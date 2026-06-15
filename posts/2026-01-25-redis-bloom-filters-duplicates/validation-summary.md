# Validation Summary: How to Filter Duplicates with Redis Bloom Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- RedisBloom / Redis probabilistic data structures
- Bloom filters
- Redis CLI
- Docker
- Python
- redis-py
- URL normalization

## Sources Consulted
- Redis Bloom filter data type documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- Redis BF.RESERVE command documentation: https://redis.io/docs/latest/commands/bf.reserve/
- Redis BF.ADD command documentation: https://redis.io/docs/latest/commands/bf.add/
- Redis BF.MADD command documentation: https://redis.io/docs/latest/commands/bf.madd/
- Redis BF.EXISTS command documentation: https://redis.io/docs/latest/commands/bf.exists/
- Redis BF.MEXISTS command documentation: https://redis.io/docs/latest/commands/bf.mexists/
- Redis BF.INFO command documentation: https://redis.io/docs/latest/commands/bf.info/
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/
- RedisBloom project documentation: https://github.com/RedisBloom/RedisBloom
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html
- Python urllib.parse documentation: https://docs.python.org/3/library/urllib.parse.html
- RFC 3986 URI normalization guidance: https://datatracker.ietf.org/doc/html/rfc3986

## Issues Found
- Updated RedisBloom setup wording. The original text described RedisBloom only as a standalone Redis module and suggested compiling it from source for production. Current Redis documentation states that Redis 8 includes these probabilistic data structures, while Redis Stack 7.x still provides them through Redis Stack images. The post now distinguishes Redis 8, Redis Enterprise, and Redis Stack 7.x.
- Fixed the redis-py connection pool example. The original code passed both direct connection parameters and a `ConnectionPool` to `redis.Redis`; the corrected code puts the connection settings, including `decode_responses`, on the pool and passes the pool to the client.
- Fixed same-batch email duplicate detection. The original `process_email_batch` example checked `BF.MEXISTS` before adding any batch items, so two identical new emails in the same batch would both be returned as new. The code now tracks fingerprints already accepted within the current batch.
- Fixed URL normalization behavior. The original crawler code lowercased the entire URL, which can incorrectly merge distinct paths or query values because RFC 3986 only treats scheme and host as generally case-insensitive. The code now lowercases only scheme and host, removes default HTTP/HTTPS ports, preserves path/query case, and treats malformed or unsupported URLs as invalid.
- Removed an unused `urljoin` import from the URL tracking example.

## Review Notes
The Redis Bloom command examples and return-value descriptions are consistent with the current Redis command documentation. The memory table is an approximation based on standard Bloom filter sizing and is reasonable for educational guidance, though actual Redis memory usage can vary because of metadata, scaling sub-filters, allocator behavior, and implementation details.
