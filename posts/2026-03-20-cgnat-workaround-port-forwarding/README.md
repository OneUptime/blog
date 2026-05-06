# How to Work Around CGNAT for Port Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, CGNAT, IPv4, Tunneling

Description: Learn practical methods to expose services to the internet when behind Carrier-Grade NAT using tunnels, VPS relays, and VPN services.

## The CGNAT Challenge

When behind CGNAT, you cannot directly accept inbound connections because:
- Your router's WAN IP is often from the shared address space 100.64.0.0/10
- Port forwarding on your router doesn't expose you to the internet
- The ISP controls the outer NAT and won't forward ports to you

## Solution 1: Request a Public IP from Your ISP

The simplest solution - contact your ISP and ask for a static or dynamic public IP. Many ISPs offer this as an upgrade or for a small fee.

## Solution 2: VPS Relay with frp (Fast Reverse Proxy)

frp is a fast reverse proxy for exposing local services behind NAT/firewalls.

### Setup

```bash
# On your VPS (has public IP 203.0.113.1):

# Download frp
wget https://github.com/fatedier/frp/releases/latest/download/frp_linux_amd64.tar.gz
tar -xzf frp_linux_amd64.tar.gz
cd frp_*_linux_amd64

# frps.toml (server config on VPS)
cat > frps.toml << 'CONF'
bindPort = 7000
auth.token = "your_secret_token"
CONF

./frps -c frps.toml
```

```bash
# On your home machine (behind CGNAT):
# Download frp
wget https://github.com/fatedier/frp/releases/latest/download/frp_linux_amd64.tar.gz
tar -xzf frp_linux_amd64.tar.gz
cd frp_*_linux_amd64

# frpc.toml (client config)
cat > frpc.toml << 'CONF'
serverAddr = "203.0.113.1"
serverPort = 7000
auth.token = "your_secret_token"

[[proxies]]
name = "web"
type = "tcp"
localIP = "127.0.0.1"
localPort = 80
remotePort = 8080
CONF

./frpc -c frpc.toml
# Now: 203.0.113.1:8080 → your home machine:80
```

## Solution 3: ngrok (Easy Tunnel Service)

```bash
# Install ngrok
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update
sudo apt install ngrok

# Authenticate
ngrok config add-authtoken YOUR_TOKEN

# Expose local port 80
ngrok http 80

# ngrok provides a public URL like: https://random-subdomain.ngrok-free.app
```

## Solution 4: SSH Reverse Tunnel via VPS

```bash
# On your home machine: create a reverse tunnel to your VPS
# This exposes home machine port 80 as VPS port 8080
ssh -N -R 0.0.0.0:8080:localhost:80 user@203.0.113.1

# On VPS, also ensure:
# GatewayPorts yes  (in /etc/ssh/sshd_config)

# Test from internet:
curl http://203.0.113.1:8080
```

### Persistent Reverse Tunnel with autossh

```bash
# Install autossh
apt install autossh

# Auto-reconnecting reverse tunnel
autossh -M 0 -N -f \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -R 0.0.0.0:8080:localhost:80 \
    user@203.0.113.1
```

## Solution 5: WireGuard VPN with Port Forwarding

```bash
# On VPS: install WireGuard server
# On home: install WireGuard client
# Forward ports through the VPN tunnel

# After WireGuard is set up on VPS (10.0.0.1):
# Enable IPv4 forwarding on the VPS
sysctl -w net.ipv4.ip_forward=1

# Forward VPS:8080 → client tunnel IP 10.0.0.2:80
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 10.0.0.2:80
iptables -A FORWARD -p tcp -d 10.0.0.2 --dport 80 -j ACCEPT
iptables -A FORWARD -i wg0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -t nat -A POSTROUTING -o wg0 -p tcp -d 10.0.0.2 --dport 80 -j SNAT --to-source 10.0.0.1
```

## Solution 6: Cloudflare Tunnel (Free)

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate with Cloudflare
# Requires a domain on Cloudflare for myservice.example.com
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create home-tunnel

# Configure
# Replace <TUNNEL-UUID> and /path/to with values from your system
cat > ~/.cloudflared/config.yml << 'CONF'
tunnel: <TUNNEL-UUID>
credentials-file: /path/to/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: myservice.example.com
    service: http://localhost:80
  - service: http_status:404
CONF

cloudflared tunnel route dns home-tunnel myservice.example.com
cloudflared tunnel run home-tunnel
```

## Comparison

| Solution | Cost | Setup | HTTPS | Custom Domain |
|----------|------|-------|-------|---------------|
| ISP Public IP | Varies | Easy | Manual | Yes |
| frp + VPS | VPS cost | Medium | Manual | Yes |
| ngrok | Free/Paid | Very Easy | Yes | Paid |
| SSH Reverse | VPS cost | Easy | Manual | Yes |
| Cloudflare Tunnel | Free | Medium | Yes | Yes |

## Key Takeaways

- CGNAT blocks direct inbound connections; use relay/tunnel solutions.
- frp is a popular self-hosted option, and ngrok is a popular SaaS tunnel option.
- SSH reverse tunnels work with any VPS without extra software.
- Cloudflare Tunnel is free and provides HTTPS for web services.

**Related Reading:**

- [How to Detect If You Are Behind Carrier-Grade NAT (CGNAT)](https://oneuptime.com/blog/post/2026-03-20-detect-cgnat/view)
- [How to Understand NAT Types (Full Cone, Restricted, Symmetric)](https://oneuptime.com/blog/post/2026-03-20-nat-types-full-cone/view)
- [How to Configure NAT for VPN Passthrough](https://oneuptime.com/blog/post/2026-03-20-nat-vpn-passthrough/view)
