# Validation Summary: How to Run Docker Containers on EC2 Without ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon Linux 2023
- Ubuntu
- Docker Engine
- Docker Compose
- Amazon ECR
- AWS CLI
- Docker logging drivers
- Amazon CloudWatch Logs
- cron

## Sources Consulted
- AWS Amazon ECS Developer Guide: Installing Docker on Amazon Linux 2023 and authenticating to ECR: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html
- AWS CLI Command Reference: `authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS Managed Policy Reference: `AmazonEC2ContainerRegistryReadOnly`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2ContainerRegistryReadOnly.html
- Amazon ECR User Guide: AWS managed policies for Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/security-iam-awsmanpol.html
- Docker Docs: Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install the Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/
- Docker Docs: Start containers automatically: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Configure logging drivers: https://docs.docker.com/engine/logging/configure/
- Docker Docs: Amazon CloudWatch Logs logging driver: https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker Docs: Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker scout cves`: https://docs.docker.com/reference/cli/docker/scout/cves/
- Local CLI help output for `docker run` and `docker compose`.

## Issues Found
- The Docker daemon log rotation command used `sudo cat > /etc/docker/daemon.json`, which does not apply elevated privileges to the shell redirection and can fail for non-root users. Changed it to `sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'`.
- The CloudWatch Logs example did not handle the case where the log group does not already exist. Added `--log-opt awslogs-create-group=true` and a note that the instance profile needs CloudWatch Logs permissions, including `logs:CreateLogGroup` when creating the group automatically.
- The cron example overwrote the user's existing crontab and attempted to append to `/var/log/container-health.log` from a user crontab. Changed it to preserve the root crontab with `sudo crontab -l` and install the entry via `sudo crontab -`.
- The health check script scheduling section did not make the script executable before cron runs it. Added `sudo chmod +x /usr/local/bin/container-health-check.sh`.

## Review Notes
- The Ubuntu installation snippet uses an older but still plausible Docker apt repository pattern. Docker's current documentation now shows a `.sources` file with `docker.asc` and installs `docker-buildx-plugin` and `docker-compose-plugin` from the repository.
- The Docker Compose health check assumes the application image contains `curl`. That is valid for an example, but real application images should include the health check tool they call or use an application-native health command.
- The Compose example uses short-form `depends_on`, which controls startup order but does not wait for database or cache health unless long-form `condition: service_healthy` is used.
