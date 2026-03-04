# How to Configure systemd Socket Activation for On-Demand Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Socket Activation, Linux

Description: Learn how to configure systemd Socket Activation for On-Demand Services on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd socket activation lets services start on demand when a client connects to a specific socket, rather than running continuously. This approach reduces memory usage and speeds up boot time because services only consume resources when they are actually needed.

## Prerequisites

- RHEL with a working systemd installation
- Root or sudo access
- A service that supports socket activation (or a custom one you will create)

## Understanding Socket Activation

Traditional services start at boot and listen on their ports continuously. With socket activation, systemd holds the socket and starts the service only when a connection arrives. Once the service finishes handling requests, it can exit, and systemd will restart it on the next connection.

```bash
Client connects to port 8080
        |
        v
systemd holds the socket
        |
        v
systemd starts the service
        |
        v
Service handles the request
        |
        v
Service can exit (optional)
```

## Step 1: Create the Socket Unit

Create a socket unit file that tells systemd which port to listen on:

```bash
sudo vi /etc/systemd/system/myapp.socket
```

Add the following content:

```ini
[Unit]
Description=MyApp Socket

[Socket]
ListenStream=8080
Accept=false

[Install]
WantedBy=sockets.target
```

The `Accept=false` setting means systemd passes the socket to a single service instance rather than spawning a new instance per connection.

## Step 2: Create the Service Unit

```bash
sudo vi /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=MyApp Service
Requires=myapp.socket

[Service]
Type=simple
ExecStart=/usr/local/bin/myapp
StandardInput=socket

[Install]
WantedBy=multi-user.target
```

## Step 3: Enable and Start the Socket

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp.socket
```

Verify the socket is listening:

```bash
sudo systemctl status myapp.socket
ss -tlnp | grep 8080
```

## Step 4: Test Socket Activation

Connect to the port and watch the service start:

```bash
curl http://localhost:8080
systemctl status myapp.service
```

The service should transition from inactive to active when the first connection arrives.

## Step 5: Configure Idle Timeout (Optional)

To have the service stop after a period of inactivity, add a timeout:

```ini
[Service]
TimeoutStopSec=30
```

You can also use a systemd timer or `IdleAction` logic in your application to exit gracefully after idle time.

## Common Socket Options

| Option | Description |
|--------|-------------|
| `ListenStream` | TCP socket (port or path) |
| `ListenDatagram` | UDP socket |
| `ListenSequentialPacket` | Unix sequential packet socket |
| `Accept` | If true, spawn a new service per connection |
| `MaxConnections` | Limit concurrent connections |
| `BindIPv6Only` | Control IPv6 binding behavior |

## Troubleshooting

Check socket status:

```bash
systemctl status myapp.socket
journalctl -u myapp.socket
journalctl -u myapp.service
```

If the service fails to start, verify that your application reads from the file descriptor passed by systemd. In C, use `sd_listen_fds()`. In Python, use the `systemd.daemon` module.

## Conclusion

Socket activation is a powerful systemd feature that conserves resources by starting services only when they receive connections. It is particularly useful for infrequently accessed services, development environments, and systems where boot speed matters.
