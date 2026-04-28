# How to Use the OpenTofu Functions Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Function, HCL, Quick Reference, Infrastructure as Code

Description: A quick reference for the most commonly used OpenTofu built-in functions for strings, collections, encoding, and more.

## Introduction

OpenTofu provides a rich library of built-in functions for transforming values in expressions. This reference covers the most frequently used functions grouped by category.

## String Functions

```hcl
format("Hello, %s!", var.name)              # → "Hello, World!"
formatlist("item-%s", ["a","b","c"])        # → ["item-a", "item-b", "item-c"]
join("-", ["foo", "bar", "baz"])            # → "foo-bar-baz"
split(",", "a,b,c")                         # → ["a", "b", "c"]
trimspace("  hello  ")                      # → "hello"
lower("HELLO")                              # → "hello"
upper("hello")                              # → "HELLO"
title("hello world")                        # → "Hello World"
replace("hello world", "world", "tofu")    # → "hello tofu"
substr("hello world", 6, 5)                # → "world"
length("hello")                             # → 5
startswith("hello", "hel")                  # → true
endswith("hello", "llo")                    # → true
contains(["a","b","c"], "b")               # → true (for strings)
regex("^(\\w+)@", "user@example.com")      # captures: ["user"]
```

## Collection Functions

```hcl
length(["a","b","c"])                       # → 3
concat(["a","b"], ["c","d"])               # → ["a","b","c","d"]
flatten([["a","b"], ["c","d"]])             # → ["a","b","c","d"]
distinct(["a","b","a","c"])                # → ["a","b","c"]
compact(["a", "", "b", null, "c"])         # → ["a","b","c"]
reverse(["a","b","c"])                     # → ["c","b","a"]
sort(["c","a","b"])                         # → ["a","b","c"]
slice(["a","b","c","d"], 1, 3)             # → ["b","c"]
index(["a","b","c"], "b")                  # → 1
element(["a","b","c"], 1)                  # → "b"
toset(["a","b","a"])                       # → toset(["a","b"])
tolist(toset(["b","a"]))                   # → ["a","b"] (sorted)
```

## Map Functions

```hcl
keys({a=1, b=2})                           # → ["a","b"]
values({a=1, b=2})                         # → [1,2]
merge({a=1}, {b=2})                        # → {a=1, b=2}
lookup({a=1, b=2}, "a", 0)                # → 1 (0 is default)
contains(keys({a=1, b=2}), "a")           # → true (checks key)
zipmap(["a","b"], [1,2])                   # → {a=1, b=2}
```

## Type Conversion

```hcl
tostring(42)                               # → "42"
tonumber("42")                             # → 42
tobool("true")                             # → true
tolist(toset(["a","b"]))                   # → ["a","b"]
toset(["a","b","a"])                       # → toset(["a","b"])
tomap({a="1", b="2"})                      # → {a="1", b="2"}
```

## Encoding Functions

```hcl
base64encode("hello")                      # → "aGVsbG8="
base64decode("aGVsbG8=")                   # → "hello"
jsonencode({name = "test"})                # → "{\"name\":\"test\"}"
jsondecode("{\"name\":\"test\"}")          # → {name="test"}
yamlencode({name = "test"})                # → YAML string
yamldecode(file("config.yaml"))            # → parsed object
urlencode("hello world")                   # → "hello+world"
```

## File and Path Functions

```hcl
file("${path.module}/templates/policy.json")   # read file contents
templatefile("${path.module}/user_data.sh", {  # render template
  app_name = var.app_name
})
filebase64("${path.module}/cert.pem")           # base64-encode file
basename("/path/to/file.txt")                   # → "file.txt"
dirname("/path/to/file.txt")                    # → "/path/to"
abspath(path.module)                            # absolute path
pathexpand("~/config")                          # expand ~
```

## Date and Time

```hcl
timestamp()                                # current time: "2026-03-20T10:30:00Z"
formatdate("YYYY-MM-DD", timestamp())      # → "2026-03-20"
timeadd(timestamp(), "24h")                # add 24 hours
```

## Numeric Functions

```hcl
min(5, 3, 8)                               # → 3
max(5, 3, 8)                               # → 8
abs(-5)                                    # → 5
ceil(1.2)                                  # → 2
floor(1.9)                                 # → 1
pow(2, 10)                                 # → 1024
```

## Summary

OpenTofu's built-in functions handle the most common data transformation tasks without requiring external tools. Use `tofu console` to test function calls interactively: type `format("Hello, %s!", "world")` at the prompt to see the result immediately. The most frequently used functions are `format`, `merge`, `flatten`, `jsonencode`, `lookup`, `concat`, and the encoding functions for base64 and JSON.
