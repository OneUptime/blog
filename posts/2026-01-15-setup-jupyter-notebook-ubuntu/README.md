# How to Set Up Jupyter Notebook on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Jupyter, Python, Data Science, Notebook, Tutorial

Description: Complete guide to installing and configuring Jupyter Notebook on Ubuntu for data science.

---

Jupyter Notebook has become an essential tool for data scientists, researchers, and developers working with Python and other programming languages. This comprehensive guide walks you through installing, configuring, and securing Jupyter Notebook on Ubuntu, covering everything from basic setup to advanced multi-user deployments.

## Prerequisites

Before installing Jupyter Notebook, ensure your Ubuntu system is up to date:

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install Python and pip if not already installed
sudo apt install python3 python3-pip python3-venv -y

# Verify Python installation
python3 --version
pip3 --version
```

## Installing Jupyter Notebook with pip

The simplest way to install Jupyter Notebook is using pip, Python's package manager.

### System-wide Installation

```bash
# Install Jupyter Notebook globally (requires sudo)
sudo pip3 install jupyter

# Verify the installation
jupyter --version
```

### User Installation (Recommended)

Installing in user space avoids permission issues and keeps your system Python clean:

```bash
# Install Jupyter for current user only
pip3 install --user jupyter

# Add local bin to PATH (add to ~/.bashrc for persistence)
export PATH="$HOME/.local/bin:$PATH"

# Reload bashrc to apply changes
source ~/.bashrc

# Verify installation
jupyter notebook --version
```

## Installing Jupyter with Conda

Conda provides a more comprehensive environment management solution, particularly useful for data science workflows.

### Installing Miniconda

```bash
# Download Miniconda installer
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Make the installer executable
chmod +x Miniconda3-latest-Linux-x86_64.sh

# Run the installer (follow prompts)
./Miniconda3-latest-Linux-x86_64.sh

# Initialize conda for bash
conda init bash

# Restart shell or source bashrc
source ~/.bashrc
```

### Installing Jupyter via Conda

```bash
# Create a new conda environment for Jupyter
conda create -n jupyter_env python=3.11 -y

# Activate the environment
conda activate jupyter_env

# Install Jupyter Notebook
conda install jupyter -y

# Alternatively, install the full Anaconda distribution
# which includes Jupyter and many data science packages
conda install anaconda -y
```

## Running Jupyter Notebook

### Basic Usage

```bash
# Start Jupyter Notebook server
jupyter notebook

# Start with a specific port
jupyter notebook --port=8889

# Start without opening browser automatically
jupyter notebook --no-browser

# Start and allow connections from any IP (for remote access)
jupyter notebook --ip=0.0.0.0

# Specify a notebook directory
jupyter notebook --notebook-dir=/path/to/notebooks
```

### Running in the Background

```bash
# Run Jupyter in background using nohup
nohup jupyter notebook --no-browser &

# View the output log
cat nohup.out

# Find the running Jupyter process
ps aux | grep jupyter

# Stop Jupyter gracefully
jupyter notebook stop 8888
```

## JupyterLab: The Next-Generation Interface

JupyterLab provides a more modern, IDE-like interface with enhanced features.

### Installing JupyterLab

```bash
# Install via pip
pip3 install jupyterlab

# Or via conda
conda install -c conda-forge jupyterlab -y

# Start JupyterLab
jupyter lab

# Start with specific options
jupyter lab --port=8890 --no-browser
```

### Key JupyterLab Features

JupyterLab offers several advantages over classic Jupyter Notebook:

- **Multiple document interface**: Work with notebooks, terminals, and text files side by side
- **Drag-and-drop cells**: Easily reorganize notebook content
- **Built-in file browser**: Navigate your project directory seamlessly
- **Extension system**: Customize your environment with powerful extensions
- **Integrated terminal**: Run shell commands without leaving the interface

## Configuration File Setup

Jupyter uses a configuration file to manage settings persistently.

### Generating the Configuration File

```bash
# Generate default configuration file
jupyter notebook --generate-config

# This creates ~/.jupyter/jupyter_notebook_config.py

# View the configuration file location
jupyter --config-dir
```

### Essential Configuration Options

Edit `~/.jupyter/jupyter_notebook_config.py`:

```python
# ~/.jupyter/jupyter_notebook_config.py

# Network Configuration
# ---------------------

# IP address to listen on (use '0.0.0.0' for all interfaces)
c.NotebookApp.ip = 'localhost'

# Port to run the server on
c.NotebookApp.port = 8888

# Don't open browser automatically
c.NotebookApp.open_browser = False

# Directory Configuration
# -----------------------

# Default directory for notebooks
c.NotebookApp.notebook_dir = '/home/username/notebooks'

# Security Configuration
# ----------------------

# Allow remote access (set to False for local-only)
c.NotebookApp.allow_remote_access = True

# Disable password requirement (not recommended for production)
# c.NotebookApp.token = ''
# c.NotebookApp.password = ''

# Performance Configuration
# -------------------------

# Shutdown notebook after N seconds of inactivity (0 = never)
c.NotebookApp.shutdown_no_activity_timeout = 3600

# Cull idle kernels after N seconds
c.MappingKernelManager.cull_idle_timeout = 1800

# Check for idle kernels every N seconds
c.MappingKernelManager.cull_interval = 300

# SSL/TLS Configuration (for HTTPS)
# ---------------------------------

# Path to SSL certificate
# c.NotebookApp.certfile = '/path/to/cert.pem'

# Path to SSL key
# c.NotebookApp.keyfile = '/path/to/key.pem'
```

## Password and Token Security

Securing your Jupyter installation is critical, especially when accessible over a network.

### Setting a Password

```bash
# Generate a hashed password
jupyter notebook password

# This prompts for a password and stores the hash in:
# ~/.jupyter/jupyter_notebook_config.json
```

### Manual Password Configuration

```python
# Generate password hash programmatically
from notebook.auth import passwd

# Generate hash for your password
password_hash = passwd('your_secure_password')
print(password_hash)

# Output example: 'argon2:$argon2id$v=19$m=10240,t=10,p=8$...'
```

Add the hash to your configuration:

```python
# In ~/.jupyter/jupyter_notebook_config.py
c.NotebookApp.password = 'argon2:$argon2id$v=19$m=10240,t=10,p=8$your_hash_here'
```

### Token-Based Authentication

```python
# Disable token authentication (use with password)
c.NotebookApp.token = ''

# Or set a specific token
c.NotebookApp.token = 'your_secure_token_here'

# Generate a random token
import secrets
print(secrets.token_hex(24))
```

## Running Jupyter as a Systemd Service

For production deployments, run Jupyter as a system service for automatic startup and management.

### Creating the Service File

Create `/etc/systemd/system/jupyter.service`:

```ini
# /etc/systemd/system/jupyter.service
[Unit]
Description=Jupyter Notebook Server
After=network.target

[Service]
Type=simple
User=jupyter_user
Group=jupyter_user
WorkingDirectory=/home/jupyter_user/notebooks

# Environment variables
Environment="PATH=/home/jupyter_user/.local/bin:/usr/local/bin:/usr/bin:/bin"

# For conda environments, use:
# Environment="PATH=/home/jupyter_user/miniconda3/envs/jupyter_env/bin:$PATH"

# Command to start Jupyter
ExecStart=/home/jupyter_user/.local/bin/jupyter notebook --config=/home/jupyter_user/.jupyter/jupyter_notebook_config.py

# Restart policy
Restart=always
RestartSec=10

# Resource limits
MemoryLimit=4G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

### Managing the Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable jupyter

# Start the service
sudo systemctl start jupyter

# Check service status
sudo systemctl status jupyter

# View logs
sudo journalctl -u jupyter -f

# Stop the service
sudo systemctl stop jupyter

# Restart the service
sudo systemctl restart jupyter
```

## Installing Additional Kernels

Jupyter supports multiple programming languages through kernels.

### Python Kernel (ipykernel)

```bash
# Install ipykernel for a specific Python environment
pip3 install ipykernel

# Register a virtual environment as a kernel
python3 -m ipykernel install --user --name=myenv --display-name="Python (myenv)"

# List installed kernels
jupyter kernelspec list

# Remove a kernel
jupyter kernelspec remove myenv
```

### R Kernel (IRkernel)

```bash
# Install R if not already installed
sudo apt install r-base r-base-dev -y

# Start R and install IRkernel
R
```

In R console:

```r
# Install IRkernel package
install.packages('IRkernel')

# Register the kernel with Jupyter
IRkernel::installspec()

# For system-wide installation
IRkernel::installspec(user = FALSE)

# Exit R
q()
```

### Julia Kernel (IJulia)

```bash
# Download and install Julia
wget https://julialang-s3.julialang.org/bin/linux/x64/1.10/julia-1.10.0-linux-x86_64.tar.gz
tar -xzf julia-1.10.0-linux-x86_64.tar.gz
sudo mv julia-1.10.0 /opt/julia

# Add Julia to PATH
echo 'export PATH="/opt/julia/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install IJulia kernel
julia -e 'using Pkg; Pkg.add("IJulia")'
```

### Bash Kernel

```bash
# Install bash_kernel
pip3 install bash_kernel

# Register the kernel
python3 -m bash_kernel.install
```

### Verifying Installed Kernels

```bash
# List all available kernels
jupyter kernelspec list

# Example output:
# Available kernels:
#   python3    /home/user/.local/share/jupyter/kernels/python3
#   ir         /home/user/.local/share/jupyter/kernels/ir
#   julia-1.10 /home/user/.local/share/jupyter/kernels/julia-1.10
#   bash       /home/user/.local/share/jupyter/kernels/bash
```

## Virtual Environments with Jupyter

Using virtual environments with Jupyter helps maintain clean, reproducible development environments.

### Creating and Registering Virtual Environments

```bash
# Create a new virtual environment
python3 -m venv ~/envs/data_science

# Activate the environment
source ~/envs/data_science/bin/activate

# Install required packages
pip install numpy pandas matplotlib scikit-learn

# Install ipykernel in the environment
pip install ipykernel

# Register the environment as a Jupyter kernel
python -m ipykernel install --user --name=data_science --display-name="Python (Data Science)"

# Deactivate when done
deactivate
```

### Managing Conda Environments

```bash
# Create a conda environment with specific packages
conda create -n ml_env python=3.11 numpy pandas scikit-learn tensorflow -y

# Activate the environment
conda activate ml_env

# Install ipykernel
conda install ipykernel -y

# Register with Jupyter
python -m ipykernel install --user --name=ml_env --display-name="Python (ML)"

# List all conda environments
conda env list
```

### Automatic Environment Activation

Create a startup script for notebooks:

```python
# ~/.ipython/profile_default/startup/00-setup.py

import sys
import os

# Print environment information at notebook startup
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"Working directory: {os.getcwd()}")
```

## Extensions and Themes

Enhance your Jupyter experience with extensions and custom themes.

### Jupyter Notebook Extensions

```bash
# Install jupyter_contrib_nbextensions
pip3 install jupyter_contrib_nbextensions

# Install JavaScript and CSS files
jupyter contrib nbextension install --user

# Enable the configurator
pip3 install jupyter_nbextensions_configurator
jupyter nbextensions_configurator enable --user
```

After installation, navigate to `http://localhost:8888/nbextensions` to configure extensions.

#### Recommended Extensions

- **Table of Contents**: Auto-generate navigation from headers
- **Codefolding**: Collapse code blocks for better readability
- **ExecuteTime**: Show execution time for each cell
- **Autopep8**: Automatically format Python code
- **Variable Inspector**: View all defined variables
- **Collapsible Headings**: Collapse sections by headers

### JupyterLab Extensions

```bash
# Install Node.js (required for JupyterLab extensions)
sudo apt install nodejs npm -y

# Install popular JupyterLab extensions
pip3 install jupyterlab-git          # Git integration
pip3 install jupyterlab-lsp          # Language Server Protocol
pip3 install jupyterlab_code_formatter  # Code formatting

# List installed extensions
jupyter labextension list
```

### Custom Themes

```bash
# Install jupyterthemes for classic notebook
pip3 install jupyterthemes

# List available themes
jt -l

# Apply a dark theme
jt -t monokai -f fira -fs 12 -nf ptsans -nfs 11 -T -N

# Reset to default theme
jt -r
```

For JupyterLab:

```bash
# Install JupyterLab theme
pip3 install jupyterlab_darkside_ui

# Or use built-in theme switching
# Settings -> Theme -> JupyterLab Dark
```

## Sharing Notebooks

### Exporting Notebooks

```bash
# Export to HTML
jupyter nbconvert --to html notebook.ipynb

# Export to PDF (requires pandoc and texlive)
sudo apt install pandoc texlive-xetex texlive-fonts-recommended -y
jupyter nbconvert --to pdf notebook.ipynb

# Export to Python script
jupyter nbconvert --to script notebook.ipynb

# Export to Markdown
jupyter nbconvert --to markdown notebook.ipynb

# Export with executed output
jupyter nbconvert --to html --execute notebook.ipynb
```

### Using nbviewer

Share notebooks via GitHub and nbviewer:

```bash
# Push your notebook to GitHub
git add notebook.ipynb
git commit -m "Add analysis notebook"
git push origin main

# View at: https://nbviewer.org/github/username/repo/blob/main/notebook.ipynb
```

### Binder for Interactive Sharing

Create a `binder/environment.yml` for reproducible environments:

```yaml
# binder/environment.yml
name: notebook-env
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.11
  - numpy
  - pandas
  - matplotlib
  - scikit-learn
  - jupyter
```

Your notebook becomes interactive at: `https://mybinder.org/v2/gh/username/repo/main`

## JupyterHub for Multi-User Deployments

JupyterHub provides multi-user access to Jupyter notebooks.

### Installing JupyterHub

```bash
# Install Node.js and npm (required)
sudo apt install nodejs npm -y

# Install JupyterHub
pip3 install jupyterhub

# Install configurable-http-proxy
sudo npm install -g configurable-http-proxy

# Verify installation
jupyterhub --version
```

### Basic Configuration

Generate and edit the configuration file:

```bash
# Generate default config
jupyterhub --generate-config

# This creates jupyterhub_config.py
```

Edit `jupyterhub_config.py`:

```python
# jupyterhub_config.py

# Network settings
c.JupyterHub.ip = '0.0.0.0'
c.JupyterHub.port = 8000

# Authentication
c.Authenticator.admin_users = {'admin_user'}
c.Authenticator.allowed_users = {'user1', 'user2', 'user3'}

# Spawner configuration
c.Spawner.default_url = '/lab'  # Use JupyterLab by default
c.Spawner.notebook_dir = '~/notebooks'

# Resource limits per user
c.Spawner.mem_limit = '2G'
c.Spawner.cpu_limit = 1

# Idle culling
c.JupyterHub.services = [
    {
        'name': 'cull-idle',
        'admin': True,
        'command': [
            sys.executable,
            '-m', 'jupyterhub_idle_culler',
            '--timeout=3600'
        ],
    }
]
```

### JupyterHub as a Service

Create `/etc/systemd/system/jupyterhub.service`:

```ini
# /etc/systemd/system/jupyterhub.service
[Unit]
Description=JupyterHub
After=network.target

[Service]
User=root
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/local/bin/jupyterhub -f /etc/jupyterhub/jupyterhub_config.py
WorkingDirectory=/etc/jupyterhub
Restart=always

[Install]
WantedBy=multi-user.target
```

### OAuth Authentication

For production, use OAuth instead of system authentication:

```bash
# Install OAuth authenticator
pip3 install oauthenticator
```

```python
# jupyterhub_config.py for GitHub OAuth
from oauthenticator.github import GitHubOAuthenticator

c.JupyterHub.authenticator_class = GitHubOAuthenticator
c.GitHubOAuthenticator.oauth_callback_url = 'https://yourdomain.com/hub/oauth_callback'
c.GitHubOAuthenticator.client_id = 'your_github_client_id'
c.GitHubOAuthenticator.client_secret = 'your_github_client_secret'
```

## Security Best Practices

### Network Security

```bash
# Configure firewall to limit access
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 8888/tcp  # Only if needed from outside

# For production, use a reverse proxy
sudo apt install nginx -y
```

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/jupyter
server {
    listen 80;
    server_name jupyter.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jupyter.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/jupyter.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jupyter.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
# Enable the Nginx site
sudo ln -s /etc/nginx/sites-available/jupyter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install and configure Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d jupyter.yourdomain.com
```

### Additional Security Measures

```python
# ~/.jupyter/jupyter_notebook_config.py

# Disable potentially dangerous features
c.NotebookApp.allow_root = False  # Never run as root
c.NotebookApp.disable_check_xsrf = False  # Keep XSRF protection

# Content Security Policy
c.NotebookApp.tornado_settings = {
    'headers': {
        'Content-Security-Policy': "frame-ancestors 'self'"
    }
}

# Limit file access
c.ContentsManager.allow_hidden = False

# Session security
c.NotebookApp.cookie_options = {
    'expires_days': 1,
    'httponly': True,
    'secure': True  # Requires HTTPS
}
```

### Security Checklist

1. **Always use HTTPS** in production environments
2. **Set strong passwords** using `jupyter notebook password`
3. **Keep software updated** regularly
4. **Use virtual environments** to isolate dependencies
5. **Limit network exposure** using firewall rules
6. **Implement authentication** via OAuth for multi-user setups
7. **Monitor access logs** for suspicious activity
8. **Backup notebooks** regularly
9. **Avoid running as root** user
10. **Review notebook contents** before sharing

## Troubleshooting Common Issues

### Kernel Connection Issues

```bash
# Restart the kernel manager
jupyter kernelspec list

# Check kernel logs
cat ~/.local/share/jupyter/runtime/kernel-*.json

# Reinstall ipykernel
pip uninstall ipykernel -y
pip install ipykernel
python -m ipykernel install --user
```

### Port Already in Use

```bash
# Find process using the port
sudo lsof -i :8888

# Kill the process
kill -9 <PID>

# Or use a different port
jupyter notebook --port=8889
```

### Permission Errors

```bash
# Fix ownership of Jupyter directories
sudo chown -R $USER:$USER ~/.jupyter
sudo chown -R $USER:$USER ~/.local/share/jupyter

# Fix runtime directory permissions
chmod 700 ~/.local/share/jupyter/runtime
```

### Memory Issues

```bash
# Monitor memory usage
free -h

# Limit kernel memory in config
# Add to jupyter_notebook_config.py:
# c.NotebookApp.max_buffer_size = 536870912  # 512MB
```

## Conclusion

Jupyter Notebook is a powerful tool for data science, research, and education. This guide covered everything from basic installation to advanced multi-user deployments with JupyterHub. Remember to follow security best practices, especially when exposing Jupyter to networks, and keep your installation updated.

Key takeaways:
- Use virtual environments to maintain clean, reproducible setups
- Secure your installation with passwords, HTTPS, and proper firewall rules
- Leverage extensions to enhance productivity
- Consider JupyterHub for team environments
- Regularly backup your notebooks and configurations

---

**Monitoring Your Jupyter Infrastructure with OneUptime**

Running Jupyter Notebook servers in production requires reliable monitoring to ensure availability and performance. [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring that can help you:

- **Monitor server uptime**: Get instant alerts when your Jupyter server becomes unavailable
- **Track resource usage**: Monitor CPU, memory, and disk usage to prevent performance degradation
- **Set up status pages**: Keep your team informed about Jupyter service status
- **Configure alerts**: Receive notifications via email, Slack, or other channels when issues arise
- **Analyze logs**: Centralize and analyze Jupyter logs for troubleshooting
- **Schedule maintenance**: Plan and communicate scheduled downtime effectively

With OneUptime, you can ensure your data science infrastructure remains reliable and performant, allowing your team to focus on what matters most: analyzing data and building models.
