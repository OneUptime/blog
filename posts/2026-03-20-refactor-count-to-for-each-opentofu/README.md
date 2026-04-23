# How to Refactor from count to for_each in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, for_each, Count, Refactoring, Infrastructure as Code

Description: Learn how to safely migrate OpenTofu resources from count-based indexing to for_each-based keying using moved blocks.

`count` uses integer indexes (`resource[0]`, `resource[1]`) while `for_each` uses string keys (`resource["key"]`). This matters when you remove an item from the middle: `count` renumbers all subsequent resources and may destroy/recreate them, while `for_each` only affects the removed key. Migrating from `count` to `for_each` is a common and important refactoring.

## The Problem with count

```hcl
# Original: count-based
locals {
  public_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_subnet" "public" {
  count      = length(local.public_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = local.public_cidrs[count.index]
}
# State: aws_subnet.public[0], aws_subnet.public[1], aws_subnet.public[2]
```

If you remove the first CIDR from `local.public_cidrs`, indexes shift and subnet[1] becomes subnet[0], causing a destroy-and-recreate of the other subnets.

## The Solution: for_each

```hcl
# After: for_each-based
resource "aws_subnet" "public" {
  for_each   = {
    "us-east-1a" = "10.0.1.0/24"
    "us-east-1b" = "10.0.2.0/24"
    "us-east-1c" = "10.0.3.0/24"
  }
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key
}
# State: aws_subnet.public["us-east-1a"], etc.
```

Now removing one AZ only removes that specific subnet.

## Step 1: Add the moved Blocks

Map each old integer-indexed address to its new string-keyed address:

```hcl
# moved.tf
moved {
  from = aws_subnet.public[0]
  to   = aws_subnet.public["us-east-1a"]
}

moved {
  from = aws_subnet.public[1]
  to   = aws_subnet.public["us-east-1b"]
}

moved {
  from = aws_subnet.public[2]
  to   = aws_subnet.public["us-east-1c"]
}
```

## Step 2: Replace the Resource Block

Replace the `count`-based block with the `for_each` block in `main.tf`.

## Step 3: Update References

Any other resources referencing the old `count` syntax need updating:

```hcl
# Before (count-based reference)
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# After (for_each-based reference)
resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}
```

Add `moved` blocks for the route table associations as well:

```hcl
moved {
  from = aws_route_table_association.public[0]
  to   = aws_route_table_association.public["us-east-1a"]
}
# ... etc
```

## Step 4: Verify and Apply

```bash
tofu plan
# Should show only "moved" annotations, no creates or destroys

tofu apply
```

## Refactoring count on Modules

The same pattern applies to modules using `count`:

```hcl
# Before
module "worker" {
  count  = 3
  source = "./modules/worker"
}

# After
module "worker" {
  for_each = toset(["worker-a", "worker-b", "worker-c"])
  source   = "./modules/worker"
}

# moved.tf
moved {
  from = module.worker[0]
  to   = module.worker["worker-a"]
}
moved {
  from = module.worker[1]
  to   = module.worker["worker-b"]
}
moved {
  from = module.worker[2]
  to   = module.worker["worker-c"]
}
```

## Conclusion

Migrating from `count` to `for_each` is one of the most impactful refactors you can make to infrastructure configurations. It eliminates the "cascade destroy" problem that occurs when removing items from the middle of a list. Use `moved` blocks to perform this migration safely, and verify thoroughly with `tofu plan` before applying.
