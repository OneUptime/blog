# How to Create Hetzner Cloud Networks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Private Network, Networking, Infrastructure as Code

Description: Learn how to create Hetzner Cloud private networks and subnets with OpenTofu and attach servers to them for private communication.

Hetzner Cloud Networks provide private networking for your servers within a project. Servers in the same network communicate over private IPs without traffic leaving Hetzner's infrastructure. OpenTofu lets you define networks, subnets, and server attachments as code.

## Creating a Network and Subnet

```hcl
# Create the private network

resource "hcloud_network" "main" {
  name     = "production-network"
  ip_range = "10.0.0.0/8"

  labels = {
    environment = "production"
    managed_by  = "opentofu"
  }
}

# Create a subnet within the network
resource "hcloud_network_subnet" "servers" {
  network_id   = hcloud_network.main.id
  type         = "cloud"  # "cloud" for Cloud servers, "vswitch" for bare metal
  network_zone = "eu-central"  # or "us-east"
  ip_range     = "10.0.1.0/24"
}
```

## Attaching Servers to the Network

```hcl
resource "hcloud_server" "app" {
  name        = "app-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]

  # Attach to the network and assign a specific private IP
  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.10"
  }

  # Ensure network is created before attaching
  depends_on = [hcloud_network_subnet.servers]
}
```

## Using hcloud_server_network for Post-Creation Attachment

Alternatively, attach a server to a network after creation:

```hcl
resource "hcloud_server" "web" {
  name        = "web-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]
}

resource "hcloud_server_network" "web" {
  server_id  = hcloud_server.web.id
  network_id = hcloud_network.main.id
  ip         = "10.0.1.20"
}

output "web_private_ip" {
  value = hcloud_server_network.web.ip
}
```

## Multi-Zone Network Setup

For high-availability architectures spanning Hetzner zones:

```hcl
resource "hcloud_network" "ha" {
  name     = "ha-network"
  ip_range = "10.0.0.0/8"
}

# EU Central subnet (Nuremberg, Falkenstein, Helsinki)
resource "hcloud_network_subnet" "eu_central" {
  network_id   = hcloud_network.ha.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

# US East subnet (Ashburn)
resource "hcloud_network_subnet" "us_east" {
  network_id   = hcloud_network.ha.id
  type         = "cloud"
  network_zone = "us-east"
  ip_range     = "10.0.2.0/24"
}
```

## Adding Routes

Define explicit routes for traffic forwarding within the network:

```hcl
resource "hcloud_network_route" "gateway" {
  network_id  = hcloud_network.main.id
  destination = "172.16.0.0/12"
  gateway     = "10.0.1.1"  # Private IP of a router/NAT server
}
```

## Conclusion

Hetzner Cloud Networks provide free, low-latency private networking between servers. Define a network with a broad CIDR, create subnets per zone, and attach servers either inline in the server resource or via separate `hcloud_server_network` resources. Routes enable advanced networking topologies like NAT gateways.
