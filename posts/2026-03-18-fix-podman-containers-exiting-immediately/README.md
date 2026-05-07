# How to Fix Podman Containers Exiting Immediately

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Debugging, DevOps, Linux

Description: Learn why Podman containers exit immediately after starting and how to fix common causes including missing foreground processes, entrypoint issues, and signal handling problems.

---

> Podman containers that exit immediately after starting are one of the most common issues for new and experienced container users alike. This guide covers every major cause and its fix.

You run `podman run my-image` and the container exits instantly with no output, or you start a container with `podman start` and it goes straight to the "Exited" state. This is frustrating, especially when the same image works fine elsewhere. The root cause is almost always that the main process inside the container finishes or crashes before you can interact with it.

Let us walk through every common reason this happens and how to fix each one.

---

## Understanding Container Lifecycles

A container runs exactly as long as its main process (PID 1) runs. When that process exits, the container exits. This is by design. Unlike virtual machines, containers do not have an init system that keeps them alive. If your main process is a shell script that completes in a fraction of a second, the container will live for that fraction of a second.

Check the exit code of your container to get a first clue:

```bash
podman ps -a --format "{{.Names}} {{.Status}} {{.ExitCode}}"
```

- Exit code **0**: The process completed successfully (it just finished its work).
- Exit code **1**: General error in the application.
- Exit code **127**: Command not found.
- Exit code **137**: Process was killed (OOM or signal 9).
- Exit code **139**: Segmentation fault.

## Fix 1: Run a Foreground Process

The most common cause is that the container has no long-running foreground process. For example, if your Dockerfile ends with:

```dockerfile
CMD ["echo", "hello"]
```

The container will print "hello" and exit. To keep a container running, the main process must not exit. For a web server, this means running the server in the foreground:

```dockerfile
CMD ["nginx", "-g", "daemon off;"]
```

For a custom application, make sure it does not fork into the background. Many services have a "foreground" flag:

```dockerfile
CMD ["apache2ctl", "-D", "FOREGROUND"]
```

If you just want to keep a container alive for debugging, use:

```bash
podman run -d my-image tail -f /dev/null
```

Or with `sleep`:

```bash
podman run -d my-image sleep infinity
```

## Fix 2: Check Entrypoint and CMD Interaction

A common mistake is overriding the entrypoint or command without realizing it. If your Dockerfile has:

```dockerfile
ENTRYPOINT ["/entrypoint.sh"]
CMD ["start-server"]
```

And you run:

```bash
podman run my-image /bin/bash
```

This replaces `CMD` with `/bin/bash`, so the container runs `/entrypoint.sh /bin/bash` instead of `/entrypoint.sh start-server`. If the entrypoint script does not handle this argument, it may exit immediately.

To debug, inspect the image's entrypoint and cmd:

```bash
podman inspect my-image --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'
```

To override the entrypoint entirely:

```bash
podman run --entrypoint /bin/bash -it my-image
```

## Fix 3: Use Interactive Mode for Shell Containers

If you want to run a shell inside a container, you must allocate a TTY and attach stdin:

```bash
podman run -it my-image /bin/bash
```

Without `-it`, the shell has no terminal attached and exits immediately. The `-i` flag keeps stdin open, and `-t` allocates a pseudo-TTY.

For detached containers that you want to exec into later:

```bash
podman run -d --name my-container my-image sleep infinity
podman exec -it my-container /bin/bash
```

## Fix 4: Check for Application Crashes

Your application might be crashing on startup. Check the container logs:

```bash
podman logs my-container
```

If the container was removed, you will not have logs. Run the container without `-d` to see output directly:

```bash
podman run my-image
```

Common crash causes include:

- Missing environment variables
- Missing configuration files
- Unable to bind to a port
- Missing shared libraries
- Permission denied errors

For missing environment variables, pass them explicitly:

```bash
podman run -e DATABASE_URL=postgres://localhost/mydb my-image
```

For missing libraries, check inside the container:

```bash
podman run --entrypoint /bin/sh -it my-image
ldd /usr/local/bin/my-app
```

## Fix 5: Fix Shell Script Issues

If your entrypoint is a shell script, several issues can cause immediate exit:

**Missing shebang line:**

```bash
# Bad - no shebang

echo "starting"
my-app

# Good
#!/bin/bash
echo "starting"
my-app
```

**Script not executable:**

```dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

**Using shell form instead of exec form:**

```dockerfile
# Bad - runs through /bin/sh -c, which affects arguments and signals
ENTRYPOINT /entrypoint.sh

# Good - runs directly
ENTRYPOINT ["/entrypoint.sh"]
```

**Script exits before the main process:**

```bash
#!/bin/bash
# Setup tasks
echo "Configuring..."
setup-database

# Bad - this runs in a subshell and the script exits
my-app &

# Good - use exec to replace the shell process with the app
exec my-app
```

The `exec` keyword is critical in this pattern. Without it, your shell script becomes PID 1, runs `my-app` in the background, finishes the script, and the container exits because PID 1 (the script) has completed.

## Fix 6: Handle Signal Propagation

When using shell form (`CMD my-app` instead of `CMD ["my-app"]`), the shell becomes PID 1, and signals like SIGTERM are not forwarded to your application. This can cause containers to fail to shut down gracefully and then be killed during orchestration restarts.

Always use exec form in your Dockerfile:

```dockerfile
CMD ["my-app", "--config", "/etc/my-app.conf"]
```

If you must use a shell script, use `exec`:

```bash
#!/bin/bash
# Do setup work
source /etc/environment
export CONFIG_PATH=/etc/my-app.conf

# Replace shell with application
exec my-app --config "$CONFIG_PATH"
```

## Fix 7: Debug with an Overridden Entrypoint

When nothing else helps, bypass the entrypoint entirely and explore the container filesystem:

```bash
podman run --entrypoint /bin/sh -it my-image
```

Once inside, try running the application manually:

```bash
# Check if the binary exists
which my-app

# Check file permissions
ls -la /usr/local/bin/my-app

# Try running it directly
/usr/local/bin/my-app

# Check environment
env
```

## Fix 8: Check for OOM Kills

If the container is being killed by the kernel's out-of-memory killer, it will exit with code 137. Check the host's system logs:

```bash
journalctl -k | grep -i "oom\|killed"
```

Increase the memory limit for the container:

```bash
podman run --memory=2g my-image
```

## Debugging Checklist

When a container exits immediately, work through this checklist:

```bash
# 1. Check the exit code
podman ps -a

# 2. Check logs
podman logs <container-id>

# 3. Inspect the image configuration
podman inspect <image> --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'

# 4. Run interactively to see output
podman run -it <image>

# 5. Override entrypoint to explore
podman run --entrypoint /bin/sh -it <image>

# 6. Check for OOM kills
journalctl -k | grep -i oom
```

## Conclusion

Containers exiting immediately is almost always a PID 1 problem. The main process either completes its work, crashes, or never starts properly. Check your exit codes, read your logs, ensure your main process runs in the foreground, use `exec` in shell entrypoints, and always use exec form for `CMD` and `ENTRYPOINT` in your Dockerfile. With these practices, your Podman containers will stay running as expected.
