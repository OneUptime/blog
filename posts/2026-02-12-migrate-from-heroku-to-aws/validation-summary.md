# Validation Summary: How to Migrate from Heroku to AWS

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Heroku Dynos, Procfile, config vars, Heroku Postgres, and Heroku Key-Value Store
- AWS ECS Fargate, Elastic Beanstalk, Lambda, EventBridge, Application Load Balancer, RDS for PostgreSQL, ElastiCache for Redis OSS, Secrets Manager, SSM Parameter Store, CloudWatch, CodePipeline, and CodeBuild
- Docker, Node.js, Django, Gunicorn, PostgreSQL CLI tools, Redis CLI, boto3, and GitHub Actions

## Sources Consulted
- Heroku Dev Center: Dyno startup behavior and `$PORT` for web dynos: https://devcenter.heroku.com/articles/dyno-startup-behavior
- Heroku Dev Center: Heroku Postgres backups: https://devcenter.heroku.com/articles/heroku-postgres-backups
- Heroku Dev Center: Managing Heroku Postgres with the CLI: https://devcenter.heroku.com/articles/managing-heroku-postgres-using-cli
- Heroku Dev Center: Connecting to Heroku Key-Value Store and TLS requirements: https://devcenter.heroku.com/articles/connecting-heroku-redis
- Heroku Dev Center: Managing Heroku Key-Value Store with the CLI: https://devcenter.heroku.com/articles/managing-heroku-redis-using-cli
- Redis documentation: `redis-cli --rdb` and TLS usage: https://redis.io/docs/latest/develop/tools/cli
- AWS boto3 documentation: RDS `create_db_instance`: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/create_db_instance.html
- AWS RDS for PostgreSQL release notes and version behavior: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS boto3 documentation: ECS `register_task_definition`: https://docs.aws.amazon.com/boto3/latest/reference/services/ecs/client/register_task_definition.html
- AWS boto3 documentation: ElastiCache `create_replication_group`: https://docs.aws.amazon.com/boto3/latest/reference/services/elasticache/client/create_replication_group.html
- AWS boto3 documentation: Elastic Load Balancing v2 target groups: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elbv2/client/create_target_group.html
- AWS Elastic Load Balancing documentation: TLS security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- GitHub Docs: Deploying to Amazon ECS from GitHub Actions: https://docs.github.com/en/actions/how-tos/use-cases-and-examples/deploying/deploying-to-amazon-elastic-container-service
- npm documentation: `npm ci` omit behavior: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Release Working Group schedule: https://github.com/nodejs/release

## Issues Found
- The Node.js Docker example used `node:18-alpine`. Node.js 18 is end-of-life by the 2026 validation date, so it was updated to `node:24-alpine`, the active LTS line.
- The Node.js Docker example used `npm ci --only=production`. npm documents `--omit=dev` as the current way to omit development dependencies, so the command was updated.
- The port explanation said AWS uses a fixed port. That was too broad because AWS container platforms require explicit container or environment configuration, but applications can still read a `PORT` variable if you provide one. The wording was corrected.
- The RDS example pinned PostgreSQL `15.4`, an old minor version. The example now uses `EngineVersion='17'` so RDS selects an available supported minor release for PostgreSQL 17.
- The DMS guidance promised zero downtime. Continuous replication can reduce downtime, but production migrations still need a final cutover window, so the wording was changed to near-zero downtime.
- The Redis export example omitted Heroku's current TLS requirement for Key-Value Store connections. It now retrieves `REDIS_URL` and uses `redis-cli --tls --insecure -u "$REDIS_URL" --rdb dump.rdb`.

## Review Notes
The remaining AWS boto3 examples are illustrative and assume prerequisite resources such as VPCs, subnet groups, IAM roles, security groups, ECR repositories, CloudWatch log groups, ACM certificates, target registration, and ECS services already exist. The GitHub Actions example is technically plausible, but a production workflow would usually render a task definition with an immutable image tag or digest before deploying.
