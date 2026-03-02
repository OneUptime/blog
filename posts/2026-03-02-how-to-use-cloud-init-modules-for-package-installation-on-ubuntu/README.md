# How to Use cloud-init Modules for Package Installation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, cloud-init, Package, APT, Automation

Description: Learn how to use cloud-init modules to install packages, add repositories, manage apt sources, and handle package configuration on Ubuntu cloud instances.

---

Package installation is one of the most common things you'll do in a cloud-init configuration. cloud-init has dedicated modules for managing APT sources, installing packages, and handling package upgrades. Getting these right matters because failed package installation is one of the most common cloud-init failure modes.

## Basic Package Installation

The simplest approach uses the `packages` key:

```yaml
#cloud-config

# Ensure package lists are updated before installing
package_update: true

# Upgrade existing packages
package_upgrade: true

# Install packages
packages:
  - nginx
  - curl
  - git
  - htop
  - vim
  - unzip
  - jq
```

Packages listed under `packages` are installed after all apt sources are configured and after `package_update` runs. The order within the list doesn't matter for APT resolution.

## Controlling Update and Upgrade Behavior

```yaml
#cloud-config

# Update apt cache on first boot (default: false)
package_update: true

# Upgrade all installed packages (default: false)
package_upgrade: true

# Reboot after package upgrade if kernel was updated (default: false)
package_reboot_if_required: true
```

When `package_reboot_if_required` is true, cloud-init checks if a reboot is needed (by checking for `/var/run/reboot-required`) and reboots the instance before proceeding to the final stage.

## Adding APT Repositories

The `apt` key configures package sources before package installation occurs:

### Adding a PPA

```yaml
#cloud-config
apt:
  sources:
    # Add a PPA
    nodesource:
      source: "deb https://deb.nodesource.com/node_20.x $RELEASE main"
      keyid: 9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280

packages:
  - nodejs
```

The `$RELEASE` variable is automatically replaced with the Ubuntu codename (jammy, focal, etc.).

### Adding a Repository with a Key URL

```yaml
#cloud-config
apt:
  sources:
    docker:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu $RELEASE stable"
      keyurl: "https://download.docker.com/linux/ubuntu/gpg"

packages:
  - docker-ce
  - docker-ce-cli
  - containerd.io
```

### Adding a Repository with an Inline Key

```yaml
#cloud-config
apt:
  sources:
    myrepo:
      source: "deb https://repo.example.com/ubuntu $RELEASE main"
      key: |
        -----BEGIN PGP PUBLIC KEY BLOCK-----
        mQINBF...
        -----END PGP PUBLIC KEY BLOCK-----

packages:
  - mypackage
```

### Multiple Repositories

```yaml
#cloud-config
apt:
  sources:
    # Docker repository
    docker:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu $RELEASE stable"
      keyurl: "https://download.docker.com/linux/ubuntu/gpg"

    # HashiCorp repository (Terraform, Vault, Consul, etc.)
    hashicorp:
      source: "deb [arch=amd64] https://apt.releases.hashicorp.com $RELEASE main"
      keyurl: "https://apt.releases.hashicorp.com/gpg"

    # Kubernetes repository
    kubernetes:
      source: "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /"
      keyurl: "https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key"
      filename: kubernetes.list

package_update: true
packages:
  - docker-ce
  - docker-ce-cli
  - terraform
  - kubectl
```

## Configuring APT Proxy

For instances that access the internet through a proxy:

```yaml
#cloud-config
apt:
  # HTTP proxy for apt
  http_proxy: "http://proxy.example.com:3128"
  https_proxy: "http://proxy.example.com:3128"

  # Or configure in the sources
  conf: |
    Acquire::http::Proxy "http://proxy.example.com:3128";
    Acquire::https::Proxy "http://proxy.example.com:3128";
```

## Configuring APT Options

The `apt` key accepts additional APT configuration:

```yaml
#cloud-config
apt:
  # Preserve existing sources.list (don't overwrite)
  preserve_sources_list: true

  # Configure debconf before package installation
  debconf_selections: |
    postfix postfix/mailname string myserver.example.com
    postfix postfix/main_mailer_type string "No configuration"

  # Add local mirror for faster downloads
  primary:
    - arches: [amd64]
      uri: http://mirror.example.com/ubuntu
      search_dns: false

  security:
    - arches: [amd64]
      uri: http://mirror.example.com/ubuntu-security
```

## Handling Package Configuration with debconf

Some packages require preseed answers before installation:

```yaml
#cloud-config
apt:
  debconf_selections: |
    mysql-server mysql-server/root_password password mysecretpassword
    mysql-server mysql-server/root_password_again password mysecretpassword
    mysql-community-server mysql-community-server/root-pass password mysecretpassword
    mysql-community-server mysql-community-server/re-root-pass password mysecretpassword
    postfix postfix/mailname string mail.example.com
    postfix postfix/main_mailer_type string "Internet Site"

packages:
  - mysql-server
  - postfix
```

## Snap Package Installation

cloud-init supports snap packages through the `snap` module:

```yaml
#cloud-config
snap:
  commands:
    # Install a snap
    - snap install kubectl --classic
    - snap install helm --classic
    - snap install terraform --classic

    # Install a snap from a specific channel
    - snap install lxd --channel=5.21/stable
```

Alternatively, use the `snaps` key:

```yaml
#cloud-config
# Note: the snaps module may need to be in cloud_config_modules
# Check /etc/cloud/cloud.cfg for module configuration
```

For more reliable snap installation, use `runcmd`:

```yaml
#cloud-config
runcmd:
  - snap install kubectl --classic
  - snap install helm --classic
```

## Verifying Package Installation

After cloud-init completes, verify packages installed correctly:

```bash
# Check if packages are installed
dpkg -l nginx
dpkg -l docker-ce

# Check installed package version
dpkg -l | grep nginx

# Verify service is running
systemctl status nginx

# Check apt sources that were added
ls /etc/apt/sources.list.d/
cat /etc/apt/sources.list

# Check signing keys
ls /etc/apt/trusted.gpg.d/
apt-key list   # deprecated but still works
```

## Common Package Installation Issues

### Package Not Found

```yaml
#cloud-config
# WRONG - repository not added before package install
packages:
  - docker-ce    # will fail if docker repo not in apt sources
```

Add the repository first:

```yaml
#cloud-config
apt:
  sources:
    docker:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu $RELEASE stable"
      keyurl: "https://download.docker.com/linux/ubuntu/gpg"

package_update: true
packages:
  - docker-ce
```

### Interactive Package Installation

Some packages prompt for input during installation and fail in non-interactive mode:

```yaml
#cloud-config
# Set DEBIAN_FRONTEND before package installation
runcmd:
  - export DEBIAN_FRONTEND=noninteractive
  - apt-get install -y -q tzdata
```

Or configure debconf first:

```yaml
#cloud-config
apt:
  debconf_selections: |
    tzdata tzdata/Areas select America
    tzdata tzdata/Zones/America select New_York

packages:
  - tzdata
```

### Pinning Package Versions

```yaml
#cloud-config
packages:
  # Install a specific version
  - "nginx=1.18.0-0ubuntu1"
  - "docker-ce=5:24.0.0-1~ubuntu.22.04~jammy"
```

### Post-Installation Configuration

Use `runcmd` for configuration that needs to happen after packages are installed:

```yaml
#cloud-config
package_update: true
packages:
  - nginx
  - postgresql
  - python3-pip

runcmd:
  # Configure nginx
  - rm /etc/nginx/sites-enabled/default
  - systemctl enable --now nginx

  # Initialize PostgreSQL database
  - sudo -u postgres createdb myapp

  # Install Python packages
  - pip3 install flask gunicorn psycopg2-binary
```

The `packages` module runs before `runcmd`, so by the time your commands execute, all packages from the `packages` list are already installed.

Using cloud-init's package modules correctly means understanding the execution order: APT sources are configured first, then `package_update` runs, then packages install, and finally `runcmd` executes. Keeping this order in mind prevents the majority of package-related cloud-init failures.
