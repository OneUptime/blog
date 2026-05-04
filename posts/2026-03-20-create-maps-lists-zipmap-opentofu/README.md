# How to Create Maps and Lists with zipmap in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Zipmap, Map, List, Data Transformation

Description: Learn how to use OpenTofu's zipmap, tomap, and list manipulation functions to construct and transform data structures in HCL.

---

OpenTofu's `zipmap` function creates a map from two lists - one of keys and one of values. Combined with `for` expressions and other collection functions, it enables powerful data structure transformations.

---

## zipmap Basics

```hcl
# Create a map from parallel lists

locals {
  names  = ["alice", "bob", "carol"]
  emails = ["alice@example.com", "bob@example.com", "carol@example.com"]

  user_map = zipmap(local.names, local.emails)
  # { alice = "alice@example.com", bob = "bob@example.com", carol = "carol@example.com" }
}
```

---

## Build Resource Tags from Lists

```hcl
locals {
  tag_keys   = ["Environment", "Team", "CostCenter"]
  tag_values = ["production", "platform", "engineering"]

  common_tags = zipmap(local.tag_keys, local.tag_values)
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = local.common_tags
}
```

---

## Combine for Expression with zipmap

```hcl
# Create a map of subnet ID to AZ
locals {
  subnet_az_map = zipmap(
    aws_subnet.public[*].id,
    aws_subnet.public[*].availability_zone
  )
}
```

---

## tomap - Convert an Object to a Map

```hcl
locals {
  raw_object = {
    name    = "my-app"
    version = "1.0.0"
    env     = "production"
  }
  string_map = tomap({ for k, v in local.raw_object : k => tostring(v) })
}
```

---

## Flatten Nested Lists

```hcl
locals {
  nested = [["a", "b"], ["c", "d"], ["e"]]
  flat   = flatten(local.nested)
  # ["a", "b", "c", "d", "e"]
}
```

---

## Invert a Map (swap keys and values)

```hcl
locals {
  original = { a = "1", b = "2", c = "3" }
  inverted = { for k, v in local.original : v => k }
  # { "1" = "a", "2" = "b", "3" = "c" }
}
```

---

## Summary

Use `zipmap(keys_list, values_list)` to create a map from two parallel lists. Combine with `for` expressions to transform maps and lists dynamically. Use `flatten` to collapse nested lists and `tomap` to convert objects to maps. Test transformations interactively with `tofu console` before embedding them in resource configurations.
