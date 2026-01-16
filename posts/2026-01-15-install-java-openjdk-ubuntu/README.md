# How to Install Java (OpenJDK) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Java, OpenJDK, JDK, Development, Tutorial

Description: A complete guide to installing OpenJDK on Ubuntu, managing multiple Java versions, and configuring JAVA_HOME for development.

---

Java powers countless enterprise applications, Android development tools, and build systems like Maven and Gradle. This guide covers installing OpenJDK (the open-source Java implementation) on Ubuntu, managing multiple versions, and setting up your environment correctly.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Terminal access

## Check Existing Java Installation

Before installing, check if Java is already installed:

```bash
# Check if Java is installed and which version
java -version

# Check if Java compiler is installed
javac -version
```

## Installing OpenJDK

### Method 1: Install Default JDK

Ubuntu's default repositories include OpenJDK:

```bash
# Update package lists
sudo apt update

# Install the default JDK (includes JRE)
sudo apt install default-jdk -y

# Verify installation
java -version
javac -version
```

### Method 2: Install Specific Version

To install a specific OpenJDK version:

```bash
# List available OpenJDK packages
apt search openjdk | grep -E "openjdk-[0-9]+-jdk "
```

Install your desired version:

```bash
# Install OpenJDK 21 (latest LTS as of 2024)
sudo apt install openjdk-21-jdk -y

# Install OpenJDK 17 (previous LTS)
sudo apt install openjdk-17-jdk -y

# Install OpenJDK 11 (older LTS, still widely used)
sudo apt install openjdk-11-jdk -y

# Install OpenJDK 8 (legacy, for older applications)
sudo apt install openjdk-8-jdk -y
```

### JDK vs JRE

- **JDK (Java Development Kit)**: Full development environment with compiler, debugger, and tools
- **JRE (Java Runtime Environment)**: Only runtime, for running Java applications

```bash
# Install only the JRE (smaller, no development tools)
sudo apt install openjdk-21-jre -y
```

## Managing Multiple Java Versions

Ubuntu's `update-alternatives` system manages multiple Java installations.

### List Installed Versions

```bash
# List all installed Java versions
update-alternatives --list java

# List all Java compiler versions
update-alternatives --list javac
```

### Switch Between Versions

Use the interactive selector:

```bash
# Select default Java version interactively
sudo update-alternatives --config java
```

Output example:
```
There are 3 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                            Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-21-openjdk-amd64/bin/java      2111      auto mode
  1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java      1111      manual mode
  2            /usr/lib/jvm/java-17-openjdk-amd64/bin/java      1711      manual mode
  3            /usr/lib/jvm/java-21-openjdk-amd64/bin/java      2111      manual mode

Press <enter> to keep the current choice[*], or type selection number:
```

Enter the number of your desired version.

### Switch Java Compiler

```bash
# Select default javac version
sudo update-alternatives --config javac
```

**Tip**: Keep Java and javac versions matched to avoid compilation issues.

## Setting JAVA_HOME

Many applications require the `JAVA_HOME` environment variable.

### Find Java Installation Path

```bash
# Find the path of current Java installation
update-alternatives --display java

# Or use readlink to resolve symlinks
readlink -f $(which java) | sed 's|/bin/java||'
```

### Set JAVA_HOME Permanently

Add to your shell profile for persistent configuration:

```bash
# Add JAVA_HOME to ~/.bashrc
echo 'export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))' >> ~/.bashrc

# Or set a specific version explicitly
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc

# Also add to PATH
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc

# Reload the profile
source ~/.bashrc
```

### Verify JAVA_HOME

```bash
# Check JAVA_HOME is set correctly
echo $JAVA_HOME

# Verify it points to the right location
ls $JAVA_HOME
```

### System-Wide JAVA_HOME

For all users, create a system profile file:

```bash
# Create system-wide Java environment configuration
sudo nano /etc/profile.d/java.sh
```

Add:

```bash
#!/bin/bash
# System-wide Java environment variables
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

Make it executable:

```bash
# Make the script executable
sudo chmod +x /etc/profile.d/java.sh
```

## Verify Installation

Run these commands to confirm everything works:

```bash
# Check Java version
java -version

# Check compiler version
javac -version

# Check JAVA_HOME
echo $JAVA_HOME

# Test Java execution
java -XshowSettings:all 2>&1 | head -20
```

### Create a Test Program

Create a simple Java program to test the compiler:

```bash
# Create a test Java file
cat > HelloWorld.java << 'EOF'
// Simple Java test program
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Java is working!");
        System.out.println("Java Version: " + System.getProperty("java.version"));
        System.out.println("Java Home: " + System.getProperty("java.home"));
    }
}
EOF

# Compile the program
javac HelloWorld.java

# Run the compiled program
java HelloWorld

# Clean up
rm HelloWorld.java HelloWorld.class
```

## Installing Oracle JDK (Alternative)

If you specifically need Oracle's JDK:

### Method 1: Manual Download

1. Download from [Oracle's website](https://www.oracle.com/java/technologies/downloads/)
2. Extract and install:

```bash
# Extract downloaded archive to /usr/lib/jvm
sudo mkdir -p /usr/lib/jvm
sudo tar -xzf jdk-21_linux-x64_bin.tar.gz -C /usr/lib/jvm

# Set up alternatives
sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/jdk-21/bin/java 1
sudo update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/jdk-21/bin/javac 1
```

### Method 2: Using SDKMAN

SDKMAN is excellent for managing multiple JDK distributions:

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash

# Open new terminal or source SDKMAN
source "$HOME/.sdkman/bin/sdkman-init.sh"

# List available Java versions
sdk list java

# Install specific versions
sdk install java 21.0.1-oracle
sdk install java 21.0.1-tem  # Temurin (Eclipse Adoptium)
sdk install java 21.0.1-graalce  # GraalVM CE

# Switch between versions
sdk use java 21.0.1-tem
sdk default java 21.0.1-tem
```

## Common Use Cases

### For Maven Projects

Maven uses JAVA_HOME automatically:

```bash
# Install Maven
sudo apt install maven -y

# Verify Maven sees Java correctly
mvn -version
```

### For Gradle Projects

```bash
# Install Gradle (or use wrapper)
sudo apt install gradle -y

# Check Gradle configuration
gradle -version
```

### For Android Development

Android Studio requires JDK 17 or later:

```bash
# Install JDK 17 for Android development
sudo apt install openjdk-17-jdk -y

# Android Studio will auto-detect or you can configure in settings
```

## Uninstalling Java

To remove a specific Java version:

```bash
# Remove OpenJDK 11
sudo apt remove openjdk-11-jdk -y

# Remove all OpenJDK packages
sudo apt remove 'openjdk-*' -y

# Clean up
sudo apt autoremove -y
```

## Troubleshooting

### "java: command not found"

```bash
# Reinstall default JDK
sudo apt update
sudo apt install default-jdk -y
```

### Wrong Java Version Running

```bash
# Check what's providing java command
which java
ls -la $(which java)

# Reconfigure alternatives
sudo update-alternatives --config java
```

### JAVA_HOME Not Recognized

```bash
# Verify profile is loaded
source ~/.bashrc

# Check if variable is exported
export | grep JAVA_HOME
```

### Permission Denied Errors

```bash
# Check Java binary permissions
ls -la $JAVA_HOME/bin/java

# Fix if needed (shouldn't normally be required)
sudo chmod +x $JAVA_HOME/bin/java
```

---

With OpenJDK installed and JAVA_HOME configured, you're ready to develop Java applications, run build tools like Maven and Gradle, or work with Java-based platforms like Elasticsearch and Kafka. For development flexibility, consider using SDKMAN to easily switch between different JDK distributions and versions.
