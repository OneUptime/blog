# How to Set Up Snort as a Network Intrusion Detection System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Snort, IDS, Security, Linux

Description: Learn how to set Up Snort as a Network Intrusion Detection System on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Snort as a Network Intrusion Detection System on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A network interface to monitor, such as `eth0`

## Overview

Set Up Snort as a Network Intrusion Detection System requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git flex bison cmake automake autoconf libtool libpcap-devel pcre-devel libdnet-devel hwloc-devel openssl-devel zlib-devel luajit-devel pkgconf libmnl-devel libunwind-devel libnfnetlink-devel libnetfilter_queue-devel xz-devel libuuid-devel hyperscan-devel gperftools-devel
```

## Step 2: Install Required Packages

Build and install LibDAQ, which Snort 3 uses to read packets from network interfaces:

```bash
git clone https://github.com/snort3/libdaq.git
cd libdaq
./bootstrap
./configure
make -j"$(nproc)"
sudo make install
sudo ldconfig
cd ..
```

Build and install Snort 3:

```bash
git clone https://github.com/snort3/snort3.git
cd snort3
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:/usr/local/lib64/pkgconfig:$PKG_CONFIG_PATH
./configure_cmake.sh --prefix=/usr/local/snort --enable-tcmalloc
cd build
make -j"$(nproc)"
sudo make install
sudo ldconfig
```

Verify the installation:

```bash
/usr/local/snort/bin/snort -V
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo cp ../lua/snort.lua /usr/local/snort/etc/snort/snort.lua
sudo cp ../lua/snort_defaults.lua /usr/local/snort/etc/snort/snort_defaults.lua
sudo vi /usr/local/snort/etc/snort/snort.lua
```

Apply the recommended settings for your environment. Start with the defaults and adjust `HOME_NET`, rule paths, logging, and the monitored interface based on your workload and hardware.

Create a dedicated service account and log directory:

```bash
sudo groupadd --system snort
sudo useradd --system --no-create-home --gid snort --shell /sbin/nologin snort
sudo mkdir -p /var/log/snort
sudo chown -R snort:snort /var/log/snort
sudo chmod 5700 /var/log/snort
```

Create the systemd unit file:

```bash
sudo vi /etc/systemd/system/snort.service
```

Use this unit as a starting point, replacing `eth0` with the interface Snort should monitor:

```ini
[Unit]
Description=Snort 3 Network Intrusion Detection System
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/snort/bin/snort -c /usr/local/snort/etc/snort/snort.lua -i eth0 -l /var/log/snort -D -u snort -g snort --create-pidfile -k none
ExecReload=/bin/kill -SIGHUP $MAINPID
User=snort
Group=snort
Restart=on-failure
RestartSec=5s
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_IPC_LOCK
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW CAP_IPC_LOCK

[Install]
WantedBy=multi-user.target
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now snort.service
sudo systemctl status snort.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo /usr/local/snort/bin/snort -c /usr/local/snort/etc/snort/snort.lua -T
```

Check the logs for any errors:

```bash
journalctl -u snort.service -f
```

## Step 6: Configure Firewall Rules

Snort in passive IDS mode monitors traffic on an interface and usually does not need an inbound firewall port opened. If you run Snort with an additional management or forwarding service, open only the required port:

```bash
sudo firewall-cmd --permanent --add-port=<port>/<protocol>
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show snort.service --property=MemoryCurrent
top -p $(pidof snort)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Grant only the Linux capabilities Snort needs to capture traffic
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u snort.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **No traffic is inspected**: Verify the interface name with `ip link` and confirm the interface receives mirrored or routed traffic

## Conclusion

You have successfully configured set up snort as a network intrusion detection system on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
