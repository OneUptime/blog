# How to Use ACL DRYRUN in Redis to Test Permission Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Permission, Access Control

Description: Learn how to use Redis ACL DRYRUN to simulate command execution against a user's permissions without actually running the command.

---

The `ACL DRYRUN` command, introduced in Redis 7.0, lets you test whether a specific user has permission to run a command without actually executing it. This is invaluable when setting up or auditing Redis ACL configurations, since you can verify your rules are correct before deploying them to production.

## Basic Syntax

```bash
ACL DRYRUN <username> <command> [arg [arg ...]]
```

The command returns `OK` if the user is allowed to execute the command, or an error message explaining the permission denial if not.

## Checking Read Permissions

Suppose you have a user `reader` with limited access:

```bash
127.0.0.1:6379> ACL SETUSER reader on >secret ~data:* +GET
OK
```

Test whether `reader` can use `GET`:

```bash
127.0.0.1:6379> ACL DRYRUN reader GET data:user:42
OK
```

Now test a command that should be denied:

```bash
127.0.0.1:6379> ACL DRYRUN reader SET data:user:42 "hello"
"User reader has no permissions to run the 'set' command"
```

## Testing Key Pattern Restrictions

ACL rules often restrict which keys a user can access. `ACL DRYRUN` validates key patterns too:

```bash
127.0.0.1:6379> ACL SETUSER appuser on >pass ~app:* +GET +SET
OK

# Allowed key
127.0.0.1:6379> ACL DRYRUN appuser GET app:session:1234
OK

# Key outside the allowed pattern
127.0.0.1:6379> ACL DRYRUN appuser GET system:config
"User appuser has no permissions to access the 'system:config' key"
```

## Testing Pub/Sub Channel Permissions

Redis 6.2 added channel-level ACL controls. Use `ACL DRYRUN` to test them:

```bash
127.0.0.1:6379> ACL SETUSER pubuser on >pass &notifications:* +SUBSCRIBE
OK

127.0.0.1:6379> ACL DRYRUN pubuser SUBSCRIBE notifications:alerts
OK

127.0.0.1:6379> ACL DRYRUN pubuser SUBSCRIBE admin:commands
"User pubuser has no permissions to access the 'admin:commands' channel"
```

## Using ACL DRYRUN in Deployment Scripts

Before rolling out ACL changes, automate permission tests:

```bash
#!/bin/bash
HOST="localhost"
PORT="6379"
USER="service_account"

# Commands this user should be able to run
ALLOWED=(
  "GET cache:*"
  "SET cache:*"
  "DEL cache:*"
  "EXPIRE cache:*"
)

# Commands this user should NOT be able to run
DENIED=(
  "FLUSHALL"
  "CONFIG GET *"
  "KEYS *"
)

echo "Testing allowed commands..."
for CMD in "${ALLOWED[@]}"; do
  RESULT=$(redis-cli -h $HOST -p $PORT ACL DRYRUN $USER $CMD 2>&1)
  if [ "$RESULT" = "OK" ]; then
    echo "PASS: $CMD"
  else
    echo "FAIL (expected OK): $CMD - $RESULT"
  fi
done

echo "Testing denied commands..."
for CMD in "${DENIED[@]}"; do
  RESULT=$(redis-cli -h $HOST -p $PORT ACL DRYRUN $USER $CMD 2>&1)
  if [ "$RESULT" != "OK" ]; then
    echo "PASS: $CMD correctly denied"
  else
    echo "FAIL (expected denial): $CMD"
  fi
done
```

## Difference from ACL LOG

`ACL DRYRUN` is proactive - you test before the user attempts the command. `ACL LOG` is reactive - it records failed access attempts after they happen. Use both together: `ACL DRYRUN` during setup and staging, `ACL LOG` in production to catch unexpected access patterns.

## Subcommand Testing

For commands with subcommands like `CLIENT` or `XGROUP`, pass the subcommand as an argument:

```bash
127.0.0.1:6379> ACL DRYRUN reader CLIENT LIST
"User reader has no permissions to run the 'client|list' command"
```

## Summary

`ACL DRYRUN` is an essential tool for safely configuring and auditing Redis ACLs. By simulating command execution against user permissions without side effects, you can confidently verify that your access control rules behave exactly as intended before they affect real workloads.
