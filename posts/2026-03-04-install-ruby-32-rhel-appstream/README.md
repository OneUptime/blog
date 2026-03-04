# How to Install Ruby 3.2 on RHEL Using AppStream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ruby, AppStream, Development, Linux

Description: Install Ruby 3.2 on RHEL using the AppStream module system for a supported, easily maintainable Ruby installation.

---

RHEL's AppStream repository provides Ruby through module streams, making it straightforward to install and manage specific versions. This guide covers installing Ruby 3.2 via AppStream.

## Check Available Ruby Streams

```bash
# List available Ruby module streams
sudo dnf module list ruby

# Expected output shows available streams like 3.0, 3.1, 3.2
```

## Install Ruby 3.2

```bash
# Reset any previously enabled Ruby module
sudo dnf module reset ruby -y

# Enable the Ruby 3.2 stream
sudo dnf module enable ruby:3.2 -y

# Install Ruby and development tools
sudo dnf install -y ruby ruby-devel rubygem-rake rubygem-bundler \
  rubygem-irb rubygem-rdoc

# Install build dependencies for native gem extensions
sudo dnf install -y gcc gcc-c++ make redhat-rpm-config \
  openssl-devel readline-devel zlib-devel libffi-devel
```

## Verify Installation

```bash
# Check Ruby version
ruby --version
# Output: ruby 3.2.x

# Check gem version
gem --version

# Check Bundler version
bundle --version

# Launch interactive Ruby
irb -e 'puts RUBY_VERSION'
```

## Configure Gem Installation

```bash
# Install gems to user directory (avoids needing sudo)
echo 'gem: --user-install --no-document' > ~/.gemrc

# Add user gem bin to PATH
echo 'export PATH="$HOME/.local/share/gem/ruby/3.2.0/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Install Common Gems

```bash
# Install commonly needed gems
gem install rails
gem install puma
gem install pg          # PostgreSQL adapter
gem install mysql2      # MySQL adapter
gem install nokogiri    # HTML/XML parser
gem install redis       # Redis client

# Verify Rails installation
rails --version
```

## Use Bundler for Project Dependencies

```bash
# Create a new project
mkdir /var/www/myrubyapp && cd /var/www/myrubyapp

# Initialize a Gemfile
bundle init

# Add dependencies to Gemfile
cat >> Gemfile << 'GEM'
gem 'sinatra'
gem 'puma'
GEM

# Install dependencies
bundle install

# Run a bundled command
bundle exec ruby -e 'require "sinatra"; puts Sinatra::VERSION'
```

## Switch Between Ruby Versions

```bash
# To switch to a different version, reset and enable the new stream
sudo dnf module reset ruby -y
sudo dnf module enable ruby:3.1 -y
sudo dnf distro-sync -y

ruby --version
```

AppStream modules provide Ruby versions that are tested and supported by Red Hat, making them a solid choice for production deployments.
