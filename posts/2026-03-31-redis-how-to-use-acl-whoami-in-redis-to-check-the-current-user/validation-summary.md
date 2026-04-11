# Validation Summary: How to Use ACL WHOAMI in Redis to Check the Current User

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ACL system, AUTH command, ACL WHOAMI command)
- Python (redis-py client library)
- Node.js (node-redis v4+ client library)
- Go (go-redis/v9 client library)

## Sources Consulted
- Redis official documentation for ACL WHOAMI: https://redis.io/docs/latest/commands/acl-whoami/
- Redis official documentation for AUTH: https://redis.io/docs/latest/commands/auth/
- redis-py documentation and source: https://redis-py.readthedocs.io/en/stable/
- node-redis source (commands index): https://github.com/redis/node-redis
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
No technical issues found.

## Review Notes
- ACL WHOAMI has been available since Redis 6.0.0. The post does not mention version requirements, which is fine for a general tutorial but readers on older Redis versions should be aware.
- The two-argument AUTH syntax (`AUTH username password`) used for user switching was also introduced in Redis 6.0.0.
- All three client library examples (Python, Node.js, Go) use correct and current API method names and signatures.
- The `client.auth(password, username=username)` call in the Python switching example correctly places password as the first positional argument and username as a keyword argument, matching the redis-py signature.
- The Node.js example uses top-level `await` which requires either an async function wrapper or ES modules with top-level await support. This is a common pattern in Node.js documentation examples and is acceptable.
