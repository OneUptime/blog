# How to Create Linode NodeBalancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, NodeBalancers, Load Balancer, Infrastructure as Code

Description: Learn how to create Linode NodeBalancers with OpenTofu to distribute traffic across Linode instances with configurable health checks and protocols.

Linode NodeBalancers are cloud-managed load balancers that distribute incoming traffic across Linode instances. OpenTofu lets you define NodeBalancers, their configuration (ports and protocols), and node assignments as code.

## Creating a NodeBalancer

```hcl
resource "linode_nodebalancer" "web" {
  label  = "web-nodebalancer"
  region = "us-east"

  tags = ["production", "web"]
}

output "nodebalancer_ip" {
  value = linode_nodebalancer.web.ipv4
}
```

## Adding a Configuration (Port/Protocol)

```hcl
resource "linode_nodebalancer_config" "http" {
  nodebalancer_id = linode_nodebalancer.web.id
  port            = 80
  protocol        = "http"
  algorithm       = "roundrobin"  # roundrobin, leastconn, source
  stickiness      = "none"         # none, table, http_cookie

  check          = "http"
  check_path     = "/health"
  check_interval = 10
  check_timeout  = 5
  check_attempts = 3
}
```

## HTTPS Configuration

```hcl
resource "linode_nodebalancer_config" "https" {
  nodebalancer_id = linode_nodebalancer.web.id
  port            = 443
  protocol        = "https"
  algorithm       = "roundrobin"

  # Paste PEM-encoded certificate and key
  ssl_cert = file("certs/server.crt")
  ssl_key  = var.ssl_private_key

  check          = "http"
  check_path     = "/health"
  check_interval = 10
  check_timeout  = 5
  check_attempts = 3
}
```

## Adding Backend Nodes

```hcl
resource "linode_instance" "web" {
  count           = 3
  label           = "web-${count.index + 1}"
  region          = "us-east"
  type            = "g6-standard-1"
  image           = "linode/ubuntu24.04"
  root_pass       = var.root_password
  authorized_keys = [var.ssh_public_key]
  private_ip      = true
}

resource "linode_nodebalancer_node" "web" {
  count           = length(linode_instance.web)
  nodebalancer_id = linode_nodebalancer.web.id
  config_id       = linode_nodebalancer_config.http.id

  label   = "web-${count.index + 1}"
  address = "${linode_instance.web[count.index].private_ip_address}:8080"
  weight  = 100
  mode    = "accept"  # accept, reject, drain, backup
}
```

## TCP Pass-Through Configuration

```hcl
resource "linode_nodebalancer_config" "tcp" {
  nodebalancer_id = linode_nodebalancer.web.id
  port            = 8443
  protocol        = "tcp"
  algorithm       = "leastconn"

  check          = "connection"
  check_interval = 10
  check_timeout  = 5
  check_attempts = 3
}
```

## Conclusion

Linode NodeBalancers are simple to configure with OpenTofu. Define the NodeBalancer, add a configuration for each port you need (HTTP, HTTPS, or TCP), and attach backend nodes via their private IP addresses. Use the `mode` attribute on nodes to control traffic routing - `drain` gracefully removes a node from rotation during deployments.
