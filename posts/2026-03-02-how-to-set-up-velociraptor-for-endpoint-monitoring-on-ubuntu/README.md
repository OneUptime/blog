# How to Set Up Velociraptor for Endpoint Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Velociraptor, Security, Endpoint Monitoring, DFIR

Description: Learn how to install and configure Velociraptor on Ubuntu for endpoint monitoring and digital forensics, including server setup, client deployment, and writing VQL queries.

---

Velociraptor is an open-source endpoint detection and response (EDR) tool built for digital forensics and incident response. It uses a custom query language called VQL (Velociraptor Query Language) to collect artifacts from endpoints, execute real-time hunts across your fleet, and perform live forensic analysis. Unlike many DFIR tools, Velociraptor is designed to scale from a single analyst's laptop to thousands of managed endpoints.

## Architecture Overview

Velociraptor runs as a client-server system:

- **Server** - Receives connections from clients, stores results, provides the web UI and API
- **Client** - Lightweight agent running on monitored endpoints
- **VQL** - The query language used in "artifacts" to specify what data to collect

Both server and client run from the same binary, controlled by the configuration file.

## Server Installation on Ubuntu

### Download Velociraptor

```bash
# Set the version variable
VELOCIRAPTOR_VERSION="0.72.3"

# Download the binary
wget https://github.com/Velocidex/velociraptor/releases/download/v${VELOCIRAPTOR_VERSION}/velociraptor-v${VELOCIRAPTOR_VERSION}-linux-amd64 \
  -O /tmp/velociraptor

# Move to a system binary location
sudo mv /tmp/velociraptor /usr/local/bin/velociraptor
sudo chmod +x /usr/local/bin/velociraptor

# Verify
velociraptor --version
```

### Generate Server Configuration

```bash
# Create a directory for the server
sudo mkdir -p /etc/velociraptor
sudo mkdir -p /var/lib/velociraptor

# Generate self-signed TLS server configuration
sudo velociraptor config generate --self_signed \
  > /tmp/server.config.yaml

# Review and adjust the configuration
sudo mv /tmp/server.config.yaml /etc/velociraptor/server.config.yaml
```

Inspect the generated configuration:

```bash
sudo cat /etc/velociraptor/server.config.yaml
```

Key settings to verify or adjust:

```yaml
# The auto-generated config contains these important sections:

Frontend:
  # The public hostname or IP clients will connect to
  hostname: your-server-hostname.example.com
  bind_address: 0.0.0.0
  bind_port: 8000

  # For production, get a real TLS certificate
  # For testing, self-signed is fine

GUI:
  # The web UI port
  bind_address: 127.0.0.1
  bind_port: 8889

Datastore:
  # Where to store collected data
  location: /var/lib/velociraptor/datastore
  filestore_directory: /var/lib/velociraptor/filestore
```

### Create an Admin User

```bash
# Add an initial admin user
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  user add admin --role administrator
```

Enter the password when prompted.

### Create a Systemd Service

```bash
sudo nano /etc/systemd/system/velociraptor-server.service
```

```ini
[Unit]
Description=Velociraptor Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/velociraptor --config /etc/velociraptor/server.config.yaml frontend -v
Restart=always
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable velociraptor-server
sudo systemctl start velociraptor-server
sudo systemctl status velociraptor-server
```

### Access the Web UI

```bash
# If running locally, access via SSH tunnel
ssh -L 8889:127.0.0.1:8889 your-server

# Then open in browser
# https://127.0.0.1:8889
```

Log in with the admin credentials you set up earlier.

## Client Configuration and Deployment

### Generate Client Configuration

```bash
# Generate client config from the server config
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  config client > /tmp/client.config.yaml

# Review client config - it contains the server's certificate
# and the connection details embedded
cat /tmp/client.config.yaml
```

### Deploy the Client on an Ubuntu Endpoint

Copy the binary and client config to the target system:

```bash
# On the target system
sudo mkdir -p /etc/velociraptor
sudo cp velociraptor /usr/local/bin/velociraptor
sudo chmod +x /usr/local/bin/velociraptor
sudo cp client.config.yaml /etc/velociraptor/client.config.yaml

# Create the systemd service
sudo nano /etc/systemd/system/velociraptor-client.service
```

```ini
[Unit]
Description=Velociraptor Client
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/velociraptor --config /etc/velociraptor/client.config.yaml client -v
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable velociraptor-client
sudo systemctl start velociraptor-client
```

The client will connect to the server and appear in the web UI under "Clients".

## Collecting Artifacts via the UI

Once a client is connected, you can collect built-in artifacts through the web UI:

1. Click on a client in the client list
2. Click "Collected Artifacts"
3. Click "New Collection"
4. Search for an artifact (e.g., "Linux.Sys.Users")
5. Configure parameters and launch

### Common Built-in Artifacts for Linux

- `Linux.Sys.Users` - Enumerate user accounts
- `Linux.Network.NetstatEnriched` - Network connections with process info
- `Linux.Proc.Modules` - Loaded kernel modules
- `Linux.Detection.YaraProcess` - Scan process memory with YARA rules
- `Linux.Sys.Crontab` - Crontab entries
- `Linux.Mounts` - Mounted file systems
- `Linux.Sys.BashHistory` - Shell history files

## VQL - Velociraptor Query Language

VQL is what makes Velociraptor powerful. It's an SQL-like language with plugins that collect data from the system:

### Basic VQL Structure

```sql
-- Select process information
SELECT Pid, Name, Exe, CommandLine, Username
FROM pslist()
WHERE Name =~ "sshd"

-- List files in a directory
SELECT FullPath, Size, Mtime, Atime
FROM glob(globs="/etc/*.conf")

-- Network connections
SELECT Pid, FamilyString, TypeString, Status, Laddr, Raddr
FROM netstat()
WHERE Status = "ESTABLISHED"
```

### Writing a Custom Artifact

Artifacts are YAML files that wrap VQL queries:

```bash
sudo nano /etc/velociraptor/custom-artifact.yaml
```

```yaml
name: Custom.Linux.SuspiciousPaths
description: |
  Checks for files in common malware staging locations
  and lists recently modified files.

type: CLIENT

sources:
  - name: TmpFiles
    description: Files in /tmp modified in last hour
    query: |
      SELECT FullPath, Size, Mtime, Atime, Mode
      FROM glob(globs="/tmp/**")
      WHERE Mtime > now() - 3600
      AND NOT IsDir
      ORDER BY Mtime DESC

  - name: SuidFiles
    description: SUID/SGID binaries
    query: |
      SELECT FullPath, Mode, Uid, Gid, Size
      FROM glob(globs=["/usr/bin/**", "/usr/sbin/**", "/bin/**"])
      WHERE Mode.IsSetuid OR Mode.IsSetgid
```

Upload the artifact to the server:

```bash
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  artifacts upload /etc/velociraptor/custom-artifact.yaml
```

## Running Hunts (Fleet-Wide Queries)

Hunts apply an artifact collection to multiple clients simultaneously:

1. In the web UI, click "Hunt Manager"
2. Click "New Hunt"
3. Select your artifact
4. Set any conditions (OS type, labels, etc.)
5. Run the hunt

You can also run hunts via the API:

```bash
# Using the velociraptor command line with a notebook
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  query "SELECT * FROM hunt_results(hunt_id='H.123', artifact='Linux.Sys.Users')"
```

## Real-Time Monitoring with Client Events

Velociraptor can run continuous monitoring on clients using event artifacts:

```yaml
name: Custom.Linux.WatchPasswd
description: Alert when /etc/passwd is modified

type: CLIENT_EVENT

sources:
  - query: |
      SELECT * FROM watch_monitoring(artifact="Linux.Events.FileChange")
      WHERE FileName = "/etc/passwd"
```

Event artifacts run continuously and stream results back to the server.

## Checking Server Health

```bash
# Check the server service
sudo systemctl status velociraptor-server

# View server logs
sudo journalctl -u velociraptor-server -f

# Check disk usage of the datastore
sudo du -sh /var/lib/velociraptor/

# Check the number of connected clients via CLI
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  query "SELECT count() FROM clients()"
```

## Security Considerations

- The Velociraptor server has access to extensive data from all connected endpoints. Restrict access to the web UI carefully.
- Use `bind_address: 127.0.0.1` for the GUI and access it via SSH tunnel or VPN.
- The client config embeds the server certificate - protect it, as it's what allows clients to authenticate.
- Enable TLS client authentication for production deployments by setting up proper PKI in the configuration.

```bash
# Rotate server certificates periodically
sudo velociraptor --config /etc/velociraptor/server.config.yaml \
  config rotate_key
```

Velociraptor strikes a good balance between capability and operational simplicity. For security teams that need more than log monitoring but don't want the complexity of a full commercial EDR stack, it's one of the strongest options available.
