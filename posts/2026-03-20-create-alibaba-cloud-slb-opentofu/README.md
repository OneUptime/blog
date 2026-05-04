# How to Create Alibaba Cloud SLB Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, SLB, Load Balancer, Infrastructure as Code

Description: Learn how to create Alibaba Cloud SLB (Server Load Balancer) instances with OpenTofu, including listener rules, backend server groups, and health checks.

Alibaba Cloud SLB (Server Load Balancer) distributes incoming traffic across ECS instances. OpenTofu lets you define the load balancer, listeners, server groups, and health checks as code.

## Creating an SLB Instance

```hcl
resource "alicloud_slb_load_balancer" "web" {
  load_balancer_name = "web-slb"
  load_balancer_spec = "slb.s2.small"   # Performance-guaranteed instance
  address_type       = "internet"        # internet or intranet
  vswitch_id         = alicloud_vswitch.public_a.id
  payment_type       = "PayAsYouGo"

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "slb_ip" {
  value = alicloud_slb_load_balancer.web.address
}
```

## Creating a Backend Server Group

```hcl
resource "alicloud_slb_server_group" "web" {
  load_balancer_id = alicloud_slb_load_balancer.web.id
  name             = "web-server-group"
}

resource "alicloud_slb_server_group_server_attachment" "web" {
  count           = length(alicloud_instance.web)
  server_group_id = alicloud_slb_server_group.web.id
  server_id       = alicloud_instance.web[count.index].id
  port            = 8080
  weight          = 100
}
```

## Creating an HTTP Listener

```hcl
resource "alicloud_slb_listener" "http" {
  load_balancer_id          = alicloud_slb_load_balancer.web.id
  backend_port              = 8080
  frontend_port             = 80
  protocol                  = "http"
  bandwidth                 = -1  # -1 = unlimited for PayAsYouGo

  # Health check configuration
  health_check              = "on"
  health_check_uri          = "/health"
  health_check_connect_port = 8080
  health_check_http_code    = "http_2xx,http_3xx"
  health_check_interval     = 10
  health_check_timeout      = 5
  healthy_threshold         = 3
  unhealthy_threshold       = 3
}
```

## Creating an HTTPS Listener

```hcl
resource "alicloud_slb_server_certificate" "web" {
  name               = "web-cert"
  server_certificate = file("certs/server.crt")
  private_key        = var.ssl_private_key
}

resource "alicloud_slb_listener" "https" {
  load_balancer_id  = alicloud_slb_load_balancer.web.id
  backend_port      = 8080
  frontend_port     = 443
  protocol          = "https"
  bandwidth         = -1

  server_certificate_id  = alicloud_slb_server_certificate.web.id
  tls_cipher_policy      = "tls_cipher_policy_1_2"

  health_check              = "on"
  health_check_uri          = "/health"
  health_check_connect_port = 8080
  healthy_threshold         = 3
  unhealthy_threshold       = 3
}
```

## Internal Load Balancer

```hcl
resource "alicloud_slb_load_balancer" "internal" {
  load_balancer_name = "internal-slb"
  load_balancer_spec = "slb.s2.small"
  address_type       = "intranet"  # Private, no public IP
  vswitch_id         = alicloud_vswitch.private_a.id
  payment_type       = "PayAsYouGo"
}
```

## Conclusion

Alibaba Cloud SLB in OpenTofu uses `alicloud_slb_load_balancer` for the load balancer, `alicloud_slb_listener` for port and protocol configuration, and `alicloud_slb_server_group` with `alicloud_slb_server_group_server_attachment` for backend server management. Use `address_type = "intranet"` for internal load balancers that don't need public IP addresses.
