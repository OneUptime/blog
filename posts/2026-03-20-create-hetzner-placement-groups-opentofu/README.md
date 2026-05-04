# How to Create Hetzner Cloud Placement Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Placement Group, High Availability, Infrastructure as Code

Description: Learn how to create Hetzner Cloud placement groups with OpenTofu to ensure servers are distributed across physical hosts for high availability.

Placement groups in Hetzner Cloud allow you to control how servers are distributed across physical hosts. The `spread` type ensures each server in the group is placed on a different physical host, preventing a single hardware failure from taking down multiple servers.

## Creating a Spread Placement Group

```hcl
resource "hcloud_placement_group" "ha_web" {
  name = "ha-web-group"
  type = "spread"  # "spread" is the only supported type currently

  labels = {
    environment = "production"
    role        = "web"
    managed_by  = "opentofu"
  }
}
```

## Creating Servers in a Placement Group

Assign servers to the placement group at creation time:

```hcl
resource "hcloud_server" "web" {
  count       = 3
  name        = "web-${count.index + 1}"
  image       = "ubuntu-24.04"
  server_type = "cx32"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]

  # Place each server on a different physical host
  placement_group_id = hcloud_placement_group.ha_web.id

  labels = {
    role  = "web"
    index = tostring(count.index)
  }
}
```

With `spread` type, Hetzner ensures these three servers are placed on three different physical hosts. If one host fails, only one of your three servers goes down.

## Using for_each with Placement Groups

```hcl
variable "web_servers" {
  type = map(string)
  default = {
    "web-a" = "nbg1"
    "web-b" = "nbg1"
    "web-c" = "nbg1"
  }
}

resource "hcloud_placement_group" "web" {
  name = "web-spread-group"
  type = "spread"
}

resource "hcloud_server" "web" {
  for_each = var.web_servers

  name               = each.key
  image              = "ubuntu-24.04"
  server_type        = "cx32"
  location           = each.value
  ssh_keys           = [hcloud_ssh_key.default.id]
  placement_group_id = hcloud_placement_group.web.id
}
```

## Placement Group Limitations

- Maximum of **10 servers** per placement group (type `spread`).
- Up to **50 placement groups** per project, and a server can belong to only **one** placement group at a time.
- Existing servers can be added to a placement group, but they must be **powered off** first.
- Servers in the same group are not required to be in the same location, but the `spread` type only protects against single-host failures, so it is best suited for servers in the same location.
- If no suitable physical host with available capacity exists, the server creation may fail.

## Checking Placement Group Usage

```hcl
output "placement_group_id" {
  value = hcloud_placement_group.ha_web.id
}

output "server_placement_groups" {
  value = { for k, s in hcloud_server.web : k => s.placement_group_id }
}
```

## Combining with Load Balancers

```hcl
resource "hcloud_load_balancer_target" "web" {
  load_balancer_id = hcloud_load_balancer.web.id
  type             = "label_selector"
  label_selector   = "role=web"
}
```

Since all web servers have the `role=web` label, the load balancer automatically includes them all regardless of how many are in the placement group.

## Conclusion

Placement groups are a free, lightweight way to improve the fault tolerance of Hetzner Cloud deployments. Create a `spread` group, assign servers to it at creation time, and ensure your load balancer targets are distributed across the group. Remember the 10-server limit and same-location requirement when planning your architecture.
