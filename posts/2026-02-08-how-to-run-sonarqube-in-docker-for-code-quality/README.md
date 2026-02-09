# How to Run SonarQube in Docker for Code Quality

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, SonarQube, Code Quality, Static Analysis, DevOps, CI/CD, Docker Compose

Description: Deploy SonarQube in Docker for automated code quality analysis, security scanning, and technical debt tracking

---

SonarQube is a platform for continuous inspection of code quality. It detects bugs, code smells, security vulnerabilities, and technical debt across 30+ programming languages. Running SonarQube in Docker simplifies setup significantly. Instead of installing Java, configuring a database, and managing the Elasticsearch index manually, you pull an image and configure a few environment variables.

This guide covers deploying SonarQube in Docker, integrating it with CI/CD pipelines, scanning projects, and configuring quality gates.

## Prerequisites

SonarQube runs Elasticsearch internally, which requires a specific kernel parameter on Linux hosts:

```bash
# Required on Linux: increase virtual memory limit for Elasticsearch
sudo sysctl -w vm.max_map_count=524288

# Make it persistent across reboots
echo "vm.max_map_count=524288" | sudo tee -a /etc/sysctl.conf
```

On macOS with Docker Desktop, this setting is handled automatically.

## Quick Start

Run SonarQube Community Edition with the embedded H2 database (suitable for evaluation only):

```bash
# Start SonarQube for quick evaluation
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  sonarqube:10.7-community
```

Open http://localhost:9000 after about a minute. The default credentials are admin/admin. SonarQube will prompt you to change the password on first login.

## Production Setup with PostgreSQL

For production use, connect SonarQube to PostgreSQL. The embedded H2 database does not support upgrades:

```yaml
# docker-compose.yml - SonarQube with PostgreSQL
version: "3.8"

services:
  sonarqube:
    image: sonarqube:10.7-community
    container_name: sonarqube
    ports:
      - "9000:9000"
    environment:
      # Database connection
      - SONAR_JDBC_URL=jdbc:postgresql://postgres:5432/sonarqube
      - SONAR_JDBC_USERNAME=sonar
      - SONAR_JDBC_PASSWORD=sonar_password
      # JVM memory settings
      - SONAR_WEB_JAVAOPTS=-Xmx512m -Xms128m
      - SONAR_CE_JAVAOPTS=-Xmx512m -Xms128m
      - SONAR_SEARCH_JAVAOPTS=-Xmx512m -Xms512m
    volumes:
      - sonarqube-data:/opt/sonarqube/data
      - sonarqube-logs:/opt/sonarqube/logs
      - sonarqube-extensions:/opt/sonarqube/extensions
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    ulimits:
      nofile:
        soft: 131072
        hard: 131072

  postgres:
    image: postgres:16-alpine
    container_name: sonarqube-db
    environment:
      POSTGRES_DB: sonarqube
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "sonar", "-d", "sonarqube"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  sonarqube-data:
  sonarqube-logs:
  sonarqube-extensions:
  postgres-data:
```

Start it:

```bash
# Launch SonarQube with PostgreSQL
docker compose up -d

# Monitor startup - wait for "SonarQube is operational"
docker compose logs -f sonarqube
```

## Scanning Your First Project

After SonarQube is running, scan a project using the SonarScanner. The easiest method uses the Docker-based scanner:

```bash
# Scan a local project using the SonarScanner Docker image
docker run --rm \
  --network host \
  -v $(pwd):/usr/src \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=your_project_token \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=my-project \
  -Dsonar.sources=src \
  -Dsonar.language=java
```

Generate the project token from the SonarQube web interface: go to your user profile, then Security, and create a new token.

## Scanning Different Languages

SonarQube handles many languages. Here are examples for common ones.

Scan a JavaScript/TypeScript project:

```bash
# Scan a Node.js project with test coverage
docker run --rm \
  --network host \
  -v $(pwd):/usr/src \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=your_token \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=my-node-app \
  -Dsonar.sources=src \
  -Dsonar.tests=tests \
  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
```

Scan a Python project:

```bash
# Scan a Python project with coverage report
docker run --rm \
  --network host \
  -v $(pwd):/usr/src \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=your_token \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=my-python-app \
  -Dsonar.sources=. \
  -Dsonar.exclusions=**/tests/**,**/venv/** \
  -Dsonar.python.coverage.reportPaths=coverage.xml
```

## CI/CD Integration

Integrate SonarQube scanning into your CI pipeline. Here is an example for GitHub Actions:

```yaml
# .github/workflows/sonar.yml - SonarQube analysis in GitHub Actions
name: SonarQube Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history needed for blame data

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@v3
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: Quality Gate Check
        uses: sonarsource/sonarqube-quality-gate-action@v1
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Configuring Quality Gates

Quality Gates define the conditions code must meet before it passes. Create a custom quality gate through the SonarQube API:

```bash
# Create a custom quality gate
curl -u admin:newpassword -X POST \
  "http://localhost:9000/api/qualitygates/create?name=Strict"

# Add conditions to the quality gate
# Fail if coverage is below 80%
curl -u admin:newpassword -X POST \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=Strict&metric=coverage&op=LT&error=80"

# Fail if there are any critical bugs
curl -u admin:newpassword -X POST \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=Strict&metric=bugs&op=GT&error=0"
```

## Installing Plugins

SonarQube supports plugins for additional languages and features. Install them by placing the JAR files in the extensions directory:

```bash
# Download and install a plugin
docker exec sonarqube mkdir -p /opt/sonarqube/extensions/plugins

# Example: install the community branch plugin
docker exec sonarqube wget -O /opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin.jar \
  https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/1.19.0/sonarqube-community-branch-plugin-1.19.0.jar

# Restart SonarQube to load the plugin
docker compose restart sonarqube
```

## Backup

Back up SonarQube data regularly:

```bash
# Backup the PostgreSQL database
docker exec sonarqube-db pg_dump -U sonar sonarqube > sonarqube-backup.sql

# Backup the SonarQube data volume
docker run --rm -v sonarqube-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/sonarqube-data.tar.gz /data
```

## Monitoring SonarQube

Check system health and resource usage:

```bash
# Check SonarQube system health
curl -u admin:password http://localhost:9000/api/system/health

# Check system status
curl -u admin:password http://localhost:9000/api/system/status

# View current analysis queue
curl -u admin:password http://localhost:9000/api/ce/activity?status=PENDING,IN_PROGRESS
```

## Conclusion

SonarQube in Docker brings automated code quality analysis to any development team. The PostgreSQL-backed setup is production-ready and handles projects of all sizes. Integrate it into your CI/CD pipeline to catch bugs, security vulnerabilities, and code smells before they reach production. Quality Gates enforce minimum standards, and the web dashboard gives leadership visibility into technical debt. Start with the Community Edition, scan your most important projects first, and gradually expand coverage as your team builds the habit of checking SonarQube results as part of the code review process.
