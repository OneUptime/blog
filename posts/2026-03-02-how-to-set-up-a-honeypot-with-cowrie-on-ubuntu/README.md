# How to Set Up a Honeypot with Cowrie on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Honeypot, Cowrie, Threat Intelligence

Description: Learn how to deploy Cowrie SSH and Telnet honeypot on Ubuntu to capture attacker behavior, collect threat intelligence, and detect unauthorized access attempts.

---

Cowrie is an interactive SSH and Telnet honeypot that emulates a Linux system to trick attackers into thinking they've compromised a real server. When attackers connect, they interact with a simulated shell, and Cowrie records everything - their commands, files they upload, lateral movement attempts, and malware they deploy. The logs are structured JSON, making them easy to analyze and integrate with threat intelligence platforms.

Running a honeypot gives you real attacker TTPs (Tactics, Techniques, and Procedures) from your own environment, insight into which credentials are being tried against your systems, and early warning of targeted attacks against your infrastructure.

## Security Considerations

A honeypot is deliberately exposed to attackers. It should be isolated from your production network. Run it:

- On a dedicated server or VM with no connectivity to internal systems
- With firewall rules that prevent outbound connections from Cowrie (attackers may try to pivot)
- On a network segment where you can monitor all traffic

Never run Cowrie as root. It runs as a dedicated low-privilege user.

## Creating a Dedicated User

```bash
# Create the cowrie user
sudo adduser --disabled-password cowrie

# Switch to the cowrie user for installation
sudo su - cowrie
```

## Installing Dependencies

```bash
# Back as root or with sudo
sudo apt update
sudo apt install -y git python3 python3-venv python3-dev \
    libssl-dev libffi-dev build-essential authbind

# Install authbind to allow binding to port 22 without root
sudo touch /etc/authbind/byport/22
sudo touch /etc/authbind/byport/23
sudo chown cowrie:cowrie /etc/authbind/byport/22
sudo chown cowrie:cowrie /etc/authbind/byport/23
sudo chmod 770 /etc/authbind/byport/22
sudo chmod 770 /etc/authbind/byport/23
```

## Installing Cowrie

```bash
# Switch to cowrie user
sudo su - cowrie

# Clone Cowrie
git clone http://github.com/cowrie/cowrie
cd cowrie

# Create and activate virtual environment
python3 -m venv cowrie-env
source cowrie-env/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

## Configuring Cowrie

Copy the example configuration:

```bash
cd ~/cowrie
cp etc/cowrie.cfg.dist etc/cowrie.cfg
nano etc/cowrie.cfg
```

Key configuration options:

```ini
# etc/cowrie.cfg

[honeypot]
# Hostname shown to attackers - make it convincing
hostname = prod-webserver-01

# Timezone to use for log timestamps
timezone = UTC

# Directory for var files (logs, downloads)
log_path = var/log/cowrie
download_path = var/lib/cowrie/downloads

# Fake filesystem image
filesystem = share/cowrie/fs.pickle

# Data directory for fake file contents
data_path = share/cowrie

# Pool of fake passwords that appear to work
auth_class = UserDB
auth_class_parameters = etc/userdb.txt

[ssh]
enabled = true
# Listen on port 2222, then forward 22 -> 2222 with iptables
listen_endpoints = tcp:2222:interface=0.0.0.0

[telnet]
enabled = true
listen_endpoints = tcp:2323:interface=0.0.0.0

[output_jsonlog]
enabled = true
logfile = ${honeypot:log_path}/cowrie.json.log
epoch_timestamp = false
```

### Configuring fake credentials

Define username/password combinations that "work" on the honeypot:

```bash
nano ~/cowrie/etc/userdb.txt
```

```
# Cowrie userdb.txt - credentials that are accepted
# Format: username:uid:password
# Use * as wildcard password (accepts anything)
# Use ! prefix to reject
root:0:!root          # Reject root login with password "root"
root:0:!123456        # Reject these common passwords
root:0:*              # Accept root with any other password
admin:0:admin
admin:0:password
ubuntu:1000:ubuntu
pi:1000:raspberry
```

### Building the fake filesystem

Cowrie uses a pickled filesystem image to simulate a real Linux system:

```bash
# Create filesystem from a real system (run on a throwaway VM)
# Or use the included generator
python3 bin/createfs -o share/cowrie/fs.pickle

# Alternatively, customize an existing filesystem image
# The default one works fine for most deployments
```

## Port Forwarding

Move real SSH to a different port and forward 22 to Cowrie:

```bash
# Change your real SSH to port 22022
sudo nano /etc/ssh/sshd_config
# Change: Port 22 -> Port 22022
sudo systemctl restart sshd

# Reconnect on the new port before proceeding!
ssh -p 22022 user@your-server

# Forward port 22 to Cowrie (port 2222)
sudo iptables -t nat -A PREROUTING -p tcp --dport 22 -j REDIRECT --to-port 2222
sudo iptables -t nat -A PREROUTING -p tcp --dport 23 -j REDIRECT --to-port 2323

# Make iptables rules persistent
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

## Starting Cowrie

```bash
# As the cowrie user
sudo su - cowrie
cd cowrie
source cowrie-env/bin/activate

# Start Cowrie
bin/cowrie start

# Check that it's running
bin/cowrie status

# View the log
tail -f var/log/cowrie/cowrie.log
```

## Setting Up as a Systemd Service

```bash
sudo nano /etc/systemd/system/cowrie.service
```

```ini
[Unit]
Description=Cowrie SSH/Telnet Honeypot
After=network.target

[Service]
User=cowrie
Group=cowrie
WorkingDirectory=/home/cowrie/cowrie
ExecStart=/home/cowrie/cowrie/bin/cowrie start-systemd
ExecStop=/home/cowrie/cowrie/bin/cowrie stop
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cowrie
sudo systemctl start cowrie
```

## Analyzing Cowrie Logs

Cowrie's JSON log contains detailed session information:

```bash
# Count login attempts by username
cat var/log/cowrie/cowrie.json.log | \
    python3 -c "import sys,json; [print(json.loads(l).get('username','')) for l in sys.stdin]" | \
    sort | uniq -c | sort -rn | head -20

# Extract commands attackers ran
cat var/log/cowrie/cowrie.json.log | \
    python3 -c "
import sys, json
for line in sys.stdin:
    try:
        data = json.loads(line)
        if data.get('eventid') == 'cowrie.command.input':
            print(data.get('input', ''))
    except: pass" | \
    sort | uniq -c | sort -rn | head -30

# Find downloaded malware samples
ls -la var/lib/cowrie/downloads/

# See source IPs that successfully authenticated
grep '"cowrie.login.success"' var/log/cowrie/cowrie.json.log | \
    python3 -c "import sys,json; [print(json.loads(l).get('src_ip')) for l in sys.stdin]" | \
    sort | uniq -c | sort -rn
```

## Submitting Malware Samples

Files attackers upload are stored in `var/lib/cowrie/downloads/`. You can submit them to VirusTotal:

```bash
pip3 install requests

# Simple VirusTotal submission script
python3 << 'EOF'
import requests, os

API_KEY = "your_virustotal_api_key"
downloads_dir = "/home/cowrie/cowrie/var/lib/cowrie/downloads/"

for filename in os.listdir(downloads_dir):
    filepath = os.path.join(downloads_dir, filename)
    with open(filepath, 'rb') as f:
        response = requests.post(
            'https://www.virustotal.com/api/v3/files',
            headers={'x-apikey': API_KEY},
            files={'file': f}
        )
    print(f"{filename}: {response.json().get('data', {}).get('id', 'error')}")
EOF
```

Cowrie turns your exposed SSH port from a liability into an intelligence asset. Within hours of deployment, you'll start seeing the constant background noise of automated credential stuffing, and occasionally you'll catch more sophisticated attackers running reconnaissance scripts - all safely contained in the honeypot with no impact on your real systems.
