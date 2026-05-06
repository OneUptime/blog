# Best Practices for Organizing Environments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Best Practice, DevOps, Docker, Kubernetes

Description: Learn the best practices for structuring and organizing Portainer environments to maximize team productivity and operational efficiency.

## Introduction

Following established best practices when managing Organizing Environments in Portainer ensures operational consistency, security, and efficiency. This guide covers the most important practices learned from production deployments.

## Practice 1: Use Consistent Naming Conventions

Establish and enforce naming conventions across your organization:

```bash
# Example naming convention

# Environment: {env}-{region}-{type}
# Stack: {team}-{app}-{env}
# Volume: {stack}-{service}-{purpose}
# Network: {stack}-{tier}

# Examples:
prod-us-east-docker    # Environment
platform-webapp-prod   # Stack
platform-webapp-db-data  # Volume
platform-webapp-backend  # Network
```

## Practice 2: Version Control All Configurations

Store all Portainer configurations in Git:

```bash
# Directory structure for version-controlled configs
portainer-configs/
├── stacks/
│   ├── production/
│   │   ├── webapp/docker-compose.yml
│   │   └── monitoring/docker-compose.yml
│   └── staging/
│       └── webapp/docker-compose.yml
├── templates/
│   └── custom-app-template.json
└── .env.example
```

Connect stacks to Git repositories in Portainer:
1. Go to **Stacks** > **Add stack**
2. Select **Git repository** as the deployment method
3. Configure your Git repository URL and branch
4. Enable **GitOps updates** for GitOps workflows

## Practice 3: Implement Least-Privilege Access

Design access control with minimum required permissions. In Portainer Business Edition, map teams to the built-in roles:

```yaml
# Built-in Portainer roles for Docker environments
Roles:
  "Read-Only User":
    - View entitled resources
    - No deployments or changes

  "Standard User":
    - Deploy and manage the resources they own
    - Work within assigned environments

  Operator:
    - Update, redeploy, start, and stop existing resources
    - Access logs and container consoles
    - Cannot create or delete resources

  "Environment Administrator":
    - Full access within an assigned environment
    - Cannot change Portainer settings or underlying host infrastructure

  Administrator:
    - Full global access
    - User management
    - Environment configuration
```

## Practice 4: Use Environment Variables for Configuration

Use environment variables for non-sensitive settings, and use secrets for sensitive values:

```yaml
# GOOD: Use environment variables for non-sensitive settings
services:
  app:
    image: my-app:latest
    environment:
      - APP_ENV=${APP_ENV}
      - LOG_LEVEL=${LOG_LEVEL}
      - APP_PORT=${APP_PORT}
```

```yaml
# BAD: Hardcoded secrets
services:
  app:
    environment:
      - DB_PASSWORD=mysecretpassword  # Use a secret instead
      - API_KEY=sk-1234567890         # Use a secret instead
```

## Practice 5: Implement Health Checks

Add health checks to all services:

```yaml
services:
  webapp:
    image: my-webapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s  # Give the app time to start
    
  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Practice 6: Set Resource Limits

For Compose deployments that support the `deploy` section, set resource limits to prevent noisy neighbor issues:

```yaml
services:
  webapp:
    image: my-webapp:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'        # Maximum CPU
          memory: 512M       # Maximum memory
        reservations:
          cpus: '0.25'       # Guaranteed CPU
          memory: 128M       # Guaranteed memory
```

## Practice 7: Enable Logging Best Practices

Configure container log rotation for all services:

```yaml
services:
  webapp:
    image: my-webapp:latest
    logging:
      driver: json-file
      options:
        max-size: "100m"     # Rotate at 100MB
        max-file: "5"        # Keep 5 log files
```

## Practice 8: Regular Audits and Reviews

Schedule regular reviews of your Portainer setup:

```bash
#!/bin/bash
# audit.sh - Run monthly to review Portainer configurations

printf '=== Portainer Audit Report ===\n'
printf 'Date: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf '\n--- Unused Volumes ---\n'
docker volume ls -q --filter dangling=true

printf '\n--- Stopped Containers ---\n'
docker ps -a --filter status=exited

printf '\n--- Dangling Images ---\n'
docker image ls -q --filter dangling=true

printf '\n--- Disk Usage Details ---\n'
docker system df -v
```

## Practice 9: Secure the Portainer Instance Itself

Protect your Portainer management interface:

```yaml
# Portainer with security hardening
services:
  portainer:
    image: portainer/portainer-ce:sts
    command:
      - --http-disabled                    # Disable HTTP and serve only on HTTPS
      - --sslcert=/certs/portainer.crt
      - --sslkey=/certs/portainer.key
      - --admin-password-file=/run/secrets/portainer-password
      - --hide-label=internal-only=true   # Hide internal containers
    ports:
      - "9443:9443"
      - "8000:8000"
    secrets:
      - portainer-password
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer-data:/data
      - ./certs:/certs:ro

secrets:
  portainer-password:
    file: ./portainer-password.txt

volumes:
  portainer-data:
```

## Practice 10: Document Everything

Maintain documentation for your Portainer setup:

- Environment purposes and owners
- Network topology diagrams
- Runbook for common operations
- Incident response procedures
- Change management process

## Conclusion

Following best practices for Organizing Environments in Portainer ensures your container infrastructure remains secure, maintainable, and scalable. Start with the practices most critical to your organization and gradually implement the rest. Regular reviews and continuous improvement of your practices will help you avoid operational issues and maintain a high-quality containerized environment.
