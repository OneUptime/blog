# Validation Summary: One Big Server Is Probably Enough: Why You Don't Need the Cloud for Most Things

## Status
validated

## Post Type
Opinion piece with technical implementation examples

## Technologies Covered
- Docker Compose
- Docker secrets
- PostgreSQL Docker image
- Redis Docker image
- Kubernetes
- MicroK8s
- K3s
- AWS EC2
- AWS Lambda
- Bare metal and colocation infrastructure
- Linux, systemd, ZFS, and Btrfs

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- MicroK8s getting started documentation: https://canonical.com/microk8s/docs/getting-started
- K3s quick-start guide: https://docs.k3s.io/quick-start
- AWS EC2 M6a instance information: https://aws.amazon.com/ec2/instance-types/m6a/
- AWS EC2 on-demand pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/

## Issues Found
- The Docker Compose example used `POSTGRES_PASSWORD_FILE: /run/secrets/db_password` but did not grant the `postgres` service access to the secret or define the top-level `secrets` entry. Added `secrets: - db_password` under the PostgreSQL service and added a top-level `db_password` secret sourced from `./db_password.txt`, matching Docker Compose's documented two-step secret declaration model.
- The Docker Compose feature list claimed "zero-downtime deployments." Plain Docker Compose updates do not inherently guarantee zero downtime. Changed this to "minimal downtime when paired with a reverse proxy or rolling deployment pattern."

## Review Notes
- The Compose snippet was extracted and validated with `docker compose config --quiet` using a sample `db_password.txt`.
- The MicroK8s and K3s installation commands are consistent with their official quick-start documentation, though MicroK8s official docs commonly recommend pinning a channel such as `--channel=1.35`.
- The cost comparisons are time-sensitive and region/provider dependent. The AWS EC2 and Lambda values are plausible against current official pricing sources, but future readers should re-check provider pricing before making infrastructure decisions.
