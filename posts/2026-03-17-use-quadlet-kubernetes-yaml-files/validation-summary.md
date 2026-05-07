# Validation Summary: How to Use Quadlet with Kubernetes YAML Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Kubernetes YAML manifests
- ConfigMaps
- PersistentVolumeClaims

## Sources Consulted
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman kube play documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html

## Issues Found
- The ConfigMap example loaded `app-config.yaml` through the Quadlet `ConfigMap=` key but the pod example did not reference the ConfigMap. Podman makes ConfigMaps available for pods or deployments that refer to them as environment sources or volumes; it does not automatically inject all loaded ConfigMaps. Added `envFrom.configMapRef.name: app-config` to the `app` container so the `APP_ENV` and `LOG_LEVEL` values are actually supplied to the container.

## Review Notes
- The `.kube` unit format, `Yaml=`, `ConfigMap=`, rootless Quadlet path, generated `.service` naming, and `systemctl --user daemon-reload` workflow match the current Podman Quadlet documentation.
- Podman `kube play` currently supports Pod and Deployment manifests, and maps `persistentVolumeClaim.claimName` to a Podman named volume, which matches the examples.
