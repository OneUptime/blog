# How to Manage Redis with Chef

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Chef, Configuration Management, Automation, Infrastructure

Description: Learn how to manage Redis with Chef - covering cookbook usage, recipe authoring, attribute configuration, service management, and testing with Test Kitchen.

---

Chef provides a Ruby-based DSL for automating Redis installation and configuration. By managing Redis with Chef cookbooks, you ensure repeatable, testable deployments with configuration stored as code.

## Use the Community Redis Cookbook

The `redisio` cookbook from the Chef Supermarket provides comprehensive Redis management:

```bash
# In your Berksfile
cookbook 'redisio', '~> 3.0'
```

```bash
berks install
```

## Write a Basic Redis Recipe

```ruby
# recipes/default.rb

node.default['redisio']['version'] = '7.2.0'

node.default['redisio']['servers'] = [
  {
    'port'             => 6379,
    'address'          => '127.0.0.1',
    'maxmemory'        => '2gb',
    'maxmemory-policy' => 'allkeys-lru',
    'requirepass'      => node['redis']['password'],
    'loglevel'         => 'notice',
    'save'             => ['900 1', '300 10', '60 10000'],
  }
]

include_recipe 'redisio::default'
include_recipe 'redisio::enable'
```

## Manage Attributes with Roles and Environments

Define environment-specific Redis configuration:

```ruby
# environments/production.rb
name 'production'
description 'Production environment'

override_attributes(
  'redis' => {
    'password'   => 'StrongProductionPassword123!',
    'maxmemory'  => '8gb',
  },
  'redisio' => {
    'servers' => [
      {
        'port'             => 6379,
        'address'          => '0.0.0.0',
        'maxmemory'        => '8gb',
        'maxmemory-policy' => 'allkeys-lru',
        'requirepass'      => 'StrongProductionPassword123!',
        'appendonly'       => 'yes',
      }
    ]
  }
)
```

## Create a Custom Redis Resource

For fine-grained control, write a custom resource:

```ruby
# resources/instance.rb
unified_mode true

property :port,       Integer, default: 6379
property :maxmemory,  String,  default: '1gb'
property :password,   String,  sensitive: true

action :configure do
  template "/etc/redis/redis-#{new_resource.port}.conf" do
    source 'redis.conf.erb'
    owner  'redis'
    group  'redis'
    mode   '0640'
    variables(
      port:      new_resource.port,
      maxmemory: new_resource.maxmemory,
      password:  new_resource.password
    )
    notifies :restart, "service[redis-#{new_resource.port}]", :delayed
  end

  service "redis-#{new_resource.port}" do
    action [:enable, :start]
  end
end
```

Use the resource in a recipe:

```ruby
redis_instance 'primary' do
  port      6379
  maxmemory '4gb'
  password  data_bag_item('secrets', 'redis')['password']
  action    :configure
end
```

## Test with Test Kitchen

```yaml
# .kitchen.yml
driver:
  name: vagrant

platforms:
  - name: ubuntu-22.04

suites:
  - name: default
    run_list:
      - recipe[my_cookbook::redis]
    attributes:
      redis:
        password: testpassword
```

```ruby
# test/integration/default/redis_test.rb
describe service('redis-server') do
  it { should be_running }
  it { should be_enabled }
end

describe port(6379) do
  it { should be_listening }
end

describe command('redis-cli -a testpassword PING') do
  its(:stdout) { should match(/PONG/) }
end
```

```bash
kitchen test
```

## Deploy and Verify

```bash
# Upload cookbooks
knife cookbook upload redisio my_cookbook

# Bootstrap a new node
knife bootstrap redis-server.example.com -r 'recipe[my_cookbook::redis]' -E production

# Verify
knife ssh 'name:redis-server*' 'redis-cli PING'
```

## Summary

Chef manages Redis through the `redisio` cookbook for standard installations or custom resources for fine-grained control. Use environments and roles to manage environment-specific configuration like memory limits and passwords, store secrets in Chef Data Bags, and test cookbooks with Test Kitchen before deploying to production. The Ruby DSL makes Redis configuration readable, testable, and version-controlled.
