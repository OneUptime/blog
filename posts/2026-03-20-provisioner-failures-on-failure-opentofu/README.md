# How to Handle Provisioner Failures with on_failure in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, On_failure, Error Handling, Infrastructure as Code

Description: Learn how to use the `on_failure` argument in OpenTofu provisioners to control what happens when a provisioner command fails-either halting the apply or continuing gracefully.

## Introduction

By default, if a provisioner fails, OpenTofu marks the resource as **tainted** (for creation-time provisioners) or halts the destroy (for destroy-time provisioners). The `on_failure` argument lets you override this behaviour to either `fail` (the default) or `continue`.

## Default Behaviour: `on_failure = fail`

```hcl
resource "aws_instance" "web" {
  # ...

  provisioner "remote-exec" {
    inline = [
      # If this command returns a non-zero exit code:
      # - OpenTofu reports an error
      # - The instance is marked as tainted
      # - Next apply will destroy and recreate the instance
      "sudo apt-get install -y nonexistent-package",
    ]

    # on_failure = fail  ← This is the default; you can omit it
  }
}
```

## Continue on Failure: `on_failure = continue`

Use `continue` when the provisioner is best-effort and the resource should still be usable even if the provisioner fails:

```hcl
resource "aws_instance" "app" {
  # ...

  provisioner "local-exec" {
    # Optional telemetry: failure here should not block deployment
    command    = "curl -s ${var.metrics_endpoint}/deploy?id=${self.id}"
    on_failure = continue
  }

  provisioner "remote-exec" {
    # Critical setup: failure here should fail the apply
    inline = [
      "sudo /opt/setup/critical-init.sh",
    ]
    # on_failure = fail  ← default; resource will be tainted on failure
  }
}
```

## Destroy-Time Provisioners and `on_failure`

For destroy-time provisioners, `on_failure = fail` prevents the resource from being destroyed if the provisioner fails. Use `continue` to let destruction proceed even if the provisioner fails:

```hcl
resource "aws_instance" "app" {
  # ...

  provisioner "remote-exec" {
    when = destroy

    # If graceful shutdown fails, still proceed with instance termination
    on_failure = continue

    inline = [
      # This might fail if the instance is unresponsive-that's OK
      "sudo systemctl stop myapp",
      "sudo /opt/myapp/drain.sh",
    ]
  }
}
```

## Best Practices for `on_failure`

### Use `continue` for:
- Optional notifications (Slack, PagerDuty)
- Telemetry and logging calls
- Destroy-time cleanup that should never block resource removal
- Best-effort cache warming

### Use `fail` (default) for:
- Critical software installation
- Security configuration (firewall rules, user accounts)
- Database schema migrations
- Any step that the resource cannot function without

## Handling Errors Within the Command

An alternative to `on_failure = continue` is handling errors within the script itself using shell constructs:

```hcl
provisioner "remote-exec" {
  inline = [
    # Handle failure inline using shell || operator
    "sudo apt-get install -y optional-package || echo 'Optional package not available, skipping'",

    # Use set -e to fail fast on the first error within a block
    # but catch specific errors gracefully
    "set -e",
    "sudo /opt/required/install.sh",
    "sudo /opt/optional/install.sh || true",
  ]

  # This provisioner fails only if the required install fails
  on_failure = fail
}
```

## Checking Tainted Resources

After a failed apply, check for tainted resources:

```bash
# List tainted resources in state
tofu show -state -json | jq -r '
  def resources(m):
    (m.resources[]?),
    (m.child_modules[]? | resources(.));
  resources(.values.root_module)
  | select(.tainted == true)
  | .address
'

# Remove taint if you've fixed the issue externally
tofu untaint aws_instance.web
```

## Conclusion

The `on_failure` argument gives you precise control over provisioner error handling. The rule of thumb is straightforward: use `fail` for anything the resource needs to function, and `continue` for optional or best-effort operations that should never block infrastructure deployment or teardown.
