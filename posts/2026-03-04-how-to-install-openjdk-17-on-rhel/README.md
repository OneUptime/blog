# How to Install OpenJDK 17 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpenJDK, Java, JDK 17, Development

Description: Learn how to install and configure OpenJDK 17 on RHEL, including setting JAVA_HOME and managing multiple Java versions.

---

OpenJDK 17 is a Long-Term Support (LTS) release of the Java Development Kit. RHEL provides OpenJDK through its standard repositories, making installation straightforward.

## Installing OpenJDK 17

```bash
# Install the JDK (includes JRE + development tools)
sudo dnf install -y java-17-openjdk java-17-openjdk-devel

# Verify the installation
java -version
javac -version
```

## Setting JAVA_HOME

```bash
# Find the Java installation path
dirname $(dirname $(readlink -f $(which java)))

# Set JAVA_HOME system-wide
cat << 'JAVAENV' | sudo tee /etc/profile.d/java.sh
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export PATH=$JAVA_HOME/bin:$PATH
JAVAENV

# Load the new environment
source /etc/profile.d/java.sh

# Verify
echo $JAVA_HOME
```

## Managing Multiple Java Versions

If you have multiple Java versions installed, use `alternatives` to switch between them:

```bash
# List available Java versions
sudo alternatives --config java

# Select Java 17 (enter the number corresponding to Java 17)
# This is interactive; for scripts, use:
sudo alternatives --set java /usr/lib/jvm/java-17-openjdk-17.0.10.0.7-2.el9.x86_64/bin/java

# Also set javac
sudo alternatives --config javac
```

## Installing Only the JRE

If you only need to run Java applications (no compilation):

```bash
# Install just the JRE
sudo dnf install -y java-17-openjdk-headless

# The headless variant excludes GUI libraries
# Use the full JRE if you need AWT/Swing:
sudo dnf install -y java-17-openjdk
```

## Verifying the Installation

```bash
# Check Java version details
java -version

# Check available modules
java --list-modules | head -20

# Run a quick test
echo 'public class Hello { public static void main(String[] args) { System.out.println("Java 17 works"); } }' > /tmp/Hello.java
javac /tmp/Hello.java
java -cp /tmp Hello
```

## JVM Options for Production

```bash
# Common JVM flags for production applications
java -Xms512m -Xmx2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/log/myapp/ \
  -jar myapp.jar
```

OpenJDK 17 on RHEL receives security updates through the standard `dnf update` process. Red Hat backports critical patches, so keep your system updated regularly.
