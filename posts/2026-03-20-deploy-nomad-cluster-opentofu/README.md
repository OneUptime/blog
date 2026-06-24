# How to Deploy Nomad Cluster with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Nomad, Cluster, Container Orchestration, HashiCorp

Description: Learn how to deploy a HashiCorp Nomad cluster on AWS using OpenTofu with Consul integration, ACL bootstrapping, and auto-scaling client nodes for workload orchestration.

## Introduction

Nomad is HashiCorp's workload orchestrator that supports containers, VMs, and binaries. A production Nomad cluster consists of server nodes (for scheduling) and client nodes (for running workloads), typically deployed alongside Consul for service discovery and health checking.

## Nomad Server Instances

```hcl
resource "aws_autoscaling_group" "nomad_servers" {
  name                = "nomad-servers-${var.environment}"
  min_size            = 3
  max_size            = 3
  desired_capacity    = 3
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.nomad_server.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "nomad-server-${var.environment}"
    propagate_at_launch = true
  }
  tag {
    key                 = "NomadRole"
    value               = "server"
    propagate_at_launch = true
  }
}

resource "aws_launch_template" "nomad_server" {
  name_prefix   = "nomad-server-${var.environment}-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = var.key_pair_name

  iam_instance_profile {
    name = aws_iam_instance_profile.nomad.name
  }

  network_interfaces {
    security_groups = [aws_security_group.nomad_server.id]
  }

  user_data = base64encode(templatefile("${path.module}/nomad-server-init.sh.tpl", {
    nomad_version      = var.nomad_version
    datacenter         = var.datacenter
    bootstrap_expect   = 3
    aws_region         = var.aws_region
    gossip_key_secret  = aws_secretsmanager_secret.nomad_gossip_key.name
  }))
}
```

## Nomad Client Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "nomad_clients" {
  name                = "nomad-clients-${var.environment}"
  min_size            = var.min_client_nodes
  max_size            = var.max_client_nodes
  desired_capacity    = var.desired_client_nodes
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.nomad_client.id
    version = "$Latest"
  }

  tag {
    key                 = "NomadRole"
    value               = "client"
    propagate_at_launch = true
  }
}

resource "aws_launch_template" "nomad_client" {
  name_prefix   = "nomad-client-${var.environment}-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.client_instance_type
  key_name      = var.key_pair_name

  iam_instance_profile {
    name = aws_iam_instance_profile.nomad_client.name
  }

  network_interfaces {
    security_groups = [aws_security_group.nomad_client.id]
  }

  # Larger root volume for container images
  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/nomad-client-init.sh.tpl", {
    nomad_version  = var.nomad_version
    datacenter     = var.datacenter
    aws_region     = var.aws_region
    docker_enabled = true
  }))
}
```

## Nomad Server Configuration

```hcl
# nomad-server.hcl template

locals {
  nomad_server_config = <<-CONFIG
    datacenter = "${var.datacenter}"
    region     = "global"
    data_dir   = "/opt/nomad/data"
    log_level  = "INFO"

    server {
      enabled          = true
      bootstrap_expect = 3
    }

    consul {
      address = "127.0.0.1:8500"
      server_service_name = "nomad"
      client_service_name = "nomad-client"
      auto_advertise = true
      server_auto_join = true
      client_auto_join = true
    }

    acl {
      enabled = true
    }

    tls {
      http = true
      rpc  = true
      ca_file   = "/opt/nomad/tls/ca.crt"
      cert_file = "/opt/nomad/tls/server.crt"
      key_file  = "/opt/nomad/tls/server.key"
    }
  CONFIG
}
```

## Managing Nomad with the Nomad Provider

```hcl
provider "nomad" {
  address = "https://nomad.${var.domain_name}:4646"
  ca_file = "${path.module}/ca.crt"
  secret_id = var.nomad_bootstrap_token
}

# ACL policy for CI/CD job submission
resource "nomad_acl_policy" "cicd" {
  name        = "cicd-deploy"
  description = "Policy for CI/CD pipeline job deployments"
  rules_hcl   = <<-RULES
    namespace "default" {
      policy       = "write"
      capabilities = ["submit-job", "read-job"]
    }
  RULES
}

# Namespace for isolation
resource "nomad_namespace" "production" {
  name        = "production"
  description = "Production workloads"
}
```

## Nomad Job Example (managed via API/CLI, not OpenTofu)

```hcl
# example.nomad - submitted via CLI or API after cluster is running
job "web-app" {
  datacenters = ["dc1"]
  namespace   = "production"
  type        = "service"

  group "web" {
    count = 3

    network {
      port "http" { to = 8080 }
    }

    service {
      name = "web-app"
      port = "http"
      provider = "consul"
      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }
    }

    task "web" {
      driver = "docker"
      config {
        image = "myapp:latest"
        ports = ["http"]
      }
    }
  }
}
```

## Conclusion

Deploying Nomad with OpenTofu creates a flexible workload orchestration platform alongside Consul for service discovery. The Consul integration is a first-class feature in Nomad's configuration - services declared in Nomad job `service` blocks can register with Consul for service discovery and health checking. In ACL-enabled environments, service registration also requires the appropriate Consul token or workload identity configuration. Use the Nomad provider to manage ACL policies and namespaces, but submit jobs via the Nomad CLI or API during deployments to maintain proper separation between infrastructure and application concerns.
