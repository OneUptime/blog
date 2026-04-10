# What Is New in Redis 6.0 (ACLs, SSL, Client-Side Caching)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, TLS, Client-Side Caching, Security

Description: Redis 6.0 introduced ACLs for fine-grained access control, native TLS support, and client-side caching with server-assisted invalidation.

---

Redis 6.0, released in April 2020, was one of the most significant releases in Redis history. It brought enterprise-grade security features and a new caching model that had been long-requested by the community.

## Access Control Lists (ACLs)

Before 6.0, Redis had a single password for all users. Redis 6.0 introduced multi-user ACLs with per-user command and key restrictions.

Create a read-only user:

```bash
redis-cli ACL SETUSER readonly on >readpass ~* +@read
```

Create a user limited to specific key patterns:

```bash
redis-cli ACL SETUSER app-user on >apppass ~app:* +@all -@dangerous
```

List all users:

```bash
redis-cli ACL LIST
# user default on nopass ~* +@all
# user readonly on >readpass ~* +@read
```

Store ACLs in a file for persistence:

```bash
# redis.conf
aclfile /etc/redis/acl.conf
```

## Native TLS Support

Redis 6.0 added built-in TLS support, eliminating the need for stunnel or external proxies.

Configure in `redis.conf`:

```text
tls-port 6380
port 0
tls-cert-file /etc/redis/certs/redis.crt
tls-key-file /etc/redis/certs/redis.key
tls-ca-cert-file /etc/redis/certs/ca.crt
tls-auth-clients yes
```

Connect with:

```bash
redis-cli -h localhost -p 6380 --tls --cacert /etc/redis/certs/ca.crt
```

## Client-Side Caching

Redis 6.0 introduced server-assisted client-side caching. The server tracks which keys a client has cached and sends invalidation messages when those keys change.

Two modes:

**Default mode**: Client tells Redis which keys it is caching:

```text
CLIENT TRACKING on
GET user:123       <- Redis now tracks this key for your connection
```

When `user:123` changes, Redis sends:

```text
*2
$10
invalidate
*1
$8
user:123
```

**Broadcasting mode**: Redis sends invalidations for all key changes matching a prefix:

```text
CLIENT TRACKING on BCAST PREFIX user:
```

## Threaded I/O

Redis 6.0 added multithreaded I/O for network reads and writes, while keeping command processing single-threaded:

```text
# redis.conf
io-threads 4
io-threads-do-reads yes
```

This improves throughput on high-bandwidth connections without changing Redis's single-threaded command semantics.

## RESP3 Protocol

Redis 6.0 introduced RESP3, a new client-server protocol that supports richer data types including maps, sets, and doubles as first-class types:

```text
HELLO 3
```

RESP3 enables more efficient client-side caching and better type information without extra parsing.

## Summary

Redis 6.0 was a landmark release that brought ACLs for multi-user security, native TLS encryption, server-assisted client-side caching, and threaded I/O for higher throughput. These features made Redis production-ready for stricter security environments and paved the way for modern Redis deployments.
