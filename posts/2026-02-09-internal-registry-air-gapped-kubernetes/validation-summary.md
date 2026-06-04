# Validation Summary: How to Set Up an Internal Container Registry for Air-Gapped Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubelet configuration
- containerd
- Harbor
- CNCF Distribution / Docker Registry
- Docker Compose
- OpenSSL TLS certificates
- Kubernetes image pull secrets
- Kubernetes admission webhooks
- Prometheus-style Harbor metrics

## Sources Consulted
- Harbor 2.10 installer documentation: https://goharbor.io/docs/2.10.0/install-config/run-installer-script/
- Harbor 2.10 configuration documentation: https://goharbor.io/docs/2.10.0/install-config/configure-yml-file/
- Harbor installer download documentation: https://goharbor.io/docs/2.10.0/install-config/download-installer/
- CNCF Distribution registry deployment documentation: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- containerd registry hosts documentation: https://containerd.io/docs/main/hosts/
- containerd CRI registry configuration documentation: https://containerd.io/docs/1.7/cri/registry/
- Kubernetes kubeadm v1beta3 configuration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3
- Kubernetes kubeadm config command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/
- Kubernetes KubeletConfiguration v1beta1 API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes docker-registry secret command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes ValidatingWebhookConfiguration API: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Local OpenSSL CLI help for `openssl req -x509` and `-addext`.

## Issues Found
- The TLS certificate example created a self-signed certificate without a subjectAltName. Modern TLS clients validate SANs, so the command was replaced with an `openssl req -x509` example that includes `subjectAltName=DNS:registry.internal.example.com`.
- The Harbor install command used `--with-chartmuseum`, but Harbor 2.10 installer documentation lists only the default install and `--with-trivy`; ChartMuseum was removed from Harbor before this version. The command now uses `sudo ./install.sh --with-trivy`.
- The post used legacy `docker-compose` commands and a legacy Compose `version` key. These were updated to Docker Compose V2 `docker compose` commands and a current Compose file shape.
- The Docker Registry alternative mounted `/opt/registry/certs` but did not place the generated certificate and key there. Copy commands were added, and the registry image was updated to the current `registry:3` image used in Distribution documentation.
- The image sync script had an unused `EXTERNAL_REGISTRY` variable and did not clarify the host:port difference for the Docker Registry alternative. The unused variable was removed and a note was added for `registry.internal.example.com:5000`.
- The containerd configuration mixed deprecated inline mirror/auth configuration with image paths that would not match the pushed internal images. It now configures containerd to trust the internal registry through `hosts.toml` and points `config_path` at `/etc/containerd/certs.d`, with separate plugin paths for containerd 1.x and 2.x.
- The kubeadm pre-pull step used `kubeadm config images list`, which only lists required images. It now uses `sudo kubeadm config images pull --config kubeadm-config.yaml`.
- The "registry mirrors" section created a ConfigMap that would not configure registry mirrors or update running kubelets. It now shows the relevant `KubeletConfiguration` image pull settings directly.
- The Harbor metrics example created a Kubernetes Service with a selector that would not match a Docker Compose Harbor installation. It now shows the Harbor `metric` configuration block that enables metrics in `harbor.yml`.

## Review Notes
- The tutorial remains version-specific around Kubernetes v1.28 and Harbor v2.10. Those versions are older than the current documentation set, but the corrected commands and configuration are valid for the versions explicitly shown.
- The post uses example passwords in commands. This is acceptable for a tutorial, but a future improvement would be to add a short note to use generated secrets or a secret manager in production.
