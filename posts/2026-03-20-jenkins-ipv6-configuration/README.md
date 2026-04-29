# How to Configure Jenkins to Run on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Jenkins, CI/CD, Java, Networking, DevOps

Description: Configure Jenkins to listen on IPv6 addresses, enable IPv6 agent communication, and test IPv6 connectivity within Jenkins pipeline jobs.

## Introduction

Jenkins is written in Java, which provides native IPv6 support through the JVM. Configuring Jenkins for IPv6 requires setting the appropriate JVM network flags, configuring the listener address, and ensuring agents can communicate over IPv6.

## Step 1: Configure Jenkins to Listen on IPv6

Jenkins by default listens on all interfaces. To explicitly bind to an IPv6 address:

```bash
# For Jenkins installed as a systemd service

# Edit the Jenkins service configuration
sudo systemctl edit jenkins

# Add the following override:
[Service]
Environment="JAVA_OPTS=-Djava.net.preferIPv6Addresses=true -Djava.net.preferIPv4Stack=false"
Environment="JENKINS_OPTS=--httpListenAddress=:: --httpPort=8080"
```

On older SysV-init-based Linux packages, set the equivalent JVM and Jenkins launcher arguments in the package environment file instead of a `systemd` drop-in.

Restart Jenkins:
```bash
sudo systemctl restart jenkins
```

Also set the Jenkins URL in **Manage Jenkins** -> **System** to an IPv6-reachable URL. The listener address only changes what Jenkins binds to; it does not change the URL Jenkins advertises to agents and users.

## Step 2: Verify Jenkins Is Listening on IPv6

```bash
# Check that Jenkins is listening on IPv6
ss -6 -l -n | grep 8080
# Expected: a LISTEN socket on [::]:8080 or :::8080

# Or with netstat
netstat -tlnp | grep 8080
# Expected: a tcp6 LISTEN entry on :::8080

# Test access via IPv6
curl -6 http://[::1]:8080/login
# Or from a remote host:
curl -6 http://[2001:db8:1:1::10]:8080/login
```

## Step 3: Configure Jenkins Agent Communication via IPv6

Inbound Jenkins agents (formerly called JNLP agents) connect to the controller using Jenkins Remoting, either over the dedicated TCP agent port or over WebSocket. To verify an IPv6-capable agent works, target it by label in Pipeline:

```groovy
// Jenkinsfile - Run the job on an IPv6-capable agent
pipeline {
    agent {
        label 'ipv6-agent'
    }
    stages {
        stage('Test IPv6') {
            steps {
                sh 'curl -6 https://ifconfig.me/ip'
                sh 'ping -6 -c 3 2606:4700:4700::1111'
            }
        }
    }
}
```

For agent configuration, add JVM arguments when launching the agent:

```bash
# Launch Jenkins agent with IPv6 preference
java \
    -Djava.net.preferIPv6Addresses=true \
    -Djava.net.preferIPv4Stack=false \
    -jar agent.jar \
    -url http://[2001:db8::10]:8080 \
    -secret <agent-secret> \
    -name ipv6-agent \
    -webSocket
```

When you use `-webSocket`, the agent connects over the Jenkins HTTP(S) port instead of the dedicated inbound TCP agent port.

## Step 4: Dockerized Jenkins with IPv6

For containerized Jenkins, ensure the Docker network has IPv6 enabled. Docker bridge-network IPv6 support is available on Linux hosts:

```yaml
# compose.yaml - Jenkins with IPv6 support
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk21
    container_name: jenkins
    environment:
      # Enable IPv6 in the JVM
      JAVA_OPTS: "-Djava.net.preferIPv6Addresses=true -Djava.net.preferIPv4Stack=false"
      JENKINS_OPTS: "--httpListenAddress=:: --httpPort=8080"
    ports:
      - "[::]:8080:8080"
      - "[::]:50000:50000"
    networks:
      - jenkins-net

networks:
  jenkins-net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "2001:db8:1::/64"
```

## Step 5: Test IPv6 in a Jenkins Pipeline

```groovy
// Jenkinsfile - IPv6 connectivity test pipeline
pipeline {
    agent any

    stages {
        stage('IPv6 Connectivity Check') {
            steps {
                script {
                    // Check if the agent has a global IPv6 address
                    def ipv6_addrs = sh(
                        script: "ip -6 addr show scope global | grep inet6 | awk '{print \$2}'",
                        returnStdout: true
                    ).trim()
                    echo "IPv6 addresses: ${ipv6_addrs}"
                    assert ipv6_addrs != "" : "No global IPv6 address found on agent"
                }
            }
        }

        stage('IPv6 DNS Test') {
            steps {
                sh '''
                    # Test IPv6 DNS resolution
                    dig AAAA example.com +short
                    nslookup -type=AAAA google.com
                '''
            }
        }

        stage('Build with IPv6 Dependencies') {
            steps {
                sh '''
                    # Fetch dependencies over IPv6 if available
                    curl -6 -O https://example.com/dependency.tar.gz || \
                    curl -4 -O https://example.com/dependency.tar.gz
                '''
            }
        }
    }
}
```

## Troubleshooting Jenkins IPv6

```bash
# If Jenkins fails to start with IPv6, check JVM IPv6 support
java -version
# Ensure the controller and agents use a Java version supported by your Jenkins release

# Check if IPv6 is available on the system
sysctl net.ipv6.conf.all.disable_ipv6
# Must be 0 (IPv6 enabled)

# Test JVM IPv6 directly
java -Djava.net.preferIPv6Addresses=true \
     -cp . TestIPv6
```

## Conclusion

Jenkins runs on Java, which natively supports IPv6 through JVM flags. Setting `-Djava.net.preferIPv6Addresses=true` and configuring the listener address to `::` lets Jenkins bind on IPv6-capable systems. Agents follow the same pattern - launch with IPv6 JVM flags and connect to the controller's IPv6-reachable URL. Dockerized Jenkins requires IPv6-enabled Docker networks to function correctly in dual-stack or IPv6-only environments.
