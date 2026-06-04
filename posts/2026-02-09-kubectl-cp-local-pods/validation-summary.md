# Validation Summary: How to Use kubectl cp to Copy Files Between Local System and Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl cp
- kubectl exec
- Bash shell scripting
- tar-based file transfer
- Kubernetes ConfigMaps and Secrets

## Sources Consulted
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The database backup example redirected `pg_dump` output to `/tmp/backup.sql` on the local machine, then attempted to copy `/tmp/backup.sql` from inside the pod. Changed the command to run through `sh -c` so the redirection happens inside the container before `kubectl cp` reads the file from the pod.
- The wildcard log-copy example passed `/var/log/*.log` directly to `tar` through `kubectl exec`, which does not perform shell wildcard expansion in the container. Changed it to run `tar` through `sh -c` so the wildcard expands inside the pod.
- The batch copy helper used `shift 2` even when only one positional argument remained, despite supporting a default remote path. In Bash this can leave the argument list unchanged and cause an infinite loop. Changed the script to shift by two when a remote path is present and by one when the default remote path is used.

## Review Notes
`kubectl cp` depends on `tar` being present in the container image, as documented by Kubernetes. The post's guidance to prefer ConfigMaps, Secrets, volumes, or image-based delivery for production-style configuration and static files is technically sound.
