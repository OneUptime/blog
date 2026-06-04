# Validation Summary: How to Use lsof Inside Kubernetes Containers to Inspect Open Files and Sockets

## Status
not-code-blog

## Post Type
Short technical overview

## Technologies Covered
- Kubernetes
- kubectl debug
- Ephemeral containers
- lsof
- Linux files, file descriptors, and network sockets

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- lsof upstream manual page: https://github.com/lsof-org/lsof/blob/master/Lsof.8
- Local lsof version/help output from lsof 4.95.0

## Issues Found
No technical issues found. The post does not include code examples, command examples, configuration snippets, or detailed implementation steps, so it was classified as not-code-blog per the validation instructions. No changes were made to README.md.

## Review Notes
The high-level claims are consistent with the consulted sources: lsof lists open files including network files such as sockets, and Kubernetes documents kubectl debug as a way to add ephemeral containers with debugging utilities to running Pods. Future improvements could add concrete, version-aware command examples and caveats about process namespace sharing, runtime support for --target, and permissions needed to inspect other processes.
