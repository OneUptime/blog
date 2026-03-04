# How to Install Ruby with rbenv on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ruby, rbenv, Development, Version Management, Linux

Description: Install and manage multiple Ruby versions on RHEL using rbenv, allowing per-project Ruby version selection without affecting system packages.

---

rbenv is a lightweight Ruby version manager that lets you switch between Ruby versions on a per-project basis. Unlike the system Ruby from AppStream, rbenv compiles Ruby from source, giving you access to any version.

## Install Dependencies

```bash
# Install build tools and libraries needed to compile Ruby
sudo dnf install -y git gcc gcc-c++ make bzip2 openssl-devel \
  readline-devel zlib-devel libffi-devel libyaml-devel \
  gdbm-devel ncurses-devel
```

## Install rbenv

```bash
# Clone rbenv into your home directory
git clone https://github.com/rbenv/rbenv.git ~/.rbenv

# Add rbenv to PATH
echo 'export RBENV_ROOT="$HOME/.rbenv"' >> ~/.bashrc
echo 'export PATH="$RBENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init - bash)"' >> ~/.bashrc
source ~/.bashrc

# Verify rbenv is working
rbenv --version
```

## Install ruby-build Plugin

```bash
# ruby-build provides the 'rbenv install' command
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# List available Ruby versions
rbenv install -l
```

## Install Ruby Versions

```bash
# Install Ruby 3.2.3
rbenv install 3.2.3

# Install Ruby 3.3.0
rbenv install 3.3.0

# Set the global default version
rbenv global 3.2.3

# Verify
ruby --version
which ruby
# Should show: ~/.rbenv/shims/ruby
```

## Per-Project Ruby Versions

```bash
# Set a project-specific Ruby version
cd /var/www/myproject
rbenv local 3.3.0

# This creates a .ruby-version file
cat .ruby-version
# Output: 3.3.0

# Ruby version changes automatically when entering this directory
ruby --version
# Output: ruby 3.3.0
```

## Install Bundler and Gems

```bash
# Install Bundler for the current Ruby version
gem install bundler

# Rehash to make new binaries available
rbenv rehash

# Install project dependencies
bundle install
```

## Useful rbenv Commands

```bash
# List all installed versions
rbenv versions

# Show current version and its source
rbenv version

# Uninstall a version
rbenv uninstall 3.2.3

# Update ruby-build to get new Ruby versions
cd ~/.rbenv/plugins/ruby-build && git pull
```

## Set Up for a Service User

```bash
# For deploying apps, set up rbenv for a dedicated user
sudo useradd -m deploy
sudo -u deploy -i bash << 'SETUP'
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
echo 'export RBENV_ROOT="$HOME/.rbenv"' >> ~/.bashrc
echo 'export PATH="$RBENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init - bash)"' >> ~/.bashrc
source ~/.bashrc
rbenv install 3.2.3
rbenv global 3.2.3
gem install bundler
SETUP
```

rbenv is ideal for development environments and deployment servers where you need fine-grained control over Ruby versions per project.
