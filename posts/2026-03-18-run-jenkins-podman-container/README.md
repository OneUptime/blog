# How to Run Jenkins in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Jenkins, CI/CD, Automation

Description: Learn how to run Jenkins in a Podman container with persistent workspace data, plugin management, and pipeline configuration.

---

> Jenkins in Podman provides a fully-featured CI/CD server that can run in a rootless container with persistent jobs, plugins, and build history.

Jenkins is the most widely adopted open-source automation server, powering CI/CD pipelines for teams of all sizes. Running it in a Podman container gives you a portable, isolated Jenkins instance that is easy to back up, upgrade, and replicate. This guide walks through setup, persistence, initial configuration, and plugin management.

---

## Pulling the Jenkins Image

Download the official Jenkins LTS image.

```bash
# Pull the Jenkins LTS image

podman pull docker.io/jenkins/jenkins:lts

# Verify the image
podman images | grep jenkins
```

## Running a Basic Jenkins Container

Start Jenkins with the default setup wizard.

```bash
# Run Jenkins in detached mode
podman run -d \
  --name my-jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  docker.io/jenkins/jenkins:lts

# Check the container is running
podman ps

# Retrieve the initial admin password for the setup wizard
podman exec my-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Persistent Jenkins Data

Use a named volume to preserve jobs, plugins, and configuration.

```bash
# Create a volume for Jenkins home directory
podman volume create jenkins-data

# Run Jenkins with persistent storage
podman run -d \
  --name jenkins-persistent \
  -p 8081:8080 \
  -p 50001:50000 \
  -v jenkins-data:/var/jenkins_home:Z \
  docker.io/jenkins/jenkins:lts

# Verify the volume
podman volume inspect jenkins-data
```

## Skipping the Setup Wizard

Pre-configure Jenkins to skip the manual setup wizard.

```bash
# Run Jenkins with the setup wizard disabled
podman run -d \
  --name jenkins-auto \
  -p 8082:8080 \
  -e JAVA_OPTS="-Djenkins.install.runSetupWizard=false" \
  -v jenkins-data:/var/jenkins_home:Z \
  docker.io/jenkins/jenkins:lts

# Wait for Jenkins to start
sleep 30

# Verify Jenkins is running and accessible
curl -s http://localhost:8082/api/json | python3 -m json.tool | head -10
```

## Installing Plugins at Startup

Pre-install Jenkins plugins using the Jenkins plugin CLI.

```bash
# Create a plugins list file
mkdir -p ~/jenkins-config

cat > ~/jenkins-config/plugins.txt <<'EOF'
git
pipeline-stage-view
docker-workflow
blueocean
credentials
workflow-aggregator
github
slack
configuration-as-code
EOF

# Build a custom Jenkins image with pre-installed plugins
cat > ~/jenkins-config/Containerfile <<'EOF'
FROM docker.io/jenkins/jenkins:lts

# Skip the setup wizard
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

# Install plugins
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
EOF

# Build the custom image
podman build -t jenkins-custom -f ~/jenkins-config/Containerfile ~/jenkins-config

# Run the custom Jenkins image
podman run -d \
  --name jenkins-plugins \
  -p 8083:8080 \
  -v jenkins-data:/var/jenkins_home:Z \
  jenkins-custom
```

## Configuring Jenkins with JCasC

Use Jenkins Configuration as Code for automated setup.

```bash
# Create a JCasC configuration file
cat > ~/jenkins-config/jenkins.yaml <<'EOF'
jenkins:
  systemMessage: "Jenkins configured via JCasC on Podman"
  numExecutors: 4
  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: "admin"
          password: "admin-secret"
  authorizationStrategy:
    loggedInUsersCanDoAnything:
      allowAnonymousRead: false

unclassified:
  location:
    url: http://localhost:8084
EOF

# Run Jenkins with JCasC configuration
podman run -d \
  --name jenkins-jcasc \
  -p 8084:8080 \
  -e JAVA_OPTS="-Djenkins.install.runSetupWizard=false" \
  -e CASC_JENKINS_CONFIG=/tmp/jenkins.yaml \
  -v ~/jenkins-config/jenkins.yaml:/tmp/jenkins.yaml:Z \
  -v jenkins-data:/var/jenkins_home:Z \
  jenkins-custom
```

## Running Jenkins with Resource Limits

Constrain Jenkins memory and CPU usage.

```bash
# Run Jenkins with resource limits
podman run -d \
  --name jenkins-limited \
  -p 8085:8080 \
  --memory 2g \
  --cpus 2.0 \
  -e JAVA_OPTS="-Xms512m -Xmx1g -Djenkins.install.runSetupWizard=false" \
  -v jenkins-data:/var/jenkins_home:Z \
  docker.io/jenkins/jenkins:lts
```

## Managing the Container

Common Jenkins management operations.

```bash
# View Jenkins logs
podman logs my-jenkins

# Safely restart Jenkins via the API after creating an API token
JENKINS_USER=admin
JENKINS_API_TOKEN=your-api-token
curl -X POST --user "$JENKINS_USER:$JENKINS_API_TOKEN" http://localhost:8080/safeRestart

# Check Jenkins system info
curl -s --user "$JENKINS_USER:$JENKINS_API_TOKEN" http://localhost:8080/api/json | python3 -m json.tool | head -15

# Stop and start
podman stop my-jenkins
podman start my-jenkins

# Remove containers and volumes
podman rm -f my-jenkins jenkins-persistent jenkins-auto jenkins-plugins jenkins-jcasc jenkins-limited
podman volume rm jenkins-data
```

## Summary

Running Jenkins in a Podman container provides a portable CI/CD server with straightforward configuration and management. Named volumes preserve your jobs, build history, and plugins across container restarts. Pre-installing plugins and using Jenkins Configuration as Code eliminates manual setup steps, making your Jenkins instance fully reproducible. Resource limits keep Jenkins from consuming excessive host resources, and Podman's rootless execution mode adds a security boundary around your automation server.
