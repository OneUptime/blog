# How to Create OCI Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Oracle Cloud, Load Balancer, OCI, Infrastructure as Code

Description: Learn how to create OCI Load Balancers with OpenTofu, including backend sets, listeners, and health checks for production traffic distribution.

OCI Load Balancers distribute traffic across compute instances. OpenTofu lets you define the load balancer, backend sets (pools), listeners, and routing policies as code.

## Creating a Load Balancer

```hcl
resource "oci_load_balancer_load_balancer" "web" {
  compartment_id = var.compartment_id
  display_name   = "web-lb"
  shape          = "flexible"
  subnet_ids     = [oci_core_subnet.public.id]
  is_private     = false  # false = public, true = private/internal

  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 100
  }

  freeform_tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "lb_ip" {
  value = oci_load_balancer_load_balancer.web.ip_address_details[0].ip_address
}
```

## Creating a Backend Set

```hcl
resource "oci_load_balancer_backend_set" "web" {
  load_balancer_id = oci_load_balancer_load_balancer.web.id
  name             = "web-backend-set"
  policy           = "ROUND_ROBIN"  # ROUND_ROBIN, LEAST_CONNECTIONS, IP_HASH

  health_checker {
    protocol            = "HTTP"
    port                = 8080
    url_path            = "/health"
    interval_ms         = 10000
    timeout_in_millis   = 3000
    retries             = 3
    return_code         = 200
  }
}
```

## Adding Backend Servers

```hcl
resource "oci_load_balancer_backend" "web" {
  count            = length(oci_core_instance.web)
  load_balancer_id = oci_load_balancer_load_balancer.web.id
  backendset_name  = oci_load_balancer_backend_set.web.name
  ip_address       = oci_core_instance.web[count.index].private_ip
  port             = 8080
  weight           = 1
  backup           = false
  drain            = false
  offline          = false
}
```

## Creating an HTTP Listener

```hcl
resource "oci_load_balancer_listener" "http" {
  load_balancer_id         = oci_load_balancer_load_balancer.web.id
  name                     = "http-listener"
  default_backend_set_name = oci_load_balancer_backend_set.web.name
  port                     = 80
  protocol                 = "HTTP"

  # Redirect HTTP to HTTPS
  rule_set_names = [oci_load_balancer_rule_set.https_redirect.name]
}
```

## HTTPS Listener with Certificate

```hcl
resource "oci_load_balancer_certificate" "web" {
  load_balancer_id   = oci_load_balancer_load_balancer.web.id
  certificate_name   = "web-cert"
  public_certificate = file("certs/server.crt")
  private_key        = var.ssl_private_key
  ca_certificate     = file("certs/ca.crt")
}

resource "oci_load_balancer_listener" "https" {
  load_balancer_id         = oci_load_balancer_load_balancer.web.id
  name                     = "https-listener"
  default_backend_set_name = oci_load_balancer_backend_set.web.name
  port                     = 443
  protocol                 = "HTTP"

  ssl_configuration {
    certificate_name        = oci_load_balancer_certificate.web.certificate_name
    verify_peer_certificate = false
  }
}
```

## HTTP to HTTPS Redirect Rule

```hcl
resource "oci_load_balancer_rule_set" "https_redirect" {
  load_balancer_id = oci_load_balancer_load_balancer.web.id
  name             = "https-redirect"

  items {
    action = "REDIRECT"
    conditions {
      attribute_name  = "PATH"
      attribute_value = "/"
      operator        = "FORCE_LONGEST_PREFIX_MATCH"
    }
    redirect_uri {
      protocol = "HTTPS"
      port     = 443
    }
    response_code = 301
  }
}
```

## Conclusion

OCI Load Balancers require defining the load balancer, at least one backend set with health checks, backends for each compute instance, and listeners for each port. Use flexible shapes to control bandwidth, add SSL certificates for HTTPS termination, and use rule sets for HTTP-to-HTTPS redirects and path-based routing.
