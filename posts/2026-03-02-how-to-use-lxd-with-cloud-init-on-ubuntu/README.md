# How to Use LXD with cloud-init on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, cloud-init, Container, Automation

Description: Learn how to pass cloud-init configuration to LXD containers and VMs to automate first-boot setup, install packages, configure users, and run custom scripts.

---

LXD supports cloud-init for automating first-boot container setup. You can pass cloud-init user-data directly through the LXD configuration, making it straightforward to provision containers with specific software, users, and configuration without having to exec into the container after launch.

## How cloud-init Works with LXD

LXD injects cloud-init data through a specific config key. When the container starts, cloud-init reads this data from the LXD data source and processes it. Ubuntu cloud images come with cloud-init pre-installed.

The config key is `user.user-data` for cloud-config format, or `user.vendor-data` for vendor-specific data that runs alongside user data.

## Basic cloud-config via Config Key

```bash
# Set cloud-init user-data on a container before starting it
lxc init ubuntu:24.04 mycontainer

lxc config set mycontainer user.user-data - <<'EOF'
#cloud-config
package_update: true
packages:
  - nginx
  - curl
  - vim
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
EOF

# Start the container - cloud-init runs on first boot
lxc start mycontainer

# Watch cloud-init progress
lxc exec mycontainer -- tail -f /var/log/cloud-init-output.log
```

## Using a cloud-init YAML File

For more complex configurations, keep the cloud-init file separate:

```bash
# Create your cloud-init config file
cat > ~/configs/webserver-init.yaml <<'EOF'
#cloud-config

hostname: webserver-01
timezone: UTC

package_update: true
package_upgrade: true

packages:
  - nginx
  - certbot
  - python3-certbot-nginx
  - logrotate
  - fail2ban

write_files:
  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80;
          server_name _;
          root /var/www/html;
          index index.html;
          location / {
              try_files $uri $uri/ =404;
          }
      }
    owner: root:root
    permissions: '0644'

  - path: /var/www/html/index.html
    content: |
      <h1>Provisioned by LXD + cloud-init</h1>
    owner: www-data:www-data
    permissions: '0644'

runcmd:
  - systemctl enable nginx fail2ban
  - systemctl start nginx fail2ban
  - mkdir -p /var/log/app
  - chown ubuntu:ubuntu /var/log/app
EOF

# Apply to a container
lxc init ubuntu:24.04 webserver-01
lxc config set webserver-01 user.user-data "$(cat ~/configs/webserver-init.yaml)"
lxc start webserver-01
```

## Applying cloud-init via Profiles

For containers that share the same cloud-init setup, embed it in a profile so you don't repeat yourself:

```bash
# Create a profile with cloud-init embedded
lxc profile create webserver-template

# Set the user-data on the profile
lxc profile set webserver-template user.user-data - <<'EOF'
#cloud-config
package_update: true
packages:
  - nginx
  - curl
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - echo "Provisioned at $(date)" > /var/log/provision-timestamp
EOF

# Add standard device config to the profile
lxc profile set webserver-template limits.cpu 2
lxc profile set webserver-template limits.memory 2GiB
lxc profile device add webserver-template root disk pool=default size=20GiB path=/
lxc profile device add webserver-template eth0 nic nictype=bridged parent=lxdbr0

# Now every container launched with this profile gets auto-configured
lxc launch ubuntu:24.04 web-node-1 --profile webserver-template
lxc launch ubuntu:24.04 web-node-2 --profile webserver-template
lxc launch ubuntu:24.04 web-node-3 --profile webserver-template
```

## Cloud-init with LXD VMs

VMs work the same way - the `user.user-data` key works for both containers and VMs:

```bash
lxc init ubuntu:24.04 myvm --vm

lxc config set myvm user.user-data - <<'EOF'
#cloud-config
package_update: true
packages:
  - docker.io
  - git
runcmd:
  - usermod -aG docker ubuntu
  - systemctl enable docker
  - systemctl start docker
EOF

lxc start myvm
lxc exec myvm -- cloud-init status --wait
```

## Checking cloud-init Status

```bash
# Check if cloud-init has finished
lxc exec mycontainer -- cloud-init status

# Block until cloud-init completes (useful in scripts)
lxc exec mycontainer -- cloud-init status --wait

# View detailed run summary
lxc exec mycontainer -- cloud-init analyze show

# View the output log
lxc exec mycontainer -- cat /var/log/cloud-init-output.log

# View the full cloud-init log
lxc exec mycontainer -- cat /var/log/cloud-init.log | grep -i "error\|warn\|fail"
```

## Verifying cloud-init Received the Config

```bash
# View what cloud-init sees as its instance data
lxc exec mycontainer -- cloud-init query userdata

# Or check the cached user-data
lxc exec mycontainer -- cat /var/lib/cloud/instance/user-data.txt
```

## Scripting Multi-Container Provisioning

Combine profiles and cloud-init for deploying a set of containers:

```bash
#!/bin/bash
# provision-cluster.sh

PROFILE="app-server"
NODES=("app-01" "app-02" "app-03")
IMAGE="ubuntu:24.04"

# Create profile if it doesn't exist
if ! lxc profile show "$PROFILE" &>/dev/null; then
  lxc profile create "$PROFILE"
  lxc profile set "$PROFILE" limits.cpu 2
  lxc profile set "$PROFILE" limits.memory 4GiB
  lxc profile device add "$PROFILE" root disk pool=default size=30GiB path=/
  lxc profile device add "$PROFILE" eth0 nic nictype=bridged parent=lxdbr0

  lxc profile set "$PROFILE" user.user-data - <<'CLOUDINIT'
#cloud-config
package_update: true
packages:
  - python3
  - python3-pip
  - gunicorn
runcmd:
  - pip3 install flask
  - mkdir -p /opt/app
  - chown ubuntu:ubuntu /opt/app
CLOUDINIT
fi

# Launch all nodes
for node in "${NODES[@]}"; do
  echo "Launching $node..."
  lxc launch "$IMAGE" "$node" --profile "$PROFILE" &
done

wait
echo "All nodes launched. Waiting for cloud-init..."

# Wait for cloud-init to complete on each node
for node in "${NODES[@]}"; do
  echo "Waiting for cloud-init on $node..."
  lxc exec "$node" -- cloud-init status --wait
  echo "$node is ready."
done

echo "Cluster ready:"
lxc list
```

## Passing Secrets via cloud-init

Avoid hardcoding secrets in cloud-init files. Use cloud-init's `write_files` to write files that reference externally-managed secrets:

```bash
# Pass an API key as a file (not inline in the config)
API_KEY=$(cat /etc/myapp/api.key)

lxc config set mycontainer user.user-data - <<EOF
#cloud-config
write_files:
  - path: /etc/myapp/api.key
    content: |
      ${API_KEY}
    permissions: '0600'
    owner: root:root
runcmd:
  - chmod 600 /etc/myapp/api.key
EOF
```

Be aware that the `user.user-data` config key is visible to anyone with `lxc config show` access on the host.

## Re-running cloud-init

cloud-init normally runs only once per instance. To re-run it during testing:

```bash
# Clean cloud-init state and re-run (use only for testing)
lxc exec mycontainer -- bash -c "
  cloud-init clean --logs
  cloud-init init
  cloud-init modules --mode config
  cloud-init modules --mode final
"

# Or restart the container - cloud-init won't re-run because instance-id is cached
# To force re-run, clean the state first
```

## Debugging cloud-init Failures

```bash
# Check the output log for errors
lxc exec mycontainer -- grep -i "error\|fail\|warn" /var/log/cloud-init-output.log

# Check specific module failures
lxc exec mycontainer -- cloud-init analyze blame | head -20

# Validate the cloud-config syntax before applying
cat myconfig.yaml | python3 -c "
import yaml, sys
try:
  yaml.safe_load(sys.stdin)
  print('YAML is valid')
except yaml.YAMLError as e:
  print(f'YAML error: {e}')
  sys.exit(1)
"
```

cloud-init with LXD gives you a declarative, repeatable way to provision containers. Combined with profiles, it lets you define entire container classes - what software runs, how it's configured, what users exist - in version-controlled files rather than manual steps.
