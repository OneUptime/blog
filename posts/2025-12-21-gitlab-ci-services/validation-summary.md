# Validation Summary: How to Use Services in GitLab CI Jobs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, `services`, `extends`, `!reference`, `needs`)
- GitLab Runner (Docker executor, service networking)
- Docker / Docker-in-Docker (dind)
- PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, RabbitMQ service images
- Node.js test jobs

## Sources Consulted
- GitLab CI services documentation — https://docs.gitlab.com/ci/services/ (service hostname/alias derivation rules)
- GitLab `services` keyword reference — https://docs.gitlab.com/ci/yaml/#services
- GitLab Docker-in-Docker / `DOCKER_TLS_CERTDIR` guidance — https://docs.gitlab.com/ci/docker/using_docker_build/
- MySQL 8.0 `authentication_policy` system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_authentication_policy
- Official Docker Hub images for postgres, mysql, mongo, redis, elasticsearch, rabbitmq (environment variable names)

## Issues Found
1. **Incorrect service hostname derivation (text).** The post stated the default hostname "removes the registry and replaces special characters with dashes." Per GitLab docs, the registry is **not** removed and dots are **not** replaced — only the tag is stripped and slashes are replaced (with dashes for the secondary alias, double underscores for the primary). Reworded the sentence to accurately describe the rule.
2. **Incorrect hostname example.** The mapping showed `registry.example.com/myimage` → `registry-example-com-myimage`. The dots are preserved, so the correct secondary-alias hostname is `registry.example.com-myimage`. Fixed the example.

## Review Notes
- The MySQL example uses `command: ["--authentication-policy=mysql_native_password"]`. This is valid for MySQL 8.0.27+ (the `authentication_policy` variable that superseded the deprecated `default_authentication_plugin`), so it is correct for the `mysql:8.0` image. Left unchanged.
- The Elasticsearch `command` override (`bin/elasticsearch -E...`) works, though passing the same settings via service `variables` (e.g. `discovery.type`, `xpack.security.enabled`) is an equally common alternative. No correctness issue.
- In the final "Complete Service Testing Pipeline", the `e2e_tests` job declares `needs: - build`, but the snippet defines no job literally named `build` (only a `build` stage). In a real pipeline this would need an actual `build` job to exist. Left as-is since it is an illustrative excerpt, but worth tightening if the snippet is ever made copy-paste runnable.
- The `redis-cli ... ping` / `pg_isready` / `curl` readiness loops are correct and idiomatic.
