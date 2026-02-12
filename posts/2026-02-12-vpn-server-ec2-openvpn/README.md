# How to Set Up a VPN Server on EC2 with OpenVPN

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, VPN, OpenVPN, Security

Description: Step-by-step guide to deploying your own OpenVPN server on EC2 for secure remote access, private browsing, and connecting to AWS resources from anywhere.

---

Running your own VPN server on EC2 has several advantages over commercial VPN services. You control the server, you control the logs, and you can use it to securely access resources in your AWS VPC. It's also useful for giving remote team members secure access to internal services without exposing them to the public internet.

OpenVPN is the most widely-used open-source VPN solution. It's battle-tested, works on every platform, and has a well-understood security model. Let's set it up.

## Instance Setup

A VPN server doesn't need much compute power. A t3.micro or t3.small is plenty for most teams.

Launch an instance for the VPN server:

```bash
# Create security group
aws ec2 create-security-group \
  --group-name openvpn-sg \
  --description "OpenVPN server" \
  --vpc-id vpc-0abc123

# Allow SSH and OpenVPN (UDP 1194)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol udp --port 1194 --cidr 0.0.0.0/0

# Launch the instance
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123public \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=openvpn-server}]'
```

Critically, you need to disable source/destination check on the VPN instance so it can route traffic. For details on why this matters, see our post on [configuring source/destination check for NAT](https://oneuptime.com/blog/post/configure-source-destination-check-ec2-nat/view).

```bash
# Disable source/destination check
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123vpn \
  --no-source-dest-check
```

Also, allocate an Elastic IP so the VPN server address doesn't change:

```bash
# Allocate and associate an Elastic IP
aws ec2 allocate-address --domain vpc
aws ec2 associate-address \
  --instance-id i-0abc123vpn \
  --allocation-id eipalloc-0abc123
```

## Installing OpenVPN

SSH into your instance and install OpenVPN along with Easy-RSA for certificate management.

Install the required packages:

```bash
# Install EPEL repository (for OpenVPN on Amazon Linux)
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install OpenVPN and Easy-RSA
sudo yum install -y openvpn easy-rsa

# On Ubuntu:
# sudo apt install -y openvpn easy-rsa
```

## Setting Up the Certificate Authority

VPN security relies on certificates. Easy-RSA provides the tools to create and manage them.

Initialize the PKI and create certificates:

```bash
# Set up Easy-RSA
mkdir -p ~/easy-rsa
ln -s /usr/share/easy-rsa/3/* ~/easy-rsa/
cd ~/easy-rsa

# Initialize the PKI
./easyrsa init-pki

# Build the CA (Certificate Authority)
./easyrsa build-ca nopass
# Enter a Common Name when prompted, like "OpenVPN-CA"

# Generate server certificate and key
./easyrsa gen-req server nopass
./easyrsa sign-req server server
# Confirm with 'yes'

# Generate Diffie-Hellman parameters (this takes a while)
./easyrsa gen-dh

# Generate TLS authentication key
openvpn --genkey secret ~/easy-rsa/pki/ta.key
```

## Configuring the OpenVPN Server

Create the server configuration file.

Write the OpenVPN server config:

```bash
sudo cat > /etc/openvpn/server/server.conf << 'EOF'
# Server network settings
port 1194
proto udp
dev tun

# Certificate and key paths
ca /home/ec2-user/easy-rsa/pki/ca.crt
cert /home/ec2-user/easy-rsa/pki/issued/server.crt
key /home/ec2-user/easy-rsa/pki/private/server.key
dh /home/ec2-user/easy-rsa/pki/dh.pem
tls-auth /home/ec2-user/easy-rsa/pki/ta.key 0

# VPN subnet for clients
server 10.8.0.0 255.255.255.0

# Route all client traffic through VPN
push "redirect-gateway def1 bypass-dhcp"

# Push DNS servers to clients
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Push VPC routes to clients (adjust for your VPC CIDR)
push "route 10.0.0.0 255.255.0.0"

# Keep connections alive
keepalive 10 120

# Encryption settings
cipher AES-256-GCM
auth SHA256

# Run as unprivileged user
user nobody
group nobody

# Persist key and tunnel across restarts
persist-key
persist-tun

# Logging
status /var/log/openvpn/openvpn-status.log
log-append /var/log/openvpn/openvpn.log
verb 3

# Max clients
max-clients 20
EOF

# Create log directory
sudo mkdir -p /var/log/openvpn
```

## Enabling IP Forwarding and NAT

The VPN server needs to forward packets and masquerade them, just like a NAT instance.

Enable forwarding and NAT:

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-vpn.conf

# Set up NAT with iptables
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Make iptables rules persistent
sudo yum install -y iptables-services
sudo service iptables save
sudo systemctl enable iptables
```

## Starting OpenVPN

Start and enable the OpenVPN service:

```bash
# Start OpenVPN
sudo systemctl start openvpn-server@server
sudo systemctl enable openvpn-server@server

# Check status
sudo systemctl status openvpn-server@server

# View logs
sudo tail -f /var/log/openvpn/openvpn.log
```

## Creating Client Certificates

Each VPN user gets their own certificate. This lets you revoke individual access without affecting other users.

Generate a client certificate:

```bash
cd ~/easy-rsa

# Generate client certificate
./easyrsa gen-req client1 nopass
./easyrsa sign-req client client1
# Confirm with 'yes'
```

## Creating Client Configuration Files

Build a complete .ovpn file that clients can import directly into their VPN client.

Create a script to generate client configs:

```bash
#!/bin/bash
# /home/ec2-user/make-client-config.sh
# Usage: ./make-client-config.sh client_name

CLIENT=$1
VPN_SERVER_IP="YOUR_ELASTIC_IP"
OUTPUT_DIR="/home/ec2-user/client-configs"
PKI_DIR="/home/ec2-user/easy-rsa/pki"

mkdir -p $OUTPUT_DIR

cat > $OUTPUT_DIR/$CLIENT.ovpn << EOF
client
dev tun
proto udp
remote $VPN_SERVER_IP 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
verb 3

<ca>
$(cat $PKI_DIR/ca.crt)
</ca>

<cert>
$(cat $PKI_DIR/issued/$CLIENT.crt)
</cert>

<key>
$(cat $PKI_DIR/private/$CLIENT.key)
</key>

<tls-auth>
$(cat $PKI_DIR/ta.key)
</tls-auth>
EOF

echo "Client config created: $OUTPUT_DIR/$CLIENT.ovpn"
```

Generate the config:

```bash
chmod +x /home/ec2-user/make-client-config.sh
./make-client-config.sh client1
```

Transfer the .ovpn file to the client device securely (SCP, encrypted email, etc.) and import it into an OpenVPN client application.

## Revoking Client Access

When someone leaves the team or loses their device, revoke their certificate:

```bash
cd ~/easy-rsa

# Revoke the certificate
./easyrsa revoke client1

# Generate updated CRL (Certificate Revocation List)
./easyrsa gen-crl

# Copy CRL to OpenVPN directory
sudo cp ~/easy-rsa/pki/crl.pem /etc/openvpn/server/
```

Add the CRL to the server config:

```bash
# Add this line to server.conf
echo "crl-verify /etc/openvpn/server/crl.pem" | sudo tee -a /etc/openvpn/server/server.conf

# Restart OpenVPN
sudo systemctl restart openvpn-server@server
```

## Accessing VPC Resources Through the VPN

The `push "route 10.0.0.0 255.255.0.0"` directive in the server config tells connected clients how to reach your VPC. But you also need to update VPC routing so return traffic knows how to get back to VPN clients.

Update the VPC route tables for VPN client traffic:

```bash
# Add a route in your VPC route table for VPN client traffic
aws ec2 create-route \
  --route-table-id rtb-0abc123 \
  --destination-cidr-block 10.8.0.0/24 \
  --instance-id i-0abc123vpn
```

Now VPN clients can reach any resource in your VPC, and those resources can respond back.

## Monitoring and Logging

Keep an eye on your VPN server's health and connections.

Check connected clients:

```bash
# View currently connected clients
sudo cat /var/log/openvpn/openvpn-status.log

# Count active connections
grep "^10.8.0" /var/log/openvpn/openvpn-status.log | wc -l
```

Set up log rotation:

```bash
sudo cat > /etc/logrotate.d/openvpn << 'EOF'
/var/log/openvpn/*.log {
    weekly
    missingok
    rotate 12
    compress
    notifempty
    postrotate
        systemctl restart openvpn-server@server
    endscript
}
EOF
```

For comprehensive VPN server monitoring, including connection counts, bandwidth usage, and server health, check out [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

Running your own OpenVPN server on EC2 gives you a secure, controlled VPN that you fully own. The setup involves creating a PKI, configuring the server, enabling NAT, and generating client configurations. The whole thing runs comfortably on a t3.micro instance and costs under $10/month. For teams that need secure access to AWS resources or a reliable VPN for remote work, it's a great self-hosted alternative to commercial VPN services.
