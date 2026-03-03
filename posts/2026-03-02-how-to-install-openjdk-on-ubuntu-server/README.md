# How to Install OpenJDK on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, OpenJDK, JVM, Server

Description: Install OpenJDK on Ubuntu Server using apt, configure the Java environment, and understand the differences between JDK versions and distributions.

---

OpenJDK is the open-source reference implementation of Java. On Ubuntu Server, it's available through the default package repositories, making installation a straightforward `apt` command. This guide covers installing different JDK versions, choosing between distributions, and configuring the environment properly.

## Understanding OpenJDK Versions

Java releases on a 6-month cadence. Long-Term Support (LTS) releases get extended maintenance periods and are what you should run in production:

- **Java 21** - Current LTS (released September 2023)
- **Java 17** - Previous LTS, still widely supported
- **Java 11** - Older LTS, many legacy applications
- **Java 8** - Very old LTS, still in use for old codebases

For new projects, use Java 21. For existing projects, use whatever the application requires.

## Installing from Ubuntu Repositories

Ubuntu's main repository includes OpenJDK packages:

```bash
# Update package lists
sudo apt update

# Install the default JDK (typically the latest LTS version)
sudo apt install default-jdk

# Install a specific version
sudo apt install openjdk-21-jdk    # Java 21 LTS
sudo apt install openjdk-17-jdk    # Java 17 LTS
sudo apt install openjdk-11-jdk    # Java 11 LTS
sudo apt install openjdk-8-jdk     # Java 8 (if available)
```

### JDK vs JRE

Each OpenJDK release comes in two packages:

- `openjdk-XX-jdk` - Full Development Kit: compiler (`javac`), debugger, profiling tools, JRE
- `openjdk-XX-jre` - Runtime Environment only: just the JVM for running .jar files

On servers that only run Java applications (not compile them), the JRE is sufficient and smaller. On development or build machines, install the JDK.

```bash
# Install JRE only for a production server
sudo apt install openjdk-21-jre

# Headless JRE - no GUI components, smallest footprint
sudo apt install openjdk-21-jre-headless
```

The headless variant is the right choice for servers - it excludes audio, display, and GUI libraries that would never be used.

## Verifying the Installation

```bash
# Check Java version
java -version

# Check compiler version (JDK only)
javac -version

# Show all installed Java packages
dpkg -l | grep openjdk

# Find the Java installation directory
which java
ls -la $(which java)
readlink -f $(which java)
```

The `readlink -f` command follows symlinks to show the actual binary location, which is useful when you need the exact path for configuration.

## Installing from the Adoptium Repository (Eclipse Temurin)

For newer versions not yet in Ubuntu's repos, or for specific distributions like Eclipse Temurin (formerly AdoptOpenJDK):

```bash
# Install the Adoptium GPG key
wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo tee /etc/apt/keyrings/adoptium.asc

# Add the repository
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list

# Update and install
sudo apt update
sudo apt install temurin-21-jdk
sudo apt install temurin-17-jdk
```

Eclipse Temurin is a production-ready distribution with rigorous testing and long-term support commitments. It's a popular choice for enterprise deployments.

## Setting Up the Java Environment

### Setting JAVA_HOME

Many Java applications and tools (Maven, Gradle, Tomcat) rely on the `JAVA_HOME` environment variable. Set it system-wide:

```bash
# Find the actual Java installation path
sudo update-alternatives --list java

# You'll see output like:
# /usr/lib/jvm/java-21-openjdk-amd64/bin/java
# /usr/lib/jvm/java-17-openjdk-amd64/bin/java
```

Set `JAVA_HOME` in `/etc/environment` for all users:

```bash
sudo nano /etc/environment
```

Add:

```text
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
```

Reload:

```bash
source /etc/environment
echo $JAVA_HOME
```

Or for a per-user setting in `~/.bashrc`:

```bash
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

## Configuring Multiple Java Versions with update-alternatives

When multiple JDK versions are installed, `update-alternatives` manages which one is the default:

```bash
# See all registered java alternatives
sudo update-alternatives --list java
sudo update-alternatives --list javac

# Interactively select the default
sudo update-alternatives --config java
```

The interactive mode shows a numbered menu:

```text
There are 3 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                            Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      auto mode
  1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java   1111      manual mode
  2            /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711      manual mode
  3            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      manual mode

Press <enter> to keep the current choice[*], or type selection number:
```

Type the number to switch. This changes the system-wide default.

## Configuring JVM Memory Settings

For servers running Java applications, you often need to tune JVM memory:

```bash
# Set JVM heap size for a Java application
java -Xms512m -Xmx2g -jar myapp.jar

# For containers, use percentage-based settings (Java 11+)
java -XX:MaxRAMPercentage=75 -jar myapp.jar
```

System-wide JVM options go in `/etc/java-21-openjdk/jvm.cfg` or via the `JAVA_TOOL_OPTIONS` environment variable:

```bash
# Set memory options for all JVM processes
export JAVA_TOOL_OPTIONS="-Xmx2g -XX:+UseG1GC"
```

## Verifying Java Installation for Common Use Cases

### Running a Test Application

```java
// HelloWorld.java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Java version: " + System.getProperty("java.version"));
        System.out.println("JVM: " + System.getProperty("java.vm.name"));
        System.out.println("OS: " + System.getProperty("os.name"));
    }
}
```

```bash
# Compile and run
javac HelloWorld.java
java HelloWorld
```

### Checking Available System Properties

```bash
# Print JVM system information
java -XshowSettings:all -version 2>&1 | head -50
```

## Keeping Java Updated

```bash
# Update all packages including OpenJDK
sudo apt update && sudo apt upgrade

# Check for available Java security updates specifically
apt list --upgradable 2>/dev/null | grep openjdk

# Check installed version
java -version
```

Security updates for OpenJDK are published regularly. Ubuntu's standard update cycle includes them, so keeping your system updated with `apt upgrade` is generally sufficient.

## Removing Old Java Versions

```bash
# Remove a specific version
sudo apt remove openjdk-17-jdk
sudo apt autoremove  # Clean up dependencies

# Keep only the JRE after removing JDK
sudo apt install openjdk-21-jre-headless
sudo apt remove openjdk-21-jdk
```

OpenJDK on Ubuntu is well-maintained, straightforward to install, and appropriate for production use. For most server workloads, the headless JRE package gives you everything needed to run Java applications with the smallest possible footprint.
