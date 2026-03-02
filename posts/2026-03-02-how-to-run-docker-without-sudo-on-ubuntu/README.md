# How to Run Docker Without sudo on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Security, Linux

Description: Learn how to run Docker commands without sudo on Ubuntu by adding your user to the docker group, with an explanation of the security implications and safer alternatives.

---

After installing Docker on Ubuntu, every `docker` command requires `sudo`. This gets old quickly. The standard solution - adding your user to the `docker` group - works, but it carries a security implication that is worth understanding before you enable it.

## Why Docker Requires sudo by Default

The Docker daemon runs as root. It listens on a Unix socket at `/var/run/docker.sock`. Access to this socket means you can instruct the daemon to do anything, including:
- Mounting host directories into containers
- Running privileged containers
- Escaping the container to get root on the host

Because of this, the Docker daemon socket is owned by root and the `docker` group:

```bash
ls -la /var/run/docker.sock
# srw-rw---- 1 root docker 0 Mar 2 09:00 /var/run/docker.sock
```

Only root and members of the `docker` group can access it.

## The Security Implication

Adding a user to the `docker` group is functionally equivalent to granting them passwordless sudo. Any user in the docker group can escalate to root:

```bash
# A user in the docker group can trivially get root
docker run --rm -v /:/mnt alpine chroot /mnt sh
# Now inside a root shell with access to the host filesystem
```

This is fine for a developer workstation where you trust the user. It is NOT appropriate for multi-user systems or servers where the account might be compromised.

## Adding Your User to the Docker Group

For developer workstations and single-user machines, this is the standard approach:

```bash
# Add your current user to the docker group
sudo usermod -aG docker $USER

# Verify the group was added
groups $USER
# user : user adm sudo docker ...

# Apply the group change WITHOUT logging out
# Option 1: newgrp (only affects the current terminal session)
newgrp docker

# Option 2: Log out and log back in
# Option 3: su to yourself
su - $USER

# Verify Docker works without sudo
docker run hello-world
docker ps
docker images
```

### Why newgrp vs Logout

`newgrp docker` starts a new shell with the `docker` group active. It only affects the current terminal session. If you open a new terminal without newgrp, that terminal won't have docker group access until you log out and back in. The full logout/login approach applies the group to all sessions.

## Verifying Docker Access

```bash
# Should work without sudo after group is applied
docker version
docker info
docker ps
docker run --rm ubuntu:24.04 echo "Docker works without sudo"
```

## Rootless Docker (The Secure Alternative)

If you're on a system where granting docker group access is inappropriate, Docker supports a rootless mode where the entire Docker daemon runs as an unprivileged user:

```bash
# Install rootless Docker prerequisites
sudo apt install -y uidmap

# Install the rootless setup script
dockerd-rootless-setuptool.sh install

# This installs Docker in rootless mode for your user
# No sudo required, daemon runs as your user

# Enable rootless Docker to start on login
systemctl --user enable docker
systemctl --user start docker

# Test
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
docker run hello-world
```

### Configuring Shell for Rootless Docker

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Rootless Docker socket location
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock

# Or use the XDG variable
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
```

### Limitations of Rootless Docker

Rootless Docker has some limitations compared to regular Docker:
- Cannot bind to ports below 1024 without additional setup
- Some storage drivers may not be available
- Performance is slightly lower due to user namespace overhead
- Network performance may differ (uses slirp4netns by default)

For development workloads and non-privileged containers, rootless Docker works well.

## Using sudo -E for Environment Variables

If you don't want to change group membership, `sudo -E` preserves environment variables:

```bash
# Preserve environment when running docker with sudo
sudo -E docker compose up

# Create an alias
alias docker='sudo -E docker'

# Add to ~/.bashrc
echo "alias docker='sudo -E docker'" >> ~/.bashrc
source ~/.bashrc
```

This approach is least disruptive but still requires typing `sudo` each time unless aliased.

## Using DOCKER_HOST for Remote Socket

Another option is to run the Docker daemon socket access through an SSH tunnel to a remote machine, avoiding local privilege entirely:

```bash
# On the Docker host, start sshd and ensure Docker is running

# From your local machine, tunnel the Docker socket
ssh -NL /tmp/docker.sock:/var/run/docker.sock user@dockerhost &

# Point local docker CLI to the tunneled socket
export DOCKER_HOST=unix:///tmp/docker.sock

# Now run docker commands locally
docker ps
docker images
```

## Checking If Your User Is in the Docker Group

```bash
# Check current user's groups
id
# uid=1000(user) gid=1000(user) groups=1000(user),4(adm),27(sudo),999(docker)

# Or
groups
# user adm sudo docker

# Check the docker group members
getent group docker
# docker:x:999:user1,user2
```

## Removing Docker Group Membership

If you want to revoke docker access:

```bash
# Remove a user from the docker group
sudo gdeluser user docker

# Or use gpasswd
sudo gpasswd -d $USER docker

# The change takes effect after the user's next login
# Force logout and login to apply
```

## CI/CD Considerations

In CI/CD pipelines, Docker access is typically needed for the pipeline runner:

```bash
# Add the CI runner user to docker group
sudo usermod -aG docker gitlab-runner
# or
sudo usermod -aG docker jenkins

# For GitHub Actions self-hosted runners
sudo usermod -aG docker runner

# Restart the runner service after adding the group
sudo systemctl restart gitlab-runner
```

## Docker Context for Multiple Endpoints

If you work with multiple Docker environments (local and remote), Docker contexts let you switch without environment variables:

```bash
# List contexts
docker context ls

# Create a context for a remote Docker host
docker context create remote-dev \
  --description "Remote dev server" \
  --docker "host=ssh://user@remotehost"

# Switch to the remote context
docker context use remote-dev

# All docker commands now target the remote host
docker ps

# Switch back to local
docker context use default
```

For developer workstations, adding your user to the `docker` group is the most practical choice. For servers and shared systems, either use rootless Docker or restrict Docker group membership to only the specific users who genuinely need it, understanding that you're effectively granting them root access.
