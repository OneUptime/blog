# Validation Summary: How to Install and Use k9s for Kubernetes Management on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and usage guide

## Technologies Covered
- Ubuntu
- Kubernetes
- kubectl
- k9s
- Snap
- Homebrew
- YAML configuration

## Sources Consulted
- k9s official documentation: https://k9scli.io
- k9s installation documentation: https://k9scli.io/topics/install/
- k9s commands and key bindings documentation: https://k9scli.io/topics/commands/
- k9s configuration documentation: https://k9scli.io/topics/config/
- k9s aliases documentation: https://k9scli.io/topics/aliases/
- k9s hotkeys documentation: https://k9scli.io/topics/hotkeys/
- k9s skins documentation: https://k9scli.io/topics/skins/
- k9s GitHub repository and README: https://github.com/derailed/k9s
- k9s latest GitHub release assets: https://github.com/derailed/k9s/releases/latest
- Snap Store page for k9s: https://snapcraft.io/k9s
- Kubernetes kubectl config get-contexts reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- Kubernetes kubectl auth reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The Homebrew command used `brew install k9s`, but the upstream k9s installation documentation uses `brew install derailed/k9s/k9s`. Updated the command.
- The Snap command omitted the upstream-documented `--devmode` flag. Updated the command to `sudo snap install k9s --devmode`.
- The post listed `f` as the key to start port forwarding, but current k9s key bindings use `Shift+F` for port forwarding and `f` for showing port-forwards or toggling fullscreen in some views. Updated the shortcut references.
- The log view shortcuts had wrapping and timestamp keys reversed, and described `f` as a log filter. Updated them to match the official key bindings.
- The config example described `refreshRate` as milliseconds and included unsupported fields `currentNamespace` and `showContainerImages`. Updated the comment to seconds and replaced those fields with the supported `defaultView` field.
- The hotkeys example used the wrong top-level YAML key `hotkeys`. Updated it to `hotKeys` and changed the examples to commands and shortcuts that align with the official hotkeys format.
- The multiple-cluster section incorrectly said `Ctrl+A` opens the cluster context menu. Updated it to use the documented `:ctx` command.
- The resource usage section incorrectly described `:pu` and `:nu` as direct pod/node usage views. Updated it to describe `:pulses` / `:pu` and the pod/node views with resource columns.
- The RBAC troubleshooting example grepped cluster role bindings by the current context name, which is not a reliable way to inspect permissions. Replaced it with `kubectl auth can-i --list` and a general role binding listing command.

## Review Notes
The Snap Store package is currently older than the latest GitHub release, so the binary or upstream package methods are better choices for installing the latest k9s release. No additional structural changes were made beyond correcting technical inaccuracies.
