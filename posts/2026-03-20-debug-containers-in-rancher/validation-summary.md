# Validation Summary: How to Set Up Debug Containers in Rancher

## Status
validated

## Post Type
Tutorial / Guide — practical Kubernetes debugging techniques applied to Rancher-managed clusters.

## Technologies Covered
- Rancher (Kubernetes distribution)
- Kubernetes (`kubectl`, pods, ephemeral containers, sidecars, port-forwarding)
- `kubectl debug` (copy mode and ephemeral container mode)
- `nicolaka/netshoot` debug image
- `busybox` image
- Network debugging tools: `nslookup`, `nc`, `tcpdump`, `curl`
- Node.js inspector (`--inspect`)
- VS Code remote debugging

## Sources Consulted
- kubectl debug — copy a pod: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#copying-a-pod-while-adding-a-new-container
- kubectl debug — ephemeral containers: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container
- Share Process Namespace Between Containers in a Pod: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- nicolaka/netshoot image: https://github.com/nicolaka/netshoot
- Node.js debugging / inspector flags: https://nodejs.org/api/cli.html#--inspecthostport
- Bash reference manual — escape character / line continuation behavior

## Issues Found
1. **Broken bash line continuation in Method 2.** The original snippet had inline comments on the same line as a trailing `\`:

   ```bash
   --image=nicolaka/netshoot \    # Networking debug image
   --target=myapp                  # Target the main container's process namespace
   ```

   In bash, `\` only escapes a newline when it is the very last character before the newline. With spaces and a `#` comment between the `\` and the newline, the `\` escapes the space (becomes a literal space) and the comment terminates the line. The result is that `kubectl debug` runs without `--target=myapp`, and bash then tries to execute `--target=myapp` as a separate command (which fails). I verified this empirically with bash before fixing.

   **Fix applied:** moved the explanatory comments to lines *before* the command (where they don't interfere with line continuation) and removed the broken inline comments. The command now executes as intended.

## Review Notes
- All other commands and flags were verified against current kubectl/Kubernetes documentation:
  - `--copy-to` + `--share-processes` + `-it` is correct for the copy-based approach.
  - `--target=<container>` (without `--copy-to`) correctly creates an ephemeral container that shares the target container's process namespace.
  - With shared PID namespace, `ls /proc/1/root/` correctly exposes the target process's filesystem view.
  - `nicolaka/netshoot` is a real, actively maintained image and contains all the listed tools (`curl`, `tcpdump`, `dig`, `netstat`, `traceroute`, `nmap`, etc.).
  - `kubectl run ... --rm -it --restart=Never -- bash` is the standard one-shot interactive pod pattern.
  - `node --inspect=0.0.0.0:9229 server.js` is correct; `9229` is the default Node.js inspector port.
  - The sidecar busybox `while true; do sleep 3600; done` keep-alive idiom is valid.
- Minor stylistic note (not changed, since post is technically correct): a more modern keep-alive command for busybox is `command: ["sleep", "infinity"]` — simpler than the shell loop. The shell loop form remains valid and widely seen.
- Note: `--share-processes` defaults to `true` when used with `--copy-to`, so explicitly specifying it is redundant but harmless and pedagogically useful — kept as-is.
- The post is framed as "Rancher" debugging, but every technique shown is generic Kubernetes; that's accurate, since Rancher is a vanilla Kubernetes distribution and `kubectl` works identically against it.
