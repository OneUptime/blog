# How to Use the null_resource for Provisioner Workarounds in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, null_resource, Provisioners, Workarounds, Infrastructure as Code

Description: Learn how to use the null_resource in Terraform to run provisioners independently of any real infrastructure resource, using triggers to control when they re-execute.

---

The `null_resource` is one of Terraform's most useful escape hatches. It does not create any real infrastructure. Instead, it provides a container for provisioners that need to run but are not directly tied to a specific resource. Combined with the `triggers` argument, it lets you execute arbitrary commands at controlled points in your Terraform workflow.

Despite its name suggesting it does nothing, `null_resource` solves a whole class of problems that Terraform's declarative model does not handle natively.

## What null_resource Actually Does

The `null_resource` is part of the `hashicorp/null` provider. It implements the standard resource lifecycle (create, read, update, delete) but does not interact with any API or create anything in the real world. Its sole purpose is to hold provisioners and triggers.

```hcl
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

resource "null_resource" "example" {
  # Triggers control when the resource is "recreated"
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "echo 'This runs on every apply'"
  }
}
```

## The triggers Argument

Triggers are the key feature that makes `null_resource` useful. They are a map of strings. When any value in the map changes, Terraform destroys and recreates the `null_resource`, which causes its provisioners to run again.

### Run Every Time

```hcl
resource "null_resource" "always" {
  triggers = {
    always_run = timestamp()  # Changes on every plan
  }

  provisioner "local-exec" {
    command = "echo 'Running at ${timestamp()}'"
  }
}
```

### Run When a Specific Value Changes

```hcl
resource "null_resource" "on_config_change" {
  triggers = {
    config_hash = md5(file("${path.module}/config.json"))
  }

  provisioner "local-exec" {
    command = "python3 scripts/apply-config.py"
  }
}
```

This only re-runs when the content of `config.json` changes.

### Run When a Resource Changes

```hcl
resource "null_resource" "post_deploy" {
  triggers = {
    instance_id = aws_instance.app.id
    lb_arn      = aws_lb.main.arn
  }

  provisioner "local-exec" {
    command = "python3 scripts/post-deploy.py --instance ${aws_instance.app.id}"
  }
}
```

The provisioner runs whenever the instance or load balancer is recreated.

## Common Workaround Patterns

### Running kubectl Commands

Terraform does not have native resources for every Kubernetes operation. The `null_resource` fills the gap.

```hcl
resource "null_resource" "apply_manifest" {
  triggers = {
    manifest_hash = md5(file("${path.module}/manifests/custom-resource.yaml"))
    cluster_id    = aws_eks_cluster.main.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.region}
      kubectl apply -f ${path.module}/manifests/custom-resource.yaml
    EOT
  }

  depends_on = [aws_eks_cluster.main, aws_eks_node_group.main]
}
```

### Database Schema Migrations

After creating a database, you might need to run migrations. There is no Terraform resource for SQL migrations.

```hcl
resource "null_resource" "db_migration" {
  triggers = {
    db_instance = aws_db_instance.main.id
    migration_hash = md5(join("", [
      for f in fileset("${path.module}/migrations", "*.sql") :
      filemd5("${path.module}/migrations/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      export PGPASSWORD="${var.db_password}"
      for file in $(ls ${path.module}/migrations/*.sql | sort); do
        psql -h ${aws_db_instance.main.address} \
             -U ${var.db_username} \
             -d ${var.db_name} \
             -f "$file"
      done
    EOT
  }

  depends_on = [aws_db_instance.main]
}
```

### Building and Pushing Docker Images

```hcl
resource "null_resource" "docker_build" {
  triggers = {
    dockerfile_hash = md5(file("${path.module}/Dockerfile"))
    src_hash        = md5(join("", [
      for f in fileset("${path.module}/src", "**") :
      filemd5("${path.module}/src/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      docker build -t ${var.ecr_repo}:${var.image_tag} ${path.module}
      aws ecr get-login-password --region ${var.region} | \
        docker login --username AWS --password-stdin ${var.ecr_repo}
      docker push ${var.ecr_repo}:${var.image_tag}
    EOT
  }
}
```

### Running Ansible Playbooks

```hcl
resource "null_resource" "ansible_provision" {
  triggers = {
    instance_ids = join(",", aws_instance.app[*].id)
    playbook_hash = md5(file("${path.module}/playbooks/configure.yml"))
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Generate inventory
      echo "[app_servers]" > /tmp/inventory.ini
      ${join("\n", [
        for instance in aws_instance.app :
        "echo '${instance.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=${var.private_key_path}' >> /tmp/inventory.ini"
      ])}

      # Run playbook
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i /tmp/inventory.ini \
        ${path.module}/playbooks/configure.yml
    EOT
  }

  depends_on = [aws_instance.app]
}
```

### Waiting for a Service to Be Ready

Sometimes you need to wait for a service to become available before proceeding.

```hcl
resource "null_resource" "wait_for_api" {
  triggers = {
    lb_dns = aws_lb.api.dns_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Waiting for API to be ready..."
      for i in $(seq 1 60); do
        if curl -s -o /dev/null -w "%{http_code}" http://${aws_lb.api.dns_name}/health | grep -q "200"; then
          echo "API is ready!"
          exit 0
        fi
        echo "Attempt $i: API not ready yet, waiting 10 seconds..."
        sleep 10
      done
      echo "API did not become ready within 10 minutes"
      exit 1
    EOT
  }

  depends_on = [aws_lb_listener.api, aws_ecs_service.api]
}
```

### Invalidating CloudFront Cache

```hcl
resource "null_resource" "invalidate_cache" {
  triggers = {
    s3_etag = md5(join("", [
      for obj in aws_s3_object.static :
      obj.etag
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws cloudfront create-invalidation \
        --distribution-id ${aws_cloudfront_distribution.cdn.id} \
        --paths "/*"
    EOT
  }

  depends_on = [aws_s3_object.static]
}
```

## Ordering with depends_on

Since `null_resource` does not have natural dependencies (it does not reference other resources' attributes in its own attributes), you often need `depends_on` to control execution order.

```hcl
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
}

resource "null_resource" "smoke_test" {
  triggers = {
    service_id = aws_ecs_service.api.id
  }

  provisioner "local-exec" {
    command = "python3 scripts/smoke-test.py --service api"
  }

  # Make sure the service is fully deployed before testing
  depends_on = [aws_ecs_service.api]
}
```

## Destruction-Time Provisioners

You can also use `null_resource` for cleanup tasks that should run before the infrastructure is torn down.

```hcl
resource "null_resource" "cleanup" {
  triggers = {
    cluster_name = aws_eks_cluster.main.name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      # Clean up Kubernetes resources before destroying the cluster
      aws eks update-kubeconfig --name ${self.triggers.cluster_name} --region ${self.triggers.region}
      kubectl delete ingress --all -A --timeout=60s || true
      kubectl delete svc --all -A --timeout=60s || true
      # Wait for load balancers to be cleaned up
      sleep 30
    EOT
  }
}
```

Important: destruction-time provisioners in `null_resource` can only access `self.triggers` - not other resource attributes. Store any values you need at destroy time in the triggers map.

## Limitations of null_resource

1. **Not in the plan.** Provisioner actions do not appear in `terraform plan`. You cannot preview what will run.

2. **No state tracking.** There is no way to know if the provisioner succeeded on a previous run (other than the resource existing in state).

3. **Not idempotent by default.** You must make your commands idempotent since triggers can cause re-execution.

4. **Deprecated in favor of terraform_data.** Terraform 1.4 introduced `terraform_data` as a built-in replacement that does not require an external provider.

## Summary

The `null_resource` is Terraform's Swiss Army knife for imperative operations. It runs provisioners outside the context of real infrastructure, controlled by triggers that determine when the commands re-execute. While it is a workaround rather than a first-class solution, it solves real problems: running database migrations, applying Kubernetes manifests, building Docker images, and integrating with tools that Terraform does not natively support.

For the modern replacement, see our post on [terraform_data](https://oneuptime.com/blog/post/terraform-data-replacement-null-resource/view). For more on provisioners in general, check out [provisioners with resources](https://oneuptime.com/blog/post/terraform-provisioners-with-resources/view).
