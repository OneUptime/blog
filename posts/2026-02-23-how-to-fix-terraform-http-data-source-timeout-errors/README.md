# How to Fix Terraform http Data Source Timeout Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Data Source

Description: Fix Terraform HTTP data source timeout errors by configuring timeouts, handling SSL issues, managing proxy settings, and working with authentication.

---

The `http` data source in Terraform makes HTTP requests during the plan phase to fetch data from web endpoints. It is commonly used for health checks, fetching configuration from APIs, and retrieving metadata. When the target endpoint is slow, unreachable, or returns errors, you get timeout or connection errors that block your entire Terraform plan. This guide covers the common issues and their fixes.

## The Error

HTTP data source timeout errors look like this:

```text
Error: Error making request

  on main.tf line 1, in data "http" "api_config":
   1: data "http" "api_config" {

Error making request: Get "https://api.example.com/config":
dial tcp 203.0.113.1:443: i/o timeout
```

Or:

```text
Error: Error making request

Error making request: Get "https://api.example.com/config":
context deadline exceeded (Client.Timeout exceeded while awaiting headers)
```

## Understanding the http Data Source

The `http` data source is part of the `hashicorp/http` provider. It makes a simple HTTP request and returns the response:

```hcl
data "http" "example" {
  url = "https://api.example.com/config"

  request_headers = {
    Accept = "application/json"
  }
}

output "response" {
  value = data.http.example.response_body
}
```

By default, it has a 10-second timeout and follows redirects.

## Fix 1: Increase the Timeout

The default timeout might be too short for slow APIs:

```hcl
data "http" "api_config" {
  url = "https://api.example.com/config"

  # Increase timeout to 60 seconds
  request_timeout_ms = 60000

  request_headers = {
    Accept = "application/json"
  }
}
```

Note: The `request_timeout_ms` argument was added in version 3.2.0 of the HTTP provider. If you are on an older version, upgrade:

```hcl
terraform {
  required_providers {
    http = {
      source  = "hashicorp/http"
      version = ">= 3.2.0"
    }
  }
}
```

## Fix 2: Network Connectivity Issues

If the endpoint is not reachable from where Terraform runs, no timeout configuration will help. Verify connectivity:

```bash
# Test from the machine running Terraform
curl -v https://api.example.com/config

# Check DNS resolution
nslookup api.example.com

# Check if the port is open
nc -zv api.example.com 443
```

Common network issues:

- **VPN not connected** - The API might be on a private network
- **Firewall blocking** - Security groups or network ACLs might block outbound traffic
- **DNS resolution failure** - The hostname might not resolve in your environment

## Fix 3: Proxy Configuration

Behind a corporate proxy, HTTP requests fail unless the proxy is configured:

```bash
# Set proxy environment variables before running Terraform
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1,169.254.169.254
```

The `http` data source respects standard proxy environment variables.

## Fix 4: SSL/TLS Certificate Issues

Certificate verification failures look like:

```text
Error: Error making request

Error making request: Get "https://api.example.com/config":
x509: certificate signed by unknown authority
```

**If the endpoint uses a self-signed certificate:**

```hcl
data "http" "api_config" {
  url = "https://api.example.com/config"

  # Skip TLS verification (use only for trusted internal endpoints)
  insecure = true
}
```

**If you have a custom CA certificate:**

```hcl
data "http" "api_config" {
  url = "https://api.example.com/config"

  ca_cert_pem = file("${path.module}/certs/ca.pem")
}
```

Or set the environment variable:

```bash
export SSL_CERT_FILE=/path/to/ca-bundle.crt
```

## Fix 5: Authentication Issues

If the API requires authentication, unauthenticated requests might hang or return errors:

```hcl
# Basic authentication
data "http" "api_config" {
  url = "https://api.example.com/config"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Basic ${base64encode("${var.api_user}:${var.api_password}")}"
  }
}

# Bearer token authentication
data "http" "api_config" {
  url = "https://api.example.com/config"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.api_token}"
  }
}
```

## Fix 6: Handle Non-200 Responses

By default, the `http` data source does not error on non-200 status codes. But your downstream code might fail if it expects specific content:

```hcl
data "http" "api_config" {
  url = "https://api.example.com/config"

  request_headers = {
    Accept = "application/json"
  }
}

# Check the status code
locals {
  api_success = data.http.api_config.status_code == 200
  config      = local.api_success ? jsondecode(data.http.api_config.response_body) : {}
}

# Or use a lifecycle postcondition
data "http" "api_config_strict" {
  url = "https://api.example.com/config"

  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "API returned status ${self.status_code}: ${self.response_body}"
    }
  }
}
```

## Fix 7: Retry Logic

The `http` data source does not have built-in retry logic. If the API is occasionally flaky, you have a few options:

**Option 1: Use the `retry` block (if supported by your provider version):**

```hcl
data "http" "api_config" {
  url = "https://api.example.com/config"

  retry {
    attempts     = 3
    min_delay_ms = 1000
    max_delay_ms = 10000
  }
}
```

**Option 2: Use an external data source with retry logic:**

```hcl
data "external" "api_config" {
  program = ["bash", "${path.module}/scripts/fetch_with_retry.sh"]

  query = {
    url     = "https://api.example.com/config"
    retries = "3"
  }
}
```

```bash
#!/bin/bash
# fetch_with_retry.sh
INPUT=$(cat)
URL=$(echo "$INPUT" | jq -r '.url')
RETRIES=$(echo "$INPUT" | jq -r '.retries')

for i in $(seq 1 "$RETRIES"); do
    RESPONSE=$(curl -s -o /tmp/response -w "%{http_code}" "$URL" 2>/dev/null)
    if [ "$RESPONSE" = "200" ]; then
        BODY=$(cat /tmp/response)
        echo "{\"status\": \"200\", \"body\": $(echo "$BODY" | jq -c '.' | jq -Rs .)}"
        exit 0
    fi
    echo "Attempt $i failed with status $RESPONSE, retrying..." >&2
    sleep 2
done

echo "All $RETRIES attempts failed" >&2
exit 1
```

## Fix 8: Endpoint Not Ready Yet

A common scenario: you create a load balancer and immediately try to health check it:

```hcl
resource "aws_lb" "main" {
  name               = "web-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}

# This fails because the LB is not ready yet
data "http" "health_check" {
  url = "http://${aws_lb.main.dns_name}/health"
}
```

The data source runs during plan or early in apply, but the load balancer DNS might not be propagated yet.

**Fix:** Use a check block instead, which runs after apply:

```hcl
check "lb_health" {
  data "http" "health_check" {
    url = "http://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.health_check.status_code == 200
    error_message = "Load balancer health check failed"
  }
}
```

Or use a `null_resource` with a provisioner that waits:

```hcl
resource "null_resource" "wait_for_lb" {
  depends_on = [aws_lb.main]

  provisioner "local-exec" {
    command = <<-EOT
      for i in $(seq 1 30); do
        if curl -s -o /dev/null -w "%%{http_code}" "http://${aws_lb.main.dns_name}/health" | grep -q "200"; then
          echo "LB is healthy"
          exit 0
        fi
        echo "Waiting for LB... attempt $i"
        sleep 10
      done
      echo "LB did not become healthy"
      exit 1
    EOT
  }
}
```

## Fix 9: Rate Limiting

If you make too many HTTP requests (multiple data sources hitting the same API), you might get rate-limited:

```text
Error: Error making request

Error making request: Get "https://api.example.com/config":
unexpected status code 429: Too Many Requests
```

**Fix:** Reduce the number of HTTP data source calls or add delays:

```hcl
# Instead of multiple data sources
# Fetch everything in one call
data "http" "all_config" {
  url = "https://api.example.com/all-config"
}

locals {
  all_config  = jsondecode(data.http.all_config.response_body)
  web_config  = local.all_config.web
  api_config  = local.all_config.api
  db_config   = local.all_config.database
}
```

## Fix 10: IPv6 vs IPv4 Issues

Some endpoints resolve to IPv6 addresses that might not be routable from your network:

```bash
# Force IPv4
curl -4 https://api.example.com/config
```

This is harder to control in the Terraform HTTP data source. If IPv6 is the issue, ensure your DNS resolution prefers IPv4 or configure your network to support IPv6.

## Conclusion

HTTP data source timeouts in Terraform are caused by network connectivity issues, slow endpoints, SSL problems, or missing authentication. Start debugging by testing the URL with `curl` from the same machine that runs Terraform. If `curl` works but Terraform does not, check proxy settings and SSL configuration. For endpoints that might not be ready during plan time, use check blocks instead of data sources. And always add timeout configuration and error handling to make your HTTP data source usage resilient.
