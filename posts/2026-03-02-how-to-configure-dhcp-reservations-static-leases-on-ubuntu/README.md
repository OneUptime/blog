# How to Configure DHCP Reservations (Static Leases) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Networking, Sysadmin, Configuration

Description: Configure DHCP reservations on Ubuntu to assign fixed IP addresses to specific devices by MAC address using ISC DHCP and ISC Kea, with practical examples.

---

DHCP reservations, also called static leases or fixed-address assignments, let you allocate a specific IP address to a device based on its MAC address. The device still goes through the normal DHCP process - it sends a DISCOVER, gets an OFFER, requests, and receives an ACK - but the DHCP server recognizes its MAC address and always hands out the same IP.

This is the preferred approach over manually configuring static IPs on the client because:
- All IP configuration stays centralized in the DHCP server
- The client still gets its gateway, DNS, and other options automatically
- You can change the assigned IP in one place without touching the client

This tutorial covers reservations in both ISC DHCP (the older dhcpd) and ISC Kea.

## Finding Device MAC Addresses

Before configuring reservations, you need the MAC address of each device. Several ways to find them:

```bash
# On the client machine, list network interfaces and their MAC addresses
ip link show

# Or use the older ifconfig
ifconfig -a | grep ether

# On the DHCP server, check the lease file to find already-assigned MACs
cat /var/lib/dhcp/dhcpd.leases

# Use arp to see devices that have recently communicated
arp -a

# Scan the network for MAC addresses
sudo apt install -y arp-scan
sudo arp-scan --localnet
```

MAC addresses are formatted as six groups of two hex digits (e.g., `aa:bb:cc:dd:ee:ff`).

## Reservations in ISC DHCP (dhcpd)

If you're running the classic `isc-dhcp-server`:

### Basic Reservation Syntax

The `host` declaration creates a reservation. It can appear inside or outside of subnet declarations:

```bash
sudo nano /etc/dhcp/dhcpd.conf
```

```text
# Global settings
default-lease-time 86400;
max-lease-time 604800;
option domain-name "local.example.com";
option domain-name-servers 192.168.1.10, 192.168.1.20;

# Main subnet
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option broadcast-address 192.168.1.255;
}

# DHCP Reservations
# Syntax: host <friendly-name> { hardware ethernet <mac>; fixed-address <ip>; }

host server1 {
    hardware ethernet aa:bb:cc:dd:ee:01;
    fixed-address 192.168.1.50;
}

host server2 {
    hardware ethernet aa:bb:cc:dd:ee:02;
    fixed-address 192.168.1.51;
}

host printer-office {
    hardware ethernet aa:bb:cc:dd:ee:03;
    fixed-address 192.168.1.30;
    # Override hostname for this client
    option host-name "printer-office";
}

host nas-storage {
    hardware ethernet aa:bb:cc:dd:ee:04;
    fixed-address 192.168.1.60;
    # Give this host a different DNS server
    option domain-name-servers 192.168.1.10;
    # Longer lease for stable infrastructure
    default-lease-time 604800;
}
```

### Reservations Outside the Dynamic Range

The fixed addresses in reservations don't have to be outside the dynamic pool, but it's cleaner to keep them separate. Configure your pool to start higher, leaving room for reservations at the low end:

```text
subnet 192.168.1.0 netmask 255.255.255.0 {
    # Dynamic pool starts at .100, reservations use .10-.99
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
}

# Reservations in the .10-.99 range
host server1 {
    hardware ethernet aa:bb:cc:dd:ee:01;
    fixed-address 192.168.1.10;
}
```

### Organizing Reservations in Separate Files

For large deployments with many reservations, include separate files to keep the configuration organized:

```bash
sudo nano /etc/dhcp/dhcpd.conf
```

Add at the end:

```text
# Include reservation files
include "/etc/dhcp/reservations/servers.conf";
include "/etc/dhcp/reservations/printers.conf";
include "/etc/dhcp/reservations/workstations.conf";
```

```bash
sudo mkdir /etc/dhcp/reservations

sudo nano /etc/dhcp/reservations/servers.conf
```

```text
# Server reservations
host server1 {
    hardware ethernet aa:bb:cc:dd:ee:01;
    fixed-address 192.168.1.50;
}

host db1 {
    hardware ethernet aa:bb:cc:dd:ee:05;
    fixed-address 192.168.1.60;
}
```

### Applying Changes

```bash
# Validate the configuration
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Restart the server
sudo systemctl restart isc-dhcp-server

# Or for just adding reservations, a reload is enough
sudo systemctl reload isc-dhcp-server
```

## Reservations in ISC Kea

Kea handles reservations differently from ISC DHCP. They're defined as JSON objects within the subnet configuration.

```bash
sudo nano /etc/kea/kea-dhcp4.conf
```

```json
{
  "Dhcp4": {
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "id": 1,
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],
        "option-data": [
          {
            "name": "routers",
            "data": "192.168.1.1"
          }
        ],
        "reservations": [
          {
            "hw-address": "aa:bb:cc:dd:ee:01",
            "ip-address": "192.168.1.50",
            "hostname": "server1"
          },
          {
            "hw-address": "aa:bb:cc:dd:ee:02",
            "ip-address": "192.168.1.51",
            "hostname": "server2"
          },
          {
            "hw-address": "aa:bb:cc:dd:ee:03",
            "ip-address": "192.168.1.30",
            "hostname": "printer-office",
            "option-data": [
              {
                "name": "domain-name-servers",
                "data": "192.168.1.10"
              }
            ]
          },
          {
            "hw-address": "aa:bb:cc:dd:ee:04",
            "ip-address": "192.168.1.60",
            "hostname": "nas-storage"
          }
        ]
      }
    ]
  }
}
```

### Adding Reservations via the Kea API

One advantage of Kea is that you can add reservations at runtime without restarting:

```bash
# Add a new reservation via the REST API
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{
    "command": "reservation-add",
    "service": ["dhcp4"],
    "arguments": {
      "reservation": {
        "subnet-id": 1,
        "hw-address": "aa:bb:cc:dd:ee:ff",
        "ip-address": "192.168.1.70",
        "hostname": "new-device"
      }
    }
  }'
```

```bash
# Query a reservation
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{
    "command": "reservation-get",
    "service": ["dhcp4"],
    "arguments": {
      "subnet-id": 1,
      "identifier-type": "hw-address",
      "identifier": "aa:bb:cc:dd:ee:ff"
    }
  }'
```

## Reservations with Database Backend in Kea

For large numbers of reservations, the database backend is much more manageable:

```bash
# Check database reservations
mysql -u kea -p kea -e "SELECT * FROM hosts;"

# Insert a reservation directly
mysql -u kea -p kea <<EOF
INSERT INTO hosts (dhcp_identifier, dhcp_identifier_type, dhcp4_subnet_id, ipv4_address, hostname)
VALUES (UNHEX('aabbccddeeff'), 0, 1, INET_ATON('192.168.1.80'), 'new-server');
EOF
```

Enable database reservations in the Kea config:

```json
"hosts-database": {
  "type": "mysql",
  "host": "localhost",
  "name": "kea",
  "user": "kea",
  "password": "keapassword"
},
"host-reservation-identifiers": ["hw-address", "client-id"],
```

## Testing Reservations

Verify a reservation is working:

```bash
# On the client machine, release and renew the DHCP lease
sudo dhclient -r eth0  # release
sudo dhclient eth0     # renew

# Check the assigned IP
ip addr show eth0

# On the server, check the lease file
grep "aa:bb:cc:dd:ee:01" /var/lib/dhcp/dhcpd.leases

# For Kea, query via API
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "lease4-get-all", "service": ["dhcp4"]}' \
  | python3 -m json.tool | grep -A5 "192.168.1.50"
```

## Bulk Managing Reservations

For managing many reservations, a simple script approach works well:

```bash
#!/bin/bash
# Generate Kea reservations from a CSV file
# CSV format: mac_address,ip_address,hostname,subnet_id
# Save as /usr/local/bin/add-dhcp-reservation.sh

CSV_FILE="$1"
API_URL="http://127.0.0.1:8000/"

while IFS=',' read -r mac ip hostname subnet_id; do
    echo "Adding reservation: $hostname ($mac -> $ip)"
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"command\": \"reservation-add\",
        \"service\": [\"dhcp4\"],
        \"arguments\": {
          \"reservation\": {
            \"subnet-id\": $subnet_id,
            \"hw-address\": \"$mac\",
            \"ip-address\": \"$ip\",
            \"hostname\": \"$hostname\"
          }
        }
      }" | python3 -m json.tool
done < "$CSV_FILE"
```

DHCP reservations are one of those features that save considerable time in operations - keeping a record of which device has which IP in the DHCP server rather than scattered across device configurations makes auditing and troubleshooting much more straightforward.
