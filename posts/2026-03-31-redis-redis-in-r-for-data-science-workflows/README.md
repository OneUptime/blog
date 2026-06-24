# How to Use Redis in R for Data Science Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, R, Data Science, Caching, RediSearch

Description: Learn how to use Redis in R with the redux package to cache model outputs, share data between processes, and speed up expensive computations.

---

Redis is useful in data science workflows for caching expensive computations, sharing data between R processes, and storing intermediate results. The `redux` package provides a clean R interface.

## Installation

```r
install.packages("redux")
```

## Connecting

```r
library(redux)

r <- hiredis(host = "127.0.0.1", port = 6379)
cat("Connected to Redis\n")
```

## Basic Key-Value Operations

```r
# SET and GET
r$SET("experiment:1:status", "running")
status <- r$GET("experiment:1:status")
cat("Status:", status, "\n")

# Key with expiry
r$SETEX("cache:user:42", 300, "Alice")

# Check if key exists
if (r$EXISTS("cache:user:42")) {
  cat("User is cached\n")
}

# Delete
r$DEL("experiment:1:status")
```

## Caching Expensive R Computations

```r
library(redux)
library(jsonlite)

r <- hiredis()

cache_model_result <- function(r, model_id, compute_fn) {
  key <- paste0("model:result:", model_id)
  cached <- r$GET(key)

  if (!is.null(cached)) {
    cat("Cache hit for", model_id, "\n")
    return(fromJSON(cached))
  }

  cat("Computing", model_id, "...\n")
  result <- compute_fn()
  r$SETEX(key, 3600, toJSON(result, auto_unbox = TRUE))
  result
}

# Example: cache a slow summary computation
result <- cache_model_result(r, "summary_v1", function() {
  Sys.sleep(2)  # simulate expensive work
  list(mean = 4.5, sd = 1.2, n = 1000)
})
print(result)
```

## Storing R Objects with Serialization

For complex R objects (data frames, models), serialize with `serialize()`:

```r
df <- data.frame(x = 1:5, y = c(2.1, 3.4, 1.9, 5.2, 4.8))
raw_bytes <- serialize(df, NULL)
r$SET("dataset:v1", raw_bytes)

# Retrieve
retrieved_bytes <- r$GET("dataset:v1")
df_back <- unserialize(retrieved_bytes)
print(df_back)
```

## Incrementing Counters

```r
r$SET("model:runs", 0)
for (i in 1:10) {
  r$INCR("model:runs")
}
cat("Total runs:", r$GET("model:runs"), "\n")  # 10
```

## Pub/Sub for Multi-Process Communication

R supports multi-processing via `parallel`. Use Redis Pub/Sub to coordinate:

```r
# In worker process
subscribe_to_channel <- function() {
  sub <- hiredis()
  sub$subscribe("model_updates",
    transform = function(x) {
      cat("Update received:", x$value, "\n")
      x$value
    },
    terminate = function(x) identical(x, "STOP")
  )
}

# In main process - publish when model finishes
r$PUBLISH("model_updates", paste("Model trained at", Sys.time()))
```

## Using Sets for Feature Flags

```r
# Add feature flags
r$SADD("features:enabled", c("new_dashboard", "dark_mode", "export_csv"))

# Check if a feature is enabled
if (r$SISMEMBER("features:enabled", "dark_mode") == 1) {
  cat("Dark mode is ON\n")
}
```

## Summary

The `redux` package makes Redis accessible in R with a direct command mapping. Use `SET`/`SETEX` with `jsonlite` for caching data frames and model outputs, `serialize()`/`unserialize()` for complex R objects, and `INCR` for tracking experiment run counts. Redis excels as a shared cache in multi-process R workflows using `parallel` or Plumber APIs.
