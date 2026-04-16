# How to Install ClickHouse on Windows with WSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window, WSL, Installation, Development

Description: How to install and run ClickHouse on Windows using WSL2 with Ubuntu, including port forwarding and persistent storage setup.

---

ClickHouse does not have a native Windows binary, but WSL2 (Windows Subsystem for Linux) provides a near-native Linux environment that runs ClickHouse without issues. This is ideal for local development and testing on Windows machines.

## Enable WSL2

Open PowerShell as Administrator and run:

```powershell
wsl --install
wsl --set-default-version 2
```

Restart your machine, then install Ubuntu from the Microsoft Store or via:

```powershell
wsl --install -d Ubuntu-22.04
```

## Install ClickHouse Inside WSL

Open your Ubuntu WSL terminal:

```bash
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

# Import the ClickHouse GPG key
GNUPGHOME=$(mktemp -d)
sudo GNUPGHOME="$GNUPGHOME" gpg --no-default-keyring --keyring /usr/share/keyrings/clickhouse-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 8919F6BD2B48D754
sudo rm -rf "$GNUPGHOME"
sudo chmod +r /usr/share/keyrings/clickhouse-keyring.gpg

# Add the ClickHouse repository
ARCH=$(dpkg --print-architecture)
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] https://packages.clickhouse.com/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/clickhouse.list
sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client
```

## Start the Server

WSL2 does not use systemd by default on older Ubuntu versions. Start manually:

```bash
sudo clickhouse-server --config=/etc/clickhouse-server/config.xml &
```

Or enable systemd in WSL2 (Ubuntu 22.04+) by adding to `/etc/wsl.conf`:

```text
[boot]
systemd=true
```

Then restart WSL and use:

```bash
sudo systemctl start clickhouse-server
sudo systemctl enable clickhouse-server
```

## Connect from Windows

ClickHouse binds to localhost inside WSL2. WSL2's automatic localhost forwarding lets Windows apps reach WSL2 services on `localhost` when the service binds to `0.0.0.0`. If you need to expose the port to other machines on your LAN, use `netsh portproxy` with the WSL2 IP:

```powershell
$wslIp = (wsl hostname -I).Trim().Split(' ')[0]
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8123 connectaddress=$wslIp connectport=8123
```

Or access from Windows using the WSL2 IP directly:

```powershell
wsl hostname -I
# Use that IP in your Windows ClickHouse client on port 9000 or 8123
```

## Persist Data Across WSL Restarts

WSL2 preserves files in the Linux filesystem. ClickHouse stores data in `/var/lib/clickhouse` by default - this persists across WSL sessions as long as you do not run `wsl --unregister`.

## Verify

```bash
clickhouse-client --query "SELECT 'ClickHouse on WSL2 works!' AS message"
```

## Summary

Running ClickHouse on Windows via WSL2 is reliable and performant for development. Install Ubuntu in WSL2, add the ClickHouse repository, start the server manually or via systemd, and optionally forward ports to connect from Windows tools. Data stored in the WSL2 Linux filesystem persists across reboots.
