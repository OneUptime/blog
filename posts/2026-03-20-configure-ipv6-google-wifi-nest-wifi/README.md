# How to Configure IPv6 on Google Wifi/Nest Wifi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Google Wifi, Nest Wifi, Google Home, Consumer Networking, Mesh

Description: Configure IPv6 on Google Wifi and Nest Wifi mesh systems using the Google Home app and understand the automatic IPv6 handling.

## Google Wifi and Nest Wifi IPv6 Support

Google Wifi and Nest Wifi support IPv6 but with a different model from traditional routers - Google handles most IPv6 configuration automatically. The system:
- Automatically requests DHCPv6 and SLAAC from the ISP
- Automatically distributes IPv6 via RA to connected devices
- Applies a stateful firewall by default

## Prerequisites

- Google Home app installed (iOS or Android)
- Google Wifi or Nest Wifi device connected to ISP modem
- ISP must provide IPv6

## Step 1: Check Current IPv6 Status

In the Google Home app:

1. Open **Google Home** app
2. Tap your WiFi device
3. Tap the gear icon (Settings)
4. Select **Advanced Networking**
5. Tap **DNS** or **LAN**

For IPv6 status, look at **Advanced → LAN**:
- If IPv6 addresses are listed for your devices, IPv6 is working
- If only IPv4 addresses are shown, IPv6 may not be enabled by ISP

## Step 2: Google Wifi IPv6 Behavior

Google Wifi operates differently from traditional routers:

**What it does automatically:**
- Requests IPv6 from ISP via DHCPv6 and/or SLAAC
- Distributes IPv6 addresses to LAN devices via RA
- Applies prefix delegation if ISP provides it

**What you cannot configure directly:**
- IPv6 connection type (Google chooses automatically; only dual-stack is supported - no IPv6-only or transition protocols like 6to4/6rd)
- The default deny-inbound IPv6 firewall policy (Google manages this; you can only punch holes via Port Opening)
- Static IPv6 assignments to devices

## Step 3: Verify IPv6 From a Connected Device

Since Google Wifi auto-configures IPv6, the best verification is from a connected device:

```bash
# Mac/Linux: check for global IPv6 address

ifconfig | grep "inet6" | grep -v "fe80" | grep -v "::1"

# Windows
ipconfig | findstr "IPv6 Address"

# Quick online test
# Visit https://test-ipv6.com on your browser
```

Expected: a global IPv6 address starting with `2xxx:` or `3xxx:`

## Step 4: IPv6 DNS Configuration

Google Wifi/Nest Wifi uses Google's own DNS by default (which supports IPv6):
- IPv4 DNS: `8.8.8.8`, `8.8.4.4`
- IPv6 DNS: `2001:4860:4860::8888`, `2001:4860:4860::8844`

To change DNS in the Google Home app:

1. Open **Google Home** → Tap your Wifi → Settings
2. Go to **Advanced Networking → DNS**
3. Select **Custom** and enter your preferred IPv6 DNS

Note: Google Home's Custom DNS supports separate primary/secondary entries for both IPv4 and IPv6. If your app version only exposes IPv4 fields, update the Google Home app to the latest version.

## Step 5: IPv6 Firewall on Google Wifi

Google Wifi blocks all unsolicited inbound IPv6 connections by default. This behavior is intentional and appropriate for a home router.

To allow inbound IPv6 connections (for home servers, gaming, etc.):
- In the Google Home app, go to **Wifi → Settings → Advanced Networking → Port management**
- Google distinguishes **Port forwarding (IPv4)** from **Port opening (IPv6)** - select the IPv6 tab and enter the port range to open for the target device
- Note: IPv6 doesn't use NAT, so this is a firewall pinhole rather than a NAT translation

## Nest Wifi Pro (WiFi 6E) IPv6

Nest Wifi Pro has enhanced IPv6 support and handles prefix delegation more reliably. Setup is identical through the Google Home app.

## Troubleshooting Google Wifi IPv6

**No IPv6 on connected devices:**
1. Check if ISP provides IPv6 (visit test-ipv6.com from a wired device)
2. Reboot Google Wifi device (power cycle)
3. In Google Home app: Factory reset the Wifi point and reconfigure

**IPv6 works but inconsistently:**
- Google Wifi sometimes prefers IPv4 DNS which may slow AAAA resolution
- Change to an ISP DNS that prioritizes IPv6

## Conclusion

Google Wifi and Nest Wifi automate IPv6 configuration - when your ISP provides IPv6, Google Wifi handles the DHCPv6/SLAAC negotiation and RA distribution without manual configuration. Verify operation through connected devices or the `test-ipv6.com` test site.
