# How to Send a Broadcast Packet on Linux with socat or netcat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Broadcast, Linux, Socat, netcat, UDP

Description: Send UDP broadcast packets from the Linux command line using socat and netcat, including how to enable the SO_BROADCAST socket option and receive broadcasts on remote hosts.

## Introduction

Sending a UDP broadcast packet on Linux requires the `SO_BROADCAST` socket option - a deliberate safety mechanism to prevent accidental broadcast floods. Both `socat` and some `netcat` variants support this, making it easy to test broadcast delivery without writing custom code.

## Sending a Broadcast with socat

`socat` is the most flexible tool for broadcast UDP. Specify the `broadcast` option to set `SO_BROADCAST`:

```bash
# Send a single broadcast packet to 192.168.1.255 on port 9999

echo "Hello broadcast" | socat - UDP-DATAGRAM:192.168.1.255:9999,broadcast

# Send the limited broadcast to all hosts on the local segment
echo "Hello everyone" | socat - UDP-DATAGRAM:255.255.255.255:9999,broadcast
```

## Receiving Broadcasts with socat

```bash
# Listen for any UDP broadcast on port 9999
socat UDP-RECVFROM:9999,broadcast,fork -
```

The `fork` option handles each incoming packet in a subprocess, allowing multiple packets to be received.

## Sending a Broadcast with netcat (nc)

Netcat implementations differ. Nmap's `ncat` does not document a broadcast option. On Debian/Ubuntu systems with OpenBSD-style `nc` that includes `-b`, use `-b` to allow UDP broadcast:

```bash
# Install OpenBSD netcat if needed
sudo apt install netcat-openbsd

# Send a broadcast via nc
echo "test" | nc -u -b 192.168.1.255 9999
```

With `netcat` variants that do not provide a broadcast option, use `socat` or the Python one-liner below instead. Bash's `/dev/udp` redirection can open a UDP socket, but it does not expose a way to set `SO_BROADCAST`, so it is not a reliable broadcast workaround on Linux.

For reliable broadcasting, prefer `socat`.

## Python One-Liner for Testing

If neither `socat` nor a `netcat` variant with broadcast support is available:

```bash
python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
s.sendto(b'hello broadcast', ('255.255.255.255', 9999))
print('Sent')
s.close()
"
```

## Receiving Broadcasts on Remote Hosts

Any UDP socket bound to `0.0.0.0` on the target port can receive broadcast packets on the local segment, as long as the host firewall allows them:

```bash
# Using socat on the receiver
socat UDP-RECVFROM:9999,broadcast,reuseaddr,fork -

# Using netcat on the receiver
nc -u -l 9999
```

## Verifying Delivery with tcpdump

```bash
# On another host on the segment - confirm the broadcast arrives
sudo tcpdump -i eth0 -n "udp dst port 9999"
```

## Wake-on-LAN: A Real Broadcast Use Case

Wake-on-LAN magic packets are often sent as broadcast UDP packets to port 9:

```bash
# Construct and send a WoL magic packet with Python
# Replace AA:BB:CC:DD:EE:FF with the target MAC address
python3 -c "
import socket
mac = 'AA:BB:CC:DD:EE:FF'.replace(':', '')
magic = bytes.fromhex('FF' * 6 + mac * 16)
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
s.sendto(magic, ('255.255.255.255', 9))
print('WoL packet sent')
"
```

## Conclusion

`socat` with the `broadcast` option is the most reliable way to send UDP broadcasts from the Linux command line. Remember that broadcast packets are limited to the local subnet - routers drop `255.255.255.255` and most block directed broadcasts by default.
