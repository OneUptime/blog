# How to Debug Circular Dependencies Using tofu graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Circular Dependencies, Debugging, Tofu graph, Infrastructure as Code

Description: Learn how to use the tofu graph command to detect and resolve circular dependencies in OpenTofu configurations.

Circular dependencies occur when resource A depends on resource B, and resource B (directly or indirectly) depends on resource A. OpenTofu cannot determine the creation order and will refuse to proceed. The `tofu graph` command exposes these cycles so you can diagnose and fix them.

## How OpenTofu Reports Circular Dependencies

When a cycle exists, `tofu plan` or `tofu apply` produces an error like:

```text
Error: Cycle: aws_security_group.app, aws_instance.web
```

This tells you the two resources form a cycle, but not *why*. Use `tofu graph` to see the exact edges causing the loop.

## Generating a Cycle-Annotated Graph

```bash
# -draw-cycles highlights cyclic edges with a thick red line

tofu graph -draw-cycles | dot -Tsvg -o cycle-graph.svg
```

Open the SVG in a browser - cycle edges appear as thick red arrows. Trace them to find which attribute references are creating the loop.

## Common Causes and Fixes

### Cause 1: Security Group Self-Reference

```hcl
# BAD: security group references the instance, instance references the SG
resource "aws_instance" "web" {
  security_groups = [aws_security_group.app.name]  # depends on SG
}

resource "aws_security_group" "app" {
  ingress {
    # Trying to reference the instance's private IP - creates a cycle
    cidr_blocks = ["${aws_instance.web.private_ip}/32"]
  }
}
```

Fix by breaking the cycle: create the security group without referencing the instance, then allow the CIDR block using the subnet range instead:

```hcl
# GOOD: security group does not reference the instance
resource "aws_security_group" "app" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]  # Use a variable instead
  }
}

resource "aws_instance" "web" {
  vpc_security_group_ids = [aws_security_group.app.id]
}
```

### Cause 2: Module Output Feeding Back into Module Input

```hcl
# BAD: module A output is used in module B, which feeds back to module A
module "a" {
  source = "./module-a"
  input  = module.b.output_value  # depends on module B
}

module "b" {
  source = "./module-b"
  input  = module.a.output_value  # depends on module A - CYCLE
}
```

Fix by extracting the shared value into a standalone resource or variable passed from the root module.

## Tracing Cycles in the DOT Output

Find cycles manually by looking for back-edges in the DOT file:

```bash
tofu graph -draw-cycles > cycle.dot

# Look for red-colored edges which indicate cycle arrows
grep "color" cycle.dot
```

DOT output from `-draw-cycles` adds `[color = "red", penwidth = "2.0"]` attributes to edges that are part of cycles.

## Using depends_on to Control Order Without Data Cycles

Sometimes you need ordering without a data dependency. Use `depends_on` to express this without creating a reference cycle:

```hcl
# GOOD: explicit ordering without creating a data reference cycle
resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda.arn
}

resource "aws_lambda_function" "fn" {
  # No direct reference to the attachment, but must wait for it
  depends_on = [aws_iam_role_policy_attachment.attach]
}
```

## Conclusion

Use `tofu graph -draw-cycles` to visualize circular dependencies visually. Most cycles stem from resources mutually referencing each other's attributes. Break cycles by using variables, extracting shared resources, or replacing attribute references with `depends_on` for pure ordering requirements.
