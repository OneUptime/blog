# Validation Summary: How to Back Up and Restore Redis Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis persistence
- Redis RDB snapshots and AOF
- Redis replication
- redis-cli
- Python with redis-py and boto3
- Node.js with node-redis and AWS SDK for JavaScript v3
- Bash scripting and cron
- Amazon S3 and AWS CLI
- Prometheus alerting

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE command documentation: https://redis.io/docs/latest/commands/lastsave/
- Redis SAVE command documentation: https://redis.io/docs/latest/commands/save/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis Sentinel high availability documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- redis-py official client documentation: https://github.com/redis/redis-py
- node-redis official client documentation: https://redis.io/docs/latest/develop/clients/nodejs/
- node-redis command API documentation: https://github.com/redis/node-redis
- Redis ioredis migration guidance: https://redis.io/docs/latest/develop/clients/nodejs/migration/
- AWS CLI S3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS SDK for JavaScript v3 S3 PutObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
- Prometheus Redis exporter documentation: https://github.com/oliver006/redis_exporter

## Issues Found
- The Python backup manager read `LASTSAVE` inside `wait_for_save()` after starting `BGSAVE`. Because Redis documents the safe pattern as reading `LASTSAVE`, issuing `BGSAVE`, then polling for a changed `LASTSAVE`, this could time out if the save completed before the baseline was captured. Changed `wait_for_save()` to accept the pre-`BGSAVE` timestamp and capture that timestamp before calling `bgsave()`.
- The Node.js backup manager had the same `LASTSAVE` race. Changed it to capture the initial `LASTSAVE` before `BGSAVE` and pass that value into `waitForSave()`.
- The Node.js example used `ioredis`. Redis now recommends `node-redis` for new Node.js projects and documents ioredis migration guidance, so the example was updated to use `redis`/`createClient`, `sendCommand()`, and `client.close()`.
- The replication row and best-practice item implied replicas are backups. Redis/Sentinel documentation notes Redis replication is asynchronous and does not guarantee retained acknowledged writes during failures, and operationally replication also propagates bad writes/deletes. Updated the text to describe replication as high availability/failover rather than a backup substitute.

## Review Notes
The examples assume access to Redis server files such as `/var/lib/redis/dump.rdb`, which is correct for many self-managed Linux deployments but may not apply to managed Redis services or custom `dir`/`dbfilename` configurations. Local `redis-cli` and `aws` binaries were not installed in this workspace, so CLI details were checked against official Redis and AWS documentation instead. Syntax checks were run for the Python, JavaScript, and Bash snippets after editing.
