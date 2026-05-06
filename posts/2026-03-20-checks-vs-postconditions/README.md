# OpenTofu Checks vs. Postconditions: What's the Difference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CHECK, Postconditions, Validation, Infrastructure as Code

Description: Learn the difference between OpenTofu check blocks and postconditions, and when to use each for infrastructure validation.

---

OpenTofu provides two mechanisms for validating infrastructure state: `postcondition` blocks inside `lifecycle` blocks and standalone `check` blocks. They serve different purposes and run at different points in the workflow.

---

## Postconditions

`postcondition` blocks validate resources or data sources after OpenTofu evaluates them. If the condition fails, OpenTofu raises an error and blocks the operation.

```hcl
resource "aws_lb" "main" {
  name               = "main-lb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id

  lifecycle {
    postcondition {
      condition     = self.dns_name != ""
      error_message = "Load balancer did not receive a DNS name after creation."
    }
  }
}
```

Key characteristics:
- Runs after the object is evaluated; if values are unknown during `plan`, the check is deferred to `apply`
- Failure raises an error and blocks the operation
- Has access to `self` (the object's own attributes)
- Suitable for validating that cloud-assigned values meet requirements

---

## Check Blocks

`check` blocks validate arbitrary data sources or conditions and report warnings without aborting. They're used for ongoing health assertions.

```hcl
check "lb_health" {
  data "http" "lb_health_check" {
    url = "http://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.lb_health_check.status_code == 200
    error_message = "Load balancer health check returned non-200 status."
  }
}
```

Key characteristics:
- Runs at the end of `plan` and `apply`
- Failures produce **warnings**, not errors - apply still succeeds
- Can use `data` sources to fetch external state
- Suitable for monitoring, compliance checks, and soft assertions

---

## Side-by-Side Comparison

| Feature              | `postcondition`           | `check` block              |
|----------------------|---------------------------|----------------------------|
| Placement            | Inside `lifecycle`        | Top-level block             |
| Runs during          | Plan or apply, after evaluation | Plan and apply        |
| On failure           | Errors and blocks the operation | Warns, continues apply |
| Access to `self`     | Yes                       | No                          |
| Can use data sources | Yes                       | Yes                         |
| Use case             | Hard resource requirements | Soft health/compliance checks|

---

## When to Use Each

Use `postcondition` when:
- A cloud-assigned attribute must meet a requirement (e.g., endpoint not empty)
- A failure should block the deployment

Use `check` blocks when:
- You want visibility into external health without blocking deploys
- Implementing compliance assertions that should warn but not break CI/CD
- Using continuous validation in TACOS or a cloud backend

---

## Summary

`postcondition` is a hard validation inside `lifecycle` that raises an error when a resource or data source does not meet expectations. `check` blocks are soft assertions that run at plan/apply time and warn without aborting. Use postconditions to enforce hard guarantees on specific resources or data sources, and check blocks for ongoing health and compliance monitoring.
