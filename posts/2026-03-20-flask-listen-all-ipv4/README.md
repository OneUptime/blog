# How to Configure Flask to Listen on All IPv4 Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flask, Python, IPv4, Networking, WSGI, Configuration

Description: Learn how to configure Flask to listen on all IPv4 interfaces using 0.0.0.0, understand the security implications, and combine it with production WSGI servers like gunicorn and uvicorn.

## Basic: app.run with host="0.0.0.0"

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello from Flask!"

if __name__ == "__main__":
    # 0.0.0.0 binds to all available IPv4 interfaces
    # The built-in server is for development only
    app.run(host="0.0.0.0", port=5000, debug=False)
```

## Using Environment Variables (Recommended)

```python
import os
from flask import Flask

app = Flask(__name__)

@app.route("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=False)
```

```bash
# Default: listen on all interfaces

python app.py

# Restrict to localhost only
FLASK_HOST=127.0.0.1 python app.py

# Custom interface
FLASK_HOST=192.168.1.10 FLASK_PORT=8080 python app.py
```

## Production: Gunicorn

```bash
# Bind to all IPv4 interfaces on port 8000
gunicorn --bind 0.0.0.0:8000 app:app --workers 4

# Restrict to localhost (with Nginx reverse proxy in front)
gunicorn --bind 127.0.0.1:8000 app:app --workers 4
```

## Production: uWSGI

```ini
; uwsgi.ini
[uwsgi]
module = app:app
master = true
processes = 4
socket = 0.0.0.0:8000
protocol = http
```

## Production: Flask with uvicorn via an ASGI adapter

```python
from asgiref.wsgi import WsgiToAsgi

asgi_app = WsgiToAsgi(app)
```

```bash
uvicorn app:asgi_app --host 0.0.0.0 --port 8000 --workers 4
```

## Getting the Client IP Inside Flask

```python
from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

@app.route("/whoami")
def whoami():
    # Only enable ProxyFix when you are behind exactly one trusted proxy
    return {"client_ip": request.remote_addr}
```

## Docker Considerations

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "5000:5000"   # host:container - publish on all host interfaces by default
      # Use "127.0.0.1:5000:5000" to restrict to loopback on the host
```

## Conclusion

In development, `app.run(host="0.0.0.0")` is convenient for testing from other machines on the LAN. In production, run Flask behind a reverse proxy (Nginx, Traefik) that handles TLS, rate limiting, and request buffering, and bind the WSGI server to `127.0.0.1` so only the proxy can reach it. Reserve `0.0.0.0` bindings for containerized deployments where port mapping, host bind addresses, and firewall rules control external access. Never run Flask's built-in development server in production.
