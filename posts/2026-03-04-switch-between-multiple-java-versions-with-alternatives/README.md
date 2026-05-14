# How to Switch Between Multiple Java Versions with alternatives on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Java, Development, Linux

Description: Learn how to switch Between Multiple Java Versions with alternatives on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Switch Between Multiple Java Versions with alternatives on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A registered RHEL system with access to the repositories that provide Red Hat build of OpenJDK packages
- A stable network connection

## Overview

Switch Between Multiple Java Versions with alternatives requires installing the Java versions you need and selecting the system-wide default with the `alternatives` command. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Check that OpenJDK packages are available from your enabled repositories:

```bash
dnf list available "java*openjdk*"
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y java-21-openjdk-devel java-17-openjdk-devel java-11-openjdk-devel
```

Verify the installation:

```bash
dnf list installed "java*openjdk*"
java -version
javac -version
```

## Step 3: Configure the Java Alternative

Choose the system-wide default `java` command:

```bash
sudo alternatives --config java
```

Follow the prompt and enter the selection number for the Java version you want to use.

## Step 4: Configure the Java Compiler Alternative

```bash
sudo alternatives --config javac
```

The `java` and `javac` alternatives are configured separately. If you installed the `-devel` packages, configure `javac` to match the JDK version you selected for `java`.

## Step 5: Verify the Configuration

Test the setup:

```bash
java -version
javac -version
readlink -f "$(command -v java)"
readlink -f "$(command -v javac)"
```

Check the alternatives entries if the selected version is not what you expected:

```bash
alternatives --display java
alternatives --display javac
```

## Step 6: Configure JAVA_HOME

If an application requires a specific JDK, set `JAVA_HOME` for that shell or application startup script:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH="$JAVA_HOME/bin:$PATH"
```

Use the versioned symbolic link that matches the JDK you want, such as `/usr/lib/jvm/java-21-openjdk`, `/usr/lib/jvm/java-17-openjdk`, or `/usr/lib/jvm/java-11-openjdk`.

## Step 7: Non-Interactive Selection

For automation, identify the installed alternative path and set it directly:

```bash
JAVA_TO_SELECT=$(alternatives --display java | awk '/family java-21-openjdk/ {print $1; exit}')
JAVAC_TO_SELECT=$(alternatives --display javac | awk '/family java-21-openjdk/ {print $1; exit}')
sudo alternatives --set java "$JAVA_TO_SELECT"
sudo alternatives --set javac "$JAVAC_TO_SELECT"
```

## Security Considerations

- Install OpenJDK packages from Red Hat repositories or another trusted source
- Use the `-devel` package only on systems that need development tools such as `javac`
- Set application-specific `JAVA_HOME` values instead of changing the system default when only one application needs a different Java version
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **The selected Java version did not change**: Check `alternatives --display java` and run `hash -r` if your shell cached the old command path
2. **`javac` is missing**: Install the matching `-devel` package, such as `java-21-openjdk-devel`
3. **An application still uses another Java version**: Check whether the application startup script sets `JAVA_HOME` or modifies `PATH`

## Conclusion

You have successfully configured switch between multiple java versions with alternatives on RHEL. Verify application startup scripts regularly and keep OpenJDK packages updated to maintain security and compatibility.
