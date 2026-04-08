# How to Connect to MongoDB from Ruby Using the Ruby Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Ruby, Driver, Connection, Configuration

Description: Learn how to install and configure the official MongoDB Ruby driver to connect your Ruby application to a MongoDB database securely.

---

## Introduction

The official MongoDB Ruby driver (`mongo` gem) provides a low-level, yet ergonomic interface to MongoDB. Whether you are building a standalone Ruby script, a Sinatra service, or a non-Rails web application, the Ruby driver is the foundation upon which higher-level ODMs like Mongoid are built.

## Installing the Gem

Add the `mongo` gem to your `Gemfile`:

```ruby
gem 'mongo', '~> 2.20'
```

Then install:

```bash
bundle install
```

## Creating a Client

The `Mongo::Client` is the entry point for all interactions with the database:

```ruby
require 'mongo'

# Connect using a URI
client = Mongo::Client.new('mongodb://localhost:27017/myapp')

# Connect with options hash
client = Mongo::Client.new(
  ['localhost:27017'],
  database: 'myapp',
  user:     'appuser',
  password: 'secret',
  auth_source: 'admin'
)
```

## Connection Pooling

The driver manages a connection pool automatically. You can tune it for your workload:

```ruby
client = Mongo::Client.new(
  ['localhost:27017'],
  database:    'myapp',
  max_pool_size: 20,
  min_pool_size: 5,
  wait_queue_timeout: 5  # seconds
)
```

## Connecting to MongoDB Atlas

For Atlas clusters, use the SRV connection string:

```ruby
uri = 'mongodb+srv://user:password@cluster0.abcde.mongodb.net/myapp?retryWrites=true&w=majority'
client = Mongo::Client.new(uri)
```

## Switching Databases and Collections

```ruby
# Access a database
db = client.use('analytics')

# Access a collection
events_collection = db[:events]

# Shorthand from client
products = client[:products]
```

## Verifying the Connection

Run a ping command to verify connectivity:

```ruby
begin
  client.database.command(ping: 1)
  puts 'Connected to MongoDB successfully'
rescue Mongo::Error => e
  puts "Connection failed: #{e.message}"
end
```

## Closing the Connection

Always close the client when your application shuts down:

```ruby
at_exit { client.close }
```

For short-lived scripts, use `ensure` to guarantee cleanup:

```ruby
client = Mongo::Client.new(['localhost:27017'], database: 'myapp')
begin
  # perform operations
  puts client[:users].count_documents({})
ensure
  client.close
end
```

## Logging

Enable the driver's built-in logger during development:

```ruby
Mongo::Logger.logger = Logger.new($stdout)
Mongo::Logger.logger.level = Logger::DEBUG
```

## Summary

Connecting to MongoDB from Ruby requires installing the `mongo` gem and instantiating a `Mongo::Client` with your connection string or options hash. The driver handles connection pooling, authentication, and TLS automatically. Once connected, you access collections through the client and can verify connectivity with a ping command before executing application logic.
