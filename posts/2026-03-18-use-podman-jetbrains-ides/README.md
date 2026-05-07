# How to Use Podman with JetBrains IDEs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, JetBrains, IntelliJ, PyCharm, Docker Alternative

Description: A guide to configuring JetBrains IDEs like IntelliJ IDEA, PyCharm, and WebStorm to use Podman as the container runtime for development workflows.

---

> JetBrains IDEs have built-in Docker integration that works with Podman once you expose the Podman API socket and configure the IDE connection settings.

JetBrains IDEs such as IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, and GoLand ship with Docker integration out of the box. This integration lets you run applications inside containers, use container-based interpreters, and manage images directly from the IDE. While Docker is the default, Podman can serve as a drop-in replacement. This post covers how to set up Podman as the container engine for JetBrains IDEs on Linux, macOS, and Windows.

---

## Prerequisites

You need the following before starting:

- A JetBrains IDE (2022.3 or later recommended for best Podman compatibility)
- Podman 4.0 or later
- The Docker plugin enabled in your JetBrains IDE (it is bundled in WebStorm, GoLand, PyCharm Professional, and IntelliJ IDEA Ultimate; install it manually in Community editions)

Install and start Podman on your system:

```bash
# macOS

brew install podman
podman machine init --rootful=true
podman machine start

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y podman

# Fedora/RHEL
sudo dnf install -y podman
```

## Enabling the Podman Socket

JetBrains IDEs connect to a container engine through its API socket. Docker exposes this at `/var/run/docker.sock` by default. Podman needs to be configured to expose a compatible socket.

### Linux Setup

On Linux, enable the Podman socket as a user-level systemd service:

```bash
# Enable and start the rootless Podman socket
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Print the socket path (you will need this for IDE configuration)
echo "Socket path: $XDG_RUNTIME_DIR/podman/podman.sock"
```

The socket will typically be at `/run/user/1000/podman/podman.sock`. Note this path for the IDE configuration step.

### macOS Setup

On macOS, Podman runs inside a Linux VM. You need to find the socket path that the VM exposes to the host:

```bash
# Get the socket path from the Podman machine
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# The output will be something like:
# /var/folders/.../T/podman/podman-machine-default-api.sock

# Alternatively, set DOCKER_HOST for broader compatibility
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
```

### Windows Setup

On Windows, Podman runs inside a VM as well. After initializing and starting the Podman machine, inspect the available connection details:

```powershell
# Start the Podman machine
podman machine init --rootful=true
podman machine start

# List available Podman connections
podman system connection list
```

## Configuring the JetBrains IDE

Open your JetBrains IDE and navigate to the Docker connection settings.

1. Go to **Settings/Preferences** (Ctrl+Alt+S or Cmd+,)
2. Navigate to **Build, Execution, Deployment > Docker**
3. Click the **+** button to add a new Docker connection
4. In current JetBrains IDE versions, select **Podman**. If your IDE does not show a Podman option, use the OS-specific fallback settings below.

### Linux Configuration

On Linux, newer JetBrains IDEs can usually detect Podman directly. If you need the manual fallback, select **Unix socket** and enter:

```text
unix:///run/user/1000/podman/podman.sock
```

Replace `1000` with your actual user ID (run `id -u` to find it).

### macOS Configuration

On macOS, select **Podman** and choose the running Podman machine. If you need the manual fallback, use the exact socket path from the `podman machine inspect` command:

```text
unix:///var/folders/.../T/podman/podman-machine-default-api.sock
```

### Windows Configuration

On Windows, select **Podman** and choose the running Podman machine. If you need manual fallback details, use the connection information reported by `podman system connection list` rather than assuming a fixed named pipe.

After selecting the connection or entering the fallback details, click **Test Connection**. You should see a success message with the Podman version.

## Using Container-Based Interpreters

One of the most useful features of JetBrains Docker integration is running your project interpreter inside a container. This ensures your development environment matches production.

### Python Interpreter in PyCharm

1. Go to **Settings > Project > Python Interpreter**
2. Click the gear icon and select **Add Interpreter**
3. Choose **On Docker** (this will use your Podman connection)
4. Select an image or specify a Containerfile

Create a `Containerfile` for your Python project:

```dockerfile
FROM python:3.12-slim

# Install project dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install development tools
RUN pip install --no-cache-dir \
    pytest \
    pylint \
    mypy \
    debugpy
```

PyCharm will build the image using Podman and configure the interpreter to run inside the resulting container.

### Node.js Runtime in WebStorm

Make sure the Node.js Remote Interpreter plugin is installed.

1. Go to **Settings > Languages & Frameworks > JavaScript Runtime**
2. Click the **...** button next to the Node runtime field
3. Click **+** and select **Add Remote**
4. Choose **Docker** and select your Podman connection
5. Pick an image like `node:20-bookworm`

### Java/Kotlin in IntelliJ IDEA

For Java projects, use a Docker run target to run and debug the application inside a container:

1. Go to **Run > Edit Configurations**
2. Select your existing **Application** run configuration
3. Expand the **Run on** list and select **Docker**
4. Pull or select an image such as `eclipse-temurin:21-jdk`

IntelliJ IDEA will detect the JDK in the container and run the application there.

Or use a Dockerfile run configuration that builds and runs a container:

```dockerfile
FROM eclipse-temurin:21-jdk

WORKDIR /app
COPY . .

# Build the project
RUN ./gradlew build --no-daemon
```

## Running and Debugging with Podman

JetBrains IDEs can run and debug applications directly inside Podman containers.

### Creating a Docker Run Configuration

1. Go to **Run > Edit Configurations**
2. Click **+** and select **Docker > Dockerfile**
3. Configure the settings:

```text
Dockerfile:       ./Containerfile
Image tag:        myapp:dev
Container name:   myapp-dev
Port bindings:    8080:8080
Volume bindings:  ./src:/app/src
```

4. Click **Run** or **Debug** to start the container

### Docker Compose Support

JetBrains IDEs also support Docker Compose files with Podman. Create a `docker-compose.yml`:

```yaml
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
    ports:
      - "8080:8080"
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

To use this with Podman, make sure a Compose provider is available. Current `podman compose` is a thin wrapper around an external provider such as `docker-compose` or `podman-compose`:

```bash
podman compose version
```

If that command fails, install a Compose provider and try again. Then in your IDE, create a **Docker Compose** run configuration pointing at the compose file.

## Integrating Podman with Build Tools

### Gradle Docker Plugin (Java/Kotlin)

If your project uses the Gradle Docker plugin, configure it to use the Podman socket:

```kotlin
// build.gradle.kts
plugins {
    id("com.bmuschko.docker-remote-api") version "9.4.0"
}

docker {
    // Point at the Podman socket
    url.set("unix:///run/user/1000/podman/podman.sock")
}
```

### Maven Docker Plugin

For Maven projects using the `fabric8` Docker plugin:

```xml
<!-- pom.xml -->
<plugin>
    <groupId>io.fabric8</groupId>
    <artifactId>docker-maven-plugin</artifactId>
    <version>0.44.0</version>
    <configuration>
        <!-- Use the Podman socket -->
        <dockerHost>unix:///run/user/1000/podman/podman.sock</dockerHost>
        <images>
            <image>
                <name>myapp:latest</name>
                <build>
                    <dockerFile>${project.basedir}/Containerfile</dockerFile>
                </build>
            </image>
        </images>
    </configuration>
</plugin>
```

## Troubleshooting

**Connection test fails with "Permission denied":**

Make sure the Podman socket is running and your user has access:

```bash
# Check socket status on Linux
systemctl --user status podman.socket

# Restart if needed
systemctl --user restart podman.socket
```

**"docker.errors.DockerException: Error while fetching server API version":**

This typically means the socket path is wrong. Double-check with:

```bash
# On Linux, verify the rootless socket exists
ls -la $XDG_RUNTIME_DIR/podman/podman.sock

# On macOS, print the current host socket path
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# On Linux, test the API manually with curl
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock http://localhost/_ping
```

**Volumes not syncing changes on macOS:**

Your home directory is mounted into the Podman machine by default. If your project lives elsewhere, recreate the machine with an additional mount:

```bash
# Recreate the machine with an explicit mount
podman machine stop
podman machine rm -f
podman machine init --rootful=true -v /path/on/host:/path/in/vm
podman machine start
```

**Short image names resolving unexpectedly:**

Configure search registries in Podman's configuration:

```bash
# Edit the registries configuration
# On Linux: ~/.config/containers/registries.conf
# On macOS: inside the Podman machine

cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

## Conclusion

JetBrains IDEs work well with Podman once the Podman API is available. The key is starting the Podman socket or machine, then either selecting Podman directly in the IDE or using the reported socket path when you need a manual connection. From there, you can use container-based interpreters, run configurations, and Docker Compose workflows much as you would with Docker. The rootless nature of Podman adds a security benefit without requiring major changes to your development workflow.
