# How to Set Up Buildbot for CI/CD on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Buildbot, Python, DevOps

Description: Install and configure Buildbot on Ubuntu to create a flexible Python-based CI/CD system with custom build steps, schedulers, and a web interface for monitoring builds.

---

Buildbot is a Python-based CI/CD framework where the entire configuration is Python code. This makes it unlike most CI systems - instead of a YAML file, you write actual Python to define your build logic. This provides nearly unlimited flexibility but requires Python knowledge to configure effectively.

Buildbot suits teams with complex custom build requirements that cannot be expressed in simple YAML configurations, or organizations that need deep integration with their existing Python infrastructure.

## Architecture

Buildbot has three main components:

- **Master:** Orchestrates builds, stores state in a database, serves the web UI
- **Worker:** Runs on build machines, executes build steps
- **Web UI:** A JavaScript frontend that connects to the master's API

Workers can run on any machine with Python and network access to the master.

## Installing Buildbot

Buildbot is a Python package installed via pip. Using a virtual environment isolates it from system Python packages.

### Install System Dependencies

```bash
sudo apt update
sudo apt install python3-pip python3-venv git -y
```

### Create a Buildbot User and Directory

```bash
# Create a dedicated user
sudo useradd -m -s /bin/bash buildbot
sudo mkdir -p /opt/buildbot

# Create virtual environment
sudo python3 -m venv /opt/buildbot/venv
sudo chown -R buildbot:buildbot /opt/buildbot
```

### Install Buildbot

```bash
# Switch to buildbot user
sudo -u buildbot bash

# Activate virtual environment
source /opt/buildbot/venv/bin/activate

# Install Buildbot with web support
pip install 'buildbot[bundle]' buildbot-worker buildbot-www

# Verify installation
buildbot --version
buildbot-worker --version
```

## Initializing the Master

```bash
# Still as buildbot user with venv active
cd /opt/buildbot

# Initialize a new master configuration
buildbot create-master master

# This creates /opt/buildbot/master/ with:
# - master.cfg.sample (sample configuration)
# - master.cfg (you create this)
```

## Writing the Master Configuration

The heart of Buildbot is `master.cfg`, a Python file:

```bash
cat > /opt/buildbot/master/master.cfg << 'PYEOF'
# -*- python -*-
# Buildbot master configuration
# This is a Python script - you have full Python available

from buildbot.plugins import *

# Global configuration
c = BuildmasterConfig = {}

# Workers - define what machines can run builds
c['workers'] = [
    worker.Worker("local-worker", "worker-secret-password"),
    # Add more workers as needed:
    # worker.Worker("worker-2", "another-password"),
]

# Change sources - where to monitor for changes
c['change_source'] = []
c['change_source'].append(changes.GitPoller(
    'https://github.com/yourusername/yourrepo.git',
    workdir='gitpoller-workdir',
    branch='main',
    pollInterval=300   # Check every 5 minutes
))

# Schedulers - when to run builds
c['schedulers'] = []

# Trigger on code changes
c['schedulers'].append(schedulers.SingleBranchScheduler(
    name="all-changes",
    change_filter=util.ChangeFilter(branch='main'),
    treeStableTimer=None,
    builderNames=["runtests"]
))

# Allow manual triggering via web UI
c['schedulers'].append(schedulers.ForceScheduler(
    name="force",
    builderNames=["runtests", "build-docker"]
))

# Nightly build at 2am
c['schedulers'].append(schedulers.Nightly(
    name="nightly",
    builderNames=["runtests"],
    hour=2,
    minute=0
))

# Build factories - define sequences of build steps
##########################################################
# Test factory - runs unit tests
test_factory = util.BuildFactory()

# Check out the source code
test_factory.addStep(steps.Git(
    repourl='https://github.com/yourusername/yourrepo.git',
    mode='incremental',
    branch='main'
))

# Install dependencies
test_factory.addStep(steps.ShellCommand(
    command=["pip", "install", "-r", "requirements.txt"],
    description="installing dependencies",
    descriptionDone="installed dependencies"
))

# Run tests with coverage
test_factory.addStep(steps.ShellCommand(
    command=["python", "-m", "pytest", "tests/", "--tb=short", "-v",
             "--junitxml=test-results.xml"],
    description="running tests",
    descriptionDone="tests complete"
))

# Upload test results
test_factory.addStep(steps.FileUpload(
    workersrc="test-results.xml",
    masterdest="public_html/test-results/test-results.xml",
    url="test-results/test-results.xml"
))

##########################################################
# Docker build factory
docker_factory = util.BuildFactory()

docker_factory.addStep(steps.Git(
    repourl='https://github.com/yourusername/yourrepo.git',
    mode='incremental'
))

# Build Docker image
docker_factory.addStep(steps.ShellCommand(
    command=util.Interpolate(
        "docker build -t myapp:%(prop:got_revision)s ."
    ),
    description="building Docker image"
))

# Push to registry (only on main branch)
docker_factory.addStep(steps.ShellCommand(
    command=util.Interpolate(
        "docker push myapp:%(prop:got_revision)s"
    ),
    description="pushing image",
    doStepIf=lambda step: step.build.getProperty('branch') == 'main'
))

# Builders - connect factories to workers
c['builders'] = []
c['builders'].append(
    util.BuilderConfig(
        name="runtests",
        workernames=["local-worker"],
        factory=test_factory
    )
)
c['builders'].append(
    util.BuilderConfig(
        name="build-docker",
        workernames=["local-worker"],
        factory=docker_factory
    )
)

# Web UI configuration
c['www'] = {
    'port': 8010,
    'plugins': {
        'waterfall_view': {},
        'console_view': {},
        'grid_view': {},
    },
    # Authentication - simple user/password
    'auth': util.UserPasswordAuth({"admin": "admin-password"}),
    'authz': util.Authz(
        allowRules=[
            util.AnyEndpointMatcher(role="admins"),
        ],
        roleMatchers=[
            util.RolesFromEmails(admins=["admin"])
        ]
    )
}

# Database - SQLite for small setups, PostgreSQL for production
c['db'] = {
    'db_url': 'sqlite:///state.sqlite',
    # For PostgreSQL:
    # 'db_url': 'postgresql+psycopg2://buildbot:password@localhost/buildbot',
}

# Title and URL
c['title'] = "My CI"
c['titleURL'] = "https://ci.example.com"
c['buildbotURL'] = "https://ci.example.com/"

# Worker and build limits
c['protocols'] = {'pb': {'port': 9989}}   # Worker communication port
c['buildCacheSize'] = 15   # Keep last 15 builds in memory

PYEOF
```

## Initializing and Starting the Worker

```bash
# As buildbot user with venv active

# Create a worker
buildbot-worker create-worker /opt/buildbot/worker \
    localhost:9989 \         # Master host:port
    "local-worker" \         # Worker name (must match master.cfg)
    "worker-secret-password"  # Password (must match master.cfg)

# Set worker info
echo "Ubuntu 22.04 Build Worker" > /opt/buildbot/worker/info/host
echo "Your Name <your@email.com>" > /opt/buildbot/worker/info/admin
```

## Starting Buildbot with systemd

Create systemd services for the master and worker:

```bash
# Exit from buildbot user
exit

# Buildbot master service
sudo nano /etc/systemd/system/buildbot-master.service
```

```ini
[Unit]
Description=Buildbot Master
After=network.target

[Service]
User=buildbot
Group=buildbot
WorkingDirectory=/opt/buildbot/master
Environment="PATH=/opt/buildbot/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/buildbot/venv/bin/buildbot start --nodaemon /opt/buildbot/master
ExecStop=/opt/buildbot/venv/bin/buildbot stop /opt/buildbot/master
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /etc/systemd/system/buildbot-worker.service
```

```ini
[Unit]
Description=Buildbot Worker
After=buildbot-master.service

[Service]
User=buildbot
Group=buildbot
WorkingDirectory=/opt/buildbot/worker
Environment="PATH=/opt/buildbot/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/buildbot/venv/bin/buildbot-worker start --nodaemon /opt/buildbot/worker
ExecStop=/opt/buildbot/venv/bin/buildbot-worker stop /opt/buildbot/worker
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable buildbot-master buildbot-worker
sudo systemctl start buildbot-master
sleep 5
sudo systemctl start buildbot-worker

# Check status
sudo systemctl status buildbot-master
sudo systemctl status buildbot-worker
```

## Reverse Proxy with Nginx

```bash
sudo nano /etc/nginx/sites-available/buildbot
```

```nginx
server {
    listen 80;
    server_name ci.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ci.example.com;

    ssl_certificate /etc/letsencrypt/live/ci.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ci.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/buildbot /etc/nginx/sites-enabled/
sudo certbot --nginx -d ci.example.com
sudo systemctl reload nginx
```

## Adding GitHub Webhook Integration

Instead of polling, receive webhooks from GitHub:

```python
# Add to master.cfg
c['www']['change_hook_dialects'] = {
    'github': {
        'secret': 'your-webhook-secret',
        'strict': True,
    }
}
```

In GitHub repository settings > Webhooks, add:
- Payload URL: `https://ci.example.com/change_hook/github`
- Content type: `application/json`
- Secret: same as `'secret'` in master.cfg
- Events: Just the push event

## Triggering Builds via CLI

```bash
# Activate venv and use buildbot CLI
source /opt/buildbot/venv/bin/activate

# Force a build from command line
buildbot sendchange --master localhost:9989 \
    --who "admin" \
    --revision "HEAD" \
    --branch main \
    --project yourrepo \
    yourrepo

# Check master status
buildbot statuslog /opt/buildbot/master
```

## Updating Configuration

After changing `master.cfg`:

```bash
# Check for syntax errors
sudo -u buildbot bash -c "source /opt/buildbot/venv/bin/activate && buildbot checkconfig /opt/buildbot/master"

# Reload configuration (no restart needed for most changes)
sudo -u buildbot bash -c "source /opt/buildbot/venv/bin/activate && buildbot reconfig /opt/buildbot/master"

# Or restart for larger changes
sudo systemctl restart buildbot-master
```

## Monitoring

```bash
# Buildbot master logs
sudo journalctl -u buildbot-master -f

# Worker logs
sudo journalctl -u buildbot-worker -f

# Direct log files
sudo tail -f /opt/buildbot/master/twistd.log
sudo tail -f /opt/buildbot/worker/twistd.log
```

## Troubleshooting

**Worker does not connect:** Verify port 9989 is accessible. Check that the worker name and password in `create-worker` match exactly what is in master.cfg. Check the master log for connection attempts.

**Configuration errors at startup:** Run `buildbot checkconfig /opt/buildbot/master` to validate Python syntax and Buildbot configuration. Python exceptions are shown with line numbers.

**Build steps fail silently:** Increase step logging by adding `logEnviron=True` to `ShellCommand` steps. Check the build log in the web UI for the full step output.

**Web UI not loading:** Ensure `buildbot-www` package is installed in the virtual environment. Check that `c['www']['port']` matches what Nginx proxies to.

Buildbot's Python-based configuration is its greatest strength and its biggest barrier to entry. For teams already comfortable with Python, it provides CI capabilities that would require complex workarounds in YAML-based systems.
