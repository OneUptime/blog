# How to Set Up Consul Service Discovery with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Consul, Service Discovery, HashiCorp, Microservice, Infrastructure as Code

Description: Learn how to deploy HashiCorp Consul on AWS with OpenTofu and configure service discovery, health checks, and DNS for microservices architectures.

## Introduction

HashiCorp Consul is a service mesh and service discovery platform. OpenTofu can provision the Consul cluster infrastructure on AWS and configure Consul resources using the Consul provider.

## Consul Cluster Infrastructure on AWS

```hcl
# EC2 instances for Consul servers

resource "aws_instance" "consul_server" {
  count         = 3  # always use odd numbers for quorum
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  iam_instance_profile = aws_iam_instance_profile.consul.name
  key_name             = var.key_pair_name

  user_data = templatefile("${path.module}/scripts/consul-server.sh.tpl", {
    consul_version  = "1.18.0"
    datacenter      = var.datacenter
    expected_count  = 3
    retry_join_tag  = "consul-server-${var.environment}"
  })

  tags = {
    Name        = "consul-server-${count.index}"
    ConsulRole  = "server"
    Environment = var.environment
  }
}
```

## Consul Server Bootstrap Script

```bash
#!/bin/bash
# scripts/consul-server.sh.tpl
yum install -y unzip

# Download and install Consul
curl -Lo /tmp/consul.zip \
  "https://releases.hashicorp.com/consul/${consul_version}/consul_${consul_version}_linux_amd64.zip"
unzip /tmp/consul.zip -d /usr/local/bin/

mkdir -p /etc/consul.d /opt/consul

# Write configuration
cat > /etc/consul.d/config.hcl <<EOF
datacenter        = "${datacenter}"
data_dir          = "/opt/consul"
server            = true
bootstrap_expect  = ${expected_count}
bind_addr         = "{{ GetInterfaceIP \"eth0\" }}"
client_addr       = "0.0.0.0"
retry_join        = ["provider=aws tag_key=ConsulRole tag_value=server region=us-east-1"]
ui_config { enabled = true }
EOF

consul agent -config-dir=/etc/consul.d/ &
```

## Consul Provider Configuration

```hcl
# Configure the Consul provider to connect to the cluster
provider "consul" {
  address    = "${aws_instance.consul_server[0].private_ip}:8500"
  datacenter = var.datacenter
}
```

## Registering Services

```hcl
resource "consul_service" "payments" {
  name    = "payments"
  node    = consul_node.worker.name
  port    = 8080
  address = "10.0.1.100"

  tags = ["v2", "production"]

  check {
    check_id                          = "payments-health"
    name                              = "Payments HTTP Health"
    http                              = "http://10.0.1.100:8080/health"
    interval                          = "10s"
    timeout                           = "1s"
    deregister_critical_service_after = "30s"
  }
}

resource "consul_node" "worker" {
  name    = "payments-worker-1"
  address = "10.0.1.100"
}
```

## Consul KV for Configuration

```hcl
resource "consul_key_prefix" "app_config" {
  path_prefix = "config/${var.environment}/"

  subkeys = {
    "database/host"    = "db.internal.example.com"
    "database/port"    = "5432"
    "feature/new_ui"   = "true"
  }
}
```

## Outputs

```hcl
output "consul_ui_url" {
  value = "http://${aws_instance.consul_server[0].public_ip}:8500/ui"
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Consul provides powerful service discovery, health checking, and distributed configuration. Using OpenTofu you can provision the Consul cluster infrastructure and manage service registrations, health checks, and KV configurations as code, creating a reproducible service mesh foundation.
