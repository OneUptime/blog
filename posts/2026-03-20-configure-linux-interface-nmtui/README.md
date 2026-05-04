# How to Configure a Linux Network Interface with nmtui

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, NetworkManager, nmtui, IPv4, Network Configuration, TUI

Description: Use the nmtui text user interface to configure static and DHCP IPv4 addresses, DNS servers, and routes on Linux without using the command line syntax of nmcli.

## Introduction

`nmtui` (NetworkManager Text User Interface) is a menu-driven, terminal-based tool for configuring NetworkManager connections. It provides a friendlier alternative to `nmcli` for users who prefer interactive menus over command syntax.

## Launching nmtui

```bash
# Start the TUI (requires NetworkManager to be running)

sudo nmtui
```

You will see the following options:
- **Edit a connection**
- **Activate a connection**
- **Set system hostname**
- **Radio** (toggle Wi-Fi/WWAN on or off)
- **Quit**

## Editing a Connection for Static IPv4

1. Select **Edit a connection** and press Enter
2. Select your interface (e.g., "Wired connection 1") and choose **Edit**
3. Under **IPv4 CONFIGURATION**, change `<Automatic>` to `<Manual>`
4. Fill in:
   - **Addresses**: `192.168.1.100/24`
   - **Gateway**: `192.168.1.1`
   - **DNS servers**: `8.8.8.8` and `1.1.1.1`
   - **Search domains**: `example.com`
5. Navigate to **OK** and press Enter

## Switching to DHCP

1. In the same **Edit** screen
2. Under **IPv4 CONFIGURATION**, change to `<Automatic>`
3. Clear any static addresses if present
4. Select **OK**

## Activating a Connection

After editing:
1. Select **Activate a connection** from the main menu
2. Select the connection you edited
3. Press Enter to activate (the highlighted button toggles between **Activate** and **Deactivate** depending on the current state)

Or from the command line:

```bash
# Activate after nmtui edits
nmcli con up "Wired connection 1"
```

## Verifying the Configuration

```bash
# After saving and activating in nmtui, verify with ip commands
ip -4 addr show
ip route show
resolvectl status | grep "DNS Servers"
```

## Setting the System Hostname

1. From the nmtui main menu, select **Set system hostname**
2. Type the new hostname
3. Press Enter - the change takes effect immediately

```bash
# Verify hostname change
hostname
```

## When to Use nmtui vs nmcli

| Use Case | Recommended Tool |
|---|---|
| Quick interactive config | `nmtui` |
| Scripted/automated config | `nmcli` |
| Reading connection details | `nmcli con show` |
| Applying many connections at once | `nmcli` with scripting |

## Installing nmtui

```bash
# Debian/Ubuntu
sudo apt install network-manager

# RHEL/CentOS/Fedora
sudo dnf install NetworkManager-tui
```

## Conclusion

`nmtui` is the easiest way to configure network interfaces when you are in a terminal and want a visual, menu-driven experience. It writes the same connection profiles as `nmcli` and activates changes through NetworkManager, making configurations persistent automatically.
