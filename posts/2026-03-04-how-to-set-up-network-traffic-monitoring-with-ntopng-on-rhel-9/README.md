# How to Set Up Network Traffic Monitoring with ntopng on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking, Monitoring

Description: Step-by-step guide on set up network traffic monitoring with ntopng on rhel 9 with practical examples and commands.

---

ntopng provides real-time network traffic monitoring with a web-based interface on RHEL 9.

## Install ntopng

```bash
sudo dnf install -y epel-release
sudo dnf install -y ntopng ntopng-data
```

## Configure ntopng

Edit the configuration:

```bash
sudo tee /etc/ntopng/ntopng.conf <<EOF
-i=eth0
-w=3000
-m=10.0.0.0/8
-n=1
--community
EOF
```

## Start ntopng

```bash
sudo systemctl enable --now ntopng
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Access the Web Interface

Open your browser to http://your-server:3000 and log in with:
- Username: admin
- Password: admin (change immediately)

## Monitor Network Traffic

ntopng provides:

- Real-time traffic flow visualization
- Top talkers and top protocols
- Network host discovery
- Historical traffic analysis
- Alert configuration

## Configure Alerts

```bash
sudo tee -a /etc/ntopng/ntopng.conf <<EOF
--alert-probing
--alert-smtp-server=smtp.example.com
--alert-sender=ntopng@example.com
--alert-recipient=admin@example.com
EOF
```

## Enable Packet Capture

```bash
# Monitor multiple interfaces
sudo tee /etc/ntopng/ntopng.conf <<EOF
-i=eth0
-i=eth1
-w=3000
-m=10.0.0.0/8
EOF

sudo systemctl restart ntopng
```

## Data Retention

Configure how long ntopng keeps historical data:

```bash
# Add to ntopng.conf
--dump-flows=logfile
--data-dir=/var/lib/ntopng
```

## Conclusion

ntopng provides comprehensive network traffic visibility on RHEL 9. Use it to identify bandwidth hogs, detect network anomalies, and monitor traffic patterns across your infrastructure.

