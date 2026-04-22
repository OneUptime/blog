# How to Self-Host a Code Server (VS Code) with Portainer - Self Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Code Server, VS Code, Self-Hosting, Docker, Development, Remote IDE

Description: Learn how to deploy code-server, a browser-based VS Code environment, via Portainer for remote development accessible from any device.

---

Code-server brings the full VS Code editor to the browser. You can edit code, run terminals, and install extensions from any device without setting up local development environments. Portainer simplifies deployment and management.

## Compose Stack

```yaml
services:
  code-server:
    image: codercom/code-server:latest
    restart: unless-stopped
    ports:
      - "8443:8080"
    environment:
      # Password to access the editor
      PASSWORD: changeme-strong-password
    volumes:
      # Persist your home directory and project files
      - code_server_data:/home/coder
      - /mnt/projects:/home/coder/projects  # Mount your project directory
    user: "1000:1000"

volumes:
  code_server_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `code-server`.
3. Set a strong `PASSWORD`.
4. Click **Deploy the stack**.

Open `http://<host>:8443`. Enter the password and you'll have a full VS Code environment.

## Installing Common Tools

From the code-server terminal, install development tools:

```bash
# Install Node.js via nvm

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc
nvm install --lts

# Install Python tools
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip
python3 -m venv ~/.venvs/devtools
source ~/.venvs/devtools/bin/activate
python -m pip install --upgrade pip
python -m pip install virtualenv black flake8 mypy

# Install Go
wget https://go.dev/dl/go1.26.2.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.2.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

## HTTPS with a Reverse Proxy

For production access, put code-server behind Nginx with HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name code.example.com;

    ssl_certificate /etc/letsencrypt/live/code.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/code.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Accept-Encoding gzip;
    }
}
```

## Persisting Extensions

VS Code extensions install to `~/.local/share/code-server/extensions/`, which is inside the `code_server_data` volume. Updating the container image does not lose your installed extensions.

## Monitoring

Use OneUptime to monitor `http://<host>:8443/healthz` for HTTP 200. Alert on downtime to know when your remote development environment needs attention.
