# How to Set Up lazydocker for Docker Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, lazydocker, DevOps, CLI Tools

Description: Install lazydocker on Ubuntu to get a terminal-based UI for managing Docker containers, images, volumes, and logs without memorizing lengthy Docker commands.

---

lazydocker is a simple terminal UI for managing Docker and Docker Compose from the keyboard. Instead of typing `docker ps -a`, `docker logs <container>`, `docker exec -it <container> sh`, and other commands repeatedly, lazydocker puts everything in a single interactive pane: containers, their logs, resource usage, environment variables, and common actions like restarting or removing containers.

## Prerequisites

- Ubuntu 22.04 or newer
- Docker installed and running
- Root or sudo access (or Docker group membership)

## Installing Docker (If Not Already Installed)

```bash
# Quick install via official script
curl -fsSL https://get.docker.com | sudo bash

# Add your user to the docker group to run docker without sudo
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker ps
```

## Installing lazydocker

### Method 1: Official Install Script

```bash
# Download and run the install script
curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh \
  | bash

# The script installs lazydocker to ~/.local/bin/lazydocker
# Add ~/.local/bin to PATH if not already there
echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
lazydocker --version
```

### Method 2: Binary Download

```bash
# Get the latest version number
LAZYDOCKER_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazydocker/releases/latest" \
  | grep '"tag_name":' | sed 's/.*"v\([^"]*\)".*/\1/')

echo "Installing lazydocker v${LAZYDOCKER_VERSION}"

# Download the Linux amd64 binary
curl -Lo lazydocker.tar.gz \
  "https://github.com/jesseduffield/lazydocker/releases/download/v${LAZYDOCKER_VERSION}/lazydocker_${LAZYDOCKER_VERSION}_Linux_x86_64.tar.gz"

# Extract and install
tar xf lazydocker.tar.gz lazydocker
sudo install lazydocker /usr/local/bin/
rm lazydocker lazydocker.tar.gz

# Verify
lazydocker --version
```

### Method 3: Go Install

If you have Go installed:

```bash
go install github.com/jesseduffield/lazydocker@latest
# Binary will be in ~/go/bin/lazydocker
```

## Launching lazydocker

```bash
# Launch lazydocker
lazydocker

# Or add a convenient alias
echo "alias lzd='lazydocker'" >> ~/.bashrc
source ~/.bashrc
lzd
```

## Interface Layout

The lazydocker interface is split into panels:

```
+------------------+---------------------------+
| Containers       |                           |
|                  |    Main Panel             |
|                  |  (Logs, Stats, Config,    |
| Images           |   Env, Mounts, etc.)      |
|                  |                           |
| Volumes          |                           |
|                  |                           |
| Networks         |                           |
+------------------+---------------------------+
```

- Left panel: Shows containers, images, volumes, networks
- Right panel: Context-sensitive details for the selected item

## Key Bindings

### Global Navigation

```
Tab / Shift+Tab    Cycle between left panel sections
Arrow keys         Navigate within a section
Enter             Select item / toggle
ESC               Go back or close panel
q                 Quit lazydocker
?                 Show help/keybindings
```

### Container Actions

```
u                 View container's CPU and memory usage
l                 View logs
e                 Exec into container (opens a shell)
r                 Restart container
s                 Stop container
d                 Remove container (with confirmation)
x                 Open container's docker-compose menu (if applicable)
m                 View full container details
[                 Previous page of logs
]                 Next page of logs
```

### Image Actions

```
d                 Remove image
p                 Pull latest version of the image
```

### Scrolling in Log View

```
Page Up/Down      Scroll through logs
G                 Jump to end of logs (latest)
g                 Jump to beginning of logs
/                 Search logs
n                 Next search match
```

## Working with Docker Compose Projects

lazydocker shows Docker Compose services grouped together:

```bash
# Navigate to your project directory first
cd /path/to/your/project

# Launch lazydocker - it detects docker-compose.yml automatically
lazydocker
```

In the containers panel, Compose services are grouped by project name. When a Compose service is selected:

```
u                 Bring up the service (docker-compose up)
d                 Bring down the service
r                 Restart the service
l                 View service logs
x                 Show Compose-specific options
```

## Configuration

lazydocker stores config at `~/.config/lazydocker/config.yml`:

```bash
mkdir -p ~/.config/lazydocker

cat > ~/.config/lazydocker/config.yml <<'EOF'
# GUI settings
gui:
  # Whether to show container logs by default
  scrollHeight: 2

  # Expand the log panel
  expandFocusedSidePanel: false

  # Update interval in seconds
  refreshRate: 2

# Log settings
logs:
  # Number of lines to show in the logs panel
  timestamps: false
  since: '60m'   # Show logs from the last 60 minutes

# Container commands run on each container type
customCommands:
  containers:
    - name: bash
      attach: true
      command: docker exec -it {{ .Container.ID }} bash
      serviceNames: []
    - name: sh (alpine/busybox)
      attach: true
      command: docker exec -it {{ .Container.ID }} sh
EOF
```

## Adding Custom Commands

lazydocker supports custom commands for containers, images, and volumes:

```yaml
# In ~/.config/lazydocker/config.yml
customCommands:
  containers:
    # Open MySQL client inside a MySQL container
    - name: mysql-client
      attach: true
      command: docker exec -it {{ .Container.ID }} mysql -u root -p
      serviceNames: [mysql, mariadb]

    # Show environment variables
    - name: show-env
      attach: false
      command: docker inspect {{ .Container.ID }} | jq '.[0].Config.Env'
      serviceNames: []

    # Copy container logs to clipboard
    - name: copy-logs
      attach: false
      command: docker logs {{ .Container.ID }} 2>&1 | xclip -selection clipboard
      serviceNames: []

  images:
    # Dive into image layers
    - name: dive
      attach: true
      command: dive {{ .Image.ID }}
      serviceNames: []
```

## Monitoring Resource Usage

In the containers panel, press `u` or navigate to the Stats tab to see:

- CPU usage percentage
- Memory usage and limit
- Network I/O
- Block I/O

This is equivalent to `docker stats` but within the lazydocker interface.

## Cleaning Up Docker Resources

lazydocker makes cleanup straightforward:

```
# Navigate to Images section
# Select an unused image and press 'd' to remove it

# Navigate to Volumes section
# Select an unused volume and press 'd' to remove it

# For bulk cleanup, use docker system prune from a terminal:
docker system prune -f
docker volume prune -f
```

## Integrating with Aliases

Add convenient shell aliases to make lazydocker part of your regular workflow:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias lzd='lazydocker'                           # Quick launch
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'  # Better docker ps
alias dlogs='docker logs --tail=100 -f'          # Tail container logs

# Reload shell config
source ~/.bashrc
```

## Troubleshooting

### Cannot Connect to Docker

```bash
# Verify Docker daemon is running
sudo systemctl status docker

# Ensure your user is in the docker group
groups $USER | grep docker

# If not in the docker group, add and re-login
sudo usermod -aG docker $USER
# Log out and back in
```

### lazydocker Shows Empty Container List

```bash
# Verify Docker has running containers
docker ps -a

# Run lazydocker with verbose output to see errors
lazydocker --debug 2>&1 | head -50
```

### Display Issues in Some Terminals

```bash
# lazydocker requires a terminal that supports 256 colors
echo $TERM

# Set correct terminal type
export TERM=xterm-256color

# For tmux users, add to ~/.tmux.conf:
# set -g default-terminal "screen-256color"
```

lazydocker is one of those tools that looks like a toy but turns out to be genuinely useful for everyday Docker work. The ability to tail logs, exec into containers, and monitor resource usage without switching between multiple terminal windows speeds up debugging and makes container management less tedious.
