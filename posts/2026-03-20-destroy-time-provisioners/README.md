# How to Use Destroy-Time Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, Infrastructure as Code, remote-exec, local-exec, Cleanup

Description: Learn how to configure destroy-time provisioners in OpenTofu to run cleanup scripts when resources are destroyed.

---

Destroy-time provisioners run commands immediately before a resource is destroyed. They are useful for deregistering nodes from external systems, flushing data, or running cleanup scripts that can't be automated any other way.

---

## Basic Destroy-Time Provisioner

```hcl
resource "aws_instance" "worker" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  provisioner "remote-exec" {
    when = destroy  # Run on destroy, not on create

    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file(pathexpand("~/.ssh/worker.pem"))
      host        = self.public_ip
    }

    inline = [
      "sudo systemctl stop my-app",
      "sudo /opt/deregister-from-consul.sh ${self.private_ip}",
    ]
  }
}
```

---

## local-exec on Destroy

```hcl
resource "aws_instance" "k8s_node" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  provisioner "local-exec" {
    when    = destroy
    command = "kubectl drain ${self.private_dns} --delete-emptydir-data --ignore-daemonsets --force"
  }
}
```

---

## Failure Handling for Destroy Provisioners

```hcl
provisioner "remote-exec" {
  when       = destroy
  on_failure = continue  # Proceed with destroy even if provisioner fails

  inline = [
    "sudo graceful-shutdown.sh || true",
  ]
}
```

Using `on_failure = continue` is especially important for destroy-time provisioners - if the instance is already unreachable, you still want the resource to be removed from state.

---

## Important Caveats

- Destroy-time provisioners run **before** the resource is destroyed
- If the provisioner fails and `on_failure = fail` (default), the resource is NOT destroyed
- If SSH is unavailable (e.g., instance stopped), provisioner fails unless `on_failure = continue`
- For complex deregistration workflows, consider using `terraform_data` with `input` and `triggers_replace` instead

---

## Using terraform_data for Cleanup Triggers

```hcl
resource "terraform_data" "deregister" {
  input = {
    instance_id = aws_instance.worker.id
    private_ip  = aws_instance.worker.private_ip
  }

  triggers_replace = [
    aws_instance.worker.id,
    aws_instance.worker.private_ip,
  ]

  provisioner "local-exec" {
    when    = destroy
    command = "deregister-node.sh ${self.output.private_ip}"
  }
}
```

Using `terraform_data` with `input` preserves the values needed for cleanup on the cleanup resource itself.

---

## Summary

Set `when = destroy` on a provisioner to run it during resource destruction. Always set `on_failure = continue` for destroy-time provisioners unless the provisioner failure should block destruction. Use `terraform_data` with `input` and `triggers_replace` to capture resource attributes for use in destroy-time cleanup.
