# How to Fix Terraform Function Argument Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Functions

Description: Resolve Terraform function argument errors including wrong argument counts, type mismatches, and common mistakes with built-in functions.

---

Terraform has a rich set of built-in functions for string manipulation, numeric operations, collection transformations, and more. When you pass the wrong number of arguments, the wrong type, or misuse a function, Terraform throws an argument error. These errors are usually straightforward once you understand what the function actually expects.

## What the Error Looks Like

Function argument errors typically look like this:

```text
Error: Error in function call

  on main.tf line 5, in locals:
   5:   result = join(var.items)

Call to function "join" failed: missing value for "lists" parameter.
```

Or:

```text
Error: Invalid function argument

  on main.tf line 8, in resource "aws_instance" "web":
   8:   count = max(var.min_count, "five")

Invalid value for "b" parameter: a number is required.
```

Let us go through the most frequent function argument mistakes.

## Fix 1: Wrong Number of Arguments

Every function has a defined number of required and optional parameters. Passing too few or too many causes an error.

```hcl
# join() requires exactly 2 arguments: separator and list
# Wrong - missing separator
locals {
  result = join(["a", "b", "c"])
}

# Right
locals {
  result = join(", ", ["a", "b", "c"])
}
```

```hcl
# lookup() takes 2 or 3 arguments: map, key, and optional default
# Wrong - too many arguments
locals {
  value = lookup(var.config, "key", "default", "extra")
}

# Right
locals {
  value = lookup(var.config, "key", "default")
}
```

When you are unsure about a function's signature, check the [Terraform documentation](https://developer.hashicorp.com/terraform/language/functions). Every function page lists its exact parameters.

## Fix 2: Type Mismatches in Function Arguments

Functions expect specific types for each argument. Passing the wrong type is a common mistake.

```hcl
# length() works on strings, lists, and maps
# Wrong - passing a number
locals {
  len = length(42)
}

# Right - pass a collection or string
locals {
  len = length(var.subnet_ids)  # list
  str_len = length("hello")     # string
}
```

```hcl
# element() expects a list and an index
# Wrong - passing a map
locals {
  item = element(var.tags, 0)  # tags is a map, not a list
}

# Right - use a list
locals {
  item = element(var.subnet_ids, 0)
}
```

Numeric functions like `max()`, `min()`, `ceil()`, and `floor()` require numeric arguments:

```hcl
# Wrong - string arguments
locals {
  biggest = max("10", "20")
}

# Right - numeric arguments
locals {
  biggest = max(10, 20)
}

# If you have strings, convert them first
locals {
  biggest = max(tonumber("10"), tonumber("20"))
}
```

## Fix 3: Null Arguments

Passing `null` to functions that do not accept it causes errors:

```hcl
# Wrong - join cannot handle null
locals {
  result = join(", ", null)
}

# Right - provide a fallback
locals {
  result = join(", ", coalesce(var.items, []))
}
```

The `coalesce()` and `coalescelist()` functions are your friends for handling potential null values:

```hcl
locals {
  # Returns the first non-null, non-empty value
  name = coalesce(var.custom_name, var.default_name, "fallback")

  # Same but for lists
  ids = coalescelist(var.custom_ids, var.default_ids, ["default-id"])
}
```

## Fix 4: regex() and regexall() Errors

Regular expression functions are particularly error-prone because invalid regex patterns cause runtime errors:

```text
Error: Error in function call

Call to function "regex" failed: invalid regexp pattern: error parsing
regexp: missing closing ): `(unclosed`
```

```hcl
# Wrong - invalid regex
locals {
  match = regex("(unclosed", var.input)
}

# Right - valid regex with proper escaping
locals {
  match = regex("\\(literal\\)", var.input)
}

# Also wrong - regex returns an error if no match is found
# Use can() to handle this
locals {
  match = can(regex("^[a-z]+$", var.input)) ? regex("^[a-z]+$", var.input) : "default"
}
```

A safer pattern is to use `try()`:

```hcl
locals {
  match = try(regex("^([a-z]+)-([0-9]+)$", var.name), ["unknown", "0"])
}
```

## Fix 5: format() and formatlist() Verbs

The `format()` function uses Go's fmt verbs. Using the wrong verb for the data type causes errors:

```hcl
# Wrong - %d expects an integer, got a string
locals {
  msg = format("Count: %d", "not-a-number")
}

# Right - use %s for strings, %d for integers, %f for floats
locals {
  msg  = format("Name: %s, Count: %d, Ratio: %.2f", "web", 3, 0.75)
}
```

`formatlist()` works on lists but has the same verb requirements:

```hcl
# Creates a list of formatted strings
locals {
  arn_list = formatlist("arn:aws:s3:::%s/*", var.bucket_names)
}
```

## Fix 6: cidrsubnet() and cidrhost() Arithmetic Errors

Network functions are finicky about their numeric arguments:

```hcl
# cidrsubnet(prefix, newbits, netnum)
# Wrong - newbits makes the prefix too long (> 32 for IPv4)
locals {
  subnet = cidrsubnet("10.0.0.0/24", 16, 0)
  # 24 + 16 = 40 bits, which exceeds 32
}

# Right - keep total bits <= 32 for IPv4
locals {
  subnet = cidrsubnet("10.0.0.0/16", 8, 1)
  # 16 + 8 = 24, result: "10.0.1.0/24"
}
```

```hcl
# cidrhost() - netnum must not exceed the available host range
# Wrong - requesting host 300 in a /24 (only 254 usable hosts)
locals {
  host = cidrhost("10.0.1.0/24", 300)
}

# Right
locals {
  host = cidrhost("10.0.1.0/24", 10)
  # Result: "10.0.1.10"
}
```

## Fix 7: file() and fileexists() Path Issues

The `file()` function reads a file at plan time. If the file does not exist, you get an error:

```text
Error: Error in function call

Call to function "file" failed: no file exists at "config.json".
```

```hcl
# Wrong - relative to working directory
locals {
  config = file("config.json")
}

# Right - relative to the module
locals {
  config = file("${path.module}/config.json")
}

# Defensive - check if file exists first
locals {
  config = fileexists("${path.module}/config.json") ? file("${path.module}/config.json") : "{}"
}
```

## Fix 8: try() and can() for Graceful Error Handling

These two functions are essential for handling potential argument errors gracefully:

```hcl
# try() returns the first expression that does not produce an error
locals {
  instance_type = try(var.config.instance_type, "t3.micro")
  port          = try(tonumber(var.port_string), 8080)
}

# can() returns true/false based on whether the expression succeeds
locals {
  is_valid_cidr = can(cidrhost(var.cidr_block, 0))
  is_numeric    = can(tonumber(var.input))
}
```

Use `try()` as your go-to function for providing fallback values when other functions might fail.

## Fix 9: Splat Expressions vs Function Arguments

People sometimes confuse splat syntax with function calls:

```hcl
# This is a splat expression, not a function
locals {
  instance_ids = aws_instance.web[*].id
}

# Do not try to call it like a function
# Wrong
locals {
  instance_ids = aws_instance.web(*.id)
}
```

When passing splat results to functions, the type is a list:

```hcl
locals {
  # join works on the list produced by the splat
  id_string = join(",", aws_instance.web[*].id)
  count     = length(aws_instance.web[*].id)
}
```

## Common Function Quick Reference

Here is a cheat sheet for frequently misused functions:

| Function | Arguments | Common Mistake |
|----------|-----------|----------------|
| `join(sep, list)` | 2 | Forgetting the separator |
| `split(sep, string)` | 2 | Swapping argument order |
| `lookup(map, key, default)` | 2-3 | Passing a list instead of map |
| `element(list, index)` | 2 | Index out of bounds (use modulo) |
| `coalesce(vals...)` | 1+ | Passing empty string (not the same as null) |
| `format(spec, vals...)` | 1+ | Wrong format verb for the type |
| `replace(string, substr, replacement)` | 3 | Forgetting it uses regex by default |
| `flatten(list)` | 1 | Passing a non-nested list |

## Conclusion

Function argument errors in Terraform are almost always caused by wrong argument count, wrong argument type, or null values sneaking through. Check the function documentation for the exact signature, use `try()` and `can()` for defensive coding, and remember that `terraform console` is your best friend for testing function calls interactively before putting them in your configuration.
