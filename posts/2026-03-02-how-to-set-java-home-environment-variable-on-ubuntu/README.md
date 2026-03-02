# How to Set JAVA_HOME Environment Variable on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Java, Environment Variable, JVM, Configuration

Description: Set the JAVA_HOME environment variable on Ubuntu for all users or specific users, understand why it matters, and handle multiple Java installations.

---

`JAVA_HOME` is an environment variable that points to the Java Development Kit installation directory. Many Java-based tools - Maven, Gradle, Tomcat, Jenkins, Ant, and countless others - read this variable to find the JVM. Getting it set correctly is a foundational task when setting up any Java server environment on Ubuntu.

## Why JAVA_HOME Matters

The `java` command works from any directory because `/usr/bin/java` is in your PATH. But build tools and application servers don't just need the `java` binary - they need to locate the entire JDK installation to find native libraries, header files, the compiler, and other components. `JAVA_HOME` tells them where to look.

Without `JAVA_HOME`, tools like Maven will often work anyway (they search PATH), but they'll sometimes fail or use an unexpected Java version, leading to hard-to-debug build failures.

## Finding the Correct JAVA_HOME Path

The Java installation path depends on which version and distribution you installed. OpenJDK installs under `/usr/lib/jvm/`:

```bash
# List all Java installations
ls /usr/lib/jvm/

# Find the path for the currently active java binary
readlink -f $(which java)

# This gives you something like:
# /usr/lib/jvm/java-21-openjdk-amd64/bin/java

# Remove /bin/java from the end to get JAVA_HOME
# Result: /usr/lib/jvm/java-21-openjdk-amd64
```

Another approach using `java -XshowSettings`:

```bash
java -XshowSettings:all -version 2>&1 | grep "java.home"
# Output: java.home = /usr/lib/jvm/java-21-openjdk-amd64
```

For Temurin (AdoptOpenJDK) installations:

```bash
ls /usr/lib/jvm/
# temurin-21-amd64
# The path would be /usr/lib/jvm/temurin-21-amd64
```

## Setting JAVA_HOME System-Wide

For all users on the system, set it in `/etc/environment`. This file contains simple `KEY=VALUE` pairs loaded by the PAM login system:

```bash
sudo nano /etc/environment
```

Add or modify the line:

```
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
```

The `/etc/environment` file does not support shell syntax (no `export`, no `$VAR` references). Just bare `KEY="VALUE"` pairs.

Apply it to the current session:

```bash
source /etc/environment
echo $JAVA_HOME
```

Note that `/etc/environment` is read at login time. Services started by systemd don't automatically inherit it; configure them separately.

## Setting JAVA_HOME for System Services

Services managed by systemd need `JAVA_HOME` set in their unit file, not in `/etc/environment`:

```ini
# /etc/systemd/system/myapp.service
[Service]
Environment=JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
Environment=PATH=/usr/lib/jvm/java-21-openjdk-amd64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/opt/myapp/bin/start.sh
```

Or load from an environment file:

```bash
# /opt/myapp/env
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
PATH=/usr/lib/jvm/java-21-openjdk-amd64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

```ini
[Service]
EnvironmentFile=/opt/myapp/env
ExecStart=/opt/myapp/bin/start.sh
```

After modifying a unit file:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service

# Verify the service sees the right JAVA_HOME
sudo systemctl show myapp.service | grep Environment
```

## Setting JAVA_HOME per User

For a specific user, add to `~/.bashrc` (interactive non-login shells) and `~/.profile` (login shells):

```bash
# Add to ~/.bashrc
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

```bash
# Reload
source ~/.bashrc

# Verify
echo $JAVA_HOME
java -version
```

For user scripts that need to inherit `JAVA_HOME` without a login shell, add it to `~/.profile` as well:

```bash
# ~/.profile
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

## Setting JAVA_HOME in Profile.d

For a cleaner system-wide configuration that supports shell syntax (unlike `/etc/environment`), use `/etc/profile.d/`:

```bash
# Create a script that sets Java environment
sudo nano /etc/profile.d/java.sh
```

```bash
#!/bin/bash
# /etc/profile.d/java.sh
# This runs for all users on login

export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

Make it executable:

```bash
sudo chmod +x /etc/profile.d/java.sh
```

Files in `/etc/profile.d/` are sourced by `/etc/profile` during login for all users. This supports full shell syntax, so you can use conditional logic:

```bash
#!/bin/bash
# /etc/profile.d/java.sh - dynamically set JAVA_HOME based on what's installed

if [ -d "/usr/lib/jvm/java-21-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
elif [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
elif [ -d "/usr/lib/jvm/java-11-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"
fi

if [ -n "$JAVA_HOME" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi
```

## Handling Multiple Java Versions

When multiple JDK versions are installed and you need `JAVA_HOME` to reflect whichever version is currently selected via `update-alternatives`:

```bash
#!/bin/bash
# /etc/profile.d/java.sh - dynamic JAVA_HOME following update-alternatives

# Get the path of the currently active java binary
JAVA_BIN=$(update-alternatives --query java 2>/dev/null | grep "^Value:" | awk '{print $2}')

if [ -n "$JAVA_BIN" ]; then
    # Navigate up from bin/java to the JDK root
    export JAVA_HOME=$(dirname $(dirname "$JAVA_BIN"))
    export PATH="$JAVA_HOME/bin:$PATH"
fi
```

This automatically follows whatever `update-alternatives --config java` is set to.

## Verifying JAVA_HOME is Set Correctly

```bash
# Basic check
echo $JAVA_HOME

# Verify the directory exists
ls $JAVA_HOME

# Check that bin/java exists and is executable
$JAVA_HOME/bin/java -version

# Check that javac is present (JDK, not JRE)
$JAVA_HOME/bin/javac -version

# Quick one-liner to confirm everything
java -XshowSettings:property -version 2>&1 | grep java.home
```

## Common Mistakes

**Setting JAVA_HOME to the `bin` directory** - It should point to the JDK root, not `bin/`:

```bash
# Wrong - don't include /bin
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64/bin"

# Correct
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
```

**Forgetting to add `$JAVA_HOME/bin` to PATH** - Setting `JAVA_HOME` alone doesn't change which `java` binary is used. If you want `java` in PATH to reflect your `JAVA_HOME`, add it explicitly:

```bash
export PATH="$JAVA_HOME/bin:$PATH"
```

**JAVA_HOME not inherited by cron jobs** - cron doesn't source login profiles. Set `JAVA_HOME` at the top of your crontab:

```bash
crontab -e
```

```
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
PATH=/usr/lib/jvm/java-21-openjdk-amd64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 2 * * * /opt/myapp/scripts/backup.sh
```

Setting `JAVA_HOME` correctly and consistently across login shells, services, and scripts prevents confusing failures where different parts of your infrastructure use different Java versions without you realizing it.
