# How to Fix 'Could Not Resolve Host' DNS Resolution Failures on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, DNS

Description: Step-by-step guide on fix 'could not resolve host' dns resolution failures on rhel 9 with practical examples and commands.

---

"Could not resolve host" errors on RHEL 9 indicate DNS resolution failures. Here is how to diagnose and fix them.

## Check Current DNS Configuration

```bash
cat /etc/resolv.conf
resolvectl status
```

## Test DNS Resolution

```bash
dig example.com
nslookup example.com
host example.com
```

## Test with Specific DNS Servers

```bash
dig @8.8.8.8 example.com
dig @1.1.1.1 example.com
```

## Fix DNS Configuration via NetworkManager

```bash
sudo nmcli con show "System eth0" | grep dns

sudo nmcli con mod "System eth0" ipv4.dns "8.8.8.8 8.8.4.4"
sudo nmcli con mod "System eth0" ipv4.ignore-auto-dns yes
sudo nmcli con up "System eth0"
```

## Check systemd-resolved

```bash
sudo systemctl status systemd-resolved
resolvectl status
```

Restart if needed:

```bash
sudo systemctl restart systemd-resolved
```

## Check /etc/nsswitch.conf

```bash
grep hosts /etc/nsswitch.conf
```

It should include:

```bash
hosts: files dns myhostname
```

## Check /etc/hosts

```bash
cat /etc/hosts
```

Ensure localhost entries are correct:

```bash
127.0.0.1   localhost localhost.localdomain
::1         localhost localhost.localdomain
```

## Check Firewall for DNS

```bash
# Ensure outbound DNS is not blocked
sudo firewall-cmd --list-all
sudo nft list ruleset | grep 53
```

## Test Network Connectivity

```bash
ping -c 4 8.8.8.8
```

If ping works but DNS does not, the issue is DNS-specific.

## Conclusion

DNS resolution failures on RHEL 9 are caused by incorrect DNS configuration, unreachable DNS servers, or firewall rules blocking port 53. Verify DNS settings in NetworkManager and test with multiple DNS servers to isolate the problem.

