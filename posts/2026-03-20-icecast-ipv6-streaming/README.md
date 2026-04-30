# How to Configure Icecast with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Icecast, IPv6, Audio Streaming, Internet Radio, Linux, Self-Hosted

Description: Configure Icecast internet radio streaming server to accept source connections and serve listeners over IPv6, enabling audio streaming on IPv6-capable networks.

---

Icecast is a streaming media server commonly used for internet radio. It supports IPv6 through its listener socket configuration, enabling internet radio stations to serve both IPv4 and IPv6 listeners simultaneously.

## Installing Icecast

```bash
# Ubuntu/Debian

sudo apt install icecast2 -y

# Configuration wizard runs during install
# Set passwords carefully

# Fedora
sudo dnf install icecast -y

# Check version
icecast2 -v   # Ubuntu/Debian
icecast -v    # Fedora
```

## Configuring Icecast for IPv6

```xml
<!-- /etc/icecast2/icecast.xml on Debian/Ubuntu -->

<icecast>
    <location>Earth</location>
    <admin>admin@example.com</admin>

    <limits>
        <clients>100</clients>
        <sources>2</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
    </limits>

    <authentication>
        <source-password>sourcepassword</source-password>
        <relay-password>relaypassword</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>adminpassword</admin-password>
    </authentication>

    <hostname>stream.example.com</hostname>

    <!-- Listen explicitly on IPv6 -->
    <listen-socket>
        <port>8000</port>
        <bind-address>::</bind-address>
    </listen-socket>

    <!-- Also listen on IPv4 for predictable dual-stack behavior -->
    <listen-socket>
        <port>8000</port>
        <bind-address>0.0.0.0</bind-address>
    </listen-socket>

    <!-- Or bind to a specific IPv6 address instead -->
    <!--
    <listen-socket>
        <port>8000</port>
        <bind-address>2001:db8::1</bind-address>
    </listen-socket>
    -->

    <paths>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/etc/icecast2/web</webroot>
        <adminroot>/etc/icecast2/admin</adminroot>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
    </logging>

    <security>
        <chroot>0</chroot>
    </security>
</icecast>
```

## Starting Icecast with IPv6

```bash
# Start Icecast
# Ubuntu/Debian
sudo systemctl start icecast2
sudo systemctl enable icecast2

# Fedora
sudo systemctl start icecast
sudo systemctl enable icecast

# Verify listening on IPv6
ss -6 -tlnp | grep 8000

# Check logs
sudo tail -f /var/log/icecast2/error.log   # Ubuntu/Debian
sudo tail -f /var/log/icecast/error.log    # Fedora
```

## Configuring Source (Liquidsoap over IPv6)

```ruby
# /etc/liquidsoap/radio.liq - Liquidsoap source script

# Define audio source
source = playlist(mode="normal", "/var/music/")

# Output to Icecast over IPv6
output.icecast(%mp3,
    host="2001:db8::1",
    port=8000,
    password="sourcepassword",
    mount="/stream.mp3",
    name="My IPv6 Radio",
    description="Streaming over IPv6",
    source)
```

## Firewall Rules for Icecast IPv6

```bash
# Allow Icecast listener port
sudo ip6tables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Allow HTTPS Icecast (if using)
sudo ip6tables -A INPUT -p tcp --dport 8443 -j ACCEPT

# Persist the rules using your distribution's firewall tooling
```

## Testing Icecast over IPv6

```bash
# Test Icecast web interface over IPv6
curl -6 http://[2001:db8::1]:8000/

# Test stream playback over IPv6
ffplay "http://[2001:db8::1]:8000/stream.mp3"

# VLC playback
vlc "http://[2001:db8::1]:8000/stream.mp3"

# Check listener statistics
curl -6 -u admin:adminpassword \
  "http://[2001:db8::1]:8000/admin/stats"
```

## Icecast Relay over IPv6

```xml
<!-- Relay configuration in icecast.xml -->
<relay>
    <!-- Relay from IPv6 master server -->
    <server>2001:db8::2</server>
    <port>8000</port>
    <mount>/source.mp3</mount>
    <local-mount>/relay.mp3</local-mount>
    <relay-shoutcast-metadata>1</relay-shoutcast-metadata>
</relay>
```

Using explicit IPv6 and IPv4 `listen-socket` entries with `::` and `0.0.0.0` makes dual-stack listener reachability predictable, making it straightforward to serve internet radio to IPv6-capable network connections.
