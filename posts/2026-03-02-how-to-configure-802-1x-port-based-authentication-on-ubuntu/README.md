# How to Configure 802.1X Port-Based Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Security, 802.1X, Authentication

Description: Set up 802.1X port-based network access control on Ubuntu using FreeRADIUS and wpa_supplicant to authenticate devices before granting network access.

---

802.1X is the IEEE standard for port-based Network Access Control (NAC). Before a device can communicate on the network, it must authenticate through a RADIUS server. Unauthenticated devices are blocked or placed in a restricted VLAN. This is standard practice for enterprise wireless networks and increasingly common for wired access ports.

This guide covers two scenarios:
1. Setting up a FreeRADIUS authentication server on Ubuntu
2. Configuring an Ubuntu client to authenticate using 802.1X (wpa_supplicant for wired)

## How 802.1X Works

The 802.1X authentication flow involves three parties:

- **Supplicant**: The client device requesting access (your Ubuntu workstation or server)
- **Authenticator**: The network switch or wireless access point that enforces access control
- **Authentication Server**: The RADIUS server that validates credentials

When a device connects to a switch port configured for 802.1X:

1. The switch sends an EAP-Request/Identity message
2. The supplicant responds with its identity
3. The switch forwards the EAP exchange to the RADIUS server
4. The RADIUS server authenticates the client using the chosen EAP method
5. On success, the RADIUS server sends an Access-Accept and the switch opens the port
6. On failure, the switch either blocks the port or places it in a guest VLAN

## Part 1: Setting Up FreeRADIUS on Ubuntu

### Installing FreeRADIUS

```bash
sudo apt update
sudo apt install -y freeradius freeradius-utils

# Verify the installation
radiusd -v

# Start and enable FreeRADIUS
sudo systemctl start freeradius
sudo systemctl enable freeradius
sudo systemctl status freeradius
```

### Configuring FreeRADIUS Users

For a simple deployment, add users to the FreeRADIUS users file:

```bash
sudo nano /etc/freeradius/3.0/users
```

Add authentication entries:

```text
# Format: username  Cleartext-Password := "password"
# Followed by optional reply attributes

alice   Cleartext-Password := "alice_secure_password"
        Reply-Message = "Welcome, Alice",
        Tunnel-Type = 13,
        Tunnel-Medium-Type = 6,
        Tunnel-Private-Group-Id = "100"

bob     Cleartext-Password := "bob_secure_password"
        Reply-Message = "Welcome, Bob"
```

The Tunnel attributes assign a VLAN to authenticated users (VLAN 100 for Alice).

### Configuring the Switch as a RADIUS Client

FreeRADIUS needs to know which devices are authorized to send it RADIUS requests:

```bash
sudo nano /etc/freeradius/3.0/clients.conf
```

Add your switch as a client:

```text
client core-switch-01 {
    # Switch IP address
    ipaddr          = 192.168.1.254

    # Shared secret (must match the switch configuration)
    secret          = your_shared_secret_here

    # Short name for logging
    shortname       = core-sw01

    # Vendor type (helps with attribute parsing)
    nas_type        = cisco
}

# Add additional switches as needed
client access-switch-02 {
    ipaddr   = 192.168.1.253
    secret   = your_shared_secret_here
    shortname = access-sw02
}
```

### Configuring EAP (Extensible Authentication Protocol)

FreeRADIUS supports multiple EAP methods. EAP-TLS (certificate-based) is the most secure, while PEAP-MSCHAPv2 is more common because it only requires certificates on the server side.

For PEAP-MSCHAPv2, configure the EAP module:

```bash
sudo nano /etc/freeradius/3.0/mods-enabled/eap
```

Key settings in the eap module:

```text
eap {
    # Default EAP method if client does not specify
    default_eap_type = peap

    # Timer for incomplete EAP sessions
    timer_expire = 60

    # Ignored type (prevents certain attacks)
    ignore_unknown_eap_types = no

    # Allow certificate-based fallback
    cisco_accounting_username_bug = no

    md5 {
    }

    tls-config tls-common {
        # Path to server certificate and key
        private_key_password = whatever
        private_key_file = /etc/ssl/private/radius-server.key
        certificate_file = /etc/ssl/certs/radius-server.crt
        ca_file = /etc/ssl/certs/ca-certificates.crt

        # Allow only TLS 1.2 and above
        tls_min_version = "1.2"
    }

    peap {
        tls = tls-common
        default_method = mschapv2
        copy_request_to_tunnel = no
        use_tunneled_reply = no
    }

    mschapv2 {
    }
}
```

### Generating Server Certificates

```bash
# Create a directory for RADIUS certificates
sudo mkdir -p /etc/freeradius/3.0/certs
cd /etc/freeradius/3.0/certs

# FreeRADIUS includes a script to generate test certificates
sudo make

# This generates:
# ca.pem - CA certificate
# server.pem - Server certificate
# server.key - Server private key
```

For production, use certificates from your internal CA or a public CA.

### Testing FreeRADIUS

```bash
# Stop the service and run in debug mode
sudo systemctl stop freeradius
sudo freeradius -X 2>&1 | head -100

# In another terminal, test authentication
radtest alice alice_secure_password localhost 0 testing123
```

A successful authentication returns:

```text
Sent Access-Request Id 123 from 0.0.0.0:45678 to 127.0.0.1:1812 length 76
Received Access-Accept Id 123 from 127.0.0.1:1812 to 0.0.0.0:45678 length 38
```

```bash
# Start the service normally after testing
sudo systemctl start freeradius
```

## Part 2: Configuring Ubuntu as a 802.1X Supplicant

On Ubuntu workstations or servers that need to authenticate via 802.1X on wired connections, wpa_supplicant handles the EAP authentication.

### Installing wpa_supplicant

```bash
sudo apt install -y wpasupplicant
```

### Configuring wpa_supplicant for Wired 802.1X

Create a wpa_supplicant configuration file:

```bash
sudo nano /etc/wpa_supplicant/wpa_supplicant-eth0.conf
```

For PEAP-MSCHAPv2 (most common for wired):

```text
# /etc/wpa_supplicant/wpa_supplicant-eth0.conf

ctrl_interface=/run/wpa_supplicant
ctrl_interface_group=0

# Wired network entry
network={
    # Wired network does not have an SSID
    key_mgmt=IEEE8021X
    eap=PEAP
    identity="alice"
    password="alice_secure_password"

    # Phase 2 authentication (inside PEAP tunnel)
    phase2="auth=MSCHAPV2"

    # CA certificate to verify the RADIUS server
    ca_cert="/etc/ssl/certs/ca-certificates.crt"

    # Validate server certificate subject
    # subject_match="/CN=radius.example.com"

    # Phase 1 settings
    phase1="peaplabel=0"

    # EAP authentication for wired
    eapol_flags=0
}
```

For EAP-TLS (certificate-based, no password):

```text
network={
    key_mgmt=IEEE8021X
    eap=TLS
    identity="alice@example.com"

    # Client certificate
    client_cert="/etc/ssl/certs/alice-client.crt"
    private_key="/etc/ssl/private/alice-client.key"
    private_key_passwd="key_passphrase"

    # Server CA certificate
    ca_cert="/etc/ssl/certs/ca-certificates.crt"

    eapol_flags=0
}
```

### Running wpa_supplicant as a Service

```bash
# Create a systemd service for 802.1X on eth0
sudo systemctl enable wpa_supplicant@eth0
sudo systemctl start wpa_supplicant@eth0
sudo systemctl status wpa_supplicant@eth0
```

The service name `wpa_supplicant@eth0` automatically uses the config file at `/etc/wpa_supplicant/wpa_supplicant-eth0.conf`.

### Testing the Connection

```bash
# Monitor wpa_supplicant authentication
sudo wpa_cli -i eth0 status

# Watch the authentication in real time
journalctl -u wpa_supplicant@eth0 -f
```

A successful authentication shows:

```text
eth0: CTRL-EVENT-EAP-STARTED EAP authentication started
eth0: CTRL-EVENT-EAP-PROPOSED-METHOD vendor=0 method=25
eth0: CTRL-EVENT-EAP-METHOD EAP vendor 0 method 25 (PEAP) selected
eth0: CTRL-EVENT-EAP-SUCCESS EAP authentication completed successfully
eth0: CTRL-EVENT-CONNECTED - Connection to 02:00:00:00:01:00 completed
```

## Configuring 802.1X on the Switch

The switch configuration varies by vendor, but the general approach for a Cisco switch:

```text
! Enable AAA
aaa new-model
aaa authentication dot1x default group radius
aaa authorization network default group radius

! Configure RADIUS server
radius server FREERADIUS
 address ipv4 192.168.1.100 auth-port 1812 acct-port 1813
 key your_shared_secret_here

! Enable 802.1X globally
dot1x system-auth-control

! Configure an access port for 802.1X
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 200
 authentication port-control auto
 dot1x pae authenticator
 spanning-tree portfast
```

## Monitoring Authentication on FreeRADIUS

```bash
# View authentication logs
sudo tail -f /var/log/freeradius/radius.log

# Query authentication history
grep "Access-Accept" /var/log/freeradius/radius.log | tail -20
grep "Access-Reject" /var/log/freeradius/radius.log | tail -20
```

For failed authentications, run FreeRADIUS in debug mode to see the full EAP exchange and identify where authentication fails.

802.1X provides strong network access control that prevents unauthorized devices from connecting, even if they have physical access to a network port. Combined with VLAN assignment based on user identity, it gives you precise control over network segmentation without requiring per-port switch configuration changes.
