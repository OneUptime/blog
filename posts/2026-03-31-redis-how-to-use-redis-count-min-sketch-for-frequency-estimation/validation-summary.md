# Validation Summary: How to Use Redis Count-Min Sketch for Frequency Estimation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom module / Count-Min Sketch data structure)
- Python (redis-py client library)
- FastAPI (web framework used in example)

## Sources Consulted
- Redis CMS command documentation (https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/)
- redis-py source code for CMS methods (`redis/commands/bf/commands.py`) — verified method signatures for `initbyprob`, `incrby`, `query`, `info`, and `merge`
- redis-py `CMSInfo` class (`redis/commands/bf/info.py`) — verified `.width`, `.depth`, `.count` attributes

## Issues Found

### 1. Incorrect `CMS.INITBYPROB` probability parameter value (Critical)
- **What was wrong:** The blog used `0.999` as the second parameter and described it as "confidence". The `CMS.INITBYPROB` second parameter is `probability` — the desired probability of an inflated count (i.e., the failure probability). It should be a small number. Using `0.999` means a 99.9% chance of exceeding the error bound, resulting in only `depth=1` (one hash function), which makes the sketch nearly useless.
- **What was changed:** Changed `0.999` to `0.01` in the bash example and updated the comment. Renamed the Python `init_sketch` parameter from `confidence` to `probability` with a default of `0.01`. Updated the FastAPI startup call accordingly.
- **Why:** The parameter name and value were semantically inverted. A small probability (e.g., 0.01) gives high confidence (99%).

### 2. Incorrect `incrby` API usage (Critical)
- **What was wrong:** The blog passed a dictionary `{event: count}` to `r.cms().incrby()`. The redis-py `incrby` method signature is `incrby(key, items, increments)` where `items` is a list of strings and `increments` is a list of integers — two separate lists, not a dict.
- **What was changed:** Fixed all three `incrby` call sites:
  - `track_event`: Changed from `{event: count}` to `[event], [count]`
  - `batch_track`: Added conversion of the dict to separate `items` and `increments` lists
  - `process_search_query`: Added conversion of `Counter` to separate lists
- **Why:** Passing a dict would cause a TypeError at runtime.

## Review Notes
- The `@app.on_event("startup")` decorator in the FastAPI example is deprecated in favor of the lifespan context manager pattern in newer FastAPI versions. It still works but may be removed in a future release.
- The `start = time.time()` variable in the middleware is assigned but never used (the elapsed time is never calculated or logged).
- The `CMS.MERGE` usage via `r.execute_command()` is correct but could also use `r.cms().merge(destination, len(sources), sources)` for consistency with the rest of the code.
- The `CMSInfo` attributes (`.width`, `.depth`, `.count`) in the `sketch_info` function are correct.
