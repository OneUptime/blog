# Validation Summary: How to Use Redis in R for Data Science Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- R
- redux R package (CRAN, v1.1.5)
- jsonlite R package
- R native serialize()/unserialize()

## Sources Consulted
- CRAN redux package page: https://cran.r-project.org/web/packages/redux/index.html
- GitHub repository: https://github.com/richfitz/redux
- redux hiredis() reference: https://richfitz.github.io/redux/reference/hiredis.html
- redux vignette (Using Redis with redux): https://cran.r-project.org/web/packages/redux/vignettes/redux.html
- redux low-level implementation vignette: https://richfitz.github.io/redux/articles/low_level.html
- redux generated API source: https://github.com/richfitz/redux/blob/master/R/redis_api_generated.R
- redux subscribe implementation: https://github.com/richfitz/redux/blob/master/R/redis_api.R

## Issues Found

### 1. Pub/Sub section used incorrect API (CRITICAL)
**What was wrong:** The code used `sub$SUBSCRIBE("model_updates")` (uppercase) followed by a `sub$receive()` loop. In redux, the uppercase `SUBSCRIBE` method is explicitly blocked and throws an error: "Do not use SUBSCRIBE(); see subscribe() instead (lower-case)". There is no `receive()` method on the redis_api object.

**What was changed:** Replaced with the correct lowercase `sub$subscribe()` method, which uses a callback-based API with `transform` (processes each message) and `terminate` (stops the subscription) parameters. The transform function receives a message object with `type`, `channel`, and `value` fields.

**Why:** The uppercase Redis command methods are auto-generated from Redis command definitions, but SUBSCRIBE is special-cased because it requires a blocking event loop that doesn't fit the standard request-response pattern. The redux package provides a dedicated lowercase `subscribe()` method with proper callback handling.

### 2. SADD called with multiple separate arguments instead of a vector
**What was wrong:** `r$SADD("features:enabled", "new_dashboard", "dark_mode", "export_csv")` passes three separate arguments, but the SADD method signature is `SADD(key, member)` — it only accepts two parameters.

**What was changed:** Changed to `r$SADD("features:enabled", c("new_dashboard", "dark_mode", "export_csv"))` which passes multiple members as a single character vector.

**Why:** The redux generated API defines SADD with exactly two parameters (key, member). Passing extra arguments would cause an R error about unused arguments. However, the member parameter accepts character vectors of any length, so wrapping in `c()` is the correct approach.

### 3. RediSearch tag removed
**What was wrong:** The post tags included "RediSearch" but the post does not cover RediSearch in any way.

**What was changed:** Removed "RediSearch" from the tags line.

**Why:** Misleading tag — the post covers basic Redis operations with the redux package, not the RediSearch module.

## Review Notes
- `r$EXISTS()` returns integer 1 or 0, not logical TRUE/FALSE. Using it directly in an `if` statement works because R treats non-zero integers as truthy, so the code is correct but readers should be aware of the return type.
- `r$GET()` after `r$INCR()` returns a character string (e.g., "10"), not an integer. The `cat()` call in the counter example displays correctly, but readers doing arithmetic with the result would need `as.integer(r$GET(...))`.
- The redux package requires the system-level hiredis C library to be installed, which is not mentioned in the installation section. This could cause `install.packages("redux")` to fail on systems without it.
- The redux package is maintained at `richfitz/redux` on GitHub (previously under ropensci). The CRAN version 1.1.5 was published 2025-09-01.
