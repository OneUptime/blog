# How to Use Redis in Perl with Redis.pm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Perl, Redis.pm, Scripting, Automation

Description: Learn how to use Redis in Perl with the Redis.pm module, covering connections, key operations, hashes, pipelining, and Pub/Sub.

---

`Redis.pm` is the most widely used Perl module for Redis. It wraps the Redis protocol cleanly and supports all Redis commands, pipelining, and Pub/Sub.

## Installation

```bash
cpanm Redis
```

Or via system package manager:

```bash
sudo apt-get install libredis-perl
```

## Connecting

```perl
use Redis;

my $redis = Redis->new(
    server   => 'localhost:6379',
    debug    => 0,
    encoding => undef,    # handle binary data correctly
);

print "Connected!\n";
```

## Basic Operations

```perl
# SET and GET
$redis->set('user:1:name', 'Alice');
my $name = $redis->get('user:1:name');
print "Name: $name\n";

# SETEX (with expiry)
$redis->setex('session:abc', 3600, 'user:42');

# INCR
$redis->set('visits', 0);
my $count = $redis->incr('visits');
print "Visits: $count\n";

# EXISTS and DEL
if ($redis->exists('user:1:name')) {
    print "Key exists\n";
}
$redis->del('visits');
```

## Hash Operations

```perl
# HSET
$redis->hmset('profile:1',
    city  => 'Paris',
    age   => 29,
    email => 'alice@example.com',
);

# HGET
my $city = $redis->hget('profile:1', 'city');
print "City: $city\n";

# HGETALL into a hash
my %profile = $redis->hgetall('profile:1');
while (my ($k, $v) = each %profile) {
    print "$k: $v\n";
}
```

## List and Sorted Set

```perl
# List as a queue
$redis->rpush('jobs', 'task:1', 'task:2', 'task:3');
my $job = $redis->lpop('jobs');
print "Processing: $job\n";

# Sorted set (leaderboard)
$redis->zadd('scores', 100, 'alice', 75, 'bob', 90, 'carol');
my @top = $redis->zrevrange('scores', 0, 1, 'WITHSCORES');
print "Leader: $top[0] with score $top[1]\n";
```

## Pipelining

```perl
# Queue commands without waiting for responses
$redis->set("item:$_", $_, sub {}) for 1..50;

# Wait for all queued responses
$redis->wait_all_responses;
print "Pipeline complete\n";
```

## Pub/Sub

Pub/Sub requires the connection to enter subscribe mode. Use a callback:

```perl
# Publisher (separate Redis connection)
my $pub = Redis->new(server => 'localhost:6379');
$pub->publish('alerts', 'System restart in 5 minutes');

# Subscriber
my $sub = Redis->new(server => 'localhost:6379');
$sub->subscribe('alerts', sub {
    my ($message, $topic, $subscribed_topic) = @_;
    print "[$topic] $message\n";
});

$sub->wait_for_messages(0.1) while 1;
```

## Error Handling

```perl
use Try::Tiny;

try {
    $redis->set('key', 'value');
    my $val = $redis->get('key');
} catch {
    warn "Redis error: $_";
};
```

## Summary

`Redis.pm` exposes every Redis command as a method call, making it intuitive for Perl developers. Use `hmset`/`hgetall` for structured data, `rpush`/`lpop` for queues, and `zadd`/`zrevrange` for leaderboards. For Pub/Sub, create a dedicated subscriber object and call `wait_for_messages` in a loop. Always set `encoding => undef` when handling binary or UTF-8 data.
