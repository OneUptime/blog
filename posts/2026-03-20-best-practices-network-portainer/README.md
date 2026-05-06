# Best Practices for Network Configuration in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Best Practice, Networking, Docker, Security

Description: Configure Docker and Kubernetes networks in Portainer following security and performance best practices.

## Introduction

Following established best practices when managing Network Configuration in Portainer ensures operational consistency, security, and efficiency. This guide covers the most important practices learned from production deployments.

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

Store stack and template configurations in Git:

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
2. Select **Git Repository** as the deployment method
3. Configure your Git repository URL and reference
4. Enable **GitOps updates** for automated deployments

## Practice 3: Implement Least-Privilege Access

In Portainer Business Edition, use teams and built-in roles to enforce minimum required permissions:

```yaml
# Example Portainer role model
Roles:
  read_only_user:
    - View entitled resources
    - No deployments or resource changes

  standard_user:
    - Full control over resources the user or team deploys
    - Suitable for application ownership in dev/staging
  
  operator:
    - Start, stop, update, and redeploy existing workloads
    - Cannot create or delete resources

  environment_administrator:
    - Full access within assigned environments
    - No global Portainer administration

  administrator:
    - Full access to Portainer settings and all environments
```

## Practice 4: Use Environment Variables for Configuration

Never hardcode configuration values in stack files, and use secrets for sensitive data:

```yaml
# GOOD: Use environment variables for config and secrets for credentials
services:
  app:
    image: my-app:latest
    environment:
      - APP_ENV=${APP_ENV}
      - LOG_LEVEL=${LOG_LEVEL}
      - DATABASE_HOST=${DATABASE_HOST}
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
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
      driver: local
      options:
        max-size: "100m"     # Rotate at 100MB
        max-file: "5"        # Keep 5 log files
```

## Practice 8: Regular Audits and Reviews

Schedule regular reviews of your Portainer setup:

```bash
#!/bin/bash
# audit.sh - Run monthly to review Docker resources on Portainer-managed hosts

printf '=== Portainer Audit Report ===\n'
printf 'Date: %s\n' "$(date)"

printf '\n--- Unused Volumes ---\n'
docker volume ls -qf dangling=true

printf '\n--- Stopped Containers ---\n'
docker ps -a --filter status=exited

printf '\n--- Dangling Images ---\n'
docker images -qf dangling=true

printf '\n--- Docker Disk Usage ---\n'
docker system df -v
```

## Practice 9: Secure the Portainer Instance Itself

Protect your Portainer management interface:

```yaml
# Portainer with security hardening
services:
  portainer:
    image: portainer/portainer-ee:sts
    restart: always
    ports:
      - "9443:9443"
    command:
      - --http-disabled
      - --sslcert=/certs/portainer.crt
      - --sslkey=/certs/portainer.key
      - --admin-password-file=/run/secrets/portainer-password
      - --hide-label=internal-only=true   # Hide labeled internal containers
    secrets:
      - portainer-password
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /path/to/your/certs:/certs:ro

secrets:
  portainer-password:
    file: ./secrets/portainer-password.txt

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

Following best practices for Network Configuration in Portainer ensures your container infrastructure remains secure, maintainable, and scalable. Start with the practices most critical to your organization and gradually implement the rest. Regular reviews and continuous improvement of your practices will help you avoid operational issues and maintain a high-quality containerized environment.
