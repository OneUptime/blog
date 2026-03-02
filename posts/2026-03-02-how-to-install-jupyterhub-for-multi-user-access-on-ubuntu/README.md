# How to Install JupyterHub for Multi-User Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, JupyterHub, Python, Data Science, Machine Learning

Description: Learn how to install and configure JupyterHub on Ubuntu to provide multi-user Jupyter notebook access with system authentication and persistent user environments.

---

JupyterHub is the multi-user version of Jupyter. Where a single Jupyter server serves one user, JupyterHub manages authentication, spawns individual notebook servers per user, and provides a central hub. It's the standard way to give a team of data scientists or students access to shared compute resources (CPUs, GPUs, large RAM) without everyone setting up their own environment.

## Architecture

JupyterHub consists of:

- **Hub** - central authentication and management service
- **Proxy** - routes requests to the right user's notebook server
- **Spawner** - launches individual notebook servers per user (local process, Docker container, Kubernetes pod)
- **Authenticator** - validates user credentials (PAM, OAuth, LDAP)

This guide uses PAM authentication (Linux system users) and the default local process spawner - appropriate for a team server where each user has a Linux account.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Python 3.9+
- At least 4GB RAM (more for concurrent users)
- sudo privileges
- DNS name or fixed IP for the server

## Step 1: Install Node.js (Required for the Proxy)

JupyterHub's proxy component requires Node.js:

```bash
# Install via NodeSource for a current version
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be 20.x
```

## Step 2: Install JupyterHub and JupyterLab

Create a dedicated Python environment for JupyterHub:

```bash
# Install Python venv support
sudo apt-get install -y python3 python3-pip python3-venv

# Create JupyterHub environment in a system-wide location
sudo python3 -m venv /opt/jupyterhub

# Activate and install
sudo /opt/jupyterhub/bin/pip install --upgrade pip

sudo /opt/jupyterhub/bin/pip install \
  jupyterhub \
  jupyterlab \
  notebook \
  ipykernel

# Install the Node.js proxy component
sudo npm install -g configurable-http-proxy

# Verify
/opt/jupyterhub/bin/jupyterhub --version
```

## Step 3: Configure JupyterHub

Generate the default configuration:

```bash
sudo mkdir -p /etc/jupyterhub
cd /etc/jupyterhub
sudo /opt/jupyterhub/bin/jupyterhub --generate-config
```

Edit `/etc/jupyterhub/jupyterhub_config.py`:

```python
# /etc/jupyterhub/jupyterhub_config.py

# ---- Network ----
# Bind to all interfaces
c.JupyterHub.bind_url = 'http://0.0.0.0:8000'

# If running behind nginx (recommended for HTTPS), use a different port
# c.JupyterHub.bind_url = 'http://127.0.0.1:8000'

# ---- Authentication ----
# Use PAM (Linux system users) - default
c.JupyterHub.authenticator_class = 'jupyterhub.auth.PAMAuthenticator'

# Whitelist specific users (optional - leave empty to allow all system users)
# c.Authenticator.allowed_users = {'alice', 'bob', 'charlie'}

# Allow anyone with a system account (set to True only for trusted systems)
c.Authenticator.allow_all = False

# Admin users can manage the hub
c.Authenticator.admin_users = {'admin'}

# ---- Spawner ----
# Use local process spawner (default)
c.JupyterHub.spawner_class = 'jupyterhub.spawner.LocalProcessSpawner'

# User notebook server settings
c.Spawner.default_url = '/lab'  # Open JupyterLab instead of classic notebook
c.Spawner.cmd = ['/opt/jupyterhub/bin/jupyterhub-singleuser']

# Resource limits per user
c.Spawner.cpu_limit = 4.0        # Max 4 CPUs
c.Spawner.mem_limit = '4G'       # Max 4GB RAM

# Notebook directory per user
c.Spawner.notebook_dir = '~/notebooks'

# Environment variables for all user servers
c.Spawner.environment = {
    'JUPYTERHUB_SINGLEUSER_APP': 'jupyter_server.serverapp.ServerApp',
}

# ---- Data directory ----
c.JupyterHub.db_url = 'sqlite:////var/lib/jupyterhub/jupyterhub.sqlite'
c.JupyterHub.cookie_secret_file = '/var/lib/jupyterhub/jupyterhub_cookie_secret'

# ---- Logging ----
c.JupyterHub.log_level = 'INFO'

# ---- Timeouts ----
# Shut down servers that have been idle for 1 hour
c.JupyterHub.shutdown_on_logout = False
c.JupyterHub.services = []

# ---- Proxy ----
c.ConfigurableHTTPProxy.command = 'configurable-http-proxy'
```

Create the data directory:

```bash
sudo mkdir -p /var/lib/jupyterhub
sudo chown root:root /var/lib/jupyterhub
sudo chmod 700 /var/lib/jupyterhub
```

## Step 4: Create System Users

Each person who needs access needs a system account:

```bash
# Create a user
sudo useradd -m -s /bin/bash alice
sudo passwd alice  # Set a password

# Create the notebooks directory for each user
sudo -u alice mkdir -p /home/alice/notebooks

# Add the admin user
sudo useradd -m -s /bin/bash admin
sudo passwd admin
```

## Step 5: Create the Systemd Service

```bash
sudo tee /etc/systemd/system/jupyterhub.service << 'EOF'
[Unit]
Description=JupyterHub
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root  # JupyterHub needs root to spawn processes as different users

Environment="PATH=/opt/jupyterhub/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

ExecStart=/opt/jupyterhub/bin/jupyterhub \
  --config=/etc/jupyterhub/jupyterhub_config.py

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable jupyterhub
sudo systemctl start jupyterhub

sudo journalctl -u jupyterhub -f
```

Access the hub at `http://your-server:8000`.

## Step 6: Configure Nginx as HTTPS Reverse Proxy

Running JupyterHub behind Nginx with TLS is strongly recommended:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Obtain a TLS certificate
sudo certbot --nginx -d jupyter.yourdomain.com

# Or use existing certs
```

```nginx
# /etc/nginx/sites-available/jupyterhub
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name jupyter.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/jupyter.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jupyter.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for Jupyter)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Increase timeouts for long-running kernels
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

server {
    listen 80;
    server_name jupyter.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jupyterhub /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

Update JupyterHub config to use the proxied URL:

```python
# In jupyterhub_config.py, tell JupyterHub it's behind a proxy
c.JupyterHub.bind_url = 'http://127.0.0.1:8000'
```

## Installing Python Kernels for Users

Each user should have the appropriate Python kernel available:

```bash
# Install a data science kernel globally (available to all users)
sudo /opt/jupyterhub/bin/pip install \
  numpy pandas matplotlib seaborn scikit-learn \
  scipy statsmodels plotly

# Register the kernel
sudo /opt/jupyterhub/bin/python3 -m ipykernel install \
  --sys-prefix \
  --name "python3-ds" \
  --display-name "Python 3 (Data Science)"

# For GPU workloads - install PyTorch or TensorFlow
sudo /opt/jupyterhub/bin/pip install torch torchvision \
  --index-url https://download.pytorch.org/whl/cu121
```

Users can also create their own virtual environments and register kernels:

```bash
# As user 'alice'
python3 -m venv ~/my-env
source ~/my-env/bin/activate
pip install ipykernel numpy pandas

# Register this kernel (visible only to this user)
python3 -m ipykernel install --user --name "alice-env" --display-name "Alice's Environment"
```

## Admin Panel

JupyterHub provides an admin panel at `http://your-server:8000/hub/admin`. From there, administrators can:

- View all active user servers
- Stop a user's server
- Start a server for another user
- Add/remove users

## Idle Culler (Automatic Server Shutdown)

Install the idle culler to automatically stop inactive servers and free resources:

```bash
sudo /opt/jupyterhub/bin/pip install jupyterhub-idle-culler
```

Add to `jupyterhub_config.py`:

```python
# Cull idle servers after 1 hour
c.JupyterHub.services = [
    {
        "name": "idle-culler",
        "admin": True,
        "command": [
            "/opt/jupyterhub/bin/python3",
            "-m", "jupyterhub_idle_culler",
            "--timeout=3600",        # Cull servers idle for 1 hour
            "--cull-every=300",      # Check every 5 minutes
            "--max-age=86400",       # Force stop servers older than 24h
        ],
    }
]
```

## Troubleshooting

**Users get "Server failed to start" error:**
```bash
# Check spawner logs
sudo journalctl -u jupyterhub | grep -i "error\|spawn\|failed"

# Verify the notebook directory exists for the user
ls -la /home/alice/notebooks

# Check the user can run jupyterhub-singleuser
sudo -u alice /opt/jupyterhub/bin/jupyterhub-singleuser --help
```

**WebSocket connection fails (notebooks disconnect):**
```bash
# Verify Nginx WebSocket config
grep -i upgrade /etc/nginx/sites-enabled/jupyterhub

# Test from the server
curl -v --include --no-buffer \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:8000
```

**Admin user cannot log in:**
```bash
# Verify the admin user has a PAM account with a password
sudo passwd admin

# Check the admin_users setting in the config
grep admin_users /etc/jupyterhub/jupyterhub_config.py
```

JupyterHub on a dedicated GPU server is an excellent setup for machine learning teams. Users get persistent notebook environments with access to shared GPUs, without needing to manage their own CUDA installations or worry about software dependencies conflicting between projects.
