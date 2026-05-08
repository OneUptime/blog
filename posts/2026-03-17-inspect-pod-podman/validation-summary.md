# Validation Summary: How to Inspect a Pod with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Podman CLI
- Go template formatting
- jq

## Sources Consulted
- Podman official documentation: podman-pod-inspect, https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Podman official documentation: podman-pod-create, https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman official documentation: podman-container-inspect, https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Red Hat Enterprise Linux container documentation for `podman inspect --format='{{.NetworkSettings.IPAddress}}'`, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/building_running_and_managing_containers/red_hat_enterprise_linux-8-building_running_and_managing_containers-en-us.pdf

## Issues Found
- The pod ID Go template used `{{.Id}}`, but the current Podman pod inspect template placeholder is documented as `{{.ID}}`. Changed the command to use `{{.ID}}`.
- The infra container ID Go template used `{{.InfraContainerId}}`, but the documented placeholder is `{{.InfraContainerID}}`. Changed the command to use `{{.InfraContainerID}}`.
- The "Get all container IDs in the pod" example used `{{.Containers}}`, which prints the container objects rather than just IDs. Changed it to range over `.Containers` and print each `.Id`.

## Review Notes
Podman was not installed in the local review environment, so commands could not be executed locally. The review was completed against current official Podman documentation and authoritative vendor documentation. The `podman pod create --name my-pod -p 8080:80` example is consistent with Podman's documented pod-level port publishing behavior.
