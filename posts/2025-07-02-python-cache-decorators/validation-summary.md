# Validation Summary: How to Build Cache Decorators in Python

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Python (3.9+ features noted)
- `functools` (`lru_cache`, `cache`)
- Decorators / closures
- `collections.OrderedDict`, `threading.Lock`
- `hashlib`, `pickle`, `json` for cache-key generation
- Redis (`redis-py`, sync and `redis.asyncio`)
- `asyncio`
- `dataclasses`
- Prometheus client (`prometheus_client`)

## Sources Consulted
- Python `functools` docs — `lru_cache`, `cache`, `cache_info`, `cache_clear`, `__wrapped__` (https://docs.python.org/3/library/functools.html)
- Python `hash()` / object hashing & PYTHONHASHSEED randomization (https://docs.python.org/3/reference/datamodel.html#object.__hash__ and https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED)
- redis-py docs — `from_url`, `get`, `setex`, `delete`, and `redis.asyncio` (https://redis.readthedocs.io/en/stable/)
- prometheus_client docs — `Counter`, `Gauge`, `Histogram`, `labels`, `observe` (https://prometheus.github.io/client_python/)
- Local verification with `python3` (hash randomization across processes; `json.loads` on bytes; `hashlib.md5` key stability)

## Issues Found
- **Unstable cache keys in the Redis decorators (correctness bug for the stated use case).** Both `RedisCacheDecorator._build_key` and `AsyncRedisCacheDecorator._build_key` used Python's built-in `hash(args_str)` to derive the cache key. `hash()` of a `str` is randomized per process via `PYTHONHASHSEED`, so two application servers (or even the same server after a restart) would compute *different* keys for identical arguments — defeating the post's explicit goal of a cache "shared across multiple processes and servers." Verified empirically that `hash('test')` differs across processes. Fixed by switching both methods to a stable digest (`hashlib.md5(args_str.encode()).hexdigest()`) and added `import hashlib` to both code blocks, with a comment explaining why a stable hash is required. The in-memory decorators that use `hash(...)` were left unchanged, since they live in a single process where randomization is irrelevant.

## Review Notes
- The code comment "Get the underlying unwrapped function (Python 3.8+)" for `lru_cache.__wrapped__` understates availability — `__wrapped__` has been set on `lru_cache` wrappers well before 3.8. Left as-is since it is a non-misleading comment and the exact historical version was not worth asserting incorrectly; not a functional error.
- Several snippets annotate containers with the built-in `any` (e.g., `Dict[str, any]`, `value: any`) instead of `typing.Any`. This runs without error (the annotation is accepted at runtime) but a static type checker would flag it. Cosmetic/typing-hygiene only; left unchanged to avoid stylistic edits.
- Minor unused names exist in a couple of snippets (`field` imported in the metrics example, `e` in `except Exception as e`). Harmless; not corrected.
- The Redis decorators require function return values (and `setex` values) to be JSON-serializable, which is implied by the `json.dumps(result)` storage path. This is a reasonable constraint for a tutorial and is consistent throughout.
- `lru_cache` output `CacheInfo(hits=1, misses=1, maxsize=128, currsize=1)`, the `functools.cache` (3.9+) alias claim, `setex(name, time, value)` argument order, `json.loads` on `bytes`, and the Prometheus metric/label usage were all verified as correct.
