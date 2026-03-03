# How to Configure Wi-Fi on Talos Linux (SBC)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Wi-Fi, Single Board Computer, Networking, Raspberry Pi

Description: Step-by-step guide to configuring Wi-Fi connectivity on single-board computers running Talos Linux, including firmware loading, WPA configuration, and network management.

---

Wi-Fi on Talos Linux for single-board computers is not as plug-and-play as ethernet, but it is doable. There are situations where running an ethernet cable is not practical - maybe the SBC is deployed at a remote location, sitting on a shelf in a retail store, or mounted in a location where cabling would be difficult. While ethernet is always preferred for Kubernetes clusters due to its reliability and lower latency, Wi-Fi support makes Talos viable in places where wired networking simply is not an option.

This guide walks through configuring Wi-Fi on Talos Linux for various SBC platforms, covering firmware requirements, machine configuration, and troubleshooting.

## Understanding Wi-Fi Support in Talos

Talos Linux supports Wi-Fi through the wpa_supplicant service, but Wi-Fi is not enabled by default. There are a few things you need:

1. A Talos image that includes Wi-Fi firmware for your specific wireless chipset
2. The correct network configuration in your machine config
3. Appropriate system extensions if your chipset requires additional drivers

Not all SBCs have the same Wi-Fi hardware, so the first step is identifying what chipset your board uses.

## Identifying Your Wi-Fi Chipset

Common SBC Wi-Fi chipsets include:

| Board | Wi-Fi Chip | Driver |
|-------|-----------|--------|
| Raspberry Pi 4 | Broadcom BCM43455 | brcmfmac |
| Raspberry Pi 5 | Broadcom BCM43455 | brcmfmac |
| Rock Pi 4 | Broadcom AP6256 | brcmfmac |
| NVIDIA Jetson Nano | Realtek RTL8822CE | rtw89 |
| Pine64 | Realtek RTL8723BS | r8723bs |

The Raspberry Pi variants include their Wi-Fi firmware in the Talos RPi image, so they work with the least configuration. Other boards may require custom Talos images with additional firmware packages.

## Configuring Wi-Fi on Raspberry Pi

The Raspberry Pi's Broadcom Wi-Fi works out of the box with the `rpi_generic` Talos image. You just need to configure the network interface in the machine configuration.

### Basic WPA2 Configuration

```yaml
# Machine config for Wi-Fi
machine:
  network:
    interfaces:
      - interface: wlan0
        dhcp: true
        wifi:
          ssid: "MyNetwork"
          psk: "my-wifi-password"
```

### WPA2-Enterprise Configuration

For enterprise networks using 802.1X:

```yaml
machine:
  network:
    interfaces:
      - interface: wlan0
        dhcp: true
        wifi:
          ssid: "CorpNetwork"
          eap:
            identity: "user@domain.com"
            password: "enterprise-password"
            method: PEAP
            phase2: MSCHAPV2
```

### Static IP over Wi-Fi

If you need a static IP instead of DHCP:

```yaml
machine:
  network:
    interfaces:
      - interface: wlan0
        addresses:
          - 192.168.1.150/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        wifi:
          ssid: "MyNetwork"
          psk: "my-wifi-password"
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

## Applying the Wi-Fi Configuration

Since the node needs network connectivity to receive its configuration, there is a chicken-and-egg problem: you cannot apply the Wi-Fi config over Wi-Fi if Wi-Fi is not configured yet.

### Option 1: Use Ethernet for Initial Configuration

The simplest approach is to connect via ethernet first, apply the Wi-Fi configuration, then disconnect ethernet:

```bash
# Connect Pi to ethernet
# Find its IP and apply config with Wi-Fi settings
talosctl apply-config --insecure --nodes <ETHERNET_IP> --file controlplane.yaml
```

After the node reboots with the Wi-Fi configuration, it will connect to both ethernet and Wi-Fi. You can then disconnect ethernet and the node will continue operating on Wi-Fi.

### Option 2: Pre-configure with Image Factory

Use the Talos Image Factory to create an image with Wi-Fi configuration baked in:

```bash
# Create a schematic with Wi-Fi config
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "extraKernelArgs": [],
      "meta": [
        {
          "key": 10,
          "value": "machine:\n  network:\n    interfaces:\n      - interface: wlan0\n        dhcp: true\n        wifi:\n          ssid: MyNetwork\n          psk: my-wifi-password"
        }
      ]
    }
  }'
```

This creates an image that will connect to Wi-Fi on first boot without needing ethernet.

### Option 3: Use a USB Ethernet Adapter

If your SBC does not have an ethernet port or you cannot easily connect one, use a USB ethernet adapter for initial setup:

```bash
# USB ethernet adapters usually appear as eth1 or enxXXXXXXXXXXXX
# Connect and apply config through the USB adapter
talosctl apply-config --insecure --nodes <USB_ETH_IP> --file controlplane.yaml
```

## Wi-Fi for Other SBC Platforms

### Boards with Realtek Wi-Fi

Many non-Raspberry Pi SBCs use Realtek Wi-Fi chipsets. These may require additional firmware that is not included in the standard Talos image:

```yaml
# Machine config with Realtek firmware extension
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/realtek-firmware:latest
  network:
    interfaces:
      - interface: wlan0
        dhcp: true
        wifi:
          ssid: "MyNetwork"
          psk: "my-wifi-password"
```

### USB Wi-Fi Adapters

If your SBC does not have built-in Wi-Fi or the built-in chipset is not supported, a USB Wi-Fi adapter is an option. Adapters based on the Ralink RT5370 or Atheros AR9271 chipsets have good Linux support:

```yaml
# USB Wi-Fi adapters may use a different interface name
machine:
  network:
    interfaces:
      - interface: wlp1s0u1  # Interface name varies by adapter
        dhcp: true
        wifi:
          ssid: "MyNetwork"
          psk: "my-wifi-password"
```

To find the correct interface name, boot with ethernet first and check:

```bash
# List all network interfaces
talosctl -n <NODE_IP> get links
```

## Wi-Fi Reliability Considerations

Wi-Fi is inherently less reliable than ethernet for Kubernetes. Here are some things to account for:

### Connection Drops

Wi-Fi connections can drop due to interference, signal strength changes, or access point issues. Configure Talos to handle reconnection:

```yaml
machine:
  network:
    interfaces:
      - interface: wlan0
        dhcp: true
        wifi:
          ssid: "MyNetwork"
          psk: "my-wifi-password"
  # Increase timeouts for services that might fail during Wi-Fi drops
  kubelet:
    extraArgs:
      node-status-update-frequency: "30s"
```

### Kubernetes Tolerance for Wi-Fi

Increase Kubernetes tolerances so brief Wi-Fi drops do not cause pod evictions:

```yaml
cluster:
  controllerManager:
    extraArgs:
      node-monitor-grace-period: "60s"    # Default 40s
      node-monitor-period: "10s"          # Default 5s
      pod-eviction-timeout: "5m"          # Default 5m
```

### Signal Strength

Position the SBC within good range of the Wi-Fi access point. Walls, metal surfaces, and other electronics can significantly reduce signal quality. If possible, use the 5 GHz band for less interference, though its range is shorter than 2.4 GHz.

## Security Considerations

Wi-Fi adds an attack surface that does not exist with ethernet. Some best practices:

- Use WPA3 if your access point supports it
- Never use open or WEP networks
- Consider a dedicated VLAN/SSID for Talos nodes
- Enable disk encryption on Talos to protect configuration data (which includes the Wi-Fi PSK)

```yaml
# Encrypt the state partition to protect Wi-Fi credentials
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

## Monitoring Wi-Fi Connectivity

Keep tabs on the Wi-Fi connection quality:

```bash
# Check network interface status
talosctl -n <NODE_IP> get links | grep wlan

# Check for network errors in kernel logs
talosctl -n <NODE_IP> dmesg | grep -i "wlan\|wifi\|brcm\|deauth\|disassoc"

# Check the IP address assignment
talosctl -n <NODE_IP> get addresses
```

## Troubleshooting

If Wi-Fi does not connect at all, check that the firmware is loaded:

```bash
talosctl -n <NODE_IP> dmesg | grep -i firmware
# Look for messages about brcmfmac or your specific chipset firmware
```

If the interface appears but cannot associate with the access point, verify your SSID and password. Talos does not provide interactive debugging for Wi-Fi, so the machine configuration must be correct.

If Wi-Fi connects but has very poor performance, check for channel congestion. A Wi-Fi analyzer app on your phone can help identify crowded channels. Switch your access point to a less congested channel.

## Wrapping Up

Wi-Fi on Talos Linux works well enough for single-board computers in locations where ethernet is impractical. The Raspberry Pi has the best out-of-the-box Wi-Fi support, while other SBCs may need firmware extensions. The key is to treat Wi-Fi as a convenience rather than a primary connection for production Kubernetes - use it where you must, configure appropriate timeouts and tolerances, and always have a plan for when the wireless connection temporarily drops.
