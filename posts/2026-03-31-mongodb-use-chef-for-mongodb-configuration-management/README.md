# How to Use Chef for MongoDB Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Chef, Configuration Management

Description: Learn how to automate MongoDB configuration management using Chef cookbooks, recipes, and attributes to maintain consistent deployments at scale.

---

## Why Use Chef for MongoDB

Managing MongoDB across many servers manually leads to configuration drift, missed updates, and inconsistent deployments. Chef solves this by codifying your MongoDB configuration as recipes that run idempotently on every node. When you update a recipe, Chef converges all registered nodes to the desired state automatically.

## Setting Up the MongoDB Cookbook

Install the community MongoDB cookbook as a starting point:

```bash
knife supermarket install mongodb
```

Add it to your `Berksfile`:

```ruby
source 'https://supermarket.chef.io'

cookbook 'mongodb', '~> 0.16'
```

Run `berks install` to pull dependencies.

## Defining MongoDB Attributes

Create `attributes/default.rb` in your wrapper cookbook to override MongoDB settings:

```ruby
# MongoDB version and storage engine
default['mongodb']['version'] = '7.0'
default['mongodb']['config']['storage']['engine'] = 'wiredTiger'

# Network settings
default['mongodb']['config']['net']['port'] = 27017
default['mongodb']['config']['net']['bindIp'] = '0.0.0.0'

# Replication
default['mongodb']['config']['replication']['replSetName'] = 'rs0'

# Security
default['mongodb']['config']['security']['authorization'] = 'enabled'

# Logging
default['mongodb']['config']['systemLog']['verbosity'] = 0
default['mongodb']['config']['systemLog']['destination'] = 'file'
default['mongodb']['config']['systemLog']['path'] = '/var/log/mongodb/mongod.log'
```

## Writing the Recipe

Create `recipes/default.rb` to install and configure MongoDB:

```ruby
# Install MongoDB
package 'mongodb-org' do
  version node['mongodb']['version']
  action :install
end

# Generate mongod.conf from template
template '/etc/mongod.conf' do
  source 'mongod.conf.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(config: node['mongodb']['config'])
  notifies :restart, 'service[mongod]', :delayed
end

# Ensure the data directory exists
directory '/var/lib/mongodb' do
  owner 'mongodb'
  group 'mongodb'
  mode  '0755'
  action :create
end

# Manage the mongod service
service 'mongod' do
  supports status: true, restart: true, reload: true
  action [:enable, :start]
end
```

## The mongod.conf Template

Create `templates/default/mongod.conf.erb`:

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: <%= @config['storage']['engine'] %>

net:
  port: <%= @config['net']['port'] %>
  bindIp: <%= @config['net']['bindIp'] %>

replication:
  replSetName: <%= @config['replication']['replSetName'] %>

security:
  authorization: <%= @config['security']['authorization'] %>

systemLog:
  destination: <%= @config['systemLog']['destination'] %>
  path: <%= @config['systemLog']['path'] %>
  verbosity: <%= @config['systemLog']['verbosity'] %>
```

## Initializing the Replica Set

Add a custom resource to initialize the replica set on the primary:

```ruby
ruby_block 'initialize_replica_set' do
  block do
    cmd = Mixlib::ShellOut.new('mongosh --quiet --eval "rs.status().ok"')
    cmd.run_command
    unless cmd.stdout.strip == '1'
      initiate_cmd = Mixlib::ShellOut.new(
        'mongosh --eval "rs.initiate({_id:\'rs0\', members:[{_id:0, host:\'localhost:27017\'}]})"'
      )
      initiate_cmd.run_command
      initiate_cmd.error!
    end
  end
  action :run
  only_if { node['mongodb']['config']['replication']['replSetName'] }
end
```

## Applying the Configuration

Upload and apply the cookbook with:

```bash
knife cookbook upload my_mongodb
knife node run_list add web-db-01 'recipe[my_mongodb]'
chef-client --local-mode --run-list 'recipe[my_mongodb]'
```

## Summary

Chef provides a robust, repeatable way to manage MongoDB configuration across your fleet. By encoding installation, configuration templating, directory management, and service state into recipes and attributes, you eliminate configuration drift. Wrapper cookbooks let you override community cookbook defaults per environment, giving you full control over every MongoDB node without manual SSH sessions.
