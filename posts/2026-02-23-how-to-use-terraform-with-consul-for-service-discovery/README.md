# How to Use Terraform with Consul for Service Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Consul, Service Discovery, HashiCorp, Networking, Microservices

Description: Learn how to integrate Terraform with HashiCorp Consul for service discovery, health checking, and dynamic configuration management in distributed systems.

---

As applications grow from monoliths into distributed microservices, service discovery becomes essential. Services need to find and communicate with each other dynamically, without hardcoded IP addresses or DNS entries. HashiCorp Consul provides service discovery, health checking, and key-value configuration that integrate naturally with Terraform. Terraform provisions the infrastructure and Consul cluster, while Consul handles the runtime service mesh.

This guide covers how to deploy Consul with Terraform and use both tools together for a complete service discovery solution.

## Understanding Consul's Role

Consul provides several capabilities that complement Terraform. Service discovery allows services to register themselves and discover other services by name. Health checking monitors service availability and removes unhealthy instances from the service catalog. The key-value store provides dynamic configuration that can be updated without redeploying infrastructure.

## Deploying a Consul Cluster with Terraform

Start by provisioning the Consul server cluster on AWS.

```hcl
# Security group for Consul servers
resource "aws_security_group" "consul_server" {
  name_prefix = "consul-server-"
  vpc_id      = var.vpc_id

  # Consul server RPC
  ingress {
    from_port   = 8300
    to_port     = 8300
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul server RPC"
  }

  # Consul Serf LAN (TCP and UDP)
  ingress {
    from_port   = 8301
    to_port     = 8301
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul Serf LAN TCP"
  }

  ingress {
    from_port   = 8301
    to_port     = 8301
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul Serf LAN UDP"
  }

  # Consul HTTP API
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul HTTP API"
  }

  # Consul DNS
  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul DNS TCP"
  }

  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
    description = "Consul DNS UDP"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "consul-server-sg"
  }
}

# Consul server instances
resource "aws_instance" "consul_server" {
  count         = 3
  ami           = var.consul_ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.consul_server.id]
  iam_instance_profile   = aws_iam_instance_profile.consul.name

  user_data = templatefile("${path.module}/templates/consul-server.sh", {
    consul_version   = var.consul_version
    cluster_size     = 3
    datacenter       = var.datacenter
    encrypt_key      = var.consul_encrypt_key
    retry_join_tag   = "consul-server-${var.environment}"
  })

  tags = {
    Name                = "consul-server-${count.index}"
    ConsulAutoJoin      = "consul-server-${var.environment}"
    Environment         = var.environment
  }
}
```

## Configuring the Consul Provider in Terraform

Once Consul is running, configure Terraform's Consul provider to manage services and configuration.

```hcl
# Configure the Consul provider
provider "consul" {
  address    = "${aws_instance.consul_server[0].private_ip}:8500"
  datacenter = var.datacenter
  token      = var.consul_acl_token
}

# Register a service in Consul
resource "consul_service" "api" {
  name    = "api-service"
  node    = aws_instance.api_server.id
  port    = 8080
  tags    = ["api", var.environment, "v${var.api_version}"]
  address = aws_instance.api_server.private_ip

  check {
    check_id                          = "api-health"
    name                              = "API Health Check"
    http                              = "http://${aws_instance.api_server.private_ip}:8080/health"
    interval                          = "10s"
    timeout                           = "5s"
    deregister_critical_service_after = "30s"
  }
}

# Register the database service
resource "consul_service" "database" {
  name    = "database"
  node    = "rds-${var.environment}"
  port    = 5432
  tags    = ["postgres", var.environment]
  address = aws_db_instance.main.address

  check {
    check_id = "db-tcp"
    name     = "Database TCP Check"
    tcp      = "${aws_db_instance.main.address}:5432"
    interval = "30s"
    timeout  = "10s"
  }
}
```

## Storing Configuration in Consul KV

Use Consul's key-value store for dynamic application configuration.

```hcl
# Store application configuration in Consul KV
resource "consul_keys" "app_config" {
  key {
    path  = "config/${var.environment}/database/host"
    value = aws_db_instance.main.address
  }

  key {
    path  = "config/${var.environment}/database/port"
    value = tostring(aws_db_instance.main.port)
  }

  key {
    path  = "config/${var.environment}/database/name"
    value = var.db_name
  }

  key {
    path  = "config/${var.environment}/redis/host"
    value = aws_elasticache_cluster.main.cache_nodes[0].address
  }

  key {
    path  = "config/${var.environment}/redis/port"
    value = "6379"
  }

  key {
    path  = "config/${var.environment}/feature-flags/new-ui"
    value = var.enable_new_ui ? "true" : "false"
  }
}

# Read configuration from Consul (useful for cross-workspace references)
data "consul_keys" "shared_config" {
  key {
    name    = "api_endpoint"
    path    = "config/${var.environment}/api/endpoint"
    default = "http://localhost:8080"
  }

  key {
    name    = "log_level"
    path    = "config/${var.environment}/logging/level"
    default = "info"
  }
}
```

## Setting Up Consul Service Mesh (Connect)

Consul Connect provides a service mesh with automatic mTLS encryption between services.

```hcl
# Configure intentions to control service-to-service communication
resource "consul_config_entry" "api_to_database" {
  kind = "service-intentions"
  name = "database"

  config_json = jsonencode({
    Sources = [
      {
        Name       = "api-service"
        Action     = "allow"
        Precedence = 9
        Type       = "consul"
      },
      {
        Name       = "worker-service"
        Action     = "allow"
        Precedence = 9
        Type       = "consul"
      },
      {
        # Deny all other services
        Name       = "*"
        Action     = "deny"
        Precedence = 8
        Type       = "consul"
      }
    ]
  })
}

# Service defaults for the API service
resource "consul_config_entry" "api_defaults" {
  kind = "service-defaults"
  name = "api-service"

  config_json = jsonencode({
    Protocol = "http"
    MeshGateway = {
      Mode = "local"
    }
  })
}

# Configure proxy defaults for the service mesh
resource "consul_config_entry" "proxy_defaults" {
  kind = "proxy-defaults"
  name = "global"

  config_json = jsonencode({
    Config = {
      protocol = "http"
    }
    MeshGateway = {
      Mode = "local"
    }
  })
}
```

## Consul-Aware Terraform Modules

Build modules that automatically register services in Consul when deployed.

```hcl
# modules/consul-service/main.tf
variable "service_name" {
  type = string
}

variable "instance_id" {
  type = string
}

variable "instance_ip" {
  type = string
}

variable "port" {
  type = number
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "tags" {
  type    = list(string)
  default = []
}

# Register the service in Consul
resource "consul_service" "this" {
  name    = var.service_name
  node    = var.instance_id
  port    = var.port
  address = var.instance_ip
  tags    = var.tags

  check {
    check_id                          = "${var.service_name}-http"
    name                              = "${var.service_name} HTTP Health"
    http                              = "http://${var.instance_ip}:${var.port}${var.health_check_path}"
    interval                          = "10s"
    timeout                           = "5s"
    deregister_critical_service_after = "60s"
  }
}

# Store service metadata in Consul KV
resource "consul_keys" "service_meta" {
  key {
    path  = "services/${var.service_name}/address"
    value = var.instance_ip
  }

  key {
    path  = "services/${var.service_name}/port"
    value = tostring(var.port)
  }
}
```

## Best Practices

Deploy Consul servers in an odd number (3 or 5) across availability zones for high availability. Use ACL tokens to control access to the Consul API and key-value store. Enable TLS for all Consul communication, especially in production.

Use Consul's DNS interface for service discovery so applications do not need to know about Consul's API directly. Services can resolve other services using standard DNS queries like `api-service.service.consul`.

For related HashiCorp ecosystem guides, see [using Terraform with Vault for secret management](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-vault-for-secret-management/view) and [using Terraform with Nomad for workload orchestration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-nomad-for-workload-orchestration/view).

## Conclusion

Terraform and Consul together provide a complete solution for infrastructure provisioning and service discovery. Terraform handles the lifecycle of cloud resources, while Consul handles the dynamic runtime aspects of service communication and configuration. By registering services in Consul as part of your Terraform deployment, you create a self-documenting infrastructure where every service is discoverable, health-checked, and connected through a secure mesh.
