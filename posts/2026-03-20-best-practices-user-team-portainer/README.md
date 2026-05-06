# Best Practices for User and Team Management in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Best Practice, Security, RBAC, Team

Description: Implement effective user and team management in Portainer with proper role-based access control and permission structures.

## Introduction

Following established best practices when managing User and Team Management in Portainer ensures operational consistency, security, and efficiency. This guide covers the most important practices learned from production deployments.

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
2. Select **Git repository** as the deployment method
3. Configure your repository URL, reference, and Compose path
4. Enable **GitOps updates** for automated update workflows

## Practice 3: Implement Least-Privilege Access

In Portainer Business Edition, design access control with minimum required permissions:

```yaml
# Portainer built-in roles for Docker and Swarm environments
Roles:
  "Read-only User":
    - Read-only access to entitled resources
  
  "Standard User":
    - Full control over resources the user or team owns
  
  Operator:
    - Update, redeploy, start, and stop existing resources
    - View logs and open container consoles
    - Cannot create or delete resources
  
  "Environment Administrator":
    - Full access within assigned environments
    - Cannot manage Portainer settings or host infrastructure

  Administrator:
    - Full access across Portainer
    - User, team, and environment management
```

## Practice 4: Use Environment Variables for Configuration

Use environment variables for regular configuration, and use Docker secrets for sensitive values:

```yaml
# GOOD: Use environment variables for non-secret configuration
services:
  app:
    image: my-app:latest
    environment:
      - APP_ENV=${APP_ENV}
      - LOG_LEVEL=${LOG_LEVEL}
      - DB_HOST=${DB_HOST}
```

For passwords, API keys, and certificates, prefer Docker secrets over plain environment variables where your deployment target supports them.

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
      driver: local
      options:
        max-size: "100m"     # Rotate at 100MB
        max-file: "5"        # Keep 5 log files
        compress: "true"
```

## Practice 8: Regular Audits and Reviews

Schedule regular reviews of your Portainer setup:

```bash
#!/bin/bash
# audit.sh - Run monthly to review Portainer configurations

printf '%s\n' "=== Portainer Audit Report ==="
printf 'Date: %s\n' "$(date -u)"

printf '\n--- Unused Volumes ---\n'
docker volume ls -qf dangling=true

printf '\n--- Stopped Containers ---\n'
docker ps -a --filter status=exited

printf '\n--- Dangling Images ---\n'
docker images -qf dangling=true

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
      - --admin-password-file=/run/secrets/portainer-password  # First startup only
      - --hide-label=internal-only=true   # Hide internal containers
    ports:
      - "9443:9443"
      - "8000:8000"
    secrets:
      - portainer-password
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - ./certs:/certs:ro

secrets:
  portainer-password:
    file: ./portainer-password.txt

volumes:
  portainer_data:
```

## Practice 10: Document Everything

Maintain documentation for your Portainer setup:

- Environment purposes and owners
- Network topology diagrams
- Runbook for common operations
- Incident response procedures
- Change management process

## Conclusion

Following best practices for User and Team Management in Portainer ensures your container infrastructure remains secure, maintainable, and scalable. Start with the practices most critical to your organization and gradually implement the rest. Regular reviews and continuous improvement of your practices will help you avoid operational issues and maintain a high-quality containerized environment.
