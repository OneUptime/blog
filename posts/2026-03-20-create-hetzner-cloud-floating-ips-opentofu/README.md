# How to Create Hetzner Cloud Floating IPs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Floating IP, Infrastructure as Code, Networking

Description: Learn how to create Hetzner Cloud Floating IPs with OpenTofu and assign them to servers for flexible, transferable public IP addresses.

Floating IPs in Hetzner Cloud are static public IP addresses that can be assigned and reassigned between servers. They are ideal for failover scenarios, maintenance windows, and zero-downtime server replacements. OpenTofu manages their creation and assignment as code.

## Creating a Floating IP

```hcl
resource "hcloud_floating_ip" "web" {
  type          = "ipv4"        # ipv4 or ipv6
  home_location = "nbg1"        # Home location for unassigned IP
  name          = "web-floating-ip"
  description   = "Public IP for web server failover"

  labels = {
    managed_by = "opentofu"
    role       = "web"
  }
}

output "floating_ip" {
  value = hcloud_floating_ip.web.ip_address
}
```

## Assigning a Floating IP to a Server

```hcl
resource "hcloud_server" "web" {
  name        = "web-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]
}

resource "hcloud_floating_ip_assignment" "web" {
  floating_ip_id = hcloud_floating_ip.web.id
  server_id      = hcloud_server.web.id
}
```

## Configuring the OS to Respond to the Floating IP

The OS must be configured to accept packets for the floating IP. Add this to your cloud-init `user_data`:

```hcl
resource "hcloud_server" "web" {
  name        = "web-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]

  user_data = templatefile("cloud-init.yaml", {
    floating_ip = hcloud_floating_ip.web.ip_address
  })
}
```

```yaml
# cloud-init.yaml

#cloud-config
runcmd:
  - ip addr add ${floating_ip}/32 dev eth0
  - ip route add ${floating_ip} dev eth0
```

## Failover Pattern: Reassigning a Floating IP

To move a floating IP to a different server, update the `server_id` in the assignment:

```hcl
variable "active_server_id" {
  description = "ID of the active server that should receive the floating IP"
  type        = number
}

resource "hcloud_floating_ip_assignment" "web" {
  floating_ip_id = hcloud_floating_ip.web.id
  server_id      = var.active_server_id
}
```

To fail over:

```bash
# Move IP to the standby server
tofu apply -var="active_server_id=<standby-server-id>"
```

## IPv6 Floating IP

```hcl
resource "hcloud_floating_ip" "web_v6" {
  type          = "ipv6"
  home_location = "nbg1"
  name          = "web-floating-ipv6"
}
```

## Conclusion

Hetzner Cloud Floating IPs provide stable public addresses that survive server replacements. Create them with OpenTofu, assign them via `hcloud_floating_ip_assignment`, and configure the OS to respond to the IP. For failover automation, parameterize the target server ID and update it with a quick `tofu apply`.
