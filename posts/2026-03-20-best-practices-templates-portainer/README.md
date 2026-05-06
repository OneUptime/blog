# Best Practices for Template Management in Portainer - Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Best Practice, Template, DevOps, Automation

Description: Create and manage application templates in Portainer to standardize and accelerate deployments across your organization.

## Introduction

Following established best practices when managing Template Management in Portainer ensures operational consistency, security, and efficiency. This guide covers the most important practices learned from production deployments.

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
1. Go to **Stacks** > **Add Stack**
2. Select **Git Repository** as the deployment method
3. Configure your Git repository URL and branch
4. Enable **GitOps updates** for Git-based deployments

## Practice 3: Implement Least-Privilege Access

Map users and teams to Portainer's built-in roles with minimum required permissions:

```yaml
# Example Portainer role mapping
roles:
  "Read-Only User":
    - Read-only access to entitled resources
    - No deployments

  "Standard User":
    - Full control over resources deployed by the user or their team

  Operator:
    - Start, stop, update, and redeploy existing resources
    - Access logs and container console
    - Cannot create or delete resources

  "Environment Administrator":
    - Full access within assigned environments
    - Cannot change Portainer internal settings

  Administrator:
    - Full access to Portainer settings and all environments
```

## Practice 4: Use Environment Variables for Configuration

Never hardcode sensitive values in stack files:

```yaml
# GOOD: Use environment variables
services:
  app:
    image: my-app:latest
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - API_KEY=${API_KEY}
      - DATABASE_URL=${DATABASE_URL}
```

```yaml
# BAD: Hardcoded values
services:
  app:
    environment:
      - DB_PASSWORD=mysecretpassword  # Never do this
      - API_KEY=sk-1234567890         # Security risk
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

Always set resource limits to prevent noisy neighbor issues:

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

Configure log rotation for all services:

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
printf 'Date: %s\n' "$(date)"

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
    image: portainer/portainer-ee:lts
    command:
      - --http-disabled                    # Serve Portainer only on HTTPS
      - --sslcert=/certs/portainer.crt
      - --sslkey=/certs/portainer.key
      - --admin-password-file=/run/secrets/portainer-password
      - --hide-label=internal-only=true   # Hide internal containers
    secrets:
      - portainer-password
    volumes:
      - portainer-certs:/certs
```

## Practice 10: Document Everything

Maintain documentation for your Portainer setup:

- Environment purposes and owners
- Network topology diagrams
- Runbook for common operations
- Incident response procedures
- Change management process

## Conclusion

Following best practices for Template Management in Portainer ensures your container infrastructure remains secure, maintainable, and scalable. Start with the practices most critical to your organization and gradually implement the rest. Regular reviews and continuous improvement of your practices will help you avoid operational issues and maintain a high-quality containerized environment.
