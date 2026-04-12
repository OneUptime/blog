# How to Automate MySQL Deployments with Chef

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Chef, Configuration Management, Automation, DevOps

Description: Use Chef cookbooks to automate MySQL installation, configuration, and database provisioning with idempotent, testable recipes.

---

## Chef for MySQL Automation

Chef is a configuration management platform that uses Ruby-based DSL to define infrastructure state as cookbooks and recipes. For MySQL, Chef provides the `mysql` cookbook from the Chef Supermarket that handles installation and configuration, while you write custom recipes for application-specific databases and users.

## Getting Started

Install the MySQL cookbook and its dependencies:

```bash
# In your Chef repository Berksfile
cat > Berksfile << 'EOF'
source 'https://supermarket.chef.io'

cookbook 'mysql', '~> 8.0'
cookbook 'database', '~> 6.0'
EOF

berks install
berks upload
```

## MySQL Server Recipe

Create a wrapper cookbook that configures MySQL for your environment:

```ruby
# cookbooks/myapp_mysql/recipes/server.rb

# Install MySQL server
mysql_service 'default' do
  port          '3306'
  version       '8.0'
  initial_root_password node['myapp_mysql']['root_password']
  action [:create, :start]
end

# Deploy custom MySQL configuration
mysql_config 'tuning' do
  instance 'default'
  source   'tuning.cnf.erb'
  variables(
    max_connections:          node['myapp_mysql']['max_connections'],
    innodb_buffer_pool_size:  node['myapp_mysql']['innodb_buffer_pool_size'],
    slow_query_log_file:      node['myapp_mysql']['slow_query_log_file']
  )
  notifies :restart, 'mysql_service[default]', :delayed
  action :create
end
```

## Configuration Template

```text
# cookbooks/myapp_mysql/templates/tuning.cnf.erb
[mysqld]
max_connections           = <%= @max_connections %>
innodb_buffer_pool_size   = <%= @innodb_buffer_pool_size %>
slow_query_log            = ON
slow_query_log_file       = <%= @slow_query_log_file %>
long_query_time           = 1
log_error                 = /var/log/mysql/error.log
```

## Database and User Management

```ruby
# cookbooks/myapp_mysql/recipes/app_database.rb

mysql_connection_info = {
  host:     '127.0.0.1',
  port:     3306,
  username: 'root',
  password: node['myapp_mysql']['root_password']
}

# Create application database
mysql_database node['myapp_mysql']['db_name'] do
  connection  mysql_connection_info
  encoding    'utf8mb4'
  collation   'utf8mb4_unicode_ci'
  action      :create
end

# Create application user
mysql_database_user node['myapp_mysql']['app_user'] do
  connection    mysql_connection_info
  password      node['myapp_mysql']['app_password']
  database_name node['myapp_mysql']['db_name']
  host          '10.0.0.%'
  privileges    [:select, :insert, :update, :delete]
  action        [:create, :grant]
end
```

## Attributes File

```ruby
# cookbooks/myapp_mysql/attributes/default.rb

default['myapp_mysql']['max_connections']         = 300
default['myapp_mysql']['innodb_buffer_pool_size'] = '2G'
default['myapp_mysql']['slow_query_log_file']     = '/var/log/mysql/slow.log'
default['myapp_mysql']['db_name']                 = 'myapp'
default['myapp_mysql']['app_user']                = 'app_user'

# Sensitive attributes - override in an encrypted data bag
default['myapp_mysql']['root_password']           = nil
default['myapp_mysql']['app_password']            = nil
```

## Using Encrypted Data Bags for Secrets

```bash
# Create an encrypted data bag for MySQL credentials
knife data bag create mysql_secrets
knife data bag from file mysql_secrets data_bags/mysql_secrets/production.json \
  --secret-file ~/.chef/secret_key
```

```ruby
# Load credentials from data bag in the recipe
mysql_creds = data_bag_item('mysql_secrets', 'production')
node.default['myapp_mysql']['root_password'] = mysql_creds['root_password']
node.default['myapp_mysql']['app_password']  = mysql_creds['app_password']
```

## Testing with Test Kitchen

```yaml
# .kitchen.yml
driver:
  name: vagrant

platforms:
  - name: ubuntu-22.04

suites:
  - name: default
    run_list:
      - recipe[myapp_mysql::server]
      - recipe[myapp_mysql::app_database]
    attributes:
      myapp_mysql:
        root_password: "test_root_pass"
        app_password: "test_app_pass"
```

```bash
kitchen test
```

## Summary

Chef automates MySQL deployments using the `mysql` cookbook for installation and custom wrapper cookbooks for application-specific configuration. Recipes are idempotent and tested with Test Kitchen, while encrypted data bags keep credentials secure. Node attributes make it easy to customize configurations per environment without changing recipe code.
