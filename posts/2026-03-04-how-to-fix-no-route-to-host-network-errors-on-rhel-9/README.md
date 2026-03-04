# How to Fix 'No Route to Host' Network Errors on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking, Troubleshooting

Description: Step-by-step guide on fix 'no route to host' network errors on rhel 9 with practical examples and commands.

---

The "No route to host" error on RHEL 9 indicates a network routing or firewall problem preventing connections to the destination.

## Check Basic Connectivity

```bash
ping -c 4 destination-host
traceroute destination-host
```

## Check Routing Table

```bash
ip route show
ip route get 10.0.1.50
```

Add a missing route:

```bash
sudo ip route add 10.0.2.0/24 via 10.0.1.1 dev eth0
```

Make it persistent:

```bash
sudo nmcli con mod "System eth0" +ipv4.routes "10.0.2.0/24 10.0.1.1"
sudo nmcli con up "System eth0"
```

## Check Local Firewall

```bash
sudo firewall-cmd --list-all
sudo iptables -L -n
```

Add the needed rule:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Check Remote Firewall

The "No route to host" message often comes from a firewall on the remote host rejecting the connection:

```bash
# On the remote host
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Check Network Interface Status

```bash
ip link show
ip addr show
nmcli device status
```

Bring up a down interface:

```bash
sudo nmcli con up "System eth0"
```

## Check for ARP Issues

```bash
ip neigh show
```

## Verify DNS Resolution

```bash
dig destination-host
nslookup destination-host
```

## Conclusion

"No route to host" errors on RHEL 9 are caused by missing routes, firewall rules blocking traffic, or network interface issues. Check routing, firewall rules on both ends, and interface status to resolve the problem.

