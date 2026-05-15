# How to Configure Jenkins with Java 17 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, Java, JDK, Configuration, Linux

Description: Configure Jenkins to run with Java 17 on RHEL, including JDK installation, Jenkins configuration, and build tool setup.

---

Jenkins on RHEL can run with Java 17 on Jenkins releases that still support it. Current Jenkins releases may require Java 21 or newer, so confirm your Jenkins version's Java support policy before switching the controller JVM. This guide covers installing Java 17, configuring Jenkins to use it, and setting up JDK configurations for build jobs.

## Install Java 17

```bash
# Install OpenJDK 17 (JDK includes the compiler, JRE is runtime only)

sudo dnf install -y java-17-openjdk java-17-openjdk-devel

# Verify the installed version
java -version

# Check the JAVA_HOME path
dirname $(dirname $(readlink -f $(which java)))
```

## Handle Multiple Java Versions

If you have multiple Java versions installed, select the right one:

```bash
# List all available Java versions
sudo alternatives --config java

# Set Java 17 as the default
PKG_NAME=java-17-openjdk
JAVA_TO_SELECT=$(alternatives --display java | grep "family $PKG_NAME" | cut -d' ' -f1)
sudo alternatives --set java "$JAVA_TO_SELECT"

# Set javac too
JAVAC_TO_SELECT=$(alternatives --display javac | grep "family $PKG_NAME" | cut -d' ' -f1)
sudo alternatives --set javac "$JAVAC_TO_SELECT"

# Verify
java -version
javac -version
```

## Configure Jenkins to Use Java 17

```bash
# Create or edit the Jenkins systemd override
sudo systemctl edit jenkins

# Add the JAVA_HOME setting
# [Service]
# Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk"

# Or if you need to set specific Java options
# [Service]
# Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
# Environment="JAVA_OPTS=-Xmx2g -Xms512m -Djava.awt.headless=true"

# Restart Jenkins to apply changes
sudo systemctl restart jenkins

# Check Jenkins restarted successfully
sudo systemctl status jenkins

# Verify the Java executable used by the running Jenkins process
sudo readlink -f /proc/$(systemctl show -p MainPID --value jenkins)/exe
```

## Configure JDK in Jenkins Web UI

To use Java 17 for build jobs:

1. Navigate to Manage Jenkins > Tools
2. Under JDK installations, click Add JDK
3. Uncheck "Install automatically"
4. Set Name to "JDK 17"
5. Set JAVA_HOME to `/usr/lib/jvm/java-17-openjdk`

## Configure Maven with Java 17

```bash
# Install Maven
sudo dnf install -y maven

# Verify Maven uses Java 17
mvn --version
```

Add Maven to Jenkins Tools configuration:

1. Navigate to Manage Jenkins > Tools
2. Under Maven installations, click Add Maven
3. Set Name to "Maven 3"
4. Set MAVEN_HOME to `/usr/share/maven`

## Create a Test Pipeline

```groovy
// Jenkinsfile - Test pipeline using Java 17
pipeline {
    agent any

    tools {
        jdk 'JDK 17'
        maven 'Maven 3'
    }

    stages {
        stage('Verify Java') {
            steps {
                // Confirm Java version in the pipeline
                sh 'java -version'
                sh 'javac -version'
                sh 'echo $JAVA_HOME'
            }
        }

        stage('Build') {
            steps {
                // Run a Maven build
                sh 'mvn --version'
            }
        }
    }
}
```

## Troubleshooting

```bash
# Check which Java Jenkins is actually using
sudo -u jenkins java -version

# Check the Jenkins process for Java flags
ps aux | grep jenkins

# If Jenkins fails to start, check the logs
sudo journalctl -u jenkins --no-pager -n 50
```

With Java 17 properly configured, Jenkins runs efficiently on supported Jenkins releases and your build jobs can take advantage of Java 17 features and performance improvements.
