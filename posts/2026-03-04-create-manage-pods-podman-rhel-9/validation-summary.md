# Validation Summary: How to Create and Manage Pods with Podman on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Podman pods
- Kubernetes-compatible YAML for `podman kube play`
- Container networking, PID namespaces, and volumes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Working with pods": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_working-with-pods_building-running-and-managing-containers
- Podman `pod create` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `pod stats` official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-stats.1.html
- Podman `pod rm` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-pod-rm.1.html
- Podman `kube play` official documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman `kube down` official documentation: https://docs.podman.io/en/stable/markdown/podman-kube-down.1.html
- Podman `kube generate` official documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-kube-generate.1.html

## Issues Found
- The post described pods as sharing "storage." Podman pods share namespaces by default and can use shared volume mounts, but storage is not automatically shared. Updated the description and introduction to say "shared volume mounts" and "mount the same volumes."
- The localhost communication test tried to run `curl` from a sleeping UBI Minimal container against port 80, but no container in that pod was serving HTTP and UBI Minimal should not be assumed to include `curl`. Updated the second container to run `nginx` and used a temporary UBI container in the same pod to run `curl`.
- The command under "View containers in a pod" used `podman pod ps`, which lists pods, not containers in a pod. Updated it to `podman ps -a --pod`, matching Red Hat's documented way to show pods and associated containers.
- The networking section stated all pod containers share one IP address without caveat. Updated it to say containers share one network namespace and, with bridge networking, share one IP address.
- The shared PID namespace example used `--share pid,net`, which replaces Podman's default shared namespace list. Updated it to `--share +pid` so PID sharing is added to the default shared namespaces.
- The PID and volume examples used UBI Minimal with commands such as `ps` and `/bin/bash`. Updated those examples to use the full UBI 9 image where those tools are more appropriate.

## Review Notes
The post is technically relevant and the core Podman pod workflow is correct after the fixes. The local review environment did not have `podman` installed, so command behavior was verified against official Red Hat and Podman documentation rather than local execution.
