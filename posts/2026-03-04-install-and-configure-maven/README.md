# How to Install and Configure Maven on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Maven, Java, Linux

Description: Learn how to install and Configure Maven on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Maven on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A Red Hat subscription or enabled RHEL repositories

## Overview

Installing and configuring Maven requires a supported Java Development Kit (JDK). This guide walks through installing Java and Maven, setting up Maven options, and verifying that Maven can run builds.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y java-17-openjdk-devel
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y maven
```

Verify the installation:

```bash
rpm -qi maven
mvn -v
```

## Step 3: Configure Maven

Create the Maven configuration directory and edit the user settings file:

```bash
mkdir -p ~/.m2
vi ~/.m2/settings.xml
```

Use the settings file for repository mirrors, proxies, credentials, and other user-specific Maven configuration. Start with the defaults and adjust based on your environment.

## Step 4: Configure Environment Variables

```bash
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")
echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bashrc
echo 'export MAVEN_OPTS="-Xms256m -Xmx512m"' >> ~/.bashrc
source ~/.bashrc
```

Maven is a command-line build tool, not a systemd service, so there is no service to start or enable.

## Step 5: Verify the Configuration

Test the setup:

```bash
mvn -v
mvn help:effective-settings
```

Create a simple Maven project if you want to confirm that Maven can resolve dependencies and run a build:

```bash
mvn -B archetype:generate \
  -DgroupId=com.example \
  -DartifactId=maven-test \
  -DarchetypeGroupId=org.apache.maven.archetypes \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DarchetypeVersion=1.5 \
  -DinteractiveMode=false
cd maven-test
mvn test
```

## Step 6: Configure Firewall Rules

Maven does not listen for inbound network connections, so firewall rules are usually not required. If your environment restricts outbound traffic, allow access to the Maven repositories or configure a repository mirror in `~/.m2/settings.xml`.

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
export MAVEN_OPTS="-Xms512m -Xmx1024m"
mvn -T 1C test
```

`MAVEN_OPTS` controls JVM options for Maven itself. The `-T` option enables parallel builds; use it only after confirming that your project and plugins are safe to run in parallel.

## Security Considerations

- Run Maven as a regular user instead of root
- Store repository credentials in `~/.m2/settings.xml` and protect the file permissions
- Use HTTPS repository URLs
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **`mvn: command not found`**: Confirm the package is installed with `rpm -qi maven` and that `/usr/bin` is in your `PATH`
2. **Java errors**: Verify the JDK with `java -version` and confirm `JAVA_HOME` points to the installed JDK
3. **Dependency download failures**: Check proxy and mirror settings in `~/.m2/settings.xml`

## Conclusion

You have successfully installed and configured Maven on RHEL. Keep Maven, Java, and your system packages updated to maintain security and performance.
