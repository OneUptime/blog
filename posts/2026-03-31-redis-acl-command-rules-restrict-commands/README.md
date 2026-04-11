# How to Restrict Redis Commands with ACL Command Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Command, Authorization

Description: Learn how to use Redis ACL command rules to allow or deny specific commands per user, limiting what each application or user can execute.

---

Redis ACL command rules let you control exactly which commands each user can run. This is essential when multiple applications share a Redis instance - you can prevent a read-only app from running `FLUSHALL` or `CONFIG SET`.

## ACL Command Rule Syntax

Command rules follow a simple syntax inside `ACL SETUSER`:

```text
+command        Allow a specific command
-command        Deny a specific command
+@category      Allow all commands in a category
-@category      Deny all commands in a category
+command|subcommand  Allow a specific subcommand
allcommands     Allow all commands
nocommands      Deny all commands (default for new users)
```

## Create a Read-Only User

Allow only read commands by using the `@read` category:

```bash
ACL SETUSER reader on >readpass ~* &* -@all +@read
```

Test the user:

```bash
redis-cli -u redis://reader:readpass@127.0.0.1:6379 SET foo bar
# (error) NOPERM this user has no permissions to run the 'set' command
redis-cli -u redis://reader:readpass@127.0.0.1:6379 GET foo
# (nil)
```

## Allow Specific Commands Only

For an application that only needs to cache data:

```bash
ACL SETUSER cacheapp on >cachepass ~cache:* &* -@all +GET +SET +DEL +EXPIRE +TTL +EXISTS
```

This user can only run `GET`, `SET`, `DEL`, `EXPIRE`, `TTL`, and `EXISTS` on keys matching `cache:*`.

## Block Dangerous Commands for a Regular User

Start with all commands enabled, then remove dangerous ones:

```bash
ACL SETUSER appuser on >apppass ~app:* &* allcommands \
  -FLUSHALL -FLUSHDB -CONFIG -DEBUG -SHUTDOWN -REPLICAOF -SLAVEOF
```

## Allow Subcommands Selectively

Control subcommands of multi-part commands like `CLIENT`:

```bash
# Allow CLIENT GETNAME and CLIENT SETNAME but not CLIENT KILL
ACL SETUSER limiteduser on >pass ~* &* -@all +@read +CLIENT|GETNAME +CLIENT|SETNAME
```

## View and Verify Rules

```bash
ACL GETUSER cacheapp
```

```text
 1) "flags"
 2) 1) "on"
 3) "passwords"
 4) 1) "hashed password..."
 5) "commands"
 6) "-@all +get +set +del +expire +ttl +exists"
 7) "keys"
 8) "~cache:*"
 9) "channels"
10) "&*"
11) "selectors"
12) (empty array)
```

## Save ACL Rules to File

After configuring users, persist them:

```bash
ACL SAVE
```

Or define them in `aclfile /etc/redis/users.acl` in `redis.conf` for version-controlled management.

## Summary

Redis ACL command rules use `+` to allow and `-` to deny commands or categories per user. Start with `nocommands` or `-@all` and explicitly grant only what each user needs. Use subcommand rules like `+CLIENT|GETNAME` for fine-grained control over multi-part commands.
