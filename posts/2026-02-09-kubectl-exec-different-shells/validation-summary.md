# Validation Summary: How to Use kubectl exec with Different Shells for Container Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl exec
- kubectl debug
- kubectl cp
- Bash
- POSIX sh
- Alpine Linux ash
- Zsh

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- GNU Bash Reference Manual: https://www.gnu.org/s/bash/manual/bash.html
- Alpine Linux BusyBox documentation: https://wiki.alpinelinux.org/wiki/BusyBox
- Alpine Linux shell management documentation: https://wiki.alpinelinux.org/wiki/Change_default_shell
- Zsh documentation: https://zsh.sourceforge.io/Doc/

## Issues Found
- The shell-location glob example used `/bin/*sh` and `/usr/bin/*sh` directly in the local command line, which would be expanded by the user's local shell before `kubectl` runs. Changed it to run through `sh -c` inside the container so the glob and stderr redirection happen in the container.
- The heredoc examples used `kubectl exec` without `-i`, so stdin would not be passed to the container. Added `-i` to the Bash and sh heredoc examples.
- The `kubectl debug` example used `--target=my-pod`, but Kubernetes documents `--target` as the target container name for ephemeral containers, not the pod name. Changed it to `--target=container-name`.
- The Bash interactive completion example used `set completion-ignore-case on` as a shell command. This is a Readline setting and should be applied through Bash's `bind` builtin in an interactive session. Changed it to `bind 'set completion-ignore-case on'`.

## Review Notes
The post is technically relevant and current. `kubectl` was not installed in the local workspace, so command validation was performed against current official Kubernetes generated command references and shell documentation rather than local `kubectl --help` output. Some examples depend on utilities such as `ps`, `curl`, `watch`, `free`, `which`, or `tar` being available in the target image; that is normal for debugging guides but may vary in minimal containers.
