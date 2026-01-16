# How to Set Up Ruby with rbenv on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Ruby, rbenv, Development, Rails, Tutorial

Description: Complete guide to installing and managing Ruby versions with rbenv on Ubuntu.

---

Ruby is a powerful, elegant programming language widely used for web development, scripting, and automation. Managing multiple Ruby versions across different projects can be challenging, which is where rbenv comes in. This comprehensive guide walks you through setting up Ruby with rbenv on Ubuntu, from installation to advanced configuration.

## Table of Contents

1. [Why Use rbenv?](#why-use-rbenv)
2. [Prerequisites](#prerequisites)
3. [Installing rbenv and ruby-build](#installing-rbenv-and-ruby-build)
4. [Installing Ruby Versions](#installing-ruby-versions)
5. [Setting Global and Local Ruby Versions](#setting-global-and-local-ruby-versions)
6. [Managing Gems with Bundler](#managing-gems-with-bundler)
7. [Project-Specific Ruby Versions](#project-specific-ruby-versions)
8. [Installing Ruby on Rails](#installing-ruby-on-rails)
9. [IDE Configuration](#ide-configuration)
10. [Updating Ruby and rbenv](#updating-ruby-and-rbenv)
11. [Troubleshooting Common Issues](#troubleshooting-common-issues)
12. [Conclusion](#conclusion)

## Why Use rbenv?

rbenv is a lightweight Ruby version management tool that offers several advantages:

- **Simplicity**: Uses shims to intercept Ruby commands without modifying your shell
- **No sudo required**: Installs Ruby versions in your home directory
- **Project isolation**: Each project can use its own Ruby version
- **Compatibility**: Works seamlessly with popular tools like Bundler and Rails
- **Minimal overhead**: Only affects Ruby commands, leaving your system Ruby untouched

## Prerequisites

Before installing rbenv, ensure your Ubuntu system is up to date and has the necessary build dependencies.

```bash
# Update your package lists and upgrade existing packages
# This ensures you have the latest security patches and software versions
sudo apt update && sudo apt upgrade -y

# Install essential build tools and libraries required for compiling Ruby
# These dependencies are necessary for ruby-build to compile Ruby from source
sudo apt install -y \
    git \
    curl \
    autoconf \
    bison \
    build-essential \
    libssl-dev \
    libyaml-dev \
    libreadline6-dev \
    zlib1g-dev \
    libncurses5-dev \
    libffi-dev \
    libgdbm6 \
    libgdbm-dev \
    libdb-dev \
    uuid-dev
```

### Understanding the Dependencies

| Package | Purpose |
|---------|---------|
| `git` | Required for cloning rbenv and ruby-build repositories |
| `curl` | Used for downloading files during installation |
| `autoconf` | Generates configuration scripts for building software |
| `bison` | Parser generator used by Ruby's compiler |
| `build-essential` | Meta-package including gcc, g++, and make |
| `libssl-dev` | OpenSSL development files for secure connections |
| `libyaml-dev` | YAML parsing library used by Ruby |
| `libreadline6-dev` | Provides command-line editing in IRB |
| `zlib1g-dev` | Compression library for gems |
| `libncurses5-dev` | Terminal handling library |
| `libffi-dev` | Foreign function interface for calling C code |
| `libgdbm6/libgdbm-dev` | GNU database manager library |
| `libdb-dev` | Berkeley DB library |
| `uuid-dev` | UUID generation library |

## Installing rbenv and ruby-build

### Step 1: Clone rbenv Repository

```bash
# Clone rbenv into ~/.rbenv directory
# This is the standard location where rbenv expects to be installed
git clone https://github.com/rbenv/rbenv.git ~/.rbenv

# Optionally, compile dynamic bash extension for faster performance
# This step is optional but recommended for better shell performance
cd ~/.rbenv && src/configure && make -C src
```

### Step 2: Configure Shell Environment

Add rbenv to your shell configuration. The exact file depends on your shell:

```bash
# For Bash users (most common on Ubuntu)
# Add these lines to ~/.bashrc
echo '' >> ~/.bashrc
echo '# rbenv configuration' >> ~/.bashrc
echo 'export RBENV_ROOT="$HOME/.rbenv"' >> ~/.bashrc
echo 'export PATH="$RBENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init - bash)"' >> ~/.bashrc

# Reload your shell configuration to apply changes
source ~/.bashrc
```

For Zsh users:

```bash
# For Zsh users
# Add these lines to ~/.zshrc
echo '' >> ~/.zshrc
echo '# rbenv configuration' >> ~/.zshrc
echo 'export RBENV_ROOT="$HOME/.rbenv"' >> ~/.zshrc
echo 'export PATH="$RBENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc
```

### Step 3: Install ruby-build Plugin

ruby-build is an rbenv plugin that provides the `rbenv install` command for installing Ruby versions.

```bash
# Clone ruby-build as an rbenv plugin
# This enables the 'rbenv install' command
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# Verify ruby-build installation by checking available commands
rbenv install --list
```

### Step 4: Verify Installation

```bash
# Check that rbenv is properly installed and configured
# This command performs a health check of your rbenv installation
rbenv doctor

# Alternatively, verify with these commands
rbenv --version          # Should display rbenv version
which rbenv              # Should show ~/.rbenv/bin/rbenv
type rbenv               # Should indicate rbenv is a function
```

## Installing Ruby Versions

### List Available Ruby Versions

```bash
# List all available Ruby versions that can be installed
# This shows stable releases from ruby-build
rbenv install -l

# List ALL available versions including development and preview releases
# Useful when you need a specific version or want to test new features
rbenv install -L | head -50
```

### Install a Specific Ruby Version

```bash
# Install Ruby 3.3.0 (or your desired version)
# This process compiles Ruby from source and may take several minutes
rbenv install 3.3.0

# Install with verbose output to see compilation progress
# Useful for debugging installation issues
rbenv install 3.3.0 --verbose

# Install the latest stable Ruby 3.x version
# Check the latest version with: rbenv install -l | grep -E "^3\."
rbenv install 3.3.0
```

### Install Multiple Versions

```bash
# Install multiple Ruby versions for different projects
# This allows switching between versions as needed

# Ruby 3.3.0 - Latest stable release (recommended for new projects)
rbenv install 3.3.0

# Ruby 3.2.2 - Previous stable release (for compatibility)
rbenv install 3.2.2

# Ruby 2.7.8 - Legacy version (for older projects)
rbenv install 2.7.8

# List all installed Ruby versions
rbenv versions
```

## Setting Global and Local Ruby Versions

rbenv supports three levels of Ruby version configuration:

1. **Global**: Default version for your entire system
2. **Local**: Project-specific version (stored in `.ruby-version` file)
3. **Shell**: Temporary version for current shell session

### Set Global Ruby Version

```bash
# Set the global Ruby version used system-wide
# This version is used when no local or shell version is specified
rbenv global 3.3.0

# Verify the global version
rbenv global              # Shows current global version
ruby --version            # Should match the global version

# View the global version file location
cat ~/.rbenv/version
```

### Set Local Ruby Version

```bash
# Navigate to your project directory
cd ~/projects/my-ruby-app

# Set a local Ruby version for this project only
# This creates a .ruby-version file in the current directory
rbenv local 3.2.2

# Verify the local version
rbenv local               # Shows current local version
cat .ruby-version         # Shows contents of version file
ruby --version            # Should match the local version

# The .ruby-version file should be committed to version control
# This ensures all team members use the same Ruby version
git add .ruby-version
git commit -m "Set Ruby version to 3.2.2"
```

### Set Shell Ruby Version

```bash
# Set a temporary Ruby version for the current shell session
# This overrides both global and local versions
rbenv shell 2.7.8

# Verify the shell version
rbenv shell               # Shows current shell version
ruby --version            # Should show 2.7.8

# Unset the shell version to revert to local/global
rbenv shell --unset
```

### Version Precedence

```bash
# rbenv determines which Ruby version to use in this order:
# 1. RBENV_VERSION environment variable (rbenv shell)
# 2. .ruby-version file in current directory (rbenv local)
# 3. First .ruby-version found searching parent directories
# 4. ~/.rbenv/version file (rbenv global)

# Check which version would be used and why
rbenv version             # Shows active version and source
# Example output: 3.3.0 (set by /home/user/project/.ruby-version)
```

## Managing Gems with Bundler

Bundler is the standard tool for managing Ruby gem dependencies in projects.

### Install Bundler

```bash
# Install Bundler for the current Ruby version
# Bundler manages project dependencies defined in a Gemfile
gem install bundler

# Rehash to make the bundle command available
# This updates rbenv's shims to include the new executable
rbenv rehash

# Verify Bundler installation
bundle --version
which bundle              # Should point to rbenv shim
```

### Configure Bundler

```bash
# Configure Bundler to install gems in the project's vendor directory
# This isolates gems per project and avoids conflicts
bundle config set --local path 'vendor/bundle'

# Configure Bundler to use parallel installation for faster installs
bundle config set --global jobs 4

# View all Bundler configuration
bundle config list
```

### Create a Gemfile

```ruby
# Gemfile - Define your project's gem dependencies
# Place this file in your project's root directory

# Specify the source for gems (RubyGems is the default)
source 'https://rubygems.org'

# Specify the Ruby version (should match .ruby-version)
ruby '3.3.0'

# Core application gems
gem 'rails', '~> 7.1.0'           # Web framework
gem 'pg', '~> 1.5'                # PostgreSQL adapter
gem 'puma', '~> 6.0'              # Web server

# Asset pipeline and frontend
gem 'sprockets-rails'             # Asset pipeline
gem 'importmap-rails'             # JavaScript with import maps
gem 'turbo-rails'                 # Hotwire's SPA-like page accelerator
gem 'stimulus-rails'              # Hotwire's JavaScript framework

# Development and test dependencies
group :development, :test do
  gem 'debug'                     # Debugging tool
  gem 'rspec-rails', '~> 6.0'     # Testing framework
  gem 'factory_bot_rails'         # Test fixtures
  gem 'faker'                     # Generate fake data
end

group :development do
  gem 'web-console'               # Interactive console in browser
  gem 'rack-mini-profiler'        # Performance profiling
  gem 'rubocop', require: false   # Code linting
  gem 'rubocop-rails', require: false
end

group :test do
  gem 'capybara'                  # Integration testing
  gem 'selenium-webdriver'        # Browser automation
end

group :production do
  gem 'redis', '~> 5.0'           # Caching and background jobs
  gem 'sidekiq', '~> 7.0'         # Background job processing
end
```

### Install Dependencies

```bash
# Install all gems defined in the Gemfile
# This reads Gemfile and creates/updates Gemfile.lock
bundle install

# Install gems without development and test groups (for production)
bundle install --without development test

# Update a specific gem to its latest allowed version
bundle update rails

# Update all gems to their latest allowed versions
bundle update

# Show installed gems and their versions
bundle list

# Check for outdated gems
bundle outdated

# Verify gem dependencies are satisfied
bundle check
```

### Bundler Best Practices

```bash
# Always commit Gemfile.lock to version control
# This ensures consistent gem versions across all environments
git add Gemfile Gemfile.lock
git commit -m "Update gem dependencies"

# Execute commands in the context of the bundle
# This ensures you're using the correct gem versions
bundle exec rails server
bundle exec rspec
bundle exec rubocop

# Create a binstub for frequently used commands
# This creates a bin/rails script that includes bundle exec
bundle binstubs rails

# Clean up unused gems from vendor/bundle
bundle clean --force
```

## Project-Specific Ruby Versions

Setting up project-specific Ruby versions ensures consistency across development environments.

### Complete Project Setup Example

```bash
# Create a new project directory
mkdir -p ~/projects/my-awesome-app
cd ~/projects/my-awesome-app

# Initialize Git repository
git init

# Set the Ruby version for this project
# This creates .ruby-version file
rbenv local 3.3.0

# Verify Ruby version
ruby --version

# Create initial Gemfile
cat > Gemfile << 'EOF'
source 'https://rubygems.org'

ruby '3.3.0'

# Add your gems here
gem 'rake'
EOF

# Install dependencies
bundle install

# Create a simple Rakefile for task automation
cat > Rakefile << 'EOF'
# Rakefile - Define project tasks

desc 'Display Ruby version information'
task :info do
  puts "Ruby version: #{RUBY_VERSION}"
  puts "Ruby platform: #{RUBY_PLATFORM}"
  puts "RubyGems version: #{Gem::VERSION}"
  puts "Bundler version: #{Bundler::VERSION}"
end

desc 'Run all tests'
task :test do
  puts 'Running tests...'
  # Add test commands here
end

# Default task
task default: :info
EOF

# Commit initial setup
git add .
git commit -m "Initial project setup with Ruby 3.3.0"

# Test the setup
bundle exec rake info
```

### Using .ruby-version with CI/CD

```yaml
# .github/workflows/test.yml
# GitHub Actions workflow that respects .ruby-version

name: Ruby CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    # This action reads .ruby-version automatically
    - name: Set up Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: .ruby-version  # Reads from .ruby-version file
        bundler-cache: true          # Caches gems for faster builds

    - name: Run tests
      run: bundle exec rake test

    - name: Run linter
      run: bundle exec rubocop
```

## Installing Ruby on Rails

Rails is the most popular Ruby web framework. Here's how to install and configure it properly.

### Install Rails

```bash
# Ensure you're using the correct Ruby version
rbenv global 3.3.0
ruby --version

# Install Rails gem globally for the current Ruby version
# The -N flag skips documentation for faster installation
gem install rails -N

# Rehash to make rails command available
rbenv rehash

# Verify Rails installation
rails --version
which rails
```

### Create a New Rails Application

```bash
# Create a new Rails application with PostgreSQL database
# --skip-bundle delays bundle install until we customize Gemfile
rails new myapp \
    --database=postgresql \
    --css=tailwind \
    --javascript=importmap \
    --skip-bundle

# Navigate to the new application directory
cd myapp

# The Rails generator automatically creates .ruby-version
# Verify it matches your intended Ruby version
cat .ruby-version

# Install dependencies
bundle install

# Create the database
rails db:create

# Start the development server
rails server
```

### Rails Application with API Mode

```bash
# Create an API-only Rails application
# Useful for building backend services
rails new myapi \
    --api \
    --database=postgresql \
    --skip-bundle

cd myapi

# Add API-specific gems to Gemfile
cat >> Gemfile << 'EOF'

# API gems
gem 'rack-cors'           # Cross-origin resource sharing
gem 'jwt'                 # JSON Web Token authentication
gem 'jsonapi-serializer'  # JSON:API serialization
gem 'pagy'                # Pagination
EOF

bundle install
```

### Configure Rails for Production

```ruby
# config/database.yml
# Production database configuration with connection pooling

default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000

development:
  <<: *default
  database: myapp_development

test:
  <<: *default
  database: myapp_test

production:
  <<: *default
  database: myapp_production
  username: <%= ENV['DATABASE_USERNAME'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: <%= ENV['DATABASE_HOST'] %>
  port: <%= ENV.fetch('DATABASE_PORT') { 5432 } %>
```

```ruby
# config/puma.rb
# Puma web server configuration for production

# Number of worker processes (recommended: 2-4 per CPU core)
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

# Number of threads per worker
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Preload application for better memory usage with workers
preload_app!

# Set the port and environment
port ENV.fetch("PORT") { 3000 }
environment ENV.fetch("RAILS_ENV") { "development" }

# Allow puma to be restarted by `bin/rails restart` command
plugin :tmp_restart

# Worker boot callback for ActiveRecord connection handling
on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end
```

## IDE Configuration

Proper IDE configuration improves development productivity with features like code completion, linting, and debugging.

### Visual Studio Code Configuration

```json
// .vscode/settings.json
// VS Code settings for Ruby development with rbenv

{
    // Ruby extension configuration
    "ruby.useBundler": true,
    "ruby.useLanguageServer": true,
    "ruby.lint": {
        "rubocop": {
            "useBundler": true
        }
    },
    "ruby.format": "rubocop",

    // Solargraph language server configuration
    "solargraph.useBundler": true,
    "solargraph.diagnostics": true,
    "solargraph.formatting": true,
    "solargraph.autoformat": true,
    "solargraph.completion": true,
    "solargraph.hover": true,
    "solargraph.references": true,
    "solargraph.rename": true,
    "solargraph.symbols": true,

    // Editor settings for Ruby files
    "[ruby]": {
        "editor.defaultFormatter": "misogi.ruby-rubocop",
        "editor.formatOnSave": true,
        "editor.tabSize": 2,
        "editor.insertSpaces": true,
        "editor.rulers": [80, 120]
    },

    // File associations
    "files.associations": {
        "Gemfile": "ruby",
        "Rakefile": "ruby",
        "Guardfile": "ruby",
        "*.rake": "ruby",
        "*.gemspec": "ruby",
        ".ruby-version": "plaintext",
        ".ruby-gemset": "plaintext"
    },

    // Exclude unnecessary directories from search
    "files.exclude": {
        "**/vendor/bundle": true,
        "**/tmp": true,
        "**/log": true,
        "**/node_modules": true
    }
}
```

```json
// .vscode/launch.json
// Debug configuration for Ruby and Rails

{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Ruby File",
            "type": "ruby_lsp",
            "request": "launch",
            "program": "${file}"
        },
        {
            "name": "Debug Rails Server",
            "type": "ruby_lsp",
            "request": "launch",
            "program": "${workspaceFolder}/bin/rails",
            "args": ["server", "-p", "3000"]
        },
        {
            "name": "Debug RSpec",
            "type": "ruby_lsp",
            "request": "launch",
            "program": "${workspaceFolder}/bin/rspec",
            "args": ["${file}"]
        },
        {
            "name": "Attach to Process",
            "type": "ruby_lsp",
            "request": "attach"
        }
    ]
}
```

### Install VS Code Extensions

```bash
# Recommended VS Code extensions for Ruby development
# Run these commands in your terminal

code --install-extension Shopify.ruby-lsp          # Ruby LSP (recommended)
code --install-extension castwide.solargraph       # Solargraph intellisense
code --install-extension misogi.ruby-rubocop       # RuboCop linting
code --install-extension kaiwood.endwise           # Auto-add 'end' keywords
code --install-extension ninoseki.vscode-gem-lens  # Gem information
```

### RubyMine / JetBrains IDE Configuration

```bash
# RubyMine automatically detects rbenv
# Configure the Ruby SDK in Settings > Languages & Frameworks > Ruby SDK and Gems

# Point to your rbenv Ruby installation:
# ~/.rbenv/versions/3.3.0/bin/ruby

# RubyMine settings for rbenv (automatic)
# The IDE reads .ruby-version and configures accordingly
```

### Solargraph Configuration

```yaml
# .solargraph.yml
# Solargraph language server configuration

include:
  - "**/*.rb"
exclude:
  - vendor/**/*
  - tmp/**/*
  - log/**/*
  - node_modules/**/*
require:
  - actioncable
  - actionmailer
  - actionpack
  - actionview
  - activejob
  - activemodel
  - activerecord
  - activestorage
  - activesupport
  - rails
domains: []
reporters:
  - rubocop
  - require_not_found
require_paths: []
plugins: []
max_files: 5000
```

### RuboCop Configuration

```yaml
# .rubocop.yml
# RuboCop linting configuration

require:
  - rubocop-rails
  - rubocop-rspec

AllCops:
  TargetRubyVersion: 3.3
  NewCops: enable
  Exclude:
    - 'db/schema.rb'
    - 'db/migrate/**/*'
    - 'vendor/**/*'
    - 'node_modules/**/*'
    - 'bin/**/*'
    - 'tmp/**/*'

# Style preferences
Style/Documentation:
  Enabled: false

Style/FrozenStringLiteralComment:
  Enabled: true
  EnforcedStyle: always

Style/StringLiterals:
  EnforcedStyle: single_quotes

# Layout preferences
Layout/LineLength:
  Max: 120
  AllowedPatterns: ['\A\s*#']

Layout/MultilineMethodCallIndentation:
  EnforcedStyle: indented

# Metrics configuration
Metrics/MethodLength:
  Max: 20

Metrics/ClassLength:
  Max: 200

Metrics/BlockLength:
  Exclude:
    - 'spec/**/*'
    - 'config/routes.rb'

# Rails-specific cops
Rails/HasManyOrHasOneDependent:
  Enabled: true

Rails/InverseOf:
  Enabled: true

# RSpec-specific cops
RSpec/ExampleLength:
  Max: 20

RSpec/MultipleExpectations:
  Max: 5
```

## Updating Ruby and rbenv

Keep your Ruby installation and rbenv up to date for security and performance improvements.

### Update rbenv

```bash
# Navigate to rbenv directory and pull latest changes
cd ~/.rbenv
git pull origin master

# Update ruby-build plugin for latest Ruby versions
cd ~/.rbenv/plugins/ruby-build
git pull origin master

# Verify the update
rbenv --version
rbenv install -l | head -20
```

### Update Ruby Version

```bash
# Check currently installed versions
rbenv versions

# Check for newer versions available
rbenv install -l | grep "^3\."

# Install the new version
rbenv install 3.3.1

# Migrate gems from old version to new version
# This reinstalls all gems from 3.3.0 to 3.3.1
rbenv migrate 3.3.0 3.3.1

# Or manually reinstall gems
gem list | cut -d' ' -f1 | xargs gem install

# Update global version
rbenv global 3.3.1

# Update project local version
cd ~/projects/myapp
rbenv local 3.3.1

# Update .ruby-version and reinstall dependencies
bundle install

# Verify the new version
ruby --version
```

### Uninstall Old Ruby Versions

```bash
# List installed versions
rbenv versions

# Uninstall an old version you no longer need
rbenv uninstall 2.7.8

# Alternatively, manually remove the version directory
rm -rf ~/.rbenv/versions/2.7.8

# Clean up old gem caches
rm -rf ~/.rbenv/cache/*
```

### Automated Update Script

```bash
#!/bin/bash
# update-rbenv.sh
# Script to update rbenv, ruby-build, and check for Ruby updates

set -e

echo "=== Updating rbenv ==="
cd ~/.rbenv
git pull origin master

echo ""
echo "=== Updating ruby-build ==="
cd ~/.rbenv/plugins/ruby-build
git pull origin master

echo ""
echo "=== Currently installed Ruby versions ==="
rbenv versions

echo ""
echo "=== Latest available Ruby versions ==="
echo "Ruby 3.x:"
rbenv install -l | grep "^3\." | tail -5

echo ""
echo "=== Current global Ruby version ==="
rbenv global

echo ""
echo "Update complete! To install a new Ruby version, run:"
echo "  rbenv install <version>"
```

```bash
# Make the script executable and run it
chmod +x ~/bin/update-rbenv.sh
~/bin/update-rbenv.sh
```

## Troubleshooting Common Issues

### Ruby Installation Fails

```bash
# Problem: Ruby installation fails with compilation errors

# Solution 1: Install missing dependencies
sudo apt install -y libssl-dev libyaml-dev libreadline-dev zlib1g-dev

# Solution 2: Install specific OpenSSL version for older Ruby versions
# Ruby 2.x may require OpenSSL 1.1
sudo apt install libssl1.1

# Solution 3: Use verbose mode to identify the exact error
rbenv install 3.3.0 --verbose 2>&1 | tee ruby-install.log

# Solution 4: Clear the build cache and retry
rm -rf ~/.rbenv/cache/ruby-3.3.0*
rbenv install 3.3.0
```

### rbenv Not Recognized After Installation

```bash
# Problem: 'rbenv: command not found' after installation

# Solution 1: Verify PATH configuration
echo $PATH | tr ':' '\n' | grep rbenv
# Should show: /home/user/.rbenv/bin

# Solution 2: Reload shell configuration
source ~/.bashrc    # For Bash
source ~/.zshrc     # For Zsh

# Solution 3: Manually add to PATH and verify
export PATH="$HOME/.rbenv/bin:$PATH"
eval "$(rbenv init -)"
rbenv --version

# Solution 4: Start a new terminal session
exec $SHELL
```

### Wrong Ruby Version Being Used

```bash
# Problem: Ruby version doesn't match expected version

# Diagnostic: Check which version is active and why
rbenv version
# Output shows version and source file

# Check version precedence
rbenv versions
# Asterisk (*) indicates active version

# Solution 1: Check for conflicting .ruby-version files
find . -name ".ruby-version" -type f 2>/dev/null

# Solution 2: Check environment variables
echo $RBENV_VERSION
# If set, unset it:
unset RBENV_VERSION

# Solution 3: Verify shims are up to date
rbenv rehash

# Solution 4: Check shim path
which ruby
# Should show: /home/user/.rbenv/shims/ruby
# NOT: /usr/bin/ruby

# Solution 5: Ensure rbenv init is in shell config
grep "rbenv init" ~/.bashrc
```

### Gem Installation Issues

```bash
# Problem: 'gem install' fails or installs to wrong location

# Diagnostic: Check gem environment
gem env

# Solution 1: Verify correct Ruby is active
rbenv version
which gem

# Solution 2: Ensure GEM_HOME is not overriding rbenv
echo $GEM_HOME
echo $GEM_PATH
# These should be empty or point to rbenv directories

# Solution 3: Unset conflicting environment variables
unset GEM_HOME
unset GEM_PATH

# Solution 4: Reinstall gems for current Ruby version
gem pristine --all

# Solution 5: Clear gem cache
rm -rf ~/.gem/ruby/*/cache/*
```

### Bundle Install Fails

```bash
# Problem: 'bundle install' fails with native extension errors

# Solution 1: Install development headers for common dependencies
sudo apt install -y \
    libpq-dev \           # PostgreSQL
    libmysqlclient-dev \  # MySQL
    libsqlite3-dev \      # SQLite
    libmagickwand-dev \   # ImageMagick
    libxml2-dev \         # Nokogiri
    libxslt1-dev          # Nokogiri

# Solution 2: Configure Bundler to use system libraries
bundle config build.nokogiri --use-system-libraries
bundle config build.pg --with-pg-config=/usr/bin/pg_config

# Solution 3: Retry with verbose output
bundle install --verbose

# Solution 4: Clean bundle cache and retry
rm -rf vendor/bundle
bundle install
```

### Permission Errors

```bash
# Problem: Permission denied when installing gems

# Solution 1: Never use sudo with rbenv gems
# Incorrect:
sudo gem install rails  # DON'T DO THIS

# Correct:
gem install rails

# Solution 2: Fix ownership of rbenv directory
chown -R $USER:$USER ~/.rbenv

# Solution 3: Check file permissions
ls -la ~/.rbenv/versions/
# Should be owned by your user, not root

# Solution 4: Reinstall rbenv in user directory
rm -rf ~/.rbenv
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
```

### OpenSSL Issues with Older Ruby Versions

```bash
# Problem: OpenSSL errors when installing Ruby 2.x

# Solution 1: Install OpenSSL 1.1 for compatibility
sudo apt install libssl1.1

# Solution 2: Compile with specific OpenSSL version
RUBY_CONFIGURE_OPTS="--with-openssl-dir=/usr/local/opt/openssl@1.1" \
    rbenv install 2.7.8

# Solution 3: Use ruby-build's built-in OpenSSL
RUBY_BUILD_HTTP_CLIENT=curl \
    rbenv install 2.7.8
```

### Diagnostics Commands Reference

```bash
# Comprehensive diagnostic commands for troubleshooting

# Check rbenv installation health
rbenv doctor

# Show active Ruby version and source
rbenv version

# List all installed versions
rbenv versions

# Show rbenv root directory
rbenv root

# Show shims directory
rbenv shims

# Display which executable would run
rbenv which ruby
rbenv which gem
rbenv which bundle

# Show all gems in current Ruby
gem list

# Show gem environment
gem env

# Check Bundler configuration
bundle config list

# Verify bundle is satisfied
bundle check

# Show PATH for debugging
echo $PATH | tr ':' '\n' | nl
```

## Conclusion

You now have a complete Ruby development environment on Ubuntu using rbenv. This setup provides:

- **Version isolation**: Each project can use its own Ruby version
- **Easy updates**: Simple commands to install and switch Ruby versions
- **Clean environment**: Gems installed per-version, no conflicts
- **Team consistency**: `.ruby-version` ensures everyone uses the same Ruby
- **Production parity**: Match your development Ruby version with production

### Quick Reference Commands

```bash
# Essential rbenv commands
rbenv install -l          # List available versions
rbenv install 3.3.0       # Install a version
rbenv versions            # List installed versions
rbenv global 3.3.0        # Set global version
rbenv local 3.3.0         # Set project version
rbenv version             # Show active version
rbenv rehash              # Update shims after gem install
rbenv uninstall 2.7.8     # Remove a version

# Essential Bundler commands
bundle install            # Install dependencies
bundle update             # Update dependencies
bundle exec <cmd>         # Run command with bundle context
bundle check              # Verify dependencies
```

### Monitoring Your Ruby Applications

Once your Ruby application is in production, monitoring becomes essential. **[OneUptime](https://oneuptime.com)** provides comprehensive monitoring for Ruby and Rails applications, including:

- **Application Performance Monitoring (APM)**: Track response times, throughput, and error rates for your Rails applications
- **Infrastructure Monitoring**: Monitor server resources, memory usage, and CPU utilization
- **Uptime Monitoring**: Get instant alerts when your application goes down
- **Log Management**: Centralize and analyze logs from all your Ruby processes
- **Incident Management**: Streamline your on-call rotations and incident response
- **Status Pages**: Keep users informed about service availability

With OneUptime, you can ensure your Ruby applications remain performant, reliable, and available for your users.
