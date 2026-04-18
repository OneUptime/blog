# How to Understand Resource Behavior in OpenTofu - Understand

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Infrastructure as Code, DevOps, HCL

Description: Learn how OpenTofu manages resource lifecycle - creation, update, replacement, and deletion - and what drives each type of change.

---

OpenTofu resources have a well-defined lifecycle: they are created, may be updated in place or replaced (destroyed and recreated), and eventually destroyed. Understanding what triggers each action helps you predict how your infrastructure will change and avoid unexpected outages.

---

## The Four Resource Actions

```text
+ create    - Resource doesn't exist; will be created
~ update    - Resource exists; some attributes will be changed in place
-/+ replace - Resource must be destroyed and recreated (destructive)
- destroy   - Resource will be removed
```

---

## What Triggers Each Action

### Create
```hcl
# A new resource block not yet in state

resource "aws_s3_bucket" "data" {
  bucket = "my-new-bucket"
}
# Plan shows: + aws_s3_bucket.data will be created
```

### Update in Place
Most attribute changes trigger an in-place update:
```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.small"   # changed from t3.micro → in-place update
  tags = { Name = "web-v2" }   # tag changes → always in-place
}
# Plan shows: ~ aws_instance.web will be updated in-place
```

### Replace (Destroy + Create)
Some attribute changes require replacing the resource entirely:
```hcl
resource "aws_instance" "web" {
  ami = "ami-0a1b2c3d4e"   # changing AMI forces replacement
}
# Plan shows: -/+ aws_instance.web must be replaced
# (known after apply)
```

### Destroy
Removing a resource block or running `tofu destroy`:
```bash
# Removing the resource block from config
tofu plan   # shows: - aws_instance.web will be destroyed
```

---

## ForceNew Attributes

Provider documentation marks some attributes as `ForceNew` - changing them destroys and recreates the resource:

```hcl
# Common ForceNew attributes:
# aws_instance: ami, availability_zone, subnet_id
# aws_db_instance: engine, db_name (sometimes)
# google_compute_instance: name, zone, boot_disk.initialize_params.type

# Plan output for ForceNew attribute change:
# -/+ resource "aws_instance" "web" {
#       ~ ami = "ami-old" -> "ami-new" # forces replacement
#     }
```

---

## Reading the Plan Carefully

```bash
tofu plan

# Symbols to understand:
# + : will be created
# - : will be destroyed
# ~ : will be updated in-place
# -/+ : will be destroyed then recreated
# +/- : will be created then destroyed (create_before_destroy)

# Attribute annotations:
# (forces replacement) - this change requires destroy+create
# (known after apply) - value depends on creation result
# (sensitive value)   - redacted from output
```

---

## Preventing Unintended Replacements

```hcl
resource "aws_instance" "web" {
  lifecycle {
    # Ignore AMI changes - don't replace when AMI is updated
    ignore_changes = [ami]

    # Create new before destroying old (zero-downtime replacement)
    create_before_destroy = true
  }
}
```

---

Resource Dependencies and Update Order

OpenTofu processes resources in dependency order:

```hcl
resource "aws_vpc" "main" { }

resource "aws_subnet" "web" {
  vpc_id = aws_vpc.main.id  # subnet depends on VPC
  # → VPC is created first, subnet second
  # → On destroy: subnet is removed first, then VPC
}
```

---

## Summary

Understanding resource behavior means knowing: (1) which attribute changes trigger in-place updates vs replacements, (2) how to read plan output symbols, and (3) how to use lifecycle settings to modify default behavior. Always read `tofu plan` output carefully before applying, paying special attention to `-/+` replacements that will cause service interruption.
