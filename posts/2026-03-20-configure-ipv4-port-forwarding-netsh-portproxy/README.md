# How to Configure IPv4 Port Forwarding on Windows Using netsh portproxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Netsh, Port Forwarding, IPv4, Portproxy

Description: Configure TCP port forwarding on Windows using netsh interface portproxy to redirect traffic from one IPv4 address and port to another, enabling reverse proxy and service redirection.

## Introduction

`netsh interface portproxy` creates a TCP port forwarding rule via the Windows IP Helper service (`iphlpsvc`) - incoming connections on a specific IP:port are transparently redirected to a target IP:port. This is useful for service migration, exposing local containers, and building simple reverse proxies. Note that portproxy supports TCP only, and the IP Helper service must be running for rules to take effect.

## Adding a Port Forwarding Rule

```cmd
:: Forward all connections to 0.0.0.0:8080 to a backend at 192.168.1.200:80
netsh interface portproxy add v4tov4 ^
    listenaddress=0.0.0.0 ^
    listenport=8080 ^
    connectaddress=192.168.1.200 ^
    connectport=80
```

Parameters:
- `v4tov4`: IPv4 to IPv4 forwarding
- `listenaddress`: Local IP to listen on (`0.0.0.0` = all interfaces)
- `listenport`: Local port to accept connections on
- `connectaddress`: Destination host to forward to
- `connectport`: Destination port

## Listing Current portproxy Rules

```cmd
netsh interface portproxy show all
```

Output:

```text
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         8080        192.168.1.200   80
127.0.0.1       3000        127.0.0.1       3001
```

## Forwarding to a Local Container or WSL2

WSL2 and Docker containers run on internal IPs. Forward a Windows port to a container:

```powershell
# Get the WSL2 IP address

$wslIP = (wsl hostname -I).Trim()

# Forward Windows port 8080 to WSL2 port 3000
netsh interface portproxy add v4tov4 `
    listenaddress=0.0.0.0 `
    listenport=8080 `
    connectaddress=$wslIP `
    connectport=3000
```

## Allowing the Port Through Windows Firewall

portproxy alone is not enough - the firewall must also allow inbound connections:

```cmd
:: Allow inbound connections on the forwarded port
netsh advfirewall firewall add rule ^
    name="PortProxy 8080" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=8080
```

## Deleting a portproxy Rule

```cmd
:: Remove a specific forwarding rule
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080
```

## Resetting All portproxy Rules

```cmd
:: Remove all port forwarding rules
netsh interface portproxy reset
```

## Verifying the Forwarding

```cmd
:: On a remote host - connect to the forwarded port
telnet 192.168.1.10 8080

:: Or test with PowerShell
Test-NetConnection -ComputerName 192.168.1.10 -Port 8080
```

## Conclusion

`netsh interface portproxy add v4tov4` provides zero-dependency TCP port forwarding on Windows. Always pair it with a firewall rule to allow inbound traffic, and use `show all` to audit current forwarding rules. It is particularly useful for exposing WSL2 and Docker container ports to the local network.
