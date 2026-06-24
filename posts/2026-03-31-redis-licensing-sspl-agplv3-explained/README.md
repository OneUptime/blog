# Understanding Redis Licensing (SSPL, AGPLv3, Dual License)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Licensing, SSPL, Open Source, Legal

Description: Understand the Redis licensing changes from BSD to SSPL and AGPLv3 - what changed in 2024, what it means for your deployment, and how to evaluate your compliance obligations.

---

In March 2024, Redis Ltd. changed the licensing of Redis from the permissive BSD-3-Clause license to a dual-license model: the Server Side Public License (SSPL) and the Redis Source Available License v2 (RSALv2). This change had significant implications for users and the community. Understanding these licenses is essential for making informed decisions about your Redis deployment.

## What Changed in March 2024

Before March 2024, Redis was licensed under the permissive BSD-3-Clause license, which allowed anyone to use, modify, and distribute Redis with minimal restrictions.

Redis Ltd. changed all Redis releases from version 7.4 onward to a dual-license model:

```text
Old license:  BSD-3-Clause (permissive, OSI-approved open source)

New licenses:
  - Server Side Public License v1 (SSPL) - NOT OSI-approved
  - Redis Source Available License v2 (RSALv2) - NOT open source
```

Users must comply with one of these two licenses.

## The Server Side Public License (SSPL)

SSPL was created by MongoDB in 2018. Its key requirement is in Section 13:

> If you make the functionality of the Program available to third parties as a service, you must make the Service Source Code available.

The "Service Source Code" includes not just the program itself, but all components of the service - including management software, user interfaces, and infrastructure. In practice, this means:

- **Self-hosting Redis for internal use**: Generally permissible
- **Offering Redis as a managed service to customers**: Requires you to open-source your entire service stack
- **Cloud providers offering managed Redis**: Must comply with SSPL or license from Redis Ltd.

## The Redis Source Available License v2 (RSALv2)

RSALv2 is Redis Ltd.'s own license. Key restrictions:

```text
Permitted:
- Use Redis for your own applications (internal or commercial)
- Modify Redis for your own use
- Contribute back to Redis

Prohibited:
- Offering Redis (or a derivative) as a database/cache service to third parties
- Using Redis in a product that competes with Redis Ltd.
```

## What This Means for Common Deployments

```text
Deployment Type                          | Compliant?
-----------------------------------------|------------------
Self-hosting for your own app            | Yes (both licenses)
Using managed AWS ElastiCache (Redis)    | AWS migrated to Valkey
Using Redis Enterprise                   | Commercially licensed by Redis Ltd.
Building a SaaS with Redis as backend    | Yes, for internal Redis use
Offering managed Redis hosting to others | Requires commercial license
Forking Redis and distributing          | Must comply with SSPL terms
```

## The Community Response: Valkey

Major cloud providers (AWS, Google, Oracle) and other companies responded to the license change by forking Redis 7.2 (the last BSD-licensed version) as **Valkey**, under the Linux Foundation:

```bash
# Valkey is a drop-in replacement for Redis
docker run -d --name valkey -p 6379:6379 valkey/valkey:8

# Commands are identical
valkey-cli SET foo bar
valkey-cli GET foo
```

Valkey is licensed under BSD-3-Clause and is maintained as a true open-source project.

## AGPLv3 and Redis Modules

Some Redis modules (like RediSearch, RedisJSON) previously used AGPLv3. AGPLv3 requires that if you run a modified version as a network service, you must make the source code available to users of that service. The 2024 licensing change moved these to RSALv2 as well.

## Evaluating Your Compliance Obligations

Ask these questions:

```text
1. Are you offering Redis as a service to external customers?
   Yes -> You need a commercial license from Redis Ltd.
   No  -> SSPL/RSALv2 generally permits your use

2. Are you modifying Redis source code?
   Yes + distributing -> Must comply with SSPL terms
   No                 -> Standard usage permitted

3. Are you concerned about license risk?
   Consider Valkey (BSD) or Memcached (BSD) as alternatives
```

## Summary

Redis changed from BSD-3-Clause to SSPL/RSALv2 in March 2024. The SSPL restricts offering Redis as a managed service, while RSALv2 prohibits building competing products. For most developers running Redis internally for their own applications, the licenses permit normal use. For companies offering Redis as a service, a commercial license from Redis Ltd. is required. Valkey provides a BSD-licensed fork for those who need true open-source Redis.
