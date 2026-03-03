# How to Install and Switch Java Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, Development, Linux, System Administration

Description: Learn how to install multiple Java versions on Ubuntu, switch between them using update-alternatives, and configure JAVA_HOME for development environments.

---

Java version management on Ubuntu is a common challenge. Different projects may require different Java versions - a legacy application might need Java 8 or 11, while newer services target Java 17 or 21. Ubuntu makes it straightforward to install multiple versions and switch between them.

## Checking Current Java Installation

```bash
# Check if Java is installed and which version
java -version

# Check the compiler version
javac -version

# Find where Java is installed
which java
readlink -f $(which java)

# Show all installed Java versions
update-alternatives --list java
```

## Installing Java from Ubuntu Repositories

Ubuntu's repositories include OpenJDK packages for various versions:

```bash
# Update package list
sudo apt update

# Install the default JDK (usually the latest LTS available)
sudo apt install default-jdk

# Install a specific version
sudo apt install openjdk-8-jdk    # Java 8
sudo apt install openjdk-11-jdk   # Java 11 (LTS)
sudo apt install openjdk-17-jdk   # Java 17 (LTS)
sudo apt install openjdk-21-jdk   # Java 21 (LTS)

# Install JRE only (no compiler, smaller install)
sudo apt install openjdk-21-jre
```

### Check Available Java Packages

```bash
# See which OpenJDK versions are available
apt-cache search openjdk | grep -E "openjdk-[0-9]+-jdk\b"
```

## Installing from the Adoptium/Temurin Repository

For certified OpenJDK builds (formerly AdoptOpenJDK):

```bash
# Add the Adoptium GPG key
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | \
    sudo gpg --dearmor -o /usr/share/keyrings/adoptium.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] \
    https://packages.adoptium.net/artifactory/deb \
    $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | \
    sudo tee /etc/apt/sources.list.d/adoptium.list

# Update and install
sudo apt update
sudo apt install temurin-17-jdk   # Java 17
sudo apt install temurin-21-jdk   # Java 21
```

## Installing Oracle JDK

For Oracle JDK (requires accepting a license):

```bash
# Add Oracle PPA
sudo add-apt-repository ppa:linuxuprising/java
sudo apt update

# Install Oracle JDK 21
sudo apt install oracle-java21-installer

# Set Oracle JDK as default
sudo apt install oracle-java21-set-default
```

## Switching Between Java Versions

`update-alternatives` manages multiple versions of the same command:

```bash
# Configure the 'java' command to point to a different version
sudo update-alternatives --config java
```

This displays an interactive menu:

```text
There are 3 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                         Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      auto mode
  1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java   1111      manual mode
  2            /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711      manual mode
  3            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      manual mode

Press <enter> to keep the current choice[*], or type selection number: 2
```

Type the selection number and press Enter to switch.

Also switch the `javac` compiler:

```bash
sudo update-alternatives --config javac
```

### Non-Interactive Switching

For scripts or automated switching:

```bash
# Switch to Java 17 without interaction
sudo update-alternatives --set java /usr/lib/jvm/java-17-openjdk-amd64/bin/java
sudo update-alternatives --set javac /usr/lib/jvm/java-17-openjdk-amd64/bin/javac

# Verify
java -version
```

### Listing All Alternatives

```bash
# List all registered java alternatives
update-alternatives --list java

# Example output:
# /usr/lib/jvm/java-11-openjdk-amd64/bin/java
# /usr/lib/jvm/java-17-openjdk-amd64/bin/java
# /usr/lib/jvm/java-21-openjdk-amd64/bin/java
```

## Setting JAVA_HOME

Many Java applications and build tools (Maven, Gradle, Ant) require `JAVA_HOME` to be set. Find the correct path:

```bash
# Find the actual path of the current Java installation
readlink -f $(which java)
# Output: /usr/lib/jvm/java-21-openjdk-amd64/bin/java

# JAVA_HOME is the parent of the bin directory
# So: /usr/lib/jvm/java-21-openjdk-amd64
```

Add to `~/.bashrc` or `~/.profile`:

```bash
# ~/.bashrc

# Set JAVA_HOME to the current default Java
export JAVA_HOME=$(readlink -f /usr/bin/java | sed "s:bin/java::")
export PATH=$JAVA_HOME/bin:$PATH
```

This dynamic approach automatically updates when you switch Java versions with `update-alternatives`.

For a fixed version:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

Reload the configuration:

```bash
source ~/.bashrc

# Verify
echo $JAVA_HOME
java -version
```

## Per-Project Java Version Switching

### Using direnv

`direnv` automatically loads environment variables when you enter a directory:

```bash
# Install direnv
sudo apt install direnv

# Add hook to .bashrc
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
source ~/.bashrc
```

Create a `.envrc` in your project directory:

```bash
# /path/to/project/.envrc
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

```bash
# Allow the .envrc file
direnv allow /path/to/project

# Now entering the directory automatically sets JAVA_HOME to Java 11
cd /path/to/project
java -version  # shows Java 11

cd ~
java -version  # shows system default
```

### Using SDKMAN!

SDKMAN! is a dedicated Java version manager that supports multiple JVM distributions:

```bash
# Install SDKMAN!
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Check version
sdk version

# List available Java versions
sdk list java

# Install a specific version
sdk install java 21.0.2-tem    # Temurin 21
sdk install java 17.0.10-tem   # Temurin 17
sdk install java 11.0.22-tem   # Temurin 11

# Switch globally
sdk use java 17.0.10-tem

# Set as default
sdk default java 21.0.2-tem

# Show current version
sdk current java
```

SDKMAN! also manages Maven, Gradle, Groovy, Kotlin, and other JVM ecosystem tools.

## Verifying Installation

```bash
# Full version info
java -version
# openjdk version "21.0.2" 2024-01-16
# OpenJDK Runtime Environment (build 21.0.2+13-Ubuntu-1)
# OpenJDK 64-Bit Server VM (build 21.0.2+13-Ubuntu-1, mixed mode, sharing)

# Compiler version
javac -version

# Check JAVA_HOME
echo $JAVA_HOME
ls $JAVA_HOME/bin/java

# Run a quick test
cat > /tmp/Hello.java << 'EOF'
public class Hello {
    public static void main(String[] args) {
        System.out.println("Java " + System.getProperty("java.version") + " is working");
    }
}
EOF

cd /tmp
javac Hello.java
java Hello
# Output: Java 21.0.2 is working
```

## Removing Java Versions

```bash
# Remove a specific version
sudo apt remove openjdk-11-jdk

# Also remove configuration files
sudo apt purge openjdk-11-jdk

# Clean up unused dependencies
sudo apt autoremove

# After removal, update-alternatives may need cleanup
sudo update-alternatives --remove java /usr/lib/jvm/java-11-openjdk-amd64/bin/java
```

## Quick Reference

```bash
# Install
sudo apt install openjdk-21-jdk

# Switch versions interactively
sudo update-alternatives --config java

# Switch javac too
sudo update-alternatives --config javac

# Set JAVA_HOME dynamically
export JAVA_HOME=$(readlink -f /usr/bin/java | sed "s:bin/java::")

# Verify
java -version && echo $JAVA_HOME
```

The most common setup for development work is installing both a current LTS version (like Java 21) and whatever version your team's projects require, then using `update-alternatives` or SDKMAN! to switch as needed. SDKMAN! is the more flexible option if you need to switch frequently across projects.
