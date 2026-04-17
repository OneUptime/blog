# How to Set Up a Wireless Bridge with Static IPv4 Addressing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireless Bridge, WiFi, Static IP, IPv4, Linux, Bridge

Description: Learn how to set up a wireless bridge on Linux to connect a wired device to a WiFi network, using static IPv4 addressing for the bridge interface.

## What Is a Wireless Bridge?

A wireless bridge connects a wired device (such as a desktop, game console, or IP camera) to a WiFi network when a direct WiFi connection isn't possible. The bridge acts as a relay between wired and wireless, appearing as a single network interface to the connected device.

## Step 1: Requirements

For a wireless bridge:
- A Linux device with both a wireless NIC (wlan0) and a wired NIC (eth0)
- OR a dedicated access point in bridge/repeater mode
- The AP must support 4-address mode (WDS) for proper bridging

## Step 2: Enable 4-Address Mode (WDS) on the AP

For a Linux wireless bridge to work, the AP must allow 4-address frames:

```bash
# On the access point (hostapd), enable WDS

# /etc/hostapd/hostapd.conf
wds_sta=1

# On the client side (wpa_supplicant)
# /etc/wpa_supplicant/wpa_supplicant.conf
network={
    ssid="MyNetwork"
    psk="mypassword"
    mode=0
}
# After connecting:
iw dev wlan0 set 4addr on
```

## Step 3: Create a Bridge Interface

```bash
# Install bridge utilities
sudo apt-get install -y bridge-utils

# Connect to the WiFi network
sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf

# Enable 4-address mode
sudo iw dev wlan0 set 4addr on

# Create the bridge
sudo brctl addbr br0

# Add both interfaces to the bridge
sudo brctl addif br0 eth0
sudo brctl addif br0 wlan0

# Bring up all interfaces
sudo ip link set wlan0 up
sudo ip link set eth0 up
sudo ip link set br0 up

# Assign static IP to the bridge
sudo ip addr add 192.168.1.50/24 dev br0
sudo ip route add default via 192.168.1.1 dev br0
```

## Step 4: Configure Static IP with Netplan (Ubuntu)

For persistent configuration on Ubuntu:

```yaml
# /etc/netplan/01-wifi-bridge.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  wifis:
    wlan0:
      dhcp4: false
      access-points:
        "MyNetwork":
          password: "mypassword"
  bridges:
    br0:
      interfaces: [eth0, wlan0]
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
sudo netplan apply
```

## Step 5: Configure with NetworkManager

```bash
# Create WiFi connection
nmcli connection add type wifi con-name "wifi-bridge-member" \
  ssid "MyNetwork" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "mypassword"

# Modify to join a bridge
nmcli connection modify "wifi-bridge-member" connection.slave-type bridge connection.master br0

# Create the bridge with static IP
nmcli connection add type bridge con-name "br0" ifname br0
nmcli connection modify "br0" \
  ipv4.addresses "192.168.1.50/24" \
  ipv4.gateway "192.168.1.1" \
  ipv4.dns "8.8.8.8,8.8.4.4" \
  ipv4.method manual

# Add eth0 to bridge
nmcli connection add type ethernet con-name "eth-bridge-member" ifname eth0 \
  connection.slave-type bridge connection.master br0

# Bring it all up
nmcli connection up "br0"
```

## Step 6: Verify the Bridge

```bash
# Check bridge configuration
brctl show br0

# Output:
# bridge name  bridge id         STP enabled  interfaces
# br0          8000.aabbccddeeff  no           eth0
#                                              wlan0

# Verify IP assignment
ip addr show br0

# Test connectivity
ping -c 3 192.168.1.1   # Gateway
ping -c 3 8.8.8.8        # Internet
```

## Conclusion

A wireless bridge connects wired devices to WiFi using a Linux device with both wlan0 and eth0, bridged together with `brctl addbr br0`. Enable 4-address mode on the wireless interface with `iw dev wlan0 set 4addr on` for correct bridging operation. Assign a static IPv4 address to the bridge interface (`br0`) rather than the member interfaces. Use Netplan or NetworkManager for persistent configuration across reboots.
