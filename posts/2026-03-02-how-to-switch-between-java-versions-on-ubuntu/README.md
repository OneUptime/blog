# How to Switch Between Java Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, OpenJDK, JVM, Development

Description: Switch between multiple installed Java versions on Ubuntu using update-alternatives, environment variables, and per-project configuration techniques.

---

Having multiple Java versions installed on the same machine is common when working across projects with different requirements. One project might be locked to Java 11, another already on Java 21. Ubuntu's `update-alternatives` system manages which version is the system default, and environment variables handle per-session or per-project overrides.

## Installing Multiple Java Versions

Before switching between versions, you need them installed. Install each version side by side:

```bash
# Update package index
sudo apt update

# Install multiple JDK versions
sudo apt install openjdk-11-jdk
sudo apt install openjdk-17-jdk
sudo apt install openjdk-21-jdk

# Verify all are installed
dpkg -l | grep openjdk | grep -v doc
```

Each version installs to its own directory under `/usr/lib/jvm/`:

```
/usr/lib/jvm/java-11-openjdk-amd64/
/usr/lib/jvm/java-17-openjdk-amd64/
/usr/lib/jvm/java-21-openjdk-amd64/
```

## Using update-alternatives

Ubuntu's `update-alternatives` system manages symbolic links to multiple versions of the same tool. The `/usr/bin/java` symlink points to whichever version you've configured as the default.

### Viewing Registered Alternatives

```bash
# List all registered Java alternatives
sudo update-alternatives --list java

# Expected output:
# /usr/lib/jvm/java-11-openjdk-amd64/bin/java
# /usr/lib/jvm/java-17-openjdk-amd64/bin/java
# /usr/lib/jvm/java-21-openjdk-amd64/bin/java

# Same for the Java compiler
sudo update-alternatives --list javac
```

### Switching the Default Interactively

```bash
sudo update-alternatives --config java
```

This displays a menu:

```
There are 3 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                            Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      auto mode
  1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java   1111      manual mode
  2            /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711      manual mode
  3            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      manual mode

Press <enter> to keep the current choice[*], or type selection number: 2
```

Type the selection number and press Enter. Verify:

```bash
java -version
# openjdk version "17.0.x" ...
```

### Switching Non-Interactively (for Scripts)

```bash
# Set Java 17 as the default without interactive menu
sudo update-alternatives --set java /usr/lib/jvm/java-17-openjdk-amd64/bin/java
sudo update-alternatives --set javac /usr/lib/jvm/java-17-openjdk-amd64/bin/javac
```

This is useful in provisioning scripts and CI pipelines.

### Switching All Java Tools at Once

Installing a JDK adds multiple binaries: `java`, `javac`, `jar`, `javadoc`, `keytool`, etc. Switch them all at once:

```bash
#!/bin/bash
# switch-java.sh - switch all Java tools to a specific version

JAVA_VERSION=${1:-21}
JAVA_HOME_PATH="/usr/lib/jvm/java-${JAVA_VERSION}-openjdk-amd64"

if [ ! -d "$JAVA_HOME_PATH" ]; then
    echo "Java ${JAVA_VERSION} not found at ${JAVA_HOME_PATH}"
    exit 1
fi

# List of tools to switch
JAVA_TOOLS=(java javac jar javadoc javap keytool rmiregistry)

for tool in "${JAVA_TOOLS[@]}"; do
    TOOL_PATH="${JAVA_HOME_PATH}/bin/${tool}"
    if [ -f "$TOOL_PATH" ]; then
        sudo update-alternatives --set "${tool}" "${TOOL_PATH}"
        echo "Set ${tool} -> ${TOOL_PATH}"
    fi
done

echo ""
echo "Current Java version:"
java -version
```

```bash
chmod +x switch-java.sh
./switch-java.sh 17
```

## Per-Session Version Switching with Environment Variables

For temporary version switches within a shell session without changing the system default:

```bash
# Switch to Java 11 for this session only
export JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"

# Verify
java -version

# To revert, close the terminal or unset
unset JAVA_HOME
# Note: PATH change persists in the session; open a new terminal
```

A cleaner approach using a function in `~/.bashrc`:

```bash
# Add to ~/.bashrc
use-java() {
    local version=${1:-21}
    local java_home="/usr/lib/jvm/java-${version}-openjdk-amd64"

    if [ ! -d "$java_home" ]; then
        echo "Java ${version} not installed"
        return 1
    fi

    export JAVA_HOME="$java_home"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "Switched to Java ${version}: $(java -version 2>&1 | head -1)"
}
```

After reloading `~/.bashrc`:

```bash
use-java 17
use-java 21
```

## Per-Project Configuration with JAVA_HOME

For projects with build tools like Maven or Gradle, set `JAVA_HOME` in project-specific wrapper scripts:

```bash
#!/bin/bash
# project/mvnw - Maven wrapper with specific Java version
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
exec mvn "$@"
```

For Gradle projects, set it in `gradle.properties`:

```properties
# gradle.properties
org.gradle.java.home=/usr/lib/jvm/java-17-openjdk-amd64
```

Maven projects can specify the required Java version in `pom.xml`:

```xml
<properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <maven.compiler.release>17</maven.compiler.release>
</properties>
```

## Using SDKMAN for Java Version Management

SDKMAN is a tool specifically designed for managing SDK versions, similar to nvm for Node.js:

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

# List available Java distributions
sdk list java

# Install specific versions
sdk install java 21.0.2-open     # OpenJDK 21
sdk install java 17.0.9-open     # OpenJDK 17
sdk install java 21.0.2-tem      # Eclipse Temurin 21

# Switch versions
sdk use java 17.0.9-open

# Set the default
sdk default java 21.0.2-open

# Show current version
sdk current java
```

SDKMAN also manages Maven, Gradle, Kotlin, and many other JVM tools, making it a good choice for developer workstations.

## Verifying the Switch Worked

After switching versions, verify that everything points to the right version:

```bash
# Check the active Java version
java -version

# Check javac
javac -version

# Confirm JAVA_HOME is correct
echo $JAVA_HOME
$JAVA_HOME/bin/java -version

# Check which binary is actually running
which java
readlink -f $(which java)
```

## Common Issues

**Wrong version after switching** - If `java -version` still shows the old version after using `update-alternatives`, your shell's PATH has a custom Java entry that overrides the symlinks. Check `~/.bashrc`, `~/.profile`, and `/etc/environment`:

```bash
# See what's in PATH that points to java
echo $PATH | tr ':' '\n' | grep -i java
```

Remove any hardcoded Java paths from profile files, then rely on `update-alternatives`.

**`javac` still at old version after switching `java`** - They're separate alternatives. Switch both:

```bash
sudo update-alternatives --set java /usr/lib/jvm/java-17-openjdk-amd64/bin/java
sudo update-alternatives --set javac /usr/lib/jvm/java-17-openjdk-amd64/bin/javac
```

With `update-alternatives` for system-wide defaults and environment variables for per-project or per-session control, managing multiple Java versions on Ubuntu is reliable and doesn't require any third-party tooling beyond what the OS provides.
