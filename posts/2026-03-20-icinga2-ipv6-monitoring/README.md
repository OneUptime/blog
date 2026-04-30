# How to Configure Icinga2 for IPv6 Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Icinga2, IPv6, Monitoring, Network, ICMP, Service Checks

Description: A guide to configuring Icinga2 to monitor IPv6 hosts and services, including host object definitions, check commands, and apply rules.

Icinga2 provides full IPv6 support through its plugin check commands and host/service configuration DSL. IPv6 addresses can be used directly as `address6` attributes on host objects, enabling precise address family selection for checks.

## Step 1: Confirm the API Listener Can Bind to IPv6

Host and service checks do not require a separate global IPv6 switch. If you use the Icinga2 API or cluster features, the `ApiListener` binds to `::` by default when `bind_host` is omitted on IPv6-capable systems.

```bash
# Verify the API feature configuration if you use the Icinga 2 API or cluster
cat /etc/icinga2/features-enabled/api.conf
```

```text
# /etc/icinga2/features-enabled/api.conf
object ApiListener "api" {
  # bind_host is optional; when omitted, Icinga 2 binds to :: by default
  bind_port = 5665
}
```

## Step 2: Define IPv6 Hosts

```icinga2
# /etc/icinga2/conf.d/ipv6-hosts.conf - Host objects with IPv6 addresses

object Host "web-01" {
  display_name = "Web Server 01"
  # IPv4 address (primary)
  address  = "10.0.1.10"
  # IPv6 address (for IPv6 checks)
  address6 = "2001:db8::10"

  vars.os = "Linux"
  vars.http_uri = "/"

  check_command = "hostalive"  # Default host check prefers address and falls back to address6
}

object Host "ipv6-only-host" {
  display_name = "IPv6-Only Server"
  # Only IPv6 address defined
  address6 = "2001:db8::20"

  # Use hostalive6 to check via IPv6
  check_command = "hostalive6"
}
```

## Step 3: Configure IPv6 Check Commands

```icinga2
# /etc/icinga2/conf.d/commands-ipv6.conf - Use built-in IPv6-aware commands

# hostalive6 and ping6 are built in and use the host's address6 attribute.

# On current Icinga 2 releases, use the built-in curl CheckCommand for HTTP over IPv6.
template Service "generic-http-ipv6-service" {
  import "generic-service"
  check_command = "curl"
  vars.curl_ipv6 = true
}
```

## Step 4: Apply Service Rules for IPv6 Hosts

```icinga2
# /etc/icinga2/conf.d/ipv6-services.conf - Apply rules for IPv6 monitoring

# Apply HTTP check to hosts with IPv6 address and http_uri defined
apply Service "HTTP IPv6" {
  import "generic-http-ipv6-service"
  vars.curl_ip = host.address6
  vars.curl_url = host.vars.http_uri
  assign where host.address6 && host.vars.http_uri
}

# Apply ICMP IPv6 check to all hosts with an IPv6 address
apply Service "ICMP IPv6 Ping" {
  import "generic-service"
  check_command = "ping6"
  check_interval = 1m
  assign where host.address6
}

# Apply SSH check to Linux IPv6 hosts
apply Service "SSH IPv6" {
  import "generic-service"
  check_command = "ssh"
  vars.ssh_address = host.address6
  vars.ssh_ipv6 = true
  assign where host.address6 && host.vars.os == "Linux"
}
```

## Step 5: Dual-Stack Monitoring

Monitor both IPv4 and IPv6 independently to detect address-family-specific issues. The `HTTP IPv6` service from Step 4 can run alongside a separate IPv4 service:

```icinga2
# Add a separate IPv4 service alongside the existing HTTP IPv6 service
apply Service "HTTP IPv4" {
  import "generic-service"
  check_command = "curl"
  vars.curl_ip = host.address
  vars.curl_url = host.vars.http_uri
  vars.curl_ipv4 = true
  assign where host.address && host.vars.http_uri
}
```

## Step 6: Validate and Reload

```bash
# Check configuration syntax
sudo icinga2 daemon -C

# Reload Icinga2
sudo systemctl reload icinga2

# Replace root:icinga with an API user from /etc/icinga2/conf.d/api-users.conf if needed
curl -k -s -u root:icinga \
  'https://localhost:5665/v1/objects/hosts/ipv6-only-host?attrs=name&attrs=address6&pretty=1'
```

## Step 7: Add Notification for IPv6 Failures

```icinga2
apply Notification "ipv6-alert" to Host {
  import "mail-host-notification"
  user_groups = ["admins"]
  assign where host.address6
}
```

Icinga2's `address6` host attribute and `apply` rules make it straightforward to build comprehensive dual-stack monitoring that tracks IPv4 and IPv6 independently, surfacing address-family-specific failures clearly.
